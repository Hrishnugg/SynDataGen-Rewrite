# MongoDB to Firestore Migration Scripts

These scripts facilitate the migration of data from MongoDB to Google Cloud Firestore as part of the SynDataGen platform upgrade.

## Setup

Before running the migration scripts, ensure:

1. You have the required environment variables set:
   - `MONGODB_URI`: MongoDB connection string
   - `MONGODB_DB_NAME`: MongoDB database name
   - `GOOGLE_APPLICATION_CREDENTIALS`: Path to GCP service account key file
   - `GOOGLE_CLOUD_PROJECT` or `GCP_PROJECT`: Google Cloud project ID

2. Dependencies are installed:
   ```
   npm install mongodb firebase-admin dotenv
   ```

## Available Migration Scripts

### 1. Main Migration Script

Orchestrates the migration of all data types and provides a summary.

```bash
# Run all migrations
npx ts-node src/scripts/migration/migrateAll.ts

# Run specific migrations
npx ts-node src/scripts/migration/migrateAll.ts --customers --waitlist

# Dry run (doesn't actually write data)
npx ts-node src/scripts/migration/migrateAll.ts --dry-run
```

### 2. Customer Migration

Migrates customer data from MongoDB to Firestore.

```bash
npx ts-node src/scripts/migration/migrateCustomers.ts
```

This script:
- Extracts customer data from MongoDB
- Transforms it to match the Firestore schema
- Creates GCP service accounts for customers if needed
- Loads the data into Firestore
- Verifies the migration results

### 3. Waitlist Migration

Migrates waitlist submissions from MongoDB to Firestore.

```bash
npx ts-node src/scripts/migration/migrateWaitlist.ts
```

This script:
- Extracts waitlist submission data from MongoDB
- Transforms it to match the Firestore schema
- Loads the data into Firestore
- Verifies the migration results

## Logging

All migration scripts generate detailed logs in the `logs/` directory at the project root. Each log file is named with the migration type and timestamp.

## Verification

Each migration script includes validation and verification steps:
1. Data validation during transformation
2. Document count verification
3. Sample data validation
4. Detailed logging of results

## Error Handling

The scripts implement robust error handling:
- Individual document errors don't halt the entire migration
- Batch processing with proper error tracking
- Detailed error logging
- Clean connection closure even on failures

## Migration Order

The recommended migration order is:

1. **Customers** (First, as other data depends on customer service accounts)
2. **Waitlist Submissions** (Independent data, can be migrated anytime)
3. **Projects** (Depends on customer data)
4. **Data Generation Jobs** (Depends on project data)

## Post-Migration

After successful migration:
1. Verify data integrity in Firestore
2. Update application code to use Firestore instead of MongoDB
3. Run application tests with the migrated data
4. Consider keeping MongoDB as a read-only backup initially 