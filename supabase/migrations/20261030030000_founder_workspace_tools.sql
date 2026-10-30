CREATE TABLE IF NOT EXISTS public.discovery_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interview_date DATE NOT NULL DEFAULT CURRENT_DATE,
  interviewee_label TEXT NOT NULL DEFAULT 'Anonymous customer',
  segment TEXT,
  idea_or_assumption TEXT NOT NULL,
  notes TEXT NOT NULL,
  pain_points TEXT[] NOT NULL DEFAULT '{}',
  evidence_direction TEXT NOT NULL DEFAULT 'Mixed' CHECK (evidence_direction IN ('Supports', 'Challenges', 'Mixed')),
  evidence_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.discovery_interviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own discovery interviews" ON public.discovery_interviews
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_discovery_interviews_updated_at BEFORE UPDATE ON public.discovery_interviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.decision_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decision TEXT NOT NULL,
  rationale TEXT NOT NULL,
  alternatives TEXT,
  confidence SMALLINT CHECK (confidence BETWEEN 1 AND 5),
  review_date DATE,
  outcome TEXT,
  status TEXT NOT NULL DEFAULT 'To review' CHECK (status IN ('To review', 'Reviewed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.decision_journal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own decision journal" ON public.decision_journal
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_decision_journal_updated_at BEFORE UPDATE ON public.decision_journal
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.founder_pulse_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  goal TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  unit TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start, metric_name)
);
ALTER TABLE public.founder_pulse_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own founder pulse entries" ON public.founder_pulse_entries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_founder_pulse_entries_updated_at BEFORE UPDATE ON public.founder_pulse_entries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE INDEX IF NOT EXISTS founder_pulse_entries_user_week_idx ON public.founder_pulse_entries (user_id, week_start DESC);
