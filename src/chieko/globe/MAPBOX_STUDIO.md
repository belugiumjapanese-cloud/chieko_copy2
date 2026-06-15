# Drop Mapbox Studio setup

Drop reads the base Mapbox Studio style from `NEXT_PUBLIC_MAPBOX_STYLE_URL` first, then `NEXT_PUBLIC_MAPBOX_STYLE`.

Use a Style URL like:

```txt
mapbox://styles/{account}/{style-id}
```

Recommended Studio base settings:

- Projection: Globe-compatible style, or Mapbox Standard.
- Labels: keep visible, because app themes recolor symbol text and halos at runtime.
- Roads/buildings/water/land layers: keep semantic layer names where possible. The app detects names such as `water`, `road`, `building`, `park`, and `landuse`.
- Satellite imagery: avoid as the default base if you want the app color themes to be visible.

The app currently ships 8 runtime themes in `src/chieko/globe/lib/mapThemes.ts`:

- Sage
- Ink
- Marine
- Dusk
- Clay
- Moss
- Plum
- Bloom

When a theme is selected in the app, both views are updated:

- The flat Mapbox map is recolored through Mapbox GL paint properties and Standard basemap config when available.
- The Three.js globe texture is rebuilt from the same Mapbox Studio style tiles and tinted with the selected theme palette.

If Mapbox Studio cannot serve style tiles for the configured style, the globe falls back to a themed ocean/grid texture so the page still renders.
