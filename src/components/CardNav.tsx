import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import BrandLogo from "@/components/BrandLogo";

const sections = [
  {
    label: "Explore",
    description: "A little more room to think through the next move.",
    links: [
      { label: "Our approach", href: "/approach" },
      { label: "The toolkit", href: "/tools" },
      { label: "About Chanakya", href: "/about" },
    ],
  },
  {
    label: "Founder tools",
    description: "Go from an open question to a useful next step.",
    links: [
      { label: "AI advisors", href: "/dashboard/chatbot" },
      { label: "Market analysis", href: "/dashboard/market-analysis" },
      { label: "Product ideas", href: "/dashboard/product-ideas" },
    ],
  },
  {
    label: "Your workspace",
    description: "Keep the thinking, decisions, and follow-through together.",
    links: [
      { label: "Overview", href: "/dashboard" },
      { label: "Advisor sessions", href: "/dashboard/meeting-room" },
      { label: "Decision journal", href: "/dashboard/decision-journal" },
    ],
  },
];

export default function CardNav() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [open]);

  const close = () => setOpen(false);
  const renderLink = (link: (typeof sections)[number]["links"][number]) => {
    const content = <>{link.label}<ArrowUpRight size={14} strokeWidth={1.7} aria-hidden="true" /></>;
    return link.href.startsWith("/")
      ? <Link key={link.href} to={link.href} className="card-nav-link" onClick={close}>{content}</Link>
      : <a key={link.href} href={link.href} className="card-nav-link" onClick={close}>{content}</a>;
  };

  return <header ref={rootRef} className="card-nav-shell">
    <nav className="card-nav" aria-label="Main navigation" data-open={open}>
      <div className="card-nav-bar">
        <button type="button" className="card-nav-toggle" aria-expanded={open} aria-controls="card-nav-menu" onClick={() => setOpen(value => !value)}>
          {open ? <X size={18} strokeWidth={1.7} /> : <Menu size={18} strokeWidth={1.7} />}
          <span>{open ? "Close" : "Menu"}</span>
        </button>
        <BrandLogo className="card-nav-logo h-16 w-24" />
        <Link to="/auth" className="card-nav-cta" onClick={close}>Get started <ArrowUpRight size={15} /></Link>
      </div>
      <div id="card-nav-menu" className="card-nav-content" aria-hidden={!open}>
        <div className="card-nav-cards">
          {sections.map((section, index) => <section className="card-nav-card" key={section.label} style={{ "--card-index": index } as CSSProperties}>
            <div><h2>{section.label}</h2><p>{section.description}</p></div>
            <div className="card-nav-links">{section.links.map(renderLink)}</div>
          </section>)}
        </div>
      </div>
    </nav>
  </header>;
}
