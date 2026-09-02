# Portfolio Screenshots

Curated screenshots for showing GeoCompare Web in portfolios, project listings, and social posts.

## Sequence

1. `screenshots/01-profile-overview.png` - Primary GeoCompare workflow showing the Los Angeles, California profile and city boundary map.

## Social preview

`screenshots/social-preview.png` shows the same Los Angeles scene at a `1440 x 720` viewport (`2880 x 1440` output) for GitHub repository previews and link sharing. Upload it under the repository's social preview settings so services such as LinkedIn can use it for link cards.

## Capture

From the repository root:

```bash
npm run portfolio:capture
```

The capture command starts a local Vite server, uses a fixed `1440 x 1000` viewport at `2x` scale, selects light mode and reduced motion, and supplies deterministic public demo data plus a checked-in U.S. Census boundary fixture. It does not use production credentials or personal data.

The geography names and identifiers are real; the demographic metrics are illustrative fixtures, not current Los Angeles statistics. The boundary is from the Census TIGERweb Generalized ACS 2022 places layer, GEOID `0644000`. OpenStreetMap tiles load from the public tile service during capture.

To capture against another running frontend while retaining the deterministic API fixture:

```bash
PORTFOLIO_URL=http://127.0.0.1:4173 npm run portfolio:capture
```

Review the output before publishing whenever the interface changes materially.
