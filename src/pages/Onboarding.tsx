import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, BarChart3, Building2, Check, Compass, Lightbulb, Loader2, Rocket, Sparkles, Target, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import BrandLogo from "@/components/BrandLogo";

type OnboardingProfile = {
  full_name: string | null;
  company_name: string | null;
  company_type: string | null;
  company_stage: string | null;
  industry: string | null;
  product_or_service: string | null;
  target_customer: string | null;
  primary_goal: string | null;
  biggest_challenge: string | null;
  team_size: string | null;
  monthly_revenue_range: string | null;
  onboarding_completed_at: string | null;
};

const ventureTypes = [
  { value: "idea", label: "I have an idea", detail: "Turning a hunch into something real", icon: Lightbulb },
  { value: "startup", label: "Building a startup", detail: "Finding traction and a repeatable model", icon: Rocket },
  { value: "small_business", label: "Running a small business", detail: "Serving customers and growing steadily", icon: Building2 },
  { value: "growing_company", label: "Growing a company", detail: "Scaling a team, product, or market", icon: BarChart3 },
  { value: "independent", label: "Building independently", detail: "A solo practice, studio, or side project", icon: Compass },
];

const stages = ["Idea", "Validating", "Building", "Early customers", "Growing", "Established"];
const goals = [
  "Find my first customers",
  "Grow revenue",
  "Launch or improve a product",
  "Understand my market",
  "Make operations smoother",
  "Build a stronger team",
  "Decide what to focus on next",
];

const blankProfile: OnboardingProfile = {
  full_name: "", company_name: "", company_type: "", company_stage: "", industry: "",
  product_or_service: "", target_customer: "", primary_goal: "", biggest_challenge: "",
  team_size: "", monthly_revenue_range: "", onboarding_completed_at: null,
};

export default function Onboarding() {
  const [profile, setProfile] = useState<OnboardingProfile>(blankProfile);
  const [userId, setUserId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        navigate("/auth", { replace: true });
        return;
      }
      const { data, error } = await supabase.from("profiles")
        .select("full_name,company_name,company_type,company_stage,industry,product_or_service,target_customer,primary_goal,biggest_challenge,team_size,monthly_revenue_range,onboarding_completed_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        toast({ title: "Could not open your setup", description: "Apply the latest Supabase migration, then reload this page.", variant: "destructive" });
        if (active) setLoading(false);
        return;
      }
      if (data?.onboarding_completed_at) {
        navigate("/dashboard", { replace: true });
        return;
      }
      if (active) {
        setUserId(user.id);
        setProfile({
          full_name: data?.full_name ?? user.user_metadata?.full_name ?? "",
          company_name: data?.company_name ?? "",
          company_type: data?.company_type ?? "",
          company_stage: data?.company_stage ?? "",
          industry: data?.industry ?? "",
          product_or_service: data?.product_or_service ?? "",
          target_customer: data?.target_customer ?? "",
          primary_goal: data?.primary_goal ?? "",
          biggest_challenge: data?.biggest_challenge ?? "",
          team_size: data?.team_size ?? "",
          monthly_revenue_range: data?.monthly_revenue_range ?? "",
          onboarding_completed_at: data?.onboarding_completed_at ?? null,
        });
        setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [navigate, toast]);

  const update = (key: keyof OnboardingProfile, value: string) => setProfile((current) => ({ ...current, [key]: value }));

  const save = async (complete = false) => {
    if (!userId) return false;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      user_id: userId,
      full_name: (profile.full_name ?? "").trim() || null,
      company_name: (profile.company_name ?? "").trim() || null,
      company_type: profile.company_type || null,
      company_stage: profile.company_stage || null,
      industry: (profile.industry ?? "").trim() || null,
      product_or_service: (profile.product_or_service ?? "").trim() || null,
      target_customer: (profile.target_customer ?? "").trim() || null,
      primary_goal: profile.primary_goal || null,
      biggest_challenge: (profile.biggest_challenge ?? "").trim() || null,
      team_size: profile.team_size || null,
      monthly_revenue_range: profile.monthly_revenue_range || null,
      onboarding_completed_at: complete ? new Date().toISOString() : null,
    }, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast({ title: "Your answers could not be saved", description: error.message, variant: "destructive" });
      return false;
    }
    return true;
  };

  const canContinue = useMemo(() => {
    if (step === 0) return Boolean(profile.company_type);
    if (step === 1) return Boolean(profile.company_name.trim() && profile.company_stage && profile.industry.trim());
    if (step === 2) return Boolean(profile.product_or_service.trim() && profile.target_customer.trim());
    if (step === 3) return Boolean(profile.primary_goal);
    return true;
  }, [profile, step]);

  const next = async () => {
    if (!canContinue) return;
    if (step < 4) {
      if (await save()) setStep((current) => current + 1);
      return;
    }
    if (await save(true)) navigate("/dashboard", { replace: true });
  };

  const skip = async () => {
    if (await save(true)) navigate("/dashboard", { replace: true });
  };

  const signalPoints = [profile.company_type, profile.company_name, profile.product_or_service, profile.primary_goal, profile.team_size || profile.monthly_revenue_range].filter(Boolean).length;
  const greeting = profile.full_name.trim().split(/\s+/)[0] || "Founder";

  if (loading) return <div className="grid min-h-screen place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading setup" /></div>;

  return <main className="min-h-screen overflow-hidden bg-background text-foreground">
    <header className="relative z-10 mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 md:px-10">
      <BrandLogo className="h-14 w-[84px]" />
      <button onClick={skip} disabled={saving} className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50">I’ll do this later</button>
    </header>

    <div className="mx-auto grid max-w-[1240px] gap-10 px-5 pb-12 pt-5 md:grid-cols-[minmax(0,1fr)_300px] md:gap-16 md:px-10 md:pb-20 md:pt-12">
      <section className="min-w-0">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center bg-foreground text-background"><Compass size={18} className="text-primary" /></span>
          <div><p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">The company signal</p><p className="mt-1 text-xs text-muted-foreground">A few field notes. A workspace that gets you.</p></div>
        </div>

        <div className="mb-8 flex items-center gap-2" aria-label={`Step ${step + 1} of 5`}>
          {Array.from({ length: 5 }, (_, index) => <span key={index} className={`h-1 flex-1 transition-colors duration-300 ${index <= step ? "bg-primary" : "bg-border"}`} />)}
          <span className="ml-2 whitespace-nowrap text-xs tabular-nums text-muted-foreground">{String(step + 1).padStart(2, "0")} / 05</span>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            {step === 0 && <>
              <StepHeading eyebrow="Start with the shape of it" title={`${greeting}, what are you building?`} copy="No pitch needed. Pick the closest fit; you can change it any time." />
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {ventureTypes.map(({ value, label, detail, icon: Icon }) => <Choice key={value} selected={profile.company_type === value} onClick={() => update("company_type", value)} icon={<Icon size={18} />} label={label} detail={detail} />)}
              </div>
            </>}

            {step === 1 && <>
              <StepHeading eyebrow="Give the idea a place to live" title="What should we call it?" copy="This helps us tune examples and language to your world." />
              <div className="mt-7 space-y-5">
                <Field label="Company, project, or working title"><Input autoFocus value={profile.company_name} onChange={(event) => update("company_name", event.target.value)} placeholder="e.g. Northstar Studio" maxLength={160} /></Field>
                <Field label="What space are you in?"><Input value={profile.industry} onChange={(event) => update("industry", event.target.value)} placeholder="e.g. climate tech, education, food" maxLength={120} /></Field>
                <Field label="Where are you in the journey?"><div className="flex flex-wrap gap-2">{stages.map((stage) => <button key={stage} type="button" aria-pressed={profile.company_stage === stage} onClick={() => update("company_stage", stage)} className={`border px-3 py-2 text-sm transition-colors ${profile.company_stage === stage ? "border-foreground bg-foreground text-background" : "border-border bg-background text-muted-foreground hover:border-foreground/50 hover:text-foreground"}`}>{stage}</button>)}</div></Field>
              </div>
            </>}

            {step === 2 && <>
              <StepHeading eyebrow="The work behind the name" title="Who is this for?" copy="A plain description is perfect. It gives your advisors a much better starting point." />
              <div className="mt-7 space-y-5">
                <Field label="What are you making or offering?"><Textarea autoFocus value={profile.product_or_service} onChange={(event) => update("product_or_service", event.target.value)} placeholder="A tool, service, product, or experience that helps people…" className="min-h-28 resize-y" maxLength={1200} /></Field>
                <Field label="Who do you most want to help?"><Input value={profile.target_customer} onChange={(event) => update("target_customer", event.target.value)} placeholder="e.g. independent clinics that need simpler scheduling" maxLength={500} /></Field>
              </div>
            </>}

            {step === 3 && <>
              <StepHeading eyebrow="Choose your next hill" title="What would make the next 90 days feel like progress?" copy="Pick one north star. We’ll use it to shape your dashboard and advisor suggestions." />
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {goals.map((goal, index) => <Choice key={goal} selected={profile.primary_goal === goal} onClick={() => update("primary_goal", goal)} icon={<Target size={17} />} label={goal} detail={index === 0 ? "A clear early milestone" : index === 1 ? "Build healthier momentum" : undefined} />)}
              </div>
              <Field label="What feels like the biggest knot right now? (optional)"><Textarea value={profile.biggest_challenge} onChange={(event) => update("biggest_challenge", event.target.value)} placeholder="The thing that keeps taking up headspace…" className="mt-5 min-h-24 resize-y" maxLength={1000} /></Field>
            </>}

            {step === 4 && <>
              <StepHeading eyebrow="Optional, and just for your workspace" title="Add a couple of baseline signals?" copy="These are your estimates, not connected or verified company data. You can leave both blank." />
              <div className="mt-7 space-y-6">
                <Field label="How many people are working on it?"><div className="flex flex-wrap gap-2">{["Just me", "2–5", "6–15", "16–50", "51+", "Prefer not to say"].map((size) => <button key={size} type="button" aria-pressed={profile.team_size === size} onClick={() => update("team_size", size === "Prefer not to say" ? "" : size)} className={`border px-3 py-2 text-sm transition-colors ${profile.team_size === size ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:border-foreground/50 hover:text-foreground"}`}>{size}</button>)}</div></Field>
                <Field label="Monthly revenue range (optional)"><div className="flex flex-wrap gap-2">{["Pre-revenue", "Under $1k", "$1k–$10k", "$10k–$50k", "$50k+", "Prefer not to say"].map((range) => <button key={range} type="button" aria-pressed={profile.monthly_revenue_range === range} onClick={() => update("monthly_revenue_range", range === "Prefer not to say" ? "" : range)} className={`border px-3 py-2 text-sm transition-colors ${profile.monthly_revenue_range === range ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:border-foreground/50 hover:text-foreground"}`}>{range}</button>)}</div></Field>
              </div>
            </>}
          </motion.div>
        </AnimatePresence>

        <div className="mt-9 flex items-center justify-between border-t border-border pt-5">
          <Button type="button" variant="ghost" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0 || saving} className="rounded-none px-2 text-muted-foreground"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
          <Button type="button" onClick={() => void next()} disabled={!canContinue || saving} className="h-11 rounded-none bg-foreground px-5 text-background hover:bg-foreground/85 disabled:opacity-40">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : step === 4 ? <Check className="mr-2 h-4 w-4" /> : null}{step === 4 ? "Build my workspace" : "Save & continue"}{!saving && step < 4 && <ArrowRight className="ml-2 h-4 w-4" />}</Button>
        </div>
        <p className="mt-4 text-center text-[11px] text-muted-foreground">Your answers are private to your account and can be edited later.</p>
      </section>

      <aside className="relative hidden border border-border bg-card p-6 md:block">
        <div className="absolute -right-4 -top-4 grid h-11 w-11 place-items-center rounded-full border border-border bg-background"><Sparkles size={17} className="text-primary" /></div>
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Live signal map</p>
        <h2 className="mt-3 text-xl font-medium tracking-tight">A little context changes everything.</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Your answers shape the first view of your workspace and give your advisors a useful place to begin.</p>
        <div className="my-7 flex items-center gap-1.5" aria-label={`${signalPoints} of 5 signals added`}>
          {Array.from({ length: 5 }, (_, index) => <span key={index} className={`h-1.5 flex-1 ${index < signalPoints ? "bg-primary" : "bg-border"}`} />)}
        </div>
        <div className="space-y-0 border-t border-border">
          <Signal label="Your venture" value={ventureTypes.find((item) => item.value === profile.company_type)?.label || "Waiting for your signal"} active={Boolean(profile.company_type)} />
          <Signal label="The work" value={profile.product_or_service || "The thing you want to bring to life"} active={Boolean(profile.product_or_service)} />
          <Signal label="Your next move" value={profile.primary_goal || "The progress you want to make"} active={Boolean(profile.primary_goal)} />
        </div>
        <div className="mt-6 flex items-center gap-2 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground"><Users size={14} className="shrink-0 text-primary" />No passwords, API keys, or private integrations asked for here.</div>
      </aside>
    </div>
  </main>;
}

function StepHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <div><p className="text-xs font-medium uppercase tracking-[0.15em] text-primary">{eyebrow}</p><h1 className="mt-3 max-w-2xl text-4xl font-medium leading-[0.98] tracking-[-0.055em] sm:text-5xl">{title}</h1><p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">{copy}</p></div>;
}

function Choice({ selected, onClick, icon, label, detail }: { selected: boolean; onClick: () => void; icon: React.ReactNode; label: string; detail?: string }) {
  return <button type="button" aria-pressed={selected} onClick={onClick} className={`group flex min-h-[78px] items-start gap-3 border p-4 text-left transition-all ${selected ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:border-foreground/50"}`}><span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center ${selected ? "bg-background/10 text-primary" : "bg-secondary text-foreground"}`}>{icon}</span><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{label}</span>{detail && <span className={`mt-1 block text-xs leading-relaxed ${selected ? "text-background/65" : "text-muted-foreground"}`}>{detail}</span>}</span><span className={`mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{selected && <Check size={11} />}</span></button>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function Signal({ label, value, active }: { label: string; value: string; active: boolean }) {
  return <div className="border-b border-border py-4"><p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p><p className={`mt-1.5 line-clamp-2 text-sm leading-relaxed ${active ? "text-foreground" : "text-muted-foreground/65"}`}>{value}</p></div>;
}
