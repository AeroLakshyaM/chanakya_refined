import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const advisorPrompts = {
  "Business Advisor": `You are a Business Advisor specializing in product strategy, market positioning, and business model optimization. 
Your role is to provide strategic business insights, help identify market opportunities, and guide product-market fit decisions. 
Be concise, actionable, and focus on revenue growth, customer acquisition, and competitive advantage.`,
  
  "Finance Advisor": `You are a Finance Advisor expert in financial planning, fundraising, and economic analysis. 
Your role is to provide insights on pricing strategies, revenue models, cost optimization, and investment opportunities. 
Be data-driven, pragmatic, and focus on profitability, cash flow, and sustainable financial growth.`,
  
  "Operations Advisor": `You are an Operations Advisor specializing in process optimization, scalability, and operational efficiency. 
Your role is to help streamline workflows, improve productivity, and scale operations effectively. 
Be practical, systems-focused, and emphasize automation, resource allocation, and operational excellence.`,
  
  "Technical Advisor": `You are a Technical Advisor expert in software architecture, technology stack decisions, and technical implementation. 
Your role is to provide guidance on technical feasibility, architecture decisions, and engineering best practices. 
Be precise, technically accurate, and focus on scalability, security, and maintainability.`,
  
  "Information Advisor": `You are an Information Advisor specializing in data analysis, market research, and competitive intelligence. 
Your role is to provide insights from data, market trends, user behavior patterns, and competitive landscape analysis. 
Be analytical, evidence-based, and focus on actionable insights derived from data and research.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Select a random advisor for variety
    const advisorNames = Object.keys(advisorPrompts);
    const selectedAdvisor = advisorNames[Math.floor(Math.random() * advisorNames.length)] as keyof typeof advisorPrompts;
    const systemPrompt = advisorPrompts[selectedAdvisor];

    // Prepare messages for the AI
    const messages = [
      { role: "system", content: systemPrompt },
      ...(conversationHistory || []),
      { role: "user", content: message },
    ];

    console.log(`Selected advisor: ${selectedAdvisor}`);
    console.log(`Processing message: ${message}`);

    // Call Lovable AI Gateway with Gemini
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "Rate limit exceeded. Please try again in a moment.",
            advisor: selectedAdvisor 
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: "AI credits exhausted. Please add credits to continue.",
            advisor: selectedAdvisor 
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiMessage = data.choices[0].message.content;

    console.log(`Response from ${selectedAdvisor}: ${aiMessage.substring(0, 100)}...`);

    return new Response(
      JSON.stringify({ 
        message: aiMessage,
        advisor: selectedAdvisor,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in ai-advisors function:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
