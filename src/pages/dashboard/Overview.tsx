import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, BarChart3, Bot, BookOpenCheck, Building2, Compass, Lightbulb, MessageSquareText, Target, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type WorkspaceProfile = {
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
};

const tools = [
  { title: "Workspace memory", description: "Review the context your advisors can use and keep it current.", path: "/dashboard/memory", icon: BookOpenCheck, eyebrow: "Keep context close" },
  { title: "AI advisors", description: "Talk through a decision with a specialist who knows your context.", path: "/dashboard/chatbot", icon: Bot, eyebrow: "Think it through" },
  { title: "Market analysis", description: "Frame your market, audience, and the competition to investigate.", path: "/dashboard/market-analysis", icon: BarChart3, eyebrow: "Find the signal" },
  { title: "Product ideas", description: "Capture opportunities and turn them into a focused backlog.", path: "/dashboard/product-ideas", icon: Lightbulb, eyebrow: "Shape what’s next" },
  { title: "Growth plan", description: "Turn your 90-day goal into actions and learn from the results.", path: "/dashboard/growth-plan", icon: Target, eyebrow: "Move with intent" },
  { title: "Advisor sessions", description: "Explore a hard question from several specialist angles.", path: "/dashboard/meeting-room", icon: Users, eyebrow: "See every angle" },
];

const emptyProfile: WorkspaceProfile = {
  full_name: null, company_name: null, company_type: null, company_stage: null, industry: null,
  product_or_service: null, target_customer: null, primary_goal: null, biggest_challenge: null,
  team_size: null, monthly_revenue_range: null,
};

export default function Overview() {
  const [profile, setProfile] = useState<WorkspaceProfile>(emptyProfile);
  const [activity, setActivity] = useState<{ conversations: number | null; ideas: number | null; actions: number | null }>({ conversations: null, ideas: null, actions: null });
  const [weekly, setWeekly] = useState<{ actions: { id: string; title: string; status: string; due_date: string | null }[]; decisions: { id: string; decision: string; review_date: string | null }[]; interviews: { id: string; interviewee_label: string; created_at: string }[]; recent: number }>({ actions: [], decisions: [], interviews: [], recent: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const [profileResult, conversationsResult, ideasResult, actionsResult, decisionsResult, interviewsResult] = await Promise.all([
        supabase.from("profiles").select("full_name,company_name,company_type,company_stage,industry,product_or_service,target_customer,primary_goal,biggest_challenge,team_size,monthly_revenue_range").eq("user_id", user.id).maybeSingle(),
        supabase.from("chat_conversations").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("product_ideas").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("growth_actions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("decision_journal").select("id,decision,review_date,status,created_at").eq("user_id", user.id).neq("status", "Reviewed").order("created_at", { ascending: false }).limit(5),
        supabase.from("discovery_interviews").select("id,interviewee_label,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(4),
      ]);
      if (!active) return;
      if (profileResult.data) setProfile({ ...emptyProfile, ...profileResult.data });
      setActivity({
        conversations: conversationsResult.error ? null : conversationsResult.count ?? 0,
        ideas: ideasResult.error ? null : ideasResult.count ?? 0,
        actions: actionsResult.error ? null : actionsResult.count ?? 0,
      });
      const visitKey = `chanakya-last-visit-${user.id}`;
      const lastVisit = Number(localStorage.getItem(visitKey) || 0);
      const activityRows = [...(actionsResult.data ?? []), ...(decisionsResult.data ?? []), ...(interviewsResult.data ?? [])] as { created_at: string }[];
      setWeekly({ actions: (actionsResult.data ?? []) as unknown as typeof weekly.actions, decisions: (decisionsResult.data ?? []) as unknown as typeof weekly.decisions, interviews: (interviewsResult.data ?? []) as unknown as typeof weekly.interviews, recent: activityRows.filter((row) => new Date(row.created_at).getTime() > lastVisit).length });
      localStorage.setItem(visitKey, String(Date.now()));
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, []);

  const firstName = profile.full_name?.trim().split(/\s+/)[0] || "there";
  const company = profile.company_name || "your company";

  return <div className="space-y-10 pb-8">
    <section className="relative overflow-hidden border-b border-border pb-9">
      <div className="pointer-events-none absolute -right-10 -top-16 h-72 w-72 rounded-full border border-primary/15 sm:right-4"><div className="absolute inset-8 rounded-full border border-primary/15"><div className="absolute inset-8 rounded-full border border-primary/15" /></div></div>
      <div className="relative grid gap-8 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-8"><p className="mb-5 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground"><Compass size={14} className="text-primary" /> Your growth workspace <span className="text-primary">/</span> Overview</p><h1 className="max-w-4xl text-5xl font-medium leading-[0.95] tracking-[-0.06em] sm:text-6xl lg:text-[5.25rem]">Good to have you,<br className="hidden sm:block" /> {firstName}<span className="text-primary">.</span></h1><p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">{profile.company_name ? <><span className="text-foreground">{profile.company_name}</span>{profile.industry ? ` · ${profile.industry}` : ""}. Let’s make progress on what matters most.</> : "Bring the challenge you’re working on. Leave with a clearer view of what to do next."}</p></div>
        <Link to="/dashboard/chatbot" className="group flex h-12 w-fit min-w-[200px] items-center justify-center gap-3 whitespace-nowrap bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-primary lg:col-span-4 lg:justify-self-end">Start with an advisor <ArrowRight size={16} className="shrink-0 transition-transform group-hover:translate-x-1" /></Link>
      </div>
    </section>

    <section aria-label="Your starting signals">
      <div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Your starting signals</p><h2 className="mt-2 text-2xl font-medium tracking-tight">A live read on your workspace</h2></div><Link to="/dashboard/profile" className="editorial-link hidden items-center gap-1 pb-1 text-xs sm:inline-flex">Edit company context <ArrowUpRight size={14} /></Link></div>
      <div className="grid border-l border-t border-border sm:grid-cols-2 xl:grid-cols-5">
        <SignalCard label="North star · next 90 days" value={profile.primary_goal || "Choose a goal"} icon={<Target size={17} />} detail={profile.biggest_challenge ? `Current knot: ${profile.biggest_challenge}` : "Your chosen priority"} />
        <SignalCard label="Advisor conversations" value={loading ? "…" : String(activity.conversations ?? "—")} icon={<MessageSquareText size={17} />} detail="Counted from conversations saved here" />
        <SignalCard label="Ideas in your backlog" value={loading ? "…" : String(activity.ideas ?? "—")} icon={<Lightbulb size={17} />} detail="Saved product opportunities" />
        <SignalCard label="Growth actions" value={loading ? "…" : String(activity.actions ?? "—")} icon={<Target size={17} />} detail="Steps in your founder plan" />
        <SignalCard label="Company stage" value={profile.company_stage || "Add your stage"} icon={<BarChart3 size={17} />} detail={profile.team_size ? `Team size · ${profile.team_size} (your estimate)` : (profile.industry || "Your chosen stage")} />
      </div>
      {profile.monthly_revenue_range && <p className="mt-3 text-xs text-muted-foreground">Revenue range is your self-reported estimate ({profile.monthly_revenue_range}); it is not connected or verified.</p>}
    </section>

    <section className="grid gap-6 lg:grid-cols-12">
      <div className="border border-border bg-background p-5 sm:p-7 lg:col-span-5">
        <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center bg-secondary"><Building2 size={17} className="text-primary" /></span><div><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Your field notes</p><h2 className="mt-1 text-xl font-medium tracking-tight">{company}</h2></div></div>
        <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{profile.product_or_service || "Add what you’re building so your workspace can give more relevant suggestions."}</p>
        {profile.target_customer && <p className="mt-4 border-l-2 border-primary pl-3 text-sm leading-relaxed"><span className="text-xs uppercase tracking-wide text-muted-foreground">For </span>{profile.target_customer}</p>}
        <Link to="/dashboard/profile" className="editorial-link mt-6 inline-flex items-center gap-2 pb-1 text-sm">Refine your company signal <ArrowRight size={14} /></Link>
      </div>
      <div className="bg-foreground p-6 text-background sm:p-8 lg:col-span-7"><p className="text-xs font-medium uppercase tracking-[0.16em] text-background/55">A useful place to begin</p><h2 className="mt-3 max-w-xl text-3xl font-medium leading-tight tracking-[-0.04em]">{profile.primary_goal ? `Let’s make progress on “${profile.primary_goal.toLowerCase()}.”` : "Turn an open question into forward motion."}</h2><p className="mt-4 max-w-xl text-sm leading-relaxed text-background/65">Your advisors have your company context. Bring the decision on your mind and work toward one clear next step.</p><Link to="/dashboard/chatbot" className="mt-7 inline-flex h-11 items-center gap-3 bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-primary">Talk it through <ArrowRight size={15} className="text-primary" /></Link></div>
    </section>

    <section className="grid gap-6 lg:grid-cols-3">
      <div className="border border-border p-5"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">In motion</p><h2 className="mt-2 text-xl font-medium">Active actions</h2><div className="mt-4 space-y-3">{weekly.actions.filter((item) => item.status !== "Done").slice(0, 4).map((item) => <Link key={item.id} to="/dashboard/growth-plan" className="block border-t border-border pt-3 text-sm hover:text-primary">{item.title}<span className="mt-1 block text-xs text-muted-foreground">{item.status}{item.due_date ? ` · due ${item.due_date}` : ""}</span></Link>)}{!weekly.actions.some((item) => item.status !== "Done") && <p className="border-t border-border pt-3 text-sm text-muted-foreground">No active actions yet. Pick one small next step.</p>}</div></div>
      <div className="border border-border p-5"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">New evidence</p><h2 className="mt-2 text-xl font-medium">Customer conversations</h2><div className="mt-4 space-y-3">{weekly.interviews.map((item) => <Link key={item.id} to="/dashboard/customer-discovery" className="block border-t border-border pt-3 text-sm hover:text-primary">{item.interviewee_label}<span className="mt-1 block text-xs text-muted-foreground">Logged {new Date(item.created_at).toLocaleDateString()}</span></Link>)}{!weekly.interviews.length && <p className="border-t border-border pt-3 text-sm text-muted-foreground">New interview notes will appear here.</p>}</div></div>
      <div className="border border-border p-5"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">For review</p><h2 className="mt-2 text-xl font-medium">Open decisions</h2><div className="mt-4 space-y-3">{weekly.decisions.map((item) => <Link key={item.id} to="/dashboard/decision-journal" className="block border-t border-border pt-3 text-sm hover:text-primary">{item.decision}<span className="mt-1 block text-xs text-muted-foreground">{item.review_date ? `Review ${item.review_date}` : "No review date set"}</span></Link>)}{!weekly.decisions.length && <p className="border-t border-border pt-3 text-sm text-muted-foreground">No open decisions awaiting review.</p>}</div></div>
      <p className="text-xs text-muted-foreground lg:col-span-3">{weekly.recent ? `${weekly.recent} new workspace record${weekly.recent === 1 ? "" : "s"} since your last visit.` : "Your workspace activity is up to date since your last visit."}</p>
    </section>
    <section><div className="mb-5"><p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">The workspace</p><h2 className="mt-2 text-2xl font-medium tracking-tight">Tools for the work ahead</h2></div><div className="grid border-l border-t border-border sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{tools.map(({ title, description, path, icon: Icon, eyebrow }) => <Link key={title} to={path} className="group flex min-h-[180px] flex-col border-b border-r border-border bg-background p-5 transition-colors hover:bg-card sm:p-6"><div className="flex items-center justify-between"><span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{eyebrow}</span><ArrowUpRight size={16} className="text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" /></div><div className="mt-auto pt-8"><div className="flex items-center gap-2.5"><Icon size={18} strokeWidth={1.7} className="text-primary" /><h3 className="text-lg font-medium tracking-tight">{title}</h3></div><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p></div></Link>)}</div></section>
  </div>;
}

function SignalCard({ label, value, icon, detail }: { label: string; value: string; icon: React.ReactNode; detail: string }) {
  return <article className="min-w-0 border-b border-r border-border bg-background p-4 sm:p-5"><div className="flex items-center gap-2 text-primary">{icon}<p className="min-w-0 truncate text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p></div><p className="mt-4 line-clamp-2 min-h-12 text-xl font-medium leading-snug tracking-tight">{value}</p><p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{detail}</p></article>;
}
