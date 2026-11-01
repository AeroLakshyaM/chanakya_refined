CREATE TABLE IF NOT EXISTS public.workspace_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('company', 'customers', 'goals_metrics', 'market', 'decisions', 'current_work')),
  kind TEXT NOT NULL DEFAULT 'fact' CHECK (kind IN ('fact', 'assumption', 'open_question')),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000),
  source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'discovery_interview', 'decision_journal', 'product_idea', 'growth_action', 'founder_pulse')),
  source_record_id UUID,
  source_label TEXT NOT NULL DEFAULT 'Entered by you',
  source_date DATE,
  source_url TEXT,
  last_confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  include_in_ai BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own workspace memories"
  ON public.workspace_memories
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_workspace_memories_updated_at
  BEFORE UPDATE ON public.workspace_memories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX workspace_memories_user_category_updated_idx
  ON public.workspace_memories (user_id, category, updated_at DESC);

CREATE UNIQUE INDEX workspace_memories_user_source_record_idx
  ON public.workspace_memories (user_id, source_type, source_record_id)
  WHERE source_record_id IS NOT NULL;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'workspace_memories', 'profiles', 'discovery_interviews', 'decision_journal',
    'product_ideas', 'growth_actions', 'founder_pulse_entries'
  ] LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = table_name
      ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
    END IF;
  END LOOP;
END $$;
