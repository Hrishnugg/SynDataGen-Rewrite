import { ObjectId } from 'mongodb';

export const PROJECT_COLLECTION = 'projects';

export interface TeamMember {
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  addedAt: Date;
  addedBy: string;
}

export interface Project {
  _id?: ObjectId;
  name: string;
  description: string;
  ownerId: string;
  teamMembers: TeamMember[];
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'archived';
  storageConfig: {
    bucketName: string;
    region: string;
  };
  settings: {
    dataRetentionDays: number;
    maxStorageGB: number;
  };
  metadata: Record<string, any>;
}

export interface CreateProjectInput {
  name: string;
  description: string;
  ownerId: string;
  region?: string;
  settings?: {
    dataRetentionDays?: number;
    maxStorageGB?: number;
  };
}

export const DEFAULT_PROJECT_SETTINGS = {
  dataRetentionDays: 30,
  maxStorageGB: 50
}; 