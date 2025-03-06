# Firebase Setup Guide

This guide will help you properly configure Firebase credentials for the SynDataGen application.

## Prerequisites

- Node.js 14+ installed
- npm or yarn installed
- Firebase project created in the Firebase console
- Service account credentials JSON file downloaded

## Step 1: Generate Service Account Credentials

If you haven't already, follow these steps to generate your Firebase service account credentials:

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings (gear icon)
4. Navigate to the "Service accounts" tab
5. Click "Generate new private key"
6. Save the JSON file securely

## Step 2: Set up Environment Variables

There are two ways to set up Firebase credentials:

### Option 1: Use the Setup Script (Recommended)

Run the interactive setup script:

```powershell
# Make sure you're in the project root
cd C:\path\to\SynDataGen

# Run the setup script
npx ts-node scripts/setup-firebase-credentials.ts
```

The script will guide you through the process of setting up your Firebase credentials.

### Option 2: Manual Setup

Alternatively, you can manually set up the environment variables:

1. Create or edit the `.env` file in the project root
2. Add the following variables:

```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email@example.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

For the private key, make sure all newlines are properly escaped with `\n`.

## Step 3: Verify Your Setup

Run the verification script to check if your credentials are properly configured:

```powershell
# Check environment variables
npx ts-node scripts/check-firebase-env.ts

# Test actual Firestore connection
npx ts-node scripts/test-firestore-connection.ts
```

## Common Issues and Solutions

### Private Key Format Issues

The most common issue is with the private key format. If you get an error related to the private key, try:

1. Make sure the key includes the BEGIN and END markers:
   ```
   -----BEGIN PRIVATE KEY-----
   ...key content...
   -----END PRIVATE KEY-----
   ```

2. Ensure newlines are properly handled:
   - In .env files, use `\n` to represent newlines
   - If setting in PowerShell directly, use backticks:
     ```powershell
     $env:FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----`n..key..`n-----END PRIVATE KEY-----"
     ```

3. Run the key fixer utility:
   ```powershell
   # This will fix and print the correctly formatted key
   npx ts-node -e "console.log(require('./src/lib/key-fixer').fixPrivateKey(process.env.FIREBASE_PRIVATE_KEY))"
   ```

### Authentication Failed

If you get authentication errors:

1. Make sure your service account has the necessary permissions in the Firebase console
2. Verify that you're using the correct project ID
3. Check if the service account is enabled

### Using Application Default Credentials

If you prefer to use Application Default Credentials:

1. Set the path to your service account JSON file:
   ```powershell
   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"
   ```

2. Update your .env file:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=C:/path/to/service-account.json
   ```

## Switching Between Development and Production

For local development, you can use the Firebase emulator:

```powershell
# Start Firebase emulators
firebase emulators:start

# Set environment to use emulators
$env:MOCK_FIREBASE="true"
```

For production, ensure your credentials are properly set up and the `MOCK_FIREBASE` variable is either not set or set to `false`.

## Need Help?

If you're still experiencing issues, run the diagnostic script and send the output to the development team:

```powershell
npx ts-node scripts/check-firebase-env.ts > firebase-diagnostic.log
``` 