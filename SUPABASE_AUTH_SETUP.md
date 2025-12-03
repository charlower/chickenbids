# Supabase Phone Auth Setup

## ✅ Code Integration Complete!

Your auth modals are now wired up to Supabase. Before testing, you need to configure Supabase:

---

## Step 1: Enable Phone Auth

1. Go to your Supabase project
2. Navigate to **Authentication** → **Providers**
3. Find **Phone** provider
4. Toggle it **ON**

---

## Step 2: Configure SMS Provider

Supabase supports multiple SMS providers. For Australia, recommended:

### **Option A: Twilio (Recommended)**

1. Go to https://www.twilio.com/
2. Sign up and get:
   - Account SID
   - Auth Token
   - Twilio phone number (with AU SMS capability)
3. In Supabase → **Authentication** → **Providers** → **Phone**:
   - Select "Twilio"
   - Enter Account SID
   - Enter Auth Token
   - Enter Twilio phone number
4. Click **Save**

### **Option B: MessageBird**

Similar setup, good AU coverage

### **Option C: Test Mode (Development)**

Supabase has a test mode that shows OTP in console (no real SMS sent)

- Good for development
- Switch to real provider for production

---

## Step 3: Test the Flow

### **Register Flow:**

1. Click "REGISTER"
2. Fill form: username, email, phone (04XX XXX XXX)
3. Click "SEND VERIFICATION CODE"
4. Check your phone for SMS (or console if test mode)
5. Enter 6-digit OTP
6. Should redirect and show "LOGIN SUCCESSFUL"

### **Login Flow:**

1. Click "LOGIN"
2. Enter phone number
3. Click "SEND LOGIN CODE"
4. Enter OTP
5. Should redirect and show "LOGIN SUCCESSFUL"

---

## Step 4: Configure Phone Settings

In **Authentication** → **Phone**:

- **OTP expiry**: 60 seconds (default)
- **OTP length**: 6 digits (default)
- **Rate limiting**: Enable to prevent abuse
- **Allowed phone numbers** (dev): Add your test numbers

---

## What Happens Behind the Scenes:

1. **Register**: `signUp()` → Creates auth.users + sends OTP
2. **Verify**: `verifyOtp()` → Validates code + creates profile
3. **Login**: `signInWithOtp()` → Sends OTP to existing user
4. **Verify**: `verifyOtp()` → Logs user in

---

## Next Steps After Auth Works:

1. Listen for auth state changes on page load
2. Fetch user profile from `profiles` table
3. Display user data in Player Stats
4. Handle logout properly
5. Sync credits/XP from database

---

## Troubleshooting:

### "SMS not sent"

- Check Twilio credits
- Verify phone number format (+61...)
- Check Supabase logs (Authentication → Logs)

### "Invalid OTP"

- Check if code expired (60s)
- Verify correct phone number
- Try resend

### "Username taken"

- Already checked before signUp
- If error persists, username exists in profiles table

### "Profile creation failed"

- Check RLS policies on profiles table
- Verify user has insert permission
- Check Supabase logs

---

## Development vs Production:

**Development:**

- Use test mode or test phone numbers
- Logs show OTP in console
- No SMS costs

**Production:**

- Use real SMS provider
- Enable rate limiting
- Monitor SMS costs
- Set up proper error handling
