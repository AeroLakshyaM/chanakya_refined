import { useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowUpRight, BookOpenCheck, Check, CircleHelp, Clock3, Lightbulb, Loader2, Plus, RefreshCw, Trash2, X } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

type Memory = Database["public"]["Tables"]["workspace_memories"]["Row"];
type Category = Memory["category"];
type Kind = Memory["kind"];
type Profile = {
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
  updated_at: string;
};
type WorkspaceSignal = {
  source_type: Exclude<Memory["source_type"], "manual">;
  source_record_id: string;
  category: Category;
  kind: Kind;
  title: string;
  content: string;
  source_label: string;
  source_date: string;
  source_url: string;
  updated_at: string;
};

const categories: { value: Category; label: string; description: string }[] = [
  { value: "company", label: "Company", description: "What you are building, your stage, and how the business works." },
  { value: "customers", label: "Customers", description: "Who you serve, what they need, and what you still need to learn." },
  { value: "goals_metrics", label: "Goals & metrics", description: "Priorities, targets, baselines, and the time period they cover." },
  { value: "market", label: "Market", description: "Competitors, alternatives, regions, and market assumptions." },
  { value: "decisions", label: "Decisions", description: "Choices made, the reasoning behind them, and evidence considered." },
  { value: "current_work", label: "Current work", description: "Active experiments, ideas, commitments, and next steps." },
];

const kindLabels: Record<Kind, string> = { fact: "Known fact", assumption: "Assumption", open_question: "Open question" };
const emptyDraft = {
  category: "company" as Category,
  kind: "fact" as Kind,
  title: "",
  content: "",
  source_label: "Entered by you",
  source_date: "",
  source_url: "",
  include_in_ai: true,
};

async function loadWorkspaceSignals(userId: string): Promise<WorkspaceSignal[]> {
  const db = supabase as unknown as SupabaseClient;
  const [interviews, decisions, ideas, actions, pulses] = await Promise.all([
    db.from("discovery_interviews").select("id,interview_date,interviewee_label,segment,idea_or_assumption,notes,pain_points,evidence_direction,evidence_summary,updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(8),
    db.from("decision_journal").select("id,decision,rationale,alternatives,confidence,review_date,outcome,status,created_at,updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(8),
    db.from("product_ideas").select("id,title,description,status,updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(8),
    db.from("growth_actions").select("id,title,details,category,status,due_date,updated_at").eq("user_id", userId).in("status", ["Planned", "In Progress"]).order("updated_at", { ascending: false }).limit(8),
    db.from("founder_pulse_entries").select("id,week_start,goal,metric_name,metric_value,unit,note,updated_at").eq("user_id", userId).order("week_start", { ascending: false }).limit(8),
  ]);
  const interviewRows = (interviews.data ?? []) as { id: string; interview_date: string; interviewee_label: string; segment: string | null; idea_or_assumption: string; notes: string; pain_points: string[]; evidence_direction: string; evidence_summary: string | null; updated_at: string }[];
  const decisionRows = (decisions.data ?? []) as { id: string; decision: string; rationale: string; alternatives: string | null; confidence: number | null; review_date: string | null; outcome: string | null; status: string; created_at: string; updated_at: string }[];
  const ideaRows = (ideas.data ?? []) as { id: string; title: string; description: string; status: string | null; updated_at: string }[];
  const actionRows = (actions.data ?? []) as { id: string; title: string; details: string | null; category: string; status: string; due_date: string | null; updated_at: string }[];
  const pulseRows = (pulses.data ?? []) as { id: string; week_start: string; goal: string; metric_name: string; metric_value: number; unit: string | null; note: string | null; updated_at: string }[];
  const signals: WorkspaceSignal[] = [
    ...interviewRows.map((row) => ({ source_type: "discovery_interview" as const, source_record_id: row.id, category: "customers" as const, kind: "fact" as const, title: `${row.interviewee_label}${row.segment ? ` · ${row.segment}` : ""}`, content: [`Assumption explored: ${row.idea_or_assumption}`, `Evidence direction: ${row.evidence_direction}`, row.evidence_summary && `Evidence summary: ${row.evidence_summary}`, row.pain_points?.length && `Pain points: ${row.pain_points.join(", ")}`, row.notes && `Notes: ${row.notes}`].filter(Boolean).join("\n"), source_label: "Customer Discovery interview", source_date: row.interview_date, source_url: "/dashboard/customer-discovery", updated_at: row.updated_at })),
    ...decisionRows.map((row) => ({ source_type: "decision_journal" as const, source_record_id: row.id, category: "decisions" as const, kind: "fact" as const, title: row.decision, content: [`Rationale: ${row.rationale}`, row.alternatives && `Alternatives: ${row.alternatives}`, row.confidence !== null && `Confidence at the time: ${row.confidence}/5`, row.review_date && `Review date: ${row.review_date}`, `Review status: ${row.status}`, row.outcome && `Outcome: ${row.outcome}`].filter(Boolean).join("\n"), source_label: "Decision Journal", source_date: row.created_at.slice(0, 10), source_url: "/dashboard/decision-journal", updated_at: row.updated_at })),
    ...ideaRows.map((row) => ({ source_type: "product_idea" as const, source_record_id: row.id, category: "current_work" as const, kind: "assumption" as const, title: row.title, content: `Status: ${row.status || "Under consideration"}\n${row.description}`, source_label: "Product Ideas backlog", source_date: row.updated_at.slice(0, 10), source_url: "/dashboard/product-ideas", updated_at: row.updated_at })),
    ...actionRows.map((row) => ({ source_type: "growth_action" as const, source_record_id: row.id, category: "current_work" as const, kind: "fact" as const, title: row.title, content: [`Area: ${row.category}`, `Status: ${row.status}`, row.due_date && `Target date: ${row.due_date}`, row.details].filter(Boolean).join("\n"), source_label: "Growth Plan", source_date: row.updated_at.slice(0, 10), source_url: "/dashboard/growth-plan", updated_at: row.updated_at })),
    ...pulseRows.map((row) => ({ source_type: "founder_pulse" as const, source_record_id: row.id, category: "goals_metrics" as const, kind: "fact" as const, title: `${row.metric_name} · week of ${row.week_start}`, content: [`Goal: ${row.goal}`, `Recorded value: ${row.metric_value}${row.unit ? ` ${row.unit}` : ""}`, row.note].filter(Boolean).join("\n"), source_label: "Founder Pulse", source_date: row.week_start, source_url: "/dashboard/founder-pulse", updated_at: row.updated_at })),
  ];
  return signals.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

function getProfileFacts(profile: Profile | null) {
  if (!profile) return [] as { category: Category; title: string; content: string }[];
  const facts: { category: Category; title: string; content: string }[] = [];
  const add = (category: Category, title: string, content: string | null) => {
    if (content?.trim()) facts.push({ category, title, content: content.trim() });
  };
  add("company", "Company or project", profile.company_name);
  add("company", "Venture type", profile.company_type?.replaceAll("_", " ") ?? null);
  add("company", "Stage", profile.company_stage);
  add("company", "Industry", profile.industry);
  add("company", "What you offer", profile.product_or_service);
  add("company", "Team size", profile.team_size);
  add("company", "Monthly revenue range", profile.monthly_revenue_range);
  add("customers", "Target customer", profile.target_customer);
  add("goals_metrics", "90-day priority", profile.primary_goal);
  add("goals_metrics", "Current challenge", profile.biggest_challenge);
  return facts;
}

function safeExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export default function WorkspaceMemory() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [signals, setSignals] = useState<WorkspaceSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");
  const [draft, setDraft] = useState(emptyDraft);
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    const load = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        if (active) {
          toast({ title: "Could not open workspace memory", description: userError?.message ?? "Please sign in again.", variant: "destructive" });
          setLoading(false);
        }
        return;
      }
      if (active) setUserId(user.id);
      const [profileResult, memoryResult] = await Promise.all([
        supabase.from("profiles").select("company_name,company_type,company_stage,industry,product_or_service,target_customer,primary_goal,biggest_challenge,team_size,monthly_revenue_range,updated_at").eq("user_id", user.id).maybeSingle(),
        supabase.from("workspace_memories").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }),
      ]);
      if (!active) return;
      if (profileResult.error) toast({ title: "Could not load profile context", description: profileResult.error.message, variant: "destructive" });
      else setProfile(profileResult.data);
      if (memoryResult.error) toast({ title: "Could not load saved memories", description: `${memoryResult.error.message}. Apply the workspace-memory migration, then reload.`, variant: "destructive" });
      else setMemories(memoryResult.data ?? []);
      const sourceSignals = await loadWorkspaceSignals(user.id);
      if (active) setSignals(sourceSignals);
      setLoading(false);
      channel = supabase.channel(`workspace-memory-${user.id}`);
      channel.on("postgres_changes", { event: "*", schema: "public", table: "workspace_memories", filter: `user_id=eq.${user.id}` }, async () => {
          const { data } = await supabase.from("workspace_memories").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
          if (active && data) setMemories(data);
        });
      for (const table of ["profiles", "discovery_interviews", "decision_journal", "product_ideas", "growth_actions", "founder_pulse_entries"]) {
        channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `user_id=eq.${user.id}` }, async () => {
          const nextSignals = await loadWorkspaceSignals(user.id);
          if (active) setSignals(nextSignals);
          if (table === "profiles") {
            const { data } = await supabase.from("profiles").select("company_name,company_type,company_stage,industry,product_or_service,target_customer,primary_goal,biggest_challenge,team_size,monthly_revenue_range,updated_at").eq("user_id", user.id).maybeSingle();
            if (active && data) setProfile(data);
          }
        });
      }
      channel.subscribe();
    };
    void load();
    return () => { active = false; if (channel) void supabase.removeChannel(channel); };
  }, [toast]);

  const profileFacts = useMemo(() => getProfileFacts(profile), [profile]);
  const visibleMemories = useMemo(() => categoryFilter === "all" ? memories : memories.filter((item) => item.category === categoryFilter), [categoryFilter, memories]);
  const openCreate = (category?: Category) => {
    setEditingId(null);
    setDraft({ ...emptyDraft, category: category ?? "company" });
    setFormOpen(true);
  };
  const openEdit = (memory: Memory) => {
    setEditingId(memory.id);
    setDraft({ category: memory.category as Category, kind: memory.kind as Kind, title: memory.title, content: memory.content, source_label: memory.source_label, source_date: memory.source_date ?? "", source_url: memory.source_url ?? "", include_in_ai: memory.include_in_ai });
    setFormOpen(true);
  };
  const closeForm = () => { setFormOpen(false); setEditingId(null); setDraft(emptyDraft); };

  const saveMemory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId || !draft.title.trim() || !draft.content.trim()) return;
    setSaving(true);
    const payload = {
      category: draft.category,
      kind: draft.kind,
      title: draft.title.trim(),
      content: draft.content.trim(),
      source_label: draft.source_label.trim() || "Entered by you",
      source_date: draft.source_date || null,
      source_url: draft.source_url.trim() || null,
      include_in_ai: draft.include_in_ai,
      last_confirmed_at: new Date().toISOString(),
    };
    const result = editingId
      ? await supabase.from("workspace_memories").update(payload).eq("id", editingId).eq("user_id", userId).select("*").single()
      : await supabase.from("workspace_memories").insert({ ...payload, user_id: userId }).select("*").single();
    if (result.error) {
      toast({ title: "Could not save this memory", description: result.error.message, variant: "destructive" });
    } else {
      setMemories((current) => editingId ? current.map((item) => item.id === editingId ? result.data : item) : [result.data, ...current]);
      toast({ title: editingId ? "Memory updated" : "Memory saved", description: "Your workspace context is up to date." });
      closeForm();
    }
    setSaving(false);
  };

  const updateMemory = async (memory: Memory, changes: Partial<Memory>) => {
    const { data, error } = await supabase.from("workspace_memories").update(changes).eq("id", memory.id).eq("user_id", userId ?? "").select("*").single();
    if (error) toast({ title: "Could not update memory", description: error.message, variant: "destructive" });
    else setMemories((current) => current.map((item) => item.id === memory.id ? data : item));
  };

  const removeMemory = async (memory: Memory) => {
    const { error } = await supabase.from("workspace_memories").delete().eq("id", memory.id).eq("user_id", userId ?? "");
    if (error) toast({ title: "Could not remove memory", description: error.message, variant: "destructive" });
    else setMemories((current) => current.filter((item) => item.id !== memory.id));
  };

  const saveSourceAsMemory = async (signal: WorkspaceSignal) => {
    if (!userId) return;
    const existing = memories.find((item) => item.source_type === signal.source_type && item.source_record_id === signal.source_record_id);
    const payload = {
      category: signal.category,
      kind: signal.kind,
      title: signal.title,
      content: signal.content,
      source_type: signal.source_type,
      source_record_id: signal.source_record_id,
      source_label: signal.source_label,
      source_date: signal.source_date || null,
      source_url: signal.source_url,
      include_in_ai: existing?.include_in_ai ?? true,
      last_confirmed_at: new Date().toISOString(),
    };
    const result = existing
      ? await supabase.from("workspace_memories").update(payload).eq("id", existing.id).eq("user_id", userId).select("*").single()
      : await supabase.from("workspace_memories").insert({ ...payload, user_id: userId }).select("*").single();
    if (result.error) toast({ title: "Could not add this source to memory", description: result.error.message, variant: "destructive" });
    else {
      setMemories((current) => existing ? current.map((item) => item.id === existing.id ? result.data : item) : [result.data, ...current]);
      toast({ title: existing ? "Memory refreshed" : "Added to workspace memory", description: "You can edit it or turn off AI use below." });
    }
  };

  const isStale = (date: string) => Date.now() - new Date(date).getTime() > 90 * 24 * 60 * 60 * 1000;

  return <div>
    <PageHeader eyebrow="Your workspace context" title="Workspace memory" description="Review the facts, assumptions, and open questions Chanakya can use. You decide what is saved and what is shared with your advisors." action={<Button onClick={() => openCreate()} className="h-10 rounded-none bg-foreground px-4 text-background hover:bg-primary"><Plus className="mr-2 h-4 w-4" />Add a memory</Button>} />

    <section className="mb-7 grid gap-4 border border-border bg-card p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-5">
      <span className="grid h-10 w-10 place-items-center bg-foreground text-background"><BookOpenCheck size={18} className="text-primary" /></span>
      <div><h2 className="text-sm font-medium">A shared, editable picture of your work</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Company profile details appear here as source-linked context. Memories you add can be corrected, confirmed, or kept out of AI answers at any time.</p></div>
      <Link to="/dashboard/profile" className="editorial-link inline-flex items-center gap-1 text-xs">Edit company profile <ArrowUpRight size={13} /></Link>
    </section>

    {formOpen && <form onSubmit={saveMemory} className="mb-8 grid gap-5 border border-primary/35 bg-card p-5 sm:grid-cols-2 sm:p-6">
      <div className="flex items-start justify-between gap-4 sm:col-span-2"><div><p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">{editingId ? "Update workspace memory" : "Add to workspace memory"}</p><h2 className="mt-1 text-lg font-medium">Keep a useful signal close</h2></div><button type="button" onClick={closeForm} aria-label="Close memory form" className="p-1 text-muted-foreground hover:text-foreground"><X size={17} /></button></div>
      <div className="space-y-2"><Label htmlFor="memory-category">Category</Label><select id="memory-category" value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value as Category }))} className="h-10 w-full border border-input bg-background px-3 text-sm">{categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}</select></div>
      <div className="space-y-2"><Label htmlFor="memory-kind">This is a…</Label><select id="memory-kind" value={draft.kind} onChange={(event) => setDraft((current) => ({ ...current, kind: event.target.value as Kind }))} className="h-10 w-full border border-input bg-background px-3 text-sm"><option value="fact">Known fact</option><option value="assumption">Assumption to test</option><option value="open_question">Open question</option></select></div>
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="memory-title">Short title</Label><Input id="memory-title" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} maxLength={160} required placeholder="e.g. Most new customers come from referrals" /></div>
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="memory-content">What should Chanakya remember?</Label><Textarea id="memory-content" value={draft.content} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} maxLength={4000} required rows={4} placeholder="Add the detail, boundary, or nuance that will help future decisions…" /></div>
      <div className="space-y-2"><Label htmlFor="memory-source">Source</Label><Input id="memory-source" value={draft.source_label} onChange={(event) => setDraft((current) => ({ ...current, source_label: event.target.value }))} maxLength={160} placeholder="Entered by you, interview, report…" /></div>
      <div className="space-y-2"><Label htmlFor="memory-source-date">Source date (optional)</Label><Input id="memory-source-date" type="date" value={draft.source_date} onChange={(event) => setDraft((current) => ({ ...current, source_date: event.target.value }))} /></div>
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="memory-source-url">Source link (optional)</Label><Input id="memory-source-url" type="url" value={draft.source_url} onChange={(event) => setDraft((current) => ({ ...current, source_url: event.target.value }))} placeholder="https://…" /></div>
      <label className="flex items-start gap-3 text-sm sm:col-span-2"><input type="checkbox" checked={draft.include_in_ai} onChange={(event) => setDraft((current) => ({ ...current, include_in_ai: event.target.checked }))} className="mt-0.5 accent-[hsl(var(--primary))]" /><span><span className="font-medium">Use this memory in AI answers</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">Turn this off to keep it saved here without sharing it with advisors.</span></span></label>
      <div className="flex flex-wrap gap-2 sm:col-span-2"><Button type="submit" disabled={saving} className="h-10 rounded-none bg-primary px-4 text-primary-foreground hover:bg-primary/90">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingId ? "Save changes" : "Save memory"}</Button><Button type="button" variant="outline" onClick={closeForm} className="h-10 rounded-none">Cancel</Button></div>
    </form>}

    <section className="mb-9">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Already in your profile</p><h2 className="mt-1 text-xl font-medium">Company context</h2></div><span className="text-xs text-muted-foreground">Source: your profile</span></div>
      {loading ? <div className="grid min-h-32 place-items-center border border-border"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> : profileFacts.length ? <div className="grid border-l border-t border-border sm:grid-cols-2 xl:grid-cols-3">
        {profileFacts.map((fact) => <article key={fact.title} className="border-b border-r border-border bg-background p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{categories.find((item) => item.value === fact.category)?.label}</span><span className="text-[10px] text-muted-foreground">Profile</span></div><h3 className="mt-3 text-sm font-medium">{fact.title}</h3><p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{fact.content}</p></article>)}
      </div> : <div className="border border-dashed border-border p-6 text-sm text-muted-foreground">Your profile is empty. Add company details to help advisors understand your starting point.</div>}
      {profile?.updated_at && <p className="mt-2 text-[11px] text-muted-foreground">Profile context last updated {formatDistanceToNow(new Date(profile.updated_at), { addSuffix: true })}. <Link to="/dashboard/profile" className="underline underline-offset-2">Review it</Link></p>}
    </section>

    <section className="mb-9">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Connected workspace sources</p><h2 className="mt-1 text-xl font-medium">Recent signals you can remember</h2></div><span className="text-xs text-muted-foreground">Promote only the context you want advisors to use</span></div>
      {loading ? <div className="grid min-h-28 place-items-center border border-border"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> : !signals.filter((signal) => categoryFilter === "all" || signal.category === categoryFilter).length ? <div className="border border-dashed border-border p-5 text-sm text-muted-foreground">No recent source records in this category yet. Add an interview, decision, idea, action, or weekly metric in its tool and it will appear here.</div> : <div className="grid gap-3 lg:grid-cols-2">
        {signals.filter((signal) => categoryFilter === "all" || signal.category === categoryFilter).map((signal) => {
          const existing = memories.find((item) => item.source_type === signal.source_type && item.source_record_id === signal.source_record_id);
          const sourceChanged = Boolean(existing && new Date(signal.updated_at) > new Date(existing.last_confirmed_at));
          return <article key={`${signal.source_type}-${signal.source_record_id}`} className="flex min-w-0 flex-col justify-between gap-4 border border-border bg-card p-4 sm:p-5">
            <div><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[10px] font-medium uppercase tracking-[0.12em] text-primary">{categories.find((item) => item.value === signal.category)?.label}</span><span className="text-[10px] text-muted-foreground">{signal.source_label} · {format(new Date(`${signal.source_date}T00:00:00`), "MMM d, yyyy")}</span></div><h3 className="mt-2 text-sm font-medium">{signal.title}</h3><p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{signal.content}</p></div>
            <div className="flex items-center justify-between gap-3 border-t border-border pt-3"><Link to={signal.source_url} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">Open source <ArrowUpRight size={11} /></Link><button type="button" onClick={() => void saveSourceAsMemory(signal)} className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-primary">{existing && !sourceChanged ? <><Check size={13} />In memory</> : existing ? <><RefreshCw size={12} />Refresh memory</> : <><Plus size={13} />Add to memory</>}</button></div>
          </article>;
        })}
      </div>}
    </section>

    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Founder-managed signals</p><h2 className="mt-1 text-xl font-medium">Saved memories <span className="text-sm font-normal text-muted-foreground">{memories.length}</span></h2></div><select aria-label="Filter memories by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as Category | "all")} className="h-9 border border-input bg-background px-3 text-xs"><option value="all">All categories</option>{categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}</select></div>
      {loading ? <div className="grid min-h-36 place-items-center border border-border"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> : !visibleMemories.length ? <div className="flex min-h-56 flex-col items-center justify-center border border-dashed border-border px-6 text-center"><span className="grid h-10 w-10 place-items-center bg-secondary"><Lightbulb size={17} className="text-primary" /></span><h3 className="mt-4 text-base font-medium">Nothing saved here yet</h3><p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">Capture a customer signal, a market assumption, a decision, or anything you want your advisors to remember.</p><Button type="button" variant="outline" onClick={() => openCreate(categoryFilter === "all" ? undefined : categoryFilter)} className="mt-4 h-9 rounded-none"><Plus className="mr-2 h-4 w-4" />Add a memory</Button></div> : <div className="space-y-3">
        {visibleMemories.map((memory) => {
          const stale = isStale(memory.last_confirmed_at);
          const category = categories.find((item) => item.value === memory.category);
          return <article key={memory.id} className="border border-border bg-background p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-medium uppercase tracking-[0.12em] text-primary">{category?.label}</span><span className="border border-border px-2 py-0.5 text-[10px] text-muted-foreground">{kindLabels[memory.kind as Kind]}</span>{stale && <span className="bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-800">Review this</span>}</div><h3 className="mt-2 text-base font-medium">{memory.title}</h3><p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{memory.content}</p></div><div className="flex shrink-0 items-center gap-1"><button type="button" onClick={() => openEdit(memory)} className="px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground">Edit</button><button type="button" onClick={() => void removeMemory(memory)} aria-label={`Delete memory: ${memory.title}`} className="grid h-8 w-8 place-items-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={14} /></button></div></div>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3 text-[11px] text-muted-foreground"><span>Source: {memory.source_label}</span>{memory.source_date && <span>Source date: {format(new Date(`${memory.source_date}T00:00:00`), "MMM d, yyyy")}</span>}<span className="inline-flex items-center gap-1"><Clock3 size={11} />Confirmed {formatDistanceToNow(new Date(memory.last_confirmed_at), { addSuffix: true })}</span>{memory.source_url && (memory.source_url.startsWith("/") ? <Link to={memory.source_url} className="inline-flex items-center gap-1 underline underline-offset-2">Open source <ArrowUpRight size={11} /></Link> : safeExternalUrl(memory.source_url) ? <a href={memory.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2">Open source <ArrowUpRight size={11} /></a> : null)}
              <label className="ml-auto inline-flex items-center gap-2"><input type="checkbox" checked={memory.include_in_ai} onChange={(event) => void updateMemory(memory, { include_in_ai: event.target.checked })} className="accent-[hsl(var(--primary))]" />Use in AI answers</label>
              {stale && <button type="button" onClick={() => void updateMemory(memory, { last_confirmed_at: new Date().toISOString() })} className="inline-flex items-center gap-1 text-foreground hover:text-primary"><RefreshCw size={11} />Still current</button>}
            </div>
          </article>;
        })}
      </div>}
    </section>

    <section className="mt-8 flex items-start gap-3 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground"><CircleHelp size={15} className="mt-0.5 shrink-0 text-primary" /><p>Profile details and memories marked “Use in AI answers” may be included as background in advisor requests. Memories are private to your account. You can edit, remove, or exclude them whenever they change.</p></section>
  </div>;
}
