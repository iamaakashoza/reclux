# Reclux website

This `website` branch holds only the landing page. The extension code lives on the `main` branch.

- Static HTML, CSS and JS. No build step.
- Fonts are self-hosted (Google Sans Flex, Instrument Serif, Geist Mono, all under the SIL Open Font License).
- `download/` holds the Windows setup file. Replace it and update the version, size and SHA-256 in `index.html` for each release.
- Deployed on Netlify from this branch (`netlify.toml`).
