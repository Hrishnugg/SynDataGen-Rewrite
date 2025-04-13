package firestore

import (
	"SynDataGen/backend/internal/core"
	"SynDataGen/backend/internal/platform/logger"
	"context"
	"fmt"

	"cloud.google.com/go/firestore"
	"go.uber.org/zap"
	"google.golang.org/api/iterator"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

const usersCollection = "users"

// userRepository implements the core.UserRepository interface using Firestore.
type userRepository struct {
	client *firestore.Client
}

// NewUserRepository creates a new Firestore-based user repository.
func NewUserRepository(client *firestore.Client) core.UserRepository {
	if client == nil {
		// Or return an error, panic, or use a default client based on design
		panic("Firestore client cannot be nil")
	}
	return &userRepository{
		client: client,
	}
}

// GetUserByEmail retrieves a user by their email address.
func (r *userRepository) GetUserByEmail(ctx context.Context, email string) (*core.User, error) {
	iter := r.client.Collection(usersCollection).Where("email", "==", email).Limit(1).Documents(ctx)
	doc, err := iter.Next()
	if err == iterator.Done {
		return nil, nil // User not found is not an error in this context
	}
	if err != nil {
		logger.Logger.Error("Failed to query user by email", zap.Error(err), zap.String("email", email))
		return nil, fmt.Errorf("failed to query user by email: %w", err)
	}

	var user core.User
	if err := doc.DataTo(&user); err != nil {
		logger.Logger.Error("Failed to decode user data", zap.Error(err), zap.String("docID", doc.Ref.ID), zap.String("email", email))
		return nil, fmt.Errorf("failed to decode user data: %w", err)
	}
	user.ID = doc.Ref.ID

	return &user, nil
}

// CreateUser saves a new user to the storage.
func (r *userRepository) CreateUser(ctx context.Context, user *core.User) (string, error) {
	// Note: Firestore doesn't enforce unique constraints directly on fields like email.
	// The service layer (authService) should ideally check for existence first.
	// This implementation assumes the check was done or relies on Firestore security rules.

	docRef, _, err := r.client.Collection(usersCollection).Add(ctx, user)
	if err != nil {
		logger.Logger.Error("Failed to add user to Firestore", zap.Error(err), zap.String("email", user.Email))
		return "", fmt.Errorf("failed to add user to Firestore: %w", err)
	}
	logger.Logger.Info("Created user document", zap.String("userID", docRef.ID), zap.String("email", user.Email))
	return docRef.ID, nil
}

// GetUserByID retrieves a user by their unique ID.
func (r *userRepository) GetUserByID(ctx context.Context, id string) (*core.User, error) {
	docSnap, err := r.client.Collection(usersCollection).Doc(id).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return nil, nil // User not found is not an error here
		}
		logger.Logger.Error("Failed to get user by ID", zap.Error(err), zap.String("userID", id))
		return nil, fmt.Errorf("failed to get user by ID: %w", err)
	}

	var user core.User
	if err := docSnap.DataTo(&user); err != nil {
		logger.Logger.Error("Failed to decode user data", zap.Error(err), zap.String("userID", id))
		return nil, fmt.Errorf("failed to decode user data: %w", err)
	}
	user.ID = docSnap.Ref.ID

	return &user, nil
}
