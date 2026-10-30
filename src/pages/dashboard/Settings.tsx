import { useEffect, useState } from "react";
import { Check, Loader2, Monitor, Moon, Sun } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Theme = "light" | "dark";
const THEME_KEY = "chanakya-theme";

export default function Settings() {
  const [theme, setTheme] = useState<Theme>("light");
  const [password, setPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    const initialTheme: Theme = stored === "dark" ? "dark" : "light";
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  const changeTheme = (nextTheme: Theme) => {
    setTheme(nextTheme);
    localStorage.setItem(THEME_KEY, nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  };

  const updatePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) toast({ title: "Could not update password", description: error.message, variant: "destructive" });
    else { setPassword(""); toast({ title: "Password updated", description: "Your new password is now active." }); }
    setSavingPassword(false);
  };

  const themes: { value: Theme; label: string; description: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", description: "Warm paper and ink", icon: Sun },
    { value: "dark", label: "Dark", description: "Low light workspace", icon: Moon },
  ];

  return <div>
    <PageHeader eyebrow="Workspace preferences" title="Settings" description="Make Chanakya feel right for your work. Appearance is saved on this device; account security is managed by Supabase Auth." />
    <div className="grid gap-6 xl:grid-cols-12">
      <section className="border border-border bg-card p-5 sm:p-7 xl:col-span-7"><div className="flex items-start justify-between border-b border-border pb-5"><div><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Display</p><h2 className="mt-2 text-lg font-medium">Appearance</h2><p className="mt-1 text-sm text-muted-foreground">Choose the theme for this browser.</p></div><Monitor size={18} className="text-muted-foreground" /></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{themes.map(({ value, label, description, icon: Icon }) => <button key={value} type="button" onClick={() => changeTheme(value)} aria-pressed={theme === value} className={`flex items-start gap-3 border p-4 text-left transition-colors ${theme === value ? "border-primary bg-primary/5" : "border-border hover:bg-background"}`}><span className={`grid h-9 w-9 place-items-center ${theme === value ? "bg-primary text-primary-foreground" : "bg-secondary"}`}><Icon size={17} /></span><span className="flex-1"><span className="block text-sm font-medium">{label}</span><span className="mt-1 block text-xs text-muted-foreground">{description}</span></span>{theme === value && <Check size={16} className="mt-1 text-primary" />}</button>)}</div><p className="mt-4 text-xs text-muted-foreground">Your choice is stored in this browser and applies across the site.</p></section>
      <section className="border border-border bg-background p-5 sm:p-7 xl:col-span-5"><div className="border-b border-border pb-5"><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Security</p><h2 className="mt-2 text-lg font-medium">Change password</h2><p className="mt-1 text-sm text-muted-foreground">Choose a new password for your account.</p></div><form onSubmit={updatePassword} className="mt-5 space-y-4"><div className="space-y-2"><Label htmlFor="settings-password">New password</Label><Input id="settings-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required placeholder="At least 6 characters" /></div><Button type="submit" disabled={savingPassword} className="h-10 rounded-none bg-foreground px-4 text-background hover:bg-foreground/85">{savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update password</Button></form></section>
    </div>
    <div className="mt-6 flex items-start gap-3 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /><p>Notification delivery, language preferences, and account deletion are not enabled yet, so they aren’t shown as active controls here.</p></div>
  </div>;
}
