import { describe, expect, it } from "vitest";

import type {
  EDCollectedItem,
  EDCollection,
  EDDataSource,
  EDDiscoveryRequest,
  EDDiscoveryResponse,
  EDException,
  EDMatter,
  EDPreservationAction,
  EDPreservationNotice,
  EDPrivilegeAssessment,
  EDProcessingEvent,
  EDProduction,
  EDProductionItem,
  EDProductionManifest,
  EDRedaction,
  EDResource,
  EDReviewDecision,
  EDScope,
} from "../../src/profiles/ed/ed-types.js";

import {
  validateEDAnalysis,
  validateEDResource,
} from "../../src/profiles/ed/ed-validation.js";

const matter: EDMatter = {
  id: "matter-1",
  type: "EDMatter",
  derivationId: "derivation:matter-1",
  auditRef: "audit:matter-1",
  name: "Example Discovery Matter",
  status: "OPEN",
  jurisdiction: "test-jurisdiction",
  caseRef: "case-1",
  scopeIds: ["scope-1"],
  requestIds: ["request-1"],
};

const scope: EDScope = {
  id: "scope-1",
  type: "EDScope",
  derivationId: "derivation:scope-1",
  auditRef: "audit:scope-1",
  matterId: "matter-1",
  name: "Primary ESI scope",
  description: "Example scope for validation tests.",
  status: "AGREED",
  custodianIds: [],
  dataSourceIds: ["source-1"],
  dateFrom: "2026-01-01T00:00:00.000Z",
  dateTo: "2026-06-30T23:59:59.000Z",
  topicRefs: ["topic-1"],
  limitationIds: [],
};

const request: EDDiscoveryRequest = {
  id: "request-1",
  type: "EDDiscoveryRequest",
  derivationId: "derivation:request-1",
  auditRef: "audit:request-1",
  matterId: "matter-1",
  requestNumber: "RFP-1",
  description: "Produce responsive messages.",
  requestingPartyRef: "party-requesting",
  respondingPartyRef: "party-responding",
  servedAt: "2026-07-01T00:00:00.000Z",
  dueAt: "2026-07-31T00:00:00.000Z",
  status: "RESPONDED",
  scopeIds: ["scope-1"],
  requestedForms: ["NATIVE"],
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
  nativeFormatDescription: "RFC-style message export",
  preservationActionIds: ["preservation-1"],
  collectionIds: ["collection-1"],
};

const preservationNotice: EDPreservationNotice = {
  id: "notice-1",
  type: "EDPreservationNotice",
  derivationId: "derivation:notice-1",
  auditRef: "audit:notice-1",
  matterId: "matter-1",
  scopeIds: ["scope-1"],
  issuedAt: "2026-07-02T00:00:00.000Z",
  releasedAt: null,
  status: "ISSUED",
  recipientRefs: ["recipient-1"],
  sourceRefs: ["source://notice-1"],
};

const preservation: EDPreservationAction = {
  id: "preservation-1",
  type: "EDPreservationAction",
  derivationId: "derivation:preservation-1",
  auditRef: "audit:preservation-1",
  matterId: "matter-1",
  dataSourceId: "source-1",
  scopeIds: ["scope-1"],
  noticeId: "notice-1",
  method: "IN_PLACE_HOLD",
  performedBy: "actor:preservation-admin",
  performedAt: "2026-07-02T01:00:00.000Z",
  result: "PRESERVED",
  sourceRefs: ["source://preservation-record-1"],
  exceptionIds: [],
};

const collection: EDCollection = {
  id: "collection-1",
  type: "EDCollection",
  derivationId: "derivation:collection-1",
  auditRef: "audit:collection-1",
  matterId: "matter-1",
  dataSourceId: "source-1",
  scopeIds: ["scope-1"],
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
  byteLength: 1024,
  hashes: [{ algorithm: "SHA256", value: "abc123" }],
  collectedAt: "2026-07-03T00:30:00.000Z",
  parentItemId: null,
  childItemIds: [],
  processingEventIds: ["processing-1"],
};

const processing: EDProcessingEvent = {
  id: "processing-1",
  type: "EDProcessingEvent",
  derivationId: "derivation:processing-1",
  auditRef: "audit:processing-1",
  matterId: "matter-1",
  inputItemIds: ["item-1"],
  operation: "TEXT_EXTRACTION",
  performedBy: "actor:processor",
  performedAt: "2026-07-04T00:00:00.000Z",
  result: "COMPLETED",
  outputRefs: ["processing://item-1/text"],
  duplicateGroupRef: null,
  exceptionIds: [],
};

const privilege: EDPrivilegeAssessment = {
  id: "privilege-1",
  type: "EDPrivilegeAssessment",
  derivationId: "derivation:privilege-1",
  auditRef: "audit:privilege-1",
  matterId: "matter-1",
  itemId: "item-1",
  status: "NOT_PRIVILEGED",
  basisRefs: [],
  assessedBy: "actor:reviewer",
  assessedAt: "2026-07-05T00:00:00.000Z",
  redactionIds: [],
  sourceRefs: ["source://privilege-review-1"],
  limitationIds: [],
};

const review: EDReviewDecision = {
  id: "review-1",
  type: "EDReviewDecision",
  derivationId: "derivation:review-1",
  auditRef: "audit:review-1",
  matterId: "matter-1",
  itemId: "item-1",
  responsiveness: "RESPONSIVE",
  confidentiality: "NONE",
  privilegeAssessmentId: "privilege-1",
  issueRefs: ["issue-1"],
  reviewerRef: "actor:reviewer",
  reviewedAt: "2026-07-05T01:00:00.000Z",
  sourceRefs: ["source://review-1"],
  limitationIds: [],
};

const production: EDProduction = {
  id: "production-1",
  type: "EDProduction",
  derivationId: "derivation:production-1",
  auditRef: "audit:production-1",
  matterId: "matter-1",
  requestIds: ["request-1"],
  label: "PROD-001",
  status: "COMPLETED",
  requestedForms: ["NATIVE"],
  producedForms: ["NATIVE"],
  productionItemIds: ["production-item-1"],
  manifestId: "manifest-1",
  producedAt: "2026-07-10T00:00:00.000Z",
  exceptionIds: [],
};

const productionItem: EDProductionItem = {
  id: "production-item-1",
  type: "EDProductionItem",
  derivationId: "derivation:production-item-1",
  auditRef: "audit:production-item-1",
  matterId: "matter-1",
  productionId: "production-1",
  collectedItemId: "item-1",
  reviewDecisionId: "review-1",
  producedObjectRef: "production://PROD-001/message-1.eml",
  producedForm: "NATIVE",
  batesStart: null,
  batesEnd: null,
  redactionIds: [],
  transformationRefs: ["processing-1"],
};

const manifest: EDProductionManifest = {
  id: "manifest-1",
  type: "EDProductionManifest",
  derivationId: "derivation:manifest-1",
  auditRef: "audit:manifest-1",
  matterId: "matter-1",
  productionId: "production-1",
  itemIds: ["production-item-1"],
  manifestRef: "production://PROD-001/manifest.json",
  createdAt: "2026-07-10T00:00:00.000Z",
  hashes: [{ algorithm: "SHA256", value: "manifest123" }],
};

const response: EDDiscoveryResponse = {
  id: "response-1",
  type: "EDDiscoveryResponse",
  derivationId: "derivation:response-1",
  auditRef: "audit:response-1",
  matterId: "matter-1",
  requestId: "request-1",
  position: "AGREED",
  respondedAt: "2026-07-15T00:00:00.000Z",
  objectionIds: [],
  withheldItemIds: [],
  productionIds: ["production-1"],
  limitationIds: [],
};

const validGraph: readonly EDResource[] = [
  matter,
  scope,
  request,
  source,
  preservationNotice,
  preservation,
  collection,
  item,
  processing,
  privilege,
  review,
  production,
  productionItem,
  manifest,
  response,
];

function replaceResource(
  graph: readonly EDResource[],
  replacement: EDResource,
): readonly EDResource[] {
  return graph.map((resource) =>
    resource.id === replacement.id ? replacement : resource,
  );
}

function expectIssue(
  resources: readonly EDResource[],
  code: string,
): void {
  const result = validateEDAnalysis(resources);
  expect(result.status).toBe("INVALID");
  expect(result.issues.map((entry) => entry.code)).toContain(code);
}

describe("TMO-ED validation", () => {
  it("accepts a complete source-to-production lineage graph", () => {
    expect(validateEDAnalysis(validGraph)).toEqual({
      status: "VALID",
      issues: [],
    });
  });

  it("rejects duplicate canonical resource IDs", () => {
    expectIssue([...validGraph, matter], "ED_DUPLICATE_ID");
  });

  it("rejects a missing referenced resource", () => {
    const broken: EDCollection = {
      ...collection,
      dataSourceId: "source-missing",
    };

    expectIssue(replaceResource(validGraph, broken), "ED_REFERENCE_MISSING");
  });

  it("rejects a wrong resource type for a typed reference", () => {
    const broken: EDProductionItem = {
      ...productionItem,
      collectedItemId: "scope-1",
    };

    expectIssue(replaceResource(validGraph, broken), "ED_REFERENCE_TYPE");
  });

  it("rejects reversed scope dates", () => {
    const broken: EDScope = {
      ...scope,
      dateFrom: "2026-06-30T00:00:00.000Z",
      dateTo: "2026-01-01T00:00:00.000Z",
    };

    expectIssue(replaceResource(validGraph, broken), "ED_TEMPORAL_CONFLICT");
  });

  it("does not let PRESERVED exist without a preservation action", () => {
    const broken: EDDataSource = {
      ...source,
      status: "PRESERVED",
      preservationActionIds: [],
      collectionIds: [],
    };

    expectIssue(replaceResource(validGraph, broken), "ED_PRESERVATION_UNSUPPORTED");
  });

  it("does not let a preservation notice prove preservation success", () => {
    const resources = validGraph.filter((resource) => resource.id !== "preservation-1");
    const broken: EDDataSource = {
      ...source,
      status: "PRESERVED",
      preservationActionIds: [],
      collectionIds: [],
    };

    expectIssue(replaceResource(resources, broken), "ED_PRESERVATION_UNSUPPORTED");
  });

  it("requires successful preservation to have an addressable source record", () => {
    const broken: EDPreservationAction = {
      ...preservation,
      sourceRefs: [],
    };

    expectIssue(replaceResource(validGraph, broken), "ED_PRESERVATION_UNSUPPORTED");
  });

  it("rejects collected source state without an addressable collection", () => {
    const broken: EDDataSource = {
      ...source,
      status: "COLLECTED",
      collectionIds: [],
    };

    expectIssue(replaceResource(validGraph, broken), "ED_COLLECTION_UNSUPPORTED");
  });

  it("rejects a completed collection with no completion time", () => {
    const broken: EDCollection = {
      ...collection,
      completedAt: null,
    };

    expectIssue(replaceResource(validGraph, broken), "ED_COLLECTION_UNSUPPORTED");
  });

  it("rejects collection end before collection start", () => {
    const broken: EDCollection = {
      ...collection,
      startedAt: "2026-07-03T02:00:00.000Z",
      completedAt: "2026-07-03T01:00:00.000Z",
    };

    expectIssue(replaceResource(validGraph, broken), "ED_TEMPORAL_CONFLICT");
  });

  it("rejects collected-item lineage that conflicts with its collection source", () => {
    const secondSource: EDDataSource = {
      ...source,
      id: "source-2",
      derivationId: "derivation:source-2",
      auditRef: "audit:source-2",
      systemName: "Second Mailbox",
      locationRef: "source://mailbox-2",
      status: "IDENTIFIED",
      preservationActionIds: [],
      collectionIds: [],
    };

    const broken: EDCollectedItem = {
      ...item,
      dataSourceId: "source-2",
    };

    expectIssue(
      [...replaceResource(validGraph, broken), secondSource],
      "ED_LINEAGE_MISSING",
    );
  });

  it("requires source and collected-object references", () => {
    const broken: EDCollectedItem = {
      ...item,
      sourceItemRef: "",
    };

    expectIssue(replaceResource(validGraph, broken), "ED_LINEAGE_MISSING");
  });

  it("requires processing to point back to its collected inputs", () => {
    const broken: EDCollectedItem = {
      ...item,
      processingEventIds: ["processing-1"],
    };

    const brokenProcessing: EDProcessingEvent = {
      ...processing,
      inputItemIds: [],
    };

    const graph = replaceResource(
      replaceResource(validGraph, broken),
      brokenProcessing,
    );

    expectIssue(graph, "ED_PROCESSING_LINEAGE");
  });

  it("requires completed processing to expose addressable outputs", () => {
    const broken: EDProcessingEvent = {
      ...processing,
      outputRefs: [],
    };

    expectIssue(replaceResource(validGraph, broken), "ED_PROCESSING_LINEAGE");
  });

  it("requires a deduplication group identifier without treating it as independence", () => {
    const broken: EDProcessingEvent = {
      ...processing,
      operation: "DEDUPLICATION_GROUPING",
      duplicateGroupRef: null,
    };

    expectIssue(replaceResource(validGraph, broken), "ED_PROCESSING_LINEAGE");
  });

  it("keeps privilege assessment tied to the same collected item as review", () => {
    const secondItem: EDCollectedItem = {
      ...item,
      id: "item-2",
      derivationId: "derivation:item-2",
      auditRef: "audit:item-2",
      sourceItemRef: "source://mailbox-1/message-2",
      collectedObjectRef: "collection://collection-1/item-2",
      processingEventIds: [],
    };

    const mismatchedPrivilege: EDPrivilegeAssessment = {
      ...privilege,
      itemId: "item-2",
    };

    expectIssue(
      [...replaceResource(validGraph, mismatchedPrivilege), secondItem],
      "ED_REVIEW_CONFLICT",
    );
  });

  it("requires basis references for privilege-based status", () => {
    const broken: EDPrivilegeAssessment = {
      ...privilege,
      status: "PRIVILEGED",
      basisRefs: [],
    };

    expectIssue(replaceResource(validGraph, broken), "ED_PRIVILEGE_CONFLICT");
  });

  it("requires authority for privilege redactions", () => {
    const redaction: EDRedaction = {
      id: "redaction-1",
      type: "EDRedaction",
      derivationId: "derivation:redaction-1",
      auditRef: "audit:redaction-1",
      matterId: "matter-1",
      itemId: "item-1",
      reason: "PRIVILEGE",
      locator: "page:1",
      authorityRef: null,
      createdBy: "actor:reviewer",
      createdAt: "2026-07-05T02:00:00.000Z",
    };

    expectIssue([...validGraph, redaction], "ED_REDACTION_CONFLICT");
  });

  it("requires production items to point back to their production", () => {
    const broken: EDProductionItem = {
      ...productionItem,
      productionId: "production-missing",
    };

    const result = validateEDAnalysis(replaceResource(validGraph, broken));
    expect(result.status).toBe("INVALID");
    expect(result.issues.map(({ code }) => code)).toContain("ED_REFERENCE_MISSING");
  });

  it("requires production item and review decision to address the same collected item", () => {
    const secondItem: EDCollectedItem = {
      ...item,
      id: "item-2",
      derivationId: "derivation:item-2",
      auditRef: "audit:item-2",
      sourceItemRef: "source://mailbox-1/message-2",
      collectedObjectRef: "collection://collection-1/item-2",
      processingEventIds: [],
    };

    const broken: EDProductionItem = {
      ...productionItem,
      collectedItemId: "item-2",
    };

    expectIssue(
      [...replaceResource(validGraph, broken), secondItem],
      "ED_PRODUCTION_CONFLICT",
    );
  });

  it("requires complete Bates range endpoints", () => {
    const broken: EDProductionItem = {
      ...productionItem,
      batesStart: "PROD000001",
      batesEnd: null,
    };

    expectIssue(replaceResource(validGraph, broken), "ED_PRODUCTION_CONFLICT");
  });

  it("requires a completed production to have produced forms", () => {
    const broken: EDProduction = {
      ...production,
      producedForms: [],
    };

    expectIssue(replaceResource(validGraph, broken), "ED_PRODUCTION_CONFLICT");
  });

  it("rejects a manifest containing an item from another production", () => {
    const secondProduction: EDProduction = {
      ...production,
      id: "production-2",
      derivationId: "derivation:production-2",
      auditRef: "audit:production-2",
      label: "PROD-002",
      productionItemIds: ["production-item-2"],
      manifestId: null,
    };

    const secondProductionItem: EDProductionItem = {
      ...productionItem,
      id: "production-item-2",
      derivationId: "derivation:production-item-2",
      auditRef: "audit:production-item-2",
      productionId: "production-2",
      producedObjectRef: "production://PROD-002/message-1.eml",
    };

    const broken: EDProductionManifest = {
      ...manifest,
      itemIds: ["production-item-2"],
    };

    expectIssue(
      [
        ...replaceResource(validGraph, broken),
        secondProduction,
        secondProductionItem,
      ],
      "ED_MANIFEST_CONFLICT",
    );
  });

  it("requires an objection or limitation record when material is withheld", () => {
    const broken: EDDiscoveryResponse = {
      ...response,
      position: "WITHHELD",
      objectionIds: [],
      limitationIds: [],
    };

    expectIssue(
      replaceResource(validGraph, broken),
      "ED_WITHHOLDING_UNADDRESSED",
    );
  });

  it("accepts withholding when an addressable limitation exists", () => {
    const exception: EDException = {
      id: "exception-1",
      type: "EDException",
      derivationId: "derivation:exception-1",
      auditRef: "audit:exception-1",
      matterId: "matter-1",
      kind: "WITHHELD_MATERIAL",
      status: "OPEN",
      description: "Material withheld under stated objection.",
      affectedResourceIds: ["item-1"],
      sourceRefs: ["source://objection-1"],
      createdAt: "2026-07-15T00:00:00.000Z",
      resolvedAt: null,
    };

    const withheld: EDDiscoveryResponse = {
      ...response,
      position: "WITHHELD",
      limitationIds: ["exception-1"],
      withheldItemIds: ["item-1"],
    };

    const result = validateEDAnalysis([
      ...replaceResource(validGraph, withheld),
      exception,
    ]);

    expect(result.status).toBe("VALID");
    expect(result.issues).toEqual([]);
  });

  it("returns INDETERMINATE rather than VALID when an issued notice lacks its issue timestamp", () => {
    const unresolved: EDPreservationNotice = {
      ...preservationNotice,
      issuedAt: null,
    };

    const result = validateEDAnalysis(
      replaceResource(validGraph, unresolved),
    );

    expect(result.status).toBe("INDETERMINATE");
    expect(result.issues.map(({ code }) => code)).toContain("ED_INDETERMINATE");
  });

  it("INVALID takes precedence over INDETERMINATE", () => {
    const unresolved: EDPreservationNotice = {
      ...preservationNotice,
      issuedAt: null,
    };

    const broken: EDCollection = {
      ...collection,
      completedAt: null,
    };

    const result = validateEDAnalysis(
      replaceResource(
        replaceResource(validGraph, unresolved),
        broken,
      ),
    );

    expect(result.status).toBe("INVALID");
    expect(result.issues.map(({ code }) => code)).toContain("ED_INDETERMINATE");
    expect(result.issues.map(({ code }) => code)).toContain("ED_COLLECTION_UNSUPPORTED");
  });

  it("validates one resource against the complete graph context", () => {
    expect(
      validateEDResource(productionItem, { resources: validGraph }),
    ).toEqual({
      status: "VALID",
      issues: [],
    });
  });
});
