import type { FailureCode } from "../validation/result";
import type { CoreAuditRef, CoreEvaluationId, CoreOutputEnvelope } from "../core/contract";
export type DomainStatus="VALID"|"INVALID"|"INDETERMINATE";
export type DomainGuardResult<G extends string,F extends string>=
 | {readonly guard:G;readonly status:"VALID"}
 | {readonly guard:G;readonly status:"INVALID";readonly failure:F;readonly details?:string}
 | {readonly guard:G;readonly status:"INDETERMINATE";readonly failure:F;readonly details?:string};
export interface DomainProfileContext<C>{readonly core:Readonly<CoreOutputEnvelope>;readonly domain:Readonly<C>}
interface Base<I extends string,V extends string,G extends string,F extends string>{readonly profile:I;readonly version:V;readonly coreEvaluationId:CoreEvaluationId;readonly coreAuditRef:CoreAuditRef;readonly guards:readonly DomainGuardResult<G,F>[];readonly failures:readonly F[];readonly evidenceFailures:readonly FailureCode[];readonly limitations:readonly string[]}
export type DomainProfileResult<I extends string,V extends string,G extends string,F extends string,VD extends string,HD extends string,RD extends string>=
 | (Base<I,V,G,F>&{readonly status:"VALID";readonly disposition:VD;readonly failures:readonly []})
 | (Base<I,V,G,F>&{readonly status:"INDETERMINATE";readonly disposition:HD})
 | (Base<I,V,G,F>&{readonly status:"INVALID";readonly disposition:RD});
export interface DomainProfile<I extends string,V extends string,C,R>{readonly id:I;readonly version:V;validate(context:DomainProfileContext<C>):R}
export interface ProfileCompatibility<I extends string,V extends string>{readonly profileId:I;readonly profileVersion:V;readonly supportedCoreContracts:readonly string[]}
