export const CORE_OUTPUT_CONTRACT = "TMO_CORE_OUTPUT" as const;
export const CORE_OUTPUT_VERSION = "1.0.0" as const;

declare const coreBrand: unique symbol;
type CoreBrand<T extends string> = string & { readonly [coreBrand]: T };
export type CoreEvaluationId = CoreBrand<"CoreEvaluationId">;
export type CoreEvidenceRef = CoreBrand<"CoreEvidenceRef">;
export type CoreAuditRef = CoreBrand<"CoreAuditRef">;
export type CoreExplanationRef = CoreBrand<"CoreExplanationRef">;
export type CoreDigest = CoreBrand<"CoreDigest">;

export enum CoreOutputStatus { VALID="VALID", INVALID="INVALID", INDETERMINATE="INDETERMINATE" }
export type CoreAssertionKind = "OBSERVATION"|"RELATION"|"TEMPORAL_CHANGE"|"CONTEXTUAL_CONDITION"|"UNCERTAINTY";
export type CoreConfidence =
  | { readonly status:"ESTABLISHED"; readonly basis:"EVIDENCE"|"DERIVED" }
  | { readonly status:"LIMITED"; readonly reason:string }
  | { readonly status:"UNDETERMINED"; readonly reason:string };
export interface CoreAssertion { readonly id:string; readonly kind:CoreAssertionKind; readonly statement:string; readonly evidence:readonly CoreEvidenceRef[]; readonly confidence:CoreConfidence; readonly explanation?:CoreExplanationRef; }
export interface CoreOutputEnvelope { readonly contract:typeof CORE_OUTPUT_CONTRACT; readonly contractVersion:typeof CORE_OUTPUT_VERSION; readonly evaluationId:CoreEvaluationId; readonly status:CoreOutputStatus; readonly assertions:readonly CoreAssertion[]; readonly auditRef:CoreAuditRef; readonly limitations:readonly string[]; readonly generatedAt:string; readonly digest:CoreDigest; }

function brand<T extends string>(value:string,label:string):CoreBrand<T>{const v=value.trim();if(!v)throw new TypeError(`${label} cannot be empty`);return v as CoreBrand<T>;}
export const asCoreEvaluationId=(v:string):CoreEvaluationId=>brand<"CoreEvaluationId">(v,"CoreEvaluationId");
export const asCoreEvidenceRef=(v:string):CoreEvidenceRef=>brand<"CoreEvidenceRef">(v,"CoreEvidenceRef");
export const asCoreAuditRef=(v:string):CoreAuditRef=>brand<"CoreAuditRef">(v,"CoreAuditRef");
export const asCoreExplanationRef=(v:string):CoreExplanationRef=>brand<"CoreExplanationRef">(v,"CoreExplanationRef");
export const asCoreDigest=(v:string):CoreDigest=>brand<"CoreDigest">(v,"CoreDigest");
