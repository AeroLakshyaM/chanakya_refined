import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, ThumbsUp, MessageSquare, Plus, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function ProductIdeas() {
  const [ideas] = useState([
    {
      id: 1,
      title: "AI-Powered Analytics Dashboard",
      description: "Real-time insights with predictive analytics for better decision making",
      advisor: "Technical Advisor",
      votes: 24,
      comments: 8,
      status: "In Review",
      tags: ["Analytics", "AI", "Dashboard"],
    },
    {
      id: 2,
      title: "Mobile App Integration",
      description: "Seamless mobile experience with offline capabilities",
      advisor: "Operations Advisor",
      votes: 18,
      comments: 5,
      status: "Planned",
      tags: ["Mobile", "Integration"],
    },
    {
      id: 3,
      title: "Advanced Pricing Tiers",
      description: "Flexible pricing model to capture different market segments",
      advisor: "Finance Advisor",
      votes: 15,
      comments: 12,
      status: "Under Consideration",
      tags: ["Pricing", "Strategy"],
    },
  ]);

  const statusColors: Record<string, string> = {
    "In Review": "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
    "Planned": "bg-green-500/10 text-green-700 border-green-500/20",
    "Under Consideration": "bg-blue-500/10 text-blue-700 border-blue-500/20",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Product Ideas</h1>
          <p className="text-muted-foreground">AI-generated suggestions and community feedback</p>
        </div>
        <Button className="gradient-blue" size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Submit Idea
        </Button>
      </div>

      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="bg-gradient-blue text-primary-foreground">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            AI-Generated Ideas
          </CardTitle>
          <CardDescription className="text-primary-foreground/80">
            Our advisors have analyzed your product and generated these suggestions
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Button variant="outline" className="w-full" size="lg">
            <Sparkles className="mr-2 h-5 w-5" />
            Generate New Ideas with AI
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {ideas.map((idea, index) => (
          <motion.div
            key={idea.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover-lift cursor-pointer">
              <CardContent className="p-6">
                <div className="flex gap-6">
                  <div className="flex flex-col items-center gap-2 min-w-[60px]">
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <ThumbsUp className="h-5 w-5" />
                    </Button>
                    <span className="text-sm font-semibold">{idea.votes}</span>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                          <Lightbulb className="h-5 w-5 text-primary" />
                          {idea.title}
                        </h3>
                        <p className="text-muted-foreground">{idea.description}</p>
                      </div>
                      <Badge className={`${statusColors[idea.status]} border`}>{idea.status}</Badge>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex gap-2 flex-wrap">
                        {idea.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground ml-auto">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          {idea.comments}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          💡 {idea.advisor}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Community Insights</CardTitle>
          <CardDescription>Top requested features from users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {["Dark Mode Support", "Export Functionality", "Keyboard Shortcuts"].map((feature, i) => (
              <div key={i} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                <span className="font-medium">{feature}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{[142, 98, 76][i]} votes</span>
                  <Button variant="outline" size="sm">
                    Vote
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
