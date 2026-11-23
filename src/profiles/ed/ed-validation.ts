import type {
  EDCollectedItem,
  EDCollection,
  EDDataSource,
  EDDiscoveryResponse,
  EDDocumentFamily,
  EDMatter,
  EDPreservationAction,
  EDPreservationNotice,
  EDPrivilegeAssessment,
  EDProcessingEvent,
  EDProduction,
  EDProductionItem,
  EDProductionManifest,
  EDRedaction,
  EDResource,
  EDResourceId,
  EDResourceType,
  EDReviewDecision,
  EDScope,
} from "./ed-types.js";

/**
 * TMO-ED validation engine.
 *
 * This validates structural and lineage invariants. It does not determine
 * authenticity, admissibility, evidentiary truth, privilege as a judicial
 * matter, or legal merits.
 */

export type EDValidationStatus = "VALID" | "INVALID" | "INDETERMINATE";

export type EDValidationCode =
  | "ED_SCHEMA"
  | "ED_DUPLICATE_ID"
  | "ED_REFERENCE_MISSING"
  | "ED_REFERENCE_TYPE"
  | "ED_MATTER_MISMATCH"
  | "ED_LINEAGE_MISSING"
  | "ED_TEMPORAL_CONFLICT"
  | "ED_PRESERVATION_UNSUPPORTED"
  | "ED_COLLECTION_UNSUPPORTED"
  | "ED_PROCESSING_LINEAGE"
  | "ED_FAMILY_CONFLICT"
  | "ED_REVIEW_CONFLICT"
  | "ED_PRIVILEGE_CONFLICT"
  | "ED_REDACTION_CONFLICT"
  | "ED_PRODUCTION_CONFLICT"
  | "ED_MANIFEST_CONFLICT"
  | "ED_WITHHOLDING_UNADDRESSED"
  | "ED_INDETERMINATE";

export interface EDValidationIssue {
  readonly code: EDValidationCode;
  readonly resourceId: EDResourceId;
  readonly message: string;
}

export interface EDValidationResult {
  readonly status: EDValidationStatus;
  readonly issues: readonly EDValidationIssue[];
}

export interface EDValidationContext {
  readonly resources: readonly EDResource[];
}

type ResourceIndex = ReadonlyMap<EDResourceId, EDResource>;

const hasText = (value: string): boolean => value.trim().length > 0;
const unique = (values: readonly string[]): boolean => new Set(values).size === values.length;

const parseTime = (value: string | null): number | null => {
  if (value === null) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const issue = (
  code: EDValidationCode,
  resource: Pick<EDResource, "id">,
  message: string,
): EDValidationIssue => ({ code, resourceId: resource.id, message });

const buildIndex = (resources: readonly EDResource[]): Map<EDResourceId, EDResource> => {
  const index = new Map<EDResourceId, EDResource>();
  for (const resource of resources) {
    if (!index.has(resource.id)) index.set(resource.id, resource);
  }
  return index;
};

function getResource<T extends EDResourceType>(
  index: ResourceIndex,
  id: EDResourceId,
  type: T,
): Extract<EDResource, { type: T }> | undefined {
  const resource = index.get(id);
  if (!resource || resource.type !== type) return undefined;
  return resource as Extract<EDResource, { type: T }>;
}

function requireReference<T extends EDResourceType>(
  issues: EDValidationIssue[],
  index: ResourceIndex,
  owner: EDResource,
  id: EDResourceId,
  expectedType: T,
): Extract<EDResource, { type: T }> | undefined;
function requireReference(
  issues: EDValidationIssue[],
  index: ResourceIndex,
  owner: EDResource,
  id: EDResourceId,
): EDResource | undefined;
function requireReference(
  issues: EDValidationIssue[],
  index: ResourceIndex,
  owner: EDResource,
  id: EDResourceId,
  expectedType?: EDResourceType,
): EDResource | undefined {
  const target = index.get(id);
  if (!target) {
    issues.push(issue("ED_REFERENCE_MISSING", owner, `Missing referenced resource: ${id}.`));
    return undefined;
  }
  if (expectedType && target.type !== expectedType) {
    issues.push(issue(
      "ED_REFERENCE_TYPE",
      owner,
      `Reference ${id} must be ${expectedType}, received ${target.type}.`,
    ));
    return undefined;
  }
  return target;
}

function requireSameMatter(
  issues: EDValidationIssue[],
  owner: EDResource & { matterId: EDResourceId },
  target: EDResource,
): void {
  if ("matterId" in target && target.matterId !== owner.matterId) {
    issues.push(issue(
      "ED_MATTER_MISMATCH",
      owner,
      `Referenced resource ${target.id} belongs to a different matter.`,
    ));
  }
}

function validateBase(resource: EDResource): EDValidationIssue[] {
  const issues: EDValidationIssue[] = [];
  if (!hasText(resource.id) || !hasText(resource.derivationId) || !hasText(resource.auditRef)) {
    issues.push(issue(
      "ED_SCHEMA",
      resource,
      "id, derivationId, and auditRef must be non-empty.",
    ));
  }
  return issues;
}

function validateMatter(resource: EDMatter): EDValidationIssue[] {
  const issues = validateBase(resource);
  if (!hasText(resource.name)) {
    issues.push(issue("ED_SCHEMA", resource, "Matter name is required."));
  }
  if (!unique(resource.scopeIds) || !unique(resource.requestIds)) {
    issues.push(issue("ED_SCHEMA", resource, "Matter scope/request references must be unique."));
  }
  return issues;
}

function validateScope(resource: EDScope, index: ResourceIndex): EDValidationIssue[] {
  const issues = validateBase(resource);
  requireReference(issues, index, resource, resource.matterId, "EDMatter");

  if (!hasText(resource.name) || !hasText(resource.description)) {
    issues.push(issue("ED_SCHEMA", resource, "Scope name and description are required."));
  }
  if (!unique(resource.custodianIds) || !unique(resource.dataSourceIds)) {
    issues.push(issue("ED_SCHEMA", resource, "Scope references must be unique."));
  }

  const from = parseTime(resource.dateFrom);
  const to = parseTime(resource.dateTo);
  if (resource.dateFrom !== null && from === null) {
    issues.push(issue("ED_SCHEMA", resource, "dateFrom must be a valid timestamp or null."));
  }
  if (resource.dateTo !== null && to === null) {
    issues.push(issue("ED_SCHEMA", resource, "dateTo must be a valid timestamp or null."));
  }
  if (from !== null && to !== null && from > to) {
    issues.push(issue("ED_TEMPORAL_CONFLICT", resource, "Scope dateFrom cannot be after dateTo."));
  }

  for (const id of resource.custodianIds) {
    const target = requireReference(issues, index, resource, id, "EDCustodian");
    if (target) requireSameMatter(issues, resource, target);
  }
  for (const id of resource.dataSourceIds) {
    const target = requireReference(issues, index, resource, id, "EDDataSource");
    if (target) requireSameMatter(issues, resource, target);
  }
  return issues;
}

function validateDataSource(resource: EDDataSource, index: ResourceIndex): EDValidationIssue[] {
  const issues = validateBase(resource);
  requireReference(issues, index, resource, resource.matterId, "EDMatter");
  if (!hasText(resource.systemName) || !hasText(resource.locationRef)) {
    issues.push(issue("ED_SCHEMA", resource, "Data source systemName and locationRef are required."));
  }
  if (!unique(resource.custodianIds) || !unique(resource.preservationActionIds) || !unique(resource.collectionIds)) {
    issues.push(issue("ED_SCHEMA", resource, "Data source references must be unique."));
  }

  for (const id of resource.custodianIds) requireReference(issues, index, resource, id, "EDCustodian");
  for (const id of resource.preservationActionIds) {
    const target = requireReference(issues, index, resource, id, "EDPreservationAction");
    if (target && target.dataSourceId !== resource.id) {
      issues.push(issue("ED_LINEAGE_MISSING", resource, `Preservation action ${id} does not point back to this source.`));
    }
  }
  for (const id of resource.collectionIds) {
    const target = requireReference(issues, index, resource, id, "EDCollection");
    if (target && target.dataSourceId !== resource.id) {
      issues.push(issue("ED_LINEAGE_MISSING", resource, `Collection ${id} does not point back to this source.`));
    }
  }

  if (resource.status === "PRESERVED" && resource.preservationActionIds.length === 0) {
    issues.push(issue(
      "ED_PRESERVATION_UNSUPPORTED",
      resource,
      "PRESERVED status requires at least one addressable preservation action.",
    ));
  }
  if ((resource.status === "COLLECTED" || resource.status === "COLLECTED_IN_PART") && resource.collectionIds.length === 0) {
    issues.push(issue(
      "ED_COLLECTION_UNSUPPORTED",
      resource,
      "Collected status requires at least one addressable collection.",
    ));
  }
  return issues;
}

function validatePreservationNotice(resource: EDPreservationNotice, index: ResourceIndex): EDValidationIssue[] {
  const issues = validateBase(resource);
  requireReference(issues, index, resource, resource.matterId, "EDMatter");
  for (const id of resource.scopeIds) requireReference(issues, index, resource, id, "EDScope");
  if (!unique(resource.scopeIds) || !unique(resource.recipientRefs) || !unique(resource.sourceRefs)) {
    issues.push(issue("ED_SCHEMA", resource, "Preservation notice references must be unique."));
  }
  if (resource.status !== "DRAFT" && resource.issuedAt === null) {
    issues.push(issue("ED_INDETERMINATE", resource, "Issued preservation notice has no issuedAt timestamp."));
  }
  return issues;
}

function validatePreservationAction(resource: EDPreservationAction, index: ResourceIndex): EDValidationIssue[] {
  const issues = validateBase(resource);
  const source = requireReference(issues, index, resource, resource.dataSourceId, "EDDataSource");
  requireReference(issues, index, resource, resource.matterId, "EDMatter");
  if (source) requireSameMatter(issues, resource, source);
  if (resource.noticeId) requireReference(issues, index, resource, resource.noticeId, "EDPreservationNotice");
  for (const id of resource.scopeIds) requireReference(issues, index, resource, id, "EDScope");
  for (const id of resource.exceptionIds) requireReference(issues, index, resource, id, "EDException");
  if (!hasText(resource.performedBy) || parseTime(resource.performedAt) === null) {
    issues.push(issue("ED_SCHEMA", resource, "Preservation action requires actor and valid timestamp."));
  }
  if (resource.result === "PRESERVED" && resource.sourceRefs.length === 0) {
    issues.push(issue(
      "ED_PRESERVATION_UNSUPPORTED",
      resource,
      "Successful preservation requires at least one addressable supporting source reference.",
    ));
  }
  return issues;
}

function validateCollection(resource: EDCollection, index: ResourceIndex): EDValidationIssue[] {
  const issues = validateBase(resource);
  const source = requireReference(issues, index, resource, resource.dataSourceId, "EDDataSource");
  requireReference(issues, index, resource, resource.matterId, "EDMatter");
  if (source) requireSameMatter(issues, resource, source);
  for (const id of resource.scopeIds) requireReference(issues, index, resource, id, "EDScope");
  for (const id of resource.itemIds) {
    const target = requireReference(issues, index, resource, id, "EDCollectedItem");
    if (target && target.collectionId !== resource.id) {
      issues.push(issue("ED_LINEAGE_MISSING", resource, `Collected item ${id} does not point back to this collection.`));
    }
  }
  for (const id of resource.exceptionIds) requireReference(issues, index, resource, id, "EDException");

  const start = parseTime(resource.startedAt);
  const complete = parseTime(resource.completedAt);
  if (resource.startedAt !== null && start === null) issues.push(issue("ED_SCHEMA", resource, "startedAt is invalid."));
  if (resource.completedAt !== null && complete === null) issues.push(issue("ED_SCHEMA", resource, "completedAt is invalid."));
  if (start !== null && complete !== null && start > complete) {
    issues.push(issue("ED_TEMPORAL_CONFLICT", resource, "Collection start cannot be after completion."));
  }
  if (resource.status === "COMPLETED" && resource.completedAt === null) {
    issues.push(issue("ED_COLLECTION_UNSUPPORTED", resource, "COMPLETED collection requires completedAt."));
  }
  return issues;
}

function validateCollectedItem(resource: EDCollectedItem, index: ResourceIndex): EDValidationIssue[] {
  const issues = validateBase(resource);
  const collection = requireReference(issues, index, resource, resource.collectionId, "EDCollection");
  const source = requireReference(issues, index, resource, resource.dataSourceId, "EDDataSource");
  requireReference(issues, index, resource, resource.matterId, "EDMatter");
  if (collection) requireSameMatter(issues, resource, collection);
  if (source) requireSameMatter(issues, resource, source);
  if (collection && collection.dataSourceId !== resource.dataSourceId) {
    issues.push(issue("ED_LINEAGE_MISSING", resource, "Collected item dataSourceId conflicts with its collection."));
  }
  if (!hasText(resource.sourceItemRef) || !hasText(resource.collectedObjectRef)) {
    issues.push(issue("ED_LINEAGE_MISSING", resource, "Source and collected object references are required."));
  }
  if (resource.byteLength !== null && (!Number.isSafeInteger(resource.byteLength) || resource.byteLength < 0)) {
    issues.push(issue("ED_SCHEMA", resource, "byteLength must be a non-negative safe integer or null."));
  }
  if (!unique(resource.childItemIds) || !unique(resource.processingEventIds)) {
    issues.push(issue("ED_SCHEMA", resource, "Child and processing references must be unique."));
  }
  if (resource.parentItemId !== null) requireReference(issues, index, resource, resource.parentItemId, "EDCollectedItem");
  for (const id of resource.childItemIds) requireReference(issues, index, resource, id, "EDCollectedItem");
  for (const id of resource.processingEventIds) {
    const target = requireReference(issues, index, resource, id, "EDProcessingEvent");
    if (target && !target.inputItemIds.includes(resource.id)) {
      issues.push(issue("ED_PROCESSING_LINEAGE", resource, `Processing event ${id} does not list this item as input.`));
    }
  }
  return issues;
}

function validateProcessingEvent(resource: EDProcessingEvent, index: ResourceIndex): EDValidationIssue[] {
  const issues = validateBase(resource);
  requireReference(issues, index, resource, resource.matterId, "EDMatter");
  if (resource.inputItemIds.length === 0 || !unique(resource.inputItemIds)) {
    issues.push(issue("ED_PROCESSING_LINEAGE", resource, "Processing requires unique input collected items."));
  }
  for (const id of resource.inputItemIds) {
    const target = requireReference(issues, index, resource, id, "EDCollectedItem");
    if (target) requireSameMatter(issues, resource, target);
  }
  for (const id of resource.exceptionIds) requireReference(issues, index, resource, id, "EDException");
  if (parseTime(resource.performedAt) === null || !hasText(resource.performedBy)) {
    issues.push(issue("ED_SCHEMA", resource, "Processing event requires actor and valid timestamp."));
  }
  if (resource.result === "COMPLETED" && resource.outputRefs.length === 0) {
    issues.push(issue("ED_PROCESSING_LINEAGE", resource, "Completed processing requires addressable output references."));
  }
  if (resource.operation === "DEDUPLICATION_GROUPING" && !hasText(resource.duplicateGroupRef ?? "")) {
    issues.push(issue("ED_PROCESSING_LINEAGE", resource, "Deduplication grouping requires duplicateGroupRef."));
  }
  return issues;
}

function validateDocumentFamily(resource: EDDocumentFamily, index: ResourceIndex): EDValidationIssue[] {
  const issues = validateBase(resource);
  requireReference(issues, index, resource, resource.matterId, "EDMatter");
  requireReference(issues, index, resource, resource.parentItemId, "EDCollectedItem");
  if (resource.childItemIds.length === 0 || !unique(resource.childItemIds)) {
    issues.push(issue("ED_FAMILY_CONFLICT", resource, "Document family requires unique child items."));
  }
  if (resource.childItemIds.includes(resource.parentItemId)) {
    issues.push(issue("ED_FAMILY_CONFLICT", resource, "Parent item cannot also be its own child."));
  }
  for (const id of resource.childItemIds) requireReference(issues, index, resource, id, "EDCollectedItem");
  return issues;
}

function validateReviewDecision(resource: EDReviewDecision, index: ResourceIndex): EDValidationIssue[] {
  const issues = validateBase(resource);
  requireReference(issues, index, resource, resource.matterId, "EDMatter");
  const item = requireReference(issues, index, resource, resource.itemId, "EDCollectedItem");
  if (item) requireSameMatter(issues, resource, item);
  if (resource.privilegeAssessmentId) {
    const assessment = requireReference(issues, index, resource, resource.privilegeAssessmentId, "EDPrivilegeAssessment");
    if (assessment && assessment.itemId !== resource.itemId) {
      issues.push(issue("ED_REVIEW_CONFLICT", resource, "Privilege assessment addresses a different collected item."));
    }
  }
  if (!hasText(resource.reviewerRef) || parseTime(resource.reviewedAt) === null) {
    issues.push(issue("ED_SCHEMA", resource, "Review requires reviewer and valid timestamp."));
  }
  return issues;
}

function validatePrivilegeAssessment(resource: EDPrivilegeAssessment, index: ResourceIndex): EDValidationIssue[] {
  const issues = validateBase(resource);
  requireReference(issues, index, resource, resource.matterId, "EDMatter");
  const item = requireReference(issues, index, resource, resource.itemId, "EDCollectedItem");
  if (item) requireSameMatter(issues, resource, item);
  for (const id of resource.redactionIds) {
    const redaction = requireReference(issues, index, resource, id, "EDRedaction");
    if (redaction && redaction.itemId !== resource.itemId) {
      issues.push(issue("ED_PRIVILEGE_CONFLICT", resource, `Redaction ${id} addresses a different item.`));
    }
  }
  if ((resource.status === "PRIVILEGED" || resource.status === "WITHHELD" || resource.status === "REDACTED") && resource.basisRefs.length === 0) {
    issues.push(issue("ED_PRIVILEGE_CONFLICT", resource, "Privilege-based status requires at least one basis reference."));
  }
  return issues;
}

function validateRedaction(resource: EDRedaction, index: ResourceIndex): EDValidationIssue[] {
  const issues = validateBase(resource);
  requireReference(issues, index, resource, resource.matterId, "EDMatter");
  requireReference(issues, index, resource, resource.itemId, "EDCollectedItem");
  if (!hasText(resource.locator) || !hasText(resource.createdBy) || parseTime(resource.createdAt) === null) {
    issues.push(issue("ED_REDACTION_CONFLICT", resource, "Redaction requires locator, actor, and valid timestamp."));
  }
  if ((resource.reason === "PRIVILEGE" || resource.reason === "PROTECTIVE_ORDER") && !hasText(resource.authorityRef ?? "")) {
    issues.push(issue("ED_REDACTION_CONFLICT", resource, "This redaction reason requires an authority reference."));
  }
  return issues;
}

function validateProduction(resource: EDProduction, index: ResourceIndex): EDValidationIssue[] {
  const issues = validateBase(resource);
  requireReference(issues, index, resource, resource.matterId, "EDMatter");
  for (const id of resource.requestIds) requireReference(issues, index, resource, id, "EDDiscoveryRequest");
  for (const id of resource.productionItemIds) {
    const item = requireReference(issues, index, resource, id, "EDProductionItem");
    if (item && item.productionId !== resource.id) {
      issues.push(issue("ED_PRODUCTION_CONFLICT", resource, `Production item ${id} does not point back to this production.`));
    }
  }
  if (resource.manifestId) {
    const manifest = requireReference(issues, index, resource, resource.manifestId, "EDProductionManifest");
    if (manifest && manifest.productionId !== resource.id) {
      issues.push(issue("ED_MANIFEST_CONFLICT", resource, "Manifest does not point back to this production."));
    }
  }
  for (const id of resource.exceptionIds) requireReference(issues, index, resource, id, "EDException");
  if (!hasText(resource.label) || !unique(resource.productionItemIds)) {
    issues.push(issue("ED_SCHEMA", resource, "Production requires label and unique production items."));
  }
  if (resource.status === "COMPLETED" && resource.producedAt === null) {
    issues.push(issue("ED_PRODUCTION_CONFLICT", resource, "Completed production requires producedAt."));
  }
  if (resource.status === "COMPLETED" && resource.producedForms.length === 0) {
    issues.push(issue("ED_PRODUCTION_CONFLICT", resource, "Completed production requires at least one produced form."));
  }
  return issues;
}

function validateProductionItem(resource: EDProductionItem, index: ResourceIndex): EDValidationIssue[] {
  const issues = validateBase(resource);
  const production = requireReference(issues, index, resource, resource.productionId, "EDProduction");
  const collected = requireReference(issues, index, resource, resource.collectedItemId, "EDCollectedItem");
  requireReference(issues, index, resource, resource.matterId, "EDMatter");
  if (production) requireSameMatter(issues, resource, production);
  if (collected) requireSameMatter(issues, resource, collected);
  if (resource.reviewDecisionId) {
    const review = requireReference(issues, index, resource, resource.reviewDecisionId, "EDReviewDecision");
    if (review && review.itemId !== resource.collectedItemId) {
      issues.push(issue("ED_PRODUCTION_CONFLICT", resource, "Review decision addresses a different collected item."));
    }
  }
  for (const id of resource.redactionIds) requireReference(issues, index, resource, id, "EDRedaction");
  for (const id of resource.transformationRefs) requireReference(issues, index, resource, id);
  if (!hasText(resource.producedObjectRef)) {
    issues.push(issue("ED_LINEAGE_MISSING", resource, "Production item requires producedObjectRef."));
  }
  if ((resource.batesStart === null) !== (resource.batesEnd === null)) {
    issues.push(issue("ED_PRODUCTION_CONFLICT", resource, "Bates range must provide both start and end or neither."));
  }
  return issues;
}

function validateProductionManifest(resource: EDProductionManifest, index: ResourceIndex): EDValidationIssue[] {
  const issues = validateBase(resource);
  const production = requireReference(issues, index, resource, resource.productionId, "EDProduction");
  requireReference(issues, index, resource, resource.matterId, "EDMatter");
  if (production) requireSameMatter(issues, resource, production);
  if (!hasText(resource.manifestRef) || parseTime(resource.createdAt) === null || !unique(resource.itemIds)) {
    issues.push(issue("ED_MANIFEST_CONFLICT", resource, "Manifest requires address, valid timestamp, and unique item IDs."));
  }
  for (const id of resource.itemIds) {
    const item = requireReference(issues, index, resource, id, "EDProductionItem");
    if (item && item.productionId !== resource.productionId) {
      issues.push(issue("ED_MANIFEST_CONFLICT", resource, `Manifest item ${id} belongs to a different production.`));
    }
  }
  return issues;
}

function validateDiscoveryResponse(resource: EDDiscoveryResponse, index: ResourceIndex): EDValidationIssue[] {
  const issues = validateBase(resource);
  requireReference(issues, index, resource, resource.matterId, "EDMatter");
  const request = requireReference(issues, index, resource, resource.requestId, "EDDiscoveryRequest");
  if (request) requireSameMatter(issues, resource, request);
  for (const id of resource.productionIds) requireReference(issues, index, resource, id, "EDProduction");
  for (const id of resource.limitationIds) requireReference(issues, index, resource, id, "EDException");
  for (const id of resource.withheldItemIds) requireReference(issues, index, resource, id, "EDCollectedItem");
  if ((resource.position === "OBJECTED" || resource.position === "WITHHELD") && resource.limitationIds.length === 0 && resource.objectionIds.length === 0) {
    issues.push(issue(
      "ED_WITHHOLDING_UNADDRESSED",
      resource,
      "Objected/withheld response requires an addressable objection or limitation record.",
    ));
  }
  return issues;
}

function validateGenericReferences(resource: EDResource, index: ResourceIndex): EDValidationIssue[] {
  const issues = validateBase(resource);
  if ("matterId" in resource) requireReference(issues, index, resource, resource.matterId, "EDMatter");
  return issues;
}

export function validateEDResource(
  resource: EDResource,
  context: EDValidationContext,
): EDValidationResult {
  const index = buildIndex(context.resources);
  let issues: EDValidationIssue[];

  switch (resource.type) {
    case "EDMatter": issues = validateMatter(resource); break;
    case "EDScope": issues = validateScope(resource, index); break;
    case "EDDataSource": issues = validateDataSource(resource, index); break;
    case "EDPreservationNotice": issues = validatePreservationNotice(resource, index); break;
    case "EDPreservationAction": issues = validatePreservationAction(resource, index); break;
    case "EDCollection": issues = validateCollection(resource, index); break;
    case "EDCollectedItem": issues = validateCollectedItem(resource, index); break;
    case "EDProcessingEvent": issues = validateProcessingEvent(resource, index); break;
    case "EDDocumentFamily": issues = validateDocumentFamily(resource, index); break;
    case "EDReviewDecision": issues = validateReviewDecision(resource, index); break;
    case "EDPrivilegeAssessment": issues = validatePrivilegeAssessment(resource, index); break;
    case "EDRedaction": issues = validateRedaction(resource, index); break;
    case "EDProduction": issues = validateProduction(resource, index); break;
    case "EDProductionItem": issues = validateProductionItem(resource, index); break;
    case "EDProductionManifest": issues = validateProductionManifest(resource, index); break;
    case "EDDiscoveryResponse": issues = validateDiscoveryResponse(resource, index); break;
    default: issues = validateGenericReferences(resource, index); break;
  }

  const hasIndeterminate = issues.some(({ code }) => code === "ED_INDETERMINATE");
  const hasInvalid = issues.some(({ code }) => code !== "ED_INDETERMINATE");

  return {
    status: hasInvalid ? "INVALID" : hasIndeterminate ? "INDETERMINATE" : "VALID",
    issues,
  };
}

export function validateEDAnalysis(
  resources: readonly EDResource[],
): EDValidationResult {
  const issues: EDValidationIssue[] = [];
  const seen = new Set<EDResourceId>();

  for (const resource of resources) {
    if (seen.has(resource.id)) {
      issues.push(issue("ED_DUPLICATE_ID", resource, `Duplicate resource ID: ${resource.id}.`));
    }
    seen.add(resource.id);
  }

  const context: EDValidationContext = { resources };
  for (const resource of resources) {
    issues.push(...validateEDResource(resource, context).issues);
  }

  const hasIndeterminate = issues.some(({ code }) => code === "ED_INDETERMINATE");
  const hasInvalid = issues.some(({ code }) => code !== "ED_INDETERMINATE");

  return {
    status: hasInvalid ? "INVALID" : hasIndeterminate ? "INDETERMINATE" : "VALID",
    issues,
  };
}
