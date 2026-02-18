// ============================================================
// CLAW BOT — Memory Skill (LangGraph-integrated)
// Long-term memory management
// ============================================================

import type { Skill, Session } from "../types/index.js";
import { longTermMemory, shortTermMemory } from "../agent/memory.js";

export const memorySkill: Skill = {
  name: "memory",
  description: "Zarządzaj długoterminową pamięcią sesji",
  triggers: [
    "zapamiętaj",
    "pamiętaj",
    "zapisz",
    "co wiesz",
    "co zapamięta",
    "recall",
    "memory",
  ],

  async handle(message: string, session: Session): Promise<string | null> {
    const msg = message.trim();
    const msgLower = msg.toLowerCase();
    const userId = session.channelUserId;

    // ——— Retrieve Memory ———————————————————————————————

    // "Co wiesz o [temat]?"
    const recallMatch = msg.match(
      /co\s+(?:wiesz|zapamięta)(?:łeś|łem)?\s+(?:o\s+)?(.+)/i
    );
    if (recallMatch) {
      const query = recallMatch[1].trim();
      const results = longTermMemory.search(userId, query, 5);

      if (results.length === 0) {
        return `Nie mam wspomnień o "${query}".`;
      }

      const items = results
        .map(
          (r) =>
            `• **${r.key}**: ${typeof r.value === "string" ? r.value : JSON.stringify(r.value)}`
        )
        .join("\n");

      return `Pamiętam o "${query}":\n${items}`;
    }

    // "Co wiesz?" (wszystkie wspomnienia)
    if (msgLower.includes("co wiesz") || msgLower.includes("co zapamięta")) {
      const all = longTermMemory.getAll(userId);

      if (all.length === 0) {
        return "Nie mam żadnych wspomnień w pamięci długoterminowej.";
      }

      const items = all
        .slice(0, 10)
        .map(
          (r) =>
            `• **${r.key}** (ważność: ${(r.importance * 100).toFixed(0)}%): ${typeof r.value === "string" ? r.value : JSON.stringify(r.value).substring(0, 50)}`
        )
        .join("\n");

      return `Moja pamięć (${all.length} wpisów):\n${items}`;
    }

    // ——— Store Memory ———————————————————————————————

    // "Zapamiętaj że [coś]"
    const storeMatch = msg.match(
      /zapamiętaj\s+(?:że\s+)?(?:o\s+)?(.+?)\s+[=:]\s*(.+)/i
    );
    if (storeMatch) {
      const key = storeMatch[1].trim();
      const value = storeMatch[2].trim();
      const id = longTermMemory.save(userId, key, value, 0.8); // High importance

      return `✓ Zapamiętałem: **${key}** = "${value}"`;
    }

    // "Zapamiętaj [coś]"
    const simpleStoreMatch = msg.match(/zapamiętaj\s+(?:że\s+)?(.+)/i);
    if (simpleStoreMatch) {
      const info = simpleStoreMatch[1].trim();
      const key = `note_${Date.now()}`;
      longTermMemory.save(userId, key, info, 0.6);

      return `✓ Zapamiętałem: "${info}"`;
    }

    // ——— Short-term Context ——————————————————————

    // "Pamiętaj w sesji [zmienna] = [wartość]"
    if (msgLower.includes("pamiętaj w sesji")) {
      const match = msg.match(/pamiętaj\s+w\s+sesji\s+(\w+)\s*[=:]\s*(.+)/i);
      if (match) {
        const varName = match[1];
        const varValue = match[2].trim();
        shortTermMemory.set(varName, varValue);

        return `✓ Zapamiętane w sesji: \`${varName} = ${varValue}\``;
      }
    }

    return null;
  },
};

export default memorySkill;
