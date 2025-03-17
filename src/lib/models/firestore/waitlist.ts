import { WaitlistMetadata } from '@/types/metadata';

/**
 * Firestore Waitlist Model
 * 
 * Defines the structure and types for waitlist submission data in Firestore.
 */

/**
 * Waitlist submission model for Firestore
 */
export interface WaitlistSubmission {
  id: string;            // Unique identifier for the submission
  email: string;         // Contact email
  name: string;          // Full name
  company: string;       // Company name
  jobTitle?: string;     // Job title
  useCase: string;       // Intended use case description
  dataVolume?: string;   // Expected data volume
  industry?: string;     // Industry sector
  createdAt: Date;       // Submission timestamp
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;        // Admin notes
  metadata: WaitlistMetadata; // Additional submission data
}

/**
 * Input type for creating a new waitlist submission
 */
export interface CreateWaitlistInput {
  email: string;
  name: string;
  company: string;
  jobTitle?: string;
  useCase: string;
  dataVolume?: string;
  industry?: string;
  metadata?: WaitlistMetadata;
}

/**
 * Firestore collection name for waitlist submissions
 */
export const WAITLIST_COLLECTION = 'waitlist';

/**
 * Convert a Firestore document to a WaitlistSubmission object
 * @param doc Firestore document data
 * @param id Document ID
 * @returns WaitlistSubmission object
 */
export function firestoreToWaitlist(doc: FirebaseFirestore.DocumentData, id: string): WaitlistSubmission {
  return {
    id,
    email: doc.email,
    name: doc.name,
    company: doc.company,
    jobTitle: doc.jobTitle || '',
    useCase: doc.useCase || '',
    dataVolume: doc.dataVolume || '',
    industry: doc.industry || '',
    createdAt: doc.createdAt?.toDate() || new Date(),
    status: doc.status || 'pending',
    notes: doc.notes || '',
    metadata: doc.metadata || {}
  };
}

/**
 * Convert a WaitlistSubmission object to Firestore document data
 * @param submission WaitlistSubmission object
 * @returns Firestore document data
 */
export function waitlistToFirestore(submission: WaitlistSubmission): FirebaseFirestore.DocumentData {
  return {
    email: submission.email,
    name: submission.name,
    company: submission.company,
    jobTitle: submission.jobTitle || '',
    useCase: submission.useCase,
    dataVolume: submission.dataVolume || '',
    industry: submission.industry || '',
    createdAt: submission.createdAt,
    status: submission.status,
    notes: submission.notes || '',
    metadata: submission.metadata || {}
  };
} 