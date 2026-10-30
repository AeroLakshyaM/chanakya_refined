CREATE TABLE IF NOT EXISTS public.growth_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  details TEXT,
  category TEXT NOT NULL DEFAULT 'Focus',
  status TEXT NOT NULL DEFAULT 'Planned' CHECK (status IN ('Planned', 'In Progress', 'Done')),
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.growth_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own growth actions"
  ON public.growth_actions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own growth actions"
  ON public.growth_actions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own growth actions"
  ON public.growth_actions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own growth actions"
  ON public.growth_actions FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER set_growth_actions_updated_at
  BEFORE UPDATE ON public.growth_actions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
