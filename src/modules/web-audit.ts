// ============================================================
// CLAW BOT — Web Audit Module (z Audytstrony)
// Security scanning: SSL, headers, vulnerabilities
// ============================================================

import { logger } from "../logger/index.js";

export interface SecurityFinding {
  category: "ssl" | "headers" | "vulnerability" | "seo" | "performance";
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  recommendation: string;
}

export interface WebAuditResult {
  url: string;
  timestamp: Date;
  score: number; // 0-100
  findings: SecurityFinding[];
  ssl: {
    valid: boolean;
    issuer?: string;
    expiryDate?: Date;
    ciphers?: string[];
  };
  headers: {
    hasCSP: boolean;
    hasHSTS: boolean;
    hasXFrameOptions: boolean;
    hasXContentType: boolean;
  };
  seo: {
    hasMetaDescription: boolean;
    hasMobileViewport: boolean;
    hasCanonical: boolean;
  };
  performance: {
    responseTime: number; // ms
    pageSize: number; // bytes
  };
}

export class WebAuditModule {
  async auditURL(url: string): Promise<WebAuditResult> {
    const findings: SecurityFinding[] = [];
    let score = 100;

    logger.info("Web audit started", { url });

    try {
      // 1. Check SSL/TLS
      const sslCheck = await this.checkSSL(url);
      if (!sslCheck.valid) {
        findings.push({
          category: "ssl",
          severity: "critical",
          title: "Invalid SSL Certificate",
          description: "SSL certificate is invalid or expired",
          recommendation: "Install a valid SSL certificate from a trusted CA",
        });
        score -= 30;
      }

      // 2. Check Security Headers
      const headerCheck = await this.checkSecurityHeaders(url);
      if (!headerCheck.hasCSP) {
        findings.push({
          category: "headers",
          severity: "high",
          title: "Missing Content-Security-Policy",
          description: "CSP header not found",
          recommendation: "Add Content-Security-Policy header to prevent XSS",
        });
        score -= 15;
      }

      if (!headerCheck.hasHSTS) {
        findings.push({
          category: "headers",
          severity: "high",
          title: "Missing HSTS Header",
          description: "HTTP Strict-Transport-Security not configured",
          recommendation:
            "Add HSTS header to enforce HTTPS and prevent downgrade attacks",
        });
        score -= 15;
      }

      if (!headerCheck.hasXFrameOptions) {
        findings.push({
          category: "headers",
          severity: "medium",
          title: "Missing X-Frame-Options",
          description: "Header not set, site may be vulnerable to clickjacking",
          recommendation: 'Set X-Frame-Options to "DENY" or "SAMEORIGIN"',
        });
        score -= 10;
      }

      // 3. Check common vulnerabilities
      const vulnCheck = await this.checkVulnerabilities(url);
      for (const vuln of vulnCheck) {
        findings.push(vuln);
        score -= 10;
      }

      // 4. Check SEO
      const seoCheck = await this.checkSEO(url);
      if (!seoCheck.hasMetaDescription) {
        findings.push({
          category: "seo",
          severity: "low",
          title: "Missing Meta Description",
          description: "Meta description tag not found",
          recommendation: "Add a descriptive meta tag (50-160 characters)",
        });
        score -= 3;
      }

      // 5. Performance
      const perfCheck = await this.checkPerformance(url);

      score = Math.max(0, score);

      const result: WebAuditResult = {
        url,
        timestamp: new Date(),
        score,
        findings,
        ssl: sslCheck,
        headers: headerCheck,
        seo: seoCheck,
        performance: perfCheck,
      };

      logger.info("Web audit completed", { url, score });
      return result;
    } catch (err) {
      logger.error("Web audit error", { url, error: String(err) });
      throw err;
    }
  }

  private async checkSSL(url: string): Promise<WebAuditResult["ssl"]> {
    try {
      const urlObj = new URL(url);
      const response = await fetch(urlObj, { method: "HEAD" });

      // In real implementation: check certificate validity
      // For now: simple check based on protocol
      return {
        valid: urlObj.protocol === "https:",
        issuer: "Unknown (mock)",
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      };
    } catch {
      return { valid: false };
    }
  }

  private async checkSecurityHeaders(url: string): Promise<WebAuditResult["headers"]> {
    try {
      const response = await fetch(url);
      const headers = response.headers;

      return {
        hasCSP: headers.has("content-security-policy"),
        hasHSTS: headers.has("strict-transport-security"),
        hasXFrameOptions: headers.has("x-frame-options"),
        hasXContentType: headers.has("x-content-type-options"),
      };
    } catch {
      return {
        hasCSP: false,
        hasHSTS: false,
        hasXFrameOptions: false,
        hasXContentType: false,
      };
    }
  }

  private async checkVulnerabilities(url: string): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    // TODO: Implement vulnerability scanning
    // - Check for known CVEs
    // - Look for insecure patterns
    // - Test for common web vulnerabilities

    return findings;
  }

  private async checkSEO(url: string): Promise<WebAuditResult["seo"]> {
    // TODO: Parse HTML and check for SEO elements
    return {
      hasMetaDescription: false,
      hasMobileViewport: false,
      hasCanonical: false,
    };
  }

  private async checkPerformance(url: string): Promise<WebAuditResult["performance"]> {
    const startTime = Date.now();

    try {
      const response = await fetch(url);
      const responseTime = Date.now() - startTime;
      const pageSize = parseInt(response.headers.get("content-length") || "0");

      return { responseTime, pageSize };
    } catch {
      return { responseTime: 0, pageSize: 0 };
    }
  }
}

export const webAudit = new WebAuditModule();
export default webAudit;
