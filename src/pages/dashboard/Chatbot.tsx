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
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Initialize conversation
  useEffect(() => {
    const initConversation = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setUserId(user.id);

      // Create new conversation
      const { data: conv, error } = await supabase
        .from('chat_conversations')
        .insert({ 
          user_id: user.id,
          title: 'New Conversation'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating conversation:', error);
        toast({
          title: "Error",
          description: "Failed to create conversation",
          variant: "destructive"
        });
        return;
      }

      setConversationId(conv.id);
      
      // Add welcome message
      setMessages([{
        id: "1",
        role: "assistant",
        content: "Welcome. Choose a specialist, share the context behind your decision, and I’ll help you work through the options and next steps.",
        timestamp: new Date(),
      }]);
    };

    initConversation();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
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
          userId
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
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-11rem)] min-h-[480px]">
      <Card className="flex h-full flex-col rounded-none border-border bg-card shadow-none">
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
        
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea ref={scrollRef} className="flex-1 p-6">
            <AnimatePresence mode="popLayout">
              <div className="space-y-6">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
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
                    
                    <div className={`max-w-[75%] ${message.role === "user" ? "order-first" : ""}`}>
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        className={`p-4 rounded-2xl backdrop-blur-sm shadow-lg ${
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
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
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
                placeholder={selectedBot ? `Ask ${selectedBot} anything...` : "Select a bot to start chatting..."}
                disabled={loading || !selectedBot}
                className="flex-1 rounded-none border-border bg-background"
              />
              <Button 
                type="submit" 
                disabled={loading || !selectedBot} 
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
