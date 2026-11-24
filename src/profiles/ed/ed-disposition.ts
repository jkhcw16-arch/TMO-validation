/**
 * TMO-ED Disposition evaluator.
 * Disposition is explicit, authorized, preservation-aware, and auditable.
 */
export type EDDispositionAction = "RETAIN" | "DELETE" | "TRANSFER" | "RETURN" | "ARCHIVE" | "RELEASE_HOLD";
export type EDDispositionStatus = "DISPOSED" | "PARTIALLY_DISPOSED" | "NOT_DISPOSED" | "INDETERMINATE" | "INVALID";
export type EDHoldState = "ACTIVE" | "PARTIALLY_RELEASED" | "RELEASED" | "INDETERMINATE";

export interface EDDispositionRecord {
  readonly id: string;
  readonly matterId: string;
  readonly action: EDDispositionAction;
  readonly targetResourceIds: readonly string[];
  readonly performedBy: string;
  readonly performedAt?: string;
  readonly authorizationId?: string;
  readonly retentionPolicyRef?: string;
  readonly holdReleaseRef?: string;
  readonly transferDestinationRef?: string;
  readonly returnRecipientRef?: string;
  readonly sourceRefs: readonly string[];
  readonly auditRef: string;
  readonly exceptionIds: readonly string[];
  readonly completed: boolean;
}
export interface EDDispositionAuthorization {
  readonly id: string;
  readonly actorId: string;
  readonly matterId: string;
  readonly action: string;
  readonly resourceIds: readonly string[];
  readonly state: "AUTHORIZED" | "AUTHORIZED_WITH_LIMITATIONS" | "NOT_AUTHORIZED" | "EXPIRED" | "REVOKED" | "INDETERMINATE";
}
export interface EDDispositionContext {
  readonly matterId: string;
  readonly resourceIds: ReadonlySet<string>;
  readonly sourceRecordIds: ReadonlySet<string>;
  readonly auditRefs: ReadonlySet<string>;
  readonly exceptionIds: ReadonlySet<string>;
  readonly retentionPolicyRefs: ReadonlySet<string>;
  readonly holdReleaseRefs: ReadonlySet<string>;
  readonly destinationRefs: ReadonlySet<string>;
  readonly recipientRefs: ReadonlySet<string>;
  readonly holdStates: ReadonlyMap<string, EDHoldState>;
  readonly authorizations: readonly EDDispositionAuthorization[];
}
export interface EDDispositionEvaluation {
  readonly dispositionId: string;
  readonly status: EDDispositionStatus;
  readonly reasons: readonly string[];
  readonly limitations: readonly string[];
  readonly affectedResourceCount: number;
}
export const ED_DISPOSITION_INVARIANTS = {
  "ED-DISP-101": "Disposition is a separately addressable action and never silently follows matter closure or another lifecycle state.",
  "ED-DISP-102": "Disposition authorization is actor-, matter-, action-, resource-, and time-specific.",
  "ED-DISP-103": "DELETE, RETURN, TRANSFER, ARCHIVE, RETAIN, and RELEASE_HOLD remain distinct actions.",
  "ED-DISP-104": "Destructive or relinquishing action cannot proceed over an active or indeterminate preservation hold.",
  "ED-DISP-105": "Disposition preserves audit, policy, source, and exception lineage even when the underlying data is deleted, returned, or transferred.",
  "ED-DISP-106": "Transfer and return require explicit destination or recipient identity.",
  "ED-DISP-107": "Unknown or partial hold/release state remains explicit and cannot become authorization to dispose.",
  "ED-DISP-108": "Disposition does not determine evidentiary truth, discoverability, privilege, admissibility, or legal merits."
} as const;

const text=(v:string|undefined)=>v!==undefined&&v.trim().length>0;
const time=(v:string|undefined)=>v!==undefined&&Number.isFinite(Date.parse(v));
const dup=(v:readonly string[])=>new Set(v).size!==v.length;
const known=(v:readonly string[],s:ReadonlySet<string>)=>v.every((x)=>s.has(x));
const authAction=(action:EDDispositionAction)=>action;
const requiresReleasedHold=(action:EDDispositionAction)=>["DELETE","RETURN","TRANSFER","RELEASE_HOLD"].includes(action);

export function evaluateEDDisposition(record: EDDispositionRecord, context: EDDispositionContext): EDDispositionEvaluation {
  const reasons:string[]=[], limitations:string[]=[];
  if(!text(record.id)||!text(record.performedBy)||!text(record.auditRef)) reasons.push("Disposition ID, performer, and audit reference are required.");
  if(record.matterId!==context.matterId) reasons.push("Disposition matter does not match evaluation context.");
  if(record.targetResourceIds.length===0) reasons.push("Disposition requires at least one target resource.");
  if(!known(record.targetResourceIds,context.resourceIds)) reasons.push("Disposition references an unknown target resource.");
  if(!known(record.sourceRefs,context.sourceRecordIds)) reasons.push("Disposition references an unknown source record.");
  if(!context.auditRefs.has(record.auditRef)) reasons.push("Disposition audit reference is not addressable.");
  if(!known(record.exceptionIds,context.exceptionIds)) reasons.push("Disposition references an unknown exception.");
  if(dup(record.targetResourceIds)||dup(record.sourceRefs)||dup(record.exceptionIds)) reasons.push("Disposition contains duplicate references.");
  if(!time(record.performedAt)) limitations.push("Disposition time is missing or invalid.");

  if(record.retentionPolicyRef&&!context.retentionPolicyRefs.has(record.retentionPolicyRef)) reasons.push("Disposition references an unknown retention policy.");
  if(record.holdReleaseRef&&!context.holdReleaseRefs.has(record.holdReleaseRef)) reasons.push("Disposition references an unknown hold release.");
  if(record.action==="TRANSFER"){
    if(!text(record.transferDestinationRef)) reasons.push("TRANSFER requires a destination reference.");
    else if(!context.destinationRefs.has(record.transferDestinationRef)) reasons.push("TRANSFER destination is not addressable.");
  }
  if(record.action==="RETURN"){
    if(!text(record.returnRecipientRef)) reasons.push("RETURN requires a recipient reference.");
    else if(!context.recipientRefs.has(record.returnRecipientRef)) reasons.push("RETURN recipient is not addressable.");
  }
  if(record.action==="RETAIN"||record.action==="ARCHIVE"){
    if(!text(record.retentionPolicyRef)) limitations.push(`${record.action} has no explicit retention policy reference.`);
  }
  if(record.action==="RELEASE_HOLD"&&!text(record.holdReleaseRef)) reasons.push("RELEASE_HOLD requires an addressable hold-release reference.");

  const auth=record.authorizationId?context.authorizations.find((a)=>a.id===record.authorizationId):undefined;
  if(!auth) reasons.push(`An addressable ${authAction(record.action)} authorization is required.`);
  else {
    if(auth.action!==authAction(record.action)) reasons.push(`Authorization action must be ${authAction(record.action)}.`);
    if(auth.actorId!==record.performedBy) reasons.push("Disposition authorization actor does not match performer.");
    if(auth.matterId!==record.matterId) reasons.push("Disposition authorization matter does not match disposition matter.");
    if(!record.targetResourceIds.every((id)=>auth.resourceIds.includes(id))) reasons.push("Disposition authorization does not cover every target resource.");
    if(["NOT_AUTHORIZED","EXPIRED","REVOKED"].includes(auth.state)) reasons.push(`Disposition authorization is ${auth.state}.`);
    if(auth.state==="INDETERMINATE") limitations.push("Disposition authorization is indeterminate.");
    if(auth.state==="AUTHORIZED_WITH_LIMITATIONS") limitations.push("Disposition authorization contains limitations.");
  }

  if(requiresReleasedHold(record.action)){
    for(const id of record.targetResourceIds){
      const hold=context.holdStates.get(id)??"INDETERMINATE";
      if(hold==="ACTIVE") reasons.push(`Target ${id} remains under an active preservation hold.`);
      if(hold==="PARTIALLY_RELEASED") reasons.push(`Target ${id} has only a partially released preservation hold.`);
      if(hold==="INDETERMINATE") limitations.push(`Preservation-hold state for target ${id} is indeterminate.`);
    }
  }

  if(reasons.length) return {dispositionId:record.id,status:"INVALID",reasons,limitations,affectedResourceCount:record.targetResourceIds.length};
  if(auth?.state==="INDETERMINATE"||limitations.some((x)=>x.includes("hold state")||x.includes("Preservation-hold"))) return {dispositionId:record.id,status:"INDETERMINATE",reasons,limitations,affectedResourceCount:record.targetResourceIds.length};
  if(!record.completed) return {dispositionId:record.id,status:"NOT_DISPOSED",reasons,limitations,affectedResourceCount:record.targetResourceIds.length};
  if(limitations.length||record.exceptionIds.length) return {dispositionId:record.id,status:"PARTIALLY_DISPOSED",reasons,limitations,affectedResourceCount:record.targetResourceIds.length};
  return {dispositionId:record.id,status:"DISPOSED",reasons,limitations,affectedResourceCount:record.targetResourceIds.length};
}
