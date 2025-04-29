package auth

import (
	"SynDataGen/backend/internal/core"
	"SynDataGen/backend/internal/platform/logger"
	"context"
	"errors"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"

	// Placeholder for JWT library (e.g., github.com/golang-jwt/jwt/v5)
	// "github.com/golang-jwt/jwt/v5"
	"github.com/gin-gonic/gin"
)

// Configuration - read from environment variables
var jwtSecret = []byte(getEnv("JWT_SECRET", "REPLACE_WITH_STRONG_DEFAULT_SECRET"))
var tokenExpiration = time.Hour * time.Duration(getEnvInt("JWT_EXPIRATION_HOURS", 72))

// Helper to get environment variable with fallback
func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if len(value) == 0 {
		fmt.Printf("Warning: Environment variable %s not set, using default: %s\n", key, fallback)
		// In production, consider returning an error or panicking if critical vars are missing
		return fallback
	}
	return value
}

// Helper to get integer environment variable with fallback
func getEnvInt(key string, fallback int) int {
	valueStr := os.Getenv(key)
	if len(valueStr) == 0 {
		fmt.Printf("Warning: Environment variable %s not set, using default: %d\n", key, fallback)
		return fallback
	}
	value, err := strconv.Atoi(valueStr)
	if err != nil {
		fmt.Printf("Warning: Invalid integer value for %s (%s), using default: %d\n", key, valueStr, fallback)
		return fallback
	}
	return value
}

// getJwtSecret returns the JWT secret key byte slice.
// This allows middleware to access the package-level secret.
func getJwtSecret() []byte {
	return jwtSecret
}

// Define specific errors for auth service
var (
	ErrUserNotFound       = errors.New("user not found")
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrEmailExists        = errors.New("email already exists")
	ErrHashingFailed      = errors.New("failed to hash password")
	ErrTokenGeneration    = errors.New("failed to generate token")
)

// Define custom claims for JWT
type jwtCustomClaims struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	Company string `json:"company"`
	jwt.RegisteredClaims
}

// authService provides implementations for the AuthService interface.
type authService struct {
	userRepo core.UserRepository
	// Add other dependencies like token generator/validator if needed
}

// NewAuthService creates a new instance of AuthService.
// It requires a UserRepository to function.
func NewAuthService(userRepo core.UserRepository) AuthService {
	return &authService{
		userRepo: userRepo,
	}
}

// Register creates a new user account.
func (s *authService) Register(ctx context.Context, req RegisterRequest) (*core.User, error) {
	// 1. Check if user already exists
	existingUser, err := s.userRepo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		logger.Logger.Error("Error checking email existence", zap.Error(err), zap.String("email", req.Email))
		return nil, fmt.Errorf("failed to check user existence: %w", err)
	}
	if existingUser != nil {
		return nil, ErrEmailExists
	}

	// 2. Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		logger.Logger.Error("Error hashing password", zap.Error(err))
		return nil, ErrHashingFailed
	}

	// 3. Create the User struct
	now := time.Now().UTC()
	newUser := &core.User{
		Name:      req.Name,
		Email:     req.Email,
		Company:   req.Company,
		Password:  string(hashedPassword), // Store the hash
		CreatedAt: now,
		UpdatedAt: now,
	}

	// 4. Save the user using the repository
	userID, err := s.userRepo.CreateUser(ctx, newUser)
	if err != nil {
		logger.Logger.Error("Error creating user in repository", zap.Error(err), zap.String("email", req.Email))
		return nil, fmt.Errorf("failed to save user: %w", err)
	}
	newUser.ID = userID // Assign the generated ID

	// 5. Return the created user (excluding password hash for safety)
	// Create a copy to avoid modifying the original newUser which might be cached or used elsewhere
	publicUser := *newUser
	publicUser.Password = "" // Clear password hash
	logger.Logger.Info("User registered successfully", zap.String("userID", userID), zap.String("email", req.Email))
	return &publicUser, nil
}

// Login authenticates a user and returns session details.
func (s *authService) Login(ctx context.Context, req LoginRequest) (*LoginResponse, error) {
	// 1. Find user by email
	user, err := s.userRepo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		logger.Logger.Error("Error retrieving user by email", zap.Error(err), zap.String("email", req.Email))
		return nil, fmt.Errorf("database error during login: %w", err)
	}
	if user == nil {
		return nil, ErrInvalidCredentials // Use generic error for security
	}

	// 2. Compare password hash
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
	if err != nil {
		// Don't log the error here as it's expected for invalid passwords
		return nil, ErrInvalidCredentials // Use generic error
	}

	// 3. Generate JWT token
	claims := &jwtCustomClaims{
		Name:    user.Name,
		Email:   user.Email,
		Company: user.Company,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID,
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(tokenExpiration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "SynDataGenAPI", // Optional: identify issuer
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		logger.Logger.Error("Error generating token", zap.Error(err), zap.String("userID", user.ID))
		return nil, ErrTokenGeneration
	}

	// 4. Prepare response (exclude password hash)
	publicUser := *user
	publicUser.Password = ""

	loginResponse := &LoginResponse{
		User:  &publicUser,
		Token: tokenString,
	}

	logger.Logger.Info("User logged in successfully", zap.String("userID", user.ID), zap.String("email", user.Email))
	return loginResponse, nil
}

// GetCurrentUser retrieves the user associated with the current session/token.
func (s *authService) GetCurrentUser(c *gin.Context) (*core.User, error) {
	// Use the helper function to reliably get user ID from Gin context
	userID, ok := GetUserIDFromContext(c)
	if !ok || userID == "" {
		logger.Logger.Warn("User ID not found in context for GetCurrentUser")
		// Returning ErrInvalidCredentials might be more appropriate than a generic error
		// if this implies the user isn't properly authenticated at this stage.
		return nil, errors.New("user ID not found in context")
	}

	// Use the request context for DB operations
	user, err := s.userRepo.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		logger.Logger.Error("Error getting user by ID", zap.Error(err), zap.String("userID", userID))
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	if user == nil {
		logger.Logger.Warn("User found in token but not in DB", zap.String("userID", userID))
		return nil, ErrUserNotFound
	}

	// Return the user (excluding password hash for safety)
	publicUser := *user
	publicUser.Password = ""
	return &publicUser, nil
}

// Logout invalidates the current user session/token.
// For stateless JWTs, this often means no server-side action is strictly required.
// The client is responsible for discarding the token.
// This endpoint can exist to provide a standard logout flow point.
func (s *authService) Logout(c *gin.Context) error {
	// Use helper to get user ID from Gin context
	userID, ok := GetUserIDFromContext(c)
	if !ok || userID == "" {
		logger.Logger.Warn("Logout called without user context (failed GetUserIDFromContext)")
		// Return error as logout implies an authenticated user context should exist
		return errors.New("logout requires authenticated context")
	}

	// No server-side action needed for simple JWT logout (token expiry handles invalidation)
	// If implementing a token blocklist, add logic here.
	logger.Logger.Info("Logout requested by user", zap.String("userID", userID))
	return nil // Indicate success
}
