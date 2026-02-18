// ============================================================
// CLAW BOT — UI TAR Executor (z ALFA)
// UI Task Automation and Reasoning
// Automatyzacja czynności na ekranie: kliknięcia, tekst, scrolling
// ============================================================

import { logger } from "../logger/index.js";
import type { Tool } from "../types/index.js";

export interface UIAction {
  type: "click" | "type" | "scroll" | "wait" | "screenshot" | "focus";
  selector?: string;
  text?: string;
  x?: number;
  y?: number;
  duration?: number;
}

export interface UITARPlan {
  goal: string;
  steps: UIAction[];
  reasoning: string;
}

// TODO: Powiąż z faktycznym drivером (Selenium/Puppeteer)
// Na razie: mock executor
class UITARExecutor {
  private actionLog: UIAction[] = [];

  async executeAction(action: UIAction): Promise<unknown> {
    logger.info("UI TAR action", { type: action.type, selector: action.selector });

    // Mock: Zapisz akcję
    this.actionLog.push(action);

    // W produkcji: użyj Selenium/Puppeteer
    // return await this.driver.executeAction(action);

    return { success: true, action };
  }

  async executePlan(plan: UITARPlan): Promise<unknown[]> {
    const results: unknown[] = [];

    for (const step of plan.steps) {
      try {
        const result = await this.executeAction(step);
        results.push(result);
      } catch (err) {
        logger.error("UI TAR step failed", { step, error: String(err) });
        results.push({ success: false, error: String(err) });
        break; // Stop na pierwszym błędzie
      }
    }

    return results;
  }

  getLog(): UIAction[] {
    return this.actionLog;
  }

  clearLog(): void {
    this.actionLog = [];
  }
}

export const uiTar = new UITARExecutor();

// Tool: Automatyzuj UI
export const autoUITool: Tool = {
  name: "automate_ui",
  description:
    "Automatyzuj zadania na ekranie: klikanie, wpisywanie tekstu, scrolling. " +
    "Zwróć JSON z celami i krokami.",
  parameters: {
    goal: {
      type: "string",
      description: "Cel do osiągnięcia (np. 'Zaloguj się do Gmaila')",
      required: true,
    },
    steps: {
      type: "array",
      description: "Kroki do wykonania (click, type, scroll, wait)",
      required: true,
    },
  },
  async execute(args: Record<string, unknown>) {
    const goal = String(args.goal);
    const steps = (args.steps as UIAction[]) || [];

    const plan: UITARPlan = {
      goal,
      steps,
      reasoning: "User requested UI automation",
    };

    const results = await uiTar.executePlan(plan);

    return {
      success: results.every((r: unknown) => (r as { success?: boolean }).success !== false),
      goal,
      executed: results.length,
      log: uiTar.getLog(),
    };
  },
};

// Tool: Screenshot
export const screenshotTool: Tool = {
  name: "screenshot",
  description: "Zrób zrzut ekranu obecnego stanu",
  parameters: {},
  async execute() {
    // TODO: Powiąż z rzeczywistym driverm
    logger.info("Screenshot requested");
    return {
      success: true,
      message: "Screenshot taken (mock)",
      path: "/tmp/screenshot.png",
    };
  },
};

export default uiTar;
