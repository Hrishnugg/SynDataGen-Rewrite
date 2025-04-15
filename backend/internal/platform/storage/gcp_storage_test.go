package storage

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"testing"

	"cloud.google.com/go/storage"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"google.golang.org/api/iterator"
	// Adjust if your path differs
)

// --- Mocks using testify/mock ---

// MockStorageClient simulates storage.Client behavior
type MockStorageClient struct {
	mock.Mock
}

func (m *MockStorageClient) Bucket(name string) *storage.BucketHandle {
	args := m.Called(name)
	// Return nil if the mocked return value isn't set or isn't the correct type
	if args.Get(0) == nil {
		return nil
	}
	return args.Get(0).(*storage.BucketHandle)
}

// Close is required by the interface implicitly used in gcpStorageService.Close()
// Although not strictly needed for Create/Delete tests, good practice to include it.
func (m *MockStorageClient) Close() error {
	args := m.Called()
	return args.Error(0)
}

// MockBucketHandle simulates storage.BucketHandle behavior
type MockBucketHandle struct {
	mock.Mock
	// Embed storage.BucketHandle to satisfy the interface implicitly if needed,
	// but we primarily rely on mocking specific methods called by our service.
	// We don't strictly need the embedding if we mock all called methods.
}

func (m *MockBucketHandle) Create(ctx context.Context, projectID string, attrs *storage.BucketAttrs) error {
	args := m.Called(ctx, projectID, attrs)
	return args.Error(0)
}

func (m *MockBucketHandle) Attrs(ctx context.Context) (*storage.BucketAttrs, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*storage.BucketAttrs), args.Error(1)
}

func (m *MockBucketHandle) Delete(ctx context.Context) error {
	args := m.Called(ctx)
	return args.Error(0)
}

func (m *MockBucketHandle) Objects(ctx context.Context, q *storage.Query) *storage.ObjectIterator {
	args := m.Called(ctx, q)
	if args.Get(0) == nil {
		return nil
	}
	return args.Get(0).(*storage.ObjectIterator)
}

func (m *MockBucketHandle) Object(name string) *storage.ObjectHandle {
	args := m.Called(name)
	if args.Get(0) == nil {
		return nil
	}
	return args.Get(0).(*storage.ObjectHandle)
}

// MockObjectIterator simulates storage.ObjectIterator behavior
type MockObjectIterator struct {
	mock.Mock
	// Store objects to return
	objects []*storage.ObjectAttrs
	cursor  int
}

func (m *MockObjectIterator) Next() (*storage.ObjectAttrs, error) {
	args := m.Called() // Allow mocking explicit Next calls if needed for complex scenarios

	// If explicit mock expectations are set for Next(), use them
	if len(args) > 0 {
		retObj := args.Get(0)
		retErr := args.Error(1)
		if retObj == nil {
			return nil, retErr
		}
		return retObj.(*storage.ObjectAttrs), retErr
	}

	// Otherwise, use the simple list iteration logic
	if m.cursor < len(m.objects) {
		obj := m.objects[m.cursor]
		m.cursor++
		return obj, nil
	}
	return nil, iterator.Done
}

// MockObjectHandle simulates storage.ObjectHandle behavior
type MockObjectHandle struct {
	mock.Mock
}

func (m *MockObjectHandle) Delete(ctx context.Context) error {
	args := m.Called(ctx)
	return args.Error(0)
}

// --- Test Functions ---

func TestGCPStorageService_CreateProjectBucket_Success(t *testing.T) {
	assert := assert.New(t)
	ctx := context.Background()

	mockClient := new(MockStorageClient)
	mockBucketHandle := new(MockBucketHandle)

	projectID := "test-gcp-project"
	appProjectID := "test-app-proj-123"
	customerID := "cust-abc"
	requestedRegion := "us-central1"
	expectedBucketName := fmt.Sprintf("synoptic-project-%s", appProjectID)
	expectedLocation := "US-CENTRAL1" // GCP often returns uppercase

	// 1. Expect client.Bucket(expectedBucketName) to be called
	mockClient.On("Bucket", expectedBucketName).Return(mockBucketHandle)

	// 2. Expect bucket.Create() to be called with specific attributes
	// Use mock.AnythingOfType or specific matcher for BucketAttrs if needed
	mockBucketHandle.On("Create", mock.AnythingOfType("*context.timerCtx"), projectID, mock.MatchedBy(func(attrs *storage.BucketAttrs) bool {
		return attrs.Location == requestedRegion &&
			attrs.StorageClass == "STANDARD" &&
			attrs.UniformBucketLevelAccess.Enabled == true &&
			attrs.Labels["project-id"] == appProjectID &&
			attrs.Labels["customer-id"] == customerID
	})).Return(nil) // Success

	// 3. Expect bucket.Attrs() to be called after creation
	mockBucketHandle.On("Attrs", mock.AnythingOfType("*context.cancelCtx")).Return(&storage.BucketAttrs{
		Name:     expectedBucketName,
		Location: expectedLocation, // Simulate GCP returning uppercase
	}, nil) // Success

	// Create the service instance with the mock client
	// Use a discarded logger for tests
	logger := log.New(io.Discard, "", 0)
	service := &gcpStorageService{
		client:    mockClient, // Inject the mock client
		projectID: projectID,
		logger:    logger,
	}

	// Call the method under test
	bucketName, region, err := service.CreateProjectBucket(ctx, appProjectID, customerID, requestedRegion)

	// Assertions
	assert.NoError(err)
	assert.Equal(expectedBucketName, bucketName)
	assert.Equal(expectedLocation, region)

	// Verify that all expected calls were made
	mockClient.AssertExpectations(t)
	mockBucketHandle.AssertExpectations(t)
}

func TestGCPStorageService_CreateProjectBucket_Success_DefaultRegion(t *testing.T) {
	assert := assert.New(t)
	ctx := context.Background()

	mockClient := new(MockStorageClient)
	mockBucketHandle := new(MockBucketHandle)

	projectID := "test-gcp-project"
	appProjectID := "test-app-proj-456"
	customerID := "cust-def"
	requestedRegion := "" // Empty region
	defaultRegion := "US"
	expectedBucketName := fmt.Sprintf("synoptic-project-%s", appProjectID)
	expectedLocation := "US" // Location returned by Attrs

	// 1. Expect client.Bucket
	mockClient.On("Bucket", expectedBucketName).Return(mockBucketHandle)

	// 2. Expect bucket.Create with default region "US"
	mockBucketHandle.On("Create", mock.AnythingOfType("*context.timerCtx"), projectID, mock.MatchedBy(func(attrs *storage.BucketAttrs) bool {
		return attrs.Location == defaultRegion // Check default region is used
	})).Return(nil) // Success

	// 3. Expect bucket.Attrs
	mockBucketHandle.On("Attrs", mock.AnythingOfType("*context.cancelCtx")).Return(&storage.BucketAttrs{
		Name:     expectedBucketName,
		Location: expectedLocation,
	}, nil) // Success

	logger := log.New(io.Discard, "", 0)
	service := &gcpStorageService{
		client:    mockClient,
		projectID: projectID,
		logger:    logger,
	}

	bucketName, region, err := service.CreateProjectBucket(ctx, appProjectID, customerID, requestedRegion)

	assert.NoError(err)
	assert.Equal(expectedBucketName, bucketName)
	assert.Equal(expectedLocation, region)

	mockClient.AssertExpectations(t)
	mockBucketHandle.AssertExpectations(t)
}

func TestGCPStorageService_CreateProjectBucket_CreateError(t *testing.T) {
	assert := assert.New(t)
	ctx := context.Background()

	mockClient := new(MockStorageClient)
	mockBucketHandle := new(MockBucketHandle)

	projectID := "test-gcp-project"
	appProjectID := "test-app-proj-err-create"
	customerID := "cust-err"
	requestedRegion := "europe-west1"
	expectedBucketName := fmt.Sprintf("synoptic-project-%s", appProjectID)
	mockError := errors.New("GCP create failed")

	// 1. Expect client.Bucket
	mockClient.On("Bucket", expectedBucketName).Return(mockBucketHandle)

	// 2. Expect bucket.Create to fail
	mockBucketHandle.On("Create", mock.AnythingOfType("*context.timerCtx"), projectID, mock.AnythingOfType("*storage.BucketAttrs")).Return(mockError)

	// bucket.Attrs should NOT be called

	logger := log.New(io.Discard, "", 0)
	service := &gcpStorageService{
		client:    mockClient,
		projectID: projectID,
		logger:    logger,
	}

	bucketName, region, err := service.CreateProjectBucket(ctx, appProjectID, customerID, requestedRegion)

	assert.Error(err)                                // Expect an error
	assert.ErrorIs(err, mockError)                   // Check if it wraps the original error
	assert.Contains(err.Error(), expectedBucketName) // Ensure bucket name is in error message
	assert.Equal("", bucketName)                     // Bucket name should be empty on error
	assert.Equal("", region)                         // Region should be empty on error

	mockClient.AssertExpectations(t)
	mockBucketHandle.AssertExpectations(t)
	// Ensure Attrs was not called
	mockBucketHandle.AssertNotCalled(t, "Attrs", mock.Anything)
}

func TestGCPStorageService_CreateProjectBucket_AttrsError(t *testing.T) {
	assert := assert.New(t)
	ctx := context.Background()

	mockClient := new(MockStorageClient)
	mockBucketHandle := new(MockBucketHandle)

	projectID := "test-gcp-project"
	appProjectID := "test-app-proj-err-attrs"
	customerID := "cust-err-attrs"
	requestedRegion := "asia-east1"
	expectedBucketName := fmt.Sprintf("synoptic-project-%s", appProjectID)
	mockError := errors.New("GCP attrs failed")

	// 1. Expect client.Bucket
	mockClient.On("Bucket", expectedBucketName).Return(mockBucketHandle)

	// 2. Expect bucket.Create to succeed
	mockBucketHandle.On("Create", mock.AnythingOfType("*context.timerCtx"), projectID, mock.AnythingOfType("*storage.BucketAttrs")).Return(nil)

	// 3. Expect bucket.Attrs to fail
	mockBucketHandle.On("Attrs", mock.AnythingOfType("*context.cancelCtx")).Return(nil, mockError)

	logger := log.New(io.Discard, "", 0)
	service := &gcpStorageService{
		client:    mockClient,
		projectID: projectID,
		logger:    logger,
	}

	bucketName, region, err := service.CreateProjectBucket(ctx, appProjectID, customerID, requestedRegion)

	// Behavior: Even if Attrs fails, the bucket *was* created.
	// The service logs the error but returns the created name and the *requested* region as a fallback.
	// It does NOT return the error from Attrs directly to the caller in this implementation.
	assert.NoError(err) // No error returned to caller
	assert.Equal(expectedBucketName, bucketName)
	assert.Equal(requestedRegion, region) // Returns the requested region as fallback

	mockClient.AssertExpectations(t)
	mockBucketHandle.AssertExpectations(t)
}

func TestGCPStorageService_DeleteProjectBucket_Success_NoForce(t *testing.T) {
	assert := assert.New(t)
	ctx := context.Background()

	mockClient := new(MockStorageClient)
	mockBucketHandle := new(MockBucketHandle)

	projectID := "test-gcp-project"
	bucketName := "synoptic-project-to-delete-noforce"

	// 1. Expect client.Bucket
	mockClient.On("Bucket", bucketName).Return(mockBucketHandle)

	// 2. Expect bucket.Delete to be called directly (no force)
	mockBucketHandle.On("Delete", mock.AnythingOfType("*context.timerCtx")).Return(nil) // Success

	logger := log.New(io.Discard, "", 0)
	service := &gcpStorageService{
		client:    mockClient,
		projectID: projectID,
		logger:    logger,
	}

	err := service.DeleteProjectBucket(ctx, bucketName, false) // force = false

	assert.NoError(err)

	mockClient.AssertExpectations(t)
	mockBucketHandle.AssertExpectations(t)
	// Ensure Objects and Object were not called
	mockBucketHandle.AssertNotCalled(t, "Objects", mock.Anything, mock.Anything)
	mockBucketHandle.AssertNotCalled(t, "Object", mock.Anything)
}

func TestGCPStorageService_DeleteProjectBucket_Success_Force_NoObjects(t *testing.T) {
	assert := assert.New(t)
	ctx := context.Background()

	mockClient := new(MockStorageClient)
	mockBucketHandle := new(MockBucketHandle)
	mockObjectIterator := new(MockObjectIterator)

	projectID := "test-gcp-project"
	bucketName := "synoptic-project-to-delete-force-empty"

	// 1. Expect client.Bucket
	mockClient.On("Bucket", bucketName).Return(mockBucketHandle)

	// 2. Expect bucket.Objects to be called (force = true)
	mockBucketHandle.On("Objects", mock.AnythingOfType("*context.timerCtx"), (*storage.Query)(nil)).Return(mockObjectIterator)

	// 3. Expect iterator.Next to be called and return Done immediately
	mockObjectIterator.On("Next").Return(nil, iterator.Done)

	// 4. Expect bucket.Delete to be called after checking objects
	mockBucketHandle.On("Delete", mock.AnythingOfType("*context.timerCtx")).Return(nil) // Success

	logger := log.New(io.Discard, "", 0)
	service := &gcpStorageService{
		client:    mockClient,
		projectID: projectID,
		logger:    logger,
	}

	err := service.DeleteProjectBucket(ctx, bucketName, true) // force = true

	assert.NoError(err)

	mockClient.AssertExpectations(t)
	mockBucketHandle.AssertExpectations(t)
	mockObjectIterator.AssertExpectations(t)
	// Ensure Object(...).Delete was not called
	mockBucketHandle.AssertNotCalled(t, "Object", mock.Anything)
}

func TestGCPStorageService_DeleteProjectBucket_Success_Force_WithObjects(t *testing.T) {
	assert := assert.New(t)
	ctx := context.Background()

	mockClient := new(MockStorageClient)
	mockBucketHandle := new(MockBucketHandle)
	mockObjectHandle1 := new(MockObjectHandle)
	mockObjectHandle2 := new(MockObjectHandle)

	projectID := "test-gcp-project"
	bucketName := "synoptic-project-to-delete-force-full"
	objectName1 := "file1.txt"
	objectName2 := "subdir/file2.csv"

	// Prepare mock iterator with objects
	mockObjectIterator := &MockObjectIterator{
		objects: []*storage.ObjectAttrs{
			{Name: objectName1, Size: 100},
			{Name: objectName2, Size: 200},
		},
	}

	// 1. Expect client.Bucket
	mockClient.On("Bucket", bucketName).Return(mockBucketHandle)

	// 2. Expect bucket.Objects
	mockBucketHandle.On("Objects", mock.AnythingOfType("*context.timerCtx"), (*storage.Query)(nil)).Return(mockObjectIterator)

	// 3. Expect bucket.Object(name).Delete() for each object
	mockBucketHandle.On("Object", objectName1).Return(mockObjectHandle1)
	mockObjectHandle1.On("Delete", mock.AnythingOfType("*context.timerCtx")).Return(nil) // Success deleting obj1

	mockBucketHandle.On("Object", objectName2).Return(mockObjectHandle2)
	mockObjectHandle2.On("Delete", mock.AnythingOfType("*context.timerCtx")).Return(nil) // Success deleting obj2

	// 4. Expect bucket.Delete after objects are deleted
	mockBucketHandle.On("Delete", mock.AnythingOfType("*context.timerCtx")).Return(nil) // Success deleting bucket

	logger := log.New(io.Discard, "", 0)
	service := &gcpStorageService{
		client:    mockClient,
		projectID: projectID,
		logger:    logger,
	}

	err := service.DeleteProjectBucket(ctx, bucketName, true) // force = true

	assert.NoError(err)

	mockClient.AssertExpectations(t)
	mockBucketHandle.AssertExpectations(t)
	mockObjectHandle1.AssertExpectations(t)
	mockObjectHandle2.AssertExpectations(t)
	// iterator.Next() is implicitly called by the range loop, so we don't mock/assert it directly here
	// unless we used the more complex explicit mocking in MockObjectIterator.Next
}

func TestGCPStorageService_DeleteProjectBucket_Error_ListObjects(t *testing.T) {
	assert := assert.New(t)
	ctx := context.Background()

	mockClient := new(MockStorageClient)
	mockBucketHandle := new(MockBucketHandle)

	projectID := "test-gcp-project"
	bucketName := "synoptic-project-err-list"
	mockError := errors.New("failed to list objects")

	// 1. Expect client.Bucket
	mockClient.On("Bucket", bucketName).Return(mockBucketHandle)

	// 2. Expect bucket.Objects to fail
	mockBucketHandle.On("Objects", mock.AnythingOfType("*context.timerCtx"), (*storage.Query)(nil)).Return(nil, mockError) // Return error

	logger := log.New(io.Discard, "", 0)
	service := &gcpStorageService{
		client:    mockClient,
		projectID: projectID,
		logger:    logger,
	}

	err := service.DeleteProjectBucket(ctx, bucketName, true) // force = true

	assert.Error(err)
	assert.ErrorIs(err, mockError)
	assert.Contains(err.Error(), "failed to list objects in bucket")

	mockClient.AssertExpectations(t)
	mockBucketHandle.AssertExpectations(t)
	// Ensure Delete was not called
	mockBucketHandle.AssertNotCalled(t, "Delete", mock.Anything)
	// Ensure Object was not called
	mockBucketHandle.AssertNotCalled(t, "Object", mock.Anything)
}

func TestGCPStorageService_DeleteProjectBucket_Error_DeleteObject(t *testing.T) {
	assert := assert.New(t)
	ctx := context.Background()

	mockClient := new(MockStorageClient)
	mockBucketHandle := new(MockBucketHandle)
	mockObjectHandle1 := new(MockObjectHandle)

	projectID := "test-gcp-project"
	bucketName := "synoptic-project-err-del-obj"
	objectName1 := "file-to-fail.txt"
	mockError := errors.New("failed to delete object")

	// Prepare mock iterator
	mockObjectIterator := &MockObjectIterator{
		objects: []*storage.ObjectAttrs{{Name: objectName1}},
	}

	// 1. Expect client.Bucket
	mockClient.On("Bucket", bucketName).Return(mockBucketHandle)

	// 2. Expect bucket.Objects to succeed
	mockBucketHandle.On("Objects", mock.AnythingOfType("*context.timerCtx"), (*storage.Query)(nil)).Return(mockObjectIterator)

	// 3. Expect bucket.Object(name).Delete() to fail for the object
	mockBucketHandle.On("Object", objectName1).Return(mockObjectHandle1)
	mockObjectHandle1.On("Delete", mock.AnythingOfType("*context.timerCtx")).Return(mockError)

	logger := log.New(io.Discard, "", 0)
	service := &gcpStorageService{
		client:    mockClient,
		projectID: projectID,
		logger:    logger,
	}

	err := service.DeleteProjectBucket(ctx, bucketName, true) // force = true

	assert.Error(err)
	assert.ErrorIs(err, mockError)
	assert.Contains(err.Error(), fmt.Sprintf("failed to delete object %s in bucket %s", objectName1, bucketName))

	mockClient.AssertExpectations(t)
	mockBucketHandle.AssertExpectations(t)
	mockObjectHandle1.AssertExpectations(t)
	// Ensure bucket.Delete was not called
	mockBucketHandle.AssertNotCalled(t, "Delete", mock.AnythingOfType("*context.timerCtx"))
}

func TestGCPStorageService_DeleteProjectBucket_Error_DeleteBucket(t *testing.T) {
	assert := assert.New(t)
	ctx := context.Background()

	mockClient := new(MockStorageClient)
	mockBucketHandle := new(MockBucketHandle)

	projectID := "test-gcp-project"
	bucketName := "synoptic-project-err-del-bucket"
	mockError := errors.New("failed to delete bucket")

	// 1. Expect client.Bucket
	mockClient.On("Bucket", bucketName).Return(mockBucketHandle)

	// 2. Expect bucket.Delete to fail (testing no-force case for simplicity)
	mockBucketHandle.On("Delete", mock.AnythingOfType("*context.timerCtx")).Return(mockError)

	logger := log.New(io.Discard, "", 0)
	service := &gcpStorageService{
		client:    mockClient,
		projectID: projectID,
		logger:    logger,
	}

	err := service.DeleteProjectBucket(ctx, bucketName, false) // force = false

	assert.Error(err)
	assert.ErrorIs(err, mockError)
	assert.Contains(err.Error(), fmt.Sprintf("failed to delete bucket %s", bucketName))

	mockClient.AssertExpectations(t)
	mockBucketHandle.AssertExpectations(t)
}

func TestGCPStorageService_Close(t *testing.T) {
	assert := assert.New(t)
	mockClient := new(MockStorageClient)

	mockError := errors.New("client close failed")

	// 1. Expect client.Close to be called
	mockClient.On("Close").Return(nil) // Simulate successful close first

	logger := log.New(io.Discard, "", 0)
	service := &gcpStorageService{
		client:    mockClient,
		projectID: "irrelevant",
		logger:    logger,
	}

	err := service.Close()
	assert.NoError(err)

	mockClient.AssertExpectations(t)

	// Test error case
	mockClient = new(MockStorageClient) // Reset mock for new scenario
	mockClient.On("Close").Return(mockError)
	service.client = mockClient // Assign new mock

	err = service.Close()
	assert.Error(err)
	assert.Equal(mockError, err)
	mockClient.AssertExpectations(t)
}

// TODO: Add more test cases:
// - TestGCPStorageService_DeleteProjectBucket_Error_BucketNotFound (Maybe, requires checking error type)
// - TestNewGCPStorageService (More complex, might need env vars or skip)
