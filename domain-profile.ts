import type { CoreAssertion, CoreExplanationRef, CoreOutputEnvelope } from "../core/contract";
import type { DomainProfileContext } from "./domain-profile.types";
export interface CoreProjectionPolicy<P extends string>{readonly profile:P;permits(assertion:Readonly<CoreAssertion>):boolean}
export function projectCoreOutput<P extends string>(envelope:Readonly<CoreOutputEnvelope>,policy:CoreProjectionPolicy<P>):Readonly<CoreOutputEnvelope>{
 const assertions=envelope.assertions.filter(a=>policy.permits(a));
 return Object.freeze({...envelope,assertions:Object.freeze(assertions),limitations:Object.freeze([...envelope.limitations])});
}
export interface ProfessionalReviewPacket<R>{readonly coreEvaluationId:CoreOutputEnvelope["evaluationId"];readonly coreAuditRef:CoreOutputEnvelope["auditRef"];readonly profileResult:Readonly<R>;readonly assertions:readonly CoreAssertion[];readonly limitations:readonly string[];readonly explanationRefs:readonly CoreExplanationRef[]}
export function createProfessionalReviewPacket<C,R>(context:DomainProfileContext<C>,result:Readonly<R>):ProfessionalReviewPacket<R>{
 const explanationRefs=context.core.assertions.flatMap(a=>a.explanation===undefined?[]:[a.explanation]);
 return Object.freeze({coreEvaluationId:context.core.evaluationId,coreAuditRef:context.core.auditRef,profileResult:result,assertions:Object.freeze([...context.core.assertions]),limitations:Object.freeze([...context.core.limitations]),explanationRefs:Object.freeze(explanationRefs)});
}
