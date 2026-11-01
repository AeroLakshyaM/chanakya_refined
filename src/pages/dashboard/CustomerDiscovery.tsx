import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CircleHelp, Loader2, MessageCircle, Plus, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const db = supabase as any;
type Interview = { id: string; interview_date: string; interviewee_label: string; segment: string | null; idea_or_assumption: string; notes: string; pain_points: string[]; evidence_direction: string; evidence_summary: string | null; interview_guide: string | null; verbatim_quotes: string[]; tags: string[] };

export default function CustomerDiscovery() {
  const [rows, setRows] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [label, setLabel] = useState("Anonymous customer");
  const [segment, setSegment] = useState("");
  const [idea, setIdea] = useState("");
  const [notes, setNotes] = useState("");
  const [painPoints, setPainPoints] = useState("");
  const [direction, setDirection] = useState("Mixed");
  const [evidence, setEvidence] = useState("");
  const [interviewGuide, setInterviewGuide] = useState("");
  const [quotes, setQuotes] = useState("");
  const [tags, setTags] = useState("");
  const { toast } = useToast();

  const load = async () => {
    const { data, error } = await db.from("discovery_interviews").select("*").order("interview_date", { ascending: false });
    if (error) toast({ title: "Could not load interviews", description: "Apply the founder tools migration in Supabase, then reload.", variant: "destructive" });
    else setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await db.from("discovery_interviews").insert({ user_id: user.id, interviewee_label: label.trim() || "Anonymous customer", segment: segment.trim() || null, idea_or_assumption: idea.trim(), notes: notes.trim(), pain_points: painPoints.split(/[,\n]/).map((item) => item.trim()).filter(Boolean), evidence_direction: direction, evidence_summary: evidence.trim() || null, interview_guide: interviewGuide.trim() || null, verbatim_quotes: quotes.split("\n").map((item) => item.trim()).filter(Boolean), tags: tags.split(/[,\n]/).map((item) => item.trim()).filter(Boolean) });
    setSaving(false);
    if (error) { toast({ title: "Could not save interview", description: error.message, variant: "destructive" }); return; }
    setIdea(""); setNotes(""); setPainPoints(""); setEvidence(""); setSegment(""); setDirection("Mixed"); setInterviewGuide(""); setQuotes(""); setTags(""); setFormOpen(false); await load();
    toast({ title: "Interview saved", description: "Your customer evidence is now in the discovery log." });
  };
  const remove = async (id: string) => { const { error } = await db.from("discovery_interviews").delete().eq("id", id); if (error) toast({ title: "Could not remove interview", description: error.message, variant: "destructive" }); else setRows((current) => current.filter((row) => row.id !== id)); };
  const prepareGuide = () => setInterviewGuide([
    `Tell me about the last time you dealt with this: ${idea.trim() || "[problem or task]"}`,
    "What did you try first? What happened next?",
    "What was the most frustrating or time-consuming part?",
    "What do you use today instead, including workarounds?",
    "What does this problem cost you in time, money, or missed opportunity?",
    "What would make you look for a different solution?",
  ].join("\n"));
  const themes = rows.flatMap((row) => [...(row.pain_points ?? []), ...(row.tags ?? [])]).reduce<Record<string, number>>((counts, theme) => { const key = theme.trim(); if (key) counts[key] = (counts[key] ?? 0) + 1; return counts; }, {});
  const recurringThemes = Object.entries(themes).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return <div>
    <PageHeader eyebrow="Learn before you build" title="Customer discovery" description="Keep interview notes, recurring pain points, and the evidence that supports or challenges your assumptions." action={<Button onClick={() => setFormOpen((open) => !open)} className="rounded-none bg-foreground text-background"><Plus className="mr-2 h-4 w-4" />Log an interview</Button>} />
    <div className="mb-6 grid gap-px border border-border bg-border sm:grid-cols-3">{[["Conversations", rows.length], ["Supporting evidence", rows.filter((row) => row.evidence_direction === "Supports").length], ["Assumptions challenged", rows.filter((row) => row.evidence_direction === "Challenges").length]].map(([label, value]) => <div key={label} className="bg-background p-5"><p className="text-xs uppercase tracking-[0.13em] text-muted-foreground">{label}</p><p className="mt-3 text-3xl font-medium">{value}</p></div>)}</div>
    <div className="mb-6 flex gap-3 border border-border bg-secondary/35 p-4"><CircleHelp size={17} className="mt-0.5 shrink-0 text-primary" /><p className="text-sm leading-relaxed text-muted-foreground">Ask about the customer’s last real attempt to solve the problem. Capture what they did and said; keep your interpretation separate from the evidence.</p></div>
    {formOpen && <form onSubmit={save} className="mb-8 grid gap-5 border border-border bg-card p-5 sm:grid-cols-2 sm:p-6">
      <div className="sm:col-span-2"><h2 className="text-lg font-medium">Add a conversation</h2><p className="mt-1 text-xs text-muted-foreground">Use a nickname or anonymous label. Keep customer words separate from your interpretation.</p></div>
      <div className="space-y-2"><Label htmlFor="discovery-person">Interview label</Label><Input id="discovery-person" value={label} onChange={(event) => setLabel(event.target.value)} maxLength={100} /></div>
      <div className="space-y-2"><Label htmlFor="discovery-segment">Customer segment</Label><Input id="discovery-segment" value={segment} onChange={(event) => setSegment(event.target.value)} maxLength={140} placeholder="e.g. Independent retailers" /></div>
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="discovery-idea">Idea or assumption being tested</Label><Input id="discovery-idea" value={idea} onChange={(event) => setIdea(event.target.value)} required maxLength={240} placeholder="We believe this customer struggles with…" /></div>
      <div className="space-y-2 sm:col-span-2"><div className="flex items-center justify-between gap-3"><Label htmlFor="discovery-guide">Interview questions</Label><button type="button" onClick={prepareGuide} className="text-xs text-primary hover:underline">Prepare a neutral guide</button></div><Textarea id="discovery-guide" value={interviewGuide} onChange={(event) => setInterviewGuide(event.target.value)} rows={4} placeholder="Ask about past behavior and workarounds. Avoid pitching a solution." /></div>
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="discovery-notes">What happened in the conversation?</Label><Textarea id="discovery-notes" value={notes} onChange={(event) => setNotes(event.target.value)} required rows={4} maxLength={5000} placeholder="What did they do, try, pay for, or say?" /></div>
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="discovery-quotes">Verbatim customer quotes (one per line)</Label><Textarea id="discovery-quotes" value={quotes} onChange={(event) => setQuotes(event.target.value)} rows={3} placeholder="Use their words, not a summary." /></div>
      <div className="space-y-2"><Label htmlFor="discovery-pain">Pain points (separate with commas)</Label><Textarea id="discovery-pain" value={painPoints} onChange={(event) => setPainPoints(event.target.value)} rows={2} maxLength={1200} /></div>
      <div className="space-y-2"><Label htmlFor="discovery-tags">Themes / tags</Label><Input id="discovery-tags" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="Pricing, onboarding, trust" /></div>
      <div className="space-y-2"><Label>Evidence direction</Label><Select value={direction} onValueChange={setDirection}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Supports", "Challenges", "Mixed"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="discovery-evidence">Your interpretation</Label><Textarea id="discovery-evidence" value={evidence} onChange={(event) => setEvidence(event.target.value)} rows={2} maxLength={1600} placeholder="What does this evidence suggest? Keep it distinct from the quote." /></div>
      <div className="sm:col-span-2"><Button type="submit" disabled={saving} className="rounded-none bg-primary text-primary-foreground">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}Save interview</Button></div>
    </form>}
    {recurringThemes.length > 0 && <section className="mb-7 border border-border bg-card p-5"><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Recurring tags and pain points</p><div className="mt-3 flex flex-wrap gap-2">{recurringThemes.map(([theme, count]) => <span key={theme} className="border border-border bg-background px-2.5 py-1.5 text-xs">{theme}<span className="ml-2 text-muted-foreground">× {count}</span></span>)}</div><p className="mt-3 text-[11px] text-muted-foreground">Simple counts from your tags and pain points; not an AI-generated conclusion.</p></section>}
    <div className="mb-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Evidence log</p><h2 className="mt-1 text-xl font-medium">{rows.length} {rows.length === 1 ? "conversation" : "conversations"}</h2></div>
    {loading ? <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div> : rows.length ? <div className="divide-y divide-border border-y border-border">{rows.map((row) => <article key={row.id} className="py-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-center gap-2"><span className={`grid h-8 w-8 place-items-center ${row.evidence_direction === "Supports" ? "bg-emerald-500/10 text-emerald-700" : row.evidence_direction === "Challenges" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>{row.evidence_direction === "Supports" ? <ThumbsUp size={15} /> : row.evidence_direction === "Challenges" ? <ThumbsDown size={15} /> : <CircleHelp size={15} />}</span><div><h3 className="font-medium">{row.interviewee_label}{row.segment && <span className="ml-2 text-sm font-normal text-muted-foreground">· {row.segment}</span>}</h3><p className="text-xs text-muted-foreground">{format(new Date(`${row.interview_date}T00:00:00`), "MMM d, yyyy")} · {row.evidence_direction}</p></div></div><button type="button" onClick={() => void remove(row.id)} aria-label="Delete interview" className="p-2 text-muted-foreground hover:text-destructive"><Trash2 size={15} /></button></div><p className="mt-4 text-sm font-medium">Testing: {row.idea_or_assumption}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{row.notes}</p>{row.pain_points?.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{row.pain_points.map((pain, index) => <span key={`${pain}-${index}`} className="border border-border px-2 py-1 text-xs">{pain}</span>)}</div>}{row.evidence_summary && <p className="mt-3 border-l-2 border-primary/50 pl-3 text-sm leading-relaxed">{row.evidence_summary}</p>}</article>)}</div> : <div className="border border-dashed border-border p-12 text-center"><MessageCircle className="mx-auto h-6 w-6 text-primary" /><h3 className="mt-4 text-lg font-medium">Start with one real conversation</h3><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">A small evidence log helps your team see patterns before committing to a product direction.</p><Button onClick={() => setFormOpen(true)} variant="outline" className="mt-5 rounded-none">Log your first interview</Button></div>}
    {rows.some((row) => row.verbatim_quotes?.length || row.interview_guide) && <section className="mt-8"><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Customer words & interview guides</p><div className="mt-3 divide-y divide-border border-y border-border">{rows.filter((row) => row.verbatim_quotes?.length || row.interview_guide).map((row) => <article key={`quotes-${row.id}`} className="py-4"><p className="text-sm font-medium">{row.interviewee_label}{row.segment && <span className="ml-2 text-xs font-normal text-muted-foreground">· {row.segment}</span>}</p>{row.verbatim_quotes?.map((quote, index) => <blockquote key={`${row.id}-${index}`} className="mt-2 border-l-2 border-primary pl-3 text-sm italic">“{quote}”</blockquote>)}{row.interview_guide && <details className="mt-3"><summary className="cursor-pointer text-xs text-muted-foreground">View questions used</summary><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{row.interview_guide}</p></details>}</article>)}</div></section>}
  </div>;
}
