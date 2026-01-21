package models

import "time"

type User struct {
	Id        int       `gorm:"primaryKey" json:"id"`
	Name      string    `json:"name"`
	Username  string    `gorm:"unique" json:"username"`
	Password  string    `json:"-"` // Password tidak akan ditampilkan di JSON output
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
