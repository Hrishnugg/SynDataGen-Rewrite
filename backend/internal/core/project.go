package core

import "time"

// ProjectSettings defines configurable settings for a project.
type ProjectSettings struct {
	DataRetentionDays int `json:"dataRetentionDays" firestore:"dataRetentionDays"`
	MaxStorageGB      int `json:"maxStorageGB" firestore:"maxStorageGB"`
}

// ProjectStorage details the Cloud Storage bucket associated with a project.
type ProjectStorage struct {
	BucketName       string `json:"bucketName" firestore:"bucketName"`
	Region           string `json:"region" firestore:"region"`
	UsedStorageBytes int64  `json:"usedStorageBytes" firestore:"usedStorageBytes"` // Updated periodically
}

// TeamMember represents a user associated with a project and their role.
type TeamMember struct {
	UserID  string    `json:"userId" firestore:"userId"` // References core.User.ID
	Role    string    `json:"role" firestore:"role"`     // e.g., "owner", "admin", "member", "viewer"
	AddedAt time.Time `json:"addedAt" firestore:"addedAt"`
}

// Project represents the main project entity.
type Project struct {
	ID          string          `json:"id" firestore:"-"` // Firestore document ID
	Name        string          `json:"name" firestore:"name"`
	Description string          `json:"description" firestore:"description"`
	CustomerID  string          `json:"customerId" firestore:"customerId"` // ID of the owning customer/user
	Status      string          `json:"status" firestore:"status"`         // e.g., "active", "archived"
	Storage     ProjectStorage  `json:"storage" firestore:"storage"`
	Settings    ProjectSettings `json:"settings" firestore:"settings"`
	TeamMembers []TeamMember    `json:"teamMembers" firestore:"teamMembers"`
	CreatedAt   time.Time       `json:"createdAt" firestore:"createdAt"`
	UpdatedAt   time.Time       `json:"updatedAt" firestore:"updatedAt"`
}
