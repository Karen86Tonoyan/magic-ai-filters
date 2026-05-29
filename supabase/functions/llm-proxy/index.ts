// ALFA LLM proxy — keeps provider API keys server-side.
// Accepts { provider, modelId, input, systemPrompt } and routes to the configured upstream.
// Defaults to Lovable AI Gateway (no extra config needed).
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Provider =
  | "lovable"
  | "openai"
  | "anthropic"
  | "google"
  | "groq"
  | "mistral"
  | "xai"
  | "custom";

interface RouteCfg {
  url: string;
  keyEnv: string;
  defaultModel?: string;
}

function resolveRoute(provider: Provider): RouteCfg {
  switch (provider) {
    case "openai":
      return { url: "https://api.openai.com/v1/chat/completions", keyEnv: "OPENAI_API_KEY" };
    case "anthropic":
      // Anthropic uses /messages and a different schema — not implemented here.
      // We route Anthropic models through Lovable AI Gateway instead.
      return { url: "https://ai.gateway.lovable.dev/v1/chat/completions", keyEnv: "LOVABLE_API_KEY" };
    case "google":
      // Same — Google's native API is not OpenAI-compatible; use Lovable Gateway.
      return { url: "https://ai.gateway.lovable.dev/v1/chat/completions", keyEnv: "LOVABLE_API_KEY", defaultModel: "google/gemini-2.5-flash" };
    case "groq":
      return { url: "https://api.groq.com/openai/v1/chat/completions", keyEnv: "GROQ_API_KEY" };
    case "mistral":
      return { url: "https://api.mistral.ai/v1/chat/completions", keyEnv: "MISTRAL_API_KEY" };
    case "xai":
      return { url: "https://api.x.ai/v1/chat/completions", keyEnv: "XAI_API_KEY" };
    case "custom": {
      const url = Deno.env.get("CUSTOM_LLM_URL") || "";
      return { url, keyEnv: "CUSTOM_LLM_API_KEY" };
    }
    case "lovable":
    default:
      return { url: "https://ai.gateway.lovable.dev/v1/chat/completions", keyEnv: "LOVABLE_API_KEY", defaultModel: "google/gemini-2.5-flash" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth: must be a signed-in Lovable Cloud user.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const provider = (body.provider ?? "lovable") as Provider;
    const input = typeof body.input === "string" ? body.input.slice(0, 32_000) : "";
    const systemPrompt = typeof body.systemPrompt === "string" ? body.systemPrompt.slice(0, 16_000) : "";
    const requestedModel = typeof body.modelId === "string" ? body.modelId : "";

    if (!input) {
      return new Response(JSON.stringify({ error: "Missing input" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const route = resolveRoute(provider);
    if (!route.url) {
      return new Response(JSON.stringify({ error: `Provider '${provider}' is not configured on the server.` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const apiKey = Deno.env.get(route.keyEnv);
    if (!apiKey) {
      return new Response(JSON.stringify({
        error: `Server is missing ${route.keyEnv}. Ask an administrator to configure it in backend secrets.`,
      }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const model = requestedModel || route.defaultModel || "gpt-4o-mini";
    const messages = [
      ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
      { role: "user", content: input },
    ];

    const upstream = await fetch(route.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, max_tokens: 1024, temperature: 0.7 }),
    });

    if (!upstream.ok) {
      if (upstream.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (upstream.status === 402) {
        return new Response(JSON.stringify({ error: "Backend credit exhausted. Top up Lovable AI workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await upstream.text().catch(() => "");
      console.error("upstream error", upstream.status, t.slice(0, 500));
      return new Response(JSON.stringify({ error: `Upstream error ${upstream.status}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await upstream.json();
    const content = data?.choices?.[0]?.message?.content ?? "[No response]";
    return new Response(JSON.stringify({ content, model }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("llm-proxy error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
