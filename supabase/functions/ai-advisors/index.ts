/// <reference path="../types.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const botPersonas = {
  "Business Strategist": "You are the user's practical business strategy partner. Help clarify goals, spot trade-offs, and suggest realistic next steps. Be warm, familiar, concise, and specific. Ask one useful follow-up only when needed. Never invent facts or claim certainty without evidence.",
  "Financial Expert": "You are the user's practical finance partner. Explain cash flow, budgeting, and business finance in plain language. Be warm, familiar, concise, and specific. State assumptions, avoid guaranteed outcomes, and suggest professional advice for consequential financial decisions.",
  "Operations Specialist": "You are the user's practical operations partner. Help simplify processes, reduce bottlenecks, and choose measurable improvements. Be warm, familiar, concise, and specific. Ask one useful follow-up only when needed.",
  "Technology Consultant": "You are the user's practical technology partner. Explain options in plain language and recommend a sensible next step for their constraints. Be warm, familiar, concise, and specific. Call out trade-offs and security implications where relevant.",
  "Marketing Guru": "You are the user's practical marketing partner. Help clarify the audience, positioning, and experiments that can be measured. Be warm, familiar, concise, and specific. Do not invent performance claims.",
  "HR Professional": "You are the user's practical people and culture partner. Be empathetic, fair, and clear. Offer concrete next steps while recognizing that employment rules vary by location.",
  "Legal Advisor": "You are a general legal information assistant, not a lawyer. Explain business legal concepts in plain language, note jurisdiction matters, and recommend a qualified lawyer for decisions or documents with legal consequences. Be warm and concise.",
  "Product Manager": "You are the user's practical product partner. Help identify customer needs, prioritize trade-offs, and define a small test or next step. Be warm, familiar, concise, and specific."
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let failureStatus = 500;
  try {
    const { message, conversationHistory, selectedBot, conversationId } = await req.json();
    
    const NVIDIA_API_KEY = Deno.env.get("NVIDIA_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const AI_PROVIDER = (Deno.env.get("AI_PROVIDER") || (NVIDIA_API_KEY ? "nvidia" : "gemini")).toLowerCase();
    const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash";
    const NVIDIA_MODEL = Deno.env.get("NVIDIA_MODEL") || "nvidia/nemotron-3-ultra-550b-a55b";
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
    let adminClient: ReturnType<typeof createClient> | null = null;
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

      if (!SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("Conversation storage is not configured for this function.");
      }
      adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: conversation, error: conversationError } = await adminClient
        .from('chat_conversations')
        .select('id, title')
        .eq('id', conversationId)
        .eq('user_id', authenticatedUser.id)
        .maybeSingle();
      if (conversationError) throw conversationError;
      if (!conversation) throw new Error("Conversation not found for this account.");

      // Persist the user's message before generation so slow or failed AI calls
      // never silently lose what they typed.
      const { error: userMessageError } = await adminClient.from('chat_messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: message.trim(),
        advisor: selectedBot || null,
      });
      if (userMessageError) throw userMessageError;
      if (conversation.title === 'New Conversation') {
        const title = message.trim().replace(/\s+/g, ' ').slice(0, 64);
        const { error: titleError } = await adminClient.from('chat_conversations')
          .update({ title, updated_at: new Date().toISOString() })
          .eq('id', conversationId)
          .eq('user_id', authenticatedUser.id);
        if (titleError) throw titleError;
      }
    }
    
    // Use selected bot or random selection
    const botNames = Object.keys(botPersonas);
    const selectedBotName = selectedBot || botNames[Math.floor(Math.random() * botNames.length)];
    const systemPrompt = botPersonas[selectedBotName as keyof typeof botPersonas] || botPersonas["Business Strategist"];
    const conversationalSystemPrompt = `${systemPrompt}\n\nRespond like a thoughtful, approachable colleague: acknowledge their situation naturally, use plain language, and give a clear recommendation with a few concrete next steps. Keep most answers under 200 words unless they ask for detail. Be honest about uncertainty.`;

    // Prepare messages for Gemini API
    const history = (Array.isArray(conversationHistory) ? conversationHistory : [])
      .filter((msg: any) => (msg.role === 'user' || msg.role === 'assistant') && typeof msg.content === 'string')
      .slice(-12)
      .map((msg: any) => ({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content.slice(0, 4000) }] }));
    while (history[0]?.role === 'model') history.shift();

    console.log(`Calling ${AI_PROVIDER} with bot:`, selectedBotName);

    // Provider keys stay on the server; they are never exposed to the browser.
    let response: Response;
    try {
      if (AI_PROVIDER === "nvidia") {
        if (!NVIDIA_API_KEY) throw new Error("NVIDIA_API_KEY is not configured in Supabase function secrets.");
        const nvidiaMessages = [
          { role: "system", content: conversationalSystemPrompt },
          ...history.map((entry) => ({ role: entry.role === "model" ? "assistant" : "user", content: entry.parts[0].text })),
          { role: "user", content: message.trim() },
        ];
        response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${NVIDIA_API_KEY}`,
          },
          signal: AbortSignal.timeout(20_000),
          body: JSON.stringify({
            model: NVIDIA_MODEL,
            messages: nvidiaMessages,
            temperature: 0.6,
            top_p: 0.95,
            max_tokens: 1024,
            stream: false,
            chat_template_kwargs: { enable_thinking: false },
          }),
        });
      } else if (AI_PROVIDER === "gemini") {
        if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured in Supabase function secrets.");
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(20_000),
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: conversationalSystemPrompt }] },
              contents: [...history, { role: 'user', parts: [{ text: message.trim() }] }],
              generationConfig: {
                maxOutputTokens: 1024,
                thinkingConfig: { thinkingLevel: "low" },
              },
            }),
          },
        );
      } else {
        throw new Error(`Unsupported AI_PROVIDER: ${AI_PROVIDER}. Use "nvidia" or "gemini".`);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") {
        throw new Error("The advisor took longer than 20 seconds. Your message is saved; please try again.");
      }
      throw error;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${AI_PROVIDER} API error:`, response.status, errorText);
      throw new Error(`${AI_PROVIDER} API error (${response.status}). Check the provider key, model name, and API quota.`);
    }

    const data = await response.json();
    const aiMessage = (AI_PROVIDER === "nvidia"
      ? data.choices?.[0]?.message?.content
      : data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join(""))?.trim();
    if (!aiMessage) throw new Error("The advisor returned an empty response. Please try again.");

    // Save conversation to Supabase if conversationId provided
    if (conversationId) {
      if (!authenticatedUser || !adminClient) {
        throw new Error("Conversation storage is not configured for this function.");
      }
      // Save AI message
      const { error: assistantMessageError } = await adminClient.from('chat_messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: aiMessage,
        advisor: selectedBotName
      });
      if (assistantMessageError) throw assistantMessageError;

      // Update conversation timestamp
      const { error: timestampError } = await adminClient
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId)
        .eq('user_id', authenticatedUser.id);
      if (timestampError) throw timestampError;
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
