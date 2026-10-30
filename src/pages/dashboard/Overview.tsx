import { Link } from "react-router-dom";
import { Activity, ArrowUpRight, Bot, Lightbulb, MessageSquareText, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const tools = [
  { title: "AI advisor", description: "Pressure-test a decision with a specialist.", path: "/dashboard/chatbot", icon: Bot, mark: "01" },
  { title: "Market analysis", description: "Map your market, customers, and competition.", path: "/dashboard/market-analysis", icon: Activity, mark: "02" },
  { title: "Product ideas", description: "Turn opportunities into a prioritized backlog.", path: "/dashboard/product-ideas", icon: Lightbulb, mark: "03" },
  { title: "Advisor sessions", description: "Bring several perspectives to one question.", path: "/dashboard/meeting-room", icon: Users, mark: "04" },
];

export default function Overview() {
  return <div className="space-y-10">
    <div className="flex flex-col justify-between gap-6 border-b border-border pb-8 md:flex-row md:items-end">
      <div><p className="mb-4 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">Your growth workspace <span className="text-primary">/</span></p><h1 className="max-w-3xl text-5xl font-medium leading-[0.96] tracking-[-0.055em] sm:text-6xl lg:text-7xl">Make the next move <span className="text-primary">count.</span></h1><p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">A practical home for sharper decisions, better product bets, and sustainable company growth.</p></div>
      <Button asChild className="h-11 w-fit rounded-none bg-foreground px-5 text-background hover:bg-foreground/85"><Link to="/dashboard/chatbot"><Plus size={16} className="mr-2" />Ask an advisor</Link></Button>
    </div>
    <div className="grid gap-4 sm:grid-cols-3">
      {[{ label: "AI conversations", value: "—", note: "Start your first session", icon: MessageSquareText }, { label: "Ideas in play", value: "—", note: "Build a focused roadmap", icon: Lightbulb }, { label: "Workspace health", value: "Ready", note: "Your tools are available", icon: Activity }].map(({ label, value, note, icon: Icon }) => <div key={label} className="border border-border bg-card p-5"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{label}</p><Icon size={17} className="text-muted-foreground" /></div><p className="mt-7 text-3xl font-medium tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{note}</p></div>)}
    </div>
    <section>
      <div className="mb-5 flex items-end justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">Tools for forward motion</p><h2 className="mt-2 text-2xl font-medium tracking-tight">Choose where to focus</h2></div><span className="hidden text-xs text-muted-foreground sm:block">Built for founders and operators</span></div>
      <div className="grid border-l border-t border-border sm:grid-cols-2">
        {tools.map(({ title, description, path, icon: Icon, mark }) => <Link key={title} to={path} className="group border-b border-r border-border bg-background p-6 transition-colors hover:bg-card md:p-8"><div className="flex items-start justify-between"><span className="text-xs tabular-nums text-muted-foreground">{mark}</span><ArrowUpRight size={17} className="text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" /></div><div className="mt-10 flex items-center gap-3"><Icon size={20} strokeWidth={1.7} /><h3 className="text-xl font-medium tracking-tight">{title}</h3></div><p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p></Link>)}
      </div>
    </section>
    <aside className="flex flex-col justify-between gap-5 border-y border-border py-6 sm:flex-row sm:items-center"><div><p className="text-sm font-medium">A good first step</p><p className="mt-1 text-sm text-muted-foreground">Tell an advisor about your company, your current goal, and what is holding you back.</p></div><Link to="/dashboard/chatbot" className="editorial-link flex w-fit items-center gap-2 pb-1 text-sm font-medium">Start a conversation <ArrowUpRight size={15} /></Link></aside>
  </div>;
}
