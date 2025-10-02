import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User } from "lucide-react";
import { motion } from "framer-motion";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  advisor?: string;
  timestamp: Date;
};

const advisors = [
  { name: "Business Advisor", color: "bg-blue-500", icon: "💼" },
  { name: "Finance Advisor", color: "bg-green-500", icon: "💰" },
  { name: "Operations Advisor", color: "bg-purple-500", icon: "⚙️" },
  { name: "Technical Advisor", color: "bg-orange-500", icon: "💻" },
  { name: "Information Advisor", color: "bg-pink-500", icon: "📊" },
];

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm your AI-powered product refinement assistant. I have access to 5 specialized advisors who can help you with different aspects of your product. How can we help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // Simulate AI response (will be replaced with actual Gemini AI integration)
    setTimeout(() => {
      const randomAdvisor = advisors[Math.floor(Math.random() * advisors.length)];
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `As the ${randomAdvisor.name}, I've analyzed your query. This is a placeholder response that will be replaced with actual Gemini AI integration. The multi-agent system will provide comprehensive insights from all 5 advisors.`,
        advisor: randomAdvisor.name,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="h-[calc(100vh-8rem)]">
      <Card className="h-full flex flex-col shadow-xl">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            AI Product Advisor - Multi-Agent System
          </CardTitle>
          <div className="flex gap-2 mt-4 flex-wrap">
            {advisors.map((advisor) => (
              <Badge key={advisor.name} variant="secondary" className="text-xs">
                {advisor.icon} {advisor.name}
              </Badge>
            ))}
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea ref={scrollRef} className="flex-1 p-6">
            <div className="space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Bot className="h-5 w-5 text-primary-foreground" />
                    </div>
                  )}
                  
                  <div className={`max-w-[70%] ${message.role === "user" ? "order-first" : ""}`}>
                    <div
                      className={`p-4 rounded-2xl ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {message.advisor && (
                        <Badge variant="outline" className="mb-2">
                          {advisors.find((a) => a.name === message.advisor)?.icon} {message.advisor}
                        </Badge>
                      )}
                      <p className="text-sm">{message.content}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 px-2">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  
                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-foreground" />
                    </div>
                  )}
                </motion.div>
              ))}
              
              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Bot className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div className="bg-muted p-4 rounded-2xl">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </ScrollArea>
          
          <div className="p-6 border-t border-border">
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
                placeholder="Ask our AI advisors anything about your product..."
                disabled={loading}
                className="flex-1"
              />
              <Button type="submit" disabled={loading} className="gradient-blue">
                <Send className="h-5 w-5" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
