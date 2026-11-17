import { CORE_OUTPUT_CONTRACT, CORE_OUTPUT_VERSION, CoreOutputStatus, type CoreOutputEnvelope } from "./core-output.types";
export type CoreBoundaryFailure = "WRONG_CONTRACT"|"UNSUPPORTED_VERSION"|"MALFORMED_TIMESTAMP"|"EMPTY_DIGEST"|"EMPTY_AUDIT_REF"|"MALFORMED_ASSERTION"|"INDETERMINATE_CORE";
export type CoreBoundaryResult =
 | {readonly status:"VALID";readonly envelope:Readonly<CoreOutputEnvelope>}
 | {readonly status:"INVALID";readonly failures:readonly CoreBoundaryFailure[]}
 | {readonly status:"INDETERMINATE";readonly failures:readonly CoreBoundaryFailure[]};
export function validateCoreBoundary(e:Readonly<CoreOutputEnvelope>):CoreBoundaryResult{
 const failures:CoreBoundaryFailure[]=[];
 if(e.contract!==CORE_OUTPUT_CONTRACT)failures.push("WRONG_CONTRACT");
 if(e.contractVersion!==CORE_OUTPUT_VERSION)failures.push("UNSUPPORTED_VERSION");
 if(!Number.isFinite(Date.parse(e.generatedAt)))failures.push("MALFORMED_TIMESTAMP");
 if(String(e.digest).trim()==="")failures.push("EMPTY_DIGEST");
 if(String(e.auditRef).trim()==="")failures.push("EMPTY_AUDIT_REF");
 if(e.assertions.some(a=>!a.id.trim()||!a.statement.trim()))failures.push("MALFORMED_ASSERTION");
 if(failures.length)return {status:"INVALID",failures};
 if(e.status===CoreOutputStatus.INDETERMINATE)return {status:"INDETERMINATE",failures:["INDETERMINATE_CORE"]};
 return {status:"VALID",envelope:e};
}
