# Firestore Configuration and Utilities

This directory contains the Firestore configuration and utility files for the SynDataGen project. These utilities are designed to help with configuring, backing up, monitoring, and optimizing Firestore usage.

## Directory Structure

```
firestore/
├── config/                     # Firestore configuration files
│   ├── firestore.rules         # Security rules for Firestore
│   └── firestore.indexes.json  # Index configurations
├── backup.ts                   # Backup and restore utilities
├── backup-cli.ts               # Command-line interface for backup operations
├── cost.ts                     # Cost analysis and estimation utilities
└── README.md                   # This file
```

## Security Rules

The `config/firestore.rules` file contains the security rules for controlling access to Firestore collections. The rules implement a role-based access control system that restricts access based on user authentication and roles.

Key features:
- Authentication validation
- Role-based access control
- Collection-specific access rules
- Document-level security

To deploy the security rules:

```bash
npm run firestore:deploy-rules
```

## Indexes

The `config/firestore.indexes.json` file contains the index configurations required for efficient querying of Firestore collections. These indexes are designed based on the common query patterns used in the application.

To deploy the indexes:

```bash
npm run firestore:deploy-indexes
```

## Backup and Restore

The `backup.ts` file provides utilities for backing up and restoring Firestore data. It includes functions for:

- Creating complete Firestore backups to Cloud Storage
- Restoring from backups
- Exporting collections to JSON
- Importing JSON data to collections
- Listing available backups

The `backup-cli.ts` file provides a command-line interface for these operations. Available commands:

```bash
# Create a backup
npm run backup:firestore

# Restore from a backup
npm run restore:firestore

# List available backups
ts-node src/lib/gcp/firestore/backup-cli.ts list

# Export a collection to JSON
ts-node src/lib/gcp/firestore/backup-cli.ts export --file=data.json --collections=customers

# Import JSON data to a collection
ts-node src/lib/gcp/firestore/backup-cli.ts import --file=data.json --collections=customers
```

## Monitoring and Cost Analysis

The `../monitoring.ts` and `cost.ts` files provide utilities for monitoring Firestore usage and analyzing costs:

### Monitoring Features:
- Real-time metrics for read, write, and delete operations
- Connection monitoring
- Storage usage tracking
- Alerting policies for various thresholds
- Dashboard creation

### Cost Analysis Features:
- Cost estimation based on usage metrics
- Projected cost calculations
- Budget alerts
- Cost optimization recommendations

## Local Development with Firebase Emulators

For local development, you can use Firebase emulators to simulate Firestore:

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Start the emulators:
```bash
firebase emulators:start
```

3. Configure your application to use the emulator:
```typescript
// In your Firestore initialization code
if (process.env.NODE_ENV === 'development') {
  connectFirestoreEmulator(db, 'localhost', 8080);
}
```

## Environment Variables

The following environment variables are used by the Firestore utilities:

| Variable | Description | Default Value |
|----------|-------------|---------------|
| GCP_PROJECT_ID | Google Cloud Project ID | - |
| GOOGLE_APPLICATION_CREDENTIALS | Path to service account key file | - |
| FIREBASE_CLIENT_EMAIL | Firebase service account email | - |
| FIREBASE_PRIVATE_KEY | Firebase service account private key | - |
| GCP_BACKUP_BUCKET | Cloud Storage bucket for backups | {project-id}-firestore-backups |
| BACKUP_DEFAULT_COLLECTIONS | Default collections to backup | customers,waitlist,projects,dataGenerationJobs |
| BACKUP_RETENTION_DAYS | Number of days to retain backups | 30 |
| ENABLE_FIRESTORE_MONITORING | Enable Firestore monitoring | true |
| ALERT_NOTIFICATION_EMAIL | Email for alerts | - |
| FIRESTORE_READ_ALERT_THRESHOLD | Read operations threshold | 5000 |
| FIRESTORE_WRITE_ALERT_THRESHOLD | Write operations threshold | 1000 |
| FIRESTORE_STORAGE_ALERT_THRESHOLD_GB | Storage threshold in GB | 5 |
| FIRESTORE_CONNECTION_ALERT_THRESHOLD | Connection count threshold | 100 |
| FIRESTORE_BUDGET_AMOUNT | Monthly budget in USD | 100 |
| FIRESTORE_BUDGET_ALERT_THRESHOLDS | Budget alert percentages | 50,80,100 |
| COST_GROWTH_FACTOR | Growth factor for cost projections | 1.1 |

See `.env.example` for all environment variables used in the project.

## Usage Examples

### Initializing Firestore

```typescript
import { initializeFirestore } from '../firestore/initFirestore';

const db = initializeFirestore();
```

### Creating a Backup

```typescript
import { createFirestoreBackup } from '../firestore/backup';

async function createBackup() {
  const backupUri = await createFirestoreBackup({
    bucketName: 'my-backup-bucket',
    collectionIds: ['customers', 'waitlist'],
    backupPrefix: 'weekly-backup'
  });
  
  console.log(`Backup created at: ${backupUri}`);
}
```

### Getting Cost Estimates

```typescript
import { estimateProjectedCosts } from '../firestore/cost';

async function getCostEstimate() {
  const costBreakdown = await estimateProjectedCosts(30, 1.2);
  
  console.log(`Estimated monthly cost: $${costBreakdown.totalCost.toFixed(2)}`);
  console.log(`Read operations cost: $${costBreakdown.readCost.toFixed(2)}`);
  console.log(`Write operations cost: $${costBreakdown.writeCost.toFixed(2)}`);
  console.log(`Storage cost: $${costBreakdown.storageCost.toFixed(2)}`);
}
```

### Setting Up Alerts

```typescript
import { setupStandardFirestoreAlerts } from '../monitoring';

async function setupAlerts() {
  const notificationChannels = [
    'projects/my-project/notificationChannels/my-channel-id'
  ];
  
  const policyIds = await setupStandardFirestoreAlerts(notificationChannels);
  console.log(`Created alert policies: ${policyIds.join(', ')}`);
}
``` 