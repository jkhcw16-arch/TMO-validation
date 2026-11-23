import type { EDResourceType } from "./ed-types.js";

/** TMO-ED canonical resource registry and cross-profile boundary rules. */

export type EDLayer =
  | "MATTER"
  | "SCOPE"
  | "DATA_ACQUISITION"
  | "REVIEW"
  | "PRODUCTION"
  | "DISPOSITION"
  | "CROSS_CUTTING";

export type EDCardinality = "ONE" | "ZERO_OR_ONE" | "MANY";

export interface EDResourceDescriptor {
  readonly type: EDResourceType;
  readonly layer: EDLayer;
  readonly purpose: string;
  readonly authoritativeFor: readonly string[];
  readonly notAuthoritativeFor: readonly string[];
}

export interface EDRelationDescriptor {
  readonly id: string;
  readonly from: EDResourceType;
  readonly to: EDResourceType;
  readonly cardinality: EDCardinality;
  readonly description: string;
}

export type EDBridgeProfile = "TMO-LE" | "TMO-CA";

export interface EDBridgeRule {
  readonly id: string;
  readonly targetProfile: EDBridgeProfile;
  readonly sourceTypes: readonly EDResourceType[];
  readonly permits: readonly string[];
  readonly forbids: readonly string[];
}

export const ED_RESOURCES: Readonly<Record<EDResourceType, EDResourceDescriptor>> = {
  EDMatter: {
    type: "EDMatter", layer: "MATTER",
    purpose: "Identifies the discovery matter and its addressable scope/request graph.",
    authoritativeFor: ["matter identity", "matter lifecycle status"],
    notAuthoritativeFor: ["responsiveness", "privilege", "evidentiary truth", "legal merits"],
  },
  EDDiscoveryRequest: {
    type: "EDDiscoveryRequest", layer: "MATTER",
    purpose: "Represents a discovery request, requested scope, and requested production forms.",
    authoritativeFor: ["request text/description", "requested forms", "request status"],
    notAuthoritativeFor: ["existence of responsive material", "production completeness"],
  },
  EDDiscoveryResponse: {
    type: "EDDiscoveryResponse", layer: "MATTER",
    purpose: "Represents the response position, objections, withholding, limitations, and productions.",
    authoritativeFor: ["response position", "asserted objections", "identified withholding"],
    notAuthoritativeFor: ["substantive correctness of objection", "truth of produced material"],
  },
  EDScope: {
    type: "EDScope", layer: "SCOPE",
    purpose: "Defines custodians, sources, dates, topics, and limitations for discovery work.",
    authoritativeFor: ["modeled discovery scope", "scope status"],
    notAuthoritativeFor: ["collection completion", "responsiveness"],
  },
  EDCustodian: {
    type: "EDCustodian", layer: "SCOPE",
    purpose: "Represents an addressable custodian and linked data sources.",
    authoritativeFor: ["custodian reference", "custodian-source association"],
    notAuthoritativeFor: ["authorship", "possession of every source item", "legal responsibility"],
  },
  EDDataSource: {
    type: "EDDataSource", layer: "DATA_ACQUISITION",
    purpose: "Identifies an ESI source separately from preservation and collection events.",
    authoritativeFor: ["source identity", "source location", "source lifecycle state"],
    notAuthoritativeFor: ["content collection", "authenticity", "responsiveness"],
  },
  EDPreservationNotice: {
    type: "EDPreservationNotice", layer: "DATA_ACQUISITION",
    purpose: "Records issuance and lifecycle of a preservation notice.",
    authoritativeFor: ["notice issuance", "notice recipients", "notice scope references"],
    notAuthoritativeFor: ["actual preservation success"],
  },
  EDPreservationAction: {
    type: "EDPreservationAction", layer: "DATA_ACQUISITION",
    purpose: "Records a source-specific preservation act, method, actor, time, result, and exceptions.",
    authoritativeFor: ["performed preservation action", "recorded preservation result"],
    notAuthoritativeFor: ["collection completion", "truth of preserved content"],
  },
  EDCollection: {
    type: "EDCollection", layer: "DATA_ACQUISITION",
    purpose: "Records a collection activity against an identified data source and scope.",
    authoritativeFor: ["collection activity", "collection method", "collection status"],
    notAuthoritativeFor: ["substantive truth", "responsiveness", "privilege"],
  },
  EDCollectedItem: {
    type: "EDCollectedItem", layer: "DATA_ACQUISITION",
    purpose: "Preserves lineage between a source item reference and its collected representation.",
    authoritativeFor: ["collection lineage", "collected-object metadata", "recorded hashes"],
    notAuthoritativeFor: ["authenticity conclusion", "responsiveness", "admissibility", "truth"],
  },
  EDProcessingEvent: {
    type: "EDProcessingEvent", layer: "DATA_ACQUISITION",
    purpose: "Records normalization, extraction, conversion, deduplication grouping, and other processing transformations.",
    authoritativeFor: ["processing operation", "processing outputs", "processing lineage"],
    notAuthoritativeFor: ["source identity collapse", "evidentiary independence", "truth"],
  },
  EDDocumentFamily: {
    type: "EDDocumentFamily", layer: "DATA_ACQUISITION",
    purpose: "Represents parent/child or other document-family relationships without collapsing item identity.",
    authoritativeFor: ["modeled family relation"],
    notAuthoritativeFor: ["duplicate identity", "common authorship", "responsiveness of every family member"],
  },
  EDReviewDecision: {
    type: "EDReviewDecision", layer: "REVIEW",
    purpose: "Records responsiveness, confidentiality, issues, reviewer, and limitations for a reviewed item.",
    authoritativeFor: ["recorded review decision"],
    notAuthoritativeFor: ["privilege unless separately assessed", "evidentiary truth", "legal merits"],
  },
  EDPrivilegeAssessment: {
    type: "EDPrivilegeAssessment", layer: "REVIEW",
    purpose: "Keeps privilege assessment separate from responsiveness and confidentiality review.",
    authoritativeFor: ["recorded privilege assessment", "privilege basis references"],
    notAuthoritativeFor: ["responsiveness", "truth", "ultimate judicial privilege ruling"],
  },
  EDRedaction: {
    type: "EDRedaction", layer: "REVIEW",
    purpose: "Records an item-specific redaction, reason, locator, and authority reference.",
    authoritativeFor: ["redaction record", "redaction reason"],
    notAuthoritativeFor: ["privilege of entire item", "responsiveness of entire item"],
  },
  EDProduction: {
    type: "EDProduction", layer: "PRODUCTION",
    purpose: "Represents a production set, requested/produced forms, items, timing, and exceptions.",
    authoritativeFor: ["production set identity", "produced forms", "production status"],
    notAuthoritativeFor: ["truth", "admissibility", "completeness beyond represented scope"],
  },
  EDProductionItem: {
    type: "EDProductionItem", layer: "PRODUCTION",
    purpose: "Preserves lineage from a collected item to the produced representation and transformations.",
    authoritativeFor: ["production-item lineage", "produced object reference", "production form"],
    notAuthoritativeFor: ["source-item identity equivalence", "truth"],
  },
  EDProductionManifest: {
    type: "EDProductionManifest", layer: "PRODUCTION",
    purpose: "Records the item membership, manifest reference, timestamp, and hashes for a production.",
    authoritativeFor: ["manifested production membership", "recorded manifest hashes"],
    notAuthoritativeFor: ["responsiveness", "privilege", "truth"],
  },
  EDException: {
    type: "EDException", layer: "CROSS_CUTTING",
    purpose: "Preserves limitations, failures, deviations, withholding, and data-loss conditions instead of silently discarding them.",
    authoritativeFor: ["recorded exception", "affected resources", "exception status"],
    notAuthoritativeFor: ["automatic cure", "automatic sanctions", "legal merits"],
  },
  EDDisposition: {
    type: "EDDisposition", layer: "DISPOSITION",
    purpose: "Records authorized retention, deletion, return, transfer, archival, hold release, or no-action disposition.",
    authoritativeFor: ["recorded disposition authorization", "recorded disposition status"],
    notAuthoritativeFor: ["legal sufficiency of authorization", "destruction inference", "legal merits"],
  },
};

export const ED_RELATIONS: readonly EDRelationDescriptor[] = [
  { id: "ED-R01", from: "EDMatter", to: "EDScope", cardinality: "MANY", description: "A matter may contain multiple separately addressable scopes." },
  { id: "ED-R02", from: "EDMatter", to: "EDDiscoveryRequest", cardinality: "MANY", description: "A matter may contain multiple discovery requests." },
  { id: "ED-R03", from: "EDDiscoveryRequest", to: "EDDiscoveryResponse", cardinality: "MANY", description: "A request may have an initial response and supplements." },
  { id: "ED-R04", from: "EDScope", to: "EDCustodian", cardinality: "MANY", description: "Scope may identify multiple custodians." },
  { id: "ED-R05", from: "EDScope", to: "EDDataSource", cardinality: "MANY", description: "Scope may identify multiple ESI sources." },
  { id: "ED-R06", from: "EDDataSource", to: "EDPreservationAction", cardinality: "MANY", description: "Preservation acts remain separate from source identification." },
  { id: "ED-R07", from: "EDDataSource", to: "EDCollection", cardinality: "MANY", description: "Collection events remain separate from source identification and preservation." },
  { id: "ED-R08", from: "EDCollection", to: "EDCollectedItem", cardinality: "MANY", description: "A collection yields separately addressable collected items." },
  { id: "ED-R09", from: "EDCollectedItem", to: "EDProcessingEvent", cardinality: "MANY", description: "Processing preserves transformation lineage from collected items." },
  { id: "ED-R10", from: "EDCollectedItem", to: "EDReviewDecision", cardinality: "MANY", description: "An item may receive review decisions without changing source identity." },
  { id: "ED-R11", from: "EDCollectedItem", to: "EDPrivilegeAssessment", cardinality: "MANY", description: "Privilege assessment is independently addressable." },
  { id: "ED-R12", from: "EDPrivilegeAssessment", to: "EDRedaction", cardinality: "MANY", description: "A privilege assessment may support specific redaction records." },
  { id: "ED-R13", from: "EDProduction", to: "EDProductionItem", cardinality: "MANY", description: "A production contains separately traceable production items." },
  { id: "ED-R14", from: "EDProduction", to: "EDProductionManifest", cardinality: "ZERO_OR_ONE", description: "A production may have a manifest recording membership and hashes." },
  { id: "ED-R15", from: "EDProductionItem", to: "EDCollectedItem", cardinality: "ONE", description: "Every production item traces back to a collected item." },
  { id: "ED-R16", from: "EDMatter", to: "EDDisposition", cardinality: "MANY", description: "Disposition remains an explicit matter lifecycle activity." },
  { id: "ED-R17", from: "EDMatter", to: "EDException", cardinality: "MANY", description: "Exceptions remain visible across the discovery lifecycle." },
] as const;

export const ED_INVARIANTS = {
  "ED-101": "A source item, collected copy, processed representation, and production copy remain distinct resources connected by lineage.",
  "ED-102": "Identification of a data source does not establish preservation or collection of its contents.",
  "ED-103": "Collection does not establish authenticity, responsiveness, admissibility, evidentiary truth, or legal merits.",
  "ED-104": "Preservation status requires an addressable preservation action or equivalent supporting record; notice issuance alone does not prove preservation success.",
  "ED-105": "Processing transformations preserve provenance and derivation lineage and cannot silently replace source identity.",
  "ED-106": "Deduplication groups representations for processing efficiency but does not establish common provenance, custody, context, evidentiary independence, or legal significance.",
  "ED-107": "Responsiveness, privilege, confidentiality, privacy-related restrictions, and issue coding remain separately addressable review dimensions.",
  "ED-108": "Objections, withholding, limitations, failures, and exceptions remain explicit instead of causing responsive material or lineage to disappear silently.",
  "ED-109": "Requested production form, produced form, and transformations between collected and produced representations remain explicit.",
  "ED-110": "Discovery status cannot bypass TMO-LE evidentiary qualification or independently establish truth, admissibility, or legal merits.",
} as const;

export const ED_BRIDGE_RULES: readonly EDBridgeRule[] = [
  {
    id: "ED-LE-01",
    targetProfile: "TMO-LE",
    sourceTypes: [
      "EDDataSource", "EDPreservationAction", "EDCollection", "EDCollectedItem",
      "EDProcessingEvent", "EDReviewDecision", "EDPrivilegeAssessment",
      "EDProductionItem", "EDProductionManifest", "EDException",
    ],
    permits: [
      "source and provenance references",
      "collection and processing lineage",
      "hash and transformation metadata",
      "review/privilege classifications as claims requiring qualification where used evidentially",
      "production lineage and exceptions",
    ],
    forbids: [
      "automatic conversion of collected or produced material into verified fact",
      "automatic authenticity or admissibility",
      "automatic evidentiary independence from duplicate records",
    ],
  },
  {
    id: "ED-CA-01",
    targetProfile: "TMO-CA",
    sourceTypes: ["EDDiscoveryRequest", "EDDiscoveryResponse", "EDException", "EDProduction"],
    permits: [
      "procedural facts after TMO-LE qualification",
      "discovery limitations and production facts after evidentiary qualification",
    ],
    forbids: [
      "direct ED-to-CA factual promotion without the TMO-LE qualification boundary",
      "automatic constitutional or other legal merits conclusions",
    ],
  },
] as const;

const resourceTypes = Object.keys(ED_RESOURCES) as EDResourceType[];

export function getEDResourceDescriptor(
  type: EDResourceType,
): EDResourceDescriptor {
  return ED_RESOURCES[type];
}

export function listEDResourceTypes(): readonly EDResourceType[] {
  return resourceTypes;
}

export function listEDResourcesByLayer(layer: EDLayer): readonly EDResourceDescriptor[] {
  return resourceTypes
    .map((type) => ED_RESOURCES[type])
    .filter((descriptor) => descriptor.layer === layer);
}

export function getEDOutgoingRelations(
  type: EDResourceType,
): readonly EDRelationDescriptor[] {
  return ED_RELATIONS.filter((relation) => relation.from === type);
}

export function getEDIncomingRelations(
  type: EDResourceType,
): readonly EDRelationDescriptor[] {
  return ED_RELATIONS.filter((relation) => relation.to === type);
}

export function getEDBridgeRules(
  targetProfile: EDBridgeProfile,
): readonly EDBridgeRule[] {
  return ED_BRIDGE_RULES.filter((rule) => rule.targetProfile === targetProfile);
}
