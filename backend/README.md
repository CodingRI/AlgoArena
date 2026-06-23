# 🚀 AlgoArena Go Backend

This is the Go backend template for the **AlgoArena** (LeetCode Collab) Chrome Extension. It implements the REST APIs for room creation/management and provides a robust WebSocket Hub for real-time collaboration (chat sync, cursor tracking, drawing canvas, and presenter settings).

---

## 🗂 Project Structure

```
backend/
├── cmd/
│   └── server/
│       └── main.go       # Server entrypoint (initializes Hub & Gin Router)
├── internal/
│   ├── handlers/
│   │   └── handlers.go   # Gin Route handlers (REST endpoints & WS upgrader)
│   ├── models/
│   │   └── models.go     # Go structs matching frontend TypeScript types
│   └── websocket/
│       ├── client.go     # WS connection upgrade, read/write loops, heartbeat
│       └── hub.go        # WS Room hub (concurrency-safe room tracking & broadcasts)
├── go.mod                # Go module descriptor
└── README.md             # This documentation
```

---

## ⚡ Prerequisites

To run this backend, you need:
- [Go 1.21+](https://go.dev/doc/install) installed on your system.

---

## 🛠 Setup & Run

### 1. Download Dependencies
Run the following command from the `backend/` directory to fetch the required dependencies (Gin & Gorilla Websocket) and tidy the module database:
```bash
go mod tidy
```

### 2. Run the Development Server
Run the main server file:
```bash
go run cmd/server/main.go
```
The server will start up on `http://localhost:8080`.

### 3. Build for Production
To build a compiled binary executable of the server:
```bash
go build -o server cmd/server/main.go
```
Then run the compiled binary:
```bash
./server
```

---

## 🔌 API Endpoints Reference

### HTTP API Endpoints

- **Create a Room**
  - **URL:** `POST /api/rooms`
  - **Content-Type:** `application/json`
  - **Body Format:**
    ```json
    {
      "name": "My Room",
      "language": "python",
      "hostId": "user-123",
      "avatar": "astronaut"
    }
    ```
  - **Response:** `201 Created` with the JSON representation of the new `Room`.

- **Get Room State**
  - **URL:** `GET /api/rooms/:roomId`
  - **Response:** `200 OK` with the `Room` state object, or `404 Not Found`.

- **Join Room Request**
  - **URL:** `POST /api/rooms/:roomId/join`
  - **Content-Type:** `application/json`
  - **Body Format:**
    ```json
    {
      "userId": "user-456",
      "name": "GuestUser",
      "avatar": "robot",
      "language": "go"
    }
    ```
  - **Response:** `200 OK` containing a new `JoinRequest` object, and broadcasts a `join_request:received` notification to active members.

### WebSocket Endpoint

- **Connect to Room WebSocket**
  - **URL:** `WS /ws?roomId=<roomId>&userId=<userId>`
  - **Description:** Upgrades the connection to a persistent WebSocket. It routes real-time communications such as chat messages (`chat:message`), laser pointer tracking (`laser:move`), canvas updates (`canvas:update`), and hand-raising notifications directly to other users in the same room.
