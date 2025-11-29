# Google Authentication Setup Guide

This guide will walk you through setting up Google OAuth authentication for your Pet Accounting app.

## Step 1: Create Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a New Project (or select existing)**
   - Click the project dropdown at the top
   - Click "New Project"
   - Enter project name: "Pet Accounting App" (or any name you prefer)
   - Click "Create"

3. **Enable Google+ API**
   - In the left sidebar, go to "APIs & Services" > "Library"
   - Search for "Google+ API" or "People API"
   - Click on it and click "Enable"

4. **Configure OAuth Consent Screen**
   - Go to "APIs & Services" > "OAuth consent screen"
   - Choose "External" (unless you have a Google Workspace account)
   - Click "Create"
   - Fill in the required information:
     - **App name**: Pet Accounting App
     - **User support email**: Your email
     - **Developer contact information**: Your email
   - Click "Save and Continue"
   - On "Scopes" page, click "Save and Continue"
   - On "Test users" page, you can add test users (optional for development)
   - Click "Save and Continue"
   - Review and click "Back to Dashboard"

5. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application" as the application type
   - Give it a name: "Pet Accounting Web Client"
   - **Authorized JavaScript origins**:
     - Add: `http://localhost:3000` (for development)
     - Add your production URL when deploying (e.g., `https://yourdomain.com`)
   - **Authorized redirect URIs**:
     - Add: `http://localhost:3000/api/auth/callback/google` (for development)
     - Add your production callback URL when deploying (e.g., `https://yourdomain.com/api/auth/callback/google`)
   - Click "Create"
   - **IMPORTANT**: Copy the **Client ID** and **Client Secret** - you'll need these in the next step!

## Step 2: Add Environment Variables

1. **Open or create `.env.local` file** in your project root

2. **Add the following variables**:

```env
# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

3. **Generate NEXTAUTH_SECRET** (if you don't have one):
   - Run this command in your terminal:
   ```bash
   openssl rand -base64 32
   ```
   - Copy the output and use it as your `NEXTAUTH_SECRET`

4. **Replace the placeholders**:
   - Replace `your-google-client-id.apps.googleusercontent.com` with your actual Google Client ID
   - Replace `your-google-client-secret` with your actual Google Client Secret
   - Replace `your-secret-key-here` with your generated secret

## Step 3: Verify Installation

The code has already been updated with:
- ✅ Google provider added to `lib/auth-options.ts`
- ✅ Google sign-in button added to sign-in page
- ✅ OAuth callback handling configured

## Step 4: Test Google Authentication

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Navigate to the sign-in page**: `http://localhost:3000/auth/signin`

3. **Click "Continue with Google"** button

4. **Sign in with your Google account**

5. **Authorize the application** when prompted

6. **You should be redirected to the dashboard** after successful authentication

## Troubleshooting

### Issue: "redirect_uri_mismatch" error
- **Solution**: Make sure the redirect URI in Google Cloud Console exactly matches: `http://localhost:3000/api/auth/callback/google`
- Check for trailing slashes or typos

### Issue: "Invalid client" error
- **Solution**: Verify that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local` are correct
- Make sure there are no extra spaces or quotes

### Issue: User not being created in database
- **Solution**: Check the server console for errors
- Verify that Prisma is properly configured and the database is accessible

### Issue: "Access blocked: This app's request is invalid"
- **Solution**: 
  - Make sure OAuth consent screen is properly configured
  - If in testing mode, add your email as a test user
  - For production, you'll need to verify your app with Google

## Production Deployment

When deploying to production:

1. **Update Google Cloud Console**:
   - Add your production domain to "Authorized JavaScript origins"
   - Add your production callback URL to "Authorized redirect URIs"
   - Example: `https://yourdomain.com/api/auth/callback/google`

2. **Update environment variables** on your hosting platform:
   - Set `NEXTAUTH_URL` to your production URL
   - Keep `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` the same (or create new ones for production)

3. **Submit for verification** (if needed):
   - If your app will be used by many users, you may need to submit it for Google's verification process
   - This is required if you request sensitive scopes

## Additional Notes

- The app supports both Google OAuth and email-based authentication (for development)
- Users can choose either method to sign in
- Google sign-in will automatically create a user account if one doesn't exist
- User information (name, email, profile picture) will be synced from Google

