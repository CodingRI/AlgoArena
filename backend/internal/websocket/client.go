package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"backend/internal/models"

	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer.
	maxMessageSize = 512 * 1024 // 512KB for custom drawings/canvas
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// Allowing all origins for templates. Modify in production.
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// Client is a middleman between the websocket connection and the hub.
type Client struct {
	Hub *Hub

	// The websocket connection.
	Conn *websocket.Conn

	// Buffered channel of outbound messages.
	Send chan []byte

	// Room ID the user is connected to.
	RoomID string

	// User ID of the connected member.
	UserID string

	// IsWaiter is true while the user has a pending join request and is not yet a member.
	// Waiters receive only targeted accept/reject (and ping) — never room state or chat.
	IsWaiter bool
}

// ReadPump pumps messages from the websocket connection to the hub.
//
// The application runs ReadPump in a per-connection goroutine. The application
// ensures that there is at most one reader on a connection by executing all
// reads from this goroutine.
func (c *Client) ReadPump() {
	defer func() {
		c.Hub.unregister <- c
		c.Conn.Close()
	}()
	c.Conn.SetReadLimit(maxMessageSize)
	_ = c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		_ = c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		// Decode the message to verify it conforms to SocketPayload
		var payload models.SocketPayload
		if err := json.Unmarshal(message, &payload); err != nil {
			log.Printf("error unmarshaling incoming websocket message: %v", err)
			continue
		}

		// Ensure payload metadata is populated from connection if empty
		if payload.RoomID == "" {
			payload.RoomID = c.RoomID
		}
		if payload.SenderID == "" {
			payload.SenderID = c.UserID
		}
		if payload.Timestamp == 0 {
			payload.Timestamp = time.Now().UnixMilli()
		}

		// Route the event through the Hub's HandleEvent if registered,
		// otherwise fall back to a plain broadcast.
		if c.Hub.HandleEvent != nil {
			c.Hub.HandleEvent(payload, c)
		} else {
			c.Hub.broadcast <- payload
		}
	}
}

// WritePump pumps messages from the hub to the websocket connection.
//
// A goroutine running WritePump is started for each connection. The
// application ensures that there is at most one writer on a connection by
// executing all writes from this goroutine.
func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.Send:
			_ = c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel.
				_ = c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			_, _ = w.Write(message)

			// Add queued chat messages to the current websocket message.
			n := len(c.Send)
			for i := 0; i < n; i++ {
				_, _ = w.Write([]byte{'\n'})
				_, _ = w.Write(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// UpgradeConnection upgrades the HTTP server connection to the WebSocket protocol.
func UpgradeConnection(hub *Hub, w http.ResponseWriter, r *http.Request, roomID string, userID string, isWaiter bool) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}
	client := &Client{
		Hub:      hub,
		Conn:     conn,
		Send:     make(chan []byte, 256),
		RoomID:   roomID,
		UserID:   userID,
		IsWaiter: isWaiter,
	}
	client.Hub.register <- client

	// Allow collection of memory and caller resources by doing the work in new goroutines.
	go client.WritePump()
	go client.ReadPump()
}
