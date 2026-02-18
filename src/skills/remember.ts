// ============================================================
// CLAW BOT — Skill: Pamięć
// Zapamiętuje informacje per-user w sesji
// ============================================================

import type { Skill, Session } from "../types/index.js";

export const rememberSkill: Skill = {
  name: "remember",
  description: "Zapamiętuje i przypomina informacje w sesji",
  triggers: ["zapamiętaj", "pamiętaj", "zapisz", "co wiesz", "co zapamiętałeś"],

  async handle(message: string, session: Session): Promise<string | null> {
    const msg = message.trim();
    const msgLower = msg.toLowerCase();

    // Sprawdź co user pamięta
    if (
      msgLower.includes("co wiesz") ||
      msgLower.includes("co zapamiętałeś") ||
      msgLower.includes("co zapamięta")
    ) {
      const memory = session.metadata.memory as Record<string, string> | undefined;
      if (!memory || Object.keys(memory).length === 0) {
        return "Nie mam nic zapisanego w pamięci tej sesji.";
      }

      const items = Object.entries(memory)
        .map(([k, v]) => `• **${k}**: ${v}`)
        .join("\n");

      return `Zapamiętałem:\n${items}`;
    }

    // Zapamiętaj nową informację
    const rememberPatterns = [
      /zapamiętaj(?:\s+że)?\s+(.+)/i,
      /pamiętaj(?:\s+że)?\s+(.+)/i,
      /zapisz(?:\s+że)?\s+(.+)/i,
    ];

    for (const pattern of rememberPatterns) {
      const match = msg.match(pattern);
      if (match?.[1]) {
        const info = match[1].trim();

        if (!session.metadata.memory) {
          session.metadata.memory = {};
        }

        const memory = session.metadata.memory as Record<string, string>;
        const key = `info_${Object.keys(memory).length + 1}`;
        memory[key] = info;

        return `Zapamiętałem: "${info}"`;
      }
    }

    return null;
  },
};
