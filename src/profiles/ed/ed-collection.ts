import type {
  EDCollectedItem,
  EDCollection,
  EDDataSource,
  EDResource,
  EDResourceId,
} from "./ed-types.js";
import {
  evaluateEDAuthorization,
  type EDAuthorizationRecord,
} from "./ed-authorization.js";
import type { EDPreservationAssessment } from "./ed-preservation.js";

/**
 * TMO-ED collection assessment.
 *
 * Collection answers whether a represented collection event is sufficiently
 * supported and traceable. It does not establish authenticity, responsiveness,
 * admissibility, truth, possession/custody/control, or legal merits.
 */

export type EDCollectionAssessmentStatus =
  | "COLLECTED"
  | "PARTIALLY_COLLECTED"
  | "NOT_COLLECTED"
  | "INDETERMINATE"
  | "INVALID";

export interface EDCollectionAssessment {
  readonly dataSourceId: EDResourceId;
  readonly status: EDCollectionAssessmentStatus;
  readonly collectionIds: readonly EDResourceId[];
  readonly collectedItemIds: readonly EDResourceId[];
  readonly exceptionIds: readonly EDResourceId[];
  readonly reasons: readonly string[];
}

export interface EDCollectionContext {
  readonly resources: readonly EDResource[];
  readonly authorizations: readonly EDAuthorizationRecord[];
  readonly preservation: EDPreservationAssessment | null;
}

export const ED_COLLECTION_INVARIANTS = {
  "ED-COL-101": "Collection remains distinct from identification and preservation.",
  "ED-COL-102": "A collection action requires resolved COLLECT authorization; PRESERVE authorization does not substitute for COLLECT authorization.",
  "ED-COL-103": "A completed collection must remain traceable to an identified data source and separately addressable collected items when items are represented.",
  "ED-COL-104": "Collection status does not establish authenticity, responsiveness, privilege, admissibility, truth, or legal merits.",
  "ED-COL-105": "Preservation state is a separate input and cannot silently manufacture collection completion.",
  "ED-COL-106": "Partial, failed, exceptional, or indeterminate collection conditions remain explicit.",
} as const;

const parseTime = (value: string | null): number | null => {
  if (value === null) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

function itemsForCollection(
  collection: EDCollection,
  resources: readonly EDResource[],
): readonly EDCollectedItem[] {
  return resources.filter(
    (resource): resource is EDCollectedItem =>
      resource.type === "EDCollectedItem" &&
      resource.collectionId === collection.id,
  );
}

export function assessEDCollection(
  source: EDDataSource,
  context: EDCollectionContext,
): EDCollectionAssessment {
  const collections = context.resources.filter(
    (resource): resource is EDCollection =>
      resource.type === "EDCollection" &&
      resource.dataSourceId === source.id,
  );

  const reasons: string[] = [];
  const collectedItemIds = new Set<string>();
  const exceptionIds = new Set<string>();

  let completed = 0;
  let partial = 0;
  let failed = 0;
  let unresolved = 0;
  let invalid = 0;

  if (context.preservation?.dataSourceId !== undefined && context.preservation.dataSourceId !== source.id) {
    invalid += 1;
    reasons.push("Preservation assessment addresses a different data source.");
  }

  if (context.preservation?.status === "INVALID") {
    invalid += 1;
    reasons.push("Preservation assessment is invalid.");
  } else if (context.preservation?.status === "INDETERMINATE") {
    reasons.push("Preservation remains indeterminate; collection is evaluated separately and does not cure preservation uncertainty.");
  } else if (context.preservation?.status === "NOT_PRESERVED") {
    reasons.push("Source is assessed NOT_PRESERVED; collection does not erase that preservation state.");
  } else if (context.preservation?.status === "PARTIALLY_PRESERVED") {
    reasons.push("Source is only partially preserved; collection remains lineage-limited by that condition.");
  }

  for (const collection of collections) {
    for (const id of collection.exceptionIds) exceptionIds.add(id);

    const authorization = evaluateEDAuthorization(
      {
        actorRef: collection.collectedBy,
        action: "COLLECT",
        matterId: collection.matterId,
        resourceId: collection.id,
        dataSourceId: collection.dataSourceId,
        custodianId: null,
        at: collection.startedAt ?? collection.completedAt ?? "",
      },
      context.authorizations,
      context.resources,
    );

    if (authorization.status !== "AUTHORIZED") {
      invalid += 1;
      reasons.push(`Collection ${collection.id} lacks resolved COLLECT authorization.`);
      continue;
    }

    const start = parseTime(collection.startedAt);
    const end = parseTime(collection.completedAt);

    if (collection.startedAt !== null && start === null) {
      invalid += 1;
      reasons.push(`Collection ${collection.id} has invalid startedAt.`);
      continue;
    }
    if (collection.completedAt !== null && end === null) {
      invalid += 1;
      reasons.push(`Collection ${collection.id} has invalid completedAt.`);
      continue;
    }
    if (start !== null && end !== null && start > end) {
      invalid += 1;
      reasons.push(`Collection ${collection.id} completes before it starts.`);
      continue;
    }

    const items = itemsForCollection(collection, context.resources);
    const representedIds = new Set(items.map(({ id }) => id));

    for (const itemId of collection.itemIds) {
      if (!representedIds.has(itemId)) {
        invalid += 1;
        reasons.push(`Collection ${collection.id} references missing or mismatched item ${itemId}.`);
      }
    }

    for (const item of items) {
      if (item.dataSourceId !== source.id) {
        invalid += 1;
        reasons.push(`Collected item ${item.id} conflicts with collection source lineage.`);
        continue;
      }
      if (item.sourceItemRef.trim().length === 0 || item.collectedObjectRef.trim().length === 0) {
        unresolved += 1;
        reasons.push(`Collected item ${item.id} lacks complete source-to-collected-object lineage.`);
        continue;
      }
      collectedItemIds.add(item.id);
    }

    switch (collection.status) {
      case "COMPLETED":
        if (collection.completedAt === null) {
          invalid += 1;
          reasons.push(`Completed collection ${collection.id} lacks completedAt.`);
        } else if (collection.sourceRefs.length === 0) {
          unresolved += 1;
          reasons.push(`Completed collection ${collection.id} lacks an addressable collection source record.`);
        } else {
          completed += 1;
        }
        break;
      case "PARTIAL":
        partial += 1;
        reasons.push(`Collection ${collection.id} reports partial completion.`);
        break;
      case "FAILED":
        failed += 1;
        reasons.push(`Collection ${collection.id} reports failure.`);
        break;
      case "INDETERMINATE":
      case "IN_PROGRESS":
      case "PLANNED":
        unresolved += 1;
        reasons.push(`Collection ${collection.id} is ${collection.status.toLowerCase().replace("_", " ")}.`);
        break;
    }
  }

  let status: EDCollectionAssessmentStatus;

  if (collections.length === 0) {
    status = "NOT_COLLECTED";
    reasons.push("No addressable collection exists for this data source.");
  } else if (invalid > 0) {
    status = completed + partial > 0 ? "PARTIALLY_COLLECTED" : "INVALID";
  } else if (failed > 0) {
    status = completed + partial > 0 ? "PARTIALLY_COLLECTED" : "NOT_COLLECTED";
  } else if (unresolved > 0) {
    status = completed + partial > 0 ? "PARTIALLY_COLLECTED" : "INDETERMINATE";
  } else if (partial > 0) {
    status = "PARTIALLY_COLLECTED";
  } else if (completed > 0) {
    status = "COLLECTED";
  } else {
    status = "INDETERMINATE";
  }

  return {
    dataSourceId: source.id,
    status,
    collectionIds: collections.map(({ id }) => id),
    collectedItemIds: [...collectedItemIds],
    exceptionIds: [...exceptionIds],
    reasons,
  };
}
