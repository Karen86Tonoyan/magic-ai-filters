/**
 * ALFA Age Verification Module v1.0
 * External KYC/Age Verification Flow
 * Karen Tonoyan | kontakt@karentonoyan.pl
 *
 * Architecture:
 * USER → SHIELD → ADULT_CONTENT_RISK + not_verified → GENERATE VERIFY LINK
 * → AGE VERIFICATION PAGE → ID + VIDEO CHECK → PROVIDER RETURNS CLAIM
 * → ALFA STORES VERIFIED FLAG → USER CONTINUES
 *
 * ALFA never stores raw documents — only verification claims.
 */

// ─── TYPES ───────────────────────────────────────────────────

export type AgeVerificationMethod = 'id_plus_liveness' | 'provider_token' | 'manual_review';

export interface UserSafetyClaims {
  age_verified: boolean;
  age_verification_method?: AgeVerificationMethod;
  age_verified_at?: string;
  verification_id?: string;
  /** TTL in days — verification expires after this period */
  ttl_days: number;
}

export interface VerificationLink {
  url: string;
  token: string;
  user_id: string;
  session_id: string;
  created_at: string;
  expires_at: string;
  used: boolean;
}

export interface ProviderVerificationResult {
  verified: boolean;
  age_over_18: boolean;
  verification_id: string;
  method: AgeVerificationMethod;
  verified_at: string;
}

export interface AgeGateDecision {
  requires_verification: boolean;
  reason: 'adult_content_no_claim' | 'claim_expired' | 'minor_detected' | null;
  verification_link?: VerificationLink;
  /** If true, content is permanently blocked (minor safety) */
  hard_block: boolean;
}

// ─── CONSTANTS ───────────────────────────────────────────────

const DEFAULT_TTL_DAYS = 90;
const LINK_EXPIRY_MINUTES = 15;

// ─── CLAIM STORE (in-memory, replace with DB in production) ──

const claimStore = new Map<string, UserSafetyClaims>();
const linkStore = new Map<string, VerificationLink>();

// ─── HELPERS ─────────────────────────────────────────────────

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = 'avt_';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function isClaimValid(claim: UserSafetyClaims): boolean {
  if (!claim.age_verified || !claim.age_verified_at) return false;

  const verifiedDate = new Date(claim.age_verified_at);
  const now = new Date();
  const diffDays = (now.getTime() - verifiedDate.getTime()) / (1000 * 60 * 60 * 24);

  return diffDays <= claim.ttl_days;
}

// ─── PUBLIC API ──────────────────────────────────────────────

/**
 * Check if a user has a valid age verification claim.
 */
export function hasValidAgeClaim(userId: string): boolean {
  const claim = claimStore.get(userId);
  if (!claim) return false;
  return isClaimValid(claim);
}

/**
 * Get the current claim for a user (or null).
 */
export function getUserClaim(userId: string): UserSafetyClaims | null {
  return claimStore.get(userId) ?? null;
}

/**
 * Evaluate whether age verification is needed for a given content risk.
 * Called by ALFA Shield when ADULT_CONTENT_RISK or MINOR_SAFETY_RISK is detected.
 */
export function evaluateAgeGate(
  userId: string,
  sessionId: string,
  riskCategory: 'ADULT_CONTENT_RISK' | 'MINOR_SAFETY_RISK',
  baseUrl: string = '/verify'
): AgeGateDecision {
  // MINOR_SAFETY_RISK → always hard block, no verification path
  if (riskCategory === 'MINOR_SAFETY_RISK') {
    return {
      requires_verification: false,
      reason: 'minor_detected',
      hard_block: true,
    };
  }

  // ADULT_CONTENT_RISK → check existing claim
  const claim = claimStore.get(userId);

  if (claim && isClaimValid(claim)) {
    // Valid claim exists — allow through
    return {
      requires_verification: false,
      reason: null,
      hard_block: false,
    };
  }

  // Claim expired or missing — generate verification link
  const reason = claim ? 'claim_expired' : 'adult_content_no_claim';
  const link = generateVerificationLink(userId, sessionId, baseUrl);

  return {
    requires_verification: true,
    reason,
    verification_link: link,
    hard_block: false,
  };
}

/**
 * Generate a one-time, time-limited verification link.
 * Link is bound to user_id + session_id and expires in 15 minutes.
 */
export function generateVerificationLink(
  userId: string,
  sessionId: string,
  baseUrl: string = '/verify'
): VerificationLink {
  const token = generateToken();
  const now = new Date();
  const expires = new Date(now.getTime() + LINK_EXPIRY_MINUTES * 60 * 1000);

  const link: VerificationLink = {
    url: `${baseUrl}?token=${token}`,
    token,
    user_id: userId,
    session_id: sessionId,
    created_at: now.toISOString(),
    expires_at: expires.toISOString(),
    used: false,
  };

  linkStore.set(token, link);
  return link;
}

/**
 * Process the callback from the external verification provider.
 * Validates the link token and stores the claim if verification passed.
 * 
 * Returns null if the token is invalid/expired/used.
 */
export function processVerificationCallback(
  token: string,
  providerResult: ProviderVerificationResult
): UserSafetyClaims | null {
  const link = linkStore.get(token);
  if (!link) return null;

  // Check expiry
  if (new Date() > new Date(link.expires_at)) {
    linkStore.delete(token);
    return null;
  }

  // Check if already used
  if (link.used) return null;

  // Mark as used
  link.used = true;

  // Only store claim if provider confirmed age_over_18
  if (!providerResult.verified || !providerResult.age_over_18) {
    return null;
  }

  const claim: UserSafetyClaims = {
    age_verified: true,
    age_verification_method: providerResult.method,
    age_verified_at: providerResult.verified_at,
    verification_id: providerResult.verification_id,
    ttl_days: DEFAULT_TTL_DAYS,
  };

  claimStore.set(link.user_id, claim);
  return claim;
}

/**
 * Revoke a user's age verification claim.
 */
export function revokeClaim(userId: string): void {
  claimStore.delete(userId);
}

/**
 * Create default (unverified) claims for a new user.
 */
export function createDefaultClaims(): UserSafetyClaims {
  return {
    age_verified: false,
    ttl_days: DEFAULT_TTL_DAYS,
  };
}

/**
 * Clear all links and claims (for testing).
 */
export function resetAgeVerificationStore(): void {
  claimStore.clear();
  linkStore.clear();
}
