import type {
  CAAuthority,
  CAConstitutionalProvision,
  CADoctrine,
  CAPrecedent,
} from "./ca-types.js";

/** TMO-CA doctrine structure, element/exception evaluation, and validation. */

export type CADoctrineComponentKind = "ELEMENT" | "EXCEPTION";

export type CADoctrineComponentStatus =
  | "SATISFIED"
  | "PARTIALLY_SATISFIED"
  | "NOT_SATISFIED"
  | "INDETERMINATE";

export interface CADoctrineComponent {
  readonly id: string;
  readonly doctrineId: string;
  readonly kind: CADoctrineComponentKind;
  readonly name: string;
  readonly description: string;
  readonly authorityIds: readonly string[];
  readonly precedentIds: readonly string[];
  readonly derivationId: string;
  readonly auditRef: string;
}

export interface CADoctrineComponentFinding {
  readonly componentId: string;
  readonly status: CADoctrineComponentStatus;
  readonly factualPredicateIds: readonly string[];
  readonly authorityIds: readonly string[];
  readonly derivationId: string;
  readonly auditRef: string;
}

export type CADoctrineEvaluationStatus =
  | "SATISFIED"
  | "PARTIALLY_SATISFIED"
  | "NOT_SATISFIED"
  | "INDETERMINATE";

export interface CADoctrineEvaluation {
  readonly doctrineId: string;
  readonly status: CADoctrineEvaluationStatus;
  readonly elementFindings: readonly CADoctrineComponentFinding[];
  readonly exceptionFindings: readonly CADoctrineComponentFinding[];
}

export interface CADoctrineValidationContext {
  readonly provisions: ReadonlyMap<string, CAConstitutionalProvision>;
  readonly authorities: ReadonlyMap<string, CAAuthority>;
  readonly precedents: ReadonlyMap<string, CAPrecedent>;
  readonly components: ReadonlyMap<string, CADoctrineComponent>;
}

export type CADoctrineValidationCode =
  | "CA_DOCTRINE_REQUIRED_FIELD_MISSING"
  | "CA_DOCTRINE_PROVISION_MISSING"
  | "CA_DOCTRINE_AUTHORITY_MISSING"
  | "CA_DOCTRINE_COMPONENT_MISSING"
  | "CA_DOCTRINE_COMPONENT_TYPE_MISMATCH"
  | "CA_DOCTRINE_COMPONENT_AUTHORITY_MISSING"
  | "CA_DOCTRINE_COMPONENT_PRECEDENT_MISSING"
  | "CA_DOCTRINE_DUPLICATE_REFERENCE"
  | "CA_DOCTRINE_ELEMENT_EXCEPTION_COLLISION"
  | "CA_DOCTRINE_FINDING_MISSING"
  | "CA_DOCTRINE_UNKNOWN_FINDING"
  | "CA_DOCTRINE_DUPLICATE_FINDING";

export interface CADoctrineValidationIssue {
  readonly code: CADoctrineValidationCode;
  readonly doctrineId: string;
  readonly detail: string;
}

export interface CADoctrineValidationResult {
  readonly valid: boolean;
  readonly issues: readonly CADoctrineValidationIssue[];
}

const hasText = (value: string): boolean => value.trim().length > 0;
const duplicates = (values: readonly string[]): boolean =>
  new Set(values).size !== values.length;
const makeIssue = (
  code: CADoctrineValidationCode,
  doctrineId: string,
  detail: string,
): CADoctrineValidationIssue => ({ code, doctrineId, detail });

export function validateCADoctrine(
  doctrine: CADoctrine,
  context: CADoctrineValidationContext,
): CADoctrineValidationResult {
  const issues: CADoctrineValidationIssue[] = [];

  if (
    !hasText(doctrine.id) ||
    !hasText(doctrine.name) ||
    !hasText(doctrine.derivationId) ||
    !hasText(doctrine.auditRef)
  ) {
    issues.push(makeIssue(
      "CA_DOCTRINE_REQUIRED_FIELD_MISSING",
      doctrine.id,
      "Doctrine requires id, name, derivationId, and auditRef.",
    ));
  }

  if (doctrine.provisionIds.length === 0) {
    issues.push(makeIssue(
      "CA_DOCTRINE_PROVISION_MISSING",
      doctrine.id,
      "Doctrine requires at least one constitutional provision.",
    ));
  }
  for (const id of doctrine.provisionIds) {
    if (!context.provisions.has(id)) {
      issues.push(makeIssue("CA_DOCTRINE_PROVISION_MISSING", doctrine.id, `Missing constitutional provision ${id}.`));
    }
  }

  if (doctrine.authorityIds.length === 0) {
    issues.push(makeIssue(
      "CA_DOCTRINE_AUTHORITY_MISSING",
      doctrine.id,
      "Doctrine requires explicit supporting legal authority.",
    ));
  }
  for (const id of doctrine.authorityIds) {
    if (!context.authorities.has(id) && !context.precedents.has(id)) {
      issues.push(makeIssue("CA_DOCTRINE_AUTHORITY_MISSING", doctrine.id, `Missing authority or precedent ${id}.`));
    }
  }

  if (doctrine.elementIds.length === 0 && doctrine.exceptionIds.length === 0) {
    issues.push(makeIssue(
      "CA_DOCTRINE_COMPONENT_MISSING",
      doctrine.id,
      "Doctrine requires at least one separately represented element or exception.",
    ));
  }

  const intersection = doctrine.elementIds.filter((id) => doctrine.exceptionIds.includes(id));
  if (intersection.length > 0) {
    issues.push(makeIssue(
      "CA_DOCTRINE_ELEMENT_EXCEPTION_COLLISION",
      doctrine.id,
      `Components cannot simultaneously be elements and exceptions: ${intersection.join(", ")}.`,
    ));
  }

  for (const [kind, ids] of [
    ["ELEMENT", doctrine.elementIds],
    ["EXCEPTION", doctrine.exceptionIds],
  ] as const) {
    for (const id of ids) {
      const component = context.components.get(id);
      if (!component) {
        issues.push(makeIssue("CA_DOCTRINE_COMPONENT_MISSING", doctrine.id, `Missing doctrine component ${id}.`));
      } else if (component.doctrineId !== doctrine.id || component.kind !== kind) {
        issues.push(makeIssue(
          "CA_DOCTRINE_COMPONENT_TYPE_MISMATCH",
          doctrine.id,
          `${id} does not match doctrine ${doctrine.id} as ${kind}.`,
        ));
      }
    }
  }

  if (
    duplicates(doctrine.provisionIds) ||
    duplicates(doctrine.authorityIds) ||
    duplicates(doctrine.elementIds) ||
    duplicates(doctrine.exceptionIds)
  ) {
    issues.push(makeIssue(
      "CA_DOCTRINE_DUPLICATE_REFERENCE",
      doctrine.id,
      "Doctrine reference arrays must not contain duplicate identifiers.",
    ));
  }

  return { valid: issues.length === 0, issues };
}

export function validateCADoctrineComponent(
  component: CADoctrineComponent,
  context: CADoctrineValidationContext,
): CADoctrineValidationResult {
  const issues: CADoctrineValidationIssue[] = [];

  if (
    !hasText(component.id) ||
    !hasText(component.doctrineId) ||
    !hasText(component.name) ||
    !hasText(component.description) ||
    !hasText(component.derivationId) ||
    !hasText(component.auditRef)
  ) {
    issues.push(makeIssue(
      "CA_DOCTRINE_REQUIRED_FIELD_MISSING",
      component.doctrineId,
      `Doctrine component ${component.id} has missing required fields.`,
    ));
  }

  if (component.authorityIds.length === 0 && component.precedentIds.length === 0) {
    issues.push(makeIssue(
      "CA_DOCTRINE_COMPONENT_AUTHORITY_MISSING",
      component.doctrineId,
      `Doctrine component ${component.id} requires authority or precedent support.`,
    ));
  }

  for (const id of component.authorityIds) {
    if (!context.authorities.has(id)) {
      issues.push(makeIssue("CA_DOCTRINE_COMPONENT_AUTHORITY_MISSING", component.doctrineId, `Missing component authority ${id}.`));
    }
  }
  for (const id of component.precedentIds) {
    if (!context.precedents.has(id)) {
      issues.push(makeIssue("CA_DOCTRINE_COMPONENT_PRECEDENT_MISSING", component.doctrineId, `Missing component precedent ${id}.`));
    }
  }

  if (duplicates(component.authorityIds) || duplicates(component.precedentIds)) {
    issues.push(makeIssue("CA_DOCTRINE_DUPLICATE_REFERENCE", component.doctrineId, `Doctrine component ${component.id} contains duplicate references.`));
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Evaluates only completeness/status logic after element and exception findings
 * have already been separately derived. It does not infer those findings from
 * evidence or choose the substantive legal test.
 */
export function evaluateCADoctrine(
  doctrine: CADoctrine,
  findings: readonly CADoctrineComponentFinding[],
): CADoctrineEvaluation {
  const byId = new Map(findings.map((finding) => [finding.componentId, finding] as const));
  const elementFindings = doctrine.elementIds.flatMap((id) => {
    const finding = byId.get(id);
    return finding ? [finding] : [];
  });
  const exceptionFindings = doctrine.exceptionIds.flatMap((id) => {
    const finding = byId.get(id);
    return finding ? [finding] : [];
  });

  const missing = [...doctrine.elementIds, ...doctrine.exceptionIds].some((id) => !byId.has(id));
  let status: CADoctrineEvaluationStatus;

  if (missing || findings.some((finding) => finding.status === "INDETERMINATE")) {
    status = "INDETERMINATE";
  } else if (exceptionFindings.some((finding) => finding.status === "SATISFIED")) {
    status = "NOT_SATISFIED";
  } else if (elementFindings.some((finding) => finding.status === "NOT_SATISFIED")) {
    status = "NOT_SATISFIED";
  } else if (
    elementFindings.some((finding) => finding.status === "PARTIALLY_SATISFIED") ||
    exceptionFindings.some((finding) => finding.status === "PARTIALLY_SATISFIED")
  ) {
    status = "PARTIALLY_SATISFIED";
  } else {
    status = "SATISFIED";
  }

  return { doctrineId: doctrine.id, status, elementFindings, exceptionFindings };
}

export const CA_DOCTRINE_RULES = {
  CA_108:
    "Doctrinal elements and exceptions remain separately represented and evaluated; one component cannot silently stand in for another.",
  CA_109:
    "A doctrine-level result cannot outrun the component findings and authorities on which it depends.",
  CA_110:
    "Evidence scores do not satisfy doctrinal elements directly; element findings require an explicit legal application step.",
} as const;
