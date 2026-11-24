/** TMO-ED Production evaluator. */
export type EDProductionStatus = "PRODUCED" | "PARTIALLY_PRODUCED" | "NOT_PRODUCED" | "INDETERMINATE" | "INVALID";
export type EDProductionForm = "NATIVE" | "PDF" | "TIFF" | "TEXT" | "LOAD_FILE" | "MIXED" | "OTHER";

export interface EDProductionItemRecord {
  readonly id: string;
  readonly productionId: string;
  readonly collectedItemId: string;
  readonly representationRef: string;
  readonly producedForm: EDProductionForm;
  readonly transformationRefs: readonly string[];
  readonly redactionIds: readonly string[];
  readonly batesStart?: string;
  readonly batesEnd?: string;
  readonly exceptionIds: readonly string[];
}
export interface EDProductionManifestRecord {
  readonly id: string;
  readonly productionId: string;
  readonly itemIds: readonly string[];
  readonly createdAt?: string;
}
export interface EDProductionRecord {
  readonly id: string;
  readonly matterId: string;
  readonly producedBy: string;
  readonly producedAt?: string;
  readonly authorizationId?: string;
  readonly requestId?: string;
  readonly requestedForms: readonly EDProductionForm[];
  readonly producedForms: readonly EDProductionForm[];
  readonly itemIds: readonly string[];
  readonly manifestId?: string;
  readonly sourceRefs: readonly string[];
  readonly exceptionIds: readonly string[];
  readonly completed: boolean;
}
export interface EDProductionAuthorizationRecord {
  readonly id: string; readonly actorId: string; readonly matterId: string; readonly action: string;
  readonly resourceIds: readonly string[];
  readonly state: "AUTHORIZED" | "AUTHORIZED_WITH_LIMITATIONS" | "NOT_AUTHORIZED" | "EXPIRED" | "REVOKED" | "INDETERMINATE";
}
export interface EDProductionContext {
  readonly matterId: string;
  readonly collectedItemIds: ReadonlySet<string>;
  readonly representationRefs: ReadonlySet<string>;
  readonly transformationRefs: ReadonlySet<string>;
  readonly redactionIds: ReadonlySet<string>;
  readonly sourceRecordIds: ReadonlySet<string>;
  readonly exceptionIds: ReadonlySet<string>;
  readonly requestIds: ReadonlySet<string>;
  readonly authorizations: readonly EDProductionAuthorizationRecord[];
  readonly items: readonly EDProductionItemRecord[];
  readonly manifests: readonly EDProductionManifestRecord[];
}
export interface EDProductionEvaluation {
  readonly productionId: string; readonly status: EDProductionStatus;
  readonly reasons: readonly string[]; readonly limitations: readonly string[];
  readonly producedItemCount: number;
}
export const ED_PRODUCTION_INVARIANTS = {
  "ED-PROD-101": "Production remains traceable to collected items and produced representations.",
  "ED-PROD-102": "PRODUCE authorization is actor-, matter-, action-, and production-specific.",
  "ED-PROD-103": "Requested form, produced form, and transformations remain explicit.",
  "ED-PROD-104": "Production does not establish authenticity, evidentiary truth, admissibility, or legal merits.",
  "ED-PROD-105": "Redacted production preserves redaction lineage and does not overwrite the source representation.",
  "ED-PROD-106": "Completed production requires a consistent manifest and addressable item lineage.",
  "ED-PROD-107": "Partial, exceptional, and indeterminate production remains explicit."
} as const;

const text = (v: string | undefined) => v !== undefined && v.trim().length > 0;
const time = (v: string | undefined) => v !== undefined && Number.isFinite(Date.parse(v));
const dup = (v: readonly string[]) => new Set(v).size !== v.length;
const known = (v: readonly string[], s: ReadonlySet<string>) => v.every((x) => s.has(x));

export function evaluateEDProduction(record: EDProductionRecord, context: EDProductionContext): EDProductionEvaluation {
  const reasons: string[] = [], limitations: string[] = [];
  if (!text(record.id) || !text(record.producedBy)) reasons.push("Production ID and producer are required.");
  if (record.matterId !== context.matterId) reasons.push("Production matter does not match evaluation context.");
  if (!time(record.producedAt)) limitations.push("Production time is missing or invalid.");
  if (dup(record.itemIds) || dup(record.sourceRefs) || dup(record.exceptionIds) || dup(record.requestedForms) || dup(record.producedForms)) reasons.push("Production contains duplicate references or forms.");
  if (!known(record.sourceRefs, context.sourceRecordIds)) reasons.push("Production references an unknown source record.");
  if (!known(record.exceptionIds, context.exceptionIds)) reasons.push("Production references an unknown exception.");
  if (record.requestId && !context.requestIds.has(record.requestId)) reasons.push("Production references an unknown discovery request.");

  const auth = record.authorizationId ? context.authorizations.find((a) => a.id === record.authorizationId) : undefined;
  if (!auth) reasons.push("An addressable PRODUCE authorization is required.");
  else {
    if (auth.action !== "PRODUCE") reasons.push("Authorization action must be PRODUCE.");
    if (auth.actorId !== record.producedBy) reasons.push("Production authorization actor does not match producer.");
    if (auth.matterId !== record.matterId) reasons.push("Production authorization matter does not match production matter.");
    if (!auth.resourceIds.includes(record.id)) reasons.push("Production authorization does not cover the production resource.");
    if (["NOT_AUTHORIZED", "EXPIRED", "REVOKED"].includes(auth.state)) reasons.push(`Production authorization is ${auth.state}.`);
    if (auth.state === "INDETERMINATE") limitations.push("Production authorization is indeterminate.");
    if (auth.state === "AUTHORIZED_WITH_LIMITATIONS") limitations.push("Production authorization contains limitations.");
  }

  const items = context.items.filter((x) => x.productionId === record.id);
  const itemMap = new Map(items.map((x) => [x.id, x]));
  for (const id of record.itemIds) if (!itemMap.has(id)) reasons.push(`Declared production item ${id} is not addressable.`);
  for (const item of items) {
    if (!record.itemIds.includes(item.id)) reasons.push(`Production item ${item.id} is missing from production itemIds.`);
    if (!context.collectedItemIds.has(item.collectedItemId)) reasons.push(`Production item ${item.id} does not trace to a collected item.`);
    if (!context.representationRefs.has(item.representationRef)) reasons.push(`Production item ${item.id} has an unaddressable representation.`);
    if (!record.producedForms.includes(item.producedForm)) reasons.push(`Production item ${item.id} uses an undeclared produced form.`);
    if (!known(item.transformationRefs, context.transformationRefs)) reasons.push(`Production item ${item.id} references an unknown transformation.`);
    if (!known(item.redactionIds, context.redactionIds)) reasons.push(`Production item ${item.id} references an unknown redaction.`);
    if (!known(item.exceptionIds, context.exceptionIds)) reasons.push(`Production item ${item.id} references an unknown exception.`);
    if ((item.batesStart && !item.batesEnd) || (!item.batesStart && item.batesEnd)) reasons.push(`Production item ${item.id} has an incomplete Bates range.`);
    if (dup(item.transformationRefs) || dup(item.redactionIds) || dup(item.exceptionIds)) reasons.push(`Production item ${item.id} contains duplicate references.`);
  }

  if (record.completed && record.itemIds.length === 0) reasons.push("Completed production requires at least one production item.");
  if (record.completed && record.producedForms.length === 0) reasons.push("Completed production requires at least one produced form.");

  const manifest = record.manifestId ? context.manifests.find((m) => m.id === record.manifestId) : undefined;
  if (record.completed && !manifest) reasons.push("Completed production requires an addressable manifest.");
  if (manifest) {
    if (manifest.productionId !== record.id) reasons.push("Production manifest points to a different production.");
    if (!time(manifest.createdAt)) limitations.push("Production manifest time is missing or invalid.");
    if (dup(manifest.itemIds)) reasons.push("Production manifest contains duplicate item IDs.");
    const declared = new Set(record.itemIds), manifested = new Set(manifest.itemIds);
    if (declared.size !== manifested.size || [...declared].some((id) => !manifested.has(id))) reasons.push("Production manifest membership does not match production itemIds.");
  }

  if (record.requestedForms.length > 0 && record.producedForms.length > 0 && !record.requestedForms.some((f) => record.producedForms.includes(f))) {
    limitations.push("Produced form does not match any requested form; the form variance remains explicit.");
  }
  if (reasons.length) return { productionId: record.id, status: "INVALID", reasons, limitations, producedItemCount: items.length };
  if (auth?.state === "INDETERMINATE") return { productionId: record.id, status: "INDETERMINATE", reasons, limitations, producedItemCount: items.length };
  if (!record.completed && record.itemIds.length === 0) return { productionId: record.id, status: "NOT_PRODUCED", reasons, limitations, producedItemCount: items.length };
  if (!record.completed || limitations.length || record.exceptionIds.length || items.some((i) => i.exceptionIds.length)) return { productionId: record.id, status: "PARTIALLY_PRODUCED", reasons, limitations, producedItemCount: items.length };
  return { productionId: record.id, status: "PRODUCED", reasons, limitations, producedItemCount: items.length };
}
