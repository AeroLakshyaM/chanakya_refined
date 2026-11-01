ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_profile_context_default BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_workspace_memory_default BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.ai_profile_context_default IS 'Whether the company profile is selected by default as context for advisor requests; founders may change this per request.';
COMMENT ON COLUMN public.profiles.ai_workspace_memory_default IS 'Whether advisor-enabled workspace memories are suggested by default; founders may change this per request.';
