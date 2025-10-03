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
  { name: "Business Strategist", color: "bg-blue-500", icon: "💼", description: "Strategic planning & growth" },
  { name: "Financial Expert", color: "bg-green-500", icon: "💰", description: "Finance & investment advice" },
  { name: "Operations Specialist", color: "bg-purple-500", icon: "⚙️", description: "Process optimization" },
  { name: "Technology Consultant", color: "bg-orange-500", icon: "💻", description: "Tech solutions & innovation" },
  { name: "Marketing Guru", color: "bg-pink-500", icon: "📊", description: "Marketing & brand strategy" },
  { name: "HR Professional", color: "bg-indigo-500", icon: "👥", description: "People & culture" },
  { name: "Legal Advisor", color: "bg-red-500", icon: "⚖️", description: "Legal & compliance" },
  { name: "Product Manager", color: "bg-teal-500", icon: "🎯", description: "Product development" },
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
        content: `Hello! I'm your AI assistant. Select a specialized bot from the dropdown above, and I'll help you with expert guidance in that field. Each bot has 20 years of experience in their domain!`,
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
      });

      if (error) {
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
    <div className="h-[calc(100vh-8rem)] px-4">
      <Card className="h-full flex flex-col shadow-2xl border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
        <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/10 to-transparent backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              AI Expert Advisors
            </CardTitle>
          </div>
          <div className="mt-4">
            <Select value={selectedBot} onValueChange={setSelectedBot}>
              <SelectTrigger className="w-full md:w-80 bg-background/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-all">
                <SelectValue placeholder="Select your AI expert..." />
              </SelectTrigger>
              <SelectContent className="bg-background/95 backdrop-blur-lg border-primary/20">
                {botPersonas.map((bot) => (
                  <SelectItem 
                    key={bot.name} 
                    value={bot.name}
                    className="hover:bg-primary/10 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 py-1">
                      <span className="text-xl">{bot.icon}</span>
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
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0 shadow-lg"
                      >
                        <Bot className="h-5 w-5 text-primary-foreground" />
                      </motion.div>
                    )}
                    
                    <div className={`max-w-[75%] ${message.role === "user" ? "order-first" : ""}`}>
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        className={`p-4 rounded-2xl backdrop-blur-sm shadow-lg ${
                          message.role === "user"
                            ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
                            : "bg-gradient-to-br from-card to-muted/50 text-foreground border border-border/50"
                        }`}
                      >
                        {message.advisor && (
                          <Badge variant="secondary" className="mb-2 bg-background/50">
                            {botPersonas.find((b) => b.name === message.advisor)?.icon} {message.advisor}
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
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center flex-shrink-0 shadow-lg"
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
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0 shadow-lg">
                      <Bot className="h-5 w-5 text-primary-foreground animate-pulse" />
                    </div>
                    <div className="bg-gradient-to-br from-card to-muted/50 p-4 rounded-2xl border border-border/50 backdrop-blur-sm">
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
          
          <div className="p-6 border-t border-border/50 bg-gradient-to-r from-background/50 to-muted/20 backdrop-blur-sm">
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
                className="flex-1 bg-background/50 backdrop-blur-sm border-primary/20 focus:border-primary/40 transition-all"
              />
              <Button 
                type="submit" 
                disabled={loading || !selectedBot} 
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg transition-all hover:shadow-xl"
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
