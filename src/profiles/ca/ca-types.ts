/**
 * TMO-CA Constitutional Analysis core types.
 *
 * CA keeps constitutional text, legal authority, precedent, doctrine,
 * justiciability, factual predicates, application, remedy, and conclusion
 * analytically distinct. TMO-LE evidence outputs may be referenced but do not
 * independently establish constitutional conclusions.
 */

export const CA_CANONICAL_RESOURCE_TYPES = [
  "CAIssue",
  "CAConstitutionalProvision",
  "CAClaim",
  "CAAuthority",
  "CAPrecedent",
  "CADoctrine",
  "CAStandardOfReview",
  "CAJusticiabilityFinding",
  "CAApplication",
  "CACounterargument",
  "CARemedy",
  "CAConclusion",
] as const;

export type CACanonicalResourceType =
  (typeof CA_CANONICAL_RESOURCE_TYPES)[number];

export type CAAuthorityType =
  | "CONSTITUTIONAL_TEXT"
  | "SUPREME_COURT_PRECEDENT"
  | "FEDERAL_APPELLATE_PRECEDENT"
  | "FEDERAL_DISTRICT_PRECEDENT"
  | "STATE_PRECEDENT"
  | "HISTORICAL_PRACTICE"
  | "SECONDARY_AUTHORITY";

export type CABindingStatus =
  | "BINDING"
  | "PERSUASIVE"
  | "NONBINDING"
  | "INDETERMINATE";

export type CACurrentAuthorityStatus =
  | "CONTROLLING"
  | "LIMITED"
  | "DISTINGUISHED"
  | "SUPERSEDED"
  | "OVERRULED"
  | "INDETERMINATE";

export type CAJusticiabilityDimension =
  | "STANDING"
  | "RIPENESS"
  | "MOOTNESS"
  | "POLITICAL_QUESTION";

export type CAJusticiabilityStatus =
  | "SATISFIED"
  | "PARTIALLY_SATISFIED"
  | "NOT_SATISFIED"
  | "INDETERMINATE";

export type CAConclusionDirection =
  | "CONSTITUTIONAL"
  | "UNCONSTITUTIONAL"
  | "NO_MERITS_DETERMINATION";

export type CAConclusionStatus =
  | "SUPPORTED"
  | "PARTIALLY_SUPPORTED"
  | "CONTESTED"
  | "INDETERMINATE";

export type CARemedyStatus =
  | "AVAILABLE"
  | "PARTIALLY_AVAILABLE"
  | "UNAVAILABLE"
  | "INDETERMINATE";

export interface CABaseResource {
  readonly id: string;
  readonly type: CACanonicalResourceType;
  readonly derivationId: string;
  readonly auditRef: string;
}

export interface CAIssue extends CABaseResource {
  readonly type: "CAIssue";
  readonly question: string;
  readonly provisionIds: readonly string[];
  readonly claimIds: readonly string[];
}

export interface CAConstitutionalProvision extends CABaseResource {
  readonly type: "CAConstitutionalProvision";
  readonly article: string | null;
  readonly amendment: string | null;
  readonly section: string | null;
  readonly clause: string | null;
  readonly sourceRef: string;
}

export interface CAClaim extends CABaseResource {
  readonly type: "CAClaim";
  readonly issueId: string;
  readonly proposition: string;
  readonly provisionIds: readonly string[];
  readonly authorityIds: readonly string[];
}

export interface CAAuthority extends CABaseResource {
  readonly type: "CAAuthority";
  readonly authorityType: CAAuthorityType;
  readonly citation: string;
  readonly sourceRef: string;
  readonly jurisdiction: string;
  readonly bindingStatus: CABindingStatus;
  readonly currentStatus: CACurrentAuthorityStatus;
  readonly leEvidenceIds: readonly string[];
}

export interface CAPrecedent extends CABaseResource {
  readonly type: "CAPrecedent";
  readonly authorityId: string;
  readonly caseName: string;
  readonly court: string;
  readonly citation: string;
  readonly relevantFactIds: readonly string[];
  readonly questionPresented: string;
  readonly holding: string;
  readonly rationale: string;
  readonly scope: string;
  readonly laterTreatmentAuthorityIds: readonly string[];
  readonly supportedClaimIds: readonly string[];
  readonly sourceRefs: readonly string[];
}

export interface CADoctrine extends CABaseResource {
  readonly type: "CADoctrine";
  readonly name: string;
  readonly provisionIds: readonly string[];
  readonly authorityIds: readonly string[];
  readonly elementIds: readonly string[];
  readonly exceptionIds: readonly string[];
}

export interface CAStandardOfReview extends CABaseResource {
  readonly type: "CAStandardOfReview";
  readonly name: string;
  readonly issueId: string;
  readonly authorityIds: readonly string[];
  readonly requirementIds: readonly string[];
}

export interface CAJusticiabilityDimensionFinding {
  readonly dimension: CAJusticiabilityDimension;
  readonly status: CAJusticiabilityStatus;
  readonly authorityIds: readonly string[];
  readonly evidenceIds: readonly string[];
}

export interface CAJusticiabilityFinding extends CABaseResource {
  readonly type: "CAJusticiabilityFinding";
  readonly issueId: string;
  readonly dimensions: readonly CAJusticiabilityDimensionFinding[];
}

export interface CAApplication extends CABaseResource {
  readonly type: "CAApplication";
  readonly issueId: string;
  readonly doctrineId: string;
  readonly standardOfReviewId: string | null;
  readonly propositionIds: readonly string[];
  readonly factQualificationIds: readonly string[];
  readonly epistemicAssessmentIds: readonly string[];
  readonly authorityIds: readonly string[];
  readonly supportingArgumentIds: readonly string[];
  readonly counterargumentIds: readonly string[];
}

export interface CACounterargument extends CABaseResource {
  readonly type: "CACounterargument";
  readonly issueId: string;
  readonly proposition: string;
  readonly authorityIds: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly responseIds: readonly string[];
  readonly status: CAConclusionStatus;
}

export interface CARemedy extends CABaseResource {
  readonly type: "CARemedy";
  readonly issueId: string;
  readonly description: string;
  readonly status: CARemedyStatus;
  readonly authorityIds: readonly string[];
  readonly requirementIds: readonly string[];
}

export interface CAConclusion extends CABaseResource {
  readonly type: "CAConclusion";
  readonly issueId: string;
  readonly direction: CAConclusionDirection;
  readonly status: CAConclusionStatus;
  readonly controllingAuthorityIds: readonly string[];
  readonly supportingAuthorityIds: readonly string[];
  readonly adverseAuthorityIds: readonly string[];
  readonly applicationIds: readonly string[];
  readonly limitationIds: readonly string[];
}

export type CAResource =
  | CAIssue
  | CAConstitutionalProvision
  | CAClaim
  | CAAuthority
  | CAPrecedent
  | CADoctrine
  | CAStandardOfReview
  | CAJusticiabilityFinding
  | CAApplication
  | CACounterargument
  | CARemedy
  | CAConclusion;

export const CA_INVARIANT_IDS = [
  "CA-101",
  "CA-102",
  "CA-103",
  "CA-104",
  "CA-105",
  "CA-106",
  "CA-107",
  "CA-108",
  "CA-109",
  "CA-110",
] as const;

export type CAInvariantId = (typeof CA_INVARIANT_IDS)[number];

export function isCACanonicalResourceType(
  value: string,
): value is CACanonicalResourceType {
  return (CA_CANONICAL_RESOURCE_TYPES as readonly string[]).includes(value);
}
