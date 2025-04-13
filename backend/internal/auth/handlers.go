package auth

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

// AuthHandlers holds the dependencies for auth handlers.
type AuthHandlers struct {
	Svc AuthService
}

// NewAuthHandlers creates a new set of auth handlers.
func NewAuthHandlers(svc AuthService) *AuthHandlers {
	return &AuthHandlers{Svc: svc}
}

// Register handles user registration requests.
func (h *AuthHandlers) Register(c *gin.Context) {
	var req RegisterRequest
	// Bind JSON request body to the RegisterRequest struct
	// Includes validation based on binding tags in the struct
	if err := c.ShouldBindJSON(&req); err != nil {
		// Handle validation errors (e.g., missing fields, invalid email)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input", "message": err.Error()})
		return
	}

	// Call the service to perform registration
	user, err := h.Svc.Register(c.Request.Context(), req)
	if err != nil {
		// Handle specific errors from the service
		if err == ErrEmailExists {
			c.JSON(http.StatusBadRequest, gin.H{"error": "EMAIL_EXISTS", "message": err.Error()})
			return
		}
		if err == ErrHashingFailed {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "REGISTRATION_FAILED", "message": "Could not process registration"})
			return
		}
		// Handle other potential errors (e.g., database errors)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "SERVER_ERROR", "message": err.Error()})
		return
	}

	// Return the created user (password should already be cleared by service)
	c.JSON(http.StatusCreated, user)
}

// Login handles user login requests.
func (h *AuthHandlers) Login(c *gin.Context) {
	var req LoginRequest
	// Bind and validate request
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input", "message": err.Error()})
		return
	}

	// Call the service to perform login
	resp, err := h.Svc.Login(c.Request.Context(), req)
	if err != nil {
		// Handle specific login errors
		if err == ErrInvalidCredentials {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "INVALID_CREDENTIALS", "message": err.Error()})
			return
		}
		// Handle other potential errors
		c.JSON(http.StatusInternalServerError, gin.H{"error": "SERVER_ERROR", "message": err.Error()})
		return
	}

	// TODO: Set session cookie or include JWT in response based on chosen strategy
	// Example: Set HTTP-only cookie
	// http.SetCookie(c.Writer, &http.Cookie{
	// 	 Name:     "session_token",
	// 	 Value:    resp.Token, // Or a session ID
	// 	 Expires:  time.Now().Add(tokenExpiration),
	// 	 HttpOnly: true,
	// 	 Secure:   true, // Set to true in production (requires HTTPS)
	// 	 Path:     "/",
	// 	 SameSite: http.SameSiteLaxMode,
	// })

	// Return user and potentially the token (if not using cookies)
	c.JSON(http.StatusOK, resp)
}

// GetCurrentUser handles requests to fetch the current user's session info.
func (h *AuthHandlers) GetCurrentUser(c *gin.Context) {
	// Middleware should have already run and put userID in context
	// Use blank identifier as userID variable is not used directly here.
	_, exists := GetUserIDFromContext(c) // Use helper from middleware.go
	if !exists {
		// This technically shouldn't happen if middleware is applied correctly
		c.JSON(http.StatusInternalServerError, gin.H{"error": "User ID missing from context"})
		return
	}

	// Use the Gin context directly. The user ID can be retrieved within the service
	// if needed, using GetUserIDFromContext(c) or by modifying the service interface.
	// We remove the problematic context.WithValue call.
	// ctxWithUser := context.WithValue(c.Request.Context(), UserIDKey, userID)

	// Pass the Gin context (which implements context.Context) to the service.
	user, err := h.Svc.GetCurrentUser(c)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "USER_NOT_FOUND", "message": err.Error()})
			return
		}
		// Handle other potential errors
		c.JSON(http.StatusInternalServerError, gin.H{"error": "SERVER_ERROR", "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, user)
}

// Logout handles user logout requests.
func (h *AuthHandlers) Logout(c *gin.Context) {
	// Middleware ensures this handler is only called for authenticated users.
	// Extract user ID for logging or potential blocklist operations.
	userID, _ := GetUserIDFromContext(c)

	err := h.Svc.Logout(c.Request.Context())
	if err != nil {
		// Log the error, although typically logout itself shouldn't fail severely
		// unless there's a context issue or blocklist interaction error.
		fmt.Printf("Error during logout for user %s: %v\n", userID, err) // Replace with proper logging
		c.JSON(http.StatusInternalServerError, gin.H{"error": "LOGOUT_FAILED", "message": err.Error()})
		return
	}

	// TODO: If using session cookies, clear the cookie here.
	// Example: http.SetCookie(c.Writer, &http.Cookie{
	// 	 Name:     "session_token",
	// 	 Value:    "",
	// 	 Expires:  time.Unix(0, 0),
	// 	 HttpOnly: true,
	// 	 Secure:   true, // Set to true in production (requires HTTPS)
	// 	 Path:     "/",
	// 	 SameSite: http.SameSiteLaxMode,
	// })

	// Return 204 No Content on successful logout acknowledgement.
	c.Status(http.StatusNoContent)
}
