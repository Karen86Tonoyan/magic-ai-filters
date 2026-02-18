// ============================================================
// CLAW BOT — Cerber Guardian (z ALFA)
// Bezpieczeństwo: Intent + Risk + Decision (ALLOW/BLOCK/MODIFY)
// ============================================================

import { logger } from "../logger/index.js";
import type { Session } from "../types/index.js";

// Reguły bezpieczeństwa (czysty kod, bez AI)
const CERBER_RULES = {
  blockRiskThreshold: 0.7,
  modifyRiskThreshold: 0.5,
  blockedIntents: ["harmful", "manipulation", "illegal", "violence"],
  blockedFlags: ["violence", "illegal", "self_harm", "hate_speech", "malware"],
  modifyOnAggressive: true,
};

export interface CerberVerdict {
  intent: string;
  risk: number;
  flags: string[];
  allowed: boolean;
  reason?: string;
}

export interface CerberRuling {
  decision: "ALLOW" | "BLOCK" | "MODIFY";
  verdict: CerberVerdict;
  blockedReason?: string;
  modification?: string;
}

export class CerberGuardian {
  // Analiza promptu — czysta logika (bez AI)
  analyzePrompt(prompt: string): CerberVerdict {
    const intent = this.detectIntent(prompt);
    const risk = this.calculateRisk(prompt, intent);
    const flags = this.detectFlags(prompt);
    const allowed = !flags.some((f) => CERBER_RULES.blockedFlags.includes(f));

    return {
      intent,
      risk,
      flags,
      allowed,
      reason: allowed ? undefined : `Detected flags: ${flags.join(", ")}`,
    };
  }

  // Decyzja — czysty kod, brak AI
  judge(prompt: string): CerberRuling {
    const verdict = this.analyzePrompt(prompt);

    // Zastosuj reguły
    const ruling = this.applyRules(verdict);
    ruling.verdict = verdict;

    logger.info("Cerber judgment", {
      decision: ruling.decision,
      intent: verdict.intent,
      risk: verdict.risk.toFixed(2),
      flags: verdict.flags,
    });

    return ruling;
  }

  private applyRules(verdict: CerberVerdict): Omit<CerberRuling, "verdict"> {
    // RULE 1: Analizator powiedział nie
    if (!verdict.allowed) {
      return {
        decision: "BLOCK",
        blockedReason: verdict.reason ?? "Not allowed by analysis",
      };
    }

    // RULE 2: Wysokie ryzyko
    if (verdict.risk >= CERBER_RULES.blockRiskThreshold) {
      return {
        decision: "BLOCK",
        blockedReason: `Risk ${verdict.risk.toFixed(2)} exceeds threshold ${CERBER_RULES.blockRiskThreshold}`,
      };
    }

    // RULE 3: Zablokowane intencje
    if (CERBER_RULES.blockedIntents.includes(verdict.intent)) {
      return {
        decision: "BLOCK",
        blockedReason: `Intent "${verdict.intent}" is blocked`,
      };
    }

    // RULE 4: Średnie ryzyko → MODIFY
    if (verdict.risk >= CERBER_RULES.modifyRiskThreshold) {
      return {
        decision: "MODIFY",
        modification: `[Sanitized] ${this.sanitizeAggressive(verdict)}`,
      };
    }

    // RULE 5: Wszystko OK
    return {
      decision: "ALLOW",
    };
  }

  private detectIntent(prompt: string): string {
    const lower = prompt.toLowerCase();

    if (/ignore|bypass|override|jailbreak/i.test(lower)) return "manipulation";
    if (/delete|remove|destroy|hack|crack/i.test(lower)) return "harmful";
    if (/illegal|crime|drug|bomb|weapon/i.test(lower)) return "illegal";
    if (/hurt|kill|violence|attack/i.test(lower)) return "violence";
    if (/help|create|build|teach|learn|explain/i.test(lower)) return "helpful";
    if (/question|ask|what|how|why/i.test(lower)) return "query";

    return "unknown";
  }

  private calculateRisk(prompt: string, intent: string): number {
    let risk = 0;

    // Intent risk
    switch (intent) {
      case "illegal":
        risk += 0.9;
        break;
      case "harmful":
        risk += 0.8;
        break;
      case "manipulation":
        risk += 0.7;
        break;
      case "violence":
        risk += 0.85;
        break;
      default:
        risk += 0.1;
    }

    // Pattern risk
    const patterns = [
      { pattern: /\[admin\]|\[system\]|\[override\]/i, risk: 0.6 },
      { pattern: /sql injection|xss|csrf|buffer overflow/i, risk: 0.8 },
      { pattern: /api key|password|secret|token/i, risk: 0.5 },
      { pattern: /execute|eval|exec|system\(/i, risk: 0.7 },
    ];

    for (const { pattern, risk: pRisk } of patterns) {
      if (pattern.test(prompt)) {
        risk = Math.max(risk, pRisk);
      }
    }

    // Length risk (bardzo długie prompty mogą być injections)
    if (prompt.length > 5000) {
      risk += 0.2;
    }

    return Math.min(risk, 1.0);
  }

  private detectFlags(prompt: string): string[] {
    const flags: string[] = [];
    const lower = prompt.toLowerCase();

    if (/violence|kill|hurt|attack|weapon|bomb/i.test(lower)) flags.push("violence");
    if (/illegal|crime|drug|hack|malware|virus/i.test(lower)) flags.push("illegal");
    if (/self.harm|suicide|death wish/i.test(lower)) flags.push("self_harm");
    if (/hate|racist|sexist|discrimin/i.test(lower)) flags.push("hate_speech");
    if (/malware|trojan|ransomware|exploit/i.test(lower)) flags.push("malware");
    if (/\[system\]|\[admin\]|ignore.*rule/i.test(lower)) flags.push("prompt_injection");
    if (/api.?key|password|secret|token|credential/i.test(lower)) flags.push("credential_leak");

    return flags;
  }

  private sanitizeAggressive(verdict: CerberVerdict): string {
    return `[Prompt contains flags: ${verdict.flags.join(", ")}. Proceeding with caution.]`;
  }

  // Debug: pokaż verdict dla promptu
  debug(prompt: string): CerberRuling {
    return this.judge(prompt);
  }
}

export const cerber = new CerberGuardian();
export default cerber;
