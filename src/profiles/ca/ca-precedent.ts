import type { CAAuthority, CAClaim, CAPrecedent } from "./ca-types.js";

/** TMO-CA precedent validation and proposition-specific precedent use. */

export type CAPrecedentValidationCode =
  | "CA_PRECEDENT_REQUIRED_FIELD_MISSING"
  | "CA_PRECEDENT_AUTHORITY_MISSING"
  | "CA_PRECEDENT_AUTHORITY_NOT_JUDICIAL"
  | "CA_PRECEDENT_HOLDING_MISSING"
  | "CA_PRECEDENT_RATIONALE_MISSING"
  | "CA_PRECEDENT_SCOPE_MISSING"
  | "CA_PRECEDENT_SOURCE_MISSING"
  | "CA_PRECEDENT_PROPOSITION_MISSING"
  | "CA_PRECEDENT_CLAIM_MISSING"
  | "CA_PRECEDENT_DUPLICATE_REFERENCE"
  | "CA_PRECEDENT_SELF_TREATMENT";

export interface CAPrecedentValidationIssue {
  readonly code: CAPrecedentValidationCode;
  readonly precedentId: string;
  readonly detail: string;
}

export interface CAPrecedentValidationResult {
  readonly valid: boolean;
  readonly issues: readonly CAPrecedentValidationIssue[];
}

export interface CAPrecedentValidationContext {
  readonly authorities: ReadonlyMap<string, CAAuthority>;
  readonly claims: ReadonlyMap<string, CAClaim>;
}

export interface CAPropositionSpecificPrecedentUse {
  readonly precedentId: string;
  readonly claimId: string;
  readonly authorityId: string;
  readonly holding: string;
  readonly rationale: string;
  readonly scope: string;
  readonly sourceRefs: readonly string[];
}

const hasText = (value: string): boolean => value.trim().length > 0;

const isJudicialAuthority = (authority: CAAuthority): boolean =>
  authority.authorityType === "SUPREME_COURT_PRECEDENT" ||
  authority.authorityType === "FEDERAL_APPELLATE_PRECEDENT" ||
  authority.authorityType === "FEDERAL_DISTRICT_PRECEDENT" ||
  authority.authorityType === "STATE_PRECEDENT";

const issue = (
  code: CAPrecedentValidationCode,
  precedentId: string,
  detail: string,
): CAPrecedentValidationIssue => ({ code, precedentId, detail });

const hasDuplicates = (values: readonly string[]): boolean =>
  new Set(values).size !== values.length;

/**
 * Validates precedent structure and references. It does not infer the legal
 * holding, choose the controlling opinion, or determine current precedential
 * force. Those classifications must already be source-grounded.
 */
export function validateCAPrecedent(
  precedent: CAPrecedent,
  context: CAPrecedentValidationContext,
): CAPrecedentValidationResult {
  const issues: CAPrecedentValidationIssue[] = [];

  if (
    !hasText(precedent.id) ||
    !hasText(precedent.caseName) ||
    !hasText(precedent.court) ||
    !hasText(precedent.citation) ||
    !hasText(precedent.questionPresented) ||
    !hasText(precedent.derivationId) ||
    !hasText(precedent.auditRef)
  ) {
    issues.push(issue(
      "CA_PRECEDENT_REQUIRED_FIELD_MISSING",
      precedent.id,
      "Precedent requires id, caseName, court, citation, questionPresented, derivationId, and auditRef.",
    ));
  }

  const authority = context.authorities.get(precedent.authorityId);
  if (!authority) {
    issues.push(issue(
      "CA_PRECEDENT_AUTHORITY_MISSING",
      precedent.id,
      `Missing authority ${precedent.authorityId}.`,
    ));
  } else if (!isJudicialAuthority(authority)) {
    issues.push(issue(
      "CA_PRECEDENT_AUTHORITY_NOT_JUDICIAL",
      precedent.id,
      `Authority ${authority.id} is ${authority.authorityType}, not a judicial precedent authority.`,
    ));
  }

  if (!hasText(precedent.holding)) {
    issues.push(issue(
      "CA_PRECEDENT_HOLDING_MISSING",
      precedent.id,
      "A precedent record requires a separately addressable holding.",
    ));
  }

  if (!hasText(precedent.rationale)) {
    issues.push(issue(
      "CA_PRECEDENT_RATIONALE_MISSING",
      precedent.id,
      "Rationale must be represented separately from holding.",
    ));
  }

  if (!hasText(precedent.scope)) {
    issues.push(issue(
      "CA_PRECEDENT_SCOPE_MISSING",
      precedent.id,
      "Precedent requires an explicit scope for proposition-specific use.",
    ));
  }

  if (precedent.sourceRefs.length === 0 || precedent.sourceRefs.some((ref) => !hasText(ref))) {
    issues.push(issue(
      "CA_PRECEDENT_SOURCE_MISSING",
      precedent.id,
      "Precedent requires at least one non-empty source reference.",
    ));
  }

  if (precedent.supportedClaimIds.length === 0) {
    issues.push(issue(
      "CA_PRECEDENT_PROPOSITION_MISSING",
      precedent.id,
      "Precedent must identify at least one CA claim for which it is cited.",
    ));
  }

  for (const claimId of precedent.supportedClaimIds) {
    if (!context.claims.has(claimId)) {
      issues.push(issue(
        "CA_PRECEDENT_CLAIM_MISSING",
        precedent.id,
        `Missing supported claim ${claimId}.`,
      ));
    }
  }

  const referenceGroups = [
    precedent.relevantFactIds,
    precedent.laterTreatmentAuthorityIds,
    precedent.supportedClaimIds,
    precedent.sourceRefs,
  ];
  if (referenceGroups.some(hasDuplicates)) {
    issues.push(issue(
      "CA_PRECEDENT_DUPLICATE_REFERENCE",
      precedent.id,
      "Precedent reference arrays must not contain duplicate identifiers.",
    ));
  }

  if (precedent.laterTreatmentAuthorityIds.includes(precedent.authorityId)) {
    issues.push(issue(
      "CA_PRECEDENT_SELF_TREATMENT",
      precedent.id,
      "A precedent's later-treatment references must not point to its own authority record.",
    ));
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Produces one proposition-specific view per supported claim. This preserves
 * the rule that a precedent is used for a proposition rather than treated as a
 * global vote for a constitutional result.
 */
export function getCAPropositionSpecificPrecedentUses(
  precedent: CAPrecedent,
  context: CAPrecedentValidationContext,
): readonly CAPropositionSpecificPrecedentUse[] {
  const validation = validateCAPrecedent(precedent, context);
  if (!validation.valid) return [];

  return precedent.supportedClaimIds.map((claimId) => ({
    precedentId: precedent.id,
    claimId,
    authorityId: precedent.authorityId,
    holding: precedent.holding,
    rationale: precedent.rationale,
    scope: precedent.scope,
    sourceRefs: precedent.sourceRefs,
  }));
}

/**
 * Later treatment is represented as lineage only. The presence of a later
 * authority does not by itself mean the earlier precedent was overruled,
 * limited, distinguished, or superseded.
 */
export function hasCALaterTreatment(
  precedent: CAPrecedent,
): boolean {
  return precedent.laterTreatmentAuthorityIds.length > 0;
}

export const CA_PRECEDENT_RULES = {
  CA_103:
    "Precedential force is a legal authority classification, not an evidence weight or citation count.",
  CA_104:
    "The authority classification applicable to a precedent remains explicit rather than being inferred from the existence of a citation.",
  CA_106:
    "Holding, rationale, facts, scope, and later treatment remain separately addressable.",
  CA_107:
    "Later and adverse authority remains represented in lineage even when an analysis adopts the precedent.",
  CA_109:
    "A precedent supports only the constitutional proposition and scope for which the analysis establishes its applicability.",
} as const;
