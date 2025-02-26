/**
 * User Model
 * 
 * User data model for the application, using string IDs for Firestore compatibility.
 */

export interface User {
  id?: string;
  name: string;
  email: string;
  password: string;
  company: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SafeUser extends Omit<User, 'password'> {
  id: string;
}

export function sanitizeUser(user: User): SafeUser {
  const { password, ...safeUser } = user;
  return {
    ...safeUser,
    id: user.id || '',
  };
}

export const USER_COLLECTION = 'users'; 