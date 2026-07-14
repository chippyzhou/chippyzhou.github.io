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

## Private Space Setup

The public site stays on GitHub Pages. Private entries, visitor invitations, sessions, and guestbook messages use Supabase so invitation codes are never embedded in the frontend.

1. Create a Supabase project.
2. Run `supabase/migrations/202607110001_private_space.sql` in the Supabase SQL editor.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the GitHub repository's Actions variables.
4. Add visitors and private entries from the Supabase table editor or SQL editor.

Create a visitor with a strong, unique invitation code:

```sql
insert into public.visitor_invites (label, code_hash)
values ('Visitor name', encode(extensions.digest(lower(trim('A-LONG-UNIQUE-CODE')), 'sha256'), 'hex'));
```

Temporarily ban a visitor without deleting their saved sessions or history:

```sql
update public.visitor_invites set is_active = false where label = 'Visitor name';
```

Restore access later:

```sql
update public.visitor_invites set is_active = true where label = 'Visitor name';
```
