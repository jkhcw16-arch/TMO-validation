/**
 * TMO-ED Continuous Analysis.
 * Analysis is a cross-lifecycle assessment layer, not a source-of-truth mutation.
 */
export type EDAnalysisStatus = "ASSESSED" | "PARTIALLY_ASSESSED" | "NOT_ASSESSED" | "INDETERMINATE" | "INVALID";
export type EDAnalysisMethod = "HUMAN" | "SEARCH" | "STATISTICAL" | "ANALYTICS" | "MACHINE_LEARNING" | "GENERATIVE_AI" | "HYBRID" | "OTHER";
export type EDAnalysisFindingStatus = "SUPPORTED" | "PARTIALLY_SUPPORTED" | "CONTESTED" | "INCONCLUSIVE" | "INDETERMINATE";
export type EDAnalysisLifecycleArea = "IDENTIFICATION" | "PRESERVATION" | "COLLECTION" | "PROCESSING" | "REVIEW" | "PRIVILEGE" | "REDACTION" | "PRODUCTION" | "PRESENTATION" | "DISPOSITION" | "CROSS_LIFECYCLE";

export interface EDAnalysisFinding {
  readonly id: string;
  readonly proposition: string;
  readonly status: EDAnalysisFindingStatus;
  readonly supportingResourceIds: readonly string[];
  readonly contradictingResourceIds: readonly string[];
  readonly limitationIds: readonly string[];
}
export interface EDAnalysisRecord {
  readonly id: string;
  readonly matterId: string;
  readonly lifecycleArea: EDAnalysisLifecycleArea;
  readonly targetResourceIds: readonly string[];
  readonly method: EDAnalysisMethod;
  readonly methodRef?: string;
  readonly performedBy: string;
  readonly performedAt?: string;
  readonly authorizationId?: string;
  readonly findingIds: readonly string[];
  readonly sourceRefs: readonly string[];
  readonly derivationRef: string;
  readonly auditRef: string;
  readonly exceptionIds: readonly string[];
}
export interface EDAnalysisAuthorization {
  readonly id: string; readonly actorId: string; readonly matterId: string; readonly action: "ANALYZE" | string;
  readonly resourceIds: readonly string[];
  readonly state: "AUTHORIZED" | "AUTHORIZED_WITH_LIMITATIONS" | "NOT_AUTHORIZED" | "EXPIRED" | "REVOKED" | "INDETERMINATE";
}
export interface EDAnalysisContext {
  readonly matterId: string;
  readonly resourceIds: ReadonlySet<string>;
  readonly sourceRecordIds: ReadonlySet<string>;
  readonly derivationRefs: ReadonlySet<string>;
  readonly auditRefs: ReadonlySet<string>;
  readonly limitationIds: ReadonlySet<string>;
  readonly exceptionIds: ReadonlySet<string>;
  readonly findings: readonly EDAnalysisFinding[];
  readonly authorizations: readonly EDAnalysisAuthorization[];
}
export interface EDAnalysisEvaluation {
  readonly analysisId: string;
  readonly status: EDAnalysisStatus;
  readonly reasons: readonly string[];
  readonly limitations: readonly string[];
  readonly findingCount: number;
}
export const ED_ANALYSIS_INVARIANTS = {
  "ED-AN-101": "Analysis may occur throughout the ED lifecycle and remains traceable to its target resources.",
  "ED-AN-102": "An analysis finding is a derived proposition, not a source record or established truth merely because it was generated.",
  "ED-AN-103": "Human, analytic, statistical, ML, and generative-AI methods remain explicitly identified.",
  "ED-AN-104": "AI-generated analysis does not become a final review, privilege, production, or legal determination without the corresponding domain decision.",
  "ED-AN-105": "Supporting, contradicting, and limiting resources remain independently addressable.",
  "ED-AN-106": "Unknown, contested, and inconclusive analysis remains explicit and cannot be converted to zero or pass.",
  "ED-AN-107": "Analysis cannot overwrite preservation, collection, processing, review, production, or source provenance.",
  "ED-AN-108": "Analysis authorization is actor-, matter-, action-, and target-specific."
} as const;

const text=(v:string|undefined)=>v!==undefined&&v.trim().length>0;
const time=(v:string|undefined)=>v!==undefined&&Number.isFinite(Date.parse(v));
const dup=(v:readonly string[])=>new Set(v).size!==v.length;
const known=(v:readonly string[],s:ReadonlySet<string>)=>v.every((x)=>s.has(x));

export function evaluateEDAnalysis(record: EDAnalysisRecord, context: EDAnalysisContext): EDAnalysisEvaluation {
  const reasons:string[]=[], limitations:string[]=[];
  if(!text(record.id)||!text(record.performedBy)||!text(record.derivationRef)||!text(record.auditRef)) reasons.push("Analysis ID, performer, derivation, and audit references are required.");
  if(record.matterId!==context.matterId) reasons.push("Analysis matter does not match evaluation context.");
  if(record.targetResourceIds.length===0) reasons.push("Analysis requires at least one target resource.");
  if(!known(record.targetResourceIds,context.resourceIds)) reasons.push("Analysis references an unknown target resource.");
  if(!known(record.sourceRefs,context.sourceRecordIds)) reasons.push("Analysis references an unknown source record.");
  if(!context.derivationRefs.has(record.derivationRef)) reasons.push("Analysis derivation reference is not addressable.");
  if(!context.auditRefs.has(record.auditRef)) reasons.push("Analysis audit reference is not addressable.");
  if(!known(record.exceptionIds,context.exceptionIds)) reasons.push("Analysis references an unknown exception.");
  if(!time(record.performedAt)) limitations.push("Analysis time is missing or invalid.");
  if(dup(record.targetResourceIds)||dup(record.findingIds)||dup(record.sourceRefs)||dup(record.exceptionIds)) reasons.push("Analysis contains duplicate references.");
  if(["MACHINE_LEARNING","GENERATIVE_AI","STATISTICAL","ANALYTICS","SEARCH"].includes(record.method)&&!text(record.methodRef)) reasons.push("Technology-assisted analysis requires an addressable method reference.");

  const auth=record.authorizationId?context.authorizations.find((a)=>a.id===record.authorizationId):undefined;
  if(!auth) reasons.push("An addressable ANALYZE authorization is required.");
  else {
    if(auth.action!=="ANALYZE") reasons.push("Authorization action must be ANALYZE.");
    if(auth.actorId!==record.performedBy) reasons.push("Analysis authorization actor does not match performer.");
    if(auth.matterId!==record.matterId) reasons.push("Analysis authorization matter does not match analysis matter.");
    if(!record.targetResourceIds.every((id)=>auth.resourceIds.includes(id))) reasons.push("Analysis authorization does not cover every target resource.");
    if(["NOT_AUTHORIZED","EXPIRED","REVOKED"].includes(auth.state)) reasons.push(`Analysis authorization is ${auth.state}.`);
    if(auth.state==="INDETERMINATE") limitations.push("Analysis authorization is indeterminate.");
    if(auth.state==="AUTHORIZED_WITH_LIMITATIONS") limitations.push("Analysis authorization contains limitations.");
  }

  const findingMap=new Map(context.findings.map((f)=>[f.id,f]));
  for(const id of record.findingIds) if(!findingMap.has(id)) reasons.push(`Analysis finding ${id} is not addressable.`);
  const findings=context.findings.filter((f)=>record.findingIds.includes(f.id));
  for(const finding of findings){
    if(!text(finding.proposition)) reasons.push(`Analysis finding ${finding.id} requires a proposition.`);
    if(dup(finding.supportingResourceIds)||dup(finding.contradictingResourceIds)||dup(finding.limitationIds)) reasons.push(`Analysis finding ${finding.id} contains duplicate references.`);
    if(!known(finding.supportingResourceIds,context.resourceIds)||!known(finding.contradictingResourceIds,context.resourceIds)) reasons.push(`Analysis finding ${finding.id} references an unknown supporting or contradicting resource.`);
    if(!known(finding.limitationIds,context.limitationIds)) reasons.push(`Analysis finding ${finding.id} references an unknown limitation.`);
    if(finding.status==="SUPPORTED"&&finding.supportingResourceIds.length===0) reasons.push(`SUPPORTED finding ${finding.id} requires supporting resources.`);
    if(finding.status==="CONTESTED"&&(finding.supportingResourceIds.length===0||finding.contradictingResourceIds.length===0)) reasons.push(`CONTESTED finding ${finding.id} requires supporting and contradicting resources.`);
    if(finding.status==="PARTIALLY_SUPPORTED"&&finding.supportingResourceIds.length===0) reasons.push(`PARTIALLY_SUPPORTED finding ${finding.id} requires supporting resources.`);
    if(["INCONCLUSIVE","INDETERMINATE"].includes(finding.status)) limitations.push(`Analysis finding ${finding.id} remains ${finding.status}.`);
  }
  if(record.findingIds.length===0) limitations.push("Analysis contains no findings.");

  if(reasons.length) return {analysisId:record.id,status:"INVALID",reasons,limitations,findingCount:findings.length};
  if(auth?.state==="INDETERMINATE"||findings.some((f)=>f.status==="INDETERMINATE")) return {analysisId:record.id,status:"INDETERMINATE",reasons,limitations,findingCount:findings.length};
  if(record.findingIds.length===0) return {analysisId:record.id,status:"NOT_ASSESSED",reasons,limitations,findingCount:0};
  if(limitations.length||record.exceptionIds.length||findings.some((f)=>["PARTIALLY_SUPPORTED","CONTESTED","INCONCLUSIVE"].includes(f.status))) return {analysisId:record.id,status:"PARTIALLY_ASSESSED",reasons,limitations,findingCount:findings.length};
  return {analysisId:record.id,status:"ASSESSED",reasons,limitations,findingCount:findings.length};
}
