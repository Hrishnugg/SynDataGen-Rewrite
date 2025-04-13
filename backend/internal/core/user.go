package core

import "time"

// User represents the core user model.
// Note: Password hash should NOT be included here if this struct
// is returned directly from API endpoints. Create a separate DTO if needed.
type User struct {
	ID        string    `json:"id" firestore:"-"` // Usually Firestore doc ID, exclude from stored data
	Name      string    `json:"name" firestore:"name"`
	Email     string    `json:"email" firestore:"email"`
	Company   string    `json:"company" firestore:"company"`
	Password  string    `json:"-" firestore:"password"` // Store hash, exclude from JSON responses
	CreatedAt time.Time `json:"createdAt" firestore:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt" firestore:"updatedAt"`
} 