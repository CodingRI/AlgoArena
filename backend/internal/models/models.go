package models

import "encoding/json"

// UserRole represents the role of a user in a room.
type UserRole string

const (
	RoleHost   UserRole = "host"
	RoleMember UserRole = "member"
	RoleGuest  UserRole = "guest"
)

// MemberStatus represents the online status of a member.
type MemberStatus string

const (
	StatusOnline  MemberStatus = "online"
	StatusOffline MemberStatus = "offline"
	StatusAway    MemberStatus = "away"
)

// Language represents the programming languages supported by the application.
type Language string

const (
	LangPython     Language = "python"
	LangJavaScript Language = "javascript"
	LangTypeScript Language = "typescript"
	LangJava       Language = "java"
	LangCPP        Language = "cpp"
	LangGo         Language = "go"
	LangRust       Language = "rust"
	LangKotlin     Language = "kotlin"
	LangSwift      Language = "swift"
	LangC          Language = "c"
)

// AvatarOption represents the avatar types.
type AvatarOption string

// Member represents a room collaborator.
type Member struct {
	ID                  string       `json:"id"`
	Name                string       `json:"name"`
	Avatar              AvatarOption `json:"avatar"`
	Role                UserRole     `json:"role"`
	Status              MemberStatus `json:"status"`
	Language            Language     `json:"language"`
	IsSpeaking          bool         `json:"isSpeaking"`
	IsMuted             bool         `json:"isMuted"`
	IsInExplanationMode bool         `json:"isInExplanationMode"`
	HasRaisedHand       bool         `json:"hasRaisedHand"`
	JoinedAt            int64        `json:"joinedAt"`
	// ExplicitlyLeft is true after room:leave. The member stays in the list so they
	// can rejoin without a new approval, but they are not counted as present.
	ExplicitlyLeft bool `json:"explicitlyLeft"`
}

// RoomStatus represents the current phase of a room.
type RoomStatus string

const (
	RoomWaiting     RoomStatus = "waiting"
	RoomActive      RoomStatus = "active"
	RoomExplanation RoomStatus = "explanation"
	RoomClosed      RoomStatus = "closed"
)

// LaserPosition represents coordinates for cursor/laser sync.
type LaserPosition struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// ExplanationSession represents an explanation/presentation session.
type ExplanationSession struct {
	ID            string         `json:"id"`
	RoomID        string         `json:"roomId"`
	PresenterID   string         `json:"presenterId"`
	Followers     []string       `json:"followers"`
	Observers     []string       `json:"observers"`
	StartedAt     int64          `json:"startedAt"`
	IsActive      bool           `json:"isActive"`
	CanvasData    *string        `json:"canvasData"`
	LaserPosition *LaserPosition `json:"laserPosition"`
}

// JoinRequest represents a user request to enter a room.
type JoinRequest struct {
	ID          string       `json:"id"`
	UserID      string       `json:"userId"`
	Name        string       `json:"name"`
	Avatar      AvatarOption `json:"avatar"`
	Language    Language     `json:"language"`
	RequestedAt int64        `json:"requestedAt"`
	Status      string       `json:"status"` // "pending", "accepted", "rejected"
	// Returning is true when this is a former member auto-accepted back in.
	Returning bool `json:"returning,omitempty"`
}

// Room represents a collaborative session space.
type Room struct {
	ID                 string              `json:"id"`
	Name               string              `json:"name"`
	HostID             string              `json:"hostId"`
	Members            []Member            `json:"members"`
	Status             RoomStatus          `json:"status"`
	Language           Language            `json:"language"`
	CreatedAt          int64               `json:"createdAt"`
	MaxMembers         int                 `json:"maxMembers"`
	IsLocked           bool                `json:"isLocked"`
	PendingRequests    []JoinRequest       `json:"pendingRequests"`
	ExplanationSession *ExplanationSession `json:"explanationSession"`
}

// MessageType represents the type of chat message.
type MessageType string

const (
	MsgText   MessageType = "text"
	MsgCode   MessageType = "code"
	MsgSystem MessageType = "system"
	MsgAction MessageType = "action"
)

// ChatMessage represents a message sent in the chat tab.
type ChatMessage struct {
	ID           string       `json:"id"`
	RoomID       string       `json:"roomId"`
	SenderID     string       `json:"senderId"`
	SenderName   string       `json:"senderName"`
	SenderAvatar AvatarOption `json:"senderAvatar"`
	Type         MessageType  `json:"type"`
	Content      string       `json:"content"`
	Language     Language     `json:"language,omitempty"`
	Timestamp    int64        `json:"timestamp"`
	IsRead       bool         `json:"isRead"`
}

// TypingIndicator represents who is currently typing in a room.
type TypingIndicator struct {
	UserID   string `json:"userId"`
	UserName string `json:"userName"`
	RoomID   string `json:"roomId"`
	Avatar   string `json:"avatar,omitempty"`
}

// VoiceStatus represents state of voice connection.
type VoiceStatus string

const (
	VoiceConnected    VoiceStatus = "connected"
	VoiceConnecting   VoiceStatus = "connecting"
	VoiceDisconnected VoiceStatus = "disconnected"
	VoiceError        VoiceStatus = "error"
)

// VoiceState represents the state of voice activity in a room.
type VoiceState struct {
	Status         VoiceStatus `json:"status"`
	IsMuted        bool        `json:"isMuted"`
	ActiveSpeakers []string    `json:"activeSpeakers"`
	Volume         float64     `json:"volume"`
}

// RaiseHandRequest represents a user request to present.
type RaiseHandRequest struct {
	ID          string       `json:"id"`
	UserID      string       `json:"userId"`
	UserName    string       `json:"userName"`
	UserAvatar  AvatarOption `json:"userAvatar"`
	RoomID      string       `json:"roomId"`
	RequestedAt int64        `json:"requestedAt"`
	Status      string       `json:"status"` // "pending", "accepted", "rejected"
}

// AppSettings represents settings configured by a user.
type AppSettings struct {
	MuteNotifications   bool          `json:"muteNotifications"`
	MuteChatSounds      bool          `json:"muteChatSounds"`
	ShowGalaxyParticles bool          `json:"showGalaxyParticles"`
	CompactMode         bool          `json:"compactMode"`
	ThemeIntensity      string        `json:"themeIntensity"` // "low", "medium", "high"
	PanelPosition       LaserPosition `json:"panelPosition"`
}

// PanelConfig represents position/state of the extension panel.
type PanelConfig struct {
	State       string        `json:"state"` // "collapsed", "expanded"
	ActiveTab   string        `json:"activeTab"`
	Position    LaserPosition `json:"position"`
	UnreadCount int           `json:"unreadCount"`
}

// SocketPayload is the generic wrapping structure for all websocket communications.
type SocketPayload struct {
	Event        string          `json:"event"`
	RoomID       string          `json:"roomId"`
	Data         json.RawMessage `json:"data"` // Kept as RawMessage for flexible unpacking
	Timestamp    int64           `json:"timestamp"`
	SenderID     string          `json:"senderId"`
	// TargetUserID, when non-empty, routes this payload to a specific client only
	// instead of broadcasting to the whole room (used for WebRTC signaling, P2P events).
	TargetUserID string          `json:"targetUserId,omitempty"`
}

// CreateRoomPayload represents the body expected in HTTP room creation.
type CreateRoomPayload struct {
	Name     string       `json:"name" binding:"required"`
	HostName string       `json:"hostName" binding:"required"`
	Language Language     `json:"language" binding:"required"`
	HostID   string       `json:"hostId" binding:"required"`
	Avatar   AvatarOption `json:"avatar" binding:"required"`
}
