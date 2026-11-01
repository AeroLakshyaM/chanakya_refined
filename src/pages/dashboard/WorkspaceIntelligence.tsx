import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format, startOfWeek } from "date-fns";
import { ArrowRight, BookOpenCheck, Check, CircleHelp, GitBranch, Loader2, Search, Sparkles } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import FormattedAnswer from "@/components/dashboard/FormattedAnswer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const db = supabase as any;
type RecordItem = { id: string; kind: string; title: string; text: string; date: string; href: string; status?: string; connectedId?: string | null; linkId?: string | null };
const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

export default function WorkspaceIntelligence() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [question, setQuestion] = useState("");
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState(false);
  const [aiAnswer, setAiAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const [interviews, ideas, actions, decisions, pulses, briefs] = await Promise.all([
        db.from("discovery_interviews").select("id,interviewee_label,segment,interview_date,created_at,note,pain_points,evidence_summary,verbatim_quotes,tags").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
        db.from("product_ideas").select("id,title,problem,target_customer,evidence_summary,expected_outcome,risk_notes,status,created_at,source_interview_id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
        db.from("growth_actions").select("id,title,details,status,due_date,completed_at,created_at,linked_idea_id,linked_interview_id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
        db.from("decision_journal").select("id,decision,rationale,alternatives,assumptions,expected_outcome,outcome,status,review_date,confidence,created_at,linked_idea_id,linked_interview_id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
        db.from("founder_pulse_entries").select("id,goal,metric_name,metric_value,baseline_value,target_value,unit,note,week_start,created_at,linked_growth_action_id").eq("user_id", user.id).order("week_start", { ascending: false }).limit(100),
        db.from("market_briefs").select("id,market,context,content,version,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(40),
      ]);
      if (!active) return;
      const all: RecordItem[] = [
        ...(interviews.data || []).map((r: any) => ({ id: r.id, kind: "Interview evidence", title: `${r.interviewee_label}${r.segment ? ` · ${r.segment}` : ""}`, text: [...(r.verbatim_quotes || []).map((quote: string) => `Direct quote: “${quote}”`), r.note && `Founder notes: ${r.note}`, r.pain_points && `Pain points noted: ${r.pain_points}`, r.evidence_summary && `Interpretation: ${r.evidence_summary}`, ...(r.tags || [])].filter(Boolean).join(" · "), date: r.interview_date || r.created_at, href: "/dashboard/customer-discovery", linkId: r.id })),
        ...(ideas.data || []).map((r: any) => ({ id: r.id, kind: "Product idea", title: r.title, text: [r.problem, r.target_customer, r.evidence_summary, r.expected_outcome, r.risk_notes].filter(Boolean).join(" · "), date: r.created_at, href: "/dashboard/product-ideas", status: r.status, connectedId: r.source_interview_id, linkId: r.id })),
        ...(actions.data || []).map((r: any) => ({ id: r.id, kind: "Growth action", title: r.title, text: r.details || "", date: r.completed_at || r.created_at, href: "/dashboard/growth-plan", status: r.status, connectedId: r.linked_idea_id || r.linked_interview_id, linkId: r.linked_idea_id || r.linked_interview_id })),
        ...(decisions.data || []).map((r: any) => ({ id: r.id, kind: "Decision", title: r.decision, text: [r.rationale, r.assumptions && `Assumption: ${r.assumptions}`, r.alternatives && `Alternatives: ${r.alternatives}`, r.expected_outcome && `Expected: ${r.expected_outcome}`, r.outcome && `Outcome: ${r.outcome}`].filter(Boolean).join(" · "), date: r.created_at, href: "/dashboard/decision-journal", status: r.status, connectedId: r.linked_idea_id || r.linked_interview_id, linkId: r.linked_idea_id || r.linked_interview_id })),
        ...(pulses.data || []).map((r: any) => ({ id: r.id, kind: "Metric", title: `${r.metric_name}: ${r.metric_value} ${r.unit || ""}`.trim(), text: [r.goal, r.note, r.baseline_value != null && `Baseline ${r.baseline_value}`, r.target_value != null && `Target ${r.target_value}`].filter(Boolean).join(" · "), date: r.week_start, href: "/dashboard/founder-pulse", connectedId: r.linked_growth_action_id, linkId: r.linked_growth_action_id })),
        ...(briefs.data || []).map((r: any) => ({ id: r.id, kind: "Market brief", title: `${r.market} · version ${r.version}`, text: [r.context, r.content].filter(Boolean).join(" · "), date: r.created_at, href: "/dashboard/market-analysis" })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecords(all);
      const fromThisWeek = all.filter((r) => new Date(r.date).getTime() >= new Date(`${weekStart}T00:00:00`).getTime());
      setSelected([]);
      setLoading(false);
    };
    void load(); return () => { active = false; };
  }, []);

  const changes = useMemo(() => records.filter((r) => new Date(r.date).getTime() >= new Date(`${weekStart}T00:00:00`).getTime()), [records]);
  const matches = useMemo(() => {
    const words = query.toLowerCase().split(/\W+/).filter((word) => word.length > 2);
    if (!words.length) return [];
    return records.map((r) => ({ ...r, score: words.reduce((sum, word) => sum + Number(`${r.title} ${r.text} ${r.kind}`.toLowerCase().includes(word)), 0) })).filter((r) => r.score > 0).sort((a, b) => b.score - a.score || new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
  }, [query, records]);
  const evidence = records.filter((r) => r.kind === "Interview evidence");
  const assumptions = records.filter((r) => (r.kind === "Decision" && /assumption/i.test(r.text)) || r.kind === "Product idea");
  const stillToLearn = assumptions.filter((r) => r.kind === "Product idea" && !r.connectedId);
  const trailDecisions = records.filter((r) => r.kind === "Decision");
  const answerWorkspace = () => {
    setQuery(question.trim()); setAnswer(true); setAiAnswer("");
  };
  const askWithAI = async () => {
    const words = question.toLowerCase().split(/\W+/).filter((word) => word.length > 2);
    const found = records.map((r) => ({ ...r, score: words.reduce((sum, word) => sum + Number(`${r.title} ${r.text} ${r.kind}`.toLowerCase().includes(word)), 0) })).filter((r) => r.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);
    if (!found.length) { setAnswer(true); setQuery(question.trim()); setAiAnswer("I couldn’t find a matching saved record, so I don’t have workspace evidence to answer this yet."); return; }
    setQuery(question.trim()); setAnswer(true); setAsking(true); setAiAnswer("");
    const context = found.map((r) => `[${r.kind}, ${format(new Date(r.date), "MMM d, yyyy")}] ${r.title}: ${r.text || "No further detail saved."}`).join("\n").slice(0, 9_000);
    try {
      const { data, error } = await supabase.functions.invoke("ai-advisors", { body: { message: `Answer this workspace question using only the saved records below. If they do not answer it, say what is missing. Clearly separate direct evidence from interpretation. Cite each factual point with its exact record type and date. Question: ${question.trim()}`, conversationHistory: [], selectedBot: "Business Strategist", responseStyle: "natural", memoryIds: [], includeProfile: false, confirmedWorkspaceContext: context } });
      if (error) { const response = (error as { context?: unknown }).context; if (response instanceof Response) { const payload = await response.clone().json().catch(() => null); if (typeof payload?.error === "string") throw new Error(payload.error); } throw error; }
      setAiAnswer(data.message || "No answer returned.");
    } catch (error) { setAiAnswer(error instanceof Error ? `I found matching records, but couldn’t build a summary: ${error.message}` : "I found matching records, but couldn’t build a summary."); }
    finally { setAsking(false); }
  };
  const openConfirmedRound = () => {
    const confirmed = changes.filter((r) => selected.includes(`${r.kind}:${r.id}`));
    if (!confirmed.length) { toast({ title: "Choose workspace updates first", description: "Select the records you want the advisor to consider." }); return; }
    const context = confirmed.map((r) => `[${r.kind} · ${format(new Date(r.date), "MMM d, yyyy")}] ${r.title}: ${r.text}`).join("\n").slice(0, 9000);
    navigate("/dashboard/chatbot", { state: { confirmedWorkspaceContext: context, contextSources: confirmed.map((r) => ({ kind: r.kind, title: r.title, date: r.date, href: r.href })) } });
  };

  if (loading) return <div className="grid min-h-72 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  return <div className="space-y-10">
    <PageHeader eyebrow="Your evidence, connected" title="Workspace intelligence" description="See what changed, follow decisions through to outcomes, and ask questions grounded in the records you saved." />

    <section className="border border-border bg-card p-5 sm:p-7"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Since Monday · {format(new Date(`${weekStart}T00:00:00`), "MMM d")}</p><h2 className="mt-2 text-2xl font-medium">What changed?</h2><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Review the new interviews, activity, and metrics first. Only selected items are passed along if you continue to an advisor.</p></div><Button onClick={openConfirmedRound} disabled={!selected.length} className="rounded-none bg-foreground text-background">Use selected context with an advisor <ArrowRight className="ml-2 h-4 w-4" /></Button></div>
      <div className="mt-5 divide-y divide-border border-y border-border">{changes.map((r) => <label key={`${r.kind}:${r.id}`} className="flex cursor-pointer items-start gap-3 py-3"><input type="checkbox" checked={selected.includes(`${r.kind}:${r.id}`)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, `${r.kind}:${r.id}`] : current.filter((item) => item !== `${r.kind}:${r.id}`))} className="mt-1 accent-primary" /><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium">{r.title}</span><span className="text-[10px] uppercase tracking-wide text-primary">{r.kind}</span></span><span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-muted-foreground">{r.text || "No additional detail saved."}</span></span><span className="shrink-0 text-xs text-muted-foreground">{format(new Date(r.date), "MMM d")}</span></label>)}{!changes.length && <p className="py-6 text-sm text-muted-foreground">No new records this week yet. When you add evidence or make progress, review it here before sharing it with advisors.</p>}</div>
      <p className="mt-3 text-xs text-muted-foreground">{selected.length} selected · nothing from this review is shared until you choose “Use selected context”.</p>
    </section>

    <section className="grid gap-8 xl:grid-cols-2">
      <div className="border border-border p-5 sm:p-7"><div className="flex items-center gap-2"><BookOpenCheck size={17} className="text-primary" /><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Evidence & assumptions</p></div><h2 className="mt-2 text-2xl font-medium">What you know, believe, and need to learn</h2><p className="mt-2 text-xs text-muted-foreground">Direct quotes are marked as customer evidence; summaries and proposed ideas remain interpretations or hypotheses.</p><div className="mt-5 grid gap-5 md:grid-cols-2"><div><h3 className="border-b border-border pb-2 text-sm font-medium">Direct customer evidence <span className="text-xs font-normal text-muted-foreground">({evidence.length})</span></h3><div className="mt-3 space-y-3">{evidence.slice(0, 6).map((r) => <Link key={r.id} to={r.href} className="block border-l-2 border-primary pl-3"><p className="text-sm font-medium">{r.title}</p><p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{r.text || "Interview recorded; notes not yet added."}</p><span className="mt-1 block text-[10px] text-muted-foreground">Source · {format(new Date(r.date), "MMM d, yyyy")}</span></Link>)}{!evidence.length && <p className="text-sm text-muted-foreground">Saved interviews will appear here as first-hand evidence.</p>}</div></div><div><h3 className="border-b border-border pb-2 text-sm font-medium">Beliefs to test <span className="text-xs font-normal text-muted-foreground">({assumptions.length})</span></h3><div className="mt-3 space-y-3">{assumptions.slice(0, 6).map((r) => <Link key={r.id} to={r.href} className="block border-l-2 border-amber-500 pl-3"><p className="text-sm font-medium">{r.title}</p><p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{r.text || "No supporting evidence has been linked yet."}</p><span className="mt-1 block text-[10px] text-amber-700">Hypothesis · validate before treating as fact</span></Link>)}{!assumptions.length && <p className="text-sm text-muted-foreground">Add assumptions to a decision or product idea to see them here.</p>}<h3 className="mt-5 border-b border-border pb-2 text-sm font-medium">Still to learn <span className="text-xs font-normal text-muted-foreground">({stillToLearn.length})</span></h3><p className="mt-2 text-xs text-muted-foreground">Ideas without a linked interview need customer evidence before their expected outcome can be treated as more than a hypothesis.</p>{stillToLearn.slice(0, 4).map((r) => <Link key={`learn-${r.id}`} to={r.href} className="mt-2 block text-xs text-primary">{r.title} · add evidence</Link>)}</div></div></div></div>
      <div className="border border-border p-5 sm:p-7"><div className="flex items-center gap-2"><GitBranch size={17} className="text-primary" /><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Decision trail</p></div><h2 className="mt-2 text-2xl font-medium">From evidence to outcome</h2><p className="mt-2 text-sm text-muted-foreground">Each recorded choice is shown with its source evidence, follow-on work, and review result where available.</p><div className="mt-5 space-y-4">{trailDecisions.slice(0, 6).map((decision) => { const linked = records.filter((r) => Boolean(decision.linkId) && r.id !== decision.id && r.linkId === decision.linkId); return <article key={decision.id} className="border-l border-primary pl-4"><p className="text-sm font-medium">{decision.title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Recorded {format(new Date(decision.date), "MMM d, yyyy")} · {decision.status || "Open"}</p><p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{decision.text || "No rationale or prediction recorded."}</p>{linked.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{linked.map((r) => <Link key={`${r.kind}-${r.id}`} to={r.href} className="border border-border px-2 py-1 text-[10px] hover:border-primary">{r.kind}: {r.title}</Link>)}</div>}<Link to={decision.href} className="mt-2 inline-flex items-center gap-1 text-xs text-primary">Open decision record <ArrowRight size={12} /></Link></article>; })}{!trailDecisions.length && <p className="text-sm text-muted-foreground">Record a decision and link its interview or idea to start a trail.</p>}</div></div>
    </section>

    <section className="border border-border p-5 sm:p-7"><div className="flex items-center gap-2"><Search size={17} className="text-primary" /><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Ask your workspace</p></div><h2 className="mt-2 text-2xl font-medium">Find the answer in your own records</h2><p className="mt-2 text-sm text-muted-foreground">Search is based on saved notes and shows the exact records behind each result; it won’t guess when your workspace has no answer.</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><Input value={question} onChange={(event) => { setQuestion(event.target.value); setAnswer(false); }} onKeyDown={(event) => { if (event.key === "Enter") answerWorkspace(); }} placeholder="e.g. What did customers say about pricing?" /><Button onClick={answerWorkspace} disabled={!question.trim()} className="rounded-none">Search my workspace</Button><Button onClick={() => void askWithAI()} disabled={!question.trim() || asking} variant="outline" className="rounded-none">{asking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{!asking && <Sparkles className="mr-2 h-4 w-4" />}Ask with AI</Button></div>{answer && <div className="mt-5 border-t border-border pt-4">{aiAnswer && <div className="mb-4 border-l-2 border-primary pl-4"><FormattedAnswer content={aiAnswer} /><p className="mt-3 text-[10px] text-muted-foreground">The summary uses matching saved records. Open the cited records below to verify the original notes.</p></div>}<p className="mb-3 flex items-center gap-2 text-sm font-medium"><CircleHelp size={15} className="text-primary" />{matches.length ? `${matches.length} relevant saved record${matches.length === 1 ? "" : "s"}` : "I couldn’t find this in the saved records"}</p>{matches.length ? <div className="grid gap-3 sm:grid-cols-2">{matches.map((r) => <Link key={`${r.kind}-${r.id}`} to={r.href} className="border border-border p-4 transition-colors hover:border-primary"><span className="text-[10px] uppercase tracking-wide text-primary">{r.kind} · {format(new Date(r.date), "MMM d, yyyy")}</span><h3 className="mt-1 text-sm font-medium">{r.title}</h3><p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{r.text || "No detail saved."}</p></Link>)}</div> : <p className="text-sm text-muted-foreground">Try a phrase from an interview, decision, action, metric, or market brief. Chanakya won’t turn missing information into a fact.</p>}</div>}</section>

    <section className="flex flex-col gap-3 border border-primary/25 bg-secondary/25 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div className="flex gap-3"><Sparkles size={18} className="mt-0.5 shrink-0 text-primary" /><div><h2 className="font-medium">Keep the founder in control</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Review the source, date, and meaning before an advisor uses a record. Inferences remain hypotheses until evidence supports them.</p></div></div><Link to="/dashboard/memory" className="inline-flex shrink-0 items-center gap-2 text-sm text-primary">Manage shared memory <ArrowRight size={14} /></Link></section>
  </div>;
}
