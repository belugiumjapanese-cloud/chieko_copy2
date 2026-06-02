# UI Lab

Supabase or sign-in can be broken while the team still needs to review product direction. These routes are isolated from Supabase and use generated mock data only.

## Routes

- `/ui-lab` - user app UI review route. It reuses the production `/community-map` visual system and swaps Supabase data for mock data.
- `/admin-lab` - operations prototype for recommendation curation, folder search, community health, moderation, and strategy notes.

## GitHub Folders

```text
app/ui-lab/                         UI review page for the user app
app/admin-lab/                      UI review page for the admin/operations app
lib/mock-data/ui-lab.ts             Aggregates the mock data used by /ui-lab
lib/mock-data/ui-lab/chieko.ts      Chieko's editable mock profile, pins, folders, and communities
lib/mock-data/ui-lab-types.ts       Shared mock data types
docs/ui-lab.md                      This memo
```

## Mock Data

The `/ui-lab` route reads its assembled mock content from:

```text
lib/mock-data/ui-lab.ts
```

Chieko's own editable content lives in:

```text
lib/mock-data/ui-lab/chieko.ts
```

Edit `chieko.ts` to change Chieko's profile, pins, folders, or communities without touching other teammates' mock data. The aggregate `ui-lab.ts` imports those exports and combines them with the rest of the lab data.

The UI lab routes should not import `lib/supabase.ts`, `lib/remote-store.ts`, or any API route.

`/ui-lab` is intentionally close to the Supabase-connected UI. If the production Drop, pin shape, folder cards, community details, Library, or Profile UI changes, mirror that CSS/class structure here and only replace the data source with mock data.

## Collaboration Flow

1. Use Vercel preview deployments from GitHub pushes to review UI with the three-person team.
2. Keep product/UI experiments inside `/ui-lab`, `/admin-lab`, and `lib/mock-data`.
3. Put teammate-specific mock edits in separate files under `lib/mock-data/ui-lab/` when possible.
4. Treat `/ui-lab` as the faithful mock-data version of the app, not a separate design proposal.
5. When a UI direction is approved, port only that piece back into the production app.
6. Supabase schema, auth, and RLS debugging can continue separately without blocking UI review.

## Why This Exists

The production app depends on Supabase auth and remote data. This lab lets the team evaluate layout, copy weight, navigation, community flows, admin tools, and visual tone without waiting for database stability.
