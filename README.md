# Personal Academic Portfolio

This is a static React portfolio site for GitHub Pages. It includes sections for:

- profile introduction
- project links and descriptions
- competition achievements
- academic publications
- technical notes
- photo gallery
- invitation-only personal space
- identified visitor records and guestbook

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy

Push to the `main` branch of `chippyzhou/chippyzhou.github.io`. GitHub Actions will build the site and publish it with GitHub Pages.

## Private Space Backend

The public site stays on GitHub Pages. The invitation-only space uses Tencent CloudBase PostgreSQL, a small allowlisted API function, and CloudBase storage for images and audio. Browser requests go through that function so the PostgreSQL gateway is never exposed cross-origin. Invitation codes and session tokens are stored only as SHA-256 hashes.

The PostgreSQL migrations live in `supabase/migrations/` because the schema remains PostgREST-compatible. The media function lives in `cloudbase/functions/private-media-upload/`.

GitHub Pages reads its CloudBase client settings from `.env.production`. The publishable access key in that file is intentionally public and is bundled into the browser application; it cannot replace an owner session or bypass the database and media-function authorization checks. Update `.env.production` when rotating the client key or moving the site to another CloudBase environment.
