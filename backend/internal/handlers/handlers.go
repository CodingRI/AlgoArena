package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"strings"
	"sync"
	"time"

	"backend/internal/models"
	"backend/internal/websocket"

	"github.com/gin-gonic/gin"
)

// Handler holds dependencies for route handlers, including the WebSocket hub and an in-memory room store.
type Handler struct {
	hub        *websocket.Hub
	rooms      map[string]*models.Room
	roomsMu    sync.RWMutex
	roomTimers map[string]*time.Timer
	timersMu   sync.Mutex
	chatHits   map[string][]int64
	chatMu     sync.Mutex
}

// autoDeleteDelay is how long a room with no online members is kept before automatic deletion.
const autoDeleteDelay = 30 * time.Minute

const (
	maxRoomMembers      = 4
	maxDisplayNameRunes = 10
	maxRoomNameWords    = 10
	chatWindowMs        = 5000
	chatMaxPerWindow    = 5
	chatMaxContentRunes = 4000
)

// NewHandler initializes a Handler and wires the hub callbacks.
func NewHandler(hub *websocket.Hub) *Handler {
	h := &Handler{
		hub:        hub,
		rooms:      make(map[string]*models.Room),
		roomTimers: make(map[string]*time.Timer),
		chatHits:   make(map[string][]int64),
	}
	hub.HandleEvent = h.processWSEvent
	hub.OnConnect = h.onClientConnect
	hub.OnDisconnect = h.onClientDisconnect
	return h
}

// scheduleAutoDelete starts a timer that deletes the room after autoDeleteDelay if no one reconnects.
func (h *Handler) scheduleAutoDelete(roomID string) {
	h.timersMu.Lock()
	if t, ok := h.roomTimers[roomID]; ok {
		t.Stop()
	}
	h.roomTimers[roomID] = time.AfterFunc(autoDeleteDelay, func() {
		h.timersMu.Lock()
		delete(h.roomTimers, roomID)
		h.timersMu.Unlock()

		h.roomsMu.Lock()
		_, exists := h.rooms[roomID]
		if exists {
			delete(h.rooms, roomID)
		}
		h.roomsMu.Unlock()

		if exists {
			h.hub.BroadcastToRoomIncludingWaiters(models.SocketPayload{
				Event:     "room:deleted",
				RoomID:    roomID,
				Data:      json.RawMessage(`{}`),
				Timestamp: time.Now().UnixMilli(),
				SenderID:  "server",
			})
			log.Printf("[Auto-delete] Room %s deleted after inactivity", roomID)
		}
	})
	h.timersMu.Unlock()
}

// cancelAutoDelete stops any pending auto-delete timer for a room.
func (h *Handler) cancelAutoDelete(roomID string) {
	h.timersMu.Lock()
	defer h.timersMu.Unlock()
	if t, ok := h.roomTimers[roomID]; ok {
		t.Stop()
		delete(h.roomTimers, roomID)
	}
}

// CORSMiddleware sets up cross-origin resource sharing headers.
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}

// ─── REST Handlers ────────────────────────────────────────────────────────────

// CreateRoom handles POST /api/rooms — creates a new room and adds the host as its first member.
func (h *Handler) CreateRoom(c *gin.Context) {
	var payload models.CreateRoomPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	payload.HostName = clampRunes(payload.HostName, maxDisplayNameRunes)
	payload.Name = clampWords(payload.Name, maxRoomNameWords)
	if payload.HostName == "" || payload.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}

	hostMember := models.Member{
		ID:                  payload.HostID,
		Name:                payload.HostName,
		Avatar:              payload.Avatar,
		Role:                models.RoleHost,
		Status:              models.StatusOffline,
		Language:            payload.Language,
		IsSpeaking:          false,
		IsMuted:             false,
		IsInExplanationMode: false,
		HasRaisedHand:       false,
		JoinedAt:            time.Now().UnixMilli(),
	}

	room := &models.Room{
		ID:              generateRoomID(),
		Name:            payload.Name,
		HostID:          payload.HostID,
		Members:         []models.Member{hostMember},
		Status:          models.RoomWaiting,
		Language:        payload.Language,
		CreatedAt:       time.Now().UnixMilli(),
		MaxMembers:      maxRoomMembers,
		IsLocked:        false,
		PendingRequests: []models.JoinRequest{},
	}

	h.roomsMu.Lock()
	h.rooms[room.ID] = room
	h.roomsMu.Unlock()

	c.JSON(http.StatusCreated, room)
}

// GetRoomState handles GET /api/rooms/:roomId — fetches the current snapshot of a room.
func (h *Handler) GetRoomState(c *gin.Context) {
	roomID := c.Param("roomId")

	h.roomsMu.RLock()
	room, exists := h.rooms[roomID]
	h.roomsMu.RUnlock()

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "room not found"})
		return
	}

	c.JSON(http.StatusOK, room)
}

// JoinRoomRequest handles POST /api/rooms/:roomId/join — creates a pending join request and
// notifies active room members via WebSocket.
func (h *Handler) JoinRoomRequest(c *gin.Context) {
	roomID := c.Param("roomId")
	var req struct {
		UserID   string              `json:"userId"   binding:"required"`
		Name     string              `json:"name"     binding:"required"`
		Avatar   models.AvatarOption `json:"avatar"   binding:"required"`
		Language models.Language     `json:"language" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.Name = clampRunes(req.Name, maxDisplayNameRunes)
	if req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}

	h.roomsMu.Lock()
	room, exists := h.rooms[roomID]
	if !exists {
		h.roomsMu.Unlock()
		c.JSON(http.StatusNotFound, gin.H{"error": "room not found"})
		return
	}

	// If the user was already a member (they left and want to rejoin), auto-accept
	// them and restore their original identity — they cannot change name/avatar/language.
	for i := range room.Members {
		if room.Members[i].ID == req.UserID {
			if room.Members[i].ExplicitlyLeft && presentCount(room) >= room.MaxMembers {
				h.roomsMu.Unlock()
				c.JSON(http.StatusConflict, gin.H{"error": "room is full (max 4 members)"})
				return
			}
			existing := room.Members[i]
			room.Members[i].Status = models.StatusOffline // WS connect will flip to online
			h.roomsMu.Unlock()
			fastReq := models.JoinRequest{
				ID:          "req-" + generateRandomString(6),
				UserID:      existing.ID,
				Name:        existing.Name,
				Avatar:      existing.Avatar,
				Language:    existing.Language,
				RequestedAt: time.Now().UnixMilli(),
				Status:      "accepted",
				Returning:   true,
			}
			c.JSON(http.StatusOK, fastReq)
			return
		}
	}

	// Reuse an existing pending request instead of stacking duplicates.
	for _, pending := range room.PendingRequests {
		if pending.UserID == req.UserID && pending.Status == "pending" {
			h.roomsMu.Unlock()
			c.JSON(http.StatusOK, pending)
			return
		}
	}

	if presentCount(room) >= room.MaxMembers {
		h.roomsMu.Unlock()
		c.JSON(http.StatusConflict, gin.H{"error": "room is full (max 4 members)"})
		return
	}

	joinReq := models.JoinRequest{
		ID:          "req-" + generateRandomString(6),
		UserID:      req.UserID,
		Name:        req.Name,
		Avatar:      req.Avatar,
		Language:    req.Language,
		RequestedAt: time.Now().UnixMilli(),
		Status:      "pending",
	}
	room.PendingRequests = append(room.PendingRequests, joinReq)
	h.roomsMu.Unlock()

	// Notify host and other members about the join request.
	reqData, _ := json.Marshal(joinReq)
	h.hub.BroadcastToRoom(models.SocketPayload{
		Event:     "join_request:received",
		RoomID:    roomID,
		Data:      json.RawMessage(reqData),
		Timestamp: time.Now().UnixMilli(),
		SenderID:  req.UserID,
	})

	c.JSON(http.StatusOK, joinReq)
}

// HandleWebSocket handles GET /ws — upgrades the connection to WebSocket.
func (h *Handler) HandleWebSocket(c *gin.Context) {
	roomID := c.Query("roomId")
	userID := c.Query("userId")

	if roomID == "" || userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "roomId and userId are required"})
		return
	}

	h.roomsMu.RLock()
	room, exists := h.rooms[roomID]
	if !exists {
		h.roomsMu.RUnlock()
		c.JSON(http.StatusNotFound, gin.H{"error": "room does not exist"})
		return
	}

	isMember := false
	hasPending := false
	for _, m := range room.Members {
		if m.ID == userID {
			isMember = true
			break
		}
	}
	if !isMember {
		for _, req := range room.PendingRequests {
			if req.UserID == userID && req.Status == "pending" {
				hasPending = true
				break
			}
		}
	}
	h.roomsMu.RUnlock()

	if !isMember && !hasPending {
		c.JSON(http.StatusForbidden, gin.H{"error": "not a member of this room"})
		return
	}

	websocket.UpgradeConnection(h.hub, c.Writer, c.Request, roomID, userID, !isMember)
}

// ─── WebSocket Event Router ───────────────────────────────────────────────────

// processWSEvent is the central event router — called for every incoming WS message.
func (h *Handler) processWSEvent(payload models.SocketPayload, client *websocket.Client) {
	// Pending join waiters may only ping or cancel their request.
	if client.IsWaiter && payload.Event != "ping" && payload.Event != "join_request:cancel" {
		log.Printf("[WS] Ignored event '%s' from waiter %s", payload.Event, client.UserID)
		return
	}

	switch payload.Event {
	// ── Keepalive (silently ack, never broadcast) ─────────────────────────────
	case "ping":
		h.hub.SendToClient(client, models.SocketPayload{
			Event:     "pong",
			RoomID:    payload.RoomID,
			Data:      json.RawMessage(`{}`),
			Timestamp: time.Now().UnixMilli(),
			SenderID:  "server",
		})

	// ── Room leave ────────────────────────────────────────────────────────────
	case "room:leave":
		h.handleRoomLeave(payload, client)

	// ── Chat ──────────────────────────────────────────────────────────────────
	case "chat:message":
		if !h.allowChatMessage(payload.RoomID, client.UserID, payload.Data) {
			h.hub.SendToClient(client, models.SocketPayload{
				Event:     "chat:rate_limited",
				RoomID:    payload.RoomID,
				Data:      json.RawMessage(`{"error":"slow down"}`),
				Timestamp: time.Now().UnixMilli(),
				SenderID:  "server",
			})
			return
		}
		h.hub.BroadcastToRoomExcept(payload, client)

	case "chat:typing:start", "chat:typing:stop":
		h.hub.BroadcastToRoomExcept(payload, client)

	// ── Hand raise ────────────────────────────────────────────────────────────
	case "hand:raise":
		h.setMemberField(payload.RoomID, client.UserID, func(m *models.Member) { m.HasRaisedHand = true })
		h.broadcastRoomUpdate(payload.RoomID, client.UserID)

	case "hand:lower":
		h.setMemberField(payload.RoomID, client.UserID, func(m *models.Member) { m.HasRaisedHand = false })
		h.broadcastRoomUpdate(payload.RoomID, client.UserID)

	// ── Join request accept / reject (sent by host) ───────────────────────────
	case "join_request:accept":
		h.handleJoinRequestAccept(payload, client)

	case "join_request:reject":
		h.handleJoinRequestReject(payload, client)

	case "join_request:cancel":
		h.cancelPendingJoin(payload.RoomID, client.UserID)

	case "room:kick":
		h.handleRoomKick(payload, client)

	// ── Explanation session ───────────────────────────────────────────────────
	case "explanation:start":
		h.handleExplanationStart(payload, client)

	case "explanation:end":
		h.handleExplanationEnd(payload, client)

	// ── Canvas / laser (relay only, store latest canvas snapshot) ─────────────
	case "canvas:update":
		h.handleCanvasUpdate(payload, client)

	case "laser:move":
		h.hub.BroadcastToRoomExcept(payload, client)

	// ── Voice ─────────────────────────────────────────────────────────────────
	case "voice:mute":
		h.setMemberField(payload.RoomID, client.UserID, func(m *models.Member) { m.IsMuted = true })
		h.broadcastRoomUpdate(payload.RoomID, client.UserID)

	case "voice:unmute":
		h.setMemberField(payload.RoomID, client.UserID, func(m *models.Member) { m.IsMuted = false })
		h.broadcastRoomUpdate(payload.RoomID, client.UserID)

	case "voice:speaking":
		h.hub.BroadcastToRoomExcept(payload, client)

	// ── Hand dismiss (host clears a member's raised hand) ─────────────────────
	case "hand:dismiss":
		h.handleHandDismiss(payload, client)

	// ── WebRTC signaling (point-to-point, NOT broadcast) ──────────────────────
	case "webrtc:offer", "webrtc:answer", "webrtc:ice-candidate":
		h.routeToTarget(payload, client)

	default:
		// Generic: if TargetUserID is set, route to that specific client; otherwise broadcast.
		if payload.TargetUserID != "" {
			h.routeToTarget(payload, client)
		} else {
			log.Printf("[WS] Unknown event '%s' from %s — broadcasting as-is", payload.Event, client.UserID)
			h.hub.BroadcastToRoomExcept(payload, client)
		}
	}
}

// ─── Connect / Disconnect lifecycle ──────────────────────────────────────────

// onClientConnect runs when a client's WS connection is established.
// It updates the member's status to online and sends the current room state.
func (h *Handler) onClientConnect(client *websocket.Client) {
	if client.IsWaiter {
		log.Printf("[WS] %s waiting for approval in room %s", client.UserID, client.RoomID)
		return
	}

	// Cancel any pending auto-delete since someone is back in the room
	h.cancelAutoDelete(client.RoomID)

	h.roomsMu.Lock()
	room, exists := h.rooms[client.RoomID]
	if !exists {
		h.roomsMu.Unlock()
		return
	}
	var memberName string
	wasLeft := false
	for i := range room.Members {
		if room.Members[i].ID == client.UserID {
			memberName = room.Members[i].Name
			wasLeft = room.Members[i].ExplicitlyLeft
			room.Members[i].Status = models.StatusOnline
			room.Members[i].ExplicitlyLeft = false
			break
		}
	}
	roomCopy := *room
	h.roomsMu.Unlock()

	// Send current room state to the newly connected member
	stateData, err := json.Marshal(roomCopy)
	if err == nil {
		h.hub.SendToClient(client, models.SocketPayload{
			Event:     "room:state",
			RoomID:    client.RoomID,
			Data:      json.RawMessage(stateData),
			Timestamp: time.Now().UnixMilli(),
			SenderID:  "server",
		})
	}

	h.broadcastRoomUpdate(client.RoomID, client.UserID)
	if wasLeft && memberName != "" {
		h.broadcastSystemMessage(client.RoomID, memberName+" rejoined the room")
	}
	log.Printf("[WS] %s connected to room %s", client.UserID, client.RoomID)
}

// onClientDisconnect runs when a client's WS connection is closed.
// Marks the member offline, emits a system chat message, and notifies the room.
func (h *Handler) onClientDisconnect(client *websocket.Client) {
	if client.IsWaiter {
		log.Printf("[WS] waiter %s disconnected from room %s", client.UserID, client.RoomID)
		h.cancelPendingJoin(client.RoomID, client.UserID)
		return
	}

	h.roomsMu.Lock()
	room, ok := h.rooms[client.RoomID]
	if !ok {
		h.roomsMu.Unlock()
		return
	}
	stillInRoom := false
	for i := range room.Members {
		if room.Members[i].ID == client.UserID {
			stillInRoom = true
			// Unexpected disconnect (refresh/network): mark offline but do NOT treat as leave.
			// Explicit room:leave already set ExplicitlyLeft and emitted the chat message.
			if !room.Members[i].ExplicitlyLeft {
				room.Members[i].Status = models.StatusOffline
			}
			break
		}
	}
	allOffline := true
	for _, m := range room.Members {
		if m.Status == models.StatusOnline {
			allOffline = false
			break
		}
	}
	h.roomsMu.Unlock()

	if !stillInRoom {
		log.Printf("[WS] %s disconnected (not in room) %s", client.UserID, client.RoomID)
		return
	}

	h.broadcastRoomUpdate(client.RoomID, client.UserID)
	log.Printf("[WS] %s disconnected from room %s", client.UserID, client.RoomID)

	if allOffline {
		log.Printf("[WS] All members offline in room %s — auto-delete in 30 min", client.RoomID)
		h.scheduleAutoDelete(client.RoomID)
	}
}

// ─── Individual event handlers ────────────────────────────────────────────────

type joinRequestActionData struct {
	RequestID string `json:"requestId"`
}

// handleJoinRequestAccept accepts a pending join request: adds the user as a room member,
// broadcasts room:update to everyone, and sends room:state to the newly accepted user.
func (h *Handler) handleJoinRequestAccept(payload models.SocketPayload, client *websocket.Client) {
	var data joinRequestActionData
	if err := json.Unmarshal(payload.Data, &data); err != nil {
		log.Printf("join_request:accept — bad data: %v", err)
		return
	}

	var acceptedUserID string
	var acceptedName string
	var found bool
	var alreadyMember bool

	h.roomsMu.Lock()
	room, exists := h.rooms[payload.RoomID]
	if exists {
		for i, req := range room.PendingRequests {
			if req.ID == data.RequestID && req.Status == "pending" {
				for j := range room.Members {
					if room.Members[j].ID == req.UserID {
						alreadyMember = true
						break
					}
				}
				needsSlot := !alreadyMember
				if alreadyMember {
					for j := range room.Members {
						if room.Members[j].ID == req.UserID && room.Members[j].ExplicitlyLeft {
							needsSlot = true
							break
						}
					}
				}
				if needsSlot && presentCount(room) >= room.MaxMembers {
					h.roomsMu.Unlock()
					h.broadcastSystemMessage(payload.RoomID, "Room is full — couldn't add "+req.Name)
					return
				}

				room.PendingRequests[i].Status = "accepted"
				acceptedUserID = req.UserID
				acceptedName = req.Name
				found = true

				if alreadyMember {
					for j := range room.Members {
						if room.Members[j].ID == req.UserID {
							room.Members[j].Status = models.StatusOnline
							room.Members[j].HasRaisedHand = false
							room.Members[j].ExplicitlyLeft = false
							break
						}
					}
				} else {
					room.Members = append(room.Members, models.Member{
						ID:       req.UserID,
						Name:     req.Name,
						Avatar:   req.Avatar,
						Role:     models.RoleMember,
						Status:   models.StatusOnline,
						Language: req.Language,
						JoinedAt: time.Now().UnixMilli(),
					})
				}
				break
			}
		}
	}
	h.roomsMu.Unlock()

	if !found {
		log.Printf("join_request:accept — request %s not found or already resolved", data.RequestID)
		return
	}

	// Move the waiting socket into the member room so they start receiving broadcasts.
	promoted := h.hub.PromoteWaiter(payload.RoomID, acceptedUserID)

	h.broadcastRoomUpdate(payload.RoomID, client.UserID)

	if alreadyMember {
		h.broadcastSystemMessage(payload.RoomID, acceptedName+" rejoined the room")
	} else {
		h.broadcastSystemMessage(payload.RoomID, acceptedName+" joined the room")
	}

	if acceptedUserID != "" {
		requesterClient := promoted
		if requesterClient == nil {
			requesterClient = h.hub.FindClient(payload.RoomID, acceptedUserID)
		}
		if requesterClient != nil {
			h.sendRoomStateToClient(requesterClient)
			acceptData, _ := json.Marshal(map[string]string{"requestId": data.RequestID, "status": "accepted"})
			h.hub.SendToClient(requesterClient, models.SocketPayload{
				Event:     "join_request:accepted",
				RoomID:    payload.RoomID,
				Data:      json.RawMessage(acceptData),
				Timestamp: time.Now().UnixMilli(),
				SenderID:  "server",
			})
		}
	}
}

// handleJoinRequestReject rejects a pending join request and notifies the requester.
func (h *Handler) handleJoinRequestReject(payload models.SocketPayload, client *websocket.Client) {
	var data joinRequestActionData
	if err := json.Unmarshal(payload.Data, &data); err != nil {
		log.Printf("join_request:reject — bad data: %v", err)
		return
	}

	var rejectedUserID string

	h.roomsMu.Lock()
	room, exists := h.rooms[payload.RoomID]
	if exists {
		for i, req := range room.PendingRequests {
			if req.ID == data.RequestID && req.Status == "pending" {
				room.PendingRequests[i].Status = "rejected"
				rejectedUserID = req.UserID
				break
			}
		}
	}
	h.roomsMu.Unlock()

	if rejectedUserID == "" {
		return
	}

	if requesterClient := h.hub.FindClient(payload.RoomID, rejectedUserID); requesterClient != nil {
		rejectData, _ := json.Marshal(map[string]string{"requestId": data.RequestID, "status": "rejected"})
		h.hub.SendToClient(requesterClient, models.SocketPayload{
			Event:     "join_request:rejected",
			RoomID:    payload.RoomID,
			Data:      json.RawMessage(rejectData),
			Timestamp: time.Now().UnixMilli(),
			SenderID:  "server",
		})
	}
	// Give the reject payload a moment to flush before tearing down the waiter socket.
	go func(roomID, userID string) {
		time.Sleep(150 * time.Millisecond)
		h.hub.KickWaiter(roomID, userID)
	}(payload.RoomID, rejectedUserID)
}

type explanationStartData struct {
	PresenterID string `json:"presenterId"`
}

// handleExplanationStart creates an ExplanationSession on the room and broadcasts the update.
func (h *Handler) handleExplanationStart(payload models.SocketPayload, client *websocket.Client) {
	var data explanationStartData
	presenterID := client.UserID
	if err := json.Unmarshal(payload.Data, &data); err == nil && data.PresenterID != "" {
		presenterID = data.PresenterID
	}

	session := &models.ExplanationSession{
		ID:          fmt.Sprintf("session-%d", time.Now().UnixMilli()),
		RoomID:      payload.RoomID,
		PresenterID: presenterID,
		Followers:   []string{},
		Observers:   []string{},
		StartedAt:   time.Now().UnixMilli(),
		IsActive:    true,
		CanvasData:  nil,
	}

	h.roomsMu.Lock()
	if room, ok := h.rooms[payload.RoomID]; ok {
		room.Status = models.RoomExplanation
		room.ExplanationSession = session
		for i := range room.Members {
			if room.Members[i].ID == presenterID {
				room.Members[i].IsInExplanationMode = true
				room.Members[i].HasRaisedHand = false // clear hand raise on session start
			}
		}
	}
	h.roomsMu.Unlock()

	h.broadcastRoomUpdate(payload.RoomID, "server")
}

// handleExplanationEnd closes the active ExplanationSession and resets the room status.
func (h *Handler) handleExplanationEnd(payload models.SocketPayload, client *websocket.Client) {
	h.roomsMu.Lock()
	if room, ok := h.rooms[payload.RoomID]; ok {
		room.Status = models.RoomActive
		room.ExplanationSession = nil
		for i := range room.Members {
			room.Members[i].IsInExplanationMode = false
		}
	}
	h.roomsMu.Unlock()

	h.broadcastRoomUpdate(payload.RoomID, "server")
}

// handleCanvasUpdate stores the latest canvas snapshot in the session and relays to followers.
func (h *Handler) handleCanvasUpdate(payload models.SocketPayload, client *websocket.Client) {
	// Extract the raw canvas data string and persist it in the session
	var canvasMsg struct {
		Elements string `json:"elements"`
	}
	if err := json.Unmarshal(payload.Data, &canvasMsg); err == nil {
		h.roomsMu.Lock()
		if room, ok := h.rooms[payload.RoomID]; ok {
			if room.ExplanationSession != nil {
				room.ExplanationSession.CanvasData = &canvasMsg.Elements
			}
		}
		h.roomsMu.Unlock()
	}

	h.hub.BroadcastToRoomExcept(payload, client)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func presentCount(room *models.Room) int {
	n := 0
	for _, m := range room.Members {
		if !m.ExplicitlyLeft {
			n++
		}
	}
	return n
}

func clampRunes(s string, max int) string {
	runes := []rune(strings.TrimSpace(s))
	if len(runes) > max {
		return string(runes[:max])
	}
	return string(runes)
}

func clampWords(s string, max int) string {
	fields := strings.Fields(strings.TrimSpace(s))
	if len(fields) > max {
		fields = fields[:max]
	}
	return strings.Join(fields, " ")
}

func (h *Handler) allowChatMessage(roomID, userID string, raw json.RawMessage) bool {
	var msg struct {
		Content string `json:"content"`
	}
	if err := json.Unmarshal(raw, &msg); err != nil {
		return false
	}
	if len([]rune(msg.Content)) > chatMaxContentRunes {
		return false
	}
	key := roomID + ":" + userID
	now := time.Now().UnixMilli()
	h.chatMu.Lock()
	defer h.chatMu.Unlock()
	hits := h.chatHits[key]
	cutoff := now - chatWindowMs
	kept := hits[:0]
	for _, t := range hits {
		if t > cutoff {
			kept = append(kept, t)
		}
	}
	if len(kept) >= chatMaxPerWindow {
		h.chatHits[key] = kept
		return false
	}
	h.chatHits[key] = append(kept, now)
	return true
}

func (h *Handler) cancelPendingJoin(roomID, userID string) {
	h.roomsMu.Lock()
	room, ok := h.rooms[roomID]
	if !ok {
		h.roomsMu.Unlock()
		return
	}
	changed := false
	next := make([]models.JoinRequest, 0, len(room.PendingRequests))
	for _, req := range room.PendingRequests {
		if req.UserID == userID && req.Status == "pending" {
			changed = true
			continue
		}
		next = append(next, req)
	}
	if changed {
		room.PendingRequests = next
	}
	h.roomsMu.Unlock()
	if !changed {
		return
	}
	h.broadcastRoomUpdate(roomID, userID)
	cancelData, _ := json.Marshal(map[string]string{"userId": userID})
	h.hub.BroadcastToRoom(models.SocketPayload{
		Event:     "join_request:cancelled",
		RoomID:    roomID,
		Data:      json.RawMessage(cancelData),
		Timestamp: time.Now().UnixMilli(),
		SenderID:  userID,
	})
}

func (h *Handler) handleRoomKick(payload models.SocketPayload, client *websocket.Client) {
	var data struct {
		UserID string `json:"userId"`
	}
	if err := json.Unmarshal(payload.Data, &data); err != nil || data.UserID == "" {
		return
	}

	var kickedName string
	h.roomsMu.Lock()
	room, ok := h.rooms[payload.RoomID]
	if !ok || room.HostID != client.UserID || data.UserID == room.HostID {
		h.roomsMu.Unlock()
		return
	}
	kept := make([]models.Member, 0, len(room.Members))
	for _, m := range room.Members {
		if m.ID == data.UserID {
			kickedName = m.Name
			continue
		}
		kept = append(kept, m)
	}
	if kickedName == "" {
		h.roomsMu.Unlock()
		return
	}
	room.Members = kept
	h.roomsMu.Unlock()

	if target := h.hub.FindClient(payload.RoomID, data.UserID); target != nil {
		kickData, _ := json.Marshal(map[string]string{"userId": data.UserID})
		h.hub.SendToClient(target, models.SocketPayload{
			Event:     "room:kicked",
			RoomID:    payload.RoomID,
			Data:      json.RawMessage(kickData),
			Timestamp: time.Now().UnixMilli(),
			SenderID:  "server",
		})
	}

	h.broadcastRoomUpdate(payload.RoomID, client.UserID)
	h.broadcastSystemMessage(payload.RoomID, kickedName+" was removed from the room")

	go func() {
		time.Sleep(150 * time.Millisecond)
		h.hub.KickClient(payload.RoomID, data.UserID)
	}()
}

// setMemberField updates a single field on a member using a closure.
func (h *Handler) setMemberField(roomID, userID string, mutate func(*models.Member)) {
	h.roomsMu.Lock()
	defer h.roomsMu.Unlock()
	room, ok := h.rooms[roomID]
	if !ok {
		return
	}
	for i := range room.Members {
		if room.Members[i].ID == userID {
			mutate(&room.Members[i])
			return
		}
	}
}

// broadcastRoomUpdate sends the current room state to all connected clients in the room.
func (h *Handler) broadcastRoomUpdate(roomID, triggerUserID string) {
	h.roomsMu.RLock()
	room, ok := h.rooms[roomID]
	if !ok {
		h.roomsMu.RUnlock()
		return
	}
	roomCopy := *room
	h.roomsMu.RUnlock()

	data, err := json.Marshal(roomCopy)
	if err != nil {
		log.Printf("broadcastRoomUpdate: marshal error: %v", err)
		return
	}
	h.hub.BroadcastToRoom(models.SocketPayload{
		Event:     "room:update",
		RoomID:    roomID,
		Data:      json.RawMessage(data),
		Timestamp: time.Now().UnixMilli(),
		SenderID:  triggerUserID,
	})
}

func (h *Handler) sendRoomStateToClient(client *websocket.Client) {
	h.roomsMu.RLock()
	room, ok := h.rooms[client.RoomID]
	if !ok {
		h.roomsMu.RUnlock()
		return
	}
	roomCopy := *room
	h.roomsMu.RUnlock()

	data, err := json.Marshal(roomCopy)
	if err != nil {
		return
	}
	h.hub.SendToClient(client, models.SocketPayload{
		Event:     "room:state",
		RoomID:    client.RoomID,
		Data:      json.RawMessage(data),
		Timestamp: time.Now().UnixMilli(),
		SenderID:  "server",
	})
}

// generateRoomID generates a random 8-character alphanumeric room ID.
func generateRoomID() string {
	const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, 8)
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	for i := range b {
		b[i] = letters[r.Intn(len(letters))]
	}
	return string(b)
}

// handleHandDismiss lets the host clear a member's raised hand.
// Payload data: { "userId": "<memberId>" }
func (h *Handler) handleHandDismiss(payload models.SocketPayload, client *websocket.Client) {
	var data struct {
		UserID string `json:"userId"`
	}
	if err := json.Unmarshal(payload.Data, &data); err != nil || data.UserID == "" {
		log.Printf("hand:dismiss — bad data: %v", err)
		return
	}
	h.setMemberField(payload.RoomID, data.UserID, func(m *models.Member) { m.HasRaisedHand = false })
	h.broadcastRoomUpdate(payload.RoomID, client.UserID)
}

// routeToTarget sends the payload directly to the client identified by payload.TargetUserID.
// Used for WebRTC signaling and other P2P messages.
func (h *Handler) routeToTarget(payload models.SocketPayload, sender *websocket.Client) {
	if payload.TargetUserID == "" {
		log.Printf("routeToTarget: TargetUserID is empty for event '%s'", payload.Event)
		return
	}
	target := h.hub.FindClient(payload.RoomID, payload.TargetUserID)
	if target == nil {
		log.Printf("routeToTarget: client '%s' not connected in room '%s'", payload.TargetUserID, payload.RoomID)
		return
	}
	h.hub.SendToClient(target, payload)
}

// DeleteRoom handles DELETE /api/rooms/:roomId — only the host should call this.
// It purges the room from memory and notifies all connected clients.
func (h *Handler) DeleteRoom(c *gin.Context) {
	roomID := c.Param("roomId")

	h.cancelAutoDelete(roomID)

	h.roomsMu.Lock()
	_, exists := h.rooms[roomID]
	if !exists {
		h.roomsMu.Unlock()
		c.JSON(http.StatusNotFound, gin.H{"error": "room not found"})
		return
	}
	delete(h.rooms, roomID)
	h.roomsMu.Unlock()

	// Notify everyone that the room is gone so clients can clean up
	h.hub.BroadcastToRoomIncludingWaiters(models.SocketPayload{
		Event:     "room:deleted",
		RoomID:    roomID,
		Data:      json.RawMessage(`{}`),
		Timestamp: time.Now().UnixMilli(),
		SenderID:  "server",
	})

	c.JSON(http.StatusOK, gin.H{"message": "room deleted"})
	log.Printf("[API] Room %s deleted", roomID)
}

// handleRoomLeave marks the member as offline on an explicit leave.
// We keep the member in the list so they can rejoin without re-approval.
// The "left" system message is emitted here; onClientDisconnect will be a no-op
// because it checks whether the member is still "online".
func (h *Handler) handleRoomLeave(payload models.SocketPayload, client *websocket.Client) {
	var memberName string
	h.roomsMu.Lock()
	if room, ok := h.rooms[payload.RoomID]; ok {
		for i := range room.Members {
			if room.Members[i].ID == client.UserID {
				memberName = room.Members[i].Name
				room.Members[i].Status = models.StatusOffline
				room.Members[i].ExplicitlyLeft = true
				room.Members[i].HasRaisedHand = false
				room.Members[i].IsSpeaking = false
				break
			}
		}
	}
	h.roomsMu.Unlock()

	h.broadcastRoomUpdate(payload.RoomID, client.UserID)
	if memberName != "" {
		h.broadcastSystemMessage(payload.RoomID, memberName+" left the room")
	}
}

// broadcastSystemMessage sends a system-type chat message to the entire room.
func (h *Handler) broadcastSystemMessage(roomID, content string) {
	msgData, _ := json.Marshal(map[string]interface{}{
		"id":           fmt.Sprintf("sys-%d", time.Now().UnixNano()),
		"roomId":       roomID,
		"senderId":     "system",
		"senderName":   "System",
		"senderAvatar": "ghost",
		"type":         "system",
		"content":      content,
		"timestamp":    time.Now().UnixMilli(),
		"isRead":       false,
	})
	h.hub.BroadcastToRoom(models.SocketPayload{
		Event:     "chat:message",
		RoomID:    roomID,
		Data:      json.RawMessage(msgData),
		Timestamp: time.Now().UnixMilli(),
		SenderID:  "system",
	})
}

func generateRandomString(n int) string {
	const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, n)
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	for i := range b {
		b[i] = letters[r.Intn(len(letters))]
	}
	return string(b)
}
