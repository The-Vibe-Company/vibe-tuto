# Supabase Configuration

This folder contains SQL migrations for the CapTuto database.

## Running Migrations

Execute these migrations in order in the [Supabase SQL Editor](https://supabase.com/dashboard/project/ehspsyvpriznjojowqfr/sql/new):

1. `001_create_tutorials.sql` - Creates the tutorials table
2. `002_create_steps.sql` - Creates the steps table
3. `003_enable_rls.sql` - Enables Row Level Security policies
4. `004_create_storage.sql` - Creates storage buckets and policies

## Auth Configuration

In the Supabase Dashboard:
1. Go to Authentication > Providers
2. Enable Email provider (should be enabled by default)

## Environment Variables

Required in `apps/web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Storage Structure

Files should be uploaded with the user ID as the first folder:
- `recordings/{user_id}/{filename}` - Audio recordings
- `screenshots/{user_id}/{filename}` - Tutorial screenshots
