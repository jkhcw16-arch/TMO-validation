import { Status } from "../../validation/result";
import { LEFailureCode, type LEGuardId, type LEGuardResult, type LEProofObligationId, type LEProofObligationResult } from "./le-profile.types";

export const LE_PROOF_OBLIGATIONS = {
  G_purpose:["purposeExists","purposeIdentified","purposeAuthorized"],
  G_authority:["actorIdentified","roleEstablished","actionIdentified","scopeEstablished","authorityCurrent"],
  G_evidence:["evidencePresent","evidenceValid","contextMatched"], G_relevance:["evidenceRelevant"],
  G_fairness:["classificationPresent","classificationUnique","classificationPermitted"], G_output:["outputPermitted"],
  G_human:["outputReviewable","reviewAvailable"], G_audit:["auditValid"]
} as const satisfies Record<LEGuardId,readonly LEProofObligationId[]>;
export const LE_OBLIGATION_GUARD = Object.fromEntries(Object.entries(LE_PROOF_OBLIGATIONS).flatMap(([g,ids])=>ids.map(id=>[id,g]))) as Record<LEProofObligationId,LEGuardId>;
export const proofValid=(obligation:LEProofObligationId):LEProofObligationResult=>({obligation,status:Status.VALID});
export const proofInvalid=(obligation:LEProofObligationId,failure:LEFailureCode):LEProofObligationResult=>({obligation,status:Status.INVALID,failure});
export const proofIndeterminate=(obligation:LEProofObligationId,failure:LEFailureCode):LEProofObligationResult=>({obligation,status:Status.INDETERMINATE,failure});
export interface LEGuardProofResult {readonly guard:LEGuardId;readonly status:Status;readonly discharged:boolean;readonly obligations:readonly LEProofObligationResult[];readonly failed:readonly LEProofObligationResult[];readonly indeterminate:readonly LEProofObligationResult[];}
export function dischargeLEGuard(guard:LEGuardId,results:readonly LEProofObligationResult[]):LEGuardProofResult {
  const required=LE_PROOF_OBLIGATIONS[guard]; const counts=new Map<LEProofObligationId,number>();
  for(const r of results) counts.set(r.obligation,(counts.get(r.obligation)??0)+1);
  const structurallyValid=results.every(r=>LE_OBLIGATION_GUARD[r.obligation]===guard)&&required.every(id=>counts.get(id)===1)&&results.length===required.length;
  if(!structurallyValid) return {guard,status:Status.INDETERMINATE,discharged:false,obligations:results,failed:[],indeterminate:results};
  const failed=results.filter(r=>r.status===Status.INVALID); if(failed.length) return {guard,status:Status.INVALID,discharged:false,obligations:results,failed,indeterminate:[]};
  const unresolved=results.filter(r=>r.status===Status.INDETERMINATE); if(unresolved.length) return {guard,status:Status.INDETERMINATE,discharged:false,obligations:results,failed:[],indeterminate:unresolved};
  return {guard,status:Status.VALID,discharged:true,obligations:results,failed:[],indeterminate:[]};
}
export type LEProofPackage=Readonly<Partial<Record<LEGuardId,readonly LEProofObligationResult[]>>>;
export interface LEProfileProofResult {readonly status:Status;readonly discharged:boolean;readonly guards:readonly LEGuardProofResult[];}
export function dischargeLEProfile(pkg:LEProofPackage):LEProfileProofResult {
  const ids=Object.keys(LE_PROOF_OBLIGATIONS) as LEGuardId[]; const guards=ids.map(g=>dischargeLEGuard(g,pkg[g]??[]));
  if(guards.some(g=>g.status===Status.INVALID)) return {status:Status.INVALID,discharged:false,guards};
  if(guards.some(g=>g.status===Status.INDETERMINATE)) return {status:Status.INDETERMINATE,discharged:false,guards};
  return {status:Status.VALID,discharged:true,guards};
}
export function validateGuardProofConsistency(runtime:readonly LEGuardResult[],proof:LEProfileProofResult){
  const pm=new Map(proof.guards.map(g=>[g.guard,g] as const)); const mismatches=[] as {guard:LEGuardId;guardStatus:Status;proofStatus:Status}[];
  for(const g of runtime){const p=pm.get(g.guard); if(!p||p.status!==g.status)mismatches.push({guard:g.guard,guardStatus:g.status,proofStatus:p?.status??Status.INDETERMINATE});}
  return {consistent:mismatches.length===0,mismatches} as const;
}
