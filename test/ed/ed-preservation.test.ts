import { describe, expect, it } from "vitest";

import type {
  EDDataSource,
  EDException,
  EDMatter,
  EDPreservationAction,
  EDPreservationNotice,
  EDResource,
} from "../../src/profiles/ed/ed-types.js";
import type { EDAuthorizationRecord } from "../../src/profiles/ed/ed-authorization.js";
import { assessEDPreservation } from "../../src/profiles/ed/ed-preservation.js";

const matter: EDMatter = {
  id: "matter-1",
  type: "EDMatter",
  derivationId: "derivation:matter-1",
  auditRef: "audit:matter-1",
  name: "Preservation Test Matter",
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
  status: "PRESERVED",
  nativeFormatDescription: "Mailbox",
  preservationActionIds: ["preservation-1"],
  collectionIds: [],
};

const notice: EDPreservationNotice = {
  id: "notice-1",
  type: "EDPreservationNotice",
  derivationId: "derivation:notice-1",
  auditRef: "audit:notice-1",
  matterId: "matter-1",
  scopeIds: [],
  issuedAt: "2026-07-01T00:00:00.000Z",
  releasedAt: null,
  status: "ISSUED",
  recipientRefs: ["recipient-1"],
  sourceRefs: ["source://notice-1"],
};

const action: EDPreservationAction = {
  id: "preservation-1",
  type: "EDPreservationAction",
  derivationId: "derivation:preservation-1",
  auditRef: "audit:preservation-1",
  matterId: "matter-1",
  dataSourceId: "source-1",
  scopeIds: [],
  noticeId: "notice-1",
  method: "IN_PLACE_HOLD",
  performedBy: "actor:preservation-admin",
  performedAt: "2026-07-02T00:00:00.000Z",
  result: "PRESERVED",
  sourceRefs: ["source://preservation-record-1"],
  exceptionIds: [],
};

const authorization: EDAuthorizationRecord = {
  id: "auth-preserve-1",
  type: "EDAuthorizationRecord",
  matterId: "matter-1",
  subjectActorRef: "actor:preservation-admin",
  grantedByRef: "actor:authorizer",
  status: "AUTHORIZED",
  scope: {
    matterId: "matter-1",
    actions: ["PRESERVE"],
    resourceIds: ["preservation-1"],
    dataSourceIds: ["source-1"],
    custodianIds: [],
    limitationRefs: [],
    effectiveFrom: "2026-07-01T00:00:00.000Z",
    effectiveUntil: "2026-08-01T00:00:00.000Z",
  },
  bases: [
    {
      basisType: "LEGAL_HOLD",
      authorityRef: "authority:hold-1",
      sourceRefs: ["source://hold-1"],
    },
  ],
  issuedAt: "2026-07-01T00:00:00.000Z",
  revokedAt: null,
  derivationId: "derivation:auth-preserve-1",
  auditRef: "audit:auth-preserve-1",
};

const baseResources: readonly EDResource[] = [matter, source, notice, action];

function assess(
  resources: readonly EDResource[] = baseResources,
  authorizations: readonly EDAuthorizationRecord[] = [authorization],
) {
  const dataSource = resources.find(
    (resource): resource is EDDataSource => resource.type === "EDDataSource",
  );

  if (!dataSource) throw new Error("Test graph is missing EDDataSource.");

  return assessEDPreservation(dataSource, { resources, authorizations });
}

describe("TMO-ED preservation assessment", () => {
  it("returns PRESERVED for an authorized, supported successful preservation action", () => {
    expect(assess()).toEqual({
      dataSourceId: "source-1",
      status: "PRESERVED",
      actionIds: ["preservation-1"],
      noticeIds: ["notice-1"],
      exceptionIds: [],
      reasons: [],
    });
  });

  it("does not let a preservation notice substitute for an implementation action", () => {
    const resources = baseResources.filter(
      (resource) => resource.type !== "EDPreservationAction",
    );

    const result = assess(resources, []);

    expect(result.status).toBe("INDETERMINATE");
    expect(result.actionIds).toEqual([]);
    expect(result.noticeIds).toEqual(["notice-1"]);
    expect(result.reasons.join(" ")).toMatch(/notice exists/i);
    expect(result.reasons.join(" ")).toMatch(/no addressable preservation action/i);
  });

  it("returns NOT_PRESERVED when neither notice nor action exists", () => {
    const resources = baseResources.filter(
      (resource) =>
        resource.type !== "EDPreservationAction" &&
        resource.type !== "EDPreservationNotice",
    );

    const result = assess(resources, []);

    expect(result.status).toBe("NOT_PRESERVED");
    expect(result.reasons.join(" ")).toMatch(/no addressable preservation action/i);
  });

  it("returns INVALID when the only preservation action lacks resolved authorization", () => {
    const result = assess(baseResources, []);

    expect(result.status).toBe("INVALID");
    expect(result.reasons.join(" ")).toMatch(/lacks resolved PRESERVE authorization/i);
  });

  it("does not let COLLECT authorization substitute for PRESERVE authorization", () => {
    const wrongActionAuthorization: EDAuthorizationRecord = {
      ...authorization,
      scope: {
        ...authorization.scope,
        actions: ["COLLECT"],
      },
    };

    expect(assess(baseResources, [wrongActionAuthorization]).status).toBe("INVALID");
  });

  it("does not let authorization for another data source substitute for this source", () => {
    const wrongSourceAuthorization: EDAuthorizationRecord = {
      ...authorization,
      scope: {
        ...authorization.scope,
        dataSourceIds: ["source-2"],
      },
    };

    expect(assess(baseResources, [wrongSourceAuthorization]).status).toBe("INVALID");
  });

  it("returns INDETERMINATE when an authorized PRESERVED action lacks supporting source references", () => {
    const unresolvedAction: EDPreservationAction = {
      ...action,
      sourceRefs: [],
    };

    const resources = baseResources.map((resource) =>
      resource.id === action.id ? unresolvedAction : resource,
    );

    const result = assess(resources);

    expect(result.status).toBe("INDETERMINATE");
    expect(result.reasons.join(" ")).toMatch(/lacks an addressable supporting source/i);
  });

  it("returns PARTIALLY_PRESERVED for an authorized partial preservation action", () => {
    const partialAction: EDPreservationAction = {
      ...action,
      result: "PARTIALLY_PRESERVED",
    };

    const resources = baseResources.map((resource) =>
      resource.id === action.id ? partialAction : resource,
    );

    const result = assess(resources);

    expect(result.status).toBe("PARTIALLY_PRESERVED");
    expect(result.reasons.join(" ")).toMatch(/partial preservation/i);
  });

  it("returns NOT_PRESERVED for an authorized failed preservation action", () => {
    const failedAction: EDPreservationAction = {
      ...action,
      result: "FAILED",
    };

    const resources = baseResources.map((resource) =>
      resource.id === action.id ? failedAction : resource,
    );

    const result = assess(resources);

    expect(result.status).toBe("NOT_PRESERVED");
    expect(result.reasons.join(" ")).toMatch(/reports failure/i);
  });

  it("returns INDETERMINATE for an authorized indeterminate preservation action", () => {
    const unresolvedAction: EDPreservationAction = {
      ...action,
      result: "INDETERMINATE",
    };

    const resources = baseResources.map((resource) =>
      resource.id === action.id ? unresolvedAction : resource,
    );

    const result = assess(resources);

    expect(result.status).toBe("INDETERMINATE");
    expect(result.reasons.join(" ")).toMatch(/is indeterminate/i);
  });

  it("preserves mixed success and failure as PARTIALLY_PRESERVED", () => {
    const failedAction: EDPreservationAction = {
      ...action,
      id: "preservation-2",
      derivationId: "derivation:preservation-2",
      auditRef: "audit:preservation-2",
      result: "FAILED",
      performedAt: "2026-07-03T00:00:00.000Z",
    };

    const failedAuthorization: EDAuthorizationRecord = {
      ...authorization,
      id: "auth-preserve-2",
      derivationId: "derivation:auth-preserve-2",
      auditRef: "audit:auth-preserve-2",
      scope: {
        ...authorization.scope,
        resourceIds: ["preservation-2"],
      },
    };

    const result = assess(
      [...baseResources, failedAction],
      [authorization, failedAuthorization],
    );

    expect(result.status).toBe("PARTIALLY_PRESERVED");
    expect(result.actionIds).toEqual(["preservation-1", "preservation-2"]);
    expect(result.reasons.join(" ")).toMatch(/preservation-2 reports failure/i);
  });

  it("preserves exception IDs from preservation actions", () => {
    const exception: EDException = {
      id: "exception-1",
      type: "EDException",
      derivationId: "derivation:exception-1",
      auditRef: "audit:exception-1",
      matterId: "matter-1",
      kind: "PRESERVATION_FAILURE",
      status: "MITIGATED",
      description: "One folder required a second preservation attempt.",
      affectedResourceIds: ["source-1"],
      sourceRefs: ["source://exception-1"],
      createdAt: "2026-07-02T01:00:00.000Z",
      resolvedAt: "2026-07-02T02:00:00.000Z",
    };

    const actionWithException: EDPreservationAction = {
      ...action,
      exceptionIds: ["exception-1"],
    };

    const resources = [
      ...baseResources.map((resource) =>
        resource.id === action.id ? actionWithException : resource,
      ),
      exception,
    ];

    const result = assess(resources);

    expect(result.status).toBe("PRESERVED");
    expect(result.exceptionIds).toEqual(["exception-1"]);
  });

  it("keeps an expired preservation authorization from authorizing the action", () => {
    const expiredAuthorization: EDAuthorizationRecord = {
      ...authorization,
      scope: {
        ...authorization.scope,
        effectiveUntil: "2026-07-01T12:00:00.000Z",
      },
    };

    const result = assess(baseResources, [expiredAuthorization]);

    expect(result.status).toBe("INVALID");
    expect(result.reasons.join(" ")).toMatch(/lacks resolved PRESERVE authorization/i);
  });

  it("keeps a revoked preservation authorization from authorizing later action", () => {
    const revokedAuthorization: EDAuthorizationRecord = {
      ...authorization,
      status: "REVOKED",
      revokedAt: "2026-07-01T12:00:00.000Z",
    };

    expect(assess(baseResources, [revokedAuthorization]).status).toBe("INVALID");
  });
});
