/**
 * Projects API Routes Tests
 * 
 * This file contains integration tests for the Projects API routes using
 * Firebase and Firestore emulators to ensure the API works with actual Firebase services.
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '../../app/api/projects/route';
import { GET as GetProject, DELETE, PATCH } from '../../app/api/projects/[id]/route';
import { initializeFirestoreEmulator, seedFirestoreEmulator, clearFirestoreEmulator } from '../firestore-emulator';
import { initializeAuthEmulator, createTestUser, generateTestIdToken, deleteTestUser } from '../auth-emulator';

// Sample project data for testing
const sampleProjects = [
  {
    id: 'project-1',
    name: 'Test Project 1',
    description: 'Description for test project 1',
    ownerId: 'test-user-id',
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z'
  },
  {
    id: 'project-2',
    name: 'Test Project 2',
    description: 'Description for test project 2',
    ownerId: 'test-user-id',
    createdAt: '2023-01-02T00:00:00.000Z',
    updatedAt: '2023-01-02T00:00:00.000Z'
  }
];

// Helper to create a mock NextRequest
const createMockRequest = (method: string, body?: any, headers?: Record<string, string>, searchParams?: Record<string, string>) => {
  const req = {
    method,
    headers: new Headers(headers || {}),
    json: jest.fn().mockResolvedValue(body || {}),
    nextUrl: {
      searchParams: new URLSearchParams(searchParams)
    }
  } as unknown as NextRequest;
  return req;
};

describe('Projects API Routes', () => {
  const testEmail = 'test@example.com';
  const testPassword = 'Password123!';
  let testUserId: string;
  let testIdToken: string;
  
  // Set up test environment before all tests
  beforeAll(async () => {
    // Initialize Firebase emulators
    initializeFirestoreEmulator();
    initializeAuthEmulator();
    
    // Create test user and get ID token
    const user = await createTestUser(testEmail, testPassword);
    testUserId = user.uid;
    testIdToken = await generateTestIdToken(testUserId);
    
    // Replace the user ID in sample data
    sampleProjects.forEach(project => {
      project.ownerId = testUserId;
    });
    
    // Seed Firestore with initial test data
    await seedFirestoreEmulator({
      'projects': sampleProjects
    });
  });
  
  // Clean up after all tests
  afterAll(async () => {
    await clearFirestoreEmulator();
    await deleteTestUser(testEmail);
  });
  
  // Reset test data between tests to ensure isolation
  beforeEach(async () => {
    await clearFirestoreEmulator();
    await seedFirestoreEmulator({
      'projects': sampleProjects
    });
  });
  
  describe('GET /api/projects', () => {
    it('should return a list of projects for authorized user', async () => {
      const req = createMockRequest('GET', null, {
        'Authorization': `Bearer ${testIdToken}`
      });
      
      const res = await GET(req);
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data).toHaveProperty('projects');
      expect(data.projects.length).toBeGreaterThan(0);
      expect(data.projects.find(p => p.id === 'project-1')).toBeDefined();
      expect(data.projects.find(p => p.id === 'project-2')).toBeDefined();
    });
    
    it('should return 401 for unauthorized requests', async () => {
      const req = createMockRequest('GET', null, {
        'Authorization': 'Bearer invalid-token'
      });
      
      const res = await GET(req);
      
      expect(res.status).toBe(401);
    });
    
    it('should handle empty results', async () => {
      // Clear test data and seed with empty projects
      await clearFirestoreEmulator();
      
      const req = createMockRequest('GET', null, {
        'Authorization': `Bearer ${testIdToken}`
      });
      
      const res = await GET(req);
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data.projects).toEqual([]);
    });
  });
  
  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const projectData = {
        name: 'New Test Project',
        description: 'A new test project created via API'
      };
      
      const req = createMockRequest('POST', projectData, {
        'Authorization': `Bearer ${testIdToken}`
      });
      
      const res = await POST(req);
      const data = await res.json();
      
      expect(res.status).toBe(201);
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('name', 'New Test Project');
      expect(data).toHaveProperty('ownerId', testUserId);
      
      // Verify the project was actually created in Firestore
      const firestore = initializeFirestoreEmulator();
      const docRef = firestore.collection('projects').doc(data.id);
      const docSnap = await docRef.get();
      
      expect(docSnap.exists).toBe(true);
      expect(docSnap.data()).toEqual(expect.objectContaining({
        name: 'New Test Project',
        description: 'A new test project created via API',
        ownerId: testUserId
      }));
    });
    
    it('should return 401 for unauthorized requests', async () => {
      const req = createMockRequest('POST', { name: 'Unauthorized Project' }, {
        'Authorization': 'Bearer invalid-token'
      });
      
      const res = await POST(req);
      
      expect(res.status).toBe(401);
    });
    
    it('should validate required fields', async () => {
      const req = createMockRequest('POST', { description: 'Missing name field' }, {
        'Authorization': `Bearer ${testIdToken}`
      });
      
      const res = await POST(req);
      
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });
  });
  
  describe('GET /api/projects/[id]', () => {
    it('should retrieve a specific project', async () => {
      const params = { id: 'project-1' };
      const req = createMockRequest('GET', null, {
        'Authorization': `Bearer ${testIdToken}`
      });
      
      const res = await GetProject(req, { params });
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data).toHaveProperty('id', 'project-1');
      expect(data).toHaveProperty('name', 'Test Project 1');
    });
    
    it('should return 404 for non-existent projects', async () => {
      const params = { id: 'non-existent-project' };
      const req = createMockRequest('GET', null, {
        'Authorization': `Bearer ${testIdToken}`
      });
      
      const res = await GetProject(req, { params });
      
      expect(res.status).toBe(404);
    });
    
    it('should return 401 for unauthorized requests', async () => {
      const params = { id: 'project-1' };
      const req = createMockRequest('GET', null, {
        'Authorization': 'Bearer invalid-token'
      });
      
      const res = await GetProject(req, { params });
      
      expect(res.status).toBe(401);
    });
    
    it('should restrict access to projects owned by other users', async () => {
      // Create another user and their project
      const anotherUser = await createTestUser('another@example.com', 'AnotherPassword123!');
      
      // Seed a project owned by another user
      await seedFirestoreEmulator({
        'projects': [{
          id: 'other-user-project',
          name: 'Other User Project',
          description: 'Project owned by another user',
          ownerId: anotherUser.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }]
      });
      
      // Try to access the other user's project
      const params = { id: 'other-user-project' };
      const req = createMockRequest('GET', null, {
        'Authorization': `Bearer ${testIdToken}`
      });
      
      const res = await GetProject(req, { params });
      
      // Should return 404 (not 403) for security reasons - don't confirm existence
      expect(res.status).toBe(404);
    });
  });
  
  describe('PATCH /api/projects/[id]', () => {
    it('should update an existing project', async () => {
      const params = { id: 'project-1' };
      const updateData = {
        name: 'Updated Project Name',
        description: 'Updated project description'
      };
      
      const req = createMockRequest('PATCH', updateData, {
        'Authorization': `Bearer ${testIdToken}`
      });
      
      const res = await PATCH(req, { params });
      
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('id', 'project-1');
      expect(data).toHaveProperty('name', 'Updated Project Name');
      expect(data).toHaveProperty('description', 'Updated project description');
      
      // Verify the update in Firestore
      const firestore = initializeFirestoreEmulator();
      const docRef = firestore.collection('projects').doc('project-1');
      const docSnap = await docRef.get();
      
      expect(docSnap.exists).toBe(true);
      expect(docSnap.data()).toEqual(expect.objectContaining({
        name: 'Updated Project Name',
        description: 'Updated project description'
      }));
    });
    
    it('should return 404 for non-existent projects', async () => {
      const params = { id: 'non-existent-project' };
      const updateData = { name: 'Updated Name' };
      
      const req = createMockRequest('PATCH', updateData, {
        'Authorization': `Bearer ${testIdToken}`
      });
      
      const res = await PATCH(req, { params });
      
      expect(res.status).toBe(404);
    });
    
    it('should return 401 for unauthorized requests', async () => {
      const params = { id: 'project-1' };
      const req = createMockRequest('PATCH', { name: 'Updated Name' }, {
        'Authorization': 'Bearer invalid-token'
      });
      
      const res = await PATCH(req, { params });
      
      expect(res.status).toBe(401);
    });
  });
  
  describe('DELETE /api/projects/[id]', () => {
    it('should delete an existing project', async () => {
      const params = { id: 'project-1' };
      const req = createMockRequest('DELETE', null, {
        'Authorization': `Bearer ${testIdToken}`
      });
      
      const res = await DELETE(req, { params });
      
      expect(res.status).toBe(204);
      
      // Verify the project was deleted from Firestore
      const firestore = initializeFirestoreEmulator();
      const docRef = firestore.collection('projects').doc('project-1');
      const docSnap = await docRef.get();
      
      expect(docSnap.exists).toBe(false);
    });
    
    it('should return 404 for non-existent projects', async () => {
      const params = { id: 'non-existent-project' };
      const req = createMockRequest('DELETE', null, {
        'Authorization': `Bearer ${testIdToken}`
      });
      
      const res = await DELETE(req, { params });
      
      expect(res.status).toBe(404);
    });
    
    it('should return 401 for unauthorized requests', async () => {
      const params = { id: 'project-1' };
      const req = createMockRequest('DELETE', null, {
        'Authorization': 'Bearer invalid-token'
      });
      
      const res = await DELETE(req, { params });
      
      expect(res.status).toBe(401);
    });
    
    it('should not allow deletion of projects owned by other users', async () => {
      // Create another user and their project
      const anotherUser = await createTestUser('another-delete@example.com', 'AnotherPassword123!');
      
      // Seed a project owned by another user
      await seedFirestoreEmulator({
        'projects': [{
          id: 'other-user-project-delete',
          name: 'Other User Project for Delete Test',
          description: 'Project owned by another user',
          ownerId: anotherUser.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }]
      });
      
      // Try to delete the other user's project
      const params = { id: 'other-user-project-delete' };
      const req = createMockRequest('DELETE', null, {
        'Authorization': `Bearer ${testIdToken}`
      });
      
      const res = await DELETE(req, { params });
      
      // Should return 404 (not 403) for security reasons
      expect(res.status).toBe(404);
      
      // Verify the project was NOT deleted from Firestore
      const firestore = initializeFirestoreEmulator();
      const docRef = firestore.collection('projects').doc('other-user-project-delete');
      const docSnap = await docRef.get();
      
      expect(docSnap.exists).toBe(true);
    });
  });
}); 