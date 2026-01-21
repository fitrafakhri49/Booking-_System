package middleware

import (
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type UserContext struct {
	UserID string
	Email  string
	Role   string
}

func SupabaseAuth() gin.HandlerFunc {
	return func(c *gin.Context) {

		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "missing authorization header",
			})
			return
		}

		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "invalid authorization format",
			})
			return
		}

		token := strings.TrimPrefix(authHeader, "Bearer ")

		req, err := http.NewRequest(
			http.MethodGet,
			"https://blasstkbuqtedhmbryew.supabase.co/auth/v1/user",
			nil,
		)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
				"error": "failed to create request",
			})
			return
		}

		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("apikey", os.Getenv("SUPABASE_ANON_KEY"))

		client := &http.Client{
			Timeout: 5 * time.Second,
		}

		resp, err := client.Do(req)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "supabase auth failed",
			})
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "invalid token",
			})
			return
		}

		var user struct {
			ID    string `json:"id"`
			Email string `json:"email"`
		}

		if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
				"error": "failed to decode user",
			})
			return
		}

		role := "user"
		if user.Email == "admin@gmail.com" {
			role = "admin"
		}

		c.Set("user", UserContext{
			UserID: user.ID,
			Email:  user.Email,
			Role:   role,
		})

		c.Next()
	}
}
