/**
 * ALFA Incident Log & Auto-Ban System v1.0
 * 
 * - Stores all scan incidents with annotations (TP/FP)
 * - Auto-ban after threshold attacks
 * - Writing style fingerprinting for ban evasion detection
 * - Export to JSON/CSV for benchmark datasets
 */

import { extractFingerprint, compareFingerprints, type WritingFingerprint } from './writing-fingerprint';
import type { ShieldScanResult } from './alfa-shield';
import type { SemanticObfuscationResult } from './semantic-obfuscation';
import type { ContextShiftResult } from './context-shift';

// ─── TYPES ──────────────────────────────────────────────────

export type AnnotationLabel = 'true_positive' | 'false_positive' | 'unreviewed';

export interface IncidentRecord {
  id: string;
  timestamp: string;
  session_id: string;
  input: string;
  /** Pipeline decision */
  verdict: string;
  risk_score: number;
  category: string | null;
  severity: string | null;
  recommended_action: string;
  /** User annotation */
  annotation: AnnotationLabel;
  annotation_timestamp?: string;
  /** Context shift at time of scan */
  context_shift: ContextShiftResult | null;
  /** Semantic obfuscation result */
  semantic_obfuscation: SemanticObfuscationResult | null;
  /** Flags triggered */
  flags: string[];
  /** Matched patterns */
  matched_patterns: string[];
  /** Writing style fingerprint */
  fingerprint: WritingFingerprint;
  /** Session status at time */
  session_status: string;
  /** Was this from a banned user? */
  ban_evasion_suspected: boolean;
}

export interface BannedUser {
  session_id: string;
  banned_at: string;
  reason: string;
  attack_count: number;
  fingerprint: WritingFingerprint;
}

export interface ThreatAnalysis {
  total_attacks: number;
  attack_categories: Record<string, number>;
  avg_risk_score: number;
  escalation_pattern: boolean;
  intent_summary: string[];
  fingerprint_matches: { banned_id: string; similarity: number }[];
}

// ─── STORAGE KEYS ───────────────────────────────────────────

const INCIDENTS_KEY = 'alfa_incident_log';
const BANNED_KEY = 'alfa_banned_users';
const ADMIN_PIN = 'alfa_admin_2024'; // Simple admin access

// ─── INCIDENT LOG ───────────────────────────────────────────

export function loadIncidents(): IncidentRecord[] {
  try {
    return JSON.parse(localStorage.getItem(INCIDENTS_KEY) || '[]');
  } catch { return []; }
}

export function saveIncidents(incidents: IncidentRecord[]): void {
  localStorage.setItem(INCIDENTS_KEY, JSON.stringify(incidents));
}

export function loadBannedUsers(): BannedUser[] {
  try {
    return JSON.parse(localStorage.getItem(BANNED_KEY) || '[]');
  } catch { return []; }
}

export function saveBannedUsers(banned: BannedUser[]): void {
  localStorage.setItem(BANNED_KEY, JSON.stringify(banned));
}

// ─── RECORD INCIDENT ────────────────────────────────────────

export function recordIncident(
  scanResult: ShieldScanResult,
  input: string,
  verdict: string,
  sessionId: string,
): IncidentRecord {
  const fingerprint = extractFingerprint(input);
  const bannedUsers = loadBannedUsers();

  // Check for ban evasion
  let banEvasion = false;
  for (const banned of bannedUsers) {
    const match = compareFingerprints(fingerprint, banned.fingerprint);
    if (match.is_likely_same_user) {
      banEvasion = true;
      break;
    }
  }

  const record: IncidentRecord = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    input,
    verdict,
    risk_score: scanResult.risk_score,
    category: scanResult.shield_signal.category,
    severity: scanResult.shield_signal.severity,
    recommended_action: scanResult.shield_signal.recommended_action,
    annotation: 'unreviewed',
    context_shift: scanResult.context_shift ?? null,
    semantic_obfuscation: scanResult.semantic_obfuscation ?? null,
    flags: scanResult.shield_signal.reasons,
    matched_patterns: scanResult.shield_signal.matched_patterns,
    fingerprint,
    session_status: scanResult.session_status,
    ban_evasion_suspected: banEvasion,
  };

  const incidents = loadIncidents();
  incidents.push(record);
  saveIncidents(incidents);

  return record;
}

// ─── ANNOTATION ─────────────────────────────────────────────

export function annotateIncident(id: string, label: AnnotationLabel): void {
  const incidents = loadIncidents();
  const idx = incidents.findIndex(i => i.id === id);
  if (idx >= 0) {
    incidents[idx].annotation = label;
    incidents[idx].annotation_timestamp = new Date().toISOString();
    saveIncidents(incidents);
  }
}

// ─── AUTO-BAN SYSTEM ────────────────────────────────────────

const ATTACK_THRESHOLD_FOR_ANALYSIS = 10;
const ATTACK_THRESHOLD_FOR_BAN = 5;

export interface AutoBanCheck {
  should_ban: boolean;
  should_analyze: boolean;
  attack_count: number;
  threat_analysis: ThreatAnalysis | null;
  ban_evasion_detected: boolean;
}

export function checkAutoBan(sessionId: string): AutoBanCheck {
  const incidents = loadIncidents();
  const sessionIncidents = incidents.filter(i => i.session_id === sessionId);
  const attacks = sessionIncidents.filter(i => i.risk_score > 0.4);
  const attackCount = attacks.length;

  const bannedUsers = loadBannedUsers();
  const isAlreadyBanned = bannedUsers.some(b => b.session_id === sessionId);

  // Check fingerprint against banned users
  let banEvasion = false;
  if (attacks.length > 0) {
    const latestFingerprint = attacks[attacks.length - 1].fingerprint;
    for (const banned of bannedUsers) {
      if (banned.session_id === sessionId) continue;
      const match = compareFingerprints(latestFingerprint, banned.fingerprint);
      if (match.is_likely_same_user) {
        banEvasion = true;
        break;
      }
    }
  }

  let threatAnalysis: ThreatAnalysis | null = null;
  const shouldAnalyze = attackCount >= ATTACK_THRESHOLD_FOR_ANALYSIS || banEvasion;

  if (shouldAnalyze) {
    // Deep analysis
    const catCounts: Record<string, number> = {};
    for (const a of attacks) {
      const cat = a.category || 'unknown';
      catCounts[cat] = (catCounts[cat] ?? 0) + 1;
    }

    const avgRisk = attacks.reduce((s, a) => s + a.risk_score, 0) / (attacks.length || 1);

    // Check for escalation pattern
    const riskTrend = attacks.slice(-5).map(a => a.risk_score);
    const escalation = riskTrend.length >= 3 &&
      riskTrend.every((v, i) => i === 0 || v >= riskTrend[i - 1] * 0.9);

    // Fingerprint matches against banned
    const fingerprintMatches: { banned_id: string; similarity: number }[] = [];
    if (attacks.length > 0) {
      const fp = attacks[attacks.length - 1].fingerprint;
      for (const banned of bannedUsers) {
        const match = compareFingerprints(fp, banned.fingerprint);
        if (match.similarity > 0.5) {
          fingerprintMatches.push({ banned_id: banned.session_id, similarity: match.similarity });
        }
      }
    }

    const intents = [...new Set(attacks.map(a => a.category).filter(Boolean))] as string[];

    threatAnalysis = {
      total_attacks: attackCount,
      attack_categories: catCounts,
      avg_risk_score: parseFloat(avgRisk.toFixed(3)),
      escalation_pattern: escalation,
      intent_summary: intents,
      fingerprint_matches: fingerprintMatches,
    };
  }

  const shouldBan = (attackCount >= ATTACK_THRESHOLD_FOR_BAN && !isAlreadyBanned) || banEvasion;

  return {
    should_ban: shouldBan,
    should_analyze: shouldAnalyze,
    attack_count: attackCount,
    threat_analysis: threatAnalysis,
    ban_evasion_detected: banEvasion,
  };
}

export function executeBan(sessionId: string, reason: string): void {
  const incidents = loadIncidents();
  const attacks = incidents.filter(i => i.session_id === sessionId && i.risk_score > 0.4);

  if (attacks.length === 0) return;

  // Aggregate fingerprint from all attacks
  const latestFingerprint = attacks[attacks.length - 1].fingerprint;

  const banned = loadBannedUsers();
  if (!banned.some(b => b.session_id === sessionId)) {
    banned.push({
      session_id: sessionId,
      banned_at: new Date().toISOString(),
      reason,
      attack_count: attacks.length,
      fingerprint: latestFingerprint,
    });
    saveBannedUsers(banned);
  }
}

// ─── EXPORT ─────────────────────────────────────────────────

export function exportAsJSON(incidents: IncidentRecord[]): string {
  return JSON.stringify(incidents, null, 2);
}

export function exportAsCSV(incidents: IncidentRecord[]): string {
  const headers = [
    'id', 'timestamp', 'session_id', 'input', 'verdict', 'risk_score',
    'category', 'severity', 'recommended_action', 'annotation',
    'annotation_timestamp', 'session_status', 'ban_evasion_suspected',
    'context_shift_similarity', 'context_shift_type',
    'semantic_detected', 'semantic_category', 'semantic_score',
    'flags', 'matched_patterns',
    'fp_avg_word_len', 'fp_vocab_richness', 'fp_punct_density',
    'fp_uppercase_ratio', 'fp_lang_mix',
  ];

  const rows = incidents.map(i => [
    i.id,
    i.timestamp,
    i.session_id,
    `"${(i.input || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
    i.verdict,
    i.risk_score,
    i.category || '',
    i.severity || '',
    i.recommended_action,
    i.annotation,
    i.annotation_timestamp || '',
    i.session_status,
    i.ban_evasion_suspected,
    i.context_shift?.similarity ?? '',
    i.context_shift?.shift_type ?? '',
    i.semantic_obfuscation?.detected ?? false,
    i.semantic_obfuscation?.best_category ?? '',
    i.semantic_obfuscation?.max_score ?? '',
    `"${(i.flags || []).join('; ')}"`,
    `"${(i.matched_patterns || []).join('; ')}"`,
    i.fingerprint?.avg_word_length ?? '',
    i.fingerprint?.vocab_richness ?? '',
    i.fingerprint?.punctuation_density ?? '',
    i.fingerprint?.uppercase_ratio ?? '',
    i.fingerprint?.language_mix ?? '',
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/** Admin access check (simple PIN for now) */
export function verifyAdminAccess(pin: string): boolean {
  return pin === ADMIN_PIN;
}

/** Get stats summary */
export function getIncidentStats() {
  const incidents = loadIncidents();
  const total = incidents.length;
  const attacks = incidents.filter(i => i.risk_score > 0.4).length;
  const tp = incidents.filter(i => i.annotation === 'true_positive').length;
  const fp = incidents.filter(i => i.annotation === 'false_positive').length;
  const unreviewed = incidents.filter(i => i.annotation === 'unreviewed').length;
  const banned = loadBannedUsers().length;

  return { total, attacks, true_positives: tp, false_positives: fp, unreviewed, banned_users: banned };
}
