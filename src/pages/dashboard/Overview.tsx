import { Link } from "react-router-dom";
import { Activity, ArrowRight, ArrowUpRight, Bot, Compass, Lightbulb, MessageSquareText, Target, Users } from "lucide-react";

const tools = [
  { title: "AI advisors", description: "Work through a decision with a specialist point of view.", path: "/dashboard/chatbot", icon: Bot, eyebrow: "Think it through" },
  { title: "Market analysis", description: "Frame your market, audience, and competitive landscape.", path: "/dashboard/market-analysis", icon: Activity, eyebrow: "Find the signal" },
  { title: "Product ideas", description: "Collect opportunities and turn them into a focused backlog.", path: "/dashboard/product-ideas", icon: Lightbulb, eyebrow: "Shape what’s next" },
  { title: "Advisor sessions", description: "Bring several perspectives to one business question.", path: "/dashboard/meeting-room", icon: Users, eyebrow: "See every angle" },
];

const steps = [
  { no: "01", label: "Set the context", detail: "Describe your company and the decision in front of you.", icon: Compass },
  { no: "02", label: "Explore the options", detail: "Use an advisor to challenge assumptions and surface trade-offs.", icon: MessageSquareText },
  { no: "03", label: "Choose a next step", detail: "Capture a clear action and keep momentum with your team.", icon: Target },
];

export default function Overview() {
  return <div className="space-y-12 pb-8">
    <section className="grid gap-8 border-b border-border pb-9 lg:grid-cols-12 lg:items-end">
      <div className="lg:col-span-8"><p className="mb-5 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Your growth workspace <span className="text-primary">/</span> Overview</p><h1 className="max-w-4xl text-5xl font-medium leading-[0.95] tracking-[-0.06em] sm:text-6xl lg:text-[5.25rem]">A sharper way to<br className="hidden sm:block" /> move your business <span className="text-primary">forward.</span></h1><p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">Bring the challenge you’re working on. Leave with a clearer view of what to do next.</p></div>
      <Link to="/dashboard/chatbot" className="group flex h-12 w-fit items-center gap-3 bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-primary">Start with an advisor <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></Link>
    </section>

    <section className="grid gap-8 lg:grid-cols-12">
      <div className="lg:col-span-7"><div className="mb-5 flex items-end justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">The workspace</p><h2 className="mt-2 text-2xl font-medium tracking-tight">Tools for the work ahead</h2></div><span className="text-xs text-muted-foreground">01 — 04</span></div>
        <div className="grid border-l border-t border-border sm:grid-cols-2">{tools.map(({ title, description, path, icon: Icon, eyebrow }, index) => <Link key={title} to={path} className="group flex min-h-[194px] flex-col border-b border-r border-border bg-background p-5 transition-colors hover:bg-card sm:p-6"><div className="flex items-center justify-between"><span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{eyebrow}</span><ArrowUpRight size={16} className="text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" /></div><div className="mt-auto pt-8"><div className="flex items-center gap-2.5"><Icon size={18} strokeWidth={1.7} className="text-primary" /><h3 className="text-lg font-medium tracking-tight">{title}</h3></div><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p></div></Link>)}</div>
      </div>
      <aside className="bg-foreground p-6 text-background sm:p-8 lg:col-span-5"><p className="text-xs font-medium uppercase tracking-[0.16em] text-background/55">A simple rhythm</p><h2 className="mt-3 text-3xl font-medium leading-tight tracking-[-0.04em]">Turn an open question into forward motion.</h2><div className="mt-8 space-y-0">{steps.map(({ no, label, detail, icon: Icon }) => <div key={no} className="flex gap-4 border-t border-background/20 py-4"><span className="pt-0.5 text-[11px] tabular-nums text-background/50">{no}</span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><Icon size={15} className="text-primary" /><h3 className="text-sm font-medium">{label}</h3></div><p className="mt-1 text-xs leading-relaxed text-background/60">{detail}</p></div></div>)}</div></aside>
    </section>

    <section className="grid gap-6 border-y border-border py-7 sm:grid-cols-3">{[{ label: "Think clearly", copy: "Make space for the hard questions." }, { label: "Move deliberately", copy: "Focus on the work with the most leverage." }, { label: "Learn continuously", copy: "Turn each decision into better context." }].map((item, i) => <div key={item.label} className="flex gap-4"><span className="text-xs tabular-nums text-primary">0{i + 1}</span><div><h3 className="text-sm font-medium">{item.label}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.copy}</p></div></div>)}</section>
  </div>;
}
