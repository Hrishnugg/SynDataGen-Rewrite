# Firebase Setup and Troubleshooting Guide

This guide provides detailed instructions for setting up Firebase credentials and troubleshooting common issues in the application.

## Table of Contents

1. [Firebase Credential Setup](#firebase-credential-setup)
2. [Environment Variables](#environment-variables)
3. [Development Environment](#development-environment)
4. [Production Environment](#production-environment)
5. [Troubleshooting](#troubleshooting)
6. [Diagnostic Tools](#diagnostic-tools)

## Firebase Credential Setup

The application requires Firebase credentials to access Firestore and other Firebase services. There are several ways to provide these credentials:

### Option 1: Base64 Encoded Service Account (Recommended for Production)

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings > Service Accounts
4. Click "Generate New Private Key"
5. Save the JSON file securely
6. Convert the JSON file to a Base64 string:
   ```bash
   # On Linux/Mac
   cat your-service-account.json | base64 -w 0
   
   # On Windows (PowerShell)
   [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Content -Raw -Path your-service-account.json)))
   ```
7. Set the `FIREBASE_SERVICE_ACCOUNT` environment variable with this Base64 string

### Option 2: Google Application Default Credentials

1. Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to the path of your service account JSON file
2. This works well for local development and Google Cloud environments

### Option 3: Local Service Account File (Development Only)

1. Place your service account JSON file in the project root directory
2. Name it `service-account.json`
3. The application will automatically detect and use this file in development

## Environment Variables

The following environment variables are used for Firebase configuration:

| Variable | Description | Required |
|----------|-------------|----------|
| `FIREBASE_SERVICE_ACCOUNT` | Base64 encoded service account JSON | One of these is required |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON file | One of these is required |
| `FIREBASE_PROJECT_ID` | Firebase project ID | Optional, read from credentials |
| `FIREBASE_EMULATOR_HOST` | Firebase emulator host (e.g., `localhost:8080`) | Optional, for development |
| `FIRESTORE_EMULATOR_HOST` | Firestore emulator host (e.g., `localhost:8080`) | Optional, for development |

## Development Environment

For local development, you have several options:

### Using Real Firebase (Recommended)

1. Set up credentials using one of the methods above
2. The application will connect to your real Firebase project

### Using Firebase Emulator

1. Install the Firebase CLI: `npm install -g firebase-tools`
2. Start the emulator: `firebase emulators:start`
3. Set the emulator environment variables:
   ```
   FIREBASE_EMULATOR_HOST=localhost:9099
   FIRESTORE_EMULATOR_HOST=localhost:8080
   ```

### Fallback Mode

If no credentials are available in development mode, the application will:
1. Log warnings about missing credentials
2. Use mock data for database operations
3. Allow you to continue development without real Firebase

## Production Environment

For production deployments:

1. Use the Base64 encoded service account method (Option 1)
2. Set the `FIREBASE_SERVICE_ACCOUNT` environment variable in your hosting platform
3. Ensure the service account has the necessary permissions
4. Verify the connection using the diagnostic endpoint

## Troubleshooting

### Common Issues

#### "Firebase credentials not found"

**Possible causes:**
- Environment variables not set correctly
- Service account file not accessible
- Base64 encoding issues

**Solutions:**
1. Verify environment variables are set correctly
2. Check file permissions if using `GOOGLE_APPLICATION_CREDENTIALS`
3. Re-encode the service account JSON if using Base64
4. Use the diagnostic endpoint to check credential status

#### "Error initializing Firebase app"

**Possible causes:**
- Invalid credentials
- Network issues
- Firebase project configuration

**Solutions:**
1. Verify the service account is valid and has correct permissions
2. Check network connectivity to Firebase
3. Ensure the Firebase project exists and is properly configured
4. Check the diagnostic endpoint for detailed error information

#### "Permission denied" errors

**Possible causes:**
- Service account lacks necessary permissions
- Security rules blocking access

**Solutions:**
1. Check Firebase security rules
2. Verify service account roles and permissions
3. Update security rules if necessary

## Diagnostic Tools

The application includes built-in diagnostic tools to help troubleshoot Firebase issues:

### Diagnostic Endpoint

Access the diagnostic endpoint at `/api/diagnostic/firebase` to get detailed information about:
- Firebase initialization status
- Credential availability
- Environment configuration
- Connection status

**Note:** This endpoint requires admin authentication.

### Logging

Enhanced logging is available for Firebase initialization:
- Check server logs for detailed initialization information
- In development, verbose logging is enabled by default
- In production, critical errors are logged

### Manual Testing

You can manually test Firebase connectivity:
1. Use the diagnostic endpoint
2. Check the application logs
3. Verify environment variables are correctly set

## Additional Resources

- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Google Cloud IAM Documentation](https://cloud.google.com/iam/docs) 