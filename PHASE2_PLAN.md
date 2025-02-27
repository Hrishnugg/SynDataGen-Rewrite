# Phase 2: Customer and Service Account Management

## Overview

After successfully completing the migration from MongoDB to Firestore and optimizing the Firestore implementation, we're now ready to begin Phase 2 of the SynDataGen project upgrade. This phase focuses on enhancing the customer data model and implementing robust service account management capabilities.

## Goals

1. Enhance the customer data model with additional fields and capabilities
2. Implement GCP service account creation and management for customers
3. Build a secure key storage and retrieval system
4. Create an admin interface for customer management
5. Add monitoring and logging for service account activities

## Project Status

- ✅ **Phase 1: MongoDB to Firestore Migration** - Complete
  - ✅ Data models migrated to Firestore
  - ✅ Application updated to use Firestore
  - ✅ Performance optimized with caching, pagination, and field selection

- 🔄 **Phase 2: Customer and Service Account Management** - Current Phase
  - [✅] Enhanced customer data model
  - [🔄] Service account creation and management
  - [🔄] Secure key storage
  - [ ] Admin interface
  - [✅] Monitoring and logging

- ⏳ **Future Phases**
  - Phase 3: Project and Storage Bucket Management
  - Phase 4: Data Generation Job Integration
  - Phase 5: Advanced Features and Optimization

## Detailed Tasks

### 1. Enhance Customer Data Model and API

#### Data Model Enhancements

- [✅] Add `billingTier` field to customer model
- [✅] Add `usageStatistics` tracking
- [✅] Implement `contactInfo` with multiple contacts
- [✅] Add `subscriptionDetails` with plan information
- [✅] Create `auditLog` subcollection for tracking changes

```typescript
// Enhanced Customer model
interface EnhancedCustomer extends Customer {
  billingTier: 'free' | 'basic' | 'professional' | 'enterprise';
  usageStatistics: {
    lastLoginDate: Date;
    totalProjects: number;
    totalDataGenerated: number;
    apiRequestsThisMonth: number;
  };
  contactInfo: {
    primary: {
      name: string;
      email: string;
      phone?: string;
    };
    billing?: {
      name: string;
      email: string;
      phone?: string;
    };
    technical?: {
      name: string;
      email: string;
      phone?: string;
    };
  };
  subscriptionDetails?: {
    planId: string;
    startDate: Date;
    renewalDate: Date;
    autoRenew: boolean;
    paymentMethod?: string;
  };
}
```

#### API Endpoints

- [✅] Update `/api/customers` endpoints to support new fields
- [✅] Create `/api/customers/[id]/usage` endpoint for usage statistics
- [✅] Implement `/api/customers/[id]/subscription` for subscription management
- [✅] Add `/api/customers/[id]/audit-log` for change history

### 2. Implement GCP Service Account Management

#### Service Account Creation

- [✅] Implement `createServiceAccount` function with proper IAM roles
- [✅] Add support for custom role assignments based on customer tier
- [✅] Create naming convention for service accounts (customer-specific)
- [✅] Implement permission boundary configuration

#### Permission Management

- [✅] Create pre-defined role templates for different customer tiers
- [✅] Implement permission update functionality
- [✅] Add permission verification system
- [✅] Create regular permission audit mechanism

#### Service Account Lifecycle Management

- [✅] Implement service account deletion and cleanup process
- [✅] Add service account key rotation capability
- [✅] Create service account key retrieval system
- [ ] Implement service account suspension for delinquent customers
- [ ] Add service account restoration capability
- [ ] Implement service account migration between projects

### 3. Build Secure Key Storage and Management

#### Secret Manager Integration

- [✅] Create standardized key naming convention
- [✅] Implement encrypted key storage in Secret Manager
- [✅] Add key metadata tracking
- [✅] Create secure key retrieval system with proper authentication

#### Key Rotation

- [✅] Implement automatic key rotation schedule
- [✅] Create manual key rotation capability
- [✅] Add key version tracking
- [✅] Implement key usage audit logging

#### Access Control

- [✅] Create role-based access to keys
- [✅] Implement time-limited access tokens
- [ ] Add IP-based restrictions for key access
- [✅] Create comprehensive access logs

### 4. Create Admin Interface for Customer Management

#### Customer Dashboard

- [ ] Build customer listing page with filtering and sorting
- [ ] Create detailed customer profile view
- [ ] Implement customer status management UI
- [ ] Add customer metrics visualization

#### Service Account Management UI

- [ ] Create service account creation interface
- [ ] Build permission management dashboard
- [ ] Implement key rotation and management UI
- [ ] Add service account activity timeline

#### Administrative Tools

- [ ] Create customer impersonation for support purposes
- [ ] Build bulk operations interface
- [ ] Implement customer export functionality
- [ ] Add custom notification configuration

### 5. Add Monitoring and Logging

#### Activity Logging

- [✅] Implement detailed action logging for all service account activities
- [✅] Create standardized log format
- [✅] Add contextual information to logs
- [✅] Implement log retention policies

#### Monitoring Dashboard

- [ ] Create real-time service account activity dashboard
- [ ] Build customer usage monitoring
- [ ] Implement alert configuration
- [ ] Add predictive analytics for usage patterns

#### Alerting System

- [ ] Create alerts for suspicious service account activities
- [ ] Implement quota approaching notifications
- [ ] Add compliance-related alerts
- [ ] Create escalation procedures

## Implementation Approach

1. **Week 1-2: Design and Planning**
   - [✅] Finalize data model enhancements
   - [✅] Design service account management architecture
   - [✅] Plan security model for key management
   - [ ] Create UI wireframes

2. **Week 3-4: Core Implementation**
   - [✅] Enhance customer data model
   - [✅] Implement customer API endpoints
   - [✅] Implement basic service account creation
   - [✅] Create Secret Manager integration
   - [ ] Build initial admin interface components

3. **Week 5-6: Advanced Features**
   - [🔄] Implement key rotation mechanism
   - [✅] Add permission management
   - [ ] Create monitoring dashboard
   - [✅] Build activity logging system

4. **Week 7-8: Testing and Refinement**
   - [ ] Conduct security review
   - [ ] Perform performance testing
   - [ ] Refine user interface
   - [ ] Fix identified issues

## Success Criteria

1. [✅] Enhanced customer data model fully implemented
2. [🔄] Service accounts can be created, managed, and deleted
3. [✅] Keys are securely stored and can be rotated
4. [ ] Admin interface provides complete customer management
5. [✅] Comprehensive monitoring and logging in place
6. [ ] All functions are properly tested and documented

## Resources Required

1. Access to GCP IAM and Secret Manager APIs
2. Firebase Admin SDK with Firestore access
3. UI component library for admin interface
4. Team member with GCP IAM expertise
5. Security review resources 