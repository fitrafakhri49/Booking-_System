package controllers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

type LoginInput struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func SupabaseLogin(c *gin.Context) {
	var input LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	payload := map[string]interface{}{
		"email":    input.Email,
		"password": input.Password,
	}

	body, _ := json.Marshal(payload)

	req, err := http.NewRequest(
		"POST",
		os.Getenv("SUPABASE_URL")+"/auth/v1/token?grant_type=password",
		bytes.NewBuffer(body),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "request failed"})
		return
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", os.Getenv("SUPABASE_ANON_KEY"))

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "login failed"})
		return
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	if resp.StatusCode != 200 {
		c.JSON(http.StatusUnauthorized, result)
		return
	}

	c.JSON(http.StatusOK, result)
}
