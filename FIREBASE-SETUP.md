# Firebase Setup Guide

This guide explains how to set up Firebase credentials for the SynDataGen application.

## Option 1: Using Service Account Credentials in Environment Variables

1. **Create a Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or select an existing one

2. **Generate Service Account Keys**:
   - In the Firebase Console, go to Project Settings
   - Select the "Service accounts" tab
   - Click "Generate new private key" button
   - Download the JSON file

3. **Set Environment Variables**:
   - Open the downloaded JSON file
   - Copy the values into your `.env` file using this format:
   ```
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Private Key Here\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
   ```
   
   Note: Make sure to include the quotes around the private key and preserve the `\n` characters.

## Option 2: Using a Service Account JSON File

1. **Follow steps 1-2 from Option 1** to get your service account JSON file

2. **Place the JSON file in a secure location**:
   - Save the JSON file somewhere in your project (e.g., `./firebase-service-account.json`)
   - Make sure this file is in `.gitignore` to prevent committing it to version control

3. **Set the GOOGLE_APPLICATION_CREDENTIALS environment variable**:
   - Add to your `.env` file:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json
   ```
   - Use an absolute path or a relative path from your project root

## Option 3: Using Application Default Credentials

For development on a machine where you've authenticated with the Google Cloud SDK:

1. **Install the [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)**

2. **Login and set your default project**:
   ```bash
   gcloud auth application-default login
   gcloud config set project YOUR_PROJECT_ID
   ```

3. **No need to set any environment variables** - the application will use the credentials from your Google Cloud SDK login

## Troubleshooting

If you encounter Firebase initialization errors:

1. **Check your credentials**:
   - Make sure the environment variables are set correctly
   - Verify that the private key is properly formatted with `\n` characters
   - Check that the service account has the necessary permissions

2. **Verify your Firestore database exists**:
   - Make sure you've created a Firestore database in your Firebase project
   - Check that the security rules allow your operations

3. **Check for other environment issues**:
   - Make sure your `.env` file is being loaded correctly
   - Restart your application after making changes to environment variables

4. **Development Mode Fallback**:
   - In development mode, the application will fall back to mock data if Firebase credentials are missing
   - This allows you to develop the UI without a working Firebase connection

## Security Notes

- **Never commit service account keys** to version control
- Use environment variables or secure secret management in production
- Consider using more restricted service accounts with only the permissions they need
- Rotate service account keys periodically for better security 