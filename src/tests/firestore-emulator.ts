/**
 * Firestore Emulator Utilities
 * 
 * This file provides utility functions for interacting with the Firestore Emulator
 * or using a mock implementation when the emulator is not available.
 */

import { Firestore, DocumentData, WriteResult, Timestamp } from 'firebase-admin/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';

// Flag to determine if we should use mocks
const useMocks = process.env.USE_FIREBASE_MOCKS === 'true';

// Mock data storage
interface MockData {
  [collection: string]: {
    [document: string]: DocumentData;
  };
}

// Global mock data store
let mockFirestoreData: MockData = {};

// Reset mock data
export function resetMockFirestoreData(): void {
  mockFirestoreData = {};
}

// Mock implementations
class MockDocumentSnapshot {
  constructor(
    public readonly id: string,
    private readonly _data: DocumentData | null,
    public readonly exists: boolean,
    public readonly ref: { id: string; path: string }
  ) {}

  data(): DocumentData | undefined {
    if (!this._data) return undefined;
    // Always include the document ID in the returned data
    return { id: this.id, ...this._data };
  }
  
  isEqual(other: MockDocumentSnapshot): boolean {
    return this.id === other.id && this.ref.path === other.ref.path;
  }
}

class MockQuerySnapshot {
  constructor(public readonly docs: MockDocumentSnapshot[]) {}

  forEach(callback: (doc: MockDocumentSnapshot) => void): void {
    this.docs.forEach(callback);
  }

  empty: boolean = this.docs.length === 0;
  size: number = this.docs.length;
}

class MockQueryDocumentSnapshot extends MockDocumentSnapshot {
  constructor(id: string, data: DocumentData, path: string) {
    super(id, data, true, { id, path });
  }
}

class MockDocumentReference {
  constructor(
    public readonly path: string,
    public readonly id: string
  ) {}

  async get(): Promise<MockDocumentSnapshot> {
    // Handle paths with multiple segments (e.g., "collection/doc/subcollection/subdoc")
    const pathParts = this.path.split('/');
    let collection, docId;
    
    if (pathParts.length >= 2) {
      // For paths like "collection/docId"
      collection = pathParts[0];
      docId = pathParts[1];
    } else {
      // For direct document references
      collection = this.path;
      docId = this.id;
    }
    
    const data = mockFirestoreData[collection]?.[docId] || null;
    return new MockDocumentSnapshot(docId, data, !!data, { id: docId, path: `${collection}/${docId}` });
  }

  async set(data: DocumentData): Promise<WriteResult> {
    const pathParts = this.path.split('/');
    let collection, docId;
    
    if (pathParts.length >= 2) {
      // For paths like "collection/docId"
      collection = pathParts[0];
      docId = pathParts[1];
    } else {
      // For direct document references
      collection = this.path;
      docId = this.id;
    }
    
    if (!mockFirestoreData[collection]) {
      mockFirestoreData[collection] = {};
    }
    
    // Store a copy of the data without the id field to avoid duplication
    const { id, ...dataWithoutId } = data;
    mockFirestoreData[collection][docId] = { ...dataWithoutId };
    
    return {
      writeTime: Timestamp.fromDate(new Date()),
      isEqual(other: WriteResult): boolean {
        return other && this.writeTime.isEqual(other.writeTime);
      }
    } as WriteResult;
  }

  async update(data: DocumentData): Promise<WriteResult> {
    const pathParts = this.path.split('/');
    let collection, docId;
    
    if (pathParts.length >= 2) {
      // For paths like "collection/docId"
      collection = pathParts[0];
      docId = pathParts[1];
    } else {
      // For direct document references
      collection = this.path;
      docId = this.id;
    }
    
    if (!mockFirestoreData[collection] || !mockFirestoreData[collection][docId]) {
      throw new Error(`Document ${this.path} does not exist`);
    }
    
    // Update only the specified fields
    mockFirestoreData[collection][docId] = {
      ...mockFirestoreData[collection][docId],
      ...data
    };
    
    return {
      writeTime: Timestamp.fromDate(new Date()),
      isEqual(other: WriteResult): boolean {
        return other && this.writeTime.isEqual(other.writeTime);
      }
    } as WriteResult;
  }

  async delete(): Promise<WriteResult> {
    const pathParts = this.path.split('/');
    let collection, docId;
    
    if (pathParts.length >= 2) {
      // For paths like "collection/docId"
      collection = pathParts[0];
      docId = pathParts[1];
    } else {
      // For direct document references
      collection = this.path;
      docId = this.id;
    }
    
    if (mockFirestoreData[collection] && mockFirestoreData[collection][docId]) {
      delete mockFirestoreData[collection][docId];
    }
    
    return {
      writeTime: Timestamp.fromDate(new Date()),
      isEqual(other: WriteResult): boolean {
        return other && this.writeTime.isEqual(other.writeTime);
      }
    } as WriteResult;
  }

  collection(collectionPath: string): MockCollectionReference {
    return new MockCollectionReference(`${this.path}/${collectionPath}`);
  }
  
  isEqual(other: MockDocumentReference): boolean {
    return this.id === other.id && this.path === other.path;
  }
}

class MockQuery {
  constructor(
    private readonly collectionPath: string,
    private readonly conditions: Array<{
      field: string;
      op: string;
      value: any;
    }> = [],
    private readonly limitValue: number = 0,
    private readonly offsetValue: number = 0,
    private readonly orderByField: string | null = null,
    private readonly orderDirection: 'asc' | 'desc' = 'asc'
  ) {}

  where(field: string, op: string, value: any): MockQuery {
    return new MockQuery(
      this.collectionPath,
      [...this.conditions, { field, op, value }],
      this.limitValue,
      this.offsetValue,
      this.orderByField,
      this.orderDirection
    );
  }

  async get(): Promise<MockQuerySnapshot> {
    const collection = mockFirestoreData[this.collectionPath] || {};
    
    // Filter documents based on conditions
    let filteredDocs = Object.entries(collection)
      .filter(([docId, data]) => {
        // If no conditions, return all documents
        if (this.conditions.length === 0) return true;
        
        return this.conditions.every(({ field, op, value }) => {
          if (!data.hasOwnProperty(field)) return false;
          
          switch (op) {
            case '==': return data[field] === value;
            case '!=': return data[field] !== value;
            case '>': return data[field] > value;
            case '>=': return data[field] >= value;
            case '<': return data[field] < value;
            case '<=': return data[field] <= value;
            case 'array-contains': return Array.isArray(data[field]) && data[field].includes(value);
            case 'in': return Array.isArray(value) && value.includes(data[field]);
            case 'array-contains-any': 
              return Array.isArray(data[field]) && Array.isArray(value) && 
                     data[field].some(item => value.includes(item));
            default: return false;
          }
        });
      })
      .map(([docId, data]) => new MockQueryDocumentSnapshot(docId, data, `${this.collectionPath}/${docId}`));
    
    // Apply ordering if specified
    if (this.orderByField) {
      filteredDocs.sort((a, b) => {
        const aValue = a.data()?.[this.orderByField!];
        const bValue = b.data()?.[this.orderByField!];
        
        if (aValue === bValue) return 0;
        if (aValue === undefined) return this.orderDirection === 'asc' ? -1 : 1;
        if (bValue === undefined) return this.orderDirection === 'asc' ? 1 : -1;
        
        const comparison = aValue < bValue ? -1 : 1;
        return this.orderDirection === 'asc' ? comparison : -comparison;
      });
    }
    
    // Apply offset if specified
    if (this.offsetValue > 0) {
      filteredDocs = filteredDocs.slice(this.offsetValue);
    }
    
    // Apply limit if specified
    if (this.limitValue > 0) {
      filteredDocs = filteredDocs.slice(0, this.limitValue);
    }
    
    return new MockQuerySnapshot(filteredDocs);
  }

  limit(limit: number): MockQuery {
    return new MockQuery(
      this.collectionPath,
      this.conditions,
      limit,
      this.offsetValue,
      this.orderByField,
      this.orderDirection
    );
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): MockQuery {
    return new MockQuery(
      this.collectionPath,
      this.conditions,
      this.limitValue,
      this.offsetValue,
      field,
      direction
    );
  }
  
  offset(offset: number): MockQuery {
    return new MockQuery(
      this.collectionPath,
      this.conditions,
      this.limitValue,
      offset,
      this.orderByField,
      this.orderDirection
    );
  }
  
  startAfter(startAfter: any): MockQuery {
    // Simple implementation that doesn't actually implement startAfter
    return this;
  }
}

class MockCollectionReference extends MockQuery {
  constructor(public readonly path: string) {
    super(path);
  }

  doc(docPath?: string): MockDocumentReference {
    const docId = docPath || uuidv4();
    return new MockDocumentReference(`${this.path}/${docId}`, docId);
  }

  async add(data: DocumentData): Promise<MockDocumentReference> {
    const docId = uuidv4();
    const docRef = new MockDocumentReference(`${this.path}/${docId}`, docId);
    await docRef.set(data);
    return docRef;
  }
  
  async listDocuments(): Promise<MockDocumentReference[]> {
    const collection = mockFirestoreData[this.path] || {};
    return Object.keys(collection).map(docId => 
      new MockDocumentReference(`${this.path}/${docId}`, docId)
    );
  }
}

export class MockFirestore {
  collection(collectionPath: string): MockCollectionReference {
    return new MockCollectionReference(collectionPath);
  }

  doc(documentPath: string): MockDocumentReference {
    const lastSlashIndex = documentPath.lastIndexOf('/');
    if (lastSlashIndex === -1) {
      throw new Error(`Invalid document path: ${documentPath}`);
    }
    const collection = documentPath.substring(0, lastSlashIndex);
    const doc = documentPath.substring(lastSlashIndex + 1);
    return new MockDocumentReference(documentPath, doc);
  }

  batch(): MockWriteBatch {
    return new MockWriteBatch();
  }

  async listCollections(): Promise<MockCollectionReference[]> {
    // Return the collection names from our mock data
    return Object.keys(mockFirestoreData).map(name => new MockCollectionReference(name));
  }

  async recursiveDelete(ref: MockDocumentReference | MockCollectionReference): Promise<void> {
    if (ref instanceof MockDocumentReference) {
      await ref.delete();
    } else {
      const snapshot = await ref.get();
      for (const doc of snapshot.docs) {
        await new MockDocumentReference(ref.path, doc.id).delete();
      }
    }
  }

  // Add Firestore FieldValue mock for compatibility
  FieldValue = {
    serverTimestamp: () => new Date(),
    increment: (num: number) => `increment:${num}`,
    arrayUnion: (...elements: any[]) => `arrayUnion:${elements.join(',')}`,
    arrayRemove: (...elements: any[]) => `arrayRemove:${elements.join(',')}`,
    delete: () => `delete`
  };

  // Mock Firestore runTransaction
  async runTransaction<T>(updateFunction: (transaction: any) => Promise<T>): Promise<T> {
    const transaction = new MockTransaction();
    return updateFunction(transaction);
  }
}

class MockWriteBatch {
  private operations: Array<() => Promise<any>> = [];

  set(documentRef: MockDocumentReference, data: DocumentData): MockWriteBatch {
    this.operations.push(() => documentRef.set(data));
    return this;
  }

  update(documentRef: MockDocumentReference, data: DocumentData): MockWriteBatch {
    this.operations.push(() => documentRef.update(data));
    return this;
  }

  delete(documentRef: MockDocumentReference): MockWriteBatch {
    this.operations.push(() => documentRef.delete());
    return this;
  }

  async commit(): Promise<WriteResult[]> {
    const results: WriteResult[] = [];
    for (const operation of this.operations) {
      await operation();
      results.push({
        writeTime: Timestamp.fromDate(new Date()),
        isEqual(other: WriteResult): boolean {
          return other && this.writeTime.isEqual(other.writeTime);
        }
      } as WriteResult);
    }
    return results;
  }
}

class MockTransaction {
  private operations: Array<() => Promise<any>> = [];

  async get(documentRef: MockDocumentReference): Promise<MockDocumentSnapshot> {
    return documentRef.get();
  }

  set(documentRef: MockDocumentReference, data: DocumentData): MockTransaction {
    this.operations.push(() => documentRef.set(data));
    return this;
  }

  update(documentRef: MockDocumentReference, data: DocumentData): MockTransaction {
    this.operations.push(() => documentRef.update(data));
    return this;
  }

  delete(documentRef: MockDocumentReference): MockTransaction {
    this.operations.push(() => documentRef.delete());
    return this;
  }
}

/**
 * Initializes the Firestore emulator or returns a mock implementation
 * @returns Firestore instance connected to the emulator or a mock
 */
export function initializeFirestoreEmulator(): Firestore | MockFirestore {
  try {
    if (useMocks) {
      console.log('Using mock Firestore implementation');
      return new MockFirestore() as unknown as Firestore;
    }
    
    // Check if Firestore emulator host is set
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
    }
    
    console.log(`Connecting to Firestore emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`);
    return getFirestore();
  } catch (error) {
    console.error('Failed to initialize Firestore emulator, falling back to mock:', error);
    return new MockFirestore() as unknown as Firestore;
  }
}

/**
 * Clears all data from the Firestore emulator
 * @param firestore Firestore instance connected to the emulator
 */
export async function clearFirestoreEmulator(firestore?: Firestore): Promise<void> {
  try {
    if (useMocks) {
      resetMockFirestoreData();
      return;
    }
    
    if (!firestore) {
      console.warn("No Firestore instance provided to clearFirestoreEmulator, only clearing mock data");
      resetMockFirestoreData();
      return;
    }
    
    // For real emulator, delete all collections
    const collections = await firestore.listCollections();
    
    for (const collection of collections) {
      const documents = await collection.listDocuments();
      
      for (const doc of documents) {
        await doc.delete();
      }
    }
    
    console.log('Firestore emulator cleared successfully');
  } catch (error) {
    console.error('Error clearing Firestore emulator:', error);
    // Don't throw, just log the error
  }
}

/**
 * Seeds the Firestore emulator with test data
 * 
 * @param firestore The Firestore instance connected to the emulator
 * @param collections A map of collection names to arrays of documents to seed
 */
export async function seedFirestoreEmulator(
  firestore: Firestore,
  collections?: { [collection: string]: any[] }
): Promise<void> {
  try {
    // First clear existing data
    await clearFirestoreEmulator(firestore);
    
    // If no collections provided, just return after clearing
    if (!collections) {
      return;
    }
    
    // For each collection, add documents in batches
    for (const [collection, documents] of Object.entries(collections)) {
      if (!documents || documents.length === 0) continue;
      
      if (useMocks) {
        // For mock implementation, directly update the mock data store
        if (!mockFirestoreData[collection]) {
          mockFirestoreData[collection] = {};
        }
        
        for (const doc of documents) {
          const docId = doc.id || uuidv4();
          const { id, ...docData } = doc;
          mockFirestoreData[collection][docId] = docData;
        }
      } else {
        // For real emulator, use batches
        // Process in batches of 500 (Firestore batch limit)
        const batchSize = 500;
        const batches = Math.ceil(documents.length / batchSize);
        
        for (let i = 0; i < batches; i++) {
          const batch = firestore.batch();
          const start = i * batchSize;
          const end = Math.min(start + batchSize, documents.length);
          
          for (let j = start; j < end; j++) {
            const doc = documents[j];
            const docId = doc.id || uuidv4();
            const docRef = firestore.collection(collection).doc(docId);
            
            // Remove id field if it exists (to avoid duplicating it)
            const { id, ...docData } = doc;
            
            batch.set(docRef, docData);
          }
          
          await batch.commit();
        }
      }
    }
    
    console.log('Test data seeded successfully');
  } catch (error) {
    console.error('Error seeding Firestore emulator:', error);
    throw error;
  }
}