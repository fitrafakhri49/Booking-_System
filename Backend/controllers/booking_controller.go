package controllers

import (
	"bookingSystem/backend-api/config"
	"bookingSystem/backend-api/models"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

var WIB *time.Location

func init() {
	var err error
	WIB, err = time.LoadLocation("Asia/Jakarta")
	if err != nil {
		panic(err)
	}
}

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

	date, err := time.ParseInLocation("2006-01-02", input.Date, WIB)
	if err != nil {
		c.JSON(400, gin.H{"error": "Format tanggal salah"})
		return
	}

	startClock, _ := time.ParseInLocation("15:04", input.StartTime, WIB)
	endClock, _ := time.ParseInLocation("15:04", input.EndTime, WIB)

	startWIB := time.Date(
		date.Year(), date.Month(), date.Day(),
		startClock.Hour(), startClock.Minute(), 0, 0, WIB,
	)

	endWIB := time.Date(
		date.Year(), date.Month(), date.Day(),
		endClock.Hour(), endClock.Minute(), 0, 0, WIB,
	)

	if !endWIB.After(startWIB) {
		c.JSON(400, gin.H{"error": "end_time harus setelah start_time"})
		return
	}

	openTime := time.Date(date.Year(), date.Month(), date.Day(), 9, 0, 0, 0, WIB)
	closeTime := time.Date(date.Year(), date.Month(), date.Day(), 17, 0, 0, 0, WIB)

	if startWIB.Before(openTime) || endWIB.After(closeTime) {
		c.JSON(400, gin.H{"error": "Booking hanya tersedia 09:00 - 17:00 WIB"})
		return
	}

	// CONVERT KE UTC SEBELUM DB
	startUTC := startWIB.UTC()
	endUTC := endWIB.UTC()

	var count int64
	config.DB.
		Model(&models.Booking{}).
		Where("start_time < ? AND end_time > ?", endUTC, startUTC).
		Count(&count)

	if count > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Waktu sudah dibooking"})
		return
	}

	booking := models.Booking{
		Name:      input.Name,
		Phone:     input.Phone,
		StartTime: startUTC,
		EndTime:   endUTC,
	}

	config.DB.Create(&booking)

	c.JSON(201, gin.H{"message": "Booking berhasil"})
}

func GetBookingsAdmin(c *gin.Context) {
	dateStr := c.Query("date")
	query := config.DB.Model(&models.Booking{})

	if dateStr != "" {
		date, err := time.ParseInLocation("2006-01-02", dateStr, WIB)
		if err != nil {
			c.JSON(400, gin.H{"error": "Format date salah"})
			return
		}

		startUTC := date.UTC()
		endUTC := date.Add(24 * time.Hour).UTC()

		query = query.Where("start_time >= ? AND start_time < ?", startUTC, endUTC)
	}

	var bookings []models.Booking
	query.Order("start_time ASC").Find(&bookings)

	// 🔥 Convert ke WIB saat response
	for i := range bookings {
		bookings[i].StartTime = bookings[i].StartTime.In(WIB)
		bookings[i].EndTime = bookings[i].EndTime.In(WIB)
	}

	c.JSON(200, bookings)
}

func GetBookedTimes(c *gin.Context) {
	dateStr := c.Query("date")
	if dateStr == "" {
		c.JSON(400, gin.H{"error": "date wajib diisi"})
		return
	}

	date, err := time.ParseInLocation("2006-01-02", dateStr, WIB)
	if err != nil {
		c.JSON(400, gin.H{"error": "Format date salah"})
		return
	}

	startUTC := date.UTC()
	endUTC := date.Add(24 * time.Hour).UTC()

	type BookedTime struct {
		StartTime time.Time
		EndTime   time.Time
	}

	var booked []BookedTime

	config.DB.
		Model(&models.Booking{}).
		Select("start_time, end_time").
		Where("start_time >= ? AND start_time < ?", startUTC, endUTC).
		Order("start_time ASC").
		Scan(&booked)

	var result []gin.H
	for _, b := range booked {
		result = append(result, gin.H{
			"start_time": b.StartTime.In(WIB).Format("15:04"),
			"end_time":   b.EndTime.In(WIB).Format("15:04"),
		})
	}

	c.JSON(200, result)
}

func UpdateBooking(c *gin.Context) {
	id := c.Param("id")

	var input struct {
		Name      string `json:"name"`
		Phone     string `json:"phone"`
		Date      string `json:"date"`
		StartTime string `json:"start_time"`
		EndTime   string `json:"end_time"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Input tidak valid"})
		return
	}

	var booking models.Booking
	if err := config.DB.First(&booking, "id = ?", id).Error; err != nil {
		c.JSON(404, gin.H{"error": "Booking tidak ditemukan"})
		return
	}

	// Default pakai data lama
	startWIB := booking.StartTime.In(WIB)
	endWIB := booking.EndTime.In(WIB)

	// Jika date / time diupdate
	if input.Date != "" && input.StartTime != "" && input.EndTime != "" {
		date, err := time.ParseInLocation("2006-01-02", input.Date, WIB)
		if err != nil {
			c.JSON(400, gin.H{"error": "Format tanggal salah"})
			return
		}

		startClock, _ := time.ParseInLocation("15:04", input.StartTime, WIB)
		endClock, _ := time.ParseInLocation("15:04", input.EndTime, WIB)

		startWIB = time.Date(
			date.Year(), date.Month(), date.Day(),
			startClock.Hour(), startClock.Minute(), 0, 0, WIB,
		)

		endWIB = time.Date(
			date.Year(), date.Month(), date.Day(),
			endClock.Hour(), endClock.Minute(), 0, 0, WIB,
		)

		if !endWIB.After(startWIB) {
			c.JSON(400, gin.H{"error": "end_time harus setelah start_time"})
			return
		}

		openTime := time.Date(date.Year(), date.Month(), date.Day(), 9, 0, 0, 0, WIB)
		closeTime := time.Date(date.Year(), date.Month(), date.Day(), 17, 0, 0, 0, WIB)

		if startWIB.Before(openTime) || endWIB.After(closeTime) {
			c.JSON(400, gin.H{"error": "Booking hanya tersedia 09:00 - 17:00 WIB"})
			return
		}

		startUTC := startWIB.UTC()
		endUTC := endWIB.UTC()

		var count int64
		config.DB.
			Model(&models.Booking{}).
			Where("id <> ? AND start_time < ? AND end_time > ?", booking.ID, endUTC, startUTC).
			Count(&count)

		if count > 0 {
			c.JSON(409, gin.H{"error": "Waktu sudah dibooking"})
			return
		}

		booking.StartTime = startUTC
		booking.EndTime = endUTC
	}

	if input.Name != "" {
		booking.Name = input.Name
	}
	if input.Phone != "" {
		booking.Phone = input.Phone
	}

	config.DB.Save(&booking)

	c.JSON(200, gin.H{"message": "Booking berhasil diupdate"})
}

func DeleteBooking(c *gin.Context) {
	id := c.Param("id")

	var booking models.Booking
	if err := config.DB.First(&booking, "id = ?", id).Error; err != nil {
		c.JSON(404, gin.H{"error": "Booking tidak ditemukan"})
		return
	}

	config.DB.Delete(&booking)

	c.JSON(200, gin.H{"message": "Booking berhasil dihapus"})
}
