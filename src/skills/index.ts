// ============================================================
// CLAW BOT — System Skills/Tools
// Rozszerzalne umiejętności agenta
// ============================================================

import { logger } from "../logger/index.js";
import type { Skill, Session } from "../types/index.js";

// Wbudowane skille
import { dateTimeSkill } from "./datetime.js";
import { calculatorSkill } from "./calculator.js";
import { rememberSkill } from "./remember.js";

export class SkillRegistry {
  private skills: Map<string, Skill> = new Map();

  constructor() {
    this.register(dateTimeSkill);
    this.register(calculatorSkill);
    this.register(rememberSkill);
    logger.info("SkillRegistry initialized", { skills: this.skills.size });
  }

  register(skill: Skill): void {
    this.skills.set(skill.name, skill);
    logger.debug("Skill registered", { skill: skill.name });
  }

  // Próbuj obsłużyć wiadomość przez skille
  // Zwraca odpowiedź skilla lub null (wtedy agent idzie do LLM)
  async handle(message: string, session: Session): Promise<string | null> {
    for (const skill of this.skills.values()) {
      // Sprawdź triggery (słowa kluczowe)
      if (skill.triggers && skill.triggers.length > 0) {
        const msgLower = message.toLowerCase();
        const triggered = skill.triggers.some((t) => msgLower.includes(t.toLowerCase()));
        if (!triggered) continue;
      }

      try {
        const result = await skill.handle(message, session);
        if (result !== null) {
          logger.debug("Skill handled message", { skill: skill.name });
          return result;
        }
      } catch (err) {
        logger.error("Skill error", { skill: skill.name, error: String(err) });
      }
    }
    return null;
  }

  list(): Skill[] {
    return Array.from(this.skills.values());
  }
}

export const skillRegistry = new SkillRegistry();
export default skillRegistry;
