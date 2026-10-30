/// <reference path="../types.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const botPersonas = {
  "Business Strategist": "You are a Business Strategist with 20 years of experience in business strategy, market analysis, and growth planning. You provide strategic insights, help identify opportunities, and guide business decisions with proven frameworks and methodologies. Be concise, actionable, and professional.",
  "Financial Expert": "You are a Financial Expert with 20 years of experience in finance, investment, and financial planning. You provide expert advice on financial management, budgeting, investment strategies, and financial risk assessment. Be data-driven and precise.",
  "Operations Specialist": "You are an Operations Specialist with 20 years of experience in operational efficiency, process optimization, and supply chain management. You help streamline operations, improve productivity, and implement best practices. Be practical and systems-focused.",
  "Technology Consultant": "You are a Technology Consultant with 20 years of experience in technology solutions, digital transformation, and technical architecture. You provide guidance on technology adoption, system integration, and innovation strategies. Be technically accurate and forward-thinking.",
  "Marketing Guru": "You are a Marketing Guru with 20 years of experience in marketing strategy, brand development, and customer acquisition. You help develop marketing campaigns, understand customer behavior, and build strong brand presence. Be creative and results-oriented.",
  "HR Professional": "You are an HR Professional with 20 years of experience in human resources, talent management, and organizational development. You provide expertise in recruitment, employee engagement, and workplace culture. Be empathetic and strategic.",
  "Legal Advisor": "You are a Legal Advisor with 20 years of experience in business law, compliance, and contract management. You provide legal guidance, help understand regulations, and ensure legal compliance. Be precise and thorough.",
  "Product Manager": "You are a Product Manager with 20 years of experience in product development, user experience, and product strategy. You guide product roadmaps, prioritize features, and ensure product-market fit. Be user-focused and strategic."
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let failureStatus = 500;
  try {
    const { message, conversationHistory, selectedBot, conversationId } = await req.json();
    
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (typeof message !== "string" || !message.trim()) {
      failureStatus = 400;
      throw new Error("A message is required.");
    }

    // Authenticate before spending a Gemini request. Passing the token explicitly
    // avoids relying on supabase-js to infer it from the global header.
    let authenticatedUser: { id: string } | null = null;
    if (conversationId) {
      const authorization = req.headers.get("Authorization");
      const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
      if (!accessToken) {
        failureStatus = 401;
        throw new Error("Your session is missing. Please sign in again.");
      }
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error("Supabase authentication is not configured for this function.");
      }

      const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data, error } = await authClient.auth.getUser(accessToken);
      if (error || !data.user) {
        failureStatus = 401;
        throw new Error("Your session could not be verified. Please sign in again.");
      }
      authenticatedUser = data.user;
    }
    
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // Use selected bot or random selection
    const botNames = Object.keys(botPersonas);
    const selectedBotName = selectedBot || botNames[Math.floor(Math.random() * botNames.length)];
    const systemPrompt = botPersonas[selectedBotName as keyof typeof botPersonas];

    // Prepare messages for Gemini API
    const conversationText = (Array.isArray(conversationHistory) ? conversationHistory : [])
      .map((msg: any) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');
    
    const fullPrompt = `${systemPrompt}\n\nConversation history:\n${conversationText}\n\nUser: ${message}\n\nAssistant:`;

    console.log("Calling Gemini with bot:", selectedBotName);

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: fullPrompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const aiMessage = data.candidates[0].content.parts[0].text;

    // Save conversation to Supabase if conversationId provided
    if (conversationId) {
      if (!authenticatedUser || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("Conversation storage is not configured for this function.");
      }
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: conversation, error: conversationError } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('user_id', authenticatedUser.id)
        .maybeSingle();

      if (conversationError) throw conversationError;
      if (!conversation) throw new Error("Conversation not found for this account.");
      
      // Save user message
      const { error: userMessageError } = await supabase.from('chat_messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: message,
        advisor: selectedBotName
      });
      if (userMessageError) throw userMessageError;

      // Save AI message
      const { error: assistantMessageError } = await supabase.from('chat_messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: aiMessage,
        advisor: selectedBotName
      });
      if (assistantMessageError) throw assistantMessageError;

      // Update conversation timestamp
      await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId)
        .eq('user_id', authenticatedUser.id);
    }

    console.log(`Response from ${selectedBotName}: ${aiMessage.substring(0, 100)}...`);

    return new Response(
      JSON.stringify({ 
        message: aiMessage,
        advisor: selectedBotName
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in ai-advisors function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An error occurred" }),
      { 
        status: failureStatus,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
