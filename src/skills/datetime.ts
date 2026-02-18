// ============================================================
// CLAW BOT — Skill: Data i czas
// ============================================================

import type { Skill, Session } from "../types/index.js";

export const dateTimeSkill: Skill = {
  name: "datetime",
  description: "Podaje aktualną datę i godzinę",
  triggers: ["godzina", "która", "czas", "data", "dzień", "what time", "date"],

  async handle(message: string, _session: Session): Promise<string | null> {
    const msg = message.toLowerCase();

    const wantTime =
      msg.includes("godzina") ||
      msg.includes("która") ||
      msg.includes("czas") ||
      msg.includes("what time");

    const wantDate =
      msg.includes("data") ||
      msg.includes("dzień") ||
      msg.includes("date") ||
      msg.includes("dzisiaj") ||
      msg.includes("dziś");

    if (!wantTime && !wantDate) return null;

    const now = new Date();

    const dateStr = now.toLocaleDateString("pl-PL", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const timeStr = now.toLocaleTimeString("pl-PL", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    if (wantTime && wantDate) {
      return `Teraz jest **${timeStr}**, ${dateStr}.`;
    } else if (wantTime) {
      return `Teraz jest **${timeStr}**.`;
    } else {
      return `Dzisiaj jest **${dateStr}**.`;
    }
  },
};
