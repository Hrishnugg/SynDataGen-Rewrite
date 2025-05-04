package auth

import (
	"errors"
	"fmt"
	"net/http"
	"time"

	"SynDataGen/backend/internal/platform/logger"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
)

// UserIDKey is the key used to store the user ID in the Gin context.
// Exported constant
const UserIDKey = "userID"

// SessionCookieName defines the name of the cookie used for session management.
const SessionCookieName = "session_token"

// AuthMiddleware creates a Gin middleware function for JWT authentication via cookies.
func AuthMiddleware(svc AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {

		// --- ORIGINAL AUTH LOGIC ---
		logger.Logger.Debug("AuthMiddleware triggered")

		// Get token from the session cookie
		tokenString, err := c.Cookie(SessionCookieName)

		if err != nil {
			logger.Logger.Warn("AuthMiddleware: Cookie read error", zap.Error(err))
			if errors.Is(err, http.ErrNoCookie) {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authentication required: session cookie missing"})
				return
			}
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Failed to read session cookie"})
			return
		}

		if tokenString == "" {
			logger.Logger.Warn("AuthMiddleware: Cookie empty")
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authentication required: session cookie empty"})
			return
		}
		logger.Logger.Debug("AuthMiddleware: Cookie found", zap.String("cookieValue(preview)", tokenString[:10]+"..."))

		// Get JWT secret from service/config
		jwtSecret := getJwtSecret()

		// Parse and validate the token
		claims := &jwtCustomClaims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return jwtSecret, nil
		})

		if err != nil {
			msg := "Invalid or expired token"
			logger.Logger.Warn("AuthMiddleware: JWT parse error", zap.Error(err))
			if errors.Is(err, jwt.ErrTokenExpired) {
				msg = "Token has expired"
				clearSessionCookie(c)
			} else {
				// Log unexpected parsing errors
				// logger.Logger.Error("Error parsing JWT token", zap.Error(err)) // Use logger instead of fmt
			}
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": msg})
			return
		}

		if !token.Valid {
			logger.Logger.Warn("AuthMiddleware: Token marked as invalid", zap.Any("claims", claims))
			clearSessionCookie(c)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			return
		}
		logger.Logger.Debug("AuthMiddleware: Token is valid")

		// Double check expiration
		if claims.ExpiresAt != nil && claims.ExpiresAt.Time.Before(time.Now()) {
			logger.Logger.Warn("AuthMiddleware: Token expired (manual check)", zap.Time("expiry", claims.ExpiresAt.Time))
			clearSessionCookie(c)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Token has expired"})
			return
		}
		logger.Logger.Debug("AuthMiddleware: Expiry check passed")

		// Token is valid, store user ID in context
		c.Set(UserIDKey, claims.Subject)
		logger.Logger.Info("AuthMiddleware: User authenticated", zap.String(UserIDKey, claims.Subject))

		// Continue to the next handler
		c.Next()
		// --- END ORIGINAL AUTH LOGIC ---
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

// clearSessionCookie is a helper to set an expired cookie to clear it.
func clearSessionCookie(c *gin.Context) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     SessionCookieName,
		Value:    "",
		Expires:  time.Unix(0, 0), // Expire immediately
		MaxAge:   -1,              // Tell browser to delete now
		HttpOnly: true,
		Secure:   c.Request.TLS != nil, // Set Secure flag if connection is HTTPS
		Path:     "/",                  // Match the path used when setting the cookie
		SameSite: http.SameSiteLaxMode, // Or SameSiteStrictMode
	})
}
