import { Link, useLocation } from "react-router-dom";
import { ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, Bot, Compass, Lightbulb, Users } from "lucide-react";
import CardNav from "@/components/CardNav";

function AboutPage() {
  return <main className="company-page company-about page-enter">
    <section className="about-hero">
      <p className="eyebrow">A note on why we exist</p>
      <h1>Building a company is a thinking job.</h1>
      <p className="about-lede">The calendar fills up with doing. The hard part is making enough room to decide what is worth doing in the first place.</p>
      <span className="about-mark" aria-hidden="true"><Compass size={94} strokeWidth={0.8} /></span>
    </section>
    <section className="about-story">
      <div className="about-story-label"><span>OUR POINT OF VIEW</span><span>01 — 03</span></div>
      <div className="about-story-copy">
        <h2>Good judgment deserves good tools.</h2>
        <p>Founders are asked to make high-stakes calls with partial information: where to focus, what customers need, when to change course. Most tools help teams move faster. Chanakya is here to help them pause just long enough to move in the right direction.</p>
        <p>We bring useful perspectives into one working space, so a complex question can become a clearer choice and a next step you can actually take.</p>
      </div>
    </section>
    <section className="about-principles">
      <p className="eyebrow">What we believe</p>
      <div className="about-principle-grid">
        <article><span>01</span><h3>Context comes first.</h3><p>Advice only helps when it accounts for the stage, constraints, and people behind the decision.</p></article>
        <article><span>02</span><h3>Trade-offs are the work.</h3><p>There is rarely one perfect answer. Seeing what each path asks of you is progress.</p></article>
        <article><span>03</span><h3>Insight should go somewhere.</h3><p>A useful conversation ends with a clearer choice, a small experiment, or a plan to learn more.</p></article>
      </div>
    </section>
    <section className="about-signoff"><p>For the people turning uncertain beginnings into something real.</p><Link to="/auth">Make room to think <ArrowUpRight size={16} /></Link></section>
  </main>;
}

const approachSteps = [
  { number: "01", title: "Name the decision", prompt: "What are you actually choosing?", body: "Write the decision as a clear question. Separate the decision itself from the noise around it, and note what makes it timely.", output: "A question worth answering" },
  { number: "02", title: "Make the assumptions visible", prompt: "What would need to be true?", body: "Lay out the evidence you have, the things you are assuming, and the perspectives you may be missing. This is where useful disagreement can surface.", output: "A sharper view of the unknowns" },
  { number: "03", title: "Pick the next reversible move", prompt: "What can you learn before you commit?", body: "Compare the costs and consequences of your options. Choose a test, conversation, or small commitment that reduces uncertainty without pretending to remove it.", output: "A concrete next step" },
];

function ApproachPage() {
  return <main className="company-page company-approach page-enter">
    <section className="approach-hero">
      <div><p className="eyebrow">A field guide for hard calls</p><h1>Think it through.<br /><span>Then move.</span></h1></div>
      <div className="approach-hero-note"><p>When the answer is not obvious, use a process that makes the question smaller and the next step clearer.</p><a href="#decision-method">Follow the method <ArrowDownRight size={16} /></a></div>
    </section>
    <section id="decision-method" className="approach-method">
      <div className="approach-rail"><span>THE DECISION METHOD</span><span>TAKE IT ONE STEP AT A TIME</span></div>
      {approachSteps.map(step => <article className="approach-step" key={step.number}>
        <span className="approach-number">{step.number}</span>
        <div className="approach-step-main"><h2>{step.title}</h2><p>{step.body}</p></div>
        <aside><span>ASK YOURSELF</span><p>{step.prompt}</p><span className="approach-output">{step.output}</span></aside>
      </article>)}
    </section>
    <section className="approach-close"><p>Clarity is not certainty. It is knowing what you are doing next, and why.</p><Link to="/tools">Use the toolkit <ArrowRight size={16} /></Link></section>
  </main>;
}

const toolCards = [
  { number: "01", title: "AI advisors", category: "THINKING PARTNER", body: "Bring a messy question. Compare strategic, financial, product, and operating perspectives, then decide what holds up in your context.", href: "/dashboard/chatbot", action: "Talk it through", icon: Bot, tone: "tool-tone-dark" },
  { number: "02", title: "Market analysis", category: "OUTSIDE-IN VIEW", body: "Map customer needs, competitor moves, and market signals to see where the opportunity is real—and what still needs checking.", href: "/dashboard/market-analysis", action: "Study the market", icon: BarChart3, tone: "tool-tone-paper" },
  { number: "03", title: "Product ideas", category: "FROM HUNCH TO TEST", body: "Turn a promising idea into a prioritized set of bets, with a sensible first experiment and a reason to run it.", href: "/dashboard/product-ideas", action: "Shape an idea", icon: Lightbulb, tone: "tool-tone-orange" },
  { number: "04", title: "Advisor sessions", category: "MORE THAN ONE LENS", body: "Put a difficult choice in the middle of the table and explore its trade-offs with several specialist perspectives.", href: "/dashboard/meeting-room", action: "Start a session", icon: Users, tone: "tool-tone-paper" },
];

function ToolkitPage() {
  return <main className="company-page company-toolkit page-enter">
    <section className="toolkit-hero">
      <p className="eyebrow">A set of tools for the work behind the work</p>
      <div className="toolkit-title-row"><h1>Bring the question.<br /><span>Find your next move.</span></h1><p>Each tool helps with a different part of building: seeing the landscape, testing an idea, or making a call with more context.</p></div>
      <div className="toolkit-rule"><span>FOUR WAYS IN</span><span>01 — 04</span></div>
    </section>
    <section className="toolkit-grid" aria-label="Chanakya tools">
      {toolCards.map(({ number, title, category, body, href, action, icon: Icon, tone }) => <article className={`toolkit-card ${tone}`} key={number}>
        <div className="toolkit-card-top"><span>{number} / {category}</span><Icon size={20} strokeWidth={1.4} /></div>
        <div className="toolkit-card-copy"><h2>{title}</h2><p>{body}</p></div>
        <Link to={href}>{action}<ArrowUpRight size={15} /></Link>
      </article>)}
    </section>
    <p className="toolkit-footnote">Start with one question. Bring in another tool when the problem asks for it.</p>
  </main>;
}

export default function CompanyPage() {
  const { pathname } = useLocation();
  const page = pathname.split("/").filter(Boolean)[0];
  return <div className={`min-h-screen bg-background text-foreground company-route-${page}`}>
    <CardNav />
    {page === "approach" ? <ApproachPage /> : page === "tools" ? <ToolkitPage /> : <AboutPage />}
    <footer className="mx-auto flex max-w-[1440px] justify-between px-5 py-7 text-xs text-muted-foreground md:px-10"><Link to="/" className="editorial-link pb-1">Back to home</Link><span>© 2026 Chanakya</span></footer>
  </div>;
}
