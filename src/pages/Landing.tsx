import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight, ArrowUpRight, BarChart3, Bot, Lightbulb, Users } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

const disciplines = [
  { no: "01", name: "AI advisors", detail: "Get grounded perspectives across strategy, finance, operations, product, and more.", icon: Bot },
  { no: "02", name: "Market analysis", detail: "Understand customers, competitors, and the opportunities worth pursuing.", icon: BarChart3 },
  { no: "03", name: "Product ideas", detail: "Shape product bets into a clear, prioritized plan of action.", icon: Lightbulb },
  { no: "04", name: "Advisor sessions", detail: "Explore a hard question through several specialist lenses.", icon: Users },
];

export default function Landing() {
  return <div className="min-h-screen bg-background text-foreground">
    <header className="mx-auto flex max-w-[1440px] items-center justify-between border-b border-border px-5 py-5 md:px-10">
      <BrandLogo className="h-14 w-[84px]" />
      <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex"><a className="editorial-link pb-1" href="#approach">Approach</a><a className="editorial-link pb-1" href="#tools">Tools</a><a className="editorial-link pb-1" href="#about">About</a></div>
      <Link to="/auth" className="flex items-center gap-2 text-sm font-medium editorial-link pb-1">Sign in <ArrowUpRight size={15} /></Link>
    </header>
    <main className="page-enter">
      <section className="mx-auto grid max-w-[1440px] gap-12 px-5 pb-20 pt-24 md:grid-cols-12 md:px-10 md:pb-28 md:pt-36">
        <div className="md:col-span-9"><p className="mb-7 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">A growth workspace for people building things</p><h1 className="max-w-5xl text-[clamp(3.75rem,10vw,9.5rem)] font-medium leading-[0.88] tracking-[-0.065em]">Build with clarity.<br />Grow with <span className="text-primary">conviction.</span></h1></div>
        <div className="flex flex-col justify-end md:col-span-4 md:col-start-8"><p className="max-w-md text-lg leading-relaxed text-muted-foreground">A practical set of AI advisors and decision tools to help your startup find its next best move.</p><Link to="/auth" className="mt-7 flex w-fit items-center gap-3 bg-foreground px-5 py-3.5 text-sm text-background transition-colors hover:bg-primary">Start building <ArrowRight size={16} /></Link><span className="mt-5 text-xs text-muted-foreground">One workspace. Better decisions, every week.</span></div>
      </section>
      <section id="approach" className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-16 md:grid-cols-12 md:px-10 md:py-20"><div className="md:col-span-4"><p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">The approach</p><h2 className="mt-5 max-w-md text-4xl font-medium leading-[0.98] tracking-[-0.05em] md:text-5xl">From big questions to clear next steps.</h2></div><div className="md:col-span-6 md:col-start-7"><p className="text-lg leading-relaxed text-muted-foreground">Running a company means making decisions with incomplete information. Chanakya gives your team a place to think through the options, challenge assumptions, and turn insight into action.</p><a href="#tools" className="editorial-link mt-8 inline-flex items-center gap-2 pb-1 text-sm font-medium">Explore the toolkit <ArrowDown size={15} /></a></div></div>
      </section>
      <section id="tools" className="mx-auto max-w-[1440px] px-5 py-20 md:px-10 md:py-28"><div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Your operating toolkit</p><h2 className="mt-3 text-4xl font-medium tracking-[-0.05em] md:text-6xl">Four ways to move forward<span className="text-primary">.</span></h2></div><p className="max-w-sm text-sm leading-relaxed text-muted-foreground">Built for founders, product leaders, and operators at every stage.</p></div><div className="grid border-l border-t border-border sm:grid-cols-2 lg:grid-cols-4">{disciplines.map(({ no, name, detail, icon: Icon }) => <article key={no} className="flex min-h-[270px] flex-col border-b border-r border-border p-6 md:p-7"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>{no}</span><Icon size={18} strokeWidth={1.6} /></div><h3 className="mt-auto pt-10 text-xl font-medium tracking-tight">{name}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{detail}</p></article>)}</div></section>
      <section id="about" className="bg-foreground text-background"><div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-16 md:grid-cols-12 md:px-10 md:py-24"><p className="text-xs uppercase tracking-[0.16em] text-background/60 md:col-span-3">A better way to think</p><div className="md:col-span-7 md:col-start-6"><h2 className="text-4xl font-medium leading-[0.98] tracking-[-0.05em] md:text-6xl">The right question can change the direction of a company.</h2><p className="mt-6 max-w-xl text-base leading-relaxed text-background/65">Bring the ambition. Chanakya helps you organize the thinking, examine the trade-offs, and keep momentum on the work that matters.</p><Link to="/auth" className="mt-8 inline-flex items-center gap-3 border-b border-background/40 pb-2 text-sm hover:border-primary">Create your workspace <ArrowRight size={16} className="text-primary" /></Link></div></div></section>
    </main>
    <footer className="mx-auto flex max-w-[1440px] flex-wrap justify-between gap-4 px-5 py-7 text-xs text-muted-foreground md:px-10"><span>© 2026 Chanakya</span><span>Made for the next good decision<span className="text-primary">.</span></span><Link to="/auth" className="editorial-link pb-1">Get started ↗</Link></footer>
  </div>;
}
