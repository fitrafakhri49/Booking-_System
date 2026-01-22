package main

import (
	"log"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"bookingSystem/backend-api/config"
	"bookingSystem/backend-api/routes"
)

func main() {
	godotenv.Load()

	config.ConnectDB()

	r := gin.Default()

	// 🔐 CORS CONFIG
	r.Use(cors.New(cors.Config{
		AllowOrigins: []string{
			"http://localhost:3000", // Next.js
		},
		AllowMethods: []string{
			"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH",
		},
		AllowHeaders: []string{
			"Origin", "Content-Type", "Authorization",
		},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	routes.RegisterRoutes(r)

	port := os.Getenv("APP_PORT")

	log.Println("Server running on port", port)
	r.Run(":" + port)
}
