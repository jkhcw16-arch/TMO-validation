/**
 * TMO LE Canonical Resource Registry
 *
 * Central registry for resource identity, semantic layer, and foundational
 * invariant applicability. The registry does not validate the truth of a
 * resource. It defines which canonical resource kinds exist and how they are
 * structurally classified before interpretation.
 */

export const LE_CANONICAL_RESOURCE_TYPES = [
  "LEEvent",
  "LEActor",
  "LERole",
  "LEAgency",
  "LEAssertion",
  "LEEvidenceItem",
  "LESourceRecord",
  "LECommunication",
  "LEResponse",
  "LEInstitutionalAction",
  "LEDecision",
  "LETemporalEntity",
  "LEContradiction",
  "LECorroboration",
  "LEAuditFinding",
  "LEProvenanceRecord",
  "LEDerivation",
] as const;

export type LECanonicalResourceType =
  (typeof LE_CANONICAL_RESOURCE_TYPES)[number];

export type LECanonicalLayer =
  | "PRESERVED"
  | "EVIDENTIARY"
  | "INTERPRETIVE"
  | "INSTITUTIONAL_OUTCOME";

export type LEFoundationalInvariantId =
  | "LE-101"
  | "LE-102"
  | "LE-103"
  | "LE-104"
  | "LE-105"
  | "LE-106"
  | "LE-107";

export type LEResourceId = string & {
  readonly __brand: "LEResourceId";
};

export interface LECanonicalResource {
  readonly id: LEResourceId;
  readonly type: LECanonicalResourceType;
  readonly provenanceId: LEResourceId;
  readonly createdAt: string;
  readonly preserved: true;
}

export interface LECanonicalResourceDescriptor {
  readonly type: LECanonicalResourceType;
  readonly layer: LECanonicalLayer;
  readonly description: string;
  readonly invariants: readonly LEFoundationalInvariantId[];
  readonly mayReference: readonly LECanonicalResourceType[];
}

const define = <T extends LECanonicalResourceDescriptor>(value: T): T => value;

export const LE_CANONICAL_RESOURCE_REGISTRY = {
  LEEvent: define({
    type: "LEEvent",
    layer: "PRESERVED",
    description: "Preserved representation of an observed or asserted event; does not itself establish intent, causation, authorization, or responsibility.",
    invariants: ["LE-101", "LE-103", "LE-106", "LE-107"],
    mayReference: ["LEActor", "LETemporalEntity", "LEEvidenceItem", "LEAssertion", "LEProvenanceRecord"],
  }),

  LEActor: define({
    type: "LEActor",
    layer: "PRESERVED",
    description: "Identified entity represented separately from any role, agency, attribution, or authorization.",
    invariants: ["LE-101", "LE-103", "LE-107"],
    mayReference: ["LEProvenanceRecord", "LEEvidenceItem"],
  }),

  LERole: define({
    type: "LERole",
    layer: "INTERPRETIVE",
    description: "Context-bounded role attributed to an actor and supported by evidence.",
    invariants: ["LE-101", "LE-103", "LE-105", "LE-107"],
    mayReference: ["LEActor", "LEEvidenceItem", "LEDerivation", "LETemporalEntity"],
  }),

  LEAgency: define({
    type: "LEAgency",
    layer: "INTERPRETIVE",
    description: "Evidence-bounded finding about an actor's capacity to choose or act; distinct from causation, purpose, authorization, and guilt.",
    invariants: ["LE-101", "LE-103", "LE-105", "LE-107"],
    mayReference: ["LEActor", "LEEvent", "LEEvidenceItem", "LEDerivation"],
  }),

  LEAssertion: define({
    type: "LEAssertion",
    layer: "EVIDENTIARY",
    description: "A proposition attributed to a source; assertion status is separate from factual establishment.",
    invariants: ["LE-101", "LE-102", "LE-103", "LE-104", "LE-105", "LE-107"],
    mayReference: ["LEActor", "LECommunication", "LEEvidenceItem", "LECorroboration", "LEContradiction", "LEProvenanceRecord", "LEDerivation"],
  }),

  LEEvidenceItem: define({
    type: "LEEvidenceItem",
    layer: "EVIDENTIARY",
    description: "Discrete evidentiary item extracted from or linked to a preserved source record.",
    invariants: ["LE-101", "LE-103", "LE-104", "LE-105", "LE-106"],
    mayReference: ["LESourceRecord", "LEProvenanceRecord", "LETemporalEntity", "LEDerivation"],
  }),

  LESourceRecord: define({
    type: "LESourceRecord",
    layer: "PRESERVED",
    description: "Preserved source record from which evidence may be extracted without replacing the source.",
    invariants: ["LE-101", "LE-103", "LE-104", "LE-106"],
    mayReference: ["LETemporalEntity", "LEProvenanceRecord"],
  }),

  LECommunication: define({
    type: "LECommunication",
    layer: "PRESERVED",
    description: "Preserved communication event; its contents remain assertions until independently supported.",
    invariants: ["LE-101", "LE-102", "LE-103", "LE-106", "LE-107"],
    mayReference: ["LEActor", "LEAssertion", "LETemporalEntity", "LEEvidenceItem", "LEProvenanceRecord"],
  }),

  LEResponse: define({
    type: "LEResponse",
    layer: "INTERPRETIVE",
    description: "A response relationship linking an actor and a prior resource without automatically implying causation.",
    invariants: ["LE-101", "LE-103", "LE-105", "LE-106", "LE-107"],
    mayReference: ["LEActor", "LEEvent", "LECommunication", "LETemporalEntity", "LEEvidenceItem", "LEDerivation"],
  }),

  LEInstitutionalAction: define({
    type: "LEInstitutionalAction",
    layer: "INSTITUTIONAL_OUTCOME",
    description: "Recorded institutional action kept separate from the question whether that action was authorized.",
    invariants: ["LE-101", "LE-103", "LE-105", "LE-106", "LE-107"],
    mayReference: ["LEActor", "LERole", "LEAgency", "LEDecision", "LEEvent", "LEEvidenceItem", "LEDerivation", "LETemporalEntity"],
  }),

  LEDecision: define({
    type: "LEDecision",
    layer: "INSTITUTIONAL_OUTCOME",
    description: "Recorded decision represented separately from later action and outcome.",
    invariants: ["LE-101", "LE-103", "LE-105", "LE-106", "LE-107"],
    mayReference: ["LEActor", "LERole", "LEEvidenceItem", "LEAssertion", "LETemporalEntity", "LEDerivation"],
  }),

  LETemporalEntity: define({
    type: "LETemporalEntity",
    layer: "PRESERVED",
    description: "Temporal interval or point with explicit precision; derived precision may not exceed evidentiary support.",
    invariants: ["LE-101", "LE-103", "LE-104", "LE-105", "LE-106"],
    mayReference: ["LEEvidenceItem", "LESourceRecord", "LEProvenanceRecord", "LEDerivation"],
  }),

  LEContradiction: define({
    type: "LEContradiction",
    layer: "EVIDENTIARY",
    description: "Explicit incompatibility between preserved assertions; contradiction does not silently resolve which assertion is correct.",
    invariants: ["LE-101", "LE-102", "LE-103", "LE-105", "LE-107"],
    mayReference: ["LEAssertion", "LEEvidenceItem", "LEDerivation"],
  }),

  LECorroboration: define({
    type: "LECorroboration",
    layer: "EVIDENTIARY",
    description: "Corroborative support whose independence and strength are bounded by provenance origins.",
    invariants: ["LE-101", "LE-103", "LE-104", "LE-105", "LE-106", "LE-107"],
    mayReference: ["LEAssertion", "LEEvidenceItem", "LESourceRecord", "LEProvenanceRecord", "LEDerivation"],
  }),

  LEAuditFinding: define({
    type: "LEAuditFinding",
    layer: "INSTITUTIONAL_OUTCOME",
    description: "Audit or validation finding that remains traceable to evidence and derivation and does not overwrite source resources.",
    invariants: ["LE-101", "LE-102", "LE-103", "LE-104", "LE-105", "LE-106", "LE-107"],
    mayReference: ["LEEvidenceItem", "LEProvenanceRecord", "LEDerivation", "LEAssertion", "LEContradiction", "LECorroboration"],
  }),

  LEProvenanceRecord: define({
    type: "LEProvenanceRecord",
    layer: "EVIDENTIARY",
    description: "Origin and parentage record used to preserve lineage, determine independence, and bound finding strength.",
    invariants: ["LE-101", "LE-103", "LE-104", "LE-105", "LE-106"],
    mayReference: ["LESourceRecord", "LEEvidenceItem", "LEDerivation", "LEProvenanceRecord"],
  }),

  LEDerivation: define({
    type: "LEDerivation",
    layer: "INTERPRETIVE",
    description: "Explicit transformation from input resources to output resources under a named rule, with uncertainty change separately recorded.",
    invariants: ["LE-101", "LE-102", "LE-103", "LE-104", "LE-105", "LE-106", "LE-107"],
    mayReference: [...LE_CANONICAL_RESOURCE_TYPES],
  }),
} as const satisfies Record<
  LECanonicalResourceType,
  LECanonicalResourceDescriptor
>;

export type LECanonicalRegistry = typeof LE_CANONICAL_RESOURCE_REGISTRY;

export const isLECanonicalResourceType = (
  value: string,
): value is LECanonicalResourceType =>
  Object.prototype.hasOwnProperty.call(LE_CANONICAL_RESOURCE_REGISTRY, value);

export const getLECanonicalResourceDescriptor = (
  type: LECanonicalResourceType,
): LECanonicalResourceDescriptor => LE_CANONICAL_RESOURCE_REGISTRY[type];

export const getLEResourceTypesByLayer = (
  layer: LECanonicalLayer,
): readonly LECanonicalResourceType[] =>
  LE_CANONICAL_RESOURCE_TYPES.filter(
    (type) => LE_CANONICAL_RESOURCE_REGISTRY[type].layer === layer,
  );

export const getLEResourceTypesForInvariant = (
  invariant: LEFoundationalInvariantId,
): readonly LECanonicalResourceType[] =>
  LE_CANONICAL_RESOURCE_TYPES.filter((type) =>
    LE_CANONICAL_RESOURCE_REGISTRY[type].invariants.includes(invariant as never),
  );

export interface LERegistryValidationIssue {
  readonly type: LECanonicalResourceType;
  readonly message: string;
}

export interface LERegistryValidationResult {
  readonly valid: boolean;
  readonly issues: readonly LERegistryValidationIssue[];
}

/**
 * Structural self-check for the registry itself.
 * This does not validate individual resource instances.
 */
export function validateLECanonicalResourceRegistry(): LERegistryValidationResult {
  const issues: LERegistryValidationIssue[] = [];
  const knownTypes = new Set<string>(LE_CANONICAL_RESOURCE_TYPES);

  for (const type of LE_CANONICAL_RESOURCE_TYPES) {
    const descriptor = LE_CANONICAL_RESOURCE_REGISTRY[type];

    if (descriptor.type !== type) {
      issues.push({ type, message: `Registry key/type mismatch: ${descriptor.type}` });
    }

    if (!descriptor.description.trim()) {
      issues.push({ type, message: "Description cannot be empty" });
    }

    if (descriptor.invariants.length === 0) {
      issues.push({ type, message: "At least one foundational invariant must apply" });
    }

    for (const referenceType of descriptor.mayReference) {
      if (!knownTypes.has(referenceType)) {
        issues.push({ type, message: `Unknown reference type: ${referenceType}` });
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Higher-order registry rule:
 * A derivation may add interpretation, but it may not erase, strengthen, or
 * refine its inputs beyond what separately validated evidence supports.
 */
export const LE_CANONICAL_RESOURCE_RULE =
  "Derived resources may add interpretation but must preserve traceable inputs; provenance bounds strength and temporal precision." as const;
