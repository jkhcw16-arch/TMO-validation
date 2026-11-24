/**
 * TMO-ED -> TMO-LE bridge.
 * Discovery state establishes handling/provenance lineage only.
 * It never promotes collected/reviewed/produced material into evidentiary truth.
 */

export type EDToLEMappingKind =
  | "SOURCE"
  | "PROVENANCE"
  | "DERIVATION"
  | "QUALIFICATION"
  | "AUTHORIZATION"
  | "TEMPORAL"
  | "UNCERTAINTY"
  | "AUDIT";

export type EDToLEStatus = "MAPPED" | "MAPPED_WITH_LIMITATIONS" | "INDETERMINATE" | "INVALID";

export interface EDToLEInput {
  readonly id: string;
  readonly type:
    | "EDDataSource"
    | "EDPreservationAction"
    | "EDCollection"
    | "EDCollectedItem"
    | "EDProcessingEvent"
    | "EDReviewDecision"
    | "EDPrivilegeAssessment"
    | "EDRedaction"
    | "EDProduction"
    | "EDProductionItem"
    | "EDAnalysis"
    | "EDException"
    | "EDAuthorization";
  readonly matterId: string;
  readonly originId?: string;
  readonly sourceRef?: string;
  readonly parentIds: readonly string[];
  readonly occurredAt?: string;
  readonly operation?: string;
  readonly status?: string;
  readonly representationRef?: string;
  readonly sourceRecordIds: readonly string[];
  readonly exceptionIds: readonly string[];
}

export interface LESourceRecordBridge {
  readonly id: string;
  readonly type: "LESourceRecord";
  readonly originId?: string;
  readonly recordRef: string;
  readonly provenanceRecordIds: readonly string[];
  readonly temporalEntityId?: string;
}

export interface LEProvenanceRecordBridge {
  readonly id: string;
  readonly type: "LEProvenanceRecord";
  readonly resourceId: string;
  readonly originId?: string;
  readonly parentResourceIds: readonly string[];
  readonly derivationId?: string;
}

export interface LEDerivationBridge {
  readonly id: string;
  readonly type: "LEDerivation";
  readonly kind:
    | "EXTRACTION"
    | "NORMALIZATION"
    | "ASSOCIATION"
    | "CLASSIFICATION"
    | "REDACTION"
    | "DISCOVERY_TRANSFORMATION";
  readonly inputResourceIds: readonly string[];
  readonly outputResourceIds: readonly string[];
  readonly ruleId: string;
  readonly uncertainty: "PRESERVED" | "INDETERMINATE";
}

export interface LETemporalEntityBridge {
  readonly id: string;
  readonly type: "LETemporalEntity";
  readonly earliest?: string;
  readonly latest?: string;
  readonly precision: "EXACT" | "UNKNOWN";
  readonly sourceResourceId: string;
}

export interface LEQualificationBridge {
  readonly id: string;
  readonly type: "LEFactQualification";
  readonly resourceId: string;
  readonly origin: "CAPTURED" | "DERIVED";
  readonly evidence: "INDETERMINATE";
  readonly note: string;
}

export interface LEUncertaintyBridge {
  readonly id: string;
  readonly type: "LEUncertainty";
  readonly resourceId: string;
  readonly reason: string;
}

export interface LEAuditFindingBridge {
  readonly id: string;
  readonly type: "LEAuditFinding";
  readonly subjectResourceIds: readonly string[];
  readonly finding: string;
  readonly status: "INDETERMINATE";
}

export interface EDToLEMapping {
  readonly mappingId: string;
  readonly edResourceId: string;
  readonly edResourceType: EDToLEInput["type"];
  readonly mappingKind: EDToLEMappingKind;
  readonly leResourceIds: readonly string[];
}

export interface EDToLEResult {
  readonly status: EDToLEStatus;
  readonly sourceRecords: readonly LESourceRecordBridge[];
  readonly provenanceRecords: readonly LEProvenanceRecordBridge[];
  readonly derivations: readonly LEDerivationBridge[];
  readonly temporalEntities: readonly LETemporalEntityBridge[];
  readonly qualifications: readonly LEQualificationBridge[];
  readonly uncertainties: readonly LEUncertaintyBridge[];
  readonly auditFindings: readonly LEAuditFindingBridge[];
  readonly mappings: readonly EDToLEMapping[];
  readonly reasons: readonly string[];
  readonly limitations: readonly string[];
}

export const ED_TO_LE_INVARIANTS = {
  "ED-LE-101": "Discovery state may establish provenance and handling history but cannot manufacture evidentiary qualification.",
  "ED-LE-102": "ED source, collected, processed, redacted, and produced representations remain separately addressable in LE.",
  "ED-LE-103": "COLLECTED, RESPONSIVE, REVIEWED, and PRODUCED never map directly to SUPPORTED or VERIFIED.",
  "ED-LE-104": "Deduplication or association never establishes provenance independence.",
  "ED-LE-105": "ED transformations map to explicit LE derivations rather than replacing source records.",
  "ED-LE-106": "ED timestamps preserve their available precision and cannot manufacture temporal precision.",
  "ED-LE-107": "ED exceptions and unresolved states map to LE uncertainty/audit records rather than zero or pass."
} as const;

const text = (v: string | undefined): v is string => v !== undefined && v.trim().length > 0;
const validTime = (v: string | undefined) => v !== undefined && Number.isFinite(Date.parse(v));
const duplicates = (v: readonly string[]) => new Set(v).size !== v.length;

function derivationKind(operation: string | undefined): LEDerivationBridge["kind"] {
  switch (operation) {
    case "EXTRACTION":
    case "TEXT_EXTRACTION":
    case "OCR":
    case "METADATA_EXTRACTION":
    case "DECOMPRESSION":
      return "EXTRACTION";
    case "NORMALIZATION":
    case "CONVERSION":
      return "NORMALIZATION";
    case "DEDUPLICATION_GROUPING":
      return "ASSOCIATION";
    case "DE_NISTING":
      return "CLASSIFICATION";
    case "REDACTION":
      return "REDACTION";
    default:
      return "DISCOVERY_TRANSFORMATION";
  }
}

export function mapEDToLE(inputs: readonly EDToLEInput[]): EDToLEResult {
  const sourceRecords: LESourceRecordBridge[] = [];
  const provenanceRecords: LEProvenanceRecordBridge[] = [];
  const derivations: LEDerivationBridge[] = [];
  const temporalEntities: LETemporalEntityBridge[] = [];
  const qualifications: LEQualificationBridge[] = [];
  const uncertainties: LEUncertaintyBridge[] = [];
  const auditFindings: LEAuditFindingBridge[] = [];
  const mappings: EDToLEMapping[] = [];
  const reasons: string[] = [];
  const limitations: string[] = [];

  const ids = new Set<string>();
  for (const input of inputs) {
    if (!text(input.id)) reasons.push("Every ED resource requires an ID before LE mapping.");
    if (ids.has(input.id)) reasons.push(`Duplicate ED resource ID ${input.id}.`);
    ids.add(input.id);
    if (duplicates(input.parentIds) || duplicates(input.sourceRecordIds) || duplicates(input.exceptionIds)) {
      reasons.push(`ED resource ${input.id} contains duplicate lineage references.`);
    }
  }
  if (reasons.length) {
    return { status: "INVALID", sourceRecords, provenanceRecords, derivations, temporalEntities, qualifications, uncertainties, auditFindings, mappings, reasons, limitations };
  }

  for (const input of inputs) {
    const leIds: string[] = [];

    if (validTime(input.occurredAt)) {
      const t: LETemporalEntityBridge = {
        id: `le-time:${input.id}`,
        type: "LETemporalEntity",
        earliest: input.occurredAt,
        latest: input.occurredAt,
        precision: "EXACT",
        sourceResourceId: input.id
      };
      temporalEntities.push(t);
      leIds.push(t.id);
      mappings.push({ mappingId: `map:time:${input.id}`, edResourceId: input.id, edResourceType: input.type, mappingKind: "TEMPORAL", leResourceIds: [t.id] });
    } else if (input.occurredAt !== undefined) {
      limitations.push(`ED resource ${input.id} has an unresolved temporal value.`);
      const u: LEUncertaintyBridge = { id: `le-uncertainty:time:${input.id}`, type: "LEUncertainty", resourceId: input.id, reason: "ED temporal value could not be resolved." };
      uncertainties.push(u);
      leIds.push(u.id);
    }

    const isRepresentation = ["EDDataSource", "EDCollectedItem", "EDProductionItem"].includes(input.type);
    if (isRepresentation) {
      if (!text(input.representationRef) && !text(input.sourceRef)) {
        limitations.push(`ED representation ${input.id} has no addressable representation/source reference.`);
      } else {
        const provId = `le-prov:${input.id}`;
        const src: LESourceRecordBridge = {
          id: `le-source:${input.id}`,
          type: "LESourceRecord",
          originId: input.originId,
          recordRef: input.representationRef ?? input.sourceRef!,
          provenanceRecordIds: [provId],
          temporalEntityId: validTime(input.occurredAt) ? `le-time:${input.id}` : undefined
        };
        const prov: LEProvenanceRecordBridge = {
          id: provId,
          type: "LEProvenanceRecord",
          resourceId: src.id,
          originId: input.originId,
          parentResourceIds: input.parentIds.map((id) => `le-source:${id}`)
        };
        sourceRecords.push(src);
        provenanceRecords.push(prov);
        leIds.push(src.id, prov.id);
        mappings.push({ mappingId: `map:source:${input.id}`, edResourceId: input.id, edResourceType: input.type, mappingKind: "SOURCE", leResourceIds: [src.id] });
        mappings.push({ mappingId: `map:prov:${input.id}`, edResourceId: input.id, edResourceType: input.type, mappingKind: "PROVENANCE", leResourceIds: [prov.id] });
      }
    }

    if (["EDPreservationAction", "EDCollection", "EDProduction"].includes(input.type)) {
      const prov: LEProvenanceRecordBridge = {
        id: `le-prov:${input.id}`,
        type: "LEProvenanceRecord",
        resourceId: input.id,
        originId: input.originId,
        parentResourceIds: input.parentIds
      };
      provenanceRecords.push(prov);
      leIds.push(prov.id);
      mappings.push({ mappingId: `map:prov:${input.id}`, edResourceId: input.id, edResourceType: input.type, mappingKind: "PROVENANCE", leResourceIds: [prov.id] });
    }

    if (["EDProcessingEvent", "EDRedaction", "EDAnalysis"].includes(input.type)) {
      const d: LEDerivationBridge = {
        id: `le-derivation:${input.id}`,
        type: "LEDerivation",
        kind: derivationKind(input.operation ?? (input.type === "EDRedaction" ? "REDACTION" : undefined)),
        inputResourceIds: input.parentIds,
        outputResourceIds: text(input.representationRef) ? [`le-source:${input.id}`] : [],
        ruleId: `ed-to-le:${input.type}`,
        uncertainty: "PRESERVED"
      };
      derivations.push(d);
      leIds.push(d.id);
      mappings.push({ mappingId: `map:derivation:${input.id}`, edResourceId: input.id, edResourceType: input.type, mappingKind: "DERIVATION", leResourceIds: [d.id] });
    }

    if (["EDCollectedItem", "EDReviewDecision", "EDProductionItem", "EDAnalysis"].includes(input.type)) {
      const q: LEQualificationBridge = {
        id: `le-qualification:${input.id}`,
        type: "LEFactQualification",
        resourceId: input.id,
        origin: input.type === "EDAnalysis" ? "DERIVED" : "CAPTURED",
        evidence: "INDETERMINATE",
        note: `${input.type} status does not establish LE evidentiary support.`
      };
      qualifications.push(q);
      leIds.push(q.id);
      mappings.push({ mappingId: `map:qualification:${input.id}`, edResourceId: input.id, edResourceType: input.type, mappingKind: "QUALIFICATION", leResourceIds: [q.id] });
    }

    if (input.type === "EDException" || input.exceptionIds.length > 0 || input.status === "INDETERMINATE") {
      const u: LEUncertaintyBridge = {
        id: `le-uncertainty:${input.id}`,
        type: "LEUncertainty",
        resourceId: input.id,
        reason: input.type === "EDException" ? "ED exception requires downstream qualification." : "ED resource contains unresolved state or exceptions."
      };
      uncertainties.push(u);
      leIds.push(u.id);
      mappings.push({ mappingId: `map:uncertainty:${input.id}`, edResourceId: input.id, edResourceType: input.type, mappingKind: "UNCERTAINTY", leResourceIds: [u.id] });
    }

    if (["RESPONSIVE", "PRODUCED", "COLLECTED", "REVIEWED", "PRIVILEGED"].includes(input.status ?? "")) {
      const audit: LEAuditFindingBridge = {
        id: `le-audit:${input.id}`,
        type: "LEAuditFinding",
        subjectResourceIds: [input.id],
        finding: `${input.status} is an ED workflow state and is not automatically an LE truth/authenticity/support finding.`,
        status: "INDETERMINATE"
      };
      auditFindings.push(audit);
      leIds.push(audit.id);
      mappings.push({ mappingId: `map:audit:${input.id}`, edResourceId: input.id, edResourceType: input.type, mappingKind: "AUDIT", leResourceIds: [audit.id] });
    }
  }

  const status: EDToLEStatus = limitations.length || uncertainties.length ? "MAPPED_WITH_LIMITATIONS" : "MAPPED";
  return { status, sourceRecords, provenanceRecords, derivations, temporalEntities, qualifications, uncertainties, auditFindings, mappings, reasons, limitations };
}
