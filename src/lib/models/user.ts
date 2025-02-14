import { ObjectId } from 'mongodb';

export interface User {
  _id?: ObjectId;
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
  const { password, _id, ...safeUser } = user;
  return {
    ...safeUser,
    id: _id?.toString() || '',
  };
}

export const USER_COLLECTION = 'users'; 