# Firebase Authentication Setup Guide

This guide explains how to set up Firebase authentication for both local development and production deployment on Vercel.

## Local Development Setup

### Option 1: Using the Setup Script (Recommended)

1. **Get your Firebase service account file**:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save the JSON file to your local machine

2. **Place the service account file in your project**:
   - Create a `credentials` directory in your project root (if it doesn't exist)
   - Copy the JSON file into this directory (it can have any name)

3. **Run the setup script**:
   ```bash
   # Install dotenv if you don't have it
   npm install dotenv --save-dev
   
   # Run the setup script
   node scripts/setup-firebase-env.js
   ```

4. **Verify the setup**:
   ```bash
   node scripts/verify-firebase-env.js
   ```

5. **Start your development server**:
   ```bash
   npm run dev
   ```

### Option 2: Manual Setup

1. **Create a `.env.local` file** in your project root with the following content:
   ```
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=your-client-email@example.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Private Key Content\n-----END PRIVATE KEY-----"
   FORCE_REAL_FIRESTORE=true
   MOCK_FIREBASE=false
   USE_MOCK_DATA=false
   ```

2. **Place your service account file** in the `credentials` directory as `firebase-service-account.json`

## Production Deployment (Vercel)

When deploying to Vercel, you need to set the environment variables in the Vercel dashboard:

1. **Go to your project in the Vercel dashboard**

2. **Navigate to Settings → Environment Variables**

3. **Add the following variables**:
   - `FIREBASE_PROJECT_ID` - Your Firebase project ID
   - `FIREBASE_CLIENT_EMAIL` - Your Firebase client email
   - `FIREBASE_PRIVATE_KEY` - Your Firebase private key (with actual newlines, not `\n`)
   - `FORCE_REAL_FIRESTORE` - Set to `true`
   - `MOCK_FIREBASE` - Set to `false`
   - `USE_MOCK_DATA` - Set to `false`

4. **Important note about the private key**:
   When copying the private key to Vercel, make sure to:
   - Include the quotes around the key
   - Use actual line breaks (press Enter at the end of each line)
   - Include both the `BEGIN PRIVATE KEY` and `END PRIVATE KEY` lines

## Troubleshooting

### Private Key Issues

If you encounter issues with the private key format, there are a few common problems:

1. **Escaped newlines**: The private key should have actual newlines, not `\n` characters. Our code automatically handles this conversion.

2. **Missing quotes**: In environment variables, the private key should be surrounded by quotes.

3. **Verification**: Run `node scripts/verify-firebase-env.js` to check if your environment variables are correctly set up.

### Service Account File Not Found

If the service account file cannot be found:

1. Make sure it's in the `credentials` directory
2. The file should have one of these in its name: "firebase", "service-account", or "adminsdk"
3. Run `ls -la credentials` to check if the file exists and has the correct permissions

## Security Notes

- Never commit your service account file or `.env.local` file to Git
- The `credentials` directory and relevant JSON files are in `.gitignore` to prevent accidental commits
- For team members, share the service account file securely outside of Git (e.g., password manager, secure file sharing) 