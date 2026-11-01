-- Persist market work as dated versions so founders can compare what changed.
CREATE TABLE IF NOT EXISTS public.market_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  market TEXT NOT NULL,
  context TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  is_fallback BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.market_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own market briefs" ON public.market_briefs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_market_briefs_updated_at BEFORE UPDATE ON public.market_briefs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE INDEX market_briefs_user_market_version_idx ON public.market_briefs (user_id, market, version DESC);

ALTER TABLE public.workspace_memories DROP CONSTRAINT IF EXISTS workspace_memories_source_type_check;
ALTER TABLE public.workspace_memories ADD CONSTRAINT workspace_memories_source_type_check
  CHECK (source_type IN ('manual', 'discovery_interview', 'decision_journal', 'product_idea', 'growth_action', 'founder_pulse', 'market_brief'));

ALTER TABLE public.product_ideas
  ADD COLUMN IF NOT EXISTS problem TEXT,
  ADD COLUMN IF NOT EXISTS target_customer TEXT,
  ADD COLUMN IF NOT EXISTS evidence_summary TEXT,
  ADD COLUMN IF NOT EXISTS expected_outcome TEXT,
  ADD COLUMN IF NOT EXISTS risk_notes TEXT,
  ADD COLUMN IF NOT EXISTS effort_rating SMALLINT NOT NULL DEFAULT 3 CHECK (effort_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS impact_rating SMALLINT NOT NULL DEFAULT 3 CHECK (impact_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS confidence_rating SMALLINT NOT NULL DEFAULT 3 CHECK (confidence_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS source_interview_id UUID REFERENCES public.discovery_interviews(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_market_brief_id UUID REFERENCES public.market_briefs(id) ON DELETE SET NULL;

ALTER TABLE public.growth_actions
  ADD COLUMN IF NOT EXISTS owner TEXT,
  ADD COLUMN IF NOT EXISTS definition_of_done TEXT,
  ADD COLUMN IF NOT EXISTS expected_outcome TEXT,
  ADD COLUMN IF NOT EXISTS dependencies TEXT,
  ADD COLUMN IF NOT EXISTS linked_idea_id UUID REFERENCES public.product_ideas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_interview_id UUID REFERENCES public.discovery_interviews(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE public.discovery_interviews
  ADD COLUMN IF NOT EXISTS interview_guide TEXT,
  ADD COLUMN IF NOT EXISTS verbatim_quotes TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.decision_journal
  ADD COLUMN IF NOT EXISTS assumptions TEXT,
  ADD COLUMN IF NOT EXISTS expected_outcome TEXT,
  ADD COLUMN IF NOT EXISTS linked_idea_id UUID REFERENCES public.product_ideas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_interview_id UUID REFERENCES public.discovery_interviews(id) ON DELETE SET NULL;

ALTER TABLE public.founder_pulse_entries
  ADD COLUMN IF NOT EXISTS baseline_value NUMERIC,
  ADD COLUMN IF NOT EXISTS target_value NUMERIC,
  ADD COLUMN IF NOT EXISTS linked_growth_action_id UUID REFERENCES public.growth_actions(id) ON DELETE SET NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS primary_goal_outcome TEXT,
  ADD COLUMN IF NOT EXISTS goal_baseline NUMERIC,
  ADD COLUMN IF NOT EXISTS goal_target NUMERIC,
  ADD COLUMN IF NOT EXISTS goal_unit TEXT,
  ADD COLUMN IF NOT EXISTS goal_period_start DATE,
  ADD COLUMN IF NOT EXISTS goal_period_end DATE;

CREATE TABLE IF NOT EXISTS public.growth_weekly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  done TEXT NOT NULL DEFAULT '',
  delayed TEXT NOT NULL DEFAULT '',
  learned TEXT NOT NULL DEFAULT '',
  next_week TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);
CREATE TABLE IF NOT EXISTS public.founder_pulse_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);
ALTER TABLE public.founder_pulse_reflections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own pulse reflections" ON public.founder_pulse_reflections
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_founder_pulse_reflections_updated_at BEFORE UPDATE ON public.founder_pulse_reflections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
ALTER TABLE public.growth_weekly_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own growth reviews" ON public.growth_weekly_reviews
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_growth_weekly_reviews_updated_at BEFORE UPDATE ON public.growth_weekly_reviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'market_briefs') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.market_briefs;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'growth_weekly_reviews') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.growth_weekly_reviews;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'founder_pulse_reflections') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.founder_pulse_reflections;
    END IF;
  END IF;
END $$;
