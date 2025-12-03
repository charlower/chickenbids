# Supabase Password Configuration

## Configure Password Requirements

Go to your Supabase project and update password settings:

1. **Supabase Dashboard** → **Authentication** → **Policies**
2. Find **"Password Requirements"** section
3. Set:
   - **Minimum password length**: `6`
   - **Password requirements**: Select **"Letters and numbers"**
4. **Save**

This matches our frontend validation:

- ✅ Min 6 characters
- ✅ Must contain letters (a-z, A-Z)
- ✅ Must contain numbers (0-9)

---

## Example Valid Passwords:

- `player123`
- `Charlie99`
- `abc123def`

## Invalid Passwords:

- `abc` (too short)
- `123456` (no letters)
- `abcdef` (no numbers)
