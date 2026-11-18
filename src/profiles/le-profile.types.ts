import { type FailureCode, Status, type ValidationResult } from "../../validation/result";

export const LE_PROFILE_ID = "LE" as const;
export const LE_PROFILE_VERSION = "1.0.0" as const;
export type LEProfileId = typeof LE_PROFILE_ID;
export type LEProfileVersion = typeof LE_PROFILE_VERSION;

declare const idBrand: unique symbol;
type BrandedId<K extends string> = string & { readonly [idBrand]: K };
export type ActorId = BrandedId<"ActorId">;
export type EvidenceId = BrandedId<"EvidenceId">;
export type FactorId = BrandedId<"FactorId">;
export type PurposeId = BrandedId<"PurposeId">;
export type TraceId = BrandedId<"TraceId">;

export enum LEPurposeAuthorization { AUTHORIZED="AUTHORIZED", DENIED="DENIED", UNDETERMINED="UNDETERMINED" }
export interface LEPurpose { readonly id: PurposeId; readonly description: string; readonly authorization: LEPurposeAuthorization; }
export enum LEAuthorizationState { AUTHORIZED="AUTHORIZED", DENIED="DENIED", UNDETERMINED="UNDETERMINED" }
export interface LEAuthority { readonly actorId: ActorId; readonly role: string; readonly action: string; readonly scope: readonly string[]; readonly state: LEAuthorizationState; }
export enum LEEvidenceRelevance { RELEVANT="RELEVANT", IRRELEVANT="IRRELEVANT", UNDETERMINED="UNDETERMINED" }
export interface LEEvidenceReference { readonly id: EvidenceId; readonly validation: Readonly<ValidationResult>; readonly relevance: LEEvidenceRelevance; }
export interface LEFactor { readonly id: FactorId; readonly value: unknown; readonly evidence: readonly LEEvidenceReference[]; }
export enum LEFactorClassification { PERMITTED="PERMITTED", PROTECTED_TRAIT="PROTECTED_TRAIT", PROHIBITED_PROXY="PROHIBITED_PROXY", UNDETERMINED="UNDETERMINED" }
export interface LEFactorPolicy { readonly factorId: FactorId; readonly classification: LEFactorClassification; }
export type LEOutputRequest =
  | { readonly kind:"INFORMATION" }
  | { readonly kind:"RECOMMENDATION"; readonly humanReviewRequired:true }
  | { readonly kind:"GUILT" }
  | { readonly kind:"DANGEROUSNESS" }
  | { readonly kind:"ENFORCEMENT_ACTION" };
export type LEAuditState =
  | { readonly status:Status.VALID; readonly traceId:TraceId }
  | { readonly status:Status.INVALID; readonly traceId?:TraceId; readonly failure?:FailureCode }
  | { readonly status:Status.INDETERMINATE; readonly traceId?:TraceId; readonly failure?:FailureCode };
export type LEReviewState =
  | { readonly status:"AVAILABLE"; readonly reviewable:true }
  | { readonly status:"UNAVAILABLE"; readonly reviewable:boolean }
  | { readonly status:"INDETERMINATE"; readonly reviewable:boolean };
export interface LEProfileInput { readonly purpose:LEPurpose|null; readonly authority:LEAuthority|null; readonly factors:readonly LEFactor[]; readonly factorPolicies:readonly LEFactorPolicy[]; readonly output:LEOutputRequest; readonly audit:LEAuditState; readonly review:LEReviewState; }

export enum LEFailureCode {
  PURPOSE_MISSING="LE_PURPOSE_MISSING", PURPOSE_INVALID="LE_PURPOSE_INVALID",
  AUTHORITY_MISSING="LE_AUTHORITY_MISSING", AUTHORITY_INVALID="LE_AUTHORITY_INVALID",
  EVIDENCE_MISSING="LE_EVIDENCE_MISSING", EVIDENCE_INVALID="LE_EVIDENCE_INVALID", EVIDENCE_CONFLICT="LE_EVIDENCE_CONFLICT", INSUFFICIENT_EVIDENCE="LE_INSUFFICIENT_EVIDENCE",
  IRRELEVANT_FACTOR="LE_IRRELEVANT_FACTOR", RELEVANCE_UNDETERMINED="LE_RELEVANCE_UNDETERMINED",
  FACTOR_POLICY_MISSING="LE_FACTOR_POLICY_MISSING", FACTOR_POLICY_CONFLICT="LE_FACTOR_POLICY_CONFLICT",
  PROTECTED_TRAIT="LE_PROTECTED_TRAIT", PROTECTED_TRAIT_PROXY="LE_PROTECTED_TRAIT_PROXY",
  GUILT_INFERENCE="LE_GUILT_INFERENCE", DANGEROUSNESS_INFERENCE="LE_DANGEROUSNESS_INFERENCE",
  HUMAN_REVIEW_REQUIRED="LE_HUMAN_REVIEW_REQUIRED", AUDIT_INVALID="LE_AUDIT_INVALID", REVIEWABILITY_INVALID="LE_REVIEWABILITY_INVALID"
}
export type LEGuardId = "G_purpose"|"G_authority"|"G_evidence"|"G_relevance"|"G_fairness"|"G_output"|"G_human"|"G_audit";
export type LEGuardResult =
  | { readonly guard:LEGuardId; readonly status:Status.VALID }
  | { readonly guard:LEGuardId; readonly status:Status.INVALID; readonly failure:LEFailureCode; readonly details?:string }
  | { readonly guard:LEGuardId; readonly status:Status.INDETERMINATE; readonly failure:LEFailureCode; readonly details?:string };
export const leGuardValid=(guard:LEGuardId):LEGuardResult=>({guard,status:Status.VALID});
export const leGuardInvalid=(guard:LEGuardId,failure:LEFailureCode,details?:string):LEGuardResult=>details===undefined?{guard,status:Status.INVALID,failure}:{guard,status:Status.INVALID,failure,details};
export const leGuardIndeterminate=(guard:LEGuardId,failure:LEFailureCode,details?:string):LEGuardResult=>details===undefined?{guard,status:Status.INDETERMINATE,failure}:{guard,status:Status.INDETERMINATE,failure,details};
export enum LEOutputDisposition { REVIEW="REVIEW", HOLD="HOLD", REJECT="REJECT" }
interface LEProfileResultBase { readonly profile:LEProfileId; readonly version:LEProfileVersion; readonly guards:readonly LEGuardResult[]; readonly evidenceFailures:readonly FailureCode[]; }
export interface LEValidProfileResult extends LEProfileResultBase { readonly status:Status.VALID; readonly disposition:LEOutputDisposition.REVIEW; readonly failures:readonly []; }
export interface LEIndeterminateProfileResult extends LEProfileResultBase { readonly status:Status.INDETERMINATE; readonly disposition:LEOutputDisposition.HOLD; readonly failures:readonly LEFailureCode[]; }
export interface LEInvalidProfileResult extends LEProfileResultBase { readonly status:Status.INVALID; readonly disposition:LEOutputDisposition.REJECT; readonly failures:readonly LEFailureCode[]; }
export type LEProfileResult=LEValidProfileResult|LEIndeterminateProfileResult|LEInvalidProfileResult;
export type LEProofObligationId = "purposeExists"|"purposeIdentified"|"purposeAuthorized"|"actorIdentified"|"roleEstablished"|"actionIdentified"|"scopeEstablished"|"authorityCurrent"|"evidencePresent"|"evidenceValid"|"contextMatched"|"evidenceRelevant"|"classificationPresent"|"classificationUnique"|"classificationPermitted"|"outputPermitted"|"outputReviewable"|"reviewAvailable"|"auditValid";
export interface LEProofObligation { readonly id:LEProofObligationId; readonly guard:LEGuardId; readonly required:true; }
export type LEProofObligationResult =
  | {readonly obligation:LEProofObligationId;readonly status:Status.VALID}
  | {readonly obligation:LEProofObligationId;readonly status:Status.INVALID;readonly failure:LEFailureCode}
  | {readonly obligation:LEProofObligationId;readonly status:Status.INDETERMINATE;readonly failure:LEFailureCode};
