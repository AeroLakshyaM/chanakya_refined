import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import BrandLogo from "@/components/BrandLogo";

const messageFor = (error: unknown) => error instanceof Error ? error.message : "Something went wrong. Please try again.";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [resetSent, setResetSent] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    const isRecoveryLink = new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery";
    setRecoveryMode(isRecoveryLink);
    supabase.auth.getSession()
      .then(({ data: { session } }) => { if (active && session && !isRecoveryLink) navigate("/dashboard", { replace: true }); })
      .catch((error: unknown) => { if (active) toast({ title: "Could not check your session", description: messageFor(error), variant: "destructive" }); })
      .finally(() => { if (active) setInitialLoading(false); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
      else if (session && (event === "SIGNED_IN" || event === "USER_UPDATED")) {
        navigate("/dashboard", { replace: true });
      }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [navigate, toast]);

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { full_name: `${firstName.trim()} ${lastName.trim()}`.trim() },
        },
      });
      if (error) throw error;
      if (data.session) {
        toast({ title: "Your workspace is ready", description: "You’re signed in." });
        navigate("/dashboard", { replace: true });
      } else {
        toast({ title: "Sign-up did not start a session", description: "Check that Confirm email is turned off in your Supabase Email provider settings.", variant: "destructive" });
      }
    } catch (error: unknown) {
      toast({ title: "Could not create your account", description: messageFor(error), variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      toast({ title: "Welcome back", description: "You’re signed in." });
      navigate("/dashboard", { replace: true });
    } catch (error: unknown) {
      toast({ title: "Could not sign in", description: messageFor(error), variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      toast({ title: "Enter your email first", description: "We’ll send a password reset link to that address." });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth` });
      if (error) throw error;
      setResetSent(true);
      toast({ title: "Reset link sent", description: "Check your inbox for the password reset email." });
    } catch (error: unknown) {
      toast({ title: "Could not send reset link", description: messageFor(error), variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handlePasswordUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Password updated", description: "Your account is ready to use." });
      navigate("/dashboard", { replace: true });
    } catch (error: unknown) {
      toast({ title: "Could not update password", description: messageFor(error), variant: "destructive" });
    } finally { setLoading(false); }
  };

  if (initialLoading) return <div className="grid min-h-screen place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Checking sign-in status" /></div>;

  return (
    <main className="page-enter min-h-screen bg-background px-5 py-8 md:px-10">
      <header className="mx-auto flex max-w-[1440px] items-center justify-between"><BrandLogo className="h-14 w-[84px]" /><Link to="/" className="editorial-link flex items-center gap-2 pb-1 text-sm text-muted-foreground"><ArrowLeft size={15} /> Back to home</Link></header>
      <div className="mx-auto grid min-h-[calc(100vh-100px)] max-w-[1180px] items-center gap-12 py-12 md:grid-cols-2 md:gap-20">
        <section className="hidden md:block"><p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Your growth workspace</p><h1 className="mt-6 text-6xl font-medium leading-[0.92] tracking-[-0.06em] lg:text-7xl">A clearer way<br />to move <span className="text-primary">forward.</span></h1><p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">Sign in to continue building with thoughtful tools and specialist AI advisors.</p><div className="mt-14 border-t border-border pt-5 text-sm text-muted-foreground">Strategy · Product · Market · Operations</div></section>
        <section className="mx-auto w-full max-w-md">
          <div className="mb-8"><p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Welcome to Chanakya</p><h2 className="mt-3 text-3xl font-medium tracking-tight">Make your next move.</h2><p className="mt-2 text-sm text-muted-foreground">Sign in or create an account to open your workspace.</p></div>
          {recoveryMode ? <form onSubmit={handlePasswordUpdate} className="space-y-5"><div><h3 className="text-xl font-medium">Set a new password</h3><p className="mt-1 text-sm text-muted-foreground">Choose a new password for your account.</p></div><div className="space-y-2"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} required /></div><Button type="submit" className="h-11 w-full rounded-none bg-foreground text-background hover:bg-foreground/85" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save new password"}</Button></form> : <>
          {resetSent && <div className="mb-5 border border-border bg-card p-4 text-sm text-muted-foreground" role="status">A password reset link has been sent to <span className="font-medium text-foreground">{email}</span>.</div>}
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="mb-6 grid h-11 w-full grid-cols-2 rounded-none border-b border-border bg-transparent p-0">
              <TabsTrigger value="signin" className="h-11 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Sign in</TabsTrigger>
              <TabsTrigger value="signup" className="h-11 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="mt-0">
              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="space-y-2"><Label htmlFor="signin-email">Email</Label><Input id="signin-email" type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                <div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="signin-password">Password</Label><button type="button" onClick={handlePasswordReset} disabled={loading} className="editorial-link pb-0.5 text-xs text-muted-foreground disabled:opacity-50">Forgot password?</button></div><Input id="signin-password" type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
                <Button type="submit" className="h-11 w-full rounded-none bg-foreground text-background hover:bg-foreground/85" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign in <ArrowRight className="ml-2 h-4 w-4" /></>}</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup" className="mt-0">
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="first-name">First name</Label><Input id="first-name" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></div><div className="space-y-2"><Label htmlFor="last-name">Last name</Label><Input id="last-name" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} required /></div></div>
                <div className="space-y-2"><Label htmlFor="signup-email">Work email</Label><Input id="signup-email" type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => { setEmail(e.target.value); setResetSent(false); }} required /></div>
                <div className="space-y-2"><Label htmlFor="signup-password">Password</Label><Input id="signup-password" type="password" autoComplete="new-password" placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required /><p className="text-xs text-muted-foreground">Use at least 6 characters.</p></div>
                <Button type="submit" className="h-11 w-full rounded-none bg-foreground text-background hover:bg-foreground/85" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create account <ArrowRight className="ml-2 h-4 w-4" /></>}</Button>
                <p className="text-xs leading-relaxed text-muted-foreground">By creating an account, you agree to use your workspace responsibly.</p>
              </form>
            </TabsContent>
          </Tabs>
          </>}
        </section>
      </div>
    </main>
  );
}
