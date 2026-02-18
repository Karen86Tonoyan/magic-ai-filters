// ============================================================
// CLAW BOT — Web Audit Skill (z Audytstrony)
// Security scanning and PDF report generation
// ============================================================

import type { Skill, Session } from "../types/index.js";
import { webAudit } from "../modules/web-audit.js";
import { pdfGenerator } from "../modules/pdf-generator.js";
import { logger } from "../logger/index.js";

export const auditSkill: Skill = {
  name: "audit",
  description: "Audytuj bezpieczeństwo strony internetowej",
  triggers: ["audyt", "audit", "przeskanuj", "bezpieczeństwo"],

  async handle(message: string, session: Session): Promise<string | null> {
    const msg = message.trim();
    const msgLower = msg.toLowerCase();

    // Detect URL
    const urlMatch = msg.match(
      /(?:audyt|audit|przeskanuj|bezpieczeństwo)\s+(?:strony\s+)?(?:internetowej\s+)?(.+?)(?:\s+to\s+)?(?:\s+$|\.)?/i
    );

    if (!urlMatch) {
      return null;
    }

    let urlString = urlMatch[1].trim();

    // Normalize URL
    if (!urlString.startsWith("http://") && !urlString.startsWith("https://")) {
      urlString = "https://" + urlString;
    }

    try {
      new URL(urlString);
    } catch {
      return `❌ Nieprawidłowy URL: "${urlString}"`;
    }

    try {
      logger.info("Starting web audit", { url: urlString, sessionId: session.id });

      // Run audit
      const auditResult = await webAudit.auditURL(urlString);

      // Generate PDF report
      const pdfResult = await pdfGenerator.generateWebAuditReport(auditResult);

      // Build response
      const severityCounts = {
        critical: auditResult.findings.filter((f) => f.severity === "critical").length,
        high: auditResult.findings.filter((f) => f.severity === "high").length,
        medium: auditResult.findings.filter((f) => f.severity === "medium").length,
        low: auditResult.findings.filter((f) => f.severity === "low").length,
      };

      let response = `🔐 **Audyt bezpieczeństwa: ${urlString}**\n\n`;
      response += `**Wynik:** ${auditResult.score}/100\n\n`;

      response += `**Wnioski:**\n`;
      response += `• 🔴 Krytyczne: ${severityCounts.critical}\n`;
      response += `• 🟠 Wysokie: ${severityCounts.high}\n`;
      response += `• 🟡 Średnie: ${severityCounts.medium}\n`;
      response += `• 🔵 Niskie: ${severityCounts.low}\n\n`;

      response += `**SSL/TLS:** ${auditResult.ssl.valid ? "✓ Prawidłowy" : "✗ Nieprawidłowy"}\n`;
      response += `**Security Headers:** ${Object.values(auditResult.headers).filter(Boolean).length}/4\n\n`;

      if (auditResult.findings.length > 0) {
        response += `**Top wnioski:**\n`;
        for (const finding of auditResult.findings.slice(0, 3)) {
          response += `• [${finding.severity}] ${finding.title}\n`;
        }
        response += `\n`;
      }

      response += `📄 Raport PDF: \`${pdfResult.path}\`\n`;
      response += `(${(pdfResult.size / 1024).toFixed(2)} KB)`;

      return response;
    } catch (err) {
      logger.error("Audit error", { url: urlString, error: String(err) });
      return `❌ Błąd podczas audytu: ${err instanceof Error ? err.message : String(err)}`;
    }
  },
};

export default auditSkill;
