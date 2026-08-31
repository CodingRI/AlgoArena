package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"backend/internal/handlers"
	"backend/internal/websocket"

	"github.com/gin-gonic/gin"
)

func main() {
	// Release mode on Render (GIN_MODE=release). Local: GIN_MODE=debug go run ...
	if os.Getenv("GIN_MODE") != "debug" {
		gin.SetMode(gin.ReleaseMode)
	}

	log.Println("Starting AlgoArena Backend...")
	log.Println("Persistence: in-memory only — rooms are lost if this process restarts, redeploys, or sleeps.")

	// 1. Initialize WebSocket Hub
	hub := websocket.NewHub()

	// 2. Initialize Handlers — this also wires hub.HandleEvent / OnConnect / OnDisconnect
	h := handlers.NewHandler(hub)

	// 3. Start hub event loop AFTER callbacks are wired to avoid any race
	go hub.Run()

	// 4. Initialize Gin router
	r := gin.Default()

	// 5. Attach CORS middleware
	r.Use(handlers.CORSMiddleware())

	// 6. REST API routes
	api := r.Group("/api")
	{
		api.POST("/rooms", h.CreateRoom)
		api.GET("/rooms/:roomId", h.GetRoomState)
		api.POST("/rooms/:roomId/join", h.JoinRoomRequest)
		api.DELETE("/rooms/:roomId", h.DeleteRoom)
	}

	// 7. WebSocket route
	r.GET("/ws", h.HandleWebSocket)

	// 8. Health Check — Render healthCheckPath must be /health
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":      "healthy",
			"timestamp":   time.Now().Unix(),
			"persistence": "in-memory",
			"note":        "Rooms live only in process memory and disappear if the server restarts.",
		})
	})

	// Get port from environment or default to 8080
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: r,
	}

	// 9. Graceful shutdown setup
	go func() {
		log.Printf("Server listening on port %s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen error: %s\n", err)
		}
	}()

	// Wait for interrupt signal to gracefully shut down the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("Server exiting")
}
