package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"bookingSystem/backend-api/config"
	"bookingSystem/backend-api/routes"
)

func main() {
	godotenv.Load()

	config.ConnectDB()

	r := gin.Default()
	routes.RegisterRoutes(r)

	port := os.Getenv("APP_PORT")
	if port == "" {
		port = "8080"
	}

	log.Println("Server running on port", port)
	r.Run(":" + port)
}
