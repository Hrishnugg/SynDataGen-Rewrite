import { Role } from './role.types';

export interface ProjectSettings {
    dataRetentionDays: number;
    maxStorageGB: number;
}

export interface ProjectStorage {
    bucketName: string;
    region: string;
    usedStorageBytes?: number; // Optional/readonly
    bucketURI?: string; 
}

export interface Project {
    id: string;
    name: string;
    description: string;
    status: 'active' | 'archived';
    settings: ProjectSettings;
    storage: ProjectStorage;
    teamMembers: { [userId: string]: Role }; // Map of User ID -> Role
    createdAt: string; // ISO Date string
    updatedAt: string; // ISO Date string
}

// Request/Response types
export interface CreateProjectRequest {
    name: string;
    description: string;
    settings: ProjectSettings;
}

// Use Partial for PATCH updates
export type UpdateProjectRequest = Partial<{
    name: string;
    description: string;
    settings: ProjectSettings;
    status: 'active' | 'archived';
}>;

export interface ListProjectsParams {
    status?: 'active' | 'archived';
    limit?: number;
    offset?: number;
}

export interface ListProjectsResponse {
    projects: Project[];
    total: number;
    limit: number;
    offset: number;
}

export interface InviteMemberRequest {
    userId: string;
    role: 'admin' | 'member' | 'viewer'; // Can only invite as these roles
}

export interface UpdateMemberRoleRequest {
    role: 'admin' | 'member' | 'viewer'; // Can only update to these roles
} 