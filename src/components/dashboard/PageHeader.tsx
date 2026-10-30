import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
};

export default function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return <header className="mb-8 flex flex-col justify-between gap-5 border-b border-border pb-7 sm:flex-row sm:items-end">
    <div><p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">{eyebrow}<span className="px-2 text-primary">/</span>Workspace</p><h1 className="mt-3 text-4xl font-medium leading-[0.98] tracking-[-0.055em] sm:text-5xl">{title}</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p></div>
    {action && <div className="shrink-0">{action}</div>}
  </header>;
}
