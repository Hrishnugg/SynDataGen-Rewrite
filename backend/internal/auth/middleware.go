package auth

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// UserIDKey is the key used to store the user ID in the Gin context.
// Exported constant
const UserIDKey = "userID"

// AuthMiddleware creates a Gin middleware function for JWT authentication.
// It depends on the AuthService to potentially fetch full user details if needed,
// although for basic auth checking, just validating the token is sufficient.
func AuthMiddleware(svc AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header format must be Bearer {token}"})
			return
		}

		tokenString := parts[1]

		// Parse and validate the token
		claims := &jwtCustomClaims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			// Check the signing method
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			// Return the secret key
			return jwtSecret, nil
		})

		if err != nil {
			msg := "Invalid or expired token"
			if errors.Is(err, jwt.ErrTokenExpired) {
				msg = "Token has expired"
			}
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": msg})
			return
		}

		if !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			return
		}

		// Check expiration (redundant with ParseWithClaims check, but good practice)
		if claims.ExpiresAt != nil && claims.ExpiresAt.Time.Before(time.Now()) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Token has expired"})
			return
		}

		// Token is valid, store user ID in context for downstream handlers
		c.Set(UserIDKey, claims.Subject)

		// Continue to the next handler
		c.Next()
	}
}

// GetUserIDFromContext retrieves the user ID stored in the Gin context by the AuthMiddleware.
func GetUserIDFromContext(c *gin.Context) (string, bool) {
	userID, exists := c.Get(UserIDKey)
	if !exists {
		return "", false
	}
	userIDStr, ok := userID.(string)
	return userIDStr, ok
}
