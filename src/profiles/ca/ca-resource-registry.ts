import {
  CA_CANONICAL_RESOURCE_TYPES,
  CA_INVARIANT_IDS,
  type CACanonicalResourceType,
  type CAInvariantId,
} from "./ca-types.js";

/**
 * TMO-CA canonical resource registry.
 *
 * CA resources may reference a small set of TMO-LE bridge resources, but
 * legal conclusions remain CA derivations rather than outputs of LE scoring.
 */

export const CA_LE_BRIDGE_RESOURCE_TYPES = [
  "LEAssertion",
  "LEEvidenceItem",
  "LEProvenanceRecord",
  "LEContradiction",
  "LECorroboration",
  "LEEpistemicAssessment",
  "LEDerivation",
  "LEAuditFinding",
] as const;

export type CALEBridgeResourceType =
  (typeof CA_LE_BRIDGE_RESOURCE_TYPES)[number];

export type CAReferenceableResourceType =
  | CACanonicalResourceType
  | CALEBridgeResourceType;

export type CASemanticLayer =
  | "TEXT"
  | "ISSUE"
  | "AUTHORITY"
  | "DOCTRINE"
  | "THRESHOLD"
  | "APPLICATION"
  | "REMEDY"
  | "CONCLUSION";

export interface CAResourceDescriptor {
  readonly type: CACanonicalResourceType;
  readonly layer: CASemanticLayer;
  readonly description: string;
  readonly invariants: readonly CAInvariantId[];
  readonly mayReference: readonly CAReferenceableResourceType[];
}

const define = <T extends CAResourceDescriptor>(descriptor: T): T => descriptor;

export const CA_CANONICAL_RESOURCE_REGISTRY = {
  CAIssue: define({
    type: "CAIssue",
    layer: "ISSUE",
    description: "Constitutional question bounded by provisions and claims.",
    invariants: ["CA-101", "CA-102", "CA-109", "CA-110"],
    mayReference: ["CAConstitutionalProvision", "CAClaim"],
  }),

  CAConstitutionalProvision: define({
    type: "CAConstitutionalProvision",
    layer: "TEXT",
    description: "Addressable constitutional text kept distinct from its interpretations.",
    invariants: ["CA-101"],
    mayReference: ["LEProvenanceRecord", "LEAuditFinding"],
  }),

  CAClaim: define({
    type: "CAClaim",
    layer: "ISSUE",
    description: "Explicit constitutional proposition submitted for analysis.",
    invariants: ["CA-101", "CA-102", "CA-109", "CA-110"],
    mayReference: ["CAIssue", "CAConstitutionalProvision", "CAAuthority", "LEAssertion"],
  }),

  CAAuthority: define({
    type: "CAAuthority",
    layer: "AUTHORITY",
    description: "Legal authority with explicit type, binding status, current treatment, jurisdiction, and source lineage.",
    invariants: ["CA-101", "CA-103", "CA-104", "CA-107", "CA-109"],
    mayReference: ["CAConstitutionalProvision", "LEEvidenceItem", "LEProvenanceRecord", "LEAuditFinding"],
  }),

  CAPrecedent: define({
    type: "CAPrecedent",
    layer: "AUTHORITY",
    description: "Proposition-specific precedent separating holding, rationale, facts, scope, and later treatment.",
    invariants: ["CA-103", "CA-104", "CA-106", "CA-107", "CA-109"],
    mayReference: ["CAAuthority", "CAClaim", "LEEvidenceItem", "LEProvenanceRecord"],
  }),

  CADoctrine: define({
    type: "CADoctrine",
    layer: "DOCTRINE",
    description: "Constitutional doctrine with separately addressable elements, exceptions, provisions, and authorities.",
    invariants: ["CA-101", "CA-103", "CA-104", "CA-108", "CA-109"],
    mayReference: ["CAConstitutionalProvision", "CAAuthority", "CAPrecedent", "CAClaim"],
  }),

  CAStandardOfReview: define({
    type: "CAStandardOfReview",
    layer: "DOCTRINE",
    description: "Applicable standard of review represented separately from factual evidence and doctrine application.",
    invariants: ["CA-103", "CA-104", "CA-108", "CA-109"],
    mayReference: ["CAIssue", "CAAuthority", "CAPrecedent", "CADoctrine"],
  }),

  CAJusticiabilityFinding: define({
    type: "CAJusticiabilityFinding",
    layer: "THRESHOLD",
    description: "Threshold judicial-power analysis kept separate from constitutional merits.",
    invariants: ["CA-102", "CA-103", "CA-104", "CA-105", "CA-109", "CA-110"],
    mayReference: ["CAIssue", "CAAuthority", "CAPrecedent", "LEEvidenceItem", "LEEpistemicAssessment"],
  }),

  CAApplication: define({
    type: "CAApplication",
    layer: "APPLICATION",
    description: "Application of legal rules to qualified factual predicates, preserving LE-to-CA traceability.",
    invariants: ["CA-102", "CA-103", "CA-104", "CA-107", "CA-108", "CA-109", "CA-110"],
    mayReference: [
      "CAIssue",
      "CAClaim",
      "CADoctrine",
      "CAStandardOfReview",
      "CAAuthority",
      "CAPrecedent",
      "CAJusticiabilityFinding",
      "CACounterargument",
      "LEAssertion",
      "LEEvidenceItem",
      "LEProvenanceRecord",
      "LEContradiction",
      "LECorroboration",
      "LEEpistemicAssessment",
      "LEDerivation",
    ],
  }),

  CACounterargument: define({
    type: "CACounterargument",
    layer: "APPLICATION",
    description: "Material competing legal argument and adverse authority preserved as part of the analysis record.",
    invariants: ["CA-103", "CA-104", "CA-107", "CA-109"],
    mayReference: ["CAIssue", "CAClaim", "CAAuthority", "CAPrecedent", "CADoctrine", "CAApplication", "LEEvidenceItem", "LEEpistemicAssessment"],
  }),

  CARemedy: define({
    type: "CARemedy",
    layer: "REMEDY",
    description: "Requested or available remedy evaluated separately from merits.",
    invariants: ["CA-102", "CA-103", "CA-104", "CA-108", "CA-109"],
    mayReference: ["CAIssue", "CAAuthority", "CAPrecedent", "CADoctrine", "CAApplication", "CAConclusion"],
  }),

  CAConclusion: define({
    type: "CAConclusion",
    layer: "CONCLUSION",
    description: "Auditable constitutional conclusion with direction, support status, adverse authority, limitations, and applications.",
    invariants: ["CA-101", "CA-102", "CA-103", "CA-104", "CA-105", "CA-106", "CA-107", "CA-108", "CA-109", "CA-110"],
    mayReference: [
      "CAIssue",
      "CAClaim",
      "CAConstitutionalProvision",
      "CAAuthority",
      "CAPrecedent",
      "CADoctrine",
      "CAStandardOfReview",
      "CAJusticiabilityFinding",
      "CAApplication",
      "CACounterargument",
      "CARemedy",
      "LEEpistemicAssessment",
      "LEDerivation",
      "LEAuditFinding",
    ],
  }),
} as const satisfies Record<CACanonicalResourceType, CAResourceDescriptor>;

export interface CARegistryValidationIssue {
  readonly code:
    | "MISSING_RESOURCE"
    | "TYPE_KEY_MISMATCH"
    | "UNKNOWN_INVARIANT"
    | "UNKNOWN_REFERENCE"
    | "DUPLICATE_INVARIANT"
    | "DUPLICATE_REFERENCE";
  readonly resourceType: string;
  readonly detail: string;
}

export interface CARegistryValidationResult {
  readonly valid: boolean;
  readonly issues: readonly CARegistryValidationIssue[];
}

export function getCAResourceDescriptor(
  type: CACanonicalResourceType,
): CAResourceDescriptor {
  return CA_CANONICAL_RESOURCE_REGISTRY[type];
}

export function getCAResourceTypesByLayer(
  layer: CASemanticLayer,
): readonly CACanonicalResourceType[] {
  return CA_CANONICAL_RESOURCE_TYPES.filter(
    (type) => CA_CANONICAL_RESOURCE_REGISTRY[type].layer === layer,
  );
}

export function getCAResourceTypesForInvariant(
  invariant: CAInvariantId,
): readonly CACanonicalResourceType[] {
  return CA_CANONICAL_RESOURCE_TYPES.filter((type) =>
    (CA_CANONICAL_RESOURCE_REGISTRY[type].invariants as readonly CAInvariantId[]).includes(invariant),
  );
}

export function mayCAResourceReference(
  source: CACanonicalResourceType,
  target: CAReferenceableResourceType,
): boolean {
  return (CA_CANONICAL_RESOURCE_REGISTRY[source].mayReference as readonly CAReferenceableResourceType[]).includes(target);
}

export function validateCACanonicalResourceRegistry(): CARegistryValidationResult {
  const issues: CARegistryValidationIssue[] = [];
  const canonical = new Set<string>(CA_CANONICAL_RESOURCE_TYPES);
  const bridge = new Set<string>(CA_LE_BRIDGE_RESOURCE_TYPES);
  const invariants = new Set<string>(CA_INVARIANT_IDS);

  for (const type of CA_CANONICAL_RESOURCE_TYPES) {
    const descriptor = CA_CANONICAL_RESOURCE_REGISTRY[type];
    if (!descriptor) {
      issues.push({ code: "MISSING_RESOURCE", resourceType: type, detail: "No descriptor is registered." });
      continue;
    }
    if (descriptor.type !== type) {
      issues.push({ code: "TYPE_KEY_MISMATCH", resourceType: type, detail: `Descriptor type is ${descriptor.type}.` });
    }
    if (new Set(descriptor.invariants).size !== descriptor.invariants.length) {
      issues.push({ code: "DUPLICATE_INVARIANT", resourceType: type, detail: "Invariant list contains duplicates." });
    }
    if (new Set(descriptor.mayReference).size !== descriptor.mayReference.length) {
      issues.push({ code: "DUPLICATE_REFERENCE", resourceType: type, detail: "Reference list contains duplicates." });
    }
    for (const invariant of descriptor.invariants) {
      if (!invariants.has(invariant)) {
        issues.push({ code: "UNKNOWN_INVARIANT", resourceType: type, detail: `Unknown invariant ${invariant}.` });
      }
    }
    for (const reference of descriptor.mayReference) {
      if (!canonical.has(reference) && !bridge.has(reference)) {
        issues.push({ code: "UNKNOWN_REFERENCE", resourceType: type, detail: `Unknown reference target ${reference}.` });
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

export const CA_REGISTRY_INVARIANT =
  "CA resources preserve legal-source boundaries; LE evidence may inform CA application but cannot independently establish a constitutional conclusion." as const;
