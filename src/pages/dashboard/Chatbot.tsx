import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Sparkles, ArrowUpRight, Check, LockKeyhole, MessageSquareText, Plus, Clock3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/dashboard/PageHeader";
import FormattedAnswer from "@/components/dashboard/FormattedAnswer";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  advisor?: string;
  timestamp: Date;
};
type Conversation = { id: string; title: string | null; updated_at: string };
type MemoryChoice = { id: string; title: string; category: string; content: string; source_label: string; source_date: string | null; last_confirmed_at: string };
const db = supabase as unknown as SupabaseClient;

const botPersonas = [
  { name: "Business Strategist", color: "", icon: "BS", description: "Strategic planning & growth" },
  { name: "Financial Expert", color: "", icon: "FE", description: "Finance & investment advice" },
  { name: "Operations Specialist", color: "", icon: "OS", description: "Process optimization" },
  { name: "Technology Consultant", color: "", icon: "TC", description: "Tech solutions & innovation" },
  { name: "Marketing Guru", color: "", icon: "MG", description: "Marketing & brand strategy" },
  { name: "HR Professional", color: "", icon: "HR", description: "People & culture" },
  { name: "Legal Advisor", color: "", icon: "LA", description: "Legal & compliance" },
  { name: "Product Manager", color: "", icon: "PM", description: "Product development" },
];

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedBot, setSelectedBot] = useState<string>("");
  const [responseStyle, setResponseStyle] = useState<"natural" | "decision_brief">("natural");
  const [businessContext, setBusinessContext] = useState("");
  const [memoryChoices, setMemoryChoices] = useState<MemoryChoice[]>([]);
  const [memorySelection, setMemorySelection] = useState<string[] | null>(null);
  const [includeProfile, setIncludeProfile] = useState(true);
  const [roundtable, setRoundtable] = useState(false);
  const [usedSources, setUsedSources] = useState<{ title: string; source_label: string; source_date: string | null; category: string }[]>([]);
  const location = useLocation();
  const reviewContext = (location.state as { confirmedWorkspaceContext?: string; contextSources?: { kind: string; title: string; date: string; href: string }[] } | null)?.confirmedWorkspaceContext || "";
  const contextSources = (location.state as { contextSources?: { kind: string; title: string; date: string; href: string }[] } | null)?.contextSources || [];
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationReady, setConversationReady] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Initialize conversation
  useEffect(() => {
    const initConversation = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Sign in required", description: "Please sign in again to start a saved conversation.", variant: "destructive" });
        return;
      }

      const { data: companyProfile } = await supabase.from("profiles")
        .select("company_name,company_type,company_stage,industry,product_or_service,target_customer,primary_goal,biggest_challenge,ai_profile_context_default,ai_workspace_memory_default")
        .eq("user_id", user.id)
        .maybeSingle();
      if (companyProfile) {
        setIncludeProfile(companyProfile.ai_profile_context_default ?? true);
        setBusinessContext([
          ["Company/project", companyProfile.company_name],
          ["Organization type", companyProfile.company_type],
          ["Stage", companyProfile.company_stage],
          ["Industry", companyProfile.industry],
          ["What they are building", companyProfile.product_or_service],
          ["Target customer", companyProfile.target_customer],
          ["Primary 90-day goal", companyProfile.primary_goal],
          ["Current challenge", companyProfile.biggest_challenge],
        ].filter(([, value]) => Boolean(value)).map(([label, value]) => `${label}: ${value}`).join("\n"));
      }
      const { data: memories } = await db.from("workspace_memories").select("id,title,category,content,source_label,source_date,last_confirmed_at").eq("user_id", user.id).eq("include_in_ai", true).order("updated_at", { ascending: false }).limit(100);
      setMemoryChoices((memories || []) as MemoryChoice[]);
      if (companyProfile?.ai_workspace_memory_default === false) setMemorySelection([]);
      
      // Keep every conversation in history and reopen the most recently active one.
      const { data: history, error: lookupError } = await supabase
        .from('chat_conversations')
        .select('id,title,updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(100);

      if (lookupError) {
        console.error('Error finding saved conversation:', lookupError);
        toast({
          title: "Error",
          description: "Could not load your saved conversation.",
          variant: "destructive"
        });
        return;
      }

      let activeConversationId = history?.[0]?.id;
      setConversations(history || []);
      let restoredConversationHasMessages = false;
      if (!activeConversationId) {
        const { data: conv, error: createError } = await supabase
          .from('chat_conversations')
          .insert({ user_id: user.id, title: 'New Conversation' })
          .select('id,title,updated_at')
          .single();

        if (createError || !conv) {
          console.error('Error creating conversation:', createError);
          toast({ title: "Error", description: "Failed to create a saved conversation.", variant: "destructive" });
          return;
        }
        activeConversationId = conv.id;
        setConversations([conv]);
      } else {
        const { data: savedMessages, error: messagesError } = await supabase
          .from('chat_messages')
          .select('id, role, content, advisor, created_at')
          .eq('conversation_id', activeConversationId)
          .order('created_at', { ascending: false })
          .limit(500);

        if (messagesError) {
          console.error('Error loading saved messages:', messagesError);
          toast({ title: "Error", description: "Could not load your saved messages.", variant: "destructive" });
          return;
        }

        const restoredMessages: Message[] = (savedMessages || []).reverse().map((message) => ({
          id: message.id,
          role: message.role as Message["role"],
          content: message.content,
          advisor: message.advisor || undefined,
          timestamp: new Date(message.created_at),
        }));
        if (restoredMessages.length) {
          restoredConversationHasMessages = true;
          setMessages(restoredMessages);
          const latestAdvisor = [...restoredMessages].reverse().find((message) => message.advisor)?.advisor;
          if (latestAdvisor && botPersonas.some((bot) => bot.name === latestAdvisor)) setSelectedBot(latestAdvisor);
        }
      }

      if (!activeConversationId) return;
      setConversationId(activeConversationId);
      setConversationReady(true);
      
      // Add welcome message
      if (!history?.length || !restoredConversationHasMessages) setMessages([{
          id: "1",
          role: "assistant",
          content: "Welcome. Choose a specialist, share the context behind your decision, and I’ll help you work through the options and next steps.",
          timestamp: new Date(),
        }]);
    };

    initConversation();
  }, [toast]);

  const createNewChat = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from("chat_conversations")
      .insert({ user_id: user.id, title: "New Conversation" })
      .select("id,title,updated_at").single();
    if (error || !data) {
      toast({ title: "Could not start a new chat", description: error?.message, variant: "destructive" });
      return;
    }
    setConversations((current) => [data, ...current]);
    setConversationId(data.id);
    setMessages([{ id: `welcome-${data.id}`, role: "assistant", content: "A fresh conversation, ready when you are. Choose an advisor and tell me what you’re working through.", timestamp: new Date() }]);
    setSelectedBot("");
    setConversationReady(true);
  };

  const openConversation = async (conversation: Conversation) => {
    if (conversation.id === conversationId) return;
    setConversationReady(false);
    const { data, error } = await supabase.from("chat_messages")
      .select("id,role,content,advisor,created_at").eq("conversation_id", conversation.id)
      .order("created_at", { ascending: false }).limit(500);
    if (error) {
      toast({ title: "Could not open this chat", description: error.message, variant: "destructive" });
      setConversationReady(true);
      return;
    }
    const restored = (data || []).reverse().map((message) => ({ id: message.id, role: message.role as Message["role"], content: message.content, advisor: message.advisor || undefined, timestamp: new Date(message.created_at) }));
    setConversationId(conversation.id);
    setMessages(restored.length ? restored : [{ id: `welcome-${conversation.id}`, role: "assistant", content: "Welcome back. Pick up where you left off, or start a fresh conversation.", timestamp: new Date() }]);
    const advisor = [...restored].reverse().find((message) => message.advisor)?.advisor;
    setSelectedBot(advisor && botPersonas.some((bot) => bot.name === advisor) ? advisor : "");
    setConversationReady(true);
  };

  useEffect(() => {
    const viewport = scrollRef.current?.querySelector<HTMLDivElement>("[data-radix-scroll-area-viewport]");
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading || !conversationReady || !conversationId) return;
    if (!selectedBot && !roundtable) {
      toast({
        title: "Select a Bot",
        description: "Please select a bot persona before sending a message",
        variant: "destructive"
      });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageText = input;
    setInput("");
    setLoading(true);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      // Prepare conversation history for the AI
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Call the edge function
      const { data, error } = await supabase.functions.invoke("ai-advisors", {
        body: {
          message: messageText,
          conversationHistory,
          selectedBot: roundtable ? "Business Strategist" : selectedBot,
          conversationId,
          businessContext: includeProfile ? businessContext : "",
          responseStyle,
          memoryIds: memorySelection ?? memoryChoices.slice(0, 8).map((memory) => memory.id),
          includeProfile,
          roundtable,
          confirmedWorkspaceContext: reviewContext,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        const context = (error as { context?: unknown }).context;
        if (context instanceof Response) {
          const payload = await context.clone().json().catch(() => null);
          if (typeof payload?.error === "string") throw new Error(payload.error);
        }
        throw error;
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message,
        advisor: data.advisor,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      setUsedSources(data.sources || []);
      const { data: refreshedHistory } = await supabase.from("chat_conversations").select("id,title,updated_at").order("updated_at", { ascending: false }).limit(100);
      if (refreshedHistory) setConversations(refreshedHistory);
    } catch (error: unknown) {
      console.error("Error calling AI:", error);
      const errorMessageText = error instanceof Error ? error.message : "Sorry, I encountered an error. Please try again.";
      
      toast({
        title: "Error",
        description: errorMessageText,
        variant: "destructive"
      });
      
      // Show error message in chat
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: errorMessageText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const activeBot = botPersonas.find((bot) => bot.name === selectedBot);
  const recommendedMemories = [...memoryChoices].sort((a, b) => {
    const terms = input.toLowerCase().split(/\W+/).filter((word) => word.length > 2);
    const rank = (memory: MemoryChoice) => terms.reduce((score, term) => score + Number(`${memory.title} ${memory.content} ${memory.category}`.toLowerCase().includes(term)), 0);
    return rank(b) - rank(a);
  }).slice(0, 8);
  const activeMemoryIds = memorySelection ?? recommendedMemories.map((memory) => memory.id);
  const userTurns = messages.filter((message) => message.role === "user").length;
  const suggestions = ["Help me pick one growth priority for this quarter", "What should I validate before I invest more?", "Turn my biggest challenge into a practical plan"];

  return <div className="chat-page min-w-0">
    <PageHeader eyebrow="Think it through" title="Advisor desk" description="Bring the real question. Choose one specialist or invite a roundtable, with the context you approve." action={<div className="hidden items-center gap-2 border border-border px-3 py-2 text-xs text-muted-foreground sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />Private workspace</div>} />

    <div className="grid min-w-0 gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="chat-advisors min-w-0 border border-border bg-card p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-2"><div><p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Your space</p><h2 className="mt-1 text-lg font-medium tracking-tight">Chats</h2></div><button type="button" onClick={() => void createNewChat()} className="inline-flex h-9 shrink-0 items-center gap-1.5 border border-foreground bg-foreground px-3 text-xs text-background transition-colors hover:bg-primary hover:text-primary-foreground"><Plus size={14} />New chat</button></div>
        <div className="mb-5 max-h-40 space-y-1 overflow-y-auto" aria-label="Chat history">
          {conversations.map((conversation) => <button key={conversation.id} type="button" onClick={() => void openConversation(conversation)} className={`flex w-full items-center gap-2 px-2.5 py-2 text-left text-xs transition-colors ${conversation.id === conversationId ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"}`}><Clock3 size={13} className="shrink-0" /><span className="min-w-0 flex-1 truncate">{conversation.title || "New Conversation"}</span></button>)}
          {!conversations.length && <p className="px-2 py-2 text-xs text-muted-foreground">Your saved chats will appear here.</p>}
        </div>
        <div className="mb-4 flex items-end justify-between"><div><p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Choose a lens</p><h2 className="mt-1 text-lg font-medium tracking-tight">Your advisors</h2></div><span className="text-[10px] tabular-nums text-muted-foreground">08</span></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-1">
          {botPersonas.map((bot) => {
            const active = selectedBot === bot.name;
            return <motion.button key={bot.name} type="button" layout onClick={() => setSelectedBot(bot.name)} aria-pressed={active} className={`group relative flex min-w-0 items-center gap-3 border p-2.5 text-left transition-colors duration-200 ${active ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:border-primary/60 hover:bg-primary/[0.035]"}`}>
              {active && <motion.span layoutId="advisor-active-indicator" className="absolute inset-y-0 left-0 w-0.5 bg-primary" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <span className={`grid h-9 w-9 shrink-0 place-items-center text-[10px] font-semibold tracking-wide ${active ? "bg-background/10 text-primary" : "bg-secondary text-foreground"}`}>{bot.icon}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{bot.name}</span><span className={`mt-0.5 hidden truncate text-[10px] sm:block xl:block ${active ? "text-background/60" : "text-muted-foreground"}`}>{bot.description}</span></span>
              {active && <Check size={14} className="shrink-0 text-primary" />}
            </motion.button>;
          })}
        </div>

        <button type="button" onClick={() => setRoundtable((value) => !value)} aria-pressed={roundtable} className={`mt-3 w-full border p-3 text-left transition-colors ${roundtable ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}><span className="flex items-center gap-2 text-xs font-medium"><Sparkles size={14} className="text-primary" />Cross-advisor roundtable</span><span className="mt-1 block text-[10px] leading-relaxed text-muted-foreground">{roundtable ? "On · moderated comparison of specialist lenses, not independent model calls" : "Optional · compare strategy, finance, product, operations, and marketing views"}</span></button>

        <div className="mt-4 border border-border bg-background p-3"><div className="flex items-center justify-between"><p className="text-[10px] font-medium uppercase tracking-[0.13em] text-muted-foreground">Using context</p><button type="button" onClick={() => { setMemorySelection([]); setIncludeProfile(false); }} className="text-[10px] text-primary">Use current question only</button></div><label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={includeProfile} onChange={(event) => setIncludeProfile(event.target.checked)} className="accent-primary" />Company profile</label><div className="mt-2 max-h-36 space-y-1 overflow-y-auto">{recommendedMemories.map((memory) => <label key={memory.id} className="flex cursor-pointer items-start gap-2 py-1 text-[10px] leading-relaxed"><input type="checkbox" checked={activeMemoryIds.includes(memory.id)} onChange={(event) => setMemorySelection((current) => { const base = current ?? recommendedMemories.map((item) => item.id); return event.target.checked ? [...base, memory.id] : base.filter((id) => id !== memory.id); })} className="mt-0.5 accent-primary" /><span><span className="font-medium">{memory.title}</span><span className="block text-muted-foreground">{memory.source_label}{memory.source_date ? ` · ${memory.source_date}` : ""}</span></span></label>)}{!recommendedMemories.length && <p className="text-[10px] text-muted-foreground">No advisor-enabled memory yet. Manage it in Workspace Memory.</p>}</div><p className="mt-2 text-[10px] text-muted-foreground">Review or uncheck any source before sending.</p></div>

        <div className="mt-4 border-t border-border pt-4">
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.13em] text-muted-foreground"><LockKeyhole size={12} className="text-primary" />Private by default</div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Each reply sees the shared conversation. Saved context above is selected for this request only.</p>
        </div>
      </aside>

      <section className="chat-workspace flex h-[min(72vh,780px)] min-h-[560px] min-w-0 flex-col overflow-hidden border border-border bg-background shadow-[0_16px_50px_-40px_rgba(0,0,0,0.32)]">
        <div className="flex min-h-[76px] items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <motion.div key={activeBot?.name || "none"} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }} className="grid h-10 w-10 shrink-0 place-items-center bg-foreground text-background"><Sparkles size={17} className="text-primary" /></motion.div>
            <div className="min-w-0"><AnimatePresence mode="wait" initial={false}><motion.div key={roundtable ? "roundtable" : activeBot?.name || "choose"} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }}><h2 className="truncate text-sm font-medium sm:text-base">{roundtable ? "Cross-advisor roundtable" : activeBot?.name || "Choose your advisor"}</h2><p className="mt-0.5 truncate text-xs text-muted-foreground">{roundtable ? "Separate perspectives · evidence needed · founder decides" : activeBot ? `${activeBot.description} · shared advisor thread` : "Pick a specialist to begin the conversation"}</p></motion.div></AnimatePresence></div>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-[10px] text-muted-foreground sm:text-xs"><span className="grid h-7 w-7 place-items-center border border-border"><MessageSquareText size={13} /></span><span className="hidden sm:inline">Saved automatically</span></div>
        </div>

        <ScrollArea ref={scrollRef} className="min-h-0 min-w-0 flex-1 px-3 py-5 sm:px-6 sm:py-7">
          <div className="mx-auto max-w-3xl space-y-5">
            {(usedSources.length > 0 || contextSources.length > 0) && <div className="border border-primary/25 bg-primary/[0.035] p-3"><p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Sources used in the last answer</p><div className="mt-2 flex flex-wrap gap-2">{contextSources.map((source, index) => <span key={`review-${index}`} className="border border-border bg-background px-2 py-1 text-[10px]">{source.kind} · {source.title}</span>)}{usedSources.map((source, index) => <span key={`memory-${index}`} className="border border-border bg-background px-2 py-1 text-[10px]">{source.title} · {source.source_label}{source.source_date ? ` · ${source.source_date}` : ""}</span>)}</div></div>}
            {messages.map((message, index) => <motion.div key={message.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, delay: Math.min(index * 0.025, 0.12), ease: "easeOut" }} className={`flex w-full min-w-0 items-start gap-3 ${message.role === "user" ? "justify-end" : ""}`}>
              {message.role === "assistant" && <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center border border-border bg-card"><Bot size={16} className="text-primary" /></span>}
              <div className={`min-w-0 max-w-[calc(100%-2.75rem)] sm:max-w-[82%] ${message.role === "user" ? "order-first" : ""}`}>
                <div className={`min-w-0 break-words [overflow-wrap:anywhere] px-4 py-3.5 sm:px-5 ${message.role === "user" ? "bg-foreground text-background" : "border border-border bg-card text-foreground"}`}>
                  {message.advisor && <Badge variant="secondary" className="mb-2 rounded-none bg-secondary text-[10px]">{message.advisor}</Badge>}
                  {message.role === "assistant"
                    ? <FormattedAnswer content={message.content} />
                    : <p className="whitespace-pre-wrap break-words text-sm leading-7 [overflow-wrap:anywhere]">{message.content}</p>}
                </div>
                <p className={`mt-1.5 px-1 text-[10px] text-muted-foreground ${message.role === "user" ? "text-right" : ""}`}>{message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              {message.role === "user" && <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center border border-border bg-background"><User size={15} /></span>}
            </motion.div>)}

            {!loading && userTurns === 0 && selectedBot && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.1 }} className="ml-11 max-w-2xl pt-2">
              <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">A few ways to open</p>
              <div className="flex flex-wrap gap-2">{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => setInput(suggestion)} className="group flex items-center gap-2 border border-border bg-card px-3 py-2 text-left text-xs leading-relaxed transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:bg-primary/[0.035]">{suggestion}<ArrowUpRight size={12} className="shrink-0 text-muted-foreground transition-colors group-hover:text-primary" /></button>)}</div>
            </motion.div>}

            {loading && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3"><span className="mt-1 grid h-8 w-8 shrink-0 place-items-center border border-border bg-card"><Bot size={16} className="animate-pulse text-primary" /></span><div className="border border-border bg-card px-4 py-3.5"><p className="mb-2 text-[10px] font-medium uppercase tracking-[0.13em] text-muted-foreground">{activeBot?.name || "Your advisor"} is thinking</p><div className="flex gap-1.5">{[0, 1, 2].map((delay) => <motion.span key={delay} className="h-1.5 w-1.5 rounded-full bg-primary" animate={{ y: [0, -5, 0], opacity: [0.45, 1, 0.45] }} transition={{ duration: 0.75, repeat: Infinity, delay: delay * 0.16 }} />)}</div></div></motion.div>}
          </div>
        </ScrollArea>

        <div className="border-t border-border bg-card/70 p-3 sm:p-5">
          <form onSubmit={(event) => { event.preventDefault(); void handleSend(); }} className="mx-auto max-w-3xl">
            <div className="mb-2 flex items-center justify-between gap-3"><span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Answer style</span><div className="flex border border-border p-0.5"><button type="button" aria-pressed={responseStyle === "natural"} onClick={() => setResponseStyle("natural")} className={`px-2.5 py-1 text-[10px] ${responseStyle === "natural" ? "bg-foreground text-background" : "text-muted-foreground"}`}>Natural</button><button type="button" aria-pressed={responseStyle === "decision_brief"} onClick={() => setResponseStyle("decision_brief")} className={`px-2.5 py-1 text-[10px] ${responseStyle === "decision_brief" ? "bg-foreground text-background" : "text-muted-foreground"}`}>Decision brief</button></div></div>
            <div className={`flex items-center gap-2 border bg-background p-1.5 pl-3 transition-colors focus-within:border-foreground ${!selectedBot && !roundtable ? "opacity-70" : ""}`}>
              <Input value={input} onChange={(event) => setInput(event.target.value)} placeholder={!conversationReady ? "Preparing your saved conversation…" : roundtable ? "Ask all perspectives the same question…" : selectedBot ? `Message ${selectedBot}…` : "Choose an advisor to begin"} disabled={loading || (!selectedBot && !roundtable) || !conversationReady} aria-label="Message your advisor" className="h-11 min-w-0 flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0" />
              <button type="submit" disabled={loading || (!selectedBot && !roundtable) || !conversationReady || !input.trim()} aria-label="Send message" className="grid h-10 w-10 shrink-0 place-items-center bg-foreground text-background transition-all duration-200 hover:bg-primary hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-35"><Send size={16} /></button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 px-1"><p className="text-[10px] text-muted-foreground">AI can miss details. Check important decisions.</p><p className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground"><LockKeyhole size={10} /> Your workspace</p></div>
          </form>
        </div>
      </section>
    </div>
  </div>;
}
