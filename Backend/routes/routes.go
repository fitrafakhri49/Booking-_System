package routes

import (
	"net/http"

	"bookingSystem/backend-api/controllers"
	middleware "bookingSystem/backend-api/middlewares"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine) {

	// Public route
	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "API Running"})
	})

	r.POST("/booking", controllers.CreateBooking)
	r.GET("/bookings", controllers.GetBookedTimes)

	// Protected routes
	protected := r.Group("/api")
	protected.Use(middleware.SupabaseAuth())
	protected.GET("/dashboard", controllers.Dashboard)
	protected.GET("/bookings", controllers.GetBookingsAdmin)
}
