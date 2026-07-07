# Supabase setup for CharmOS

CharmOS needs a Supabase project for accounts, cross-device sync, and Google sign-in. Nothing in the app works until you do this once.

## 1. Create a project

1. Go to [supabase.com](https://supabase.com) and sign in (or create an account).
2. Click **New project**. Pick any name/region/database password (save the password somewhere — you likely won't need it again, but Supabase asks for it).
3. Wait for the project to finish provisioning (a minute or two).

## 2. Run the schema migration

1. In your project, open the **SQL Editor** (left sidebar).
2. Open [`supabase/migrations/20260706000000_init_schema.sql`](../supabase/migrations/20260706000000_init_schema.sql) from this repo, copy its entire contents, and paste it into a new SQL Editor query.
3. Click **Run**. This creates the `profiles`, `brands`, `deals`, `ideas`, and `ledger` tables, their row-level security policies, and enables Realtime on the four CRM tables.

(If you have the [Supabase CLI](https://supabase.com/docs/guides/cli) installed and prefer that workflow, `supabase link` then `supabase db push` works too — the migration file is already in the CLI's expected `supabase/migrations/` location.)

## 3. Enable Google sign-in

1. In your project, go to **Authentication → Providers → Google**.
2. Toggle it on. You'll need a Google OAuth Client ID + Secret:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create (or reuse) a project, and create an **OAuth 2.0 Client ID** (type: **Web application**).
   - Under **Authorized redirect URIs**, add the callback URL Supabase shows you on the same Google provider settings page (it looks like `https://<your-project-ref>.supabase.co/auth/v1/callback`).
   - Copy the generated **Client ID** and **Client Secret** back into Supabase's Google provider settings and save.
3. Still in **Authentication → URL Configuration**, add your app's own callback URL to **Redirect URLs**: `http://localhost:3000/auth/callback` for local dev (add your production URL too once you deploy, e.g. `https://yourapp.com/auth/callback`).

Email/password sign-in works out of the box with no extra setup — it's enabled by default under **Authentication → Providers → Email**.

## 4. Copy your keys into `.env`

1. In your project, go to **Settings → API**.
2. Copy the **Project URL** and the **`anon` `public`** key (not the `service_role` key — CharmOS never uses it).
3. In this repo, copy `.env.example` to `.env` if you haven't already, and fill in:

   ```
   VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-key>
   ```

4. Restart `npm run dev` if it was already running.

That's it — sign-up, Google sign-in, onboarding, and cross-device sync should all work once these four steps are done.
