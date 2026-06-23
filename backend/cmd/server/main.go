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
	log.Println("Starting AlgoArena Backend...")

	// 1. Initialize WebSocket Hub
	hub := websocket.NewHub()
	go hub.Run()

	// 2. Initialize Gin router
	r := gin.Default()

	// 3. Attach CORS middleware
	r.Use(handlers.CORSMiddleware())

	// 4. Initialize Handlers
	h := handlers.NewHandler(hub)

	// 5. REST API routes
	api := r.Group("/api")
	{
		api.POST("/rooms", h.CreateRoom)
		api.GET("/rooms/:roomId", h.GetRoomState)
		api.POST("/rooms/:roomId/join", h.JoinRoomRequest)
	}

	// 6. WebSocket route
	r.GET("/ws", h.HandleWebSocket)

	// 7. Health Check route
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "healthy",
			"timestamp": time.Now().Unix(),
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

	// 8. Graceful shutdown setup
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
