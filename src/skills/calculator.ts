// ============================================================
// CLAW BOT — Skill: Kalkulator
// Bezpieczne obliczenia matematyczne (bez eval)
// ============================================================

import type { Skill, Session } from "../types/index.js";

// Bezpieczne obliczenia — obsługuje podstawowe wyrażenia matematyczne
// bez użycia eval() (ryzyko code injection)
function safeMath(expr: string): number | null {
  // Pozwól tylko na liczby, operatory i nawiasy
  const sanitized = expr
    .replace(/[^0-9+\-*/().^%\s]/g, "")
    .trim();

  if (!sanitized) return null;

  // Ewaluacja przez izolowaną funkcję — nie ma dostępu do zewnętrznego scope
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(`"use strict"; return (${sanitized.replace(/\^/g, "**")});`);
    const result: unknown = fn();
    if (typeof result === "number" && isFinite(result)) {
      return result;
    }
  } catch {
    // ignore
  }

  return null;
}

const MATH_PATTERNS = [
  /(?:ile\s+(?:to\s+)?)?([\d+\-*/().^%\s]+(?:\d))/i,
  /oblicz[:\s]+([\d+\-*/().^%\s]+)/i,
  /policz[:\s]+([\d+\-*/().^%\s]+)/i,
  /wynik[:\s]+([\d+\-*/().^%\s]+)/i,
  /^([\d+\-*/().^%\s]{3,})$/,
];

export const calculatorSkill: Skill = {
  name: "calculator",
  description: "Oblicza wyrażenia matematyczne",
  triggers: ["oblicz", "policz", "ile to", "wynik", "calculate"],

  async handle(message: string, _session: Session): Promise<string | null> {
    const msg = message.trim();

    // Spróbuj wyodrębnić wyrażenie matematyczne
    let expression: string | null = null;

    for (const pattern of MATH_PATTERNS) {
      const match = msg.match(pattern);
      if (match?.[1]) {
        expression = match[1].trim();
        break;
      }
    }

    if (!expression) return null;

    const result = safeMath(expression);
    if (result === null) return null;

    // Formatuj wynik
    const formatted =
      Number.isInteger(result)
        ? result.toString()
        : result.toFixed(10).replace(/\.?0+$/, "");

    return `**${expression.trim()} = ${formatted}**`;
  },
};
