import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format, isBefore, startOfToday } from "date-fns";
import { ArrowRight, ArrowUpRight, CalendarClock, Check, Loader2, Plus, Scale, Trash2 } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const db = supabase as any;
type Decision = { id: string; decision: string; rationale: string; alternatives: string | null; assumptions: string | null; expected_outcome: string | null; linked_idea_id: string | null; linked_interview_id: string | null; confidence: number | null; review_date: string | null; outcome: string | null; status: string; created_at: string };
type Source = { id: string; label: string };

export default function DecisionJournal() {
  const [rows, setRows] = useState<Decision[]>([]);
  const [ideas, setIdeas] = useState<Source[]>([]);
  const [interviews, setInterviews] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [decision, setDecision] = useState("");
  const [rationale, setRationale] = useState("");
  const [alternatives, setAlternatives] = useState("");
  const [assumptions, setAssumptions] = useState("");
  const [expectedOutcome, setExpectedOutcome] = useState("");
  const [confidence, setConfidence] = useState("3");
  const [reviewDate, setReviewDate] = useState("");
  const [linkedIdeaId, setLinkedIdeaId] = useState("");
  const [linkedInterviewId, setLinkedInterviewId] = useState("");
  const [outcomes, setOutcomes] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const [decisions, ideaRows, interviewRows] = await Promise.all([
      db.from("decision_journal").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      db.from("product_ideas").select("id,title").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
      db.from("discovery_interviews").select("id,interviewee_label,segment").eq("user_id", user.id).order("interview_date", { ascending: false }).limit(100),
    ]);
    if (decisions.error) toast({ title: "Could not load decisions", description: "Apply the connected-workspace migration, then reload.", variant: "destructive" });
    else setRows((decisions.data ?? []) as Decision[]);
    setIdeas((ideaRows.data ?? []).map((row: { id: string; title: string }) => ({ id: row.id, label: row.title })));
    setInterviews((interviewRows.data ?? []).map((row: { id: string; interviewee_label: string; segment: string | null }) => ({ id: row.id, label: `${row.interviewee_label}${row.segment ? ` · ${row.segment}` : ""}` })));
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await db.from("decision_journal").insert({ user_id: user.id, decision: decision.trim(), rationale: rationale.trim(), alternatives: alternatives.trim() || null, assumptions: assumptions.trim() || null, expected_outcome: expectedOutcome.trim() || null, confidence: Number(confidence), review_date: reviewDate || null, linked_idea_id: linkedIdeaId || null, linked_interview_id: linkedInterviewId || null });
    setSaving(false);
    if (error) { toast({ title: "Could not save decision", description: error.message, variant: "destructive" }); return; }
    setDecision(""); setRationale(""); setAlternatives(""); setAssumptions(""); setExpectedOutcome(""); setReviewDate(""); setConfidence("3"); setLinkedIdeaId(""); setLinkedInterviewId(""); setFormOpen(false); await load();
  };
  const review = async (row: Decision) => {
    const outcome = outcomes[row.id]?.trim();
    if (!outcome) { toast({ title: "Add what you learned", description: "A short outcome note makes the review useful." }); return; }
    const { error } = await db.from("decision_journal").update({ outcome, status: "Reviewed" }).eq("id", row.id);
    if (error) toast({ title: "Could not save review", description: error.message, variant: "destructive" }); else await load();
  };
  const remove = async (id: string) => { const { error } = await db.from("decision_journal").delete().eq("id", id); if (error) toast({ title: "Could not remove decision", description: error.message, variant: "destructive" }); else setRows((current) => current.filter((row) => row.id !== id)); };
  const due = rows.filter((row) => row.status !== "Reviewed" && row.review_date && isBefore(new Date(`${row.review_date}T00:00:00`), startOfToday()));

  return <div>
    <PageHeader eyebrow="Make learning visible" title="Decision journal" description="Record the call, what you expected, which assumptions it rested on, and when to check the outcome." action={<Button onClick={() => setFormOpen((open) => !open)} className="rounded-none bg-foreground text-background"><Plus className="mr-2 h-4 w-4" />Record a decision</Button>} />
    <section className="mb-6 grid gap-px border border-border bg-border sm:grid-cols-3"><JournalStat label="Decisions recorded" value={rows.length} /><JournalStat label="Ready to review" value={due.length} /><JournalStat label="Reviewed" value={rows.filter((row) => row.status === "Reviewed").length} /></section>
    <div className="mb-7 flex gap-3 border border-border bg-secondary/35 p-4"><Scale className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p className="text-sm leading-relaxed text-muted-foreground">A good decision can have a bad outcome, and vice versa. The review is about learning from the information you had—not judging the result alone.</p></div>
    {formOpen && <form onSubmit={save} className="mb-8 grid gap-5 border border-border bg-card p-5 sm:grid-cols-2 sm:p-6">
      <div className="sm:col-span-2"><h2 className="text-lg font-medium">What are you deciding?</h2><p className="mt-1 text-sm text-muted-foreground">Save the reasoning now so you can compare it with what you learn later.</p></div>
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="decision-title">Decision</Label><Input id="decision-title" value={decision} onChange={(event) => setDecision(event.target.value)} required maxLength={240} placeholder="We will focus on…" /></div>
      <div className="space-y-2"><Label htmlFor="decision-why">Reasoning and evidence</Label><Textarea id="decision-why" value={rationale} onChange={(event) => setRationale(event.target.value)} required rows={4} maxLength={4000} placeholder="What do you know? What evidence points this way?" /></div>
      <div className="space-y-2"><Label htmlFor="decision-assumptions">Assumptions and unknowns</Label><Textarea id="decision-assumptions" value={assumptions} onChange={(event) => setAssumptions(event.target.value)} rows={4} maxLength={2400} placeholder="What needs to be true for this to work?" /></div>
      <div className="space-y-2"><Label htmlFor="decision-alts">Alternatives considered</Label><Textarea id="decision-alts" value={alternatives} onChange={(event) => setAlternatives(event.target.value)} rows={3} maxLength={2400} placeholder="What else could you do, including waiting?" /></div>
      <div className="space-y-2"><Label htmlFor="decision-prediction">Expected outcome</Label><Textarea id="decision-prediction" value={expectedOutcome} onChange={(event) => setExpectedOutcome(event.target.value)} rows={3} maxLength={1200} placeholder="What do you expect to see by the review date?" /></div>
      <div className="space-y-2"><Label htmlFor="decision-confidence">Confidence at the time (1–5)</Label><Input id="decision-confidence" type="number" min="1" max="5" value={confidence} onChange={(event) => setConfidence(event.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="decision-review">Review on</Label><Input id="decision-review" type="date" value={reviewDate} onChange={(event) => setReviewDate(event.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="decision-idea">Related product idea</Label><select id="decision-idea" value={linkedIdeaId} onChange={(event) => setLinkedIdeaId(event.target.value)} className="h-10 w-full border border-input bg-background px-3 text-sm"><option value="">No idea linked</option>{ideas.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
      <div className="space-y-2"><Label htmlFor="decision-interview">Related customer interview</Label><select id="decision-interview" value={linkedInterviewId} onChange={(event) => setLinkedInterviewId(event.target.value)} className="h-10 w-full border border-input bg-background px-3 text-sm"><option value="">No interview linked</option>{interviews.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
      <div className="sm:col-span-2"><Button type="submit" disabled={saving} className="rounded-none bg-primary text-primary-foreground">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save decision</Button></div>
    </form>}
    {loading ? <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div> : rows.length ? <div className="space-y-4">{rows.map((row) => {
      const overdue = row.status !== "Reviewed" && row.review_date && isBefore(new Date(`${row.review_date}T00:00:00`), startOfToday());
      return <article key={row.id} className="border border-border bg-background p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-medium">{row.decision}</h2><span className={`px-2 py-1 text-[10px] uppercase tracking-wide ${row.status === "Reviewed" ? "bg-emerald-500/10 text-emerald-700" : "bg-secondary text-muted-foreground"}`}>{row.status}</span></div><p className="mt-1 text-xs text-muted-foreground">Recorded {format(new Date(row.created_at), "MMM d, yyyy")} {row.confidence && `· Confidence ${row.confidence}/5`}</p></div><button type="button" onClick={() => void remove(row.id)} aria-label="Delete decision" className="p-2 text-muted-foreground hover:text-destructive"><Trash2 size={15} /></button></div>
        <div className="mt-4 grid gap-4 md:grid-cols-2"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Why this made sense</p><p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{row.rationale}</p></div>{row.alternatives && <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Other paths</p><p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{row.alternatives}</p></div>}</div>
        {row.assumptions && <p className="mt-3 text-sm"><span className="text-xs uppercase tracking-wide text-muted-foreground">Assumptions · </span>{row.assumptions}</p>}{row.expected_outcome && <p className="mt-2 text-sm"><span className="text-xs uppercase tracking-wide text-muted-foreground">Expected · </span>{row.expected_outcome}</p>}
        {(row.linked_idea_id || row.linked_interview_id) && <div className="mt-3 flex flex-wrap gap-4 text-xs">{row.linked_idea_id && <Link to="/dashboard/product-ideas" className="inline-flex items-center gap-1 text-primary">Related idea <ArrowUpRight size={12} /></Link>}{row.linked_interview_id && <Link to="/dashboard/customer-discovery" className="inline-flex items-center gap-1 text-primary">Customer evidence <ArrowUpRight size={12} /></Link>}</div>}
        {row.review_date && <p className={`mt-4 flex items-center gap-2 text-xs ${overdue ? "text-primary" : "text-muted-foreground"}`}><CalendarClock size={14} />Review {overdue ? "was due" : "on"} {format(new Date(`${row.review_date}T00:00:00`), "MMM d, yyyy")}</p>}
        {row.status === "Reviewed" ? <div className="mt-4 border-l-2 border-emerald-600 pl-3"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">What happened</p><p className="mt-1 text-sm leading-relaxed">{row.outcome}</p></div> : <div className="mt-4 flex flex-col gap-2 sm:flex-row"><Input aria-label="Outcome note" value={outcomes[row.id] ?? ""} onChange={(event) => setOutcomes((state) => ({ ...state, [row.id]: event.target.value }))} placeholder="When reviewing, what happened compared with your expectation?" maxLength={2000} /><Button type="button" variant="outline" className="shrink-0 rounded-none" onClick={() => void review(row)}><Check className="mr-2 h-4 w-4" />Save review</Button></div>}
      </article>;
    })}</div> : <div className="border border-dashed border-border p-12 text-center"><Scale className="mx-auto h-6 w-6 text-primary" /><h3 className="mt-4 text-lg font-medium">Make your next big call learnable</h3><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">A short note now makes it easier to learn from the result later.</p><Button onClick={() => setFormOpen(true)} variant="outline" className="mt-5 rounded-none">Record your first decision <ArrowRight className="ml-2 h-4 w-4" /></Button></div>}
  </div>;
}

function JournalStat({ label, value }: { label: string; value: number }) { return <div className="bg-background p-5"><p className="text-xs uppercase tracking-[0.13em] text-muted-foreground">{label}</p><p className="mt-3 text-3xl font-medium">{value}</p></div>; }
