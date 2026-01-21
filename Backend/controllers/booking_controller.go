package controllers

import (
	"bookingSystem/backend-api/config"
	"bookingSystem/backend-api/models"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

func CreateBooking(c *gin.Context) {
	var input struct {
		Name      string `json:"name" binding:"required"`
		Phone     string `json:"phone" binding:"required"`
		Date      string `json:"date" binding:"required"`
		StartTime string `json:"start_time" binding:"required"`
		EndTime   string `json:"end_time" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Input tidak valid"})
		return
	}

	date, err := time.Parse("2006-01-02", input.Date)
	if err != nil {
		c.JSON(400, gin.H{"error": "Format tanggal salah"})
		return
	}

	startClock, err := time.Parse("15:04", input.StartTime)
	if err != nil {
		c.JSON(400, gin.H{"error": "Format start_time salah"})
		return
	}

	endClock, err := time.Parse("15:04", input.EndTime)
	if err != nil {
		c.JSON(400, gin.H{"error": "Format end_time salah"})
		return
	}

	start := time.Date(
		date.Year(), date.Month(), date.Day(),
		startClock.Hour(), startClock.Minute(),
		0, 0, time.UTC,
	)

	end := time.Date(
		date.Year(), date.Month(), date.Day(),
		endClock.Hour(), endClock.Minute(),
		0, 0, time.UTC,
	)

	// ❌ END HARUS SETELAH START
	if !end.After(start) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "end_time harus setelah start_time",
		})
		return
	}

	// ⏰ BATAS JAM OPERASIONAL 09:00 - 17:00
	openTime := time.Date(
		date.Year(), date.Month(), date.Day(),
		9, 0, 0, 0, time.UTC,
	)

	closeTime := time.Date(
		date.Year(), date.Month(), date.Day(),
		17, 0, 0, 0, time.UTC,
	)

	if start.Before(openTime) || end.After(closeTime) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Booking hanya tersedia pukul 09:00 - 17:00",
		})
		return
	}

	// ✅ CEK BENTROK
	var count int64
	config.DB.
		Model(&models.Booking{}).
		Where("start_time < ? AND end_time > ?", end, start).
		Count(&count)

	if count > 0 {
		c.JSON(http.StatusConflict, gin.H{
			"error": "Waktu sudah dibooking",
		})
		return
	}

	booking := models.Booking{
		Name:      input.Name,
		Phone:     input.Phone,
		StartTime: start,
		EndTime:   end,
	}

	config.DB.Create(&booking)

	c.JSON(http.StatusCreated, gin.H{
		"message": "Booking berhasil",
	})
}

func GetBookingsAdmin(c *gin.Context) {
	// optional filter tanggal ?date=YYYY-MM-DD
	dateStr := c.Query("date")

	query := config.DB.Model(&models.Booking{})

	if dateStr != "" {
		date, err := time.Parse("2006-01-02", dateStr)
		if err != nil {
			c.JSON(400, gin.H{"error": "Format date salah"})
			return
		}

		start := date
		end := date.Add(24 * time.Hour)

		query = query.Where("start_time >= ? AND start_time < ?", start, end)
	}

	var bookings []models.Booking
	query.
		Order("start_time ASC").
		Find(&bookings)

	c.JSON(200, bookings)
}
func GetBookedTimes(c *gin.Context) {
	dateStr := c.Query("date")
	if dateStr == "" {
		c.JSON(400, gin.H{"error": "date wajib diisi"})
		return
	}

	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		c.JSON(400, gin.H{"error": "Format date salah"})
		return
	}

	startDay := date
	endDay := date.Add(24 * time.Hour)

	type BookedTime struct {
		StartTime time.Time `json:"start_time"`
		EndTime   time.Time `json:"end_time"`
	}

	var booked []BookedTime

	config.DB.
		Model(&models.Booking{}).
		Select("start_time, end_time").
		Where("start_time >= ? AND start_time < ?", startDay, endDay).
		Order("start_time ASC").
		Scan(&booked)

	// ubah format jam saja (HH:mm)
	var result []gin.H
	for _, b := range booked {
		result = append(result, gin.H{
			"start_time": b.StartTime.Format("15:04"),
			"end_time":   b.EndTime.Format("15:04"),
		})
	}

	c.JSON(200, result)
}
