import { describe, expect, it } from "vitest";

import type {
  EDCollectedItem,
  EDCollection,
  EDDataSource,
  EDException,
  EDMatter,
  EDResource,
} from "../../src/profiles/ed/ed-types.js";
import type { EDAuthorizationRecord } from "../../src/profiles/ed/ed-authorization.js";
import type { EDPreservationAssessment } from "../../src/profiles/ed/ed-preservation.js";
import { assessEDCollection } from "../../src/profiles/ed/ed-collection.js";

const matter: EDMatter = {
  id: "matter-1",
  type: "EDMatter",
  derivationId: "derivation:matter-1",
  auditRef: "audit:matter-1",
  name: "Collection Test Matter",
  status: "OPEN",
  jurisdiction: "test-jurisdiction",
  caseRef: "case-1",
  scopeIds: [],
  requestIds: [],
};

const source: EDDataSource = {
  id: "source-1",
  type: "EDDataSource",
  derivationId: "derivation:source-1",
  auditRef: "audit:source-1",
  matterId: "matter-1",
  kind: "EMAIL",
  systemName: "Example Mailbox",
  locationRef: "source://mailbox-1",
  custodianIds: [],
  status: "COLLECTED",
  nativeFormatDescription: "Mailbox",
  preservationActionIds: [],
  collectionIds: ["collection-1"],
};

const collection: EDCollection = {
  id: "collection-1",
  type: "EDCollection",
  derivationId: "derivation:collection-1",
  auditRef: "audit:collection-1",
  matterId: "matter-1",
  dataSourceId: "source-1",
  scopeIds: [],
  method: "NATIVE_EXPORT",
  status: "COMPLETED",
  collectedBy: "actor:collector",
  startedAt: "2026-07-03T00:00:00.000Z",
  completedAt: "2026-07-03T01:00:00.000Z",
  itemIds: ["item-1"],
  sourceRefs: ["source://collection-record-1"],
  exceptionIds: [],
};

const item: EDCollectedItem = {
  id: "item-1",
  type: "EDCollectedItem",
  derivationId: "derivation:item-1",
  auditRef: "audit:item-1",
  matterId: "matter-1",
  collectionId: "collection-1",
  dataSourceId: "source-1",
  sourceItemRef: "source://mailbox-1/message-1",
  collectedObjectRef: "collection://collection-1/item-1",
  fileName: "message-1.eml",
  mediaType: "message/rfc822",
  byteLength: 100,
  hashes: [],
  collectedAt: "2026-07-03T00:30:00.000Z",
  parentItemId: null,
  childItemIds: [],
  processingEventIds: [],
};

const authorization: EDAuthorizationRecord = {
  id: "auth-collect-1",
  type: "EDAuthorizationRecord",
  matterId: "matter-1",
  subjectActorRef: "actor:collector",
  grantedByRef: "actor:authorizer",
  status: "AUTHORIZED",
  scope: {
    matterId: "matter-1",
    actions: ["COLLECT"],
    resourceIds: ["collection-1"],
    dataSourceIds: ["source-1"],
    custodianIds: [],
    limitationRefs: [],
    effectiveFrom: "2026-07-01T00:00:00.000Z",
    effectiveUntil: "2026-08-01T00:00:00.000Z",
  },
  bases: [{
    basisType: "PARTY_AGREEMENT",
    authorityRef: "authority:protocol-1",
    sourceRefs: ["source://protocol-1"],
  }],
  issuedAt: "2026-07-01T00:00:00.000Z",
  revokedAt: null,
  derivationId: "derivation:auth-collect-1",
  auditRef: "audit:auth-collect-1",
};

const preservation: EDPreservationAssessment = {
  dataSourceId: "source-1",
  status: "PRESERVED",
  actionIds: ["preservation-1"],
  noticeIds: ["notice-1"],
  exceptionIds: [],
  reasons: [],
};

const baseResources: readonly EDResource[] = [matter, source, collection, item];

function assess(
  resources: readonly EDResource[] = baseResources,
  authorizations: readonly EDAuthorizationRecord[] = [authorization],
  preservationState: EDPreservationAssessment | null = preservation,
) {
  const currentSource = resources.find(
    (resource): resource is EDDataSource => resource.type === "EDDataSource",
  );
  if (!currentSource) throw new Error("Missing EDDataSource in test graph.");

  return assessEDCollection(currentSource, {
    resources,
    authorizations,
    preservation: preservationState,
  });
}

function replaceResource(resources: readonly EDResource[], replacement: EDResource): readonly EDResource[] {
  return resources.map((resource) => resource.id === replacement.id ? replacement : resource);
}

describe("TMO-ED collection assessment", () => {
  it("returns COLLECTED for an authorized, traceable completed collection", () => {
    expect(assess()).toEqual({
      dataSourceId: "source-1",
      status: "COLLECTED",
      collectionIds: ["collection-1"],
      collectedItemIds: ["item-1"],
      exceptionIds: [],
      reasons: [],
    });
  });

  it("returns NOT_COLLECTED when no collection exists", () => {
    const resources = baseResources.filter(
      (resource) => resource.type !== "EDCollection" && resource.type !== "EDCollectedItem",
    );
    const result = assess(resources, []);

    expect(result.status).toBe("NOT_COLLECTED");
    expect(result.reasons.join(" ")).toMatch(/no addressable collection exists/i);
  });

  it("returns INVALID when collection lacks resolved COLLECT authorization", () => {
    const result = assess(baseResources, []);

    expect(result.status).toBe("INVALID");
    expect(result.reasons.join(" ")).toMatch(/lacks resolved COLLECT authorization/i);
  });

  it("does not let PRESERVE authorization substitute for COLLECT authorization", () => {
    const preserveOnly: EDAuthorizationRecord = {
      ...authorization,
      scope: { ...authorization.scope, actions: ["PRESERVE"] },
    };

    expect(assess(baseResources, [preserveOnly]).status).toBe("INVALID");
  });

  it("does not let authorization for another source authorize collection", () => {
    const wrongSource: EDAuthorizationRecord = {
      ...authorization,
      scope: { ...authorization.scope, dataSourceIds: ["source-2"] },
    };

    expect(assess(baseResources, [wrongSource]).status).toBe("INVALID");
  });

  it("returns PARTIALLY_COLLECTED for a partial collection", () => {
    const partial: EDCollection = { ...collection, status: "PARTIAL" };
    const result = assess(replaceResource(baseResources, partial));

    expect(result.status).toBe("PARTIALLY_COLLECTED");
    expect(result.reasons.join(" ")).toMatch(/partial completion/i);
  });

  it("returns NOT_COLLECTED for a failed collection", () => {
    const failed: EDCollection = { ...collection, status: "FAILED" };
    const result = assess(replaceResource(baseResources, failed));

    expect(result.status).toBe("NOT_COLLECTED");
    expect(result.reasons.join(" ")).toMatch(/reports failure/i);
  });

  it("returns INDETERMINATE for an in-progress collection", () => {
    const pending: EDCollection = {
      ...collection,
      status: "IN_PROGRESS",
      completedAt: null,
    };
    expect(assess(replaceResource(baseResources, pending)).status).toBe("INDETERMINATE");
  });

  it("rejects a completed collection without completedAt", () => {
    const broken: EDCollection = { ...collection, completedAt: null };
    const result = assess(replaceResource(baseResources, broken));

    expect(result.status).toBe("INVALID");
    expect(result.reasons.join(" ")).toMatch(/lacks completedAt/i);
  });

  it("rejects collection that ends before it begins", () => {
    const broken: EDCollection = {
      ...collection,
      startedAt: "2026-07-03T02:00:00.000Z",
      completedAt: "2026-07-03T01:00:00.000Z",
    };
    const result = assess(replaceResource(baseResources, broken));

    expect(result.status).toBe("INVALID");
    expect(result.reasons.join(" ")).toMatch(/completes before it starts/i);
  });

  it("returns INDETERMINATE when completed collection lacks a source record", () => {
    const unresolved: EDCollection = { ...collection, sourceRefs: [] };
    const result = assess(replaceResource(baseResources, unresolved));

    expect(result.status).toBe("INDETERMINATE");
    expect(result.reasons.join(" ")).toMatch(/addressable collection source record/i);
  });

  it("rejects a collection that declares a missing collected item", () => {
    const resources = baseResources.filter((resource) => resource.id !== "item-1");
    const result = assess(resources);

    expect(result.status).toBe("INVALID");
    expect(result.reasons.join(" ")).toMatch(/missing or mismatched item item-1/i);
  });

  it("keeps incomplete collected-item lineage explicit", () => {
    const unresolvedItem: EDCollectedItem = { ...item, sourceItemRef: "" };
    const result = assess(replaceResource(baseResources, unresolvedItem));

    expect(result.status).toBe("PARTIALLY_COLLECTED");
    expect(result.reasons.join(" ")).toMatch(/incomplete source-to-collected-object lineage/i);
  });

  it("rejects collected-item source lineage that conflicts with collection source", () => {
    const mismatchedItem: EDCollectedItem = { ...item, dataSourceId: "source-2" };
    const result = assess(replaceResource(baseResources, mismatchedItem));

    expect(result.status).toBe("PARTIALLY_COLLECTED");
    expect(result.reasons.join(" ")).toMatch(/conflicts with collection source lineage/i);
  });

  it("preserves collection exception IDs", () => {
    const exception: EDException = {
      id: "exception-1",
      type: "EDException",
      derivationId: "derivation:exception-1",
      auditRef: "audit:exception-1",
      matterId: "matter-1",
      kind: "COLLECTION_FAILURE",
      status: "MITIGATED",
      description: "One folder required recollection.",
      affectedResourceIds: ["source-1"],
      sourceRefs: ["source://exception-1"],
      createdAt: "2026-07-03T02:00:00.000Z",
      resolvedAt: "2026-07-03T03:00:00.000Z",
    };
    const withException: EDCollection = { ...collection, exceptionIds: ["exception-1"] };
    const resources = [...replaceResource(baseResources, withException), exception];

    const result = assess(resources);
    expect(result.status).toBe("COLLECTED");
    expect(result.exceptionIds).toEqual(["exception-1"]);
  });

  it("does not let collection erase NOT_PRESERVED state", () => {
    const notPreserved: EDPreservationAssessment = {
      ...preservation,
      status: "NOT_PRESERVED",
      reasons: ["No preservation action."],
    };
    const result = assess(baseResources, [authorization], notPreserved);

    expect(result.status).toBe("COLLECTED");
    expect(result.reasons.join(" ")).toMatch(/does not erase that preservation state/i);
  });

  it("does not let collection erase INDETERMINATE preservation state", () => {
    const unresolved: EDPreservationAssessment = {
      ...preservation,
      status: "INDETERMINATE",
      reasons: ["Preservation unresolved."],
    };
    const result = assess(baseResources, [authorization], unresolved);

    expect(result.status).toBe("COLLECTED");
    expect(result.reasons.join(" ")).toMatch(/does not cure preservation uncertainty/i);
  });

  it("treats an INVALID preservation assessment as a collection validity problem", () => {
    const invalidPreservation: EDPreservationAssessment = {
      ...preservation,
      status: "INVALID",
      reasons: ["Invalid preservation authorization."],
    };

    expect(assess(baseResources, [authorization], invalidPreservation).status).toBe("PARTIALLY_COLLECTED");
  });

  it("rejects preservation assessment for a different source", () => {
    const wrongPreservation: EDPreservationAssessment = {
      ...preservation,
      dataSourceId: "source-2",
    };

    expect(assess(baseResources, [authorization], wrongPreservation).status).toBe("PARTIALLY_COLLECTED");
  });

  it("preserves mixed completed and failed collection attempts", () => {
    const failed: EDCollection = {
      ...collection,
      id: "collection-2",
      derivationId: "derivation:collection-2",
      auditRef: "audit:collection-2",
      status: "FAILED",
      itemIds: [],
      startedAt: "2026-07-04T00:00:00.000Z",
      completedAt: "2026-07-04T01:00:00.000Z",
    };
    const failedAuth: EDAuthorizationRecord = {
      ...authorization,
      id: "auth-collect-2",
      derivationId: "derivation:auth-collect-2",
      auditRef: "audit:auth-collect-2",
      scope: { ...authorization.scope, resourceIds: ["collection-2"] },
    };

    const result = assess(
      [...baseResources, failed],
      [authorization, failedAuth],
    );

    expect(result.status).toBe("PARTIALLY_COLLECTED");
    expect(result.collectionIds).toEqual(["collection-1", "collection-2"]);
    expect(result.reasons.join(" ")).toMatch(/collection-2 reports failure/i);
  });
});
