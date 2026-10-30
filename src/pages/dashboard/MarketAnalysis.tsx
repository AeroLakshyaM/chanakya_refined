import { useEffect, useState } from "react";
import { ArrowRight, BarChart3, Compass, Loader2, Sparkles } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import FormattedAnswer from "@/components/dashboard/FormattedAnswer";

export default function MarketAnalysis() {
  const [company, setCompany] = useState("");
  const [market, setMarket] = useState("");
  const [context, setContext] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [analysisIsFallback, setAnalysisIsFallback] = useState(false);
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

  const runAnalysis = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setAnalysis("");
    setAnalysisIsFallback(false);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) throw new Error("Please sign in again before generating a market brief.");
      const prompt = `Create an initial market strategy brief using only the information supplied below. Do not invent market sizes, growth rates, competitor facts, or citations. Mark unknowns as assumptions and end with the most useful validation steps.\n\nCompany or product: ${company}\nMarket: ${market}\nContext: ${context || "No additional context supplied."}\n\nUse these headings: Market framing; Likely customer segments; Competitors to investigate; Key assumptions; Three practical validation steps; Questions for the team.`;
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "The market brief could not be generated.";
      if (message.toLowerCase().includes("timed out") || message.toLowerCase().includes("timeout")) {
        setAnalysisIsFallback(true);
        setAnalysis([
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
        ].join("\n"));
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
  </div>;
}
