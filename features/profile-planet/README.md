# Profile Planet Experiment

Profile Planet is an isolated experiment. It is not connected to Supabase yet and does not replace the production homepage.

## Local Route

Run the app locally, then open:

```text
http://127.0.0.1:3000/experiments/profile-planet
```

If the local dev server is running on another port, keep the same path:

```text
/experiments/profile-planet
```

## Vercel Preview URL Behavior

When this branch is pushed to GitHub, Vercel can build a Preview Deployment for the branch.

The experiment should be checked by opening the preview domain plus the experiment route:

```text
https://your-vercel-preview-url.vercel.app/experiments/profile-planet
```

The production homepage remains separate. This experiment route should not be used as `/` and should not replace the main app.

## Required Environment Variables

The experiment uses mock data and localStorage only. Supabase is not required for this feature yet.

The isolated Mapbox preview uses the same public Mapbox token variable as the existing app:

```text
NEXT_PUBLIC_MAPBOX_TOKEN
```

If `NEXT_PUBLIC_MAPBOX_TOKEN` is missing, the experiment still builds and loads. The Mapbox preview panel shows a clear missing-token message instead of crashing.

## Mock Data

All Profile Planet data currently lives in local files:

- `features/profile-planet/data/mockMapData.ts`
- `features/profile-planet/data/demoProfilePlanet.ts`

Current mock sources:

- `mockThemes` for planet and Mapbox color presets
- `mockPins` for globe pins and Mapbox markers
- `mockFolders` for folder selection and Mapbox fly targets

Theme customization is persisted only in the browser with localStorage:

```text
profile-planet-theme
```

This keeps the experiment testable on Vercel Preview without Supabase.

## Build Safety

The route is mounted under:

```text
app/experiments/profile-planet
```

All experiment-specific code should stay under:

```text
features/profile-planet
```

This keeps the feature isolated from the existing app routes and production behavior.

## Disable or Remove the Experiment

To disable the experiment without touching the rest of the app:

1. Remove or rename the route folder:

```text
app/experiments/profile-planet
```

2. Leave `features/profile-planet` in place if you want to keep the source code for later.

To remove the experiment completely:

1. Delete:

```text
app/experiments/profile-planet
features/profile-planet
```

2. Remove any dependencies that were added only for the experiment if they are no longer used elsewhere.

Do not remove `mapbox-gl` unless the main app no longer uses Mapbox.

## Future Supabase Migration

The future migration plan is documented here:

```text
features/profile-planet/docs/mock-to-supabase-plan.md
```

