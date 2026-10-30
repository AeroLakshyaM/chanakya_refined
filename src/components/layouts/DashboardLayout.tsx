import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Activity, BarChart3, Bot, ChevronLeft, ChevronRight, Lightbulb, LogOut, Menu, Settings, Users, UserRound, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const navItems = [
  { path: "/dashboard", label: "Overview", icon: BarChart3, end: true },
  { path: "/dashboard/chatbot", label: "AI Advisors", icon: Bot },
  { path: "/dashboard/market-analysis", label: "Market Analysis", icon: Activity },
  { path: "/dashboard/product-ideas", label: "Product Ideas", icon: Lightbulb },
  { path: "/dashboard/meeting-room", label: "Advisor Sessions", icon: Users },
];

export default function DashboardLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

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

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) toast({ title: "Could not sign out", description: error.message, variant: "destructive" });
    else navigate("/");
  };

  return (
    <div className="min-h-screen bg-background text-foreground md:flex">
      {mobileOpen && <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-black/30 md:hidden" />}
      <aside className={`${mobileOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-background transition-transform md:static md:z-auto md:translate-x-0 ${collapsed ? "md:w-[84px]" : "md:w-64"}`}>
        <div className="flex h-[76px] items-center justify-between border-b border-border px-5">
          <a href="/dashboard" className="flex items-center gap-3" aria-label="Chanakya home">
            <span className="grid h-9 w-9 place-items-center bg-foreground text-base font-semibold text-background">C<span className="text-primary">.</span></span>
            {!collapsed && <span className="text-lg font-medium tracking-tight">chanakya</span>}
          </a>
          <button className="hidden rounded-md p-2 text-muted-foreground hover:bg-muted md:block" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}</button>
          <button className="rounded-md p-2 md:hidden" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={18} /></button>
        </div>
        <div className="px-5 pb-3 pt-7 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{!collapsed && "Workspace"}</div>
        <nav className="flex-1 space-y-1 px-3">
          {navItems.map(({ path, label, icon: Icon, end }) => <NavLink key={path} to={path} end={end} onClick={() => setMobileOpen(false)} title={collapsed ? label : undefined} className={({ isActive }) => `group flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon size={17} strokeWidth={1.8} /><span className={collapsed ? "md:hidden" : ""}>{label}</span>{label === "AI Advisors" && !collapsed && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}</NavLink>)}
        </nav>
        <div className="border-t border-border p-3">
          <NavLink to="/dashboard/profile" onClick={() => setMobileOpen(false)} title={collapsed ? "Profile" : undefined} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 text-sm ${isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><UserRound size={17} /><span className={collapsed ? "md:hidden" : ""}>Profile</span></NavLink>
          <NavLink to="/dashboard/settings" onClick={() => setMobileOpen(false)} title={collapsed ? "Settings" : undefined} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 text-sm ${isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Settings size={17} /><span className={collapsed ? "md:hidden" : ""}>Settings</span></NavLink>
          <div className="mt-3 flex items-center gap-3 border-t border-border px-2 pt-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-sm font-medium">{user?.email?.slice(0, 1).toUpperCase() ?? "U"}</span>
            {!collapsed && <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{user?.user_metadata?.full_name || "Your workspace"}</p><p className="truncate text-xs text-muted-foreground">{user?.email}</p></div>}
            <Button variant="ghost" size="icon" aria-label="Sign out" onClick={signOut}><LogOut size={16} /></Button>
          </div>
        </div>
      </aside>
      <section className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-border bg-background/95 px-5 backdrop-blur md:px-8">
          <div className="flex items-center gap-3"><button className="rounded-md p-2 md:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={20} /></button><span className="text-sm text-muted-foreground">Workspace <span className="px-1.5">/</span><span className="text-foreground">Growth desk</span></span></div>
          <span className="hidden text-xs text-muted-foreground sm:block">A clearer view of what to do next<span className="text-primary">.</span></span>
        </header>
        <main className="mx-auto w-full max-w-[1500px] p-5 md:p-8 lg:p-10"><Outlet /></main>
      </section>
    </div>
  );
}
