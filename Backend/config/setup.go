package config

import (
	"bookingSystem/backend-api/models"
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDB() {
	dsn := os.Getenv("DATABASE_URL") // Supabase connection string

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	err = db.AutoMigrate(

		&models.Booking{},
	)
	if err != nil {
		log.Fatal("Failed to auto migrate:", err)
	}

	DB = db
	log.Println("Database connected & migrated!")
}
