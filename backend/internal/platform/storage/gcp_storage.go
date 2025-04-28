package storage

import (
	"context"
	"fmt"
	"log"     // Using log for simplicity, consider structured logging
	"strings" // <-- Import strings
	"time"

	"cloud.google.com/go/storage"
	"google.golang.org/api/iterator"

	"SynDataGen/backend/internal/core" // Adjust import path if needed
)

// gcpClient defines the subset of storage.Client methods used by gcpStorageService
type gcpClient interface {
	Bucket(name string) *storage.BucketHandle
	Close() error
}

// gcpStorageService implements the core.StorageService interface using GCP Cloud Storage.
type gcpStorageService struct {
	client    gcpClient // Use the interface type
	projectID string    // GCP Project ID where buckets will be created
	logger    *log.Logger
}

// Config holds configuration for the GCP Storage Service.
type Config struct {
	GCPProjectID string
	Logger       *log.Logger // Inject a logger
}

// NewGCPStorageService creates a new instance of gcpStorageService.
// It initializes the GCP Cloud Storage client using Application Default Credentials (ADC).
func NewGCPStorageService(ctx context.Context, cfg Config) (core.StorageService, error) {
	if cfg.GCPProjectID == "" {
		return nil, fmt.Errorf("GCPProjectID is required")
	}
	if cfg.Logger == nil {
		// Fallback to default logger if none provided
		cfg.Logger = log.Default()
	}

	client, err := storage.NewClient(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCP storage client: %w", err)
	}

	cfg.Logger.Printf("Successfully initialized GCP Storage client for project %s", cfg.GCPProjectID)

	return &gcpStorageService{
		client:    client,
		projectID: cfg.GCPProjectID,
		logger:    cfg.Logger,
	}, nil
}

// CreateProjectBucket creates a unique GCS bucket for a project.
// Bucket names follow the pattern: synoptic-project-<projectID>
func (s *gcpStorageService) CreateProjectBucket(ctx context.Context, projectID, customerID, requestedRegion string) (bucketName string, region string, err error) {
	// Ensure projectID is valid for bucket naming (alphanumeric, dashes, underscores, dots, max 63 chars)
	// Basic sanitization - replace with more robust validation if needed
	// Note: GCP recommends lowercase letters, numbers, dashes, underscores, and dots.
	// Let's stick to lowercase letters, numbers, and dashes for simplicity and safety.
	// TODO: Implement proper validation/sanitization for projectID in bucket name

	// Construct a globally unique bucket name.
	bucketName = fmt.Sprintf("synoptic-project-%s", projectID) // Keep it simple for now
	// Consider adding a unique suffix/hash if projectID collisions are possible across tenants/time

	s.logger.Printf("Attempting to create bucket '%s' in project '%s'", bucketName, s.projectID)

	bucket := s.client.Bucket(bucketName)

	// Use requestedRegion or default to a multi-region like US if empty
	location := requestedRegion
	if location == "" {
		location = "US" // Default multi-region location
		s.logger.Printf("No region requested, defaulting to %s for bucket %s", location, bucketName)
	}

	bucketAttrs := &storage.BucketAttrs{
		Location:     location,
		StorageClass: "STANDARD", // Default storage class
		// Enable uniform bucket-level access for simpler IAM management
		UniformBucketLevelAccess: storage.UniformBucketLevelAccess{
			Enabled: true,
		},
		// Add labels for organization/billing
		Labels: map[string]string{
			"project-id": projectID, // projectID is already lowercase ID part
			// Ensure label values also conform to GCS requirements (lowercase, etc.)
			"customer-id": strings.ToLower(customerID), // Convert customerID value to lowercase
			"created-by":  "syndatagen-backend",
		},
		// TODO: Consider setting lifecycle rules (e.g., for FR-PROJ-07, FR-JOB-10)
		// Lifecycle: storage.Lifecycle{ ... }
	}

	// Set a timeout for the creation operation
	createCtx, cancel := context.WithTimeout(ctx, time.Second*30)
	defer cancel()

	if err := bucket.Create(createCtx, s.projectID, bucketAttrs); err != nil {
		// Check if the error is because the bucket already exists (potentially owned by us)
		// This check might need refinement based on exact GCP error types/codes
		// if e, ok := err.(*googleapi.Error); ok && e.Code == 409 {
		//  s.logger.Printf("Bucket %s already exists, assuming ownership.", bucketName)
		//  // Optionally, verify ownership or attributes here
		//	attrs, getErr := bucket.Attrs(ctx)
		//	if getErr != nil {
		// 		return "", "", fmt.Errorf("bucket %s already exists but failed to get attributes: %w", bucketName, getErr)
		//  }
		//  return bucketName, attrs.Location, nil // Return existing bucket info
		// }
		// For now, treat any error as failure
		s.logger.Printf("Error creating bucket %s: %v", bucketName, err)
		return "", "", fmt.Errorf("failed to create bucket %s: %w", bucketName, err)
	}

	// Return the actual location from the created bucket attributes
	attrs, err := bucket.Attrs(ctx)
	if err != nil {
		s.logger.Printf("Bucket %s created, but failed to retrieve attributes: %v", bucketName, err)
		// Return the requested/defaulted location as a fallback
		return bucketName, location, nil
	}
	region = attrs.Location
	s.logger.Printf("Successfully created bucket %s in region %s", bucketName, region)

	return bucketName, region, nil
}

// DeleteProjectBucket removes a GCS bucket, optionally deleting its contents first.
func (s *gcpStorageService) DeleteProjectBucket(ctx context.Context, bucketName string, force bool) error {
	s.logger.Printf("Attempting to delete bucket '%s' (force: %t)", bucketName, force)
	bucket := s.client.Bucket(bucketName)

	if force {
		s.logger.Printf("Force delete requested for bucket %s. Deleting objects first...", bucketName)
		// Set a timeout for object deletion iteration
		deleteObjsCtx, cancel := context.WithTimeout(ctx, time.Minute*5) // Adjust timeout as needed
		defer cancel()

		it := bucket.Objects(deleteObjsCtx, nil)
		for {
			objAttrs, err := it.Next()
			if err == iterator.Done {
				break // No more objects
			}
			if err != nil {
				s.logger.Printf("Error iterating objects in bucket %s during force delete: %v", bucketName, err)
				return fmt.Errorf("failed to list objects in bucket %s for deletion: %w", bucketName, err)
			}

			// Set a timeout for individual object deletion
			deleteObjCtx, objCancel := context.WithTimeout(deleteObjsCtx, time.Second*10)
			if err := bucket.Object(objAttrs.Name).Delete(deleteObjCtx); err != nil {
				objCancel() // Ensure cancellation if Delete fails early
				s.logger.Printf("Error deleting object %s/%s during force delete: %v", bucketName, objAttrs.Name, err)
				return fmt.Errorf("failed to delete object %s in bucket %s: %w", objAttrs.Name, bucketName, err)
			}
			objCancel() // Explicitly cancel after successful deletion or loop iteration
			s.logger.Printf("Deleted object %s/%s", bucketName, objAttrs.Name)
		}
		s.logger.Printf("Finished deleting objects in bucket %s.", bucketName)
	}

	// Set a timeout for the bucket deletion operation
	deleteBucketCtx, cancel := context.WithTimeout(ctx, time.Second*30)
	defer cancel()

	if err := bucket.Delete(deleteBucketCtx); err != nil {
		s.logger.Printf("Error deleting bucket %s: %v", bucketName, err)
		// Handle specific errors like Not Found?
		// if e, ok := err.(*googleapi.Error); ok && e.Code == 404 {
		//  s.logger.Printf("Bucket %s not found, assuming already deleted.", bucketName)
		// 	return nil // Treat as success if already gone
		// }
		return fmt.Errorf("failed to delete bucket %s: %w", bucketName, err)
	}

	s.logger.Printf("Successfully deleted bucket %s", bucketName)
	return nil
}

// Close cleans up the storage client connection.
// Consider if this service should manage the client lifecycle or if the creator should.
// If managed here, call this during application shutdown.
func (s *gcpStorageService) Close() error {
	if s.client != nil {
		s.logger.Println("Closing GCP Storage client")
		return s.client.Close()
	}
	return nil
}
