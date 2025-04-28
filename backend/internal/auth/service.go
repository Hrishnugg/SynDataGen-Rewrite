package auth

import (
	"SynDataGen/backend/internal/core"
	"context"

	"github.com/gin-gonic/gin"
)

// RegisterRequest mirrors the request body for user registration.
type RegisterRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	Company  string `json:"company" binding:"required"`
}

// LoginRequest mirrors the request body for user login.
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse defines the data returned upon successful login.
type LoginResponse struct {
	User  *core.User `json:"user"`
	Token string     `json:"token"` // Example: JWT
	// Or define cookie details if using session cookies
}

// AuthService defines the interface for authentication operations.
type AuthService interface {
	// Register creates a new user account.
	Register(ctx context.Context, req RegisterRequest) (*core.User, error)

	// Login authenticates a user and returns session details.
	Login(ctx context.Context, req LoginRequest) (*LoginResponse, error)

	// GetCurrentUser retrieves the user associated with the current session/token.
	// Pass the Gin context to allow extracting user ID reliably.
	GetCurrentUser(c *gin.Context) (*core.User, error)

	// Logout invalidates the current user session/token.
	// Pass Gin context for consistency in retrieving user ID.
	Logout(c *gin.Context) error
}
