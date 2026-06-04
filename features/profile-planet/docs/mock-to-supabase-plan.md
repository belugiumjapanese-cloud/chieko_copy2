# Profile Planet Mock to Supabase Plan

This note documents how the isolated Profile Planet experiment can move from local mock data to Supabase later.

No Supabase connection is used by the experiment right now. Do not run this as SQL. Treat this as a planning document only.

## Current Mock Data Structure

The experiment currently uses local mock data from `features/profile-planet/data/mockMapData.ts`.

### `mockThemes`

`mockThemes` stores local preset `UserMapTheme` objects.

Each theme currently includes:

- `oceanColor`
- `landColor`
- `backgroundColor`
- `atmosphereColor`
- `pinColor`
- `roadColor`
- `buildingColor`
- `labelColor`

These colors are shared by the Three.js globe and the isolated Mapbox preview.

### `mockPins`

`mockPins` stores local `MapPin` objects.

Each pin currently includes:

- `id`
- `title`
- `description`
- `lat`
- `lng`
- `folderId`
- `imageUrl`
- `imageAlt`
- `tags`
- `createdAt`

The same latitude and longitude values are used by both the globe and Mapbox preview.

### `mockFolders`

`mockFolders` stores local `MapFolder` objects.

Each folder currently includes:

- `id`
- `name`
- `description`
- `centerLat`
- `centerLng`
- `zoom`
- `pinIds`
- `coverImageUrl`
- `coverImageAlt`

Folder selection highlights matching globe pins and prepares a Mapbox `flyTo` target.

## Future Supabase Tables

The Profile Planet data can later be split into the following Supabase tables.

### `user_map_themes`

Stores one or more saved map/planet themes per user.

Suggested columns:

- `id uuid primary key`
- `user_id uuid not null references public.profiles(id) on delete cascade`
- `ocean_color text not null`
- `land_color text not null`
- `background_color text not null`
- `atmosphere_color text not null`
- `pin_color text not null`
- `road_color text not null`
- `building_color text not null`
- `label_color text not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `map_pins`

Stores the actual pins shown on the Profile Planet globe and Mapbox preview.

Suggested columns:

- `id uuid primary key`
- `user_id uuid not null references public.profiles(id) on delete cascade`
- `folder_id uuid references public.map_folders(id) on delete set null`
- `title text not null`
- `description text not null default ''`
- `lat double precision not null`
- `lng double precision not null`
- `image_url text`
- `image_alt text not null default ''`
- `tags text[] not null default '{}'`
- `visibility text not null default 'private'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `map_folders`

Stores user-created folders shown in the Profile Planet folder UI.

Suggested columns:

- `id uuid primary key`
- `user_id uuid not null references public.profiles(id) on delete cascade`
- `name text not null`
- `description text not null default ''`
- `center_lat double precision`
- `center_lng double precision`
- `zoom double precision`
- `cover_image_url text`
- `cover_image_alt text not null default ''`
- `visibility text not null default 'private'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `map_folder_pins`

Use this table if one pin can belong to multiple folders.

Suggested columns:

- `folder_id uuid not null references public.map_folders(id) on delete cascade`
- `pin_id uuid not null references public.map_pins(id) on delete cascade`
- `user_id uuid not null references public.profiles(id) on delete cascade`
- `sort_order integer not null default 0`
- `created_at timestamptz not null default now()`
- primary key: `folder_id`, `pin_id`

This table is more flexible than storing only `folder_id` on `map_pins`.

### `map_pin_photos`

Use this table if one pin can have multiple photos.

Suggested columns:

- `id uuid primary key`
- `pin_id uuid not null references public.map_pins(id) on delete cascade`
- `user_id uuid not null references public.profiles(id) on delete cascade`
- `image_url text not null`
- `image_alt text not null default ''`
- `sort_order integer not null default 0`
- `created_at timestamptz not null default now()`

For the current MVP, `map_pins.image_url` is enough. Add `map_pin_photos` only when multi-photo pins become necessary.

## RLS Policy Ideas

These are policy ideas only, not SQL.

- Users can create, update, and delete their own pins.
- Users can create, update, and delete their own folders.
- Users can create, update, and delete their own themes.
- Public profiles can read public pins, public folders, and public themes.
- Private pins should only be visible to the owner.
- Private folders should only be visible to the owner.
- Folder-pin relationships should be writable only by the owner of the folder.
- If `map_pin_photos` exists, users should only be able to write photos for pins they own.

## Migration Strategy

The safest migration is incremental. Keep the experiment route isolated while replacing one mock source at a time.

1. Keep `mockThemes`, `mockPins`, and `mockFolders` as fallback development data.
2. Add Supabase read helpers inside the Profile Planet feature folder only.
3. Replace `mockPins` with a Supabase fetch from `map_pins`.
4. Replace `mockFolders` with a Supabase fetch from `map_folders` and `map_folder_pins`.
5. Replace the localStorage theme with the `user_map_themes` table.
6. Keep localStorage as a temporary fallback for signed-out or offline development.
7. Once Supabase data is stable, keep a `mock` mode for UI testing and Vercel preview work.

## Type Mapping

The current TypeScript types can remain stable while the database changes underneath them.

- `user_map_themes.ocean_color` maps to `UserMapTheme.oceanColor`
- `map_pins.lat` maps to `MapPin.lat`
- `map_pins.lng` maps to `MapPin.lng`
- `map_folders.center_lat` maps to `MapFolder.centerLat`
- `map_folders.center_lng` maps to `MapFolder.centerLng`
- `map_folder_pins.pin_id` can be converted into `MapFolder.pinIds`

This allows the UI, Three.js globe, and Mapbox preview to keep using the same local TypeScript shape even after the data source changes.
