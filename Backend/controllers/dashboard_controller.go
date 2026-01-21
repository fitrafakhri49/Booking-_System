package controllers

import "github.com/gin-gonic/gin"

// Dashboard : contoh protected route
func Dashboard(c *gin.Context) {
	c.JSON(200, gin.H{
		"message": "Welcome to dashboard!",
	})
}
