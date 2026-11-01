import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpRight, CirclePlus, Lightbulb, Loader2, Plus, X } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

type Idea = Database["public"]["Tables"]["product_ideas"]["Row"];
type RichIdea = Idea & { problem: string | null; target_customer: string | null; evidence_summary: string | null; expected_outcome: string | null; risk_notes: string | null; effort_rating: number; impact_rating: number; confidence_rating: number; source_interview_id: string | null; source_market_brief_id: string | null };
type EvidenceOption = { id: string; title: string; date: string };
const db = supabase as unknown as SupabaseClient;
const statuses = ["Under Consideration", "In Progress", "Planned"];

export default function ProductIdeas() {
  const [ideas, setIdeas] = useState<RichIdea[]>([]);
  const [interviews, setInterviews] = useState<EvidenceOption[]>([]);
  const [briefs, setBriefs] = useState<EvidenceOption[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [problem, setProblem] = useState("");
  const [targetCustomer, setTargetCustomer] = useState("");
  const [evidenceSummary, setEvidenceSummary] = useState("");
  const [expectedOutcome, setExpectedOutcome] = useState("");
  const [riskNotes, setRiskNotes] = useState("");
  const [effort, setEffort] = useState("3");
  const [impact, setImpact] = useState("3");
  const [confidence, setConfidence] = useState("3");
  const [sourceInterviewId, setSourceInterviewId] = useState("");
  const [sourceBriefId, setSourceBriefId] = useState("");
  const { toast } = useToast();

  const loadIdeas = useCallback(async () => {
    setLoading(true);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      toast({ title: "Could not load your workspace", description: userError?.message ?? "Sign in and try again.", variant: "destructive" });
      setLoading(false);
      return;
    }
    setUserId(user.id);
    const [ideasResult, interviewsResult, briefsResult] = await Promise.all([
      db.from("product_ideas").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      db.from("discovery_interviews").select("id,interviewee_label,segment,interview_date").eq("user_id", user.id).order("interview_date", { ascending: false }).limit(100),
      db.from("market_briefs").select("id,market,version,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
    ]);
    if (ideasResult.error) toast({ title: "Could not load ideas", description: ideasResult.error.message, variant: "destructive" });
    else setIdeas((ideasResult.data ?? []) as RichIdea[]);
    setInterviews((interviewsResult.data ?? []).map((row: { id: string; interviewee_label: string; segment: string | null; interview_date: string }) => ({ id: row.id, title: `${row.interviewee_label}${row.segment ? ` · ${row.segment}` : ""}`, date: row.interview_date })));
    setBriefs((briefsResult.data ?? []).map((row: { id: string; market: string; version: number; created_at: string }) => ({ id: row.id, title: `${row.market} · v${row.version}`, date: row.created_at.slice(0, 10) })));
    setLoading(false);
  }, [toast]);

  useEffect(() => { void loadIdeas(); }, [loadIdeas]);

  const createIdea = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) return;
    setSaving(true);
    const parsedTags = tags.split(",").map((tag) => tag.trim()).filter(Boolean);
    const { data, error } = await db.from("product_ideas").insert({
      user_id: userId,
      title: title.trim(),
      description: description.trim(),
      tags: parsedTags,
      status: "Under Consideration",
      problem: problem.trim() || null,
      target_customer: targetCustomer.trim() || null,
      evidence_summary: evidenceSummary.trim() || null,
      expected_outcome: expectedOutcome.trim() || null,
      risk_notes: riskNotes.trim() || null,
      effort_rating: Number(effort),
      impact_rating: Number(impact),
      confidence_rating: Number(confidence),
      source_interview_id: sourceInterviewId || null,
      source_market_brief_id: sourceBriefId || null,
    }).select("*").single();
    if (error) toast({ title: "Could not save idea", description: error.message, variant: "destructive" });
    else {
      setIdeas((current) => [data as RichIdea, ...current]);
      setTitle(""); setDescription(""); setTags(""); setProblem(""); setTargetCustomer(""); setEvidenceSummary(""); setExpectedOutcome(""); setRiskNotes(""); setEffort("3"); setImpact("3"); setConfidence("3"); setSourceInterviewId(""); setSourceBriefId(""); setFormOpen(false);
      toast({ title: "Idea added", description: "It’s now in your product backlog." });
    }
    setSaving(false);
  };

  const updateStatus = async (idea: Idea, status: string) => {
    const { data, error } = await db.from("product_ideas").update({ status }).eq("id", idea.id).select("*").single();
    if (error) toast({ title: "Could not update status", description: error.message, variant: "destructive" });
    else setIdeas((current) => current.map((item) => item.id === idea.id ? data as RichIdea : item));
  };

  const createGrowthAction = async (idea: RichIdea) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await db.from("growth_actions").insert({ user_id: user.id, title: `Test: ${idea.title}`, details: idea.problem ? `Problem: ${idea.problem}\n${idea.description}` : idea.description, expected_outcome: idea.expected_outcome, definition_of_done: idea.expected_outcome ? `Record whether this outcome was observed: ${idea.expected_outcome}` : "Record what you learned and the next decision.", category: "Product", linked_idea_id: idea.id, due_date: null, status: "Planned" }).select("id").single();
    if (error) toast({ title: "Could not add a growth action", description: error.message, variant: "destructive" });
    else { await updateStatus(idea, "In Progress"); toast({ title: "Test added to your Growth Plan", description: data?.id ? "The action is linked to this idea." : "Your next step is ready." }); }
  };

  return <div>
    <PageHeader eyebrow="Product direction" title="Ideas worth pursuing" description="Keep promising opportunities together, give each one a clear status, and build a product backlog your team can act on." action={<Button onClick={() => setFormOpen((open) => !open)} className="h-11 rounded-none bg-foreground px-4 text-background hover:bg-foreground/85">{formOpen ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}{formOpen ? "Close form" : "Add an idea"}</Button>} />
    {formOpen && <form onSubmit={createIdea} className="mb-8 grid gap-5 border border-border bg-card p-5 sm:grid-cols-2 sm:p-6"><div className="sm:col-span-2"><h2 className="text-lg font-medium">Capture a product opportunity</h2><p className="mt-1 text-sm text-muted-foreground">Keep the customer problem and evidence beside the idea so priority stays explainable.</p></div>
      <div className="space-y-2"><Label htmlFor="idea-title">Idea title</Label><Input id="idea-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required placeholder="What could you build or improve?" /></div>
      <div className="space-y-2"><Label htmlFor="idea-tags">Tags <span className="font-normal text-muted-foreground">(comma separated)</span></Label><Input id="idea-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Growth, onboarding, retention" /></div>
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="idea-problem">Customer problem</Label><Textarea id="idea-problem" value={problem} onChange={(e) => setProblem(e.target.value)} rows={2} placeholder="What is hard for the customer today?" /></div>
      <div className="space-y-2"><Label htmlFor="idea-customer">Target customer</Label><Input id="idea-customer" value={targetCustomer} onChange={(e) => setTargetCustomer(e.target.value)} placeholder="Who is this for?" /></div>
      <div className="space-y-2"><Label htmlFor="idea-outcome">Expected outcome</Label><Input id="idea-outcome" value={expectedOutcome} onChange={(e) => setExpectedOutcome(e.target.value)} placeholder="What do you expect to change?" /></div>
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="idea-description">Idea and proposed solution</Label><Textarea id="idea-description" value={description} onChange={(e) => setDescription(e.target.value)} required rows={3} placeholder="Describe the product change or experiment…" /></div>
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="idea-evidence">Evidence so far</Label><Textarea id="idea-evidence" value={evidenceSummary} onChange={(e) => setEvidenceSummary(e.target.value)} rows={2} placeholder="What have customers said or done? What is still only a hunch?" /></div>
      <div className="space-y-2"><Label htmlFor="idea-source-interview">Related interview</Label><select id="idea-source-interview" value={sourceInterviewId} onChange={(e) => setSourceInterviewId(e.target.value)} className="h-10 w-full border border-input bg-background px-3 text-sm"><option value="">No interview linked</option>{interviews.map((source) => <option key={source.id} value={source.id}>{source.title} · {source.date}</option>)}</select></div>
      <div className="space-y-2"><Label htmlFor="idea-source-brief">Related market brief</Label><select id="idea-source-brief" value={sourceBriefId} onChange={(e) => setSourceBriefId(e.target.value)} className="h-10 w-full border border-input bg-background px-3 text-sm"><option value="">No brief linked</option>{briefs.map((source) => <option key={source.id} value={source.id}>{source.title} · {source.date}</option>)}</select></div>
      <div className="space-y-2"><Label htmlFor="idea-impact">Expected impact (1–5)</Label><Input id="idea-impact" type="number" min="1" max="5" value={impact} onChange={(e) => setImpact(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="idea-confidence">Evidence confidence (1–5)</Label><Input id="idea-confidence" type="number" min="1" max="5" value={confidence} onChange={(e) => setConfidence(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="idea-effort">Effort (1–5, higher is more)</Label><Input id="idea-effort" type="number" min="1" max="5" value={effort} onChange={(e) => setEffort(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="idea-risk">Risks or dependencies</Label><Input id="idea-risk" value={riskNotes} onChange={(e) => setRiskNotes(e.target.value)} placeholder="What could make this fail?" /></div>
      <div className="sm:col-span-2"><Button type="submit" disabled={saving} className="h-10 rounded-none bg-primary px-4 text-primary-foreground hover:bg-primary/90">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CirclePlus className="mr-2 h-4 w-4" />}Save idea</Button></div>
    </form>}
    <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">Your backlog</p><h2 className="mt-1 text-xl font-medium">{loading ? "Loading ideas…" : `${ideas.length} ${ideas.length === 1 ? "idea" : "ideas"}`}</h2></div><span className="text-xs text-muted-foreground">Private workspace</span></div>
    {loading ? <div className="flex min-h-52 items-center justify-center border border-border"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> : ideas.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center border border-dashed border-border px-6 text-center"><span className="grid h-11 w-11 place-items-center bg-secondary"><Lightbulb size={19} /></span><h3 className="mt-4 text-lg font-medium">Start with one opportunity</h3><p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">Capture a customer problem, a product improvement, or a new direction you want to explore.</p><Button variant="outline" onClick={() => setFormOpen(true)} className="mt-5 rounded-none"><Plus className="mr-2 h-4 w-4" />Add your first idea</Button></div> : <div className="divide-y divide-border border-y border-border">{ideas.map((idea, index) => { const prioritySignal = (idea.impact_rating * idea.confidence_rating) / Math.max(idea.effort_rating, 1); return <article key={idea.id} className="grid gap-5 py-5 sm:grid-cols-[48px_1fr_auto] sm:items-start"><span className="pt-1 text-xs tabular-nums text-muted-foreground">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0"><h3 className="text-lg font-medium tracking-tight">{idea.title}</h3><p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">{idea.description}</p>{idea.problem && <p className="mt-3 text-sm"><span className="text-xs uppercase tracking-wide text-muted-foreground">Problem · </span>{idea.problem}</p>}{idea.target_customer && <p className="mt-1 text-sm"><span className="text-xs uppercase tracking-wide text-muted-foreground">For · </span>{idea.target_customer}</p>}{idea.evidence_summary && <p className="mt-3 border-l-2 border-primary/60 pl-3 text-sm leading-relaxed">{idea.evidence_summary}</p>}{idea.expected_outcome && <p className="mt-2 text-sm text-muted-foreground"><span className="font-medium text-foreground">Expected outcome: </span>{idea.expected_outcome}</p>}{idea.risk_notes && <p className="mt-2 text-xs text-muted-foreground">Risk: {idea.risk_notes}</p>}<div className="mt-3 flex flex-wrap items-center gap-2">{(idea.tags ?? []).map((tag) => <span key={tag} className="border border-border px-2 py-1 text-[11px] text-muted-foreground">{tag}</span>)}<span className="text-xs text-muted-foreground">Added {formatDistanceToNow(new Date(idea.created_at), { addSuffix: true })}</span></div><div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs"><span className="text-muted-foreground">Impact {idea.impact_rating}/5 · Evidence {idea.confidence_rating}/5 · Effort {idea.effort_rating}/5</span><span className="font-medium">Priority signal {prioritySignal.toFixed(1)} <span className="font-normal text-muted-foreground">(impact × confidence ÷ effort)</span></span>{idea.source_interview_id && <Link to="/dashboard/customer-discovery" className="inline-flex items-center gap-1 text-primary">Interview source <ArrowUpRight size={12} /></Link>}{idea.source_market_brief_id && <Link to="/dashboard/market-analysis" className="inline-flex items-center gap-1 text-primary">Market brief <ArrowUpRight size={12} /></Link>}</div><Button type="button" onClick={() => void createGrowthAction(idea)} variant="outline" className="mt-4 h-8 rounded-none px-3 text-xs"><ArrowUpRight className="mr-1.5 h-3.5 w-3.5" />Create growth test</Button></div><Select value={idea.status ?? "Under Consideration"} onValueChange={(status) => void updateStatus(idea, status)}><SelectTrigger className="h-9 w-full rounded-none sm:w-48"><SelectValue /></SelectTrigger><SelectContent>{statuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></article>; })}</div>}
  </div>;
}
