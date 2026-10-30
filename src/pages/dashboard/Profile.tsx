import { useEffect, useState } from "react";
import { Building2, Loader2, Mail, UserRound } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [companyStage, setCompanyStage] = useState("");
  const [industry, setIndustry] = useState("");
  const [productOrService, setProductOrService] = useState("");
  const [targetCustomer, setTargetCustomer] = useState("");
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [biggestChallenge, setBiggestChallenge] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [monthlyRevenueRange, setMonthlyRevenueRange] = useState("");
  const [onboardingCompletedAt, setOnboardingCompletedAt] = useState<string | null>(null);
  const [conversationCount, setConversationCount] = useState<number | null>(null);
  const [ideaCount, setIdeaCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast({ title: "Could not load account", description: userError?.message ?? "Please sign in again.", variant: "destructive" });
        setLoading(false);
        return;
      }
      setUserId(user.id);
      setEmail(user.email ?? "");
      setFullName(user.user_metadata?.full_name ?? "");
      const [profile, conversations, ideas] = await Promise.all([
        supabase.from("profiles").select("full_name,company_name,company_type,company_stage,industry,product_or_service,target_customer,primary_goal,biggest_challenge,team_size,monthly_revenue_range,onboarding_completed_at").eq("user_id", user.id).maybeSingle(),
        supabase.from("chat_conversations").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("product_ideas").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      if (profile.error) toast({ title: "Could not load profile details", description: profile.error.message, variant: "destructive" });
      if (profile.data) {
        setFullName(profile.data.full_name ?? user.user_metadata?.full_name ?? "");
        setCompanyName(profile.data.company_name ?? "");
        setCompanyType(profile.data.company_type ?? "");
        setCompanyStage(profile.data.company_stage ?? "");
        setIndustry(profile.data.industry ?? "");
        setProductOrService(profile.data.product_or_service ?? "");
        setTargetCustomer(profile.data.target_customer ?? "");
        setPrimaryGoal(profile.data.primary_goal ?? "");
        setBiggestChallenge(profile.data.biggest_challenge ?? "");
        setTeamSize(profile.data.team_size ?? "");
        setMonthlyRevenueRange(profile.data.monthly_revenue_range ?? "");
        setOnboardingCompletedAt(profile.data.onboarding_completed_at);
      }
      if (conversations.error) toast({ title: "Could not load conversation count", description: conversations.error.message, variant: "destructive" });
      else setConversationCount(conversations.count ?? 0);
      if (ideas.error) toast({ title: "Could not load idea count", description: ideas.error.message, variant: "destructive" });
      else setIdeaCount(ideas.count ?? 0);
      setLoading(false);
    };
    void load();
  }, [toast]);

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) return;
    setSaving(true);
    const { error: profileError } = await supabase.from("profiles").upsert({
      user_id: userId,
      full_name: fullName.trim(),
      company_name: companyName.trim(),
      company_type: companyType || null,
      company_stage: companyStage || null,
      industry: industry.trim() || null,
      product_or_service: productOrService.trim() || null,
      target_customer: targetCustomer.trim() || null,
      primary_goal: primaryGoal || null,
      biggest_challenge: biggestChallenge.trim() || null,
      team_size: teamSize || null,
      monthly_revenue_range: monthlyRevenueRange || null,
      onboarding_completed_at: onboardingCompletedAt,
    }, { onConflict: "user_id" });
    if (profileError) {
      toast({ title: "Could not save profile", description: profileError.message, variant: "destructive" });
      setSaving(false);
      return;
    }
    const { error: authError } = await supabase.auth.updateUser({ data: { full_name: fullName.trim() } });
    if (authError) toast({ title: "Profile saved with a sync issue", description: authError.message, variant: "destructive" });
    else toast({ title: "Profile updated", description: "Your account details have been saved." });
    setSaving(false);
  };

  if (loading) return <div className="grid min-h-72 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  const initials = fullName.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || email.slice(0, 1).toUpperCase() || "U";

  return <div>
    <PageHeader eyebrow="Your account" title="Profile & company" description="Keep the context behind your decisions close at hand. Your profile details are private to your account." />
    <div className="grid gap-6 lg:grid-cols-12">
      <aside className="flex flex-col items-center border border-border bg-card p-7 text-center lg:col-span-4 lg:items-start lg:text-left"><Avatar className="h-16 w-16 rounded-none"><AvatarFallback className="rounded-none bg-foreground text-lg text-background">{initials}</AvatarFallback></Avatar><h2 className="mt-5 text-xl font-medium">{fullName || "Your profile"}</h2><p className="mt-1 break-all text-sm text-muted-foreground">{email}</p><div className="mt-7 w-full border-t border-border pt-5 text-left"><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Workspace context</p><p className="mt-2 text-sm">{companyName || "Add your company to give advisors better context."}</p></div></aside>
      <form onSubmit={saveProfile} className="space-y-5 border border-border bg-background p-5 sm:p-7 lg:col-span-8">
        <div className="border-b border-border pb-4"><h2 className="text-lg font-medium">Account & company context</h2><p className="mt-1 text-sm text-muted-foreground">Your answers shape the dashboard and help advisors give relevant guidance.</p></div>
        <div className="space-y-2"><Label htmlFor="profile-name"><UserRound className="mr-2 inline h-4 w-4" />Full name</Label><Input id="profile-name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} placeholder="Your name" required /></div>
        <div className="space-y-2"><Label htmlFor="profile-email"><Mail className="mr-2 inline h-4 w-4" />Email</Label><Input id="profile-email" value={email} disabled className="bg-muted" /><p className="text-xs text-muted-foreground">Email changes are managed through your authentication provider.</p></div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="profile-company"><Building2 className="mr-2 inline h-4 w-4" />Company or project</Label><Input id="profile-company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} maxLength={160} placeholder="Company name" /></div>
          <div className="space-y-2"><Label htmlFor="profile-industry">Industry</Label><Input id="profile-industry" value={industry} onChange={(e) => setIndustry(e.target.value)} maxLength={120} placeholder="e.g. education, fintech" /></div>
          <div className="space-y-2"><Label htmlFor="profile-type">What are you building?</Label><select id="profile-type" value={companyType} onChange={(e) => setCompanyType(e.target.value)} className="h-10 w-full border border-input bg-background px-3 text-sm"><option value="">Choose type</option><option value="idea">I have an idea</option><option value="startup">A startup</option><option value="small_business">A small business</option><option value="growing_company">A growing company</option><option value="independent">An independent project</option></select></div>
          <div className="space-y-2"><Label htmlFor="profile-stage">Current stage</Label><select id="profile-stage" value={companyStage} onChange={(e) => setCompanyStage(e.target.value)} className="h-10 w-full border border-input bg-background px-3 text-sm"><option value="">Choose stage</option>{["Idea", "Validating", "Building", "Early customers", "Growing", "Established"].map((stage) => <option key={stage} value={stage}>{stage}</option>)}</select></div>
        </div>
        <div className="space-y-2"><Label htmlFor="profile-offer">What are you making or offering?</Label><Textarea id="profile-offer" value={productOrService} onChange={(e) => setProductOrService(e.target.value)} maxLength={1200} rows={3} placeholder="Describe the product, service, or experience…" /></div>
        <div className="space-y-2"><Label htmlFor="profile-audience">Who do you want to help?</Label><Input id="profile-audience" value={targetCustomer} onChange={(e) => setTargetCustomer(e.target.value)} maxLength={500} placeholder="Your target customer" /></div>
        <div className="space-y-2"><Label htmlFor="profile-goal">Main goal for the next 90 days</Label><select id="profile-goal" value={primaryGoal} onChange={(e) => setPrimaryGoal(e.target.value)} className="h-10 w-full border border-input bg-background px-3 text-sm"><option value="">Choose a priority</option>{["Find my first customers", "Grow revenue", "Launch or improve a product", "Understand my market", "Make operations smoother", "Build a stronger team", "Decide what to focus on next"].map((goal) => <option key={goal} value={goal}>{goal}</option>)}</select></div>
        <div className="space-y-2"><Label htmlFor="profile-challenge">Biggest current challenge</Label><Textarea id="profile-challenge" value={biggestChallenge} onChange={(e) => setBiggestChallenge(e.target.value)} maxLength={1000} rows={2} placeholder="What is taking up the most headspace?" /></div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="profile-team">Team size (optional)</Label><select id="profile-team" value={teamSize} onChange={(e) => setTeamSize(e.target.value)} className="h-10 w-full border border-input bg-background px-3 text-sm"><option value="">Prefer not to say</option>{["Just me", "2–5", "6–15", "16–50", "51+"].map((size) => <option key={size} value={size}>{size}</option>)}</select></div>
          <div className="space-y-2"><Label htmlFor="profile-revenue">Monthly revenue range (optional)</Label><select id="profile-revenue" value={monthlyRevenueRange} onChange={(e) => setMonthlyRevenueRange(e.target.value)} className="h-10 w-full border border-input bg-background px-3 text-sm"><option value="">Prefer not to say</option>{["Pre-revenue", "Under $1k", "$1k–$10k", "$10k–$50k", "$50k+"].map((range) => <option key={range} value={range}>{range}</option>)}</select><p className="text-xs text-muted-foreground">Self-reported; not connected to financial accounts.</p></div>
        </div>
        <Button type="submit" disabled={saving} className="h-10 rounded-none bg-foreground px-5 text-background hover:bg-foreground/85">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save changes</Button>
      </form>
    </div>
    <section className="mt-8"><p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">Account activity</p><div className="mt-4 grid border-l border-t border-border sm:grid-cols-2"><div className="border-b border-r border-border p-5"><p className="text-sm text-muted-foreground">Advisor conversations</p><p className="mt-4 text-3xl font-medium tracking-tight">{conversationCount ?? "—"}</p><p className="mt-1 text-xs text-muted-foreground">Saved in this account</p></div><div className="border-b border-r border-border p-5"><p className="text-sm text-muted-foreground">Product ideas</p><p className="mt-4 text-3xl font-medium tracking-tight">{ideaCount ?? "—"}</p><p className="mt-1 text-xs text-muted-foreground">In your private backlog</p></div></div></section>
  </div>;
}
