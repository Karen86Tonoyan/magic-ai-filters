/**
 * Proxy Adapter — calls the `llm-proxy` Lovable Cloud edge function.
 * Provider API keys live server-side; the client never sees them.
 */
import type { ModelAdapter, AdapterConfig } from "./types";
import { supabase } from "@/integrations/supabase/client";

export class ProxyAdapter implements ModelAdapter {
  provider: string;
  modelId: string;

  constructor(config: AdapterConfig, providerName: string) {
    this.provider = providerName;
    this.modelId = config.modelId;
  }

  async chat(input: string, systemPrompt?: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke("llm-proxy", {
      body: {
        provider: this.provider,
        modelId: this.modelId,
        input,
        systemPrompt,
      },
    });
    if (error) {
      throw new Error(error.message || "llm-proxy failed");
    }
    if (data?.error) throw new Error(data.error);
    return (data?.content as string) || "[No response]";
  }

  async testConnection(): Promise<boolean> {
    try {
      const res = await this.chat("ping", "Reply with the single word: pong");
      return typeof res === "string" && res.length > 0;
    } catch {
      return false;
    }
  }
}
