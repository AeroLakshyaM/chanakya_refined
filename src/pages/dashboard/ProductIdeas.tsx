import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { CirclePlus, Lightbulb, Loader2, Plus, X } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

type Idea = Database["public"]["Tables"]["product_ideas"]["Row"];
const statuses = ["Under Consideration", "In Progress", "Planned"];

export default function ProductIdeas() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
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
    const { data, error } = await supabase.from("product_ideas").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) toast({ title: "Could not load ideas", description: error.message, variant: "destructive" });
    else setIdeas(data ?? []);
    setLoading(false);
  }, [toast]);

  useEffect(() => { void loadIdeas(); }, [loadIdeas]);

  const createIdea = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) return;
    setSaving(true);
    const parsedTags = tags.split(",").map((tag) => tag.trim()).filter(Boolean);
    const { data, error } = await supabase.from("product_ideas").insert({
      user_id: userId,
      title: title.trim(),
      description: description.trim(),
      tags: parsedTags,
      status: "Under Consideration",
    }).select("*").single();
    if (error) toast({ title: "Could not save idea", description: error.message, variant: "destructive" });
    else {
      setIdeas((current) => [data, ...current]);
      setTitle(""); setDescription(""); setTags(""); setFormOpen(false);
      toast({ title: "Idea added", description: "It’s now in your product backlog." });
    }
    setSaving(false);
  };

  const updateStatus = async (idea: Idea, status: string) => {
    const { data, error } = await supabase.from("product_ideas").update({ status }).eq("id", idea.id).select("*").single();
    if (error) toast({ title: "Could not update status", description: error.message, variant: "destructive" });
    else setIdeas((current) => current.map((item) => item.id === idea.id ? data : item));
  };

  return <div>
    <PageHeader eyebrow="Product direction" title="Ideas worth pursuing" description="Keep promising opportunities together, give each one a clear status, and build a product backlog your team can act on." action={<Button onClick={() => setFormOpen((open) => !open)} className="h-11 rounded-none bg-foreground px-4 text-background hover:bg-foreground/85">{formOpen ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}{formOpen ? "Close form" : "Add an idea"}</Button>} />
    {formOpen && <form onSubmit={createIdea} className="mb-8 grid gap-5 border border-border bg-card p-5 sm:grid-cols-2 sm:p-6"><div className="sm:col-span-2"><h2 className="text-lg font-medium">Capture a product opportunity</h2><p className="mt-1 text-sm text-muted-foreground">Ideas are private to your account.</p></div><div className="space-y-2"><Label htmlFor="idea-title">Idea title</Label><Input id="idea-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required placeholder="What could you build or improve?" /></div><div className="space-y-2"><Label htmlFor="idea-tags">Tags <span className="font-normal text-muted-foreground">(comma separated)</span></Label><Input id="idea-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Growth, onboarding, retention" /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="idea-description">Description</Label><Textarea id="idea-description" value={description} onChange={(e) => setDescription(e.target.value)} required rows={3} placeholder="Who is this for, and what problem does it solve?" /></div><div className="sm:col-span-2"><Button type="submit" disabled={saving} className="h-10 rounded-none bg-primary px-4 text-primary-foreground hover:bg-primary/90">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CirclePlus className="mr-2 h-4 w-4" />}Save idea</Button></div></form>}
    <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">Your backlog</p><h2 className="mt-1 text-xl font-medium">{loading ? "Loading ideas…" : `${ideas.length} ${ideas.length === 1 ? "idea" : "ideas"}`}</h2></div><span className="text-xs text-muted-foreground">Private workspace</span></div>
    {loading ? <div className="flex min-h-52 items-center justify-center border border-border"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> : ideas.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center border border-dashed border-border px-6 text-center"><span className="grid h-11 w-11 place-items-center bg-secondary"><Lightbulb size={19} /></span><h3 className="mt-4 text-lg font-medium">Start with one opportunity</h3><p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">Capture a customer problem, a product improvement, or a new direction you want to explore.</p><Button variant="outline" onClick={() => setFormOpen(true)} className="mt-5 rounded-none"><Plus className="mr-2 h-4 w-4" />Add your first idea</Button></div> : <div className="divide-y divide-border border-y border-border">{ideas.map((idea, index) => <article key={idea.id} className="grid gap-5 py-5 sm:grid-cols-[48px_1fr_auto] sm:items-start"><span className="pt-1 text-xs tabular-nums text-muted-foreground">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0"><h3 className="text-lg font-medium tracking-tight">{idea.title}</h3><p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">{idea.description}</p><div className="mt-3 flex flex-wrap items-center gap-2">{(idea.tags ?? []).map((tag) => <span key={tag} className="border border-border px-2 py-1 text-[11px] text-muted-foreground">{tag}</span>)}<span className="text-xs text-muted-foreground">Added {formatDistanceToNow(new Date(idea.created_at), { addSuffix: true })}</span></div></div><Select value={idea.status ?? "Under Consideration"} onValueChange={(status) => void updateStatus(idea, status)}><SelectTrigger className="h-9 w-full rounded-none sm:w-48"><SelectValue /></SelectTrigger><SelectContent>{statuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></article>)}</div>}
  </div>;
}
