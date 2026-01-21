package models

import "time"

type Booking struct {
	ID    uint `gorm:"primaryKey"`
	Name  string
	Phone string

	StartTime time.Time // waktu mulai booking
	EndTime   time.Time // dihitung dari durasi

	CreatedAt time.Time
}
