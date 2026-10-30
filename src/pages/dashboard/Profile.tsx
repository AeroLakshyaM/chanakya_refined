import { useEffect, useState } from "react";
import { Building2, Loader2, Mail, UserRound } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
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
        supabase.from("profiles").select("full_name,company_name").eq("user_id", user.id).maybeSingle(),
        supabase.from("chat_conversations").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("product_ideas").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      if (profile.error) toast({ title: "Could not load profile details", description: profile.error.message, variant: "destructive" });
      if (profile.data) {
        setFullName(profile.data.full_name ?? user.user_metadata?.full_name ?? "");
        setCompanyName(profile.data.company_name ?? "");
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
    const { error: profileError } = await supabase.from("profiles").upsert({ user_id: userId, full_name: fullName.trim(), company_name: companyName.trim() }, { onConflict: "user_id" });
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
      <form onSubmit={saveProfile} className="space-y-5 border border-border bg-background p-5 sm:p-7 lg:col-span-8"><div className="border-b border-border pb-4"><h2 className="text-lg font-medium">Account information</h2><p className="mt-1 text-sm text-muted-foreground">This information helps personalize your workspace.</p></div><div className="space-y-2"><Label htmlFor="profile-name"><UserRound className="mr-2 inline h-4 w-4" />Full name</Label><Input id="profile-name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} placeholder="Your name" required /></div><div className="space-y-2"><Label htmlFor="profile-email"><Mail className="mr-2 inline h-4 w-4" />Email</Label><Input id="profile-email" value={email} disabled className="bg-muted" /><p className="text-xs text-muted-foreground">Email changes are managed through your authentication provider.</p></div><div className="space-y-2"><Label htmlFor="profile-company"><Building2 className="mr-2 inline h-4 w-4" />Company or project</Label><Input id="profile-company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} maxLength={160} placeholder="Company name" /></div><Button type="submit" disabled={saving} className="h-10 rounded-none bg-foreground px-5 text-background hover:bg-foreground/85">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save changes</Button></form>
    </div>
    <section className="mt-8"><p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">Account activity</p><div className="mt-4 grid border-l border-t border-border sm:grid-cols-2"><div className="border-b border-r border-border p-5"><p className="text-sm text-muted-foreground">Advisor conversations</p><p className="mt-4 text-3xl font-medium tracking-tight">{conversationCount ?? "—"}</p><p className="mt-1 text-xs text-muted-foreground">Saved in this account</p></div><div className="border-b border-r border-border p-5"><p className="text-sm text-muted-foreground">Product ideas</p><p className="mt-4 text-3xl font-medium tracking-tight">{ideaCount ?? "—"}</p><p className="mt-1 text-xs text-muted-foreground">In your private backlog</p></div></div></section>
  </div>;
}
