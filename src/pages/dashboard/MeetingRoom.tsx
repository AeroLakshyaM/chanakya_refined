import { Link } from "react-router-dom";
import { ArrowRight, AudioLines, Bot, CalendarDays, CircleDot, FileText, Users } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";

const agenda = [
  { icon: CircleDot, title: "Frame the decision", copy: "Name the outcome you need and the constraints that matter." },
  { icon: Users, title: "Hear a focused perspective", copy: "Choose an advisor persona that fits the question." },
  { icon: FileText, title: "Capture the next move", copy: "Turn the conversation into one clear action to validate." },
];

export default function MeetingRoom() {
  return <div>
    <PageHeader eyebrow="Structured thinking" title="Advisor sessions" description="Give an important decision the time and structure it deserves. Start with a focused question, then work toward an actionable next step." />
    <section className="grid gap-0 border border-border lg:grid-cols-12">
      <div className="bg-foreground p-6 text-background sm:p-9 lg:col-span-7"><p className="text-xs font-medium uppercase tracking-[0.15em] text-background/55">A useful session starts here</p><h2 className="mt-4 max-w-xl text-4xl font-medium leading-[0.98] tracking-[-0.05em] sm:text-5xl">Bring one decision. Leave with a direction.</h2><p className="mt-5 max-w-lg text-sm leading-relaxed text-background/65">Chanakya’s current session experience is a guided conversation with one AI advisor at a time. Scheduling, video calls, and multi-advisor transcripts are not available yet.</p><Link to="/dashboard/chatbot" className="mt-8 inline-flex h-11 items-center gap-3 bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Open advisor chat <ArrowRight size={16} /></Link></div>
      <div className="flex flex-col justify-center divide-y divide-border bg-card px-6 sm:px-8 lg:col-span-5">{agenda.map(({ icon: Icon, title, copy }, index) => <div key={title} className="flex gap-4 py-5"><span className="pt-0.5 text-xs tabular-nums text-muted-foreground">0{index + 1}</span><div><div className="flex items-center gap-2"><Icon size={16} className="text-primary" /><h3 className="text-sm font-medium">{title}</h3></div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{copy}</p></div></div>)}</div>
    </section>
    <section className="mt-8 grid gap-4 sm:grid-cols-2"><div className="border border-border p-5"><AudioLines size={17} className="text-muted-foreground" /><h3 className="mt-4 text-base font-medium">A clear session brief</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Start by sharing the context, who is affected, and what a good outcome would look like.</p></div><div className="border border-border p-5"><Bot size={17} className="text-muted-foreground" /><h3 className="mt-4 text-base font-medium">One specialist at a time</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Choose from strategy, finance, operations, technology, marketing, people, legal, or product guidance.</p></div></section>
    <div className="mt-8 flex items-center gap-3 border-t border-border pt-5 text-sm text-muted-foreground"><CalendarDays size={16} /><span>Session scheduling will be added when calendar and meeting storage are connected.</span></div>
  </div>;
}
