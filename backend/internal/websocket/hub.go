package websocket

import (
	"encoding/json"
	"log"
	"sync"

	"backend/internal/models"
)

// Hub maintains the set of active clients and handles broadcasting messages.
type Hub struct {
	// Registered rooms, mapping RoomID to a map of member Clients
	rooms map[string]map[*Client]bool
	
	waiters map[string]map[*Client]bool
	mu      sync.RWMutex

	// Register requests from the clients.
	register chan *Client

	// Unregister requests from clients.
	unregister chan *Client

	// Broadcast channel for distributing messages to specific rooms.
	broadcast chan models.SocketPayload

	// HandleEvent is called for every incoming client message instead of
	// blindly broadcasting. Set by the Handler after hub creation.
	HandleEvent func(payload models.SocketPayload, client *Client)

	// OnConnect is called (in a goroutine) when a new client registers.
	OnConnect func(client *Client)

	// OnDisconnect is called (in a goroutine) when a client unregisters.
	OnDisconnect func(client *Client)
}

// NewHub creates a new WebSocket hub.
func NewHub() *Hub {
	return &Hub{
		rooms:      make(map[string]map[*Client]bool),
		waiters:    make(map[string]map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan models.SocketPayload, 256),
	}
}

func addClient(bucket map[string]map[*Client]bool, client *Client) {
	if bucket[client.RoomID] == nil {
		bucket[client.RoomID] = make(map[*Client]bool)
	}
	for existing := range bucket[client.RoomID] {
		if existing.UserID == client.UserID && existing != client {
			delete(bucket[client.RoomID], existing)
			close(existing.Send)
			log.Printf("Evicted stale connection for %s in room %s", existing.UserID, client.RoomID)
		}
	}
	bucket[client.RoomID][client] = true
}

func removeClient(bucket map[string]map[*Client]bool, client *Client) bool {
	clients, ok := bucket[client.RoomID]
	if !ok {
		return false
	}
	if _, exists := clients[client]; !exists {
		return false
	}
	delete(clients, client)
	close(client.Send)
	if len(clients) == 0 {
		delete(bucket, client.RoomID)
	}
	return true
}

// Run starts the hub's main event loop to handle registration and broadcasting.
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			if client.IsWaiter {
				addClient(h.waiters, client)
			} else {
				addClient(h.rooms, client)
			}
			h.mu.Unlock()
			log.Printf("Client %s registered to room %s (waiter=%v)", client.UserID, client.RoomID, client.IsWaiter)

			if h.OnConnect != nil {
				go h.OnConnect(client)
			}

		case client := <-h.unregister:
			h.mu.Lock()
			wasRegistered := removeClient(h.rooms, client)
			if !wasRegistered {
				wasRegistered = removeClient(h.waiters, client)
			}
			h.mu.Unlock()

			if wasRegistered {
				log.Printf("Client %s unregistered from room %s (waiter=%v)", client.UserID, client.RoomID, client.IsWaiter)
			}

			// Only call OnDisconnect when the client was actually registered —
			// prevents double-fire when both ReadPump and WritePump close the conn.
			if wasRegistered && h.OnDisconnect != nil {
				go h.OnDisconnect(client)
			}

		case msg := <-h.broadcast:
			h.mu.RLock()
			clients, ok := h.rooms[msg.RoomID]
			if ok {
				payloadBytes, err := json.Marshal(msg)
				if err != nil {
					log.Printf("Error marshaling broadcast payload: %v", err)
					h.mu.RUnlock()
					continue
				}
				for client := range clients {
					select {
					case client.Send <- payloadBytes:
					default:
						close(client.Send)
						h.mu.RUnlock()
						h.mu.Lock()
						delete(h.rooms[client.RoomID], client)
						h.mu.Unlock()
						h.mu.RLock()
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

// BroadcastToRoom sends a payload to every member client in the room via the broadcast channel.
func (h *Hub) BroadcastToRoom(payload models.SocketPayload) {
	h.broadcast <- payload
}

// BroadcastToRoomExcept sends a payload to every member client in the room except the given one.
func (h *Hub) BroadcastToRoomExcept(payload models.SocketPayload, exclude *Client) {
	data, err := json.Marshal(payload)
	if err != nil {
		log.Printf("BroadcastToRoomExcept: marshal error: %v", err)
		return
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	clients, ok := h.rooms[payload.RoomID]
	if !ok {
		return
	}
	for client := range clients {
		if client == exclude {
			continue
		}
		select {
		case client.Send <- data:
		default:
			log.Printf("BroadcastToRoomExcept: channel full for client %s", client.UserID)
		}
	}
}

// BroadcastToRoomIncludingWaiters sends to members AND pending waiters (used for room:deleted).
func (h *Hub) BroadcastToRoomIncludingWaiters(payload models.SocketPayload) {
	data, err := json.Marshal(payload)
	if err != nil {
		log.Printf("BroadcastToRoomIncludingWaiters: marshal error: %v", err)
		return
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, bucket := range []map[*Client]bool{h.rooms[payload.RoomID], h.waiters[payload.RoomID]} {
		for client := range bucket {
			select {
			case client.Send <- data:
			default:
				log.Printf("BroadcastToRoomIncludingWaiters: channel full for client %s", client.UserID)
			}
		}
	}
}

// SendToClient sends a payload directly to a specific client.
func (h *Hub) SendToClient(client *Client, payload models.SocketPayload) {
	data, err := json.Marshal(payload)
	if err != nil {
		log.Printf("SendToClient: marshal error: %v", err)
		return
	}
	select {
	case client.Send <- data:
	default:
		log.Printf("SendToClient: channel full for client %s", client.UserID)
	}
}

func findInBucket(bucket map[*Client]bool, userID string) *Client {
	for client := range bucket {
		if client.UserID == userID {
			return client
		}
	}
	return nil
}

// FindClient looks up a connected client (member or waiter) by room and user ID.
func (h *Hub) FindClient(roomID, userID string) *Client {
	h.mu.RLock()
	defer h.mu.RUnlock()
	if c := findInBucket(h.rooms[roomID], userID); c != nil {
		return c
	}
	return findInBucket(h.waiters[roomID], userID)
}

// PromoteWaiter moves a pending join-request connection into the member room map.
func (h *Hub) PromoteWaiter(roomID, userID string) *Client {
	h.mu.Lock()
	defer h.mu.Unlock()
	waiters, ok := h.waiters[roomID]
	if !ok {
		return nil
	}
	found := findInBucket(waiters, userID)
	if found == nil {
		return nil
	}
	delete(waiters, found)
	if len(waiters) == 0 {
		delete(h.waiters, roomID)
	}
	found.IsWaiter = false
	if h.rooms[roomID] == nil {
		h.rooms[roomID] = make(map[*Client]bool)
	}
	h.rooms[roomID][found] = true
	log.Printf("Promoted waiter %s to member in room %s", userID, roomID)
	return found
}

// KickWaiter unregisters a pending join-request connection (used after reject).
func (h *Hub) KickWaiter(roomID, userID string) {
	h.KickClient(roomID, userID)
}

// KickClient unregisters a member or waiter connection.
func (h *Hub) KickClient(roomID, userID string) {
	if found := h.FindClient(roomID, userID); found != nil {
		h.unregister <- found
	}
}
