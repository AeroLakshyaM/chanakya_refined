import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Bot, User, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  advisor?: string;
  timestamp: Date;
};

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
  const [businessContext, setBusinessContext] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationReady, setConversationReady] = useState(false);
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
        .select("company_name,company_type,company_stage,industry,product_or_service,target_customer,primary_goal,biggest_challenge")
        .eq("user_id", user.id)
        .maybeSingle();
      if (companyProfile) {
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
      
      // Resume the latest conversation so saved messages are still visible after reload.
      const { data: existingConversation, error: lookupError } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lookupError) {
        console.error('Error finding saved conversation:', lookupError);
        toast({
          title: "Error",
          description: "Could not load your saved conversation.",
          variant: "destructive"
        });
        return;
      }

      let activeConversationId = existingConversation?.id;
      let restoredConversationHasMessages = false;
      if (!activeConversationId) {
        const { data: conv, error: createError } = await supabase
          .from('chat_conversations')
          .insert({ user_id: user.id, title: 'New Conversation' })
          .select('id')
          .single();

        if (createError || !conv) {
          console.error('Error creating conversation:', createError);
          toast({ title: "Error", description: "Failed to create a saved conversation.", variant: "destructive" });
          return;
        }
        activeConversationId = conv.id;
      } else {
        const { data: savedMessages, error: messagesError } = await supabase
          .from('chat_messages')
          .select('id, role, content, advisor, created_at')
          .eq('conversation_id', activeConversationId)
          .order('created_at', { ascending: true })
          .limit(200);

        if (messagesError) {
          console.error('Error loading saved messages:', messagesError);
          toast({ title: "Error", description: "Could not load your saved messages.", variant: "destructive" });
          return;
        }

        const restoredMessages: Message[] = (savedMessages || []).map((message) => ({
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
      if (!existingConversation || !restoredConversationHasMessages) setMessages([{
          id: "1",
          role: "assistant",
          content: "Welcome. Choose a specialist, share the context behind your decision, and I’ll help you work through the options and next steps.",
          timestamp: new Date(),
        }]);
    };

    initConversation();
  }, [toast]);

  useEffect(() => {
    const viewport = scrollRef.current?.querySelector<HTMLDivElement>("[data-radix-scroll-area-viewport]");
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading || !conversationReady || !conversationId) return;
    if (!selectedBot) {
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
          selectedBot,
          conversationId,
          businessContext,
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
    } catch (error: any) {
      console.error("Error calling AI:", error);
      
      toast({
        title: "Error",
        description: error.message || "Failed to get response from AI",
        variant: "destructive"
      });
      
      // Show error message in chat
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: error.message || "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-11rem)] min-h-[480px] min-w-0">
      <Card className="flex h-full min-w-0 flex-col overflow-hidden rounded-none border-border bg-card shadow-none">
        <CardHeader className="border-b border-border bg-background px-5 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-xl font-medium tracking-tight">
              <div className="grid h-9 w-9 place-items-center bg-foreground text-background">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              AI Expert Advisors
            </CardTitle>
          </div>
          <div className="mt-4">
            <Select value={selectedBot} onValueChange={setSelectedBot}>
              <SelectTrigger className="w-full rounded-none border-border bg-background md:w-80">
                <SelectValue placeholder="Select your AI expert..." />
              </SelectTrigger>
              <SelectContent className="rounded-none border-border bg-background">
                {botPersonas.map((bot) => (
                  <SelectItem 
                    key={bot.name} 
                    value={bot.name}
                    className="hover:bg-primary/10 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 py-1">
                      <span className="grid h-8 w-8 place-items-center bg-secondary text-[10px] font-medium tracking-wide">{bot.icon}</span>
                      <div>
                        <div className="font-medium">{bot.name}</div>
                        <div className="text-xs text-muted-foreground">{bot.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">
          <ScrollArea ref={scrollRef} className="min-h-0 min-w-0 flex-1 p-4 sm:p-6">
            <AnimatePresence mode="popLayout">
              <div className="space-y-6">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className={`flex w-full min-w-0 items-start gap-3 ${message.role === "user" ? "justify-end" : ""}`}
                  >
                    {message.role === "assistant" && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center bg-foreground text-background"
                      >
                        <Bot className="h-5 w-5 text-primary-foreground" />
                      </motion.div>
                    )}
                    
                    <div className={`min-w-0 max-w-[calc(100%-3rem)] sm:max-w-[75%] ${message.role === "user" ? "order-first" : ""}`}>
                      <motion.div
                        className={`min-w-0 break-words [overflow-wrap:anywhere] p-4 ${
                          message.role === "user"
                            ? "bg-foreground text-background"
                            : "border border-border bg-background text-foreground"
                        }`}
                      >
                        {message.advisor && (
                          <Badge variant="secondary" className="mb-2 bg-background/50">
                            <span className="mr-1 text-[10px] font-semibold tracking-wide text-primary">{botPersonas.find((b) => b.name === message.advisor)?.icon}</span> {message.advisor}
                          </Badge>
                        )}
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">{message.content}</p>
                      </motion.div>
                      <p className="text-xs text-muted-foreground mt-1 px-2">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    
                    {message.role === "user" && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center border border-border bg-background"
                      >
                        <User className="h-5 w-5 text-foreground" />
                      </motion.div>
                    )}
                  </motion.div>
                ))}
                
                {loading && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3"
                  >
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center bg-foreground text-background">
                      <Bot className="h-5 w-5 text-primary-foreground animate-pulse" />
                    </div>
                    <div className="border border-border bg-background p-4">
                      <div className="flex gap-2">
                        <motion.div 
                          className="w-2 h-2 bg-primary rounded-full" 
                          animate={{ y: [0, -8, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                        />
                        <motion.div 
                          className="w-2 h-2 bg-primary rounded-full" 
                          animate={{ y: [0, -8, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                        />
                        <motion.div 
                          className="w-2 h-2 bg-primary rounded-full" 
                          animate={{ y: [0, -8, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </AnimatePresence>
          </ScrollArea>
          
          <div className="border-t border-border bg-background p-4 sm:p-5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-3"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={!conversationReady ? "Preparing your saved chat…" : selectedBot ? `Ask ${selectedBot} anything...` : "Select a bot to start chatting..."}
                disabled={loading || !selectedBot || !conversationReady}
                aria-label="Message your advisor"
                className="flex-1 rounded-none border-border bg-background"
              />
              <Button 
                type="submit" 
                disabled={loading || !selectedBot || !conversationReady}
                aria-label="Send message"
                className="rounded-none bg-foreground text-background hover:bg-primary"
              >
                <Send className="h-5 w-5" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
