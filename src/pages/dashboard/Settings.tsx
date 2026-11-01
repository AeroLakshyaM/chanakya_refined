import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ArrowDownToLine, Check, ChevronRight, Loader2, Monitor, Moon, ShieldCheck, Sun, Trash2 } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

type Theme = "light" | "dark";
const THEME_KEY = "chanakya-theme";
const db = supabase as unknown as SupabaseClient;
const exportTables = ["profiles", "chat_conversations", "product_ideas", "growth_actions", "discovery_interviews", "decision_journal", "founder_pulse_entries", "market_briefs", "workspace_memories", "growth_weekly_reviews", "founder_pulse_reflections"] as const;

export default function Settings() {
  const [theme, setTheme] = useState<Theme>("light");
  const [password, setPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [includeProfile, setIncludeProfile] = useState(true);
  const [includeMemory, setIncludeMemory] = useState(true);
  const [savingContext, setSavingContext] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    const initialTheme: Theme = stored === "dark" ? "dark" : "light";
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
    let active = true;
    void (async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!active) return;
      if (error || !user) { toast({ title: "Could not load workspace controls", description: error?.message ?? "Please sign in again.", variant: "destructive" }); setLoading(false); return; }
      setUserId(user.id);
      const { data, error: preferencesError } = await db.from("profiles").select("ai_profile_context_default,ai_workspace_memory_default").eq("user_id", user.id).maybeSingle();
      if (preferencesError) toast({ title: "Could not load AI context settings", description: "Apply the workspace preferences migration, then reload.", variant: "destructive" });
      else if (data) { setIncludeProfile(data.ai_profile_context_default ?? true); setIncludeMemory(data.ai_workspace_memory_default ?? true); }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [toast]);

  const changeTheme = (nextTheme: Theme) => {
    setTheme(nextTheme);
    localStorage.setItem(THEME_KEY, nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  };

  const saveContextPreferences = async () => {
    if (!userId) return;
    setSavingContext(true);
    const { error } = await db.from("profiles").update({ ai_profile_context_default: includeProfile, ai_workspace_memory_default: includeMemory }).eq("user_id", userId);
    setSavingContext(false);
    if (error) toast({ title: "Could not save context preferences", description: error.message, variant: "destructive" });
    else toast({ title: "AI context preferences saved", description: "You can still change sources for an individual advisor request." });
  };

  const updatePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword(""); toast({ title: "Password updated", description: "Your new password is now active." });
    } catch (error) { toast({ title: "Could not update password", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" }); }
    finally { setSavingPassword(false); }
  };

  const exportWorkspace = async () => {
    if (!userId) return;
    setExporting(true);
    try {
      const exported = await Promise.all(exportTables.map(async (table) => {
        const { data, error } = await db.from(table).select("*").eq("user_id", userId);
        if (error) throw new Error(`${table}: ${error.message}`);
        return [table, data ?? []] as const;
      }));
      const [conversationsResult, memoriesResult] = await Promise.all([
        db.from("chat_conversations").select("id").eq("user_id", userId),
        db.from("workspace_memories").select("id,source_type,source_record_id,source_label,source_date,source_url").eq("user_id", userId),
      ]);
      if (conversationsResult.error) throw conversationsResult.error;
      const conversationIds = (conversationsResult.data ?? []).map((row: { id: string }) => row.id);
      let messages: unknown[] = [];
      if (conversationIds.length) {
        const { data, error } = await db.from("chat_messages").select("*").in("conversation_id", conversationIds);
        if (error) throw error;
        messages = data ?? [];
      }
      if (memoriesResult.error) throw memoriesResult.error;
      const payload = { exported_at: new Date().toISOString(), account_email: (await supabase.auth.getUser()).data.user?.email ?? null, workspace_tables: Object.fromEntries(exported), chat_messages: messages, memory_source_metadata: memoriesResult.data ?? [] };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `chanakya-workspace-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url);
      toast({ title: "Workspace export ready", description: "Your records were downloaded as a JSON file on this device." });
    } catch (error) { toast({ title: "Could not export the full workspace", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" }); }
    finally { setExporting(false); }
  };

  const deleteAccount = async () => {
    if (deletePhrase !== "DELETE MY ACCOUNT") return;
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account", { body: { confirmation: deletePhrase } });
      if (error) { const context = (error as { context?: unknown }).context; if (context instanceof Response) { const payload = await context.clone().json().catch(() => null); if (typeof payload?.error === "string") throw new Error(payload.error); } throw error; }
      await supabase.auth.signOut();
      toast({ title: "Account deleted", description: "Your Chanakya account and workspace records were removed." });
      navigate("/", { replace: true });
    } catch (error) { toast({ title: "Could not delete account", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" }); }
    finally { setDeleting(false); }
  };

  const themes: { value: Theme; label: string; description: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", description: "Warm paper and ink", icon: Sun },
    { value: "dark", label: "Dark", description: "Low light workspace", icon: Moon },
  ];
  const entrance = (delay: number) => reduceMotion ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.28, delay } };

  return <div className="space-y-7">
    <PageHeader eyebrow="Workspace preferences" title="Settings" description="Choose what advisors can use, take a copy of your data, or manage your account." />
    <motion.section {...entrance(0)} className="border border-border bg-card p-5 sm:p-7"><div className="flex items-start justify-between border-b border-border pb-5"><div><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Your control</p><h2 className="mt-2 text-xl font-medium">AI context defaults</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">These are defaults only. You can remove context from each advisor request before sending.</p></div><ShieldCheck size={19} className="text-primary" /></div><div className="mt-2 divide-y divide-border">{[["profile", "Company profile", "Company stage, audience, goals, and challenge"], ["memory", "Workspace memories", "Only memories you have individually marked as available to advisors"]].map(([key, title, description]) => <div key={key} className="flex items-center justify-between gap-4 py-4"><div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p></div><Switch checked={key === "profile" ? includeProfile : includeMemory} onCheckedChange={(checked) => key === "profile" ? setIncludeProfile(checked) : setIncludeMemory(checked)} aria-label={`Use ${title.toLowerCase()} by default`} /></div>)}</div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><Link to="/dashboard/memory" className="inline-flex items-center gap-1 text-sm text-primary">Review individual memories <ChevronRight size={15} /></Link><Button onClick={() => void saveContextPreferences()} disabled={savingContext || loading} className="rounded-none bg-foreground text-background">{savingContext && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{!savingContext && <Check className="mr-2 h-4 w-4" />}Save defaults</Button></div></motion.section>

    <div className="grid gap-6 xl:grid-cols-12">
      <motion.section {...entrance(0.05)} className="border border-border bg-card p-5 sm:p-7 xl:col-span-7"><div className="flex items-start justify-between border-b border-border pb-5"><div><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Display</p><h2 className="mt-2 text-lg font-medium">Appearance</h2><p className="mt-1 text-sm text-muted-foreground">Choose the theme for this browser.</p></div><Monitor size={18} className="text-muted-foreground" /></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{themes.map(({ value, label, description, icon: Icon }) => <button key={value} type="button" onClick={() => changeTheme(value)} aria-pressed={theme === value} className={`flex items-start gap-3 border p-4 text-left transition-colors ${theme === value ? "border-primary bg-primary/5" : "border-border hover:bg-background"}`}><span className={`grid h-9 w-9 place-items-center ${theme === value ? "bg-primary text-primary-foreground" : "bg-secondary"}`}><Icon size={17} /></span><span className="flex-1"><span className="block text-sm font-medium">{label}</span><span className="mt-1 block text-xs text-muted-foreground">{description}</span></span>{theme === value && <Check size={16} className="mt-1 text-primary" />}</button>)}</div><p className="mt-4 text-xs text-muted-foreground">Your choice is stored in this browser and applies across the site.</p></motion.section>
      <motion.section {...entrance(0.1)} className="border border-border bg-background p-5 sm:p-7 xl:col-span-5"><div className="border-b border-border pb-5"><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Security</p><h2 className="mt-2 text-lg font-medium">Change password</h2><p className="mt-1 text-sm text-muted-foreground">Choose a new password for your account.</p></div><form onSubmit={updatePassword} className="mt-5 space-y-4"><div className="space-y-2"><Label htmlFor="settings-password">New password</Label><Input id="settings-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required placeholder="At least 6 characters" /></div><Button type="submit" disabled={savingPassword} className="h-10 rounded-none bg-foreground px-4 text-background hover:bg-foreground/85">{savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update password</Button></form></motion.section>
    </div>

    <motion.section {...entrance(0.12)} className="grid gap-5 border border-border p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6"><div><div className="flex items-center gap-2"><ArrowDownToLine size={17} className="text-primary" /><h2 className="font-medium">Export your workspace</h2></div><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Download your profile, advisor conversations, memories, interviews, decisions, metrics, ideas, actions, and market briefs as a JSON file.</p><p className="mt-2 text-xs text-muted-foreground">The file is generated in your browser and saved to your device.</p></div><Button variant="outline" onClick={() => void exportWorkspace()} disabled={exporting || loading || !userId} className="rounded-none">{exporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{!exporting && <ArrowDownToLine className="mr-2 h-4 w-4" />}Download my data</Button></motion.section>

    <motion.section {...entrance(0.16)} className="border border-destructive/35 bg-destructive/[0.025] p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2 text-destructive"><AlertTriangle size={17} /><h2 className="font-medium">Delete account and workspace</h2></div><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">This permanently removes your profile, conversations, memories, and all saved workspace records. Download an export first if you want to keep a copy.</p></div><Button variant="destructive" onClick={() => setDeleteOpen(true)} disabled={!userId}>Review deletion</Button></div></motion.section>

    <AlertDialog open={deleteOpen} onOpenChange={(open) => { if (!deleting) { setDeleteOpen(open); if (!open) setDeletePhrase(""); } }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete your Chanakya account?</AlertDialogTitle><AlertDialogDescription>This cannot be undone. Your account and associated workspace records will be permanently removed. Type <strong>DELETE MY ACCOUNT</strong> to continue.</AlertDialogDescription></AlertDialogHeader><div className="space-y-2"><Label htmlFor="delete-confirmation">Confirmation phrase</Label><Input id="delete-confirmation" value={deletePhrase} onChange={(event) => setDeletePhrase(event.target.value)} autoComplete="off" /></div><AlertDialogFooter><AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel><AlertDialogAction disabled={deleting || deletePhrase !== "DELETE MY ACCOUNT"} onClick={(event) => { event.preventDefault(); void deleteAccount(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Permanently delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
