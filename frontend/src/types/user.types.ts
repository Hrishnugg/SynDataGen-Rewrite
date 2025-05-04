export interface User {
    id: string;
    name: string;
    email: string;
    company: string;
    createdAt: string; // ISO Date string
    updatedAt: string; // ISO Date string
  }
  
  export type RegisterRequest = Omit<User, 'id' | 'createdAt' | 'updatedAt'> & { password: string };
  export type LoginRequest = Pick<User, 'email'> & { password: string };
  
  export interface LoginResponse {
    user: User;
    // token?: string; // Assuming cookie-based, so no token expected here
  } 