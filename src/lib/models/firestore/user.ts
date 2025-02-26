/**
 * Firestore User Model
 * 
 * Defines the structure and types for user data in Firestore.
 */

/**
 * User data model for Firestore
 */
export interface User {
  id: string;            // Unique identifier for the user
  name: string;          // User's name
  email: string;         // User's email (used for login)
  password: string;      // Hashed password
  company: string;       // User's company
  createdAt: Date;       // Account creation date
  updatedAt: Date;       // Last update timestamp
}

/**
 * User data without sensitive information
 */
export interface SafeUser extends Omit<User, 'password'> {}

/**
 * Input type for creating a new user
 */
export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  company: string;
}

/**
 * Firestore collection name for users
 */
export const USER_COLLECTION = 'users';

/**
 * Convert a Firestore document to a User object
 * @param doc Firestore document data
 * @param id Document ID
 * @returns User object
 */
export function firestoreToUser(doc: FirebaseFirestore.DocumentData, id: string): User {
  return {
    id,
    name: doc.name || '',
    email: doc.email || '',
    password: doc.password || '',
    company: doc.company || '',
    createdAt: doc.createdAt?.toDate() || new Date(),
    updatedAt: doc.updatedAt?.toDate() || new Date(),
  };
}

/**
 * Convert a User object to Firestore document data
 * @param user User object
 * @returns Firestore document data
 */
export function userToFirestore(user: User): FirebaseFirestore.DocumentData {
  return {
    name: user.name,
    email: user.email,
    password: user.password,
    company: user.company,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt || new Date(),
  };
}

/**
 * Create a safe version of user without sensitive data
 * @param user User with sensitive data
 * @returns User without sensitive data
 */
export function sanitizeUser(user: User): SafeUser {
  const { password, ...safeUser } = user;
  return safeUser;
} 