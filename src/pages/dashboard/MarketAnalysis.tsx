import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ArrowRight, BarChart3, Compass, Loader2, Sparkles } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import FormattedAnswer from "@/components/dashboard/FormattedAnswer";

const db = supabase as unknown as SupabaseClient;
type MarketBrief = { id: string; company: string; market: string; context: string; content: string; version: number; is_fallback: boolean; created_at: string };

export default function MarketAnalysis() {
  const [company, setCompany] = useState("");
  const [market, setMarket] = useState("");
  const [context, setContext] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [analysisIsFallback, setAnalysisIsFallback] = useState(false);
  const [briefs, setBriefs] = useState<MarketBrief[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!loading) { setElapsedSeconds(0); return; }
    setElapsedSeconds(0);
    const timer = window.setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    const loadCompanyContext = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: savedBriefs } = await db.from("market_briefs").select("id,company,market,context,content,version,is_fallback,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30);
      if (savedBriefs) setBriefs(savedBriefs as MarketBrief[]);
      const { data } = await supabase.from("profiles")
        .select("company_name,industry,product_or_service,target_customer,primary_goal,biggest_challenge")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data) return;
      setCompany((current) => current || data.company_name || data.product_or_service || "");
      setMarket((current) => current || data.industry || "");
      setContext((current) => current || [
        data.product_or_service && `What we're building: ${data.product_or_service}`,
        data.target_customer && `Target customer: ${data.target_customer}`,
        data.primary_goal && `90-day goal: ${data.primary_goal}`,
        data.biggest_challenge && `Current challenge: ${data.biggest_challenge}`,
      ].filter(Boolean).join("\n"));
    };
    void loadCompanyContext();
  }, []);

  const saveBrief = async (content: string, isFallback: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: latest } = await db.from("market_briefs").select("version").eq("user_id", user.id).eq("market", market.trim()).order("version", { ascending: false }).limit(1).maybeSingle();
    const { data, error } = await db.from("market_briefs").insert({ user_id: user.id, company: company.trim(), market: market.trim(), context: context.trim(), content, version: (latest?.version ?? 0) + 1, is_fallback: isFallback }).select("id,company,market,context,content,version,is_fallback,created_at").single();
    if (error) toast({ title: "Brief generated but not saved", description: error.message, variant: "destructive" });
    else setBriefs((current) => [data as MarketBrief, ...current]);
  };

  const runAnalysis = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setAnalysis("");
    setAnalysisIsFallback(false);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) throw new Error("Please sign in again before generating a market brief.");
      const previous = briefs.find((brief) => brief.market.toLowerCase() === market.trim().toLowerCase());
      const prompt = `Create a practical market strategy brief using only the information supplied below. Do not invent market sizes, growth rates, competitor facts, or citations. Clearly distinguish founder-supplied facts from hypotheses and unknowns. Describe alternatives or competitors as things to investigate unless the user supplied evidence.\n\nCompany or product: ${company}\nMarket: ${market}\nContext: ${context || "No additional context supplied."}${previous ? `\n\nPrevious version (v${previous.version}) for comparison:\n${previous.content.slice(0, 7000)}\n\nAdd a short “What changed” section. Only call out changes in the supplied context or framing; do not imply the market itself changed without new evidence.` : ""}\n\nUse these headings: Market framing; Supplied facts; Customer segments and jobs; Alternatives to investigate; Assumptions and risks; Validation steps; Questions for the team${previous ? "; What changed" : ""}.`;
      const { data, error } = await supabase.functions.invoke("ai-advisors", {
        body: { message: prompt, conversationHistory: [], selectedBot: "Business Strategist", businessContext: context, provider: "nvidia", timeoutMs: 70_000 },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) {
        const response = (error as { context?: unknown }).context;
        if (response instanceof Response) {
          const payload = await response.clone().json().catch(() => null);
          if (typeof payload?.error === "string") throw new Error(payload.error);
        }
        throw error;
      }
      if (!data?.message) throw new Error("The advisor returned an empty response. Please try again.");
      setAnalysis(data.message);
      await saveBrief(data.message, false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "The market brief could not be generated.";
      if (message.toLowerCase().includes("timed out") || message.toLowerCase().includes("timeout")) {
        setAnalysisIsFallback(true);
        const fallbackBrief = [
          "Market framing",
          `You’re exploring ${market} with ${company}. This is a working frame from your inputs, not live market research.`,
          "",
          "Customer and problem hypotheses",
          context.trim() || "Add what you know about the customer, their current alternatives, and the problem you want to solve.",
          "",
          "Alternatives to investigate",
          "Compare direct competitors, do-it-yourself workarounds, and the option of doing nothing. Look at customer, core job, pricing, strengths, and friction.",
          "",
          "Three practical validation steps",
          "1. Speak with 5–8 people who match your target customer; ask about their last attempt to solve this problem.\n2. Review 5–10 alternatives and record what each costs and where customers still struggle.\n3. Test one clear value proposition with a small landing page, demo, or direct outreach before investing in a larger build.",
          "",
          "Questions for the team",
          "What evidence would show this problem is urgent? Who decides and pays? What is the smallest test you can run this week?",
        ].join("\n");
        setAnalysis(fallbackBrief);
        await saveBrief(fallbackBrief, true);
        toast({ title: "Showing a quick starting framework", description: "Nemotron did not respond within 70 seconds. This fallback uses your inputs and does not contain live market data." });
        return;
      }
      toast({ title: "Could not build the market brief", description: message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return <div>
    <PageHeader eyebrow="Explore opportunity" title="Market analysis" description="Build a first-pass market brief with NVIDIA Nemotron from your company context. The brief separates assumptions from what your team still needs to validate." />
    <div className="grid gap-6 xl:grid-cols-12">
      <form onSubmit={runAnalysis} className="space-y-6 border border-border bg-card p-5 sm:p-7 xl:col-span-5">
        <div className="flex items-start gap-3 border-b border-border pb-5"><span className="grid h-9 w-9 shrink-0 place-items-center bg-secondary"><Compass size={17} /></span><div><h2 className="text-base font-medium">Set the context</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">A sharper brief starts with a specific market and customer.</p></div></div>
        <div className="space-y-2"><Label htmlFor="market-company">Company or product</Label><Input id="market-company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="What are you building?" required /></div>
        <div className="space-y-2"><Label htmlFor="target-market">Market to explore</Label><Input id="target-market" value={market} onChange={(e) => setMarket(e.target.value)} placeholder="Industry, region, or category" required /></div>
        <div className="space-y-2"><Label htmlFor="market-context">What do you already know?</Label><Textarea id="market-context" value={context} onChange={(e) => setContext(e.target.value)} placeholder="Target customer, current alternatives, pricing, traction, or open questions…" className="min-h-32 resize-y" /></div>
        <Button type="submit" disabled={loading} className="h-11 w-full rounded-none bg-foreground text-background hover:bg-foreground/85">{loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{elapsedSeconds < 20 ? "Building your brief…" : elapsedSeconds < 60 ? `Doing a deeper pass… ${elapsedSeconds}s` : `Still working… ${elapsedSeconds}s`}</> : <>Build market brief <ArrowRight className="ml-2 h-4 w-4" /></>}</Button>
        {loading && <p className="text-center text-xs text-muted-foreground" aria-live="polite">Nemotron may take up to 70 seconds. If it doesn’t finish, we’ll show a useful starting framework.</p>}
      </form>
      <section className="min-h-[420px] border border-border bg-background xl:col-span-7" aria-live="polite">
        {analysis ? <div className="p-5 sm:p-8"><div className="flex items-center gap-3 border-b border-border pb-5"><span className="grid h-9 w-9 place-items-center bg-foreground text-background"><BarChart3 size={17} /></span><div><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{analysisIsFallback ? "Quick fallback framework" : "Working brief"}</p><h2 className="mt-1 text-lg font-medium">{company} <span className="font-normal text-muted-foreground">· {market}</span></h2></div></div><div className="py-6 text-foreground"><FormattedAnswer content={analysis} /></div><p className="border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">{analysisIsFallback ? "This framework is based only on the information you provided. It contains no live market data or verified competitor research. Try again when you’re ready for an AI-generated brief." : "This is a strategic starting point based on your description, not live market research. Validate claims with current, reliable sources before making decisions."}</p></div> : <div className="flex min-h-[420px] flex-col items-center justify-center px-8 text-center"><span className="grid h-12 w-12 place-items-center border border-border text-primary"><Sparkles size={20} /></span><h2 className="mt-5 text-xl font-medium tracking-tight">Your market brief will appear here</h2><p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">Add a product and market, then generate a structured first pass with assumptions and validation steps clearly called out.</p></div>}
      </section>
    </div>
    {briefs.length > 0 && <section className="mt-8"><div className="mb-3 flex items-end justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Your research trail</p><h2 className="mt-1 text-lg font-medium">Saved brief versions</h2></div><span className="text-xs text-muted-foreground">Newest first</span></div><div className="divide-y divide-border border-y border-border">{briefs.map((brief) => <button type="button" key={brief.id} onClick={() => { setCompany(brief.company); setMarket(brief.market); setContext(brief.context); setAnalysis(brief.content); setAnalysisIsFallback(brief.is_fallback); }} className="flex w-full items-center justify-between gap-4 py-3 text-left hover:bg-card"><span><span className="text-sm font-medium">{brief.market} · v{brief.version}</span><span className="ml-2 text-xs text-muted-foreground">{brief.company} · {new Date(brief.created_at).toLocaleDateString()}</span></span><span className="text-[10px] uppercase tracking-wide text-muted-foreground">{brief.is_fallback ? "Starting framework" : "Brief"}</span></button>)}</div></section>}
  </div>;
}
