import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Users, Target, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function MarketAnalysis() {
  const metrics = [
    { label: "Market Growth", value: "+23.5%", trend: "up", icon: TrendingUp, color: "text-green-500" },
    { label: "Competition Level", value: "Medium", trend: "stable", icon: Target, color: "text-yellow-500" },
    { label: "Opportunity Score", value: "8.7/10", trend: "up", icon: Zap, color: "text-primary" },
    { label: "Target Audience", value: "2.4M", trend: "up", icon: Users, color: "text-blue-500" },
  ];

  const insights = [
    {
      title: "Growing Demand in AI Tools",
      description: "Market analysis shows 45% YoY growth in AI-powered business tools sector",
      severity: "high",
      advisor: "Information Advisor",
    },
    {
      title: "Competitive Pricing Strategy",
      description: "Competitors are pricing 20% lower in key demographics",
      severity: "medium",
      advisor: "Finance Advisor",
    },
    {
      title: "Feature Gap Identified",
      description: "83% of users request better mobile experience",
      severity: "high",
      advisor: "Technical Advisor",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Market Analysis</h1>
        <p className="text-muted-foreground">AI-powered insights into your market position and opportunities</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <metric.icon className={`h-5 w-5 ${metric.color}`} />
                {metric.trend === "up" && <TrendingUp className="h-4 w-4 text-green-500" />}
                {metric.trend === "down" && <TrendingDown className="h-4 w-4 text-red-500" />}
              </div>
              <p className="text-2xl font-bold mb-1">{metric.value}</p>
              <p className="text-sm text-muted-foreground">{metric.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Market Insights</CardTitle>
          <CardDescription>Analyzed by our 5 AI advisors</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {insights.map((insight, index) => (
            <div key={index} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{insight.title}</h3>
                    <Badge variant={insight.severity === "high" ? "destructive" : "secondary"}>
                      {insight.severity}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{insight.description}</p>
                </div>
              </div>
              <div className="mt-3">
                <Badge variant="outline" className="text-xs">
                  📊 {insight.advisor}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Competitor Analysis</CardTitle>
            <CardDescription>Key players in your market</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {["Competitor A", "Competitor B", "Competitor C"].map((comp, i) => (
                <div key={i} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <span className="font-medium">{comp}</span>
                  <Badge variant="outline">{["Strong", "Medium", "Weak"][i]}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Market Trends</CardTitle>
            <CardDescription>Emerging patterns and opportunities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 border border-border rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="font-medium">AI Integration</span>
                </div>
                <p className="text-sm text-muted-foreground">Growing at 45% annually</p>
              </div>
              <div className="p-3 border border-border rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Mobile-First</span>
                </div>
                <p className="text-sm text-muted-foreground">67% of users prefer mobile</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
