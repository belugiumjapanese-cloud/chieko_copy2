# Spot Memory Map

Mapbox、Next.js、Supabaseで作っている記憶の地図アプリです。

## Local Development

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:3000`.

## Environment Variables

Local development uses `.env.local`. Vercel uses Project Settings -> Environment Variables.

```bash
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_public_token
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
NEXT_PUBLIC_SITE_URL=https://map-omega-nine.vercel.app
```

Do not commit `.env.local`. The file is ignored by Git.

## Supabase Setup

Run these files in Supabase SQL Editor in this order:

1. `supabase/full_app_schema.sql`
2. `supabase/app_support_after_full_schema.sql`

The app intentionally does not ship with sample users, sample posts, or demo folders. Empty Supabase tables mean the UI starts empty, then fills as users create accounts, add memories, save pins, comment, and like posts.

## Deploy

If this repository is connected to Vercel, pushing to GitHub triggers a Vercel deployment automatically.
