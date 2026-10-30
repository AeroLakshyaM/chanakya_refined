import { useCallback, useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNow, isBefore, startOfToday } from "date-fns";
import { ArrowRight, CalendarDays, Check, Circle, CirclePlus, Compass, Loader2, Plus, Target, Trash2, X } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

type GrowthAction = Database["public"]["Tables"]["growth_actions"]["Row"];
const categories = ["Customers", "Product", "Revenue", "Operations", "Team", "Focus"];
const statusOptions = ["Planned", "In Progress", "Done"];
const starterActions = [
  { title: "Talk with five target customers", category: "Customers", details: "Ask about the last time they faced this problem and what they tried." },
  { title: "Map the alternatives customers use", category: "Customers", details: "Include direct competitors, workarounds, and doing nothing." },
  { title: "Run one small test of the core offer", category: "Product", details: "Choose the smallest test that could change your next decision." },
];

export default function GrowthPlan() {
  const [actions, setActions] = useState<GrowthAction[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [northStar, setNorthStar] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [filter, setFilter] = useState("All");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [category, setCategory] = useState("Focus");
  const [dueDate, setDueDate] = useState("");
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      toast({ title: "Could not open your plan", description: authError?.message ?? "Please sign in again.", variant: "destructive" });
      setLoading(false);
      return;
    }
    setUserId(user.id);
    const [planResult, profileResult] = await Promise.all([
      supabase.from("growth_actions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("profiles").select("primary_goal").eq("user_id", user.id).maybeSingle(),
    ]);
    if (planResult.error) toast({ title: "Could not load your growth plan", description: planResult.error.message, variant: "destructive" });
    else setActions(planResult.data ?? []);
    if (profileResult.error) toast({ title: "Could not load your north star", description: profileResult.error.message, variant: "destructive" });
    else setNorthStar(profileResult.data?.primary_goal ?? "");
    setLoading(false);
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => ({
    planned: actions.filter((action) => action.status === "Planned").length,
    active: actions.filter((action) => action.status === "In Progress").length,
    done: actions.filter((action) => action.status === "Done").length,
  }), [actions]);
  const completion = actions.length ? Math.round((counts.done / actions.length) * 100) : 0;
  const visibleActions = filter === "All" ? actions : actions.filter((action) => action.status === filter);

  const createAction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId || !title.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from("growth_actions").insert({
      user_id: userId,
      title: title.trim(),
      details: details.trim() || null,
      category,
      due_date: dueDate || null,
      status: "Planned",
    }).select("*").single();
    if (error) toast({ title: "Could not save this action", description: error.message, variant: "destructive" });
    else {
      setActions((current) => [data, ...current]);
      setTitle(""); setDetails(""); setCategory("Focus"); setDueDate(""); setFormOpen(false);
      toast({ title: "Action added", description: "Your next step is in the growth plan." });
    }
    setSaving(false);
  };

  const addStarter = async (starter: typeof starterActions[number]) => {
    if (!userId) return;
    const date = new Date();
    date.setDate(date.getDate() + 7);
    const { data, error } = await supabase.from("growth_actions").insert({
      user_id: userId,
      title: starter.title,
      details: starter.details,
      category: starter.category,
      due_date: format(date, "yyyy-MM-dd"),
      status: "Planned",
    }).select("*").single();
    if (error) toast({ title: "Could not add this starter action", description: error.message, variant: "destructive" });
    else setActions((current) => [data, ...current]);
  };

  const changeStatus = async (action: GrowthAction, status: string) => {
    const { data, error } = await supabase.from("growth_actions").update({ status }).eq("id", action.id).select("*").single();
    if (error) toast({ title: "Could not update this action", description: error.message, variant: "destructive" });
    else setActions((current) => current.map((item) => item.id === action.id ? data : item));
  };

  const removeAction = async (action: GrowthAction) => {
    const { error } = await supabase.from("growth_actions").delete().eq("id", action.id);
    if (error) toast({ title: "Could not remove this action", description: error.message, variant: "destructive" });
    else setActions((current) => current.filter((item) => item.id !== action.id));
  };

  return <div>
    <PageHeader eyebrow="Make progress" title="Your growth plan" description="Turn the goal you chose into small, trackable actions. Keep the plan honest, useful, and yours." action={<Button onClick={() => setFormOpen((open) => !open)} className="h-11 rounded-none bg-foreground px-4 text-background hover:bg-foreground/85">{formOpen ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}{formOpen ? "Close form" : "Add an action"}</Button>} />

    <section className="mb-7 grid gap-px border border-border bg-border sm:grid-cols-3" aria-label="Plan progress">
      <PlanStat label="Planned" count={counts.planned} note="Not started yet" />
      <PlanStat label="In motion" count={counts.active} note="Work underway" />
      <div className="bg-background p-5"><div className="flex items-center justify-between"><p className="text-xs font-medium uppercase tracking-[0.13em] text-muted-foreground">Completed</p><span className="text-xs tabular-nums text-primary">{completion}%</span></div><p className="mt-3 text-3xl font-medium tracking-tight">{counts.done}<span className="ml-1 text-sm font-normal text-muted-foreground">actions</span></p><div className="mt-3 h-1.5 bg-secondary"><div className="h-full bg-primary transition-[width] duration-500" style={{ width: `${completion}%` }} /></div></div>
    </section>

    <section className="mb-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex items-start gap-4 border border-border bg-card p-5 sm:p-6"><span className="grid h-10 w-10 shrink-0 place-items-center bg-foreground text-background"><Target size={18} className="text-primary" /></span><div className="min-w-0"><p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Your 90-day north star</p><h2 className="mt-2 text-xl font-medium tracking-tight">{northStar || "Choose a priority to give your plan direction"}</h2>{!northStar && <p className="mt-2 text-sm text-muted-foreground">Update your company profile to set a focus for this quarter.</p>}</div></div>
      <div className="flex items-start gap-3 border border-border bg-background p-5"><Compass size={17} className="mt-0.5 shrink-0 text-primary" /><p className="text-sm leading-relaxed text-muted-foreground">A plan is a set of bets, not a promise. Review what you learn and change course when the evidence points somewhere new.</p></div>
    </section>

    {formOpen && <form onSubmit={createAction} className="mb-8 grid gap-5 border border-border bg-card p-5 sm:grid-cols-2 sm:p-6"><div className="sm:col-span-2"><h2 className="text-lg font-medium">Add a founder action</h2><p className="mt-1 text-sm text-muted-foreground">Write one concrete step you can take, then track what happens.</p></div><div className="space-y-2"><Label htmlFor="growth-title">Action</Label><Input id="growth-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} required autoFocus placeholder="e.g. Interview five target customers" /></div><div className="space-y-2"><Label>Area</Label><Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="growth-details">What will you learn or move forward?</Label><Textarea id="growth-details" value={details} onChange={(event) => setDetails(event.target.value)} rows={2} maxLength={1000} placeholder="Add a little context or a success signal…" /></div><div className="space-y-2"><Label htmlFor="growth-due-date">Target date (optional)</Label><Input id="growth-due-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></div><div className="flex items-end sm:justify-end"><Button type="submit" disabled={saving} className="h-10 w-full rounded-none bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CirclePlus className="mr-2 h-4 w-4" />}Save action</Button></div></form>}

    <div className="mb-4 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">The work</p><h2 className="mt-1 text-xl font-medium">{loading ? "Loading plan…" : `${actions.length} ${actions.length === 1 ? "action" : "actions"}`}</h2></div><div className="flex gap-1 border border-border p-1">{["All", ...statusOptions].map((option) => <button key={option} type="button" onClick={() => setFilter(option)} className={`px-3 py-1.5 text-xs transition-colors ${filter === option ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>{option}</button>)}</div></div>

    {loading ? <div className="flex min-h-52 items-center justify-center border border-border"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> : actions.length === 0 ? <div className="border border-dashed border-border p-6 sm:p-8"><div className="mx-auto max-w-xl text-center"><span className="mx-auto grid h-11 w-11 place-items-center bg-secondary"><Target size={18} className="text-primary" /></span><h3 className="mt-4 text-xl font-medium tracking-tight">Give your goal a first move</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Pick one small action that will teach you something useful about your customers, product, or growth.</p><Button onClick={() => setFormOpen(true)} className="mt-5 rounded-none bg-foreground text-background hover:bg-foreground/85"><Plus className="mr-2 h-4 w-4" />Write my first action</Button></div><div className="mx-auto mt-8 grid max-w-4xl gap-2 md:grid-cols-3">{starterActions.map((starter) => <button key={starter.title} type="button" onClick={() => void addStarter(starter)} className="group flex items-center justify-between gap-3 border border-border bg-background p-4 text-left text-sm transition-colors hover:border-primary/60"><span>{starter.title}</span><ArrowRight size={14} className="shrink-0 text-muted-foreground group-hover:text-primary" /></button>)}</div></div> : visibleActions.length === 0 ? <div className="border border-border px-6 py-16 text-center text-sm text-muted-foreground">Nothing in this status yet.</div> : <div className="divide-y divide-border border-y border-border">{visibleActions.map((action) => {
      const overdue = action.due_date && action.status !== "Done" && isBefore(new Date(`${action.due_date}T00:00:00`), startOfToday());
      return <article key={action.id} className="grid gap-4 py-5 sm:grid-cols-[36px_minmax(0,1fr)_180px_36px] sm:items-start">
        <span className={`mt-1 grid h-8 w-8 place-items-center ${action.status === "Done" ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}>{action.status === "Done" ? <Check size={15} /> : <Circle size={13} />}</span>
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className={`text-base font-medium ${action.status === "Done" ? "text-muted-foreground line-through" : ""}`}>{action.title}</h3><span className="border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{action.category}</span></div>{action.details && <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{action.details}</p>}<div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">{action.due_date && <span className={`flex items-center gap-1 ${overdue ? "font-medium text-destructive" : ""}`}><CalendarDays size={13} />{overdue ? "Past target · " : "Target · "}{format(new Date(`${action.due_date}T00:00:00`), "MMM d, yyyy")}</span>}<span>Added {formatDistanceToNow(new Date(action.created_at), { addSuffix: true })}</span></div></div>
        <Select value={action.status} onValueChange={(status) => void changeStatus(action, status)}><SelectTrigger aria-label={`Change status for ${action.title}`} className="h-9 w-full rounded-none"><SelectValue /></SelectTrigger><SelectContent>{statusOptions.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select>
        <button type="button" onClick={() => void removeAction(action)} aria-label={`Remove ${action.title}`} className="grid h-9 w-9 place-items-center text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"><Trash2 size={15} /></button>
      </article>;
    })}</div>}
  </div>;
}

function PlanStat({ label, count, note }: { label: string; count: number; note: string }) {
  return <div className="bg-background p-5"><p className="text-xs font-medium uppercase tracking-[0.13em] text-muted-foreground">{label}</p><p className="mt-3 text-3xl font-medium tracking-tight">{count}</p><p className="mt-1 text-xs text-muted-foreground">{note}</p></div>;
}
