# UI Lab

Supabase or sign-in can be broken while the team still needs to review product direction. These routes are isolated from Supabase and use generated mock data only.

## Routes

- `/ui-lab` - user app UI review route. It reuses the production `/community-map` visual system and swaps Supabase data for mock data.
- `/admin-lab` - operations prototype for recommendation curation, folder search, community health, moderation, and strategy notes.

## GitHub Folders

```text
app/ui-lab/            UI review page for the user app
app/admin-lab/         UI review page for the admin/operations app
lib/mock-data/         Mock users, pins, folders, communities, and recommendations
docs/ui-lab.md         This memo
```

## Mock Data

All mock content lives in:

```text
lib/mock-data/ui-lab.ts
```

Edit this file to change users, pins, folders, communities, recommendations, or admin dashboard numbers. The UI lab routes should not import `lib/supabase.ts`, `lib/remote-store.ts`, or any API route.

`/ui-lab` is intentionally close to the Supabase-connected UI. If the production Drop, pin shape, folder cards, community details, Library, or Profile UI changes, mirror that CSS/class structure here and only replace the data source with `lib/mock-data/ui-lab.ts`.

## Collaboration Flow

1. Use Vercel preview deployments from GitHub pushes to review UI with the three-person team.
2. Keep product/UI experiments inside `/ui-lab`, `/admin-lab`, and `lib/mock-data`.
3. Treat `/ui-lab` as the faithful mock-data version of the app, not a separate design proposal.
4. When a UI direction is approved, port only that piece back into the production app.
5. Supabase schema, auth, and RLS debugging can continue separately without blocking UI review.

## Why This Exists

The production app depends on Supabase auth and remote data. This lab lets the team evaluate layout, copy weight, navigation, community flows, admin tools, and visual tone without waiting for database stability.
