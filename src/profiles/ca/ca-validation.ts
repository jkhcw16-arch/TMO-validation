import type {
  CAApplication,
  CAAuthority,
  CAConclusion,
  CAConstitutionalProvision,
  CAJusticiabilityFinding,
  CAPrecedent,
  CAResource,
} from "./ca-types.js";

export type CAValidationCode =
  | "CA_REQUIRED_FIELD_MISSING"
  | "CA_TEXT_INTERPRETATION_COLLAPSE"
  | "CA_FACT_TO_LAW_SHORTCUT"
  | "CA_AUTHORITY_STATUS_UNGROUNDED"
  | "CA_BINDING_STATUS_COLLAPSE"
  | "CA_JUSTICIABILITY_MERITS_COLLAPSE"
  | "CA_PRECEDENT_HOLDING_MISSING"
  | "CA_PRECEDENT_PROPOSITION_MISSING"
  | "CA_ADVERSE_AUTHORITY_OMITTED"
  | "CA_DOCTRINE_STRUCTURE_MISSING"
  | "CA_CONCLUSION_SUPPORT_EXCEEDS_INPUT"
  | "CA_SCORE_ONLY_CONCLUSION"
  | "CA_REFERENCE_MISSING"
  | "CA_TYPE_MISMATCH";

export interface CAValidationIssue {
  readonly code: CAValidationCode;
  readonly resourceId: string;
  readonly detail: string;
}

export interface CAValidationResult {
  readonly valid: boolean;
  readonly issues: readonly CAValidationIssue[];
}

export interface CAValidationContext {
  readonly resources: ReadonlyMap<string, CAResource>;
  readonly leResourceIds: ReadonlySet<string>;
}

const hasText = (value: string | null | undefined): value is string =>
  typeof value === "string" && value.trim().length > 0;

const issue = (
  code: CAValidationCode,
  resourceId: string,
  detail: string,
): CAValidationIssue => ({ code, resourceId, detail });

function requireCAReference(
  owner: CAResource,
  id: string,
  expectedType: CAResource["type"] | readonly CAResource["type"][],
  context: CAValidationContext,
  issues: CAValidationIssue[],
): void {
  const resource = context.resources.get(id);
  if (!resource) {
    issues.push(issue("CA_REFERENCE_MISSING", owner.id, `Missing CA reference ${id}.`));
    return;
  }
  const allowed = Array.isArray(expectedType) ? expectedType : [expectedType];
  if (!(allowed as readonly string[]).includes(resource.type)) {
    issues.push(issue("CA_TYPE_MISMATCH", owner.id, `${id} is ${resource.type}; expected ${allowed.join(" or ")}.`));
  }
}

function requireLEReference(
  owner: CAResource,
  id: string,
  context: CAValidationContext,
  issues: CAValidationIssue[],
): void {
  if (!context.leResourceIds.has(id)) {
    issues.push(issue("CA_REFERENCE_MISSING", owner.id, `Missing qualified LE reference ${id}.`));
  }
}

function validateBase(resource: CAResource, issues: CAValidationIssue[]): void {
  if (!hasText(resource.id)) {
    issues.push(issue("CA_REQUIRED_FIELD_MISSING", resource.id, "id is required."));
  }
  if (!hasText(resource.derivationId)) {
    issues.push(issue("CA_REQUIRED_FIELD_MISSING", resource.id, "derivationId is required."));
  }
  if (!hasText(resource.auditRef)) {
    issues.push(issue("CA_REQUIRED_FIELD_MISSING", resource.id, "auditRef is required."));
  }
}

function validateProvision(
  resource: CAConstitutionalProvision,
  issues: CAValidationIssue[],
): void {
  if (!hasText(resource.sourceRef)) {
    issues.push(issue("CA_REQUIRED_FIELD_MISSING", resource.id, "Constitutional text requires a sourceRef."));
  }
  if (![resource.article, resource.amendment].some(hasText)) {
    issues.push(issue("CA_REQUIRED_FIELD_MISSING", resource.id, "A provision requires an article or amendment locator."));
  }
}

function validateAuthority(resource: CAAuthority, issues: CAValidationIssue[]): void {
  if (!hasText(resource.citation) || !hasText(resource.sourceRef) || !hasText(resource.jurisdiction)) {
    issues.push(issue("CA_AUTHORITY_STATUS_UNGROUNDED", resource.id, "Authority classification requires citation, sourceRef, and jurisdiction."));
  }
  if (
    resource.currentStatus === "CONTROLLING" &&
    resource.bindingStatus !== "BINDING"
  ) {
    issues.push(issue("CA_BINDING_STATUS_COLLAPSE", resource.id, "CONTROLLING authority must not be represented as persuasive, nonbinding, or indeterminate."));
  }
}

function validatePrecedent(
  resource: CAPrecedent,
  context: CAValidationContext,
  issues: CAValidationIssue[],
): void {
  requireCAReference(resource, resource.authorityId, "CAAuthority", context, issues);
  if (!hasText(resource.holding)) {
    issues.push(issue("CA_PRECEDENT_HOLDING_MISSING", resource.id, "Precedent requires a separately addressable holding."));
  }
  if (!hasText(resource.rationale)) {
    issues.push(issue("CA_REQUIRED_FIELD_MISSING", resource.id, "Precedent requires rationale separate from holding."));
  }
  if (resource.supportedClaimIds.length === 0) {
    issues.push(issue("CA_PRECEDENT_PROPOSITION_MISSING", resource.id, "Precedent must identify the CA claim(s) for which it is used."));
  }
  for (const claimId of resource.supportedClaimIds) {
    requireCAReference(resource, claimId, "CAClaim", context, issues);
  }
}

function validateJusticiability(
  resource: CAJusticiabilityFinding,
  context: CAValidationContext,
  issues: CAValidationIssue[],
): void {
  requireCAReference(resource, resource.issueId, "CAIssue", context, issues);
  if (resource.dimensions.length === 0) {
    issues.push(issue("CA_REQUIRED_FIELD_MISSING", resource.id, "Justiciability requires at least one separately evaluated dimension."));
  }
  const dimensions = resource.dimensions.map((value) => value.dimension);
  if (new Set(dimensions).size !== dimensions.length) {
    issues.push(issue("CA_JUSTICIABILITY_MERITS_COLLAPSE", resource.id, "A justiciability dimension may appear only once in a finding."));
  }
}

function validateApplication(
  resource: CAApplication,
  context: CAValidationContext,
  issues: CAValidationIssue[],
): void {
  requireCAReference(resource, resource.issueId, "CAIssue", context, issues);
  requireCAReference(resource, resource.doctrineId, "CADoctrine", context, issues);
  if (resource.standardOfReviewId) {
    requireCAReference(resource, resource.standardOfReviewId, "CAStandardOfReview", context, issues);
  }
  if (resource.propositionIds.length === 0) {
    issues.push(issue("CA_FACT_TO_LAW_SHORTCUT", resource.id, "Application requires explicit proposition/factual predicates."));
  }
  if (resource.epistemicAssessmentIds.length === 0) {
    issues.push(issue("CA_FACT_TO_LAW_SHORTCUT", resource.id, "Application requires qualified LE epistemic predicates rather than an unsupported factual assumption."));
  }
  if (resource.authorityIds.length === 0) {
    issues.push(issue("CA_FACT_TO_LAW_SHORTCUT", resource.id, "Application requires legal authority in addition to factual support."));
  }
  for (const id of resource.epistemicAssessmentIds) requireLEReference(resource, id, context, issues);
  for (const id of resource.factQualificationIds) requireLEReference(resource, id, context, issues);
  for (const id of resource.authorityIds) requireCAReference(resource, id, ["CAAuthority", "CAPrecedent"], context, issues);
}

function validateConclusion(
  resource: CAConclusion,
  context: CAValidationContext,
  issues: CAValidationIssue[],
): void {
  requireCAReference(resource, resource.issueId, "CAIssue", context, issues);

  if (resource.direction !== "NO_MERITS_DETERMINATION" && resource.applicationIds.length === 0) {
    issues.push(issue("CA_SCORE_ONLY_CONCLUSION", resource.id, "A merits direction requires at least one CAApplication; an LE score alone is insufficient."));
  }
  for (const id of resource.applicationIds) {
    requireCAReference(resource, id, "CAApplication", context, issues);
  }

  const authorityIds = [
    ...resource.controllingAuthorityIds,
    ...resource.supportingAuthorityIds,
    ...resource.adverseAuthorityIds,
  ];
  if (resource.direction !== "NO_MERITS_DETERMINATION" && authorityIds.length === 0) {
    issues.push(issue("CA_CONCLUSION_SUPPORT_EXCEEDS_INPUT", resource.id, "A merits conclusion requires identified legal authority."));
  }
  for (const id of authorityIds) {
    requireCAReference(resource, id, ["CAAuthority", "CAPrecedent"], context, issues);
  }

  if (resource.status === "CONTESTED" && resource.adverseAuthorityIds.length === 0) {
    issues.push(issue("CA_ADVERSE_AUTHORITY_OMITTED", resource.id, "A CONTESTED conclusion requires identified adverse authority."));
  }

  if (resource.direction === "NO_MERITS_DETERMINATION" && resource.status === "SUPPORTED") {
    issues.push(issue("CA_JUSTICIABILITY_MERITS_COLLAPSE", resource.id, "NO_MERITS_DETERMINATION must not be represented as a supported merits conclusion."));
  }
}

export function validateCAResource(
  resource: CAResource,
  context: CAValidationContext,
): CAValidationResult {
  const issues: CAValidationIssue[] = [];
  validateBase(resource, issues);

  switch (resource.type) {
    case "CAIssue":
      if (!hasText(resource.question) || resource.provisionIds.length === 0) {
        issues.push(issue("CA_REQUIRED_FIELD_MISSING", resource.id, "Issue requires a question and at least one constitutional provision."));
      }
      for (const id of resource.provisionIds) requireCAReference(resource, id, "CAConstitutionalProvision", context, issues);
      for (const id of resource.claimIds) requireCAReference(resource, id, "CAClaim", context, issues);
      break;

    case "CAConstitutionalProvision":
      validateProvision(resource, issues);
      break;

    case "CAClaim":
      if (!hasText(resource.proposition)) {
        issues.push(issue("CA_REQUIRED_FIELD_MISSING", resource.id, "Claim proposition is required."));
      }
      requireCAReference(resource, resource.issueId, "CAIssue", context, issues);
      break;

    case "CAAuthority":
      validateAuthority(resource, issues);
      break;

    case "CAPrecedent":
      validatePrecedent(resource, context, issues);
      break;

    case "CADoctrine":
      if (!hasText(resource.name) || resource.authorityIds.length === 0 || (resource.elementIds.length === 0 && resource.exceptionIds.length === 0)) {
        issues.push(issue("CA_DOCTRINE_STRUCTURE_MISSING", resource.id, "Doctrine requires a name, authority, and separately represented elements or exceptions."));
      }
      break;

    case "CAStandardOfReview":
      if (!hasText(resource.name) || resource.authorityIds.length === 0 || resource.requirementIds.length === 0) {
        issues.push(issue("CA_REQUIRED_FIELD_MISSING", resource.id, "Standard of review requires name, authority, and requirements."));
      }
      break;

    case "CAJusticiabilityFinding":
      validateJusticiability(resource, context, issues);
      break;

    case "CAApplication":
      validateApplication(resource, context, issues);
      break;

    case "CACounterargument":
      if (!hasText(resource.proposition) || resource.authorityIds.length === 0) {
        issues.push(issue("CA_ADVERSE_AUTHORITY_OMITTED", resource.id, "Counterargument requires an explicit proposition and authority."));
      }
      break;

    case "CARemedy":
      if (!hasText(resource.description) || resource.authorityIds.length === 0) {
        issues.push(issue("CA_REQUIRED_FIELD_MISSING", resource.id, "Remedy requires description and legal authority."));
      }
      break;

    case "CAConclusion":
      validateConclusion(resource, context, issues);
      break;
  }

  return { valid: issues.length === 0, issues };
}

export function validateCAAnalysis(
  resources: readonly CAResource[],
  leResourceIds: ReadonlySet<string> = new Set<string>(),
): CAValidationResult {
  const issues: CAValidationIssue[] = [];
  const map = new Map<string, CAResource>();

  for (const resource of resources) {
    if (map.has(resource.id)) {
      issues.push(issue("CA_TYPE_MISMATCH", resource.id, "Duplicate CA resource id."));
    } else {
      map.set(resource.id, resource);
    }
  }

  const context: CAValidationContext = { resources: map, leResourceIds };
  for (const resource of resources) {
    issues.push(...validateCAResource(resource, context).issues);
  }

  return { valid: issues.length === 0, issues };
}

export const CA_VALIDATION_RULE =
  "Constitutional conclusions require explicit legal authority and CA application to qualified factual predicates; justiciability, factual support, authority status, and numeric evidence scores cannot substitute for merits analysis." as const;
