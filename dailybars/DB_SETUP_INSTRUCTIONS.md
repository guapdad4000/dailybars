# Database Setup Guide

The "relation 'users' does not exist" error occurs because your Supabase database is missing the required tables.

## 🚀 How to Fix

1. **Go to your Supabase Dashboard**
   - Open your project: `https://app.supabase.com/project/tilpgwoyyervbgdlucap` (or your project ID)
   - Go to the **SQL Editor** (sidebar icon)

2. **Run the Setup Script**
   - Click **"New Query"**
   - Copy the ENTIRE content of `dailybars/complete_db_setup.sql`
   - Paste it into the editor
   - Click **"Run"** (bottom right)

3. **Verify**
   - The output should say "Success" or "No rows returned".
   - Refresh your app. The error will be gone.

## What this script does
- Creates all missing tables (`users`, `bars`, `songs`, `scratch_sessions`, etc.)
- Sets up Row Level Security (RLS) so the app can access data
- Seeds default data so you can start immediately
- Fixes foreign key relationships between tables

**Note:** This script is safe to run multiple times. It uses `IF NOT EXISTS` to avoid overwriting existing data.
