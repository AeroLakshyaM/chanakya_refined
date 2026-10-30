# Chanakya

Chanakya is a growth workspace for founders and product teams. It combines specialist AI conversations with market research, product planning, and an advisor workspace.

## Run locally

1. Install Node.js (LTS).
2. Copy `.env.example` to `.env` and add the Supabase project URL and publishable key.
3. Install dependencies with `npm ci`.
4. Start the app with `npm run dev`.

The Supabase client reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from `.env`. These browser variables are public identifiers; never put a service-role key or Gemini key in a `VITE_` variable.

## Supabase setup

1. Set the project reference in `supabase/config.toml` to your Supabase project.
2. Apply the SQL migration in `supabase/migrations` once to create the profile and chat tables, triggers, and row-level security policies.
3. Configure Auth redirect URLs for local development and the deployed app. Enable email confirmation if that matches your signup flow.
4. Deploy `supabase/functions/ai-advisors`.
5. Set the function secrets `GEMINI_API_KEY` and, if needed, `GEMINI_MODEL` (defaults to `gemini-3.8-flash`). Supabase supplies the project URL and keys to deployed functions.

The Edge Function checks the signed-in user before writing conversation history and verifies that the conversation belongs to that user. It also calls Gemini from the server, so the Gemini key stays private.

## Current feature status

- Authentication: Supabase email/password sign-up and sign-in.
- AI advisors: Gemini-backed advisor chat; chat history is written to Supabase when the Edge Function is deployed and configured.
- Product ideas, market analysis, and advisor sessions: the screens currently contain demo content and are not yet backed by complete workflows or database tables.
- Profile and settings: profile saving, user-specific preferences, and account deletion still need implementation.

Do not treat displayed demo market metrics, meeting schedules, product idea counts, or usage figures as real company data. The next product milestone is to replace these demo views with authenticated, workspace-scoped data and actions.
