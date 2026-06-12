# Chieko Drop module

This folder contains an isolated Drop implementation for Chieko. It does not connect to Supabase. Firebase is used for Auth, Firestore, and Storage, and Mapbox is used for maps and reverse geocoding.

## Files

- `components/DropUploader.tsx`: camera-roll photo selection, EXIF GPS extraction, manual map placement, folder selection, Firebase save.
- `components/UndropedMemories.tsx`: compares selected photos against saved Drop coordinates and lists memories without a nearby Drop within 50m.
- `hooks/useOnThisDay.ts`: loads Drops taken on the same month/day at least one year ago.
- `components/OnThisDayBanner.tsx`: banner UI for on-this-day memories.
- `pages/ProfileMap.tsx`: profile map with Drop pins, popups, stats, and folder filters.
- `pages/FolderList.tsx`: profile folder grid with latest thumbnail and Drop count.
- `lib/firebase.ts`: Firebase client setup from `NEXT_PUBLIC_FIREBASE_*` variables.
- `lib/dropService.ts`: Firestore and Storage operations.
- `lib/photo.ts`: EXIF reading with `exifr` and image compression with `browser-image-compression`.
- `lib/geo.ts`: Mapbox reverse geocoding, distance checks, and profile stats helpers.

## Snap Globe (`globe/`)

A Snap Map-inspired 3D globe experience built with Three.js and Mapbox. The Drop tab of `/chieko` uses `DropGlobe`; a friends-demo version lives at `/experiments/snap-globe`.

- `globe/DropGlobe.tsx`: the Drop-concept globe used by the app. Your Drops become photo badges on the globe; zooming in dives into the Mapbox map with photo pins and a "footprint" heatmap built from your Drop locations. Includes folder filter chips, country/city/Drop stats, a Drop detail card, a bottom Drop carousel, and an empty state that calls `onRequestDrop`. Loads real data from Firestore when signed in, otherwise demo Drops (`lib/demoDrops.ts`). `topInset` / `bottomInset` make room for the host app's header and nav.
- `globe/lib/badges.ts`: rounded-square photo badge canvases for globe sprites (with a placeholder fallback).

- `globe/SnapGlobe.tsx`: main component. Renders the Three.js globe, crossfades into a Mapbox map (`projection: globe`, satellite-streets style) when you zoom in, and returns to the globe when you zoom back out. Includes the Snap Map-style UI: search pill, settings with Ghost Mode toggle, friend avatar markers, activity heatmap, and a bottom friend carousel.
- `globe/lib/globeEngine.ts`: Three.js scene — textured earth sphere, atmosphere glow shaders, star field, inertial drag rotation, pinch/wheel zoom, friend avatar sprites with raycast taps, fly-to-and-dive animation.
- `globe/lib/earthTexture.ts`: stitches Mapbox satellite tiles and reprojects web mercator to an equirectangular texture for the sphere (with an offline fallback).
- `globe/lib/friends.ts`: demo friend data, avatar badge canvas builder, relative-time formatting.
- `globe/lib/heat.ts`: demo activity points and heatmap layer paint definition.
- `globe/standalone/index.html`: self-contained, build-free version of the same experience (Three.js and Mapbox GL loaded from CDN). Open the file directly in a browser — no Node.js or dev server required. Enter a Mapbox token in the on-screen prompt (stored in localStorage) or pass it as `?token=pk....`; without a token it falls back to a stylized globe.

Only `NEXT_PUBLIC_MAPBOX_TOKEN` is required (no Firebase). Pass `friends` / `me` props to replace the demo data.

## Required environment variables

```env
NEXT_PUBLIC_MAPBOX_TOKEN=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## Firestore data shape

```text
/users/{userId}/drops/{dropId}
  imageUrl: string
  lat: number
  lng: number
  placeName: string
  address: string
  folderId: string
  caption: string
  takenAt: timestamp
  createdAt: timestamp
  isPublic: boolean

/users/{userId}/folders/{folderId}
  name: string
  createdAt: timestamp
  dropCount: number
  latestImageUrl: string
```

## Starter Firestore rules

Use stricter production rules later, but this is enough for authenticated users to manage only their own data.

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Starter Storage rules

```text
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/drops/{dropId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Firebase Console setup

1. Create a Firebase project.
2. Add a Web app and copy the SDK config values into `.env.local`.
3. Enable Authentication and choose at least one sign-in provider.
4. Create Firestore Database.
5. Enable Storage.
6. Add the Firestore and Storage rules above, then tighten public-read behavior before production release.
