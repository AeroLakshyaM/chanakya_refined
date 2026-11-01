import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Activity, BarChart3, Bot, ChevronLeft, ChevronRight, Lightbulb, Loader2, LogOut, Menu, Settings, Target, Users, UserRound, X, SearchCheck, BookOpenCheck, Gauge } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import BrandLogo from "@/components/BrandLogo";

const navItems = [
  { path: "/dashboard", label: "Overview", icon: BarChart3, end: true },
  { path: "/dashboard/memory", label: "Workspace Memory", icon: BookOpenCheck },
  { path: "/dashboard/chatbot", label: "AI Advisors", icon: Bot },
  { path: "/dashboard/market-analysis", label: "Market Analysis", icon: Activity },
  { path: "/dashboard/product-ideas", label: "Product Ideas", icon: Lightbulb },
  { path: "/dashboard/growth-plan", label: "Growth Plan", icon: Target },
  { path: "/dashboard/customer-discovery", label: "Customer Discovery", icon: SearchCheck },
  { path: "/dashboard/decision-journal", label: "Decision Journal", icon: BookOpenCheck },
  { path: "/dashboard/founder-pulse", label: "Founder Pulse", icon: Gauge },
  { path: "/dashboard/meeting-room", label: "Advisor Sessions", icon: Users },
];
const utilityItems = [
  { path: "/dashboard/profile", label: "Profile", icon: UserRound },
  { path: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("chanakya-sidebar-collapsed") === "true");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [checkingWorkspace, setCheckingWorkspace] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const currentPage = [...navItems, ...utilityItems].find((item) => item.path === location.pathname)?.label ?? "Workspace";
  const { toast } = useToast();

  const toggleSidebar = () => setCollapsed((current) => {
    const next = !current;
    localStorage.setItem("chanakya-sidebar-collapsed", String(next));
    return next;
  });

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (!session) navigate("/auth");
      else setUser(session.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/auth");
      else setUser(session.user);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void supabase.from("profiles").select("onboarding_completed_at").eq("user_id", user.id).maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Could not check onboarding status:", error);
          toast({ title: "Could not check your setup", description: "Apply the latest Supabase migration to enable personalized onboarding.", variant: "destructive" });
        } else if (!data?.onboarding_completed_at) {
          navigate("/onboarding", { replace: true });
        }
        setCheckingWorkspace(false);
      });
    return () => { active = false; };
  }, [user?.id, navigate, toast]);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) toast({ title: "Could not sign out", description: error.message, variant: "destructive" });
    else navigate("/");
  };

  if (checkingWorkspace || !user) return <div className="grid min-h-screen place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Opening your workspace" /></div>;

  return (
    <div className="min-h-screen bg-background text-foreground md:flex">
      {mobileOpen && <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-black/30 md:hidden" />}
      <aside className={`${mobileOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-50 flex h-screen w-72 flex-col border-r border-border bg-background transition-[width,transform] duration-300 ease-out md:sticky md:top-0 md:z-40 md:translate-x-0 ${collapsed ? "md:w-[88px]" : "md:w-64"}`}>
        <div className={`flex h-[76px] shrink-0 items-center justify-between border-b border-border ${collapsed ? "px-2" : "px-5"}`}>
          <BrandLogo to="/dashboard" className={collapsed ? "h-9 w-9" : "h-12 w-[72px]"} />
          <button className={`hidden rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:block ${collapsed ? "p-1.5" : "p-2"}`} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} onClick={toggleSidebar}>{collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}</button>
          <button className="rounded-md p-2 md:hidden" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={18} /></button>
        </div>
        <div className={`text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground ${collapsed ? "px-2 pb-2 pt-5" : "px-5 pb-3 pt-7"}`}>{collapsed ? <span className="mx-auto block h-px w-6 bg-border" aria-hidden="true" /> : "Workspace"}</div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3">
          {navItems.map(({ path, label, icon: Icon, end }) => <NavLink key={path} to={path} end={end} onClick={() => setMobileOpen(false)} title={collapsed ? label : undefined} className={({ isActive }) => `group flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon size={17} strokeWidth={1.8} /><span className={collapsed ? "md:hidden" : ""}>{label}</span>{label === "AI Advisors" && !collapsed && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}</NavLink>)}
        </nav>
        <div className="border-t border-border p-3">
          <NavLink to="/dashboard/profile" onClick={() => setMobileOpen(false)} title={collapsed ? "Profile" : undefined} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 text-sm ${isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><UserRound size={17} /><span className={collapsed ? "md:hidden" : ""}>Profile</span></NavLink>
          <NavLink to="/dashboard/settings" onClick={() => setMobileOpen(false)} title={collapsed ? "Settings" : undefined} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 text-sm ${isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Settings size={17} /><span className={collapsed ? "md:hidden" : ""}>Settings</span></NavLink>
          <div className={`mt-3 flex items-center border-t border-border ${collapsed ? "justify-center gap-0 px-0 pt-3" : "gap-3 px-2 pt-4"}`}>
            <span className={`grid shrink-0 place-items-center rounded-full bg-secondary font-medium ${collapsed ? "h-8 w-8 text-xs" : "h-9 w-9 text-sm"}`}>{user?.email?.slice(0, 1).toUpperCase() ?? "U"}</span>
            {!collapsed && <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{user?.user_metadata?.full_name || "Your workspace"}</p><p className="truncate text-xs text-muted-foreground">{user?.email}</p></div>}
            <Button variant="ghost" size="icon" className={collapsed ? "h-8 w-8" : ""} title={collapsed ? "Sign out" : undefined} aria-label="Sign out" onClick={signOut}><LogOut size={16} /></Button>
          </div>
        </div>
      </aside>
      <section className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-border bg-background/95 px-5 backdrop-blur md:px-8">
          <div className="flex items-center gap-3"><button className="rounded-md p-2 md:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={20} /></button><span className="text-sm text-muted-foreground">Workspace <span className="px-1.5">/</span><span className="text-foreground">{currentPage}</span></span></div>
          <span className="hidden text-xs text-muted-foreground sm:block">A clearer view of what to do next<span className="text-primary">.</span></span>
        </header>
        <AnimatePresence mode="wait" initial={false}>
          <motion.main key={location.pathname} initial={{ opacity: 0, y: reduceMotion ? 0 : 10, filter: reduceMotion ? "blur(0px)" : "blur(2px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: reduceMotion ? 0 : -5, filter: reduceMotion ? "blur(0px)" : "blur(2px)" }} transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }} className="mx-auto w-full max-w-[1500px] p-5 md:p-8 lg:p-10"><Outlet /></motion.main>
        </AnimatePresence>
      </section>
    </div>
  );
}
