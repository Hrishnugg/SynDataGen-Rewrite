package auth

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// UserIDKey is the key used to store the user ID in the Gin context.
// Exported constant
const UserIDKey = "userID"

// SessionCookieName defines the name of the cookie used for session management.
const SessionCookieName = "session_token"

// AuthMiddleware creates a Gin middleware function for JWT authentication via cookies.
func AuthMiddleware(svc AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {

		// --- TEMPORARY BYPASS FOR TESTING ---
		// fmt.Println("WARNING: AuthMiddleware bypassed for testing!") // Optional log
		// Setting a dummy user ID. Replace "dummy-test-user-id" if a specific format is needed.
		c.Set(UserIDKey, "dummy-test-user-id")
		c.Next()
		return
		// --- END TEMPORARY BYPASS ---

		/* --- ORIGINAL AUTH LOGIC ---
		// Get token from the session cookie
		tokenString, err := c.Cookie(SessionCookieName)

		if err != nil {
			// Handle missing cookie error specifically
			if errors.Is(err, http.ErrNoCookie) {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authentication required: session cookie missing"})
				return
			}
			// Handle other potential errors getting the cookie
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Failed to read session cookie"})
			return
		}

		if tokenString == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authentication required: session cookie empty"})
			return
		}

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
				// Clear the expired cookie
				clearSessionCookie(c)
			} else {
				// Log unexpected parsing errors
				fmt.Printf("Error parsing JWT token: %v\n", err) // Replace with proper logging
			}
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": msg})
			return
		}

		if !token.Valid {
			clearSessionCookie(c) // Clear invalid cookie
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			return
		}

		// Double check expiration (though ParseWithClaims should handle it)
		if claims.ExpiresAt != nil && claims.ExpiresAt.Time.Before(time.Now()) {
			clearSessionCookie(c) // Clear expired cookie
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Token has expired"})
			return
		}

		// Token is valid, store user ID in context for downstream handlers
		c.Set(UserIDKey, claims.Subject)

		// Continue to the next handler
		c.Next()
		--- END ORIGINAL AUTH LOGIC --- */
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
