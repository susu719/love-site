# Deployment Guide

This project deploys with GitHub, Vercel, and Supabase.

## 1. Supabase

1. Go to Supabase and create a new project.
2. Open SQL Editor.
3. Copy everything from `supabase/schema.sql`.
4. Paste it into SQL Editor.
5. Run the SQL.
6. Go to Project Settings > API.
7. Copy the Project URL.
8. Copy the anon public key.
9. Go to Authentication > URL Configuration.
10. Set Site URL to your Vercel production URL after Vercel is created.
11. Add Redirect URLs:
    - `http://localhost:3000`
    - your Vercel production URL
12. Go to Authentication > Providers.
13. Enable Google.

## 2. Local Environment

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Restart the local dev server after editing `.env.local`.

## 3. GitHub

1. Create a new GitHub repository.
2. Do not add README, gitignore, or license on GitHub.
3. Copy the repository URL.
4. In this project folder, run:

```bash
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

## 4. Vercel

1. Go to Vercel.
2. Add New Project.
3. Import the GitHub repository.
4. Framework Preset should be Next.js.
5. Install Command should be `pnpm install`.
6. Build Command should be `pnpm build`.
7. Output Directory should be left empty.
8. Add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
9. Deploy.
10. Copy the Vercel production URL.
11. Go back to Supabase Authentication > URL Configuration.
12. Set Site URL to the Vercel URL.
13. Add the same Vercel URL to Redirect URLs.

## 5. After Deploy

1. Open the Vercel production URL.
2. Test the home page.
3. Test `/memories`.
4. Test `/photos`.
5. Test Google Login.
