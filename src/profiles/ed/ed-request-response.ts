/** TMO-ED Request/Response evaluator. */
export type EDRequestResponseStatus = "RESPONDED" | "PARTIALLY_RESPONDED" | "NOT_RESPONDED" | "INDETERMINATE" | "INVALID";
export type EDRequestItemDisposition = "PERMITTED" | "WILL_PRODUCE" | "OBJECTED" | "PARTIALLY_OBJECTED" | "WITHHELD" | "INDETERMINATE";
export type EDResponseForm = "NATIVE" | "PDF" | "TIFF" | "TEXT" | "LOAD_FILE" | "MIXED" | "OTHER";

export interface EDDiscoveryRequestItemRecord {
  readonly id: string;
  readonly description: string;
  readonly requestedForms: readonly EDResponseForm[];
  readonly scopeRef?: string;
}
export interface EDDiscoveryRequestRecord {
  readonly id: string;
  readonly matterId: string;
  readonly servedAt?: string;
  readonly requesterRef: string;
  readonly recipientRef: string;
  readonly itemIds: readonly string[];
  readonly sourceRefs: readonly string[];
}
export interface EDObjectionRecord {
  readonly id: string;
  readonly requestItemId: string;
  readonly reason: string;
  readonly withheld: boolean | "INDETERMINATE";
  readonly limitationRef?: string;
}
export interface EDDiscoveryResponseItemRecord {
  readonly id: string;
  readonly requestItemId: string;
  readonly disposition: EDRequestItemDisposition;
  readonly objectionIds: readonly string[];
  readonly productionIds: readonly string[];
  readonly intendedForms: readonly EDResponseForm[];
  readonly notes: readonly string[];
}
export interface EDDiscoveryResponseRecord {
  readonly id: string;
  readonly matterId: string;
  readonly requestId: string;
  readonly respondedAt?: string;
  readonly responderRef: string;
  readonly itemResponseIds: readonly string[];
  readonly sourceRefs: readonly string[];
  readonly exceptionIds: readonly string[];
}
export interface EDRequestResponseContext {
  readonly matterId: string;
  readonly requestItems: readonly EDDiscoveryRequestItemRecord[];
  readonly responseItems: readonly EDDiscoveryResponseItemRecord[];
  readonly objections: readonly EDObjectionRecord[];
  readonly productionIds: ReadonlySet<string>;
  readonly scopeRefs: ReadonlySet<string>;
  readonly sourceRecordIds: ReadonlySet<string>;
  readonly limitationRefs: ReadonlySet<string>;
  readonly exceptionIds: ReadonlySet<string>;
}
export interface EDRequestResponseEvaluation {
  readonly requestId: string;
  readonly responseId: string;
  readonly status: EDRequestResponseStatus;
  readonly reasons: readonly string[];
  readonly limitations: readonly string[];
  readonly respondedItemCount: number;
  readonly requestedItemCount: number;
}
export const ED_REQUEST_RESPONSE_INVARIANTS = {
  "ED-RR-101": "Request and response remain separately addressable; response does not rewrite the request.",
  "ED-RR-102": "Each requested item/category requires an explicit response state or remains unresolved.",
  "ED-RR-103": "An objection remains specific to the request item and preserves its stated reason.",
  "ED-RR-104": "Withholding on an objection remains explicit and cannot silently remove responsive material.",
  "ED-RR-105": "Requested form, objection to form, intended form, and actual production remain separate.",
  "ED-RR-106": "Partial objections preserve the unobjectioned portion rather than collapsing the whole request.",
  "ED-RR-107": "Request/response status does not establish discoverability, privilege, authenticity, admissibility, truth, or merits."
} as const;

const text=(v:string|undefined)=>v!==undefined&&v.trim().length>0;
const time=(v:string|undefined)=>v!==undefined&&Number.isFinite(Date.parse(v));
const dup=(v:readonly string[])=>new Set(v).size!==v.length;
const known=(v:readonly string[],s:ReadonlySet<string>)=>v.every((x)=>s.has(x));

export function evaluateEDRequestResponse(request: EDDiscoveryRequestRecord, response: EDDiscoveryResponseRecord, context: EDRequestResponseContext): EDRequestResponseEvaluation {
  const reasons:string[]=[], limitations:string[]=[];
  if(!text(request.id)||!text(response.id)||!text(request.requesterRef)||!text(request.recipientRef)||!text(response.responderRef)) reasons.push("Request, response, requester, recipient, and responder identifiers are required.");
  if(request.matterId!==context.matterId||response.matterId!==context.matterId) reasons.push("Request/response matter does not match evaluation context.");
  if(response.requestId!==request.id) reasons.push("Response does not reference the evaluated request.");
  if(!time(request.servedAt)) limitations.push("Request service time is missing or invalid.");
  if(!time(response.respondedAt)) limitations.push("Response time is missing or invalid.");
  if(dup(request.itemIds)||dup(response.itemResponseIds)||dup(request.sourceRefs)||dup(response.sourceRefs)||dup(response.exceptionIds)) reasons.push("Request/response contains duplicate references.");
  if(!known(request.sourceRefs,context.sourceRecordIds)||!known(response.sourceRefs,context.sourceRecordIds)) reasons.push("Request/response references an unknown source record.");
  if(!known(response.exceptionIds,context.exceptionIds)) reasons.push("Response references an unknown exception.");

  const reqMap=new Map(context.requestItems.map((x)=>[x.id,x]));
  const respMap=new Map(context.responseItems.map((x)=>[x.id,x]));
  const objectionMap=new Map(context.objections.map((x)=>[x.id,x]));
  for(const id of request.itemIds) if(!reqMap.has(id)) reasons.push(`Requested item ${id} is not addressable.`);
  for(const id of response.itemResponseIds) if(!respMap.has(id)) reasons.push(`Response item ${id} is not addressable.`);

  const responseItems=context.responseItems.filter((x)=>response.itemResponseIds.includes(x.id));
  const respondedRequestIds=new Set(responseItems.map((x)=>x.requestItemId));
  for(const itemId of request.itemIds) if(!respondedRequestIds.has(itemId)) limitations.push(`Requested item ${itemId} has no explicit response.`);

  for(const item of responseItems){
    if(!request.itemIds.includes(item.requestItemId)) reasons.push(`Response item ${item.id} addresses an item outside the request.`);
    if(dup(item.objectionIds)||dup(item.productionIds)||dup(item.intendedForms)) reasons.push(`Response item ${item.id} contains duplicate references.`);
    if(!known(item.productionIds,context.productionIds)) reasons.push(`Response item ${item.id} references an unknown production.`);
    const req=reqMap.get(item.requestItemId);
    if(req?.scopeRef&&!context.scopeRefs.has(req.scopeRef)) reasons.push(`Request item ${req.id} references an unknown scope.`);
    if(req&&dup(req.requestedForms)) reasons.push(`Request item ${req.id} contains duplicate requested forms.`);

    const objections=item.objectionIds.map((id)=>objectionMap.get(id));
    if(item.objectionIds.some((id)=>!objectionMap.has(id))) reasons.push(`Response item ${item.id} references an unknown objection.`);
    for(const objection of objections){
      if(!objection) continue;
      if(objection.requestItemId!==item.requestItemId) reasons.push(`Objection ${objection.id} addresses a different request item.`);
      if(!text(objection.reason)) reasons.push(`Objection ${objection.id} requires a specific reason.`);
      if(objection.limitationRef&&!context.limitationRefs.has(objection.limitationRef)) reasons.push(`Objection ${objection.id} references an unknown limitation.`);
    }

    if(["OBJECTED","PARTIALLY_OBJECTED","WITHHELD"].includes(item.disposition)&&item.objectionIds.length===0) reasons.push(`Response item ${item.id} requires an objection record.`);
    if(item.disposition==="WITHHELD"){
      if(!objections.some((o)=>o?.withheld===true)) reasons.push(`Withheld response item ${item.id} requires an objection explicitly stating material is withheld.`);
    }
    if(item.disposition==="OBJECTED"||item.disposition==="PARTIALLY_OBJECTED"){
      if(objections.some((o)=>o?.withheld==="INDETERMINATE")) limitations.push(`Withholding status for response item ${item.id} is indeterminate.`);
    }
    if(item.disposition==="WILL_PRODUCE"&&item.productionIds.length===0) limitations.push(`Response item ${item.id} states production will occur but no production is yet linked.`);
    if(req&&req.requestedForms.length>0&&item.intendedForms.length>0&&!req.requestedForms.some((f)=>item.intendedForms.includes(f))) limitations.push(`Response item ${item.id} intends a form different from all requested forms.`);
    if(item.disposition==="INDETERMINATE") limitations.push(`Response item ${item.id} remains indeterminate.`);
  }

  if(reasons.length) return {requestId:request.id,responseId:response.id,status:"INVALID",reasons,limitations,respondedItemCount:respondedRequestIds.size,requestedItemCount:request.itemIds.length};
  if(response.itemResponseIds.length===0) return {requestId:request.id,responseId:response.id,status:"NOT_RESPONDED",reasons,limitations,respondedItemCount:0,requestedItemCount:request.itemIds.length};
  if(responseItems.some((x)=>x.disposition==="INDETERMINATE")) return {requestId:request.id,responseId:response.id,status:"INDETERMINATE",reasons,limitations,respondedItemCount:respondedRequestIds.size,requestedItemCount:request.itemIds.length};
  if(respondedRequestIds.size<request.itemIds.length||limitations.length||response.exceptionIds.length) return {requestId:request.id,responseId:response.id,status:"PARTIALLY_RESPONDED",reasons,limitations,respondedItemCount:respondedRequestIds.size,requestedItemCount:request.itemIds.length};
  return {requestId:request.id,responseId:response.id,status:"RESPONDED",reasons,limitations,respondedItemCount:respondedRequestIds.size,requestedItemCount:request.itemIds.length};
}
