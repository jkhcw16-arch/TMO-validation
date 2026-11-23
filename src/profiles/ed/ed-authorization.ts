import type {
  EDAuditRef,
  EDDateTime,
  EDDerivationId,
  EDMatter,
  EDResource,
  EDResourceId,
} from "./ed-types.js";

/**
 * TMO-ED authorization model.
 *
 * Authorization here is an operational/governance record for an ED action.
 * It does not establish possession, custody, control, discoverability,
 * proportionality, privilege, admissibility, or legal merits.
 */

export type EDAuthorizationAction =
  | "IDENTIFY"
  | "PRESERVE"
  | "COLLECT"
  | "PROCESS"
  | "REVIEW"
  | "REDACT"
  | "PRODUCE"
  | "WITHHOLD"
  | "EXPORT"
  | "TRANSFER"
  | "RETAIN"
  | "DELETE"
  | "RETURN"
  | "ARCHIVE"
  | "RELEASE_HOLD";

export type EDAuthorizationStatus =
  | "AUTHORIZED"
  | "AUTHORIZED_WITH_LIMITATIONS"
  | "NOT_AUTHORIZED"
  | "EXPIRED"
  | "REVOKED"
  | "INDETERMINATE";

export type EDAuthorizationBasisType =
  | "COURT_ORDER"
  | "DISCOVERY_REQUEST"
  | "PARTY_AGREEMENT"
  | "LEGAL_HOLD"
  | "ORGANIZATIONAL_POLICY"
  | "OWNER_OR_CUSTODIAN_CONSENT"
  | "STATUTORY_OR_REGULATORY"
  | "CONTRACTUAL"
  | "OTHER";

export interface EDAuthorizationBasis {
  readonly basisType: EDAuthorizationBasisType;
  readonly authorityRef: string;
  readonly sourceRefs: readonly string[];
}

export interface EDAuthorizationScope {
  readonly matterId: EDResourceId;
  readonly actions: readonly EDAuthorizationAction[];
  readonly resourceIds: readonly EDResourceId[];
  readonly dataSourceIds: readonly EDResourceId[];
  readonly custodianIds: readonly EDResourceId[];
  readonly limitationRefs: readonly string[];
  readonly effectiveFrom: EDDateTime | null;
  readonly effectiveUntil: EDDateTime | null;
}

export interface EDAuthorizationRecord {
  readonly id: string;
  readonly type: "EDAuthorizationRecord";
  readonly matterId: EDResourceId;
  readonly subjectActorRef: string;
  readonly grantedByRef: string;
  readonly status: EDAuthorizationStatus;
  readonly scope: EDAuthorizationScope;
  readonly bases: readonly EDAuthorizationBasis[];
  readonly issuedAt: EDDateTime;
  readonly revokedAt: EDDateTime | null;
  readonly derivationId: EDDerivationId;
  readonly auditRef: EDAuditRef;
}

export interface EDAuthorizationRequest {
  readonly actorRef: string;
  readonly action: EDAuthorizationAction;
  readonly matterId: EDResourceId;
  readonly resourceId: EDResourceId | null;
  readonly dataSourceId: EDResourceId | null;
  readonly custodianId: EDResourceId | null;
  readonly at: EDDateTime;
}

export type EDAuthorizationDecisionStatus =
  | "AUTHORIZED"
  | "DENIED"
  | "INDETERMINATE";

export type EDAuthorizationReason =
  | "MATCHED_ACTIVE_AUTHORIZATION"
  | "MATCHED_LIMITED_AUTHORIZATION"
  | "MATCHED_DENIAL"
  | "AUTHORIZATION_EXPIRED"
  | "AUTHORIZATION_REVOKED"
  | "ACTION_OUT_OF_SCOPE"
  | "RESOURCE_OUT_OF_SCOPE"
  | "SOURCE_OUT_OF_SCOPE"
  | "CUSTODIAN_OUT_OF_SCOPE"
  | "ACTOR_MISMATCH"
  | "MATTER_MISMATCH"
  | "NO_APPLICABLE_AUTHORIZATION"
  | "AUTHORIZATION_RECORD_INVALID";

export interface EDAuthorizationDecision {
  readonly status: EDAuthorizationDecisionStatus;
  readonly authorizationId: string | null;
  readonly reasons: readonly EDAuthorizationReason[];
  readonly limitations: readonly string[];
}

export interface EDAuthorizationValidationIssue {
  readonly code:
    | "ED_AUTH_SCHEMA"
    | "ED_AUTH_REFERENCE_MISSING"
    | "ED_AUTH_REFERENCE_TYPE"
    | "ED_AUTH_SCOPE"
    | "ED_AUTH_TIME"
    | "ED_AUTH_BASIS"
    | "ED_AUTH_REVOCATION";
  readonly authorizationId: string;
  readonly message: string;
}

export interface EDAuthorizationValidationResult {
  readonly valid: boolean;
  readonly issues: readonly EDAuthorizationValidationIssue[];
}

export const ED_AUTHORIZATION_INVARIANTS = {
  "ED-AUTH-101": "Authorization is action-specific and scope-specific; actor identity alone does not authorize an ED action.",
  "ED-AUTH-102": "Authorization requires an addressable basis and source reference; an asserted role or title is insufficient by itself.",
  "ED-AUTH-103": "Authorization does not establish possession, custody, control, discoverability, proportionality, privilege, admissibility, or legal merits.",
  "ED-AUTH-104": "A narrower authorization cannot be silently broadened to additional actions, sources, resources, custodians, matters, or time periods.",
  "ED-AUTH-105": "Expired or revoked authorization remains preserved in history but cannot authorize a later action.",
  "ED-AUTH-106": "Unknown authorization remains INDETERMINATE and cannot be converted to authorized by default.",
} as const;

const hasText = (value: string): boolean => value.trim().length > 0;
const unique = (values: readonly string[]): boolean => new Set(values).size === values.length;

function parsedTime(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validationIssue(
  authorization: EDAuthorizationRecord,
  code: EDAuthorizationValidationIssue["code"],
  message: string,
): EDAuthorizationValidationIssue {
  return { code, authorizationId: authorization.id, message };
}

export function validateEDAuthorizationRecord(
  authorization: EDAuthorizationRecord,
  resources: readonly EDResource[],
): EDAuthorizationValidationResult {
  const issues: EDAuthorizationValidationIssue[] = [];
  const byId = new Map(resources.map((resource) => [resource.id, resource]));

  if (
    !hasText(authorization.id) ||
    !hasText(authorization.subjectActorRef) ||
    !hasText(authorization.grantedByRef) ||
    !hasText(authorization.derivationId) ||
    !hasText(authorization.auditRef)
  ) {
    issues.push(validationIssue(authorization, "ED_AUTH_SCHEMA", "Authorization identity, actors, derivation, and audit references are required."));
  }

  const matter = byId.get(authorization.matterId);
  if (!matter) {
    issues.push(validationIssue(authorization, "ED_AUTH_REFERENCE_MISSING", "Authorization matter does not resolve."));
  } else if (matter.type !== "EDMatter") {
    issues.push(validationIssue(authorization, "ED_AUTH_REFERENCE_TYPE", "Authorization matterId must reference EDMatter."));
  }

  if (authorization.scope.matterId !== authorization.matterId) {
    issues.push(validationIssue(authorization, "ED_AUTH_SCOPE", "Authorization record and scope must address the same matter."));
  }

  if (
    authorization.scope.actions.length === 0 ||
    !unique(authorization.scope.actions) ||
    !unique(authorization.scope.resourceIds) ||
    !unique(authorization.scope.dataSourceIds) ||
    !unique(authorization.scope.custodianIds)
  ) {
    issues.push(validationIssue(authorization, "ED_AUTH_SCOPE", "Authorization requires at least one unique action and unique scoped references."));
  }

  for (const id of authorization.scope.resourceIds) {
    const resource = byId.get(id);
    if (!resource) {
      issues.push(validationIssue(authorization, "ED_AUTH_REFERENCE_MISSING", `Scoped resource does not resolve: ${id}.`));
    } else if ("matterId" in resource && resource.matterId !== authorization.matterId) {
      issues.push(validationIssue(authorization, "ED_AUTH_SCOPE", `Scoped resource belongs to another matter: ${id}.`));
    }
  }

  for (const id of authorization.scope.dataSourceIds) {
    const resource = byId.get(id);
    if (!resource) {
      issues.push(validationIssue(authorization, "ED_AUTH_REFERENCE_MISSING", `Scoped data source does not resolve: ${id}.`));
    } else if (resource.type !== "EDDataSource") {
      issues.push(validationIssue(authorization, "ED_AUTH_REFERENCE_TYPE", `Scoped data source must be EDDataSource: ${id}.`));
    }
  }

  for (const id of authorization.scope.custodianIds) {
    const resource = byId.get(id);
    if (!resource) {
      issues.push(validationIssue(authorization, "ED_AUTH_REFERENCE_MISSING", `Scoped custodian does not resolve: ${id}.`));
    } else if (resource.type !== "EDCustodian") {
      issues.push(validationIssue(authorization, "ED_AUTH_REFERENCE_TYPE", `Scoped custodian must be EDCustodian: ${id}.`));
    }
  }

  if (
    authorization.bases.length === 0 ||
    authorization.bases.some((basis) => !hasText(basis.authorityRef) || basis.sourceRefs.length === 0)
  ) {
    issues.push(validationIssue(authorization, "ED_AUTH_BASIS", "Authorization requires at least one addressable basis with supporting source references."));
  }

  const issued = parsedTime(authorization.issuedAt);
  const from = parsedTime(authorization.scope.effectiveFrom);
  const until = parsedTime(authorization.scope.effectiveUntil);
  const revoked = parsedTime(authorization.revokedAt);

  if (issued === null) {
    issues.push(validationIssue(authorization, "ED_AUTH_TIME", "issuedAt must be a valid timestamp."));
  }
  if (authorization.scope.effectiveFrom !== null && from === null) {
    issues.push(validationIssue(authorization, "ED_AUTH_TIME", "effectiveFrom must be a valid timestamp or null."));
  }
  if (authorization.scope.effectiveUntil !== null && until === null) {
    issues.push(validationIssue(authorization, "ED_AUTH_TIME", "effectiveUntil must be a valid timestamp or null."));
  }
  if (from !== null && until !== null && from > until) {
    issues.push(validationIssue(authorization, "ED_AUTH_TIME", "effectiveFrom cannot be after effectiveUntil."));
  }
  if (authorization.status === "REVOKED" && authorization.revokedAt === null) {
    issues.push(validationIssue(authorization, "ED_AUTH_REVOCATION", "REVOKED authorization requires revokedAt."));
  }
  if (authorization.revokedAt !== null && revoked === null) {
    issues.push(validationIssue(authorization, "ED_AUTH_TIME", "revokedAt must be a valid timestamp or null."));
  }

  return { valid: issues.length === 0, issues };
}

function scopeContains(scopeValues: readonly string[], candidate: string | null): boolean {
  if (candidate === null) return true;
  return scopeValues.length === 0 || scopeValues.includes(candidate);
}

function authorizationAppliesInTime(
  authorization: EDAuthorizationRecord,
  at: string,
): EDAuthorizationReason | null {
  const actionTime = parsedTime(at);
  const from = parsedTime(authorization.scope.effectiveFrom);
  const until = parsedTime(authorization.scope.effectiveUntil);
  const revoked = parsedTime(authorization.revokedAt);

  if (actionTime === null) return "AUTHORIZATION_RECORD_INVALID";
  if (revoked !== null && actionTime >= revoked) return "AUTHORIZATION_REVOKED";
  if (until !== null && actionTime > until) return "AUTHORIZATION_EXPIRED";
  if (from !== null && actionTime < from) return "NO_APPLICABLE_AUTHORIZATION";
  return null;
}

export function evaluateEDAuthorization(
  request: EDAuthorizationRequest,
  authorizations: readonly EDAuthorizationRecord[],
  resources: readonly EDResource[],
): EDAuthorizationDecision {
  const candidates = authorizations.filter((authorization) =>
    authorization.matterId === request.matterId &&
    authorization.subjectActorRef === request.actorRef,
  );

  if (candidates.length === 0) {
    return {
      status: "INDETERMINATE",
      authorizationId: null,
      reasons: ["NO_APPLICABLE_AUTHORIZATION"],
      limitations: [],
    };
  }

  const denialReasons: EDAuthorizationReason[] = [];
  let unresolved = false;

  for (const authorization of candidates) {
    const validation = validateEDAuthorizationRecord(authorization, resources);
    if (!validation.valid) {
      unresolved = true;
      continue;
    }

    if (authorization.status === "INDETERMINATE") {
      unresolved = true;
      continue;
    }
    if (authorization.status === "NOT_AUTHORIZED") {
      denialReasons.push("MATCHED_DENIAL");
      continue;
    }
    if (authorization.status === "REVOKED") {
      denialReasons.push("AUTHORIZATION_REVOKED");
      continue;
    }
    if (authorization.status === "EXPIRED") {
      denialReasons.push("AUTHORIZATION_EXPIRED");
      continue;
    }

    if (!authorization.scope.actions.includes(request.action)) {
      denialReasons.push("ACTION_OUT_OF_SCOPE");
      continue;
    }
    if (!scopeContains(authorization.scope.resourceIds, request.resourceId)) {
      denialReasons.push("RESOURCE_OUT_OF_SCOPE");
      continue;
    }
    if (!scopeContains(authorization.scope.dataSourceIds, request.dataSourceId)) {
      denialReasons.push("SOURCE_OUT_OF_SCOPE");
      continue;
    }
    if (!scopeContains(authorization.scope.custodianIds, request.custodianId)) {
      denialReasons.push("CUSTODIAN_OUT_OF_SCOPE");
      continue;
    }

    const timeReason = authorizationAppliesInTime(authorization, request.at);
    if (timeReason) {
      denialReasons.push(timeReason);
      continue;
    }

    return {
      status: "AUTHORIZED",
      authorizationId: authorization.id,
      reasons: [
        authorization.status === "AUTHORIZED_WITH_LIMITATIONS"
          ? "MATCHED_LIMITED_AUTHORIZATION"
          : "MATCHED_ACTIVE_AUTHORIZATION",
      ],
      limitations: [...authorization.scope.limitationRefs],
    };
  }

  if (denialReasons.includes("MATCHED_DENIAL")) {
    return {
      status: "DENIED",
      authorizationId: null,
      reasons: [...new Set(denialReasons)],
      limitations: [],
    };
  }

  return {
    status: unresolved ? "INDETERMINATE" : "DENIED",
    authorizationId: null,
    reasons: unresolved
      ? ["AUTHORIZATION_RECORD_INVALID"]
      : [...new Set(denialReasons.length > 0 ? denialReasons : ["NO_APPLICABLE_AUTHORIZATION"] as const)],
    limitations: [],
  };
}

export function authorizationRequiredForResource(
  resource: EDResource,
): readonly EDAuthorizationAction[] {
  switch (resource.type) {
    case "EDPreservationAction": return ["PRESERVE"];
    case "EDCollection": return ["COLLECT"];
    case "EDProcessingEvent": return ["PROCESS"];
    case "EDReviewDecision": return ["REVIEW"];
    case "EDRedaction": return ["REDACT"];
    case "EDProduction":
    case "EDProductionItem":
    case "EDProductionManifest": return ["PRODUCE"];
    case "EDDisposition": {
      switch (resource.action) {
        case "RETAIN": return ["RETAIN"];
        case "DELETE": return ["DELETE"];
        case "RETURN": return ["RETURN"];
        case "TRANSFER": return ["TRANSFER"];
        case "ARCHIVE": return ["ARCHIVE"];
        case "RELEASE_HOLD": return ["RELEASE_HOLD"];
        case "NO_ACTION": return [];
      }
    }
    default: return [];
  }
}
