# MongoDB to Firestore Migration Guide

This documentation provides guidance on how to use the migration utilities to migrate data from MongoDB to Google Cloud Firestore as part of the upgrade plan.

## Overview

The migration process follows these key steps:

1. **Assessment**: Analyze the current MongoDB data structure (see [mongodb-assessment.md](./mongodb-assessment.md))
2. **Design**: Design the target Firestore schema (see [firestore-schema-design.md](./firestore-schema-design.md))
3. **Implementation**: Implement the migration utilities (see `/src/lib/migration/`)
4. **Testing**: Test the migration on a subset of data
5. **Execution**: Run the full migration
6. **Validation**: Verify the migrated data
7. **Switchover**: Update the application to use Firestore

## Migration Utilities

We've implemented a set of migration utilities in the `/src/lib/migration/` directory:

- `index.ts` - Main entry point for the migration process
- `types.ts` - Type definitions for the migration process
- `validation.ts` - Validation utilities for ensuring data quality
- `transformers.ts` - Functions to transform MongoDB documents to Firestore format
- `firestore.ts` - Utilities for loading data into Firestore

## Prerequisite Setup

Before running the migration, you need to:

1. Install the required dependencies:

```bash
npm install firebase-admin
```

2. Set up environment variables in `.env.local`:

```
MONGODB_URI=mongodb://your-mongodb-connection-string
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/service-account-key.json
```

3. Create a Google Cloud service account with Firestore permissions and download the key file.

## Usage Guide

### Step 1: Initialize MongoDB and Firestore Connections

```typescript
import { initMongoDB, initializeFirestore } from '../lib/migration';

async function setupConnections() {
  // Initialize MongoDB
  await initMongoDB(process.env.MONGODB_URI);
  
  // Initialize Firestore (requires firebase-admin to be installed)
  await initializeFirestore();
}
```

### Step 2: Explore MongoDB Collections

```typescript
import { listMongoCollections, getCollectionStats } from '../lib/migration';

async function exploreCollections() {
  // Get all collections
  const collections = await listMongoCollections();
  console.log('MongoDB collections:', collections);
  
  // Get stats for each collection
  for (const collection of collections) {
    const stats = await getCollectionStats(collection);
    console.log(`${collection}: ${stats.count} documents, avg size ${Math.round(stats.avgDocSize)} bytes`);
  }
}
```

### Step 3: Run Test Migration for a Single Collection

```typescript
import { migrateCollection } from '../lib/migration';

async function testMigration() {
  // Run a dry-run migration for the 'users' collection
  const stats = await migrateCollection('users', {
    query: { createdAt: { $gt: new Date('2023-01-01') } }, // Optional filter
    dryRun: true, // Don't actually write to Firestore
    validate: true // Validate documents during migration
  });
  
  console.log('Migration stats:', stats);
  
  if (stats.validationReport) {
    console.log(`Validation: ${stats.validationReport.validDocuments} valid, ${stats.validationReport.invalidDocuments} invalid`);
  }
  
  if (stats.errors.length > 0) {
    console.log('Errors encountered:', stats.errors);
  }
}
```

### Step 4: Run Full Migration

```typescript
import { migrateCollections } from '../lib/migration';

async function runFullMigration() {
  const collections = ['users', 'projects', 'waitlist', 'dataJobs'];
  
  // Run migration for all collections
  const results = await migrateCollections(collections, {
    dryRun: false, // Actually write to Firestore
    validate: true, // Validate documents during migration
    deleteSource: false // Don't delete source data yet
  });
  
  // Log results
  for (const [collection, stats] of results.entries()) {
    console.log(`${collection}: ${stats.documentsSucceeded} succeeded, ${stats.documentsFailed} failed`);
  }
}
```

### Step 5: Validation and Verification

After migration, verify that all data was correctly migrated:

```typescript
// Code for verification (to be implemented)
// This would involve querying both MongoDB and Firestore
// and comparing the results for consistency
```

## Best Practices

1. **Always run in dry-run mode first** to check for any issues without making changes.
2. **Back up your MongoDB data** before running any migration that deletes source data.
3. **Run migrations in batches** to avoid timeouts and memory issues with large datasets.
4. **Implement detailed logging** to track the migration process.
5. **Have a rollback strategy** in case the migration fails or data issues are discovered after migration.

## Troubleshooting

- **MongoDB connection issues**: Verify connection string and network access.
- **Firestore quota limits**: Be aware of Firestore's write quotas (especially on the free tier).
- **Validation failures**: Check the validation errors to identify data quality issues.
- **Document size limits**: Firestore has a 1MB document size limit; some documents may need restructuring.
- **Nested array limits**: Firestore has limitations on nested arrays; ensure your schema respects these limits.

## Next Steps After Migration

1. Update application code to use Firestore instead of MongoDB
2. Run parallel testing with both databases before switching over completely
3. Monitor application performance and make any needed optimizations
4. Decommission MongoDB once the migration is complete and verified
