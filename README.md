# Reclux website

This `website` branch holds only the landing page. The extension code and the logo master files (`brand/`) live on the `main` branch.

- Static HTML, CSS and JS. No build step.
- Fonts are self-hosted (Google Sans Flex, Geist Mono, both under the SIL Open Font License).
- `img/` holds real screenshots of the extension (light and dark, WebP). `og.png` is the link preview picture.
- Same look as the extension (V2 "liquid glass"): colours and glass values are copied from the app's `tokens.css`.
- `download/` holds the extension .zip files. Replace them and update the version and size in `index.html` for each release.
- Deployed on Netlify from this branch (`netlify.toml`).
