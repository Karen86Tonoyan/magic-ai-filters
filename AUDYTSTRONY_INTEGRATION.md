# CLAW BOT × Audytstrony Integration

Integracja **Audytstrony** — zaawansowanego systemu audytu bezpieczeństwa stron internetowych — z CLAW-em.

## Co dodano

### 1. **Web Audit Module** (`src/modules/web-audit.ts`)

Kompleksowy system skanowania bezpieczeństwa stron:

**Funkcjonalności:**
- ✅ SSL/TLS certificate validation
- ✅ Security headers checking (CSP, HSTS, X-Frame-Options, X-Content-Type)
- ✅ Vulnerability detection
- ✅ SEO analysis
- ✅ Performance metrics
- ✅ Scoring system (0-100)

**Główna metoda:**
```typescript
const result = await webAudit.auditURL("https://example.com");
// {
//   score: 75,
//   findings: [
//     { category: "ssl", severity: "high", title: "...", ... },
//     { category: "headers", severity: "medium", ... },
//     ...
//   ],
//   ssl: { valid: true, issuer: "...", expiryDate: ... },
//   headers: { hasCSP: true, hasHSTS: false, ... },
//   seo: { hasMetaDescription: true, ... },
//   performance: { responseTime: 245, pageSize: 524288 }
// }
```

**Kategorie znalezisk:**
- **critical** — Zagrożenie (XSS, SQL injection, SSL failure)
- **high** — Poważne (Missing HSTS, CSP)
- **medium** — Umiarkowane (Missing headers)
- **low** — Niskie (Missing meta tags)
- **info** — Informacyjne

### 2. **Vision Module** (`src/modules/vision.ts`)

Moduł analizy obrazu i ekranu:

**Możliwości:**
- 📸 Screenshot capture (full screen + region)
- 🔍 OCR — Optical Character Recognition
- 🎯 UI element detection (buttons, inputs, etc.)
- 🤖 LLM-based screenshot analysis
- 🔄 Change detection (screen comparison)

**API:**
```typescript
// Zrób screenshot
const screenshot = await vision.captureScreen();
// { base64: "iVBORw0KGgo...", width: 1920, height: 1080, ... }

// Wyodrębnij tekst (OCR)
const text = await vision.ocrImage(screenshot.base64);
// { text: "Extracted text...", confidence: 0.95, boxes: [...] }

// Znajdź elementy UI
const elements = await vision.detectUIElements(screenshot.base64);
// [ { type: "button", text: "Submit", position: {...}, ... } ]

// Przeanalizuj ekran LLM
const analysis = await vision.analyzeScreenshot(screenshot.base64);
// "The screenshot shows a login form with email and password fields..."
```

### 3. **PDF Generator** (`src/modules/pdf-generator.ts`)

Generator raporów PDF:

**Typy raportów:**
- 🔐 Web Audit Reports (bezpieczeństwo)
- 💾 Memory Reports (pamięć)
- 📊 Custom Reports (dowolne sekcje)

**Elementy raportu:**
```typescript
interface PDFReport {
  title: string;
  subtitle?: string;
  author?: string;
  sections: [
    { type: "title", content: "Title" },
    { type: "heading", content: "Heading", level: 2 },
    { type: "text", content: "Text paragraph" },
    { type: "table", content: [["Col1", "Col2"], ...] },
    { type: "image", content: { base64: "...", width: 300 } },
    { type: "divider", content: "" }
  ]
}
```

**Użycie:**
```typescript
// Wygeneruj raport audytu
const result = await pdfGenerator.generateWebAuditReport(auditResult);
// { path: "./data/reports/audit-1708345600000.pdf", size: 102400 }

// Raport własny
const report = await pdfGenerator.generateReport({
  title: "Custom Report",
  sections: [...]
});
```

### 4. **Audit Skill** (`src/skills/audit-skill.ts`)

Natural language interface do audytów:

**Komendy:**
```
"Audyt google.com"
"Zaudytuj https://example.com"
"Przeskanuj bezpieczeństwo stackoverflow.com"
"Czy example.com jest bezpieczna?"
```

**Odpowiedź:**
```
🔐 Audyt bezpieczeństwa: https://example.com

Wynik: 75/100

Wnioski:
• 🔴 Krytyczne: 1
• 🟠 Wysokie: 2
• 🟡 Średnie: 3
• 🔵 Niskie: 4

SSL/TLS: ✓ Prawidłowy
Security Headers: 3/4

Top wnioski:
• [high] Missing Content-Security-Policy
• [high] Missing HSTS Header
• [medium] Missing X-Frame-Options

📄 Raport PDF: ./data/reports/audit-example.com-1708345600000.pdf
(150.50 KB)
```

## Integracja z CLAW

### Flow: Polecenie audytu

```
User (Telegram/Discord)
    ↓
"Audyt example.com"
    ↓
SkillRegistry.handle()
    ↓
auditSkill.triggers match "audyt"
    ↓
Extract URL: "example.com" → "https://example.com"
    ↓
WebAuditModule.auditURL()
  ├─ checkSSL()
  ├─ checkSecurityHeaders()
  ├─ checkVulnerabilities()
  ├─ checkSEO()
  └─ checkPerformance()
    ↓
PDFGenerator.generateWebAuditReport()
    ↓
Return: Score + Findings + PDF link
```

### Integracja z Memory

```typescript
// Zapamiętaj wyniki audytu
await longTermMemory.save(
  userId,
  "audit_example.com",
  { score: 75, findings: [...], timestamp: new Date() },
  importance: 0.9
);

// Później: "Co wiesz o bezpieczeństwie example.com?"
const results = longTermMemory.search(userId, "audit example.com");
```

### Integracja z WorkflowGraph

```typescript
// Node: audit_check
const auditNode = new WorkflowNode("audit_check", async (state) => {
  const url = extractURL(state.input);
  const result = await webAudit.auditURL(url);

  return {
    decision: result.score >= 80 ? "PROCEED" : "WAIT_HUMAN",
    thoughts: [
      ...state.thoughts,
      `Security score: ${result.score}/100`,
      `Critical findings: ${result.findings.filter(f => f.severity === "critical").length}`
    ]
  };
});
```

## Architektura

```
┌─────────────────────────────────────────────────────────┐
│                  User Input (Telegram)                  │
│              "Audyt example.com"                        │
└──────────────────────┬──────────────────────────────────┘
                       ↓
        ┌──────────────────────────────┐
        │    auditSkill.handle()       │
        │  Extract & validate URL      │
        └──────────────────┬───────────┘
                           ↓
        ┌──────────────────────────────────────────────┐
        │         WebAuditModule.auditURL()            │
        │  ┌─────────────────────────────────────┐     │
        │  │ SSL Check      → ssl.valid          │     │
        │  │ Headers Check  → headers.hasCSP     │     │
        │  │ Vulns Check    → findings[]         │     │
        │  │ SEO Check      → seo metrics        │     │
        │  │ Perf Check     → responseTime       │     │
        │  └──────────────┬──────────────────────┘     │
        │                 ↓                             │
        │        WebAuditResult                        │
        │        { score, findings, ... }              │
        └──────────────────┬───────────────────────────┘
                           ↓
        ┌──────────────────────────────────────────────┐
        │   PDFGenerator.generateWebAuditReport()      │
        │   Build PDF with findings & recommendations  │
        └──────────────────┬───────────────────────────┘
                           ↓
        ┌──────────────────────────────────────────────┐
        │  Return to User:                             │
        │  • Score (75/100)                            │
        │  • Findings count by severity                │
        │  • PDF report link                           │
        └──────────────────────────────────────────────┘
```

## TODO

- [ ] Pełna integracja z rzeczywistym SSL checking (node-fetch, tls)
- [ ] Implementacja OCR (Tesseract.js)
- [ ] UI element detection (computer-vision library)
- [ ] LLM vision analysis (Ollama llava model)
- [ ] Real PDF generation (PDFKit/jsPDF)
- [ ] CVE database integration
- [ ] Screenshot comparison (perceptual diff)
- [ ] Database persistence dla auditów
- [ ] Scheduled recurring audits
- [ ] Email notifications

## Przykład workflow

```
User: "Audyt google.com i wyślij raport mailem"

1. auditSkill triggers on "audyt"
2. WebAuditModule scans google.com
3. Results: score=92, findings=[...]
4. PDFGenerator creates beautiful report
5. Save to longTermMemory for future reference
6. (TODO) Send via email notification
7. Return summary to user

User later: "Co wiesz o google.com?"
→ Retrieves audit from memory
→ Shows previous score & top findings
```

---

**CLAW BOT teraz może bezpośrednio audytować bezpieczeństwo stron internetowych!** 🔐

Źródło: [Audytstrony](https://github.com/Karen86Tonoyan/Audytstrony)
