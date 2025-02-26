# Firestore Migration Completion Guide

This document provides step-by-step instructions for completing the migration from MongoDB to Firestore.

## Migration Tools

The following tools and scripts are available to help with the migration process:

### 1. Migration Scripts
- `npm run migrate`: Run the full migration of all collections from MongoDB to Firestore
- `npm run migrate:customers`: Migrate only customer data
- `npm run migrate:waitlist`: Migrate only waitlist submissions
- `npm run migrate:dry-run`: Perform a dry run of the migration without making changes

### 2. Testing Scripts
- `npm run test:firestore-api`: Test the API endpoints with Firestore
- `npm run firestore:test`: Test the Firestore connection
- `npm run firestore:create-test-data`: Create test data in Firestore

### 3. Migration Control
- `npm run migration-control status`: Show current database backend configuration
- `npm run migration-control use <collection> <backend>`: Set database backend for a collection
- `npm run migration-control gcp enable|disable`: Enable or disable GCP features
- `npm run migration-control dual-write`: Enable dual-write mode for specified collections

### 4. Backup and Restore
- `npm run backup:firestore`: Backup Firestore data
- `npm run restore:firestore`: Restore Firestore data from a backup

## Recommended Migration Approach

Follow this phased approach to safely complete the migration:

### Phase 1: Test and Validation (Complete)
- ✅ Create test data in both MongoDB and Firestore
- ✅ Set up monitoring for Firestore operations
- ✅ Test API endpoints with Firestore
- ✅ Implement feature flags for gradual rollout

### Phase 2: Gradual Deployment (Current Stage)
1. Use dual-write mode for each collection, one at a time:
   ```
   npm run migration-control dual-write -c waitlist -p
   ```

2. Verify data consistency between MongoDB and Firestore for this collection.

3. After a successful period in dual-write mode, switch to Firestore-only:
   ```
   npm run migration-control use waitlist firestore -p
   ```

4. Repeat steps 1-3 for each collection, working through them in this order:
   - waitlist (least critical)
   - projects
   - dataGenerationJobs
   - customers (most critical)

### Phase 3: Final Cutover
1. Once all collections are using Firestore, enable GCP features globally:
   ```
   npm run migration-control gcp enable -p
   ```

2. Create a full backup of both databases:
   ```
   npm run backup:firestore
   # Also backup MongoDB using your preferred method
   ```

3. Update your application code to remove MongoDB-specific code.

4. Deploy the updated application.

## Monitoring During Migration

Monitor these metrics during the migration:

1. Firestore performance metrics:
   ```
   GET /api/monitoring/firestore
   ```

2. API response times (for both MongoDB and Firestore backends).

3. Error rates in logs and monitoring dashboards.

4. Database operation counts and latencies.

## Rollback Procedure

If issues are detected with Firestore, rollback to MongoDB:

1. Switch all collections back to MongoDB:
   ```
   npm run migration-control use all mongodb -p
   ```

2. Disable GCP features:
   ```
   npm run migration-control gcp disable -p
   ```

3. Restart the application to apply changes.

4. Investigate and fix the issue before attempting the migration again.

## Data Validation

Validate data integrity between MongoDB and Firestore:

1. Check document counts in both databases for each collection.

2. Validate field mappings and data types.

3. Run application tests with both backends to ensure feature parity.

## Final Checks Before Decommissioning MongoDB

Before decommissioning MongoDB, verify:

1. All API endpoints work correctly with Firestore.

2. All features are functioning as expected.

3. Performance metrics are within acceptable ranges.

4. Multiple backups of MongoDB data have been created and stored securely.

5. The application has been running on Firestore-only for at least one week without issues.

## Post-Migration Optimization

After migration is complete:

1. Optimize Firestore indexes for common queries.

2. Implement caching strategies for frequently accessed data.

3. Configure Firestore security rules for added protection.

4. Set up automatic backups of Firestore data. 