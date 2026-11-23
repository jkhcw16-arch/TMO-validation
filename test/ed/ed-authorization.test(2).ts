import { describe, expect, it } from "vitest";

import type {
  EDCollection,
  EDCustodian,
  EDDataSource,
  EDDisposition,
  EDMatter,
  EDProduction,
  EDResource,
} from "../../src/profiles/ed/ed-types.js";

import {
  authorizationRequiredForResource,
  evaluateEDAuthorization,
  validateEDAuthorizationRecord,
  type EDAuthorizationRecord,
  type EDAuthorizationRequest,
} from "../../src/profiles/ed/ed-authorization.js";

const matter: EDMatter = {
  id: "matter-1",
  type: "EDMatter",
  derivationId: "derivation:matter-1",
  auditRef: "audit:matter-1",
  name: "Authorization Test Matter",
  status: "OPEN",
  jurisdiction: "test-jurisdiction",
  caseRef: "case-1",
  scopeIds: [],
  requestIds: [],
};

const custodian: EDCustodian = {
  id: "custodian-1",
  type: "EDCustodian",
  derivationId: "derivation:custodian-1",
  auditRef: "audit:custodian-1",
  matterId: "matter-1",
  custodianRef: "person:custodian-1",
  status: "ACTIVE",
  dataSourceIds: ["source-1"],
};

const source: EDDataSource = {
  id: "source-1",
  type: "EDDataSource",
  derivationId: "derivation:source-1",
  auditRef: "audit:source-1",
  matterId: "matter-1",
  kind: "EMAIL",
  systemName: "Mailbox One",
  locationRef: "source://mailbox-1",
  custodianIds: ["custodian-1"],
  status: "IDENTIFIED",
  nativeFormatDescription: "Mailbox",
  preservationActionIds: [],
  collectionIds: [],
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
  status: "PLANNED",
  collectedBy: "actor:collector",
  startedAt: null,
  completedAt: null,
  itemIds: [],
  sourceRefs: [],
  exceptionIds: [],
};

const production: EDProduction = {
  id: "production-1",
  type: "EDProduction",
  derivationId: "derivation:production-1",
  auditRef: "audit:production-1",
  matterId: "matter-1",
  requestIds: [],
  label: "PROD-001",
  status: "PLANNED",
  requestedForms: ["NATIVE"],
  producedForms: [],
  productionItemIds: [],
  manifestId: null,
  producedAt: null,
  exceptionIds: [],
};

const resources: readonly EDResource[] = [
  matter,
  custodian,
  source,
  collection,
  production,
];

const authorization: EDAuthorizationRecord = {
  id: "auth-1",
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
    custodianIds: ["custodian-1"],
    limitationRefs: [],
    effectiveFrom: "2026-07-01T00:00:00.000Z",
    effectiveUntil: "2026-07-31T23:59:59.000Z",
  },
  bases: [
    {
      basisType: "PARTY_AGREEMENT",
      authorityRef: "authority:discovery-protocol-1",
      sourceRefs: ["source://discovery-protocol-1"],
    },
  ],
  issuedAt: "2026-06-30T00:00:00.000Z",
  revokedAt: null,
  derivationId: "derivation:auth-1",
  auditRef: "audit:auth-1",
};

const request: EDAuthorizationRequest = {
  actorRef: "actor:collector",
  action: "COLLECT",
  matterId: "matter-1",
  resourceId: "collection-1",
  dataSourceId: "source-1",
  custodianId: "custodian-1",
  at: "2026-07-10T12:00:00.000Z",
};

describe("TMO-ED authorization", () => {
  it("validates a complete authorization record", () => {
    expect(validateEDAuthorizationRecord(authorization, resources)).toEqual({
      valid: true,
      issues: [],
    });
  });

  it("authorizes an action only when actor, action, matter, scope, and time match", () => {
    expect(evaluateEDAuthorization(request, [authorization], resources)).toEqual({
      status: "AUTHORIZED",
      authorizationId: "auth-1",
      reasons: ["MATCHED_ACTIVE_AUTHORIZATION"],
      limitations: [],
    });
  });

  it("preserves limitations on a limited authorization", () => {
    const limited: EDAuthorizationRecord = {
      ...authorization,
      status: "AUTHORIZED_WITH_LIMITATIONS",
      scope: {
        ...authorization.scope,
        limitationRefs: ["limit:no-private-channel"],
      },
    };

    expect(evaluateEDAuthorization(request, [limited], resources)).toEqual({
      status: "AUTHORIZED",
      authorizationId: "auth-1",
      reasons: ["MATCHED_LIMITED_AUTHORIZATION"],
      limitations: ["limit:no-private-channel"],
    });
  });

  it("does not let actor identity alone substitute for authorization", () => {
    expect(
      evaluateEDAuthorization(request, [], resources),
    ).toEqual({
      status: "INDETERMINATE",
      authorizationId: null,
      reasons: ["NO_APPLICABLE_AUTHORIZATION"],
      limitations: [],
    });
  });

  it("does not broaden COLLECT authorization into PRODUCE authorization", () => {
    const produceRequest: EDAuthorizationRequest = {
      ...request,
      action: "PRODUCE",
      resourceId: "production-1",
    };

    const result = evaluateEDAuthorization(
      produceRequest,
      [authorization],
      resources,
    );

    expect(result.status).toBe("DENIED");
    expect(result.reasons).toContain("ACTION_OUT_OF_SCOPE");
  });

  it("does not broaden authorization to a different source", () => {
    const result = evaluateEDAuthorization(
      { ...request, dataSourceId: "source-2" },
      [authorization],
      resources,
    );

    expect(result.status).toBe("DENIED");
    expect(result.reasons).toContain("SOURCE_OUT_OF_SCOPE");
  });

  it("does not broaden authorization to a different resource", () => {
    const result = evaluateEDAuthorization(
      { ...request, resourceId: "collection-2" },
      [authorization],
      resources,
    );

    expect(result.status).toBe("DENIED");
    expect(result.reasons).toContain("RESOURCE_OUT_OF_SCOPE");
  });

  it("does not broaden authorization to another custodian", () => {
    const result = evaluateEDAuthorization(
      { ...request, custodianId: "custodian-2" },
      [authorization],
      resources,
    );

    expect(result.status).toBe("DENIED");
    expect(result.reasons).toContain("CUSTODIAN_OUT_OF_SCOPE");
  });

  it("rejects an action after the authorization expires", () => {
    const result = evaluateEDAuthorization(
      { ...request, at: "2026-08-01T00:00:00.000Z" },
      [authorization],
      resources,
    );

    expect(result.status).toBe("DENIED");
    expect(result.reasons).toContain("AUTHORIZATION_EXPIRED");
  });

  it("rejects an action after authorization revocation", () => {
    const revoked: EDAuthorizationRecord = {
      ...authorization,
      status: "REVOKED",
      revokedAt: "2026-07-05T00:00:00.000Z",
    };

    const result = evaluateEDAuthorization(
      request,
      [revoked],
      resources,
    );

    expect(result.status).toBe("DENIED");
    expect(result.reasons).toContain("AUTHORIZATION_REVOKED");
  });

  it("gives explicit denial precedence over absence of a positive authorization", () => {
    const denied: EDAuthorizationRecord = {
      ...authorization,
      status: "NOT_AUTHORIZED",
    };

    expect(evaluateEDAuthorization(request, [denied], resources)).toEqual({
      status: "DENIED",
      authorizationId: null,
      reasons: ["MATCHED_DENIAL"],
      limitations: [],
    });
  });

  it("keeps an indeterminate authorization indeterminate", () => {
    const unresolved: EDAuthorizationRecord = {
      ...authorization,
      status: "INDETERMINATE",
    };

    const result = evaluateEDAuthorization(
      request,
      [unresolved],
      resources,
    );

    expect(result.status).toBe("INDETERMINATE");
    expect(result.authorizationId).toBeNull();
  });

  it("rejects authorization without an addressable basis", () => {
    const broken: EDAuthorizationRecord = {
      ...authorization,
      bases: [],
    };

    const result = validateEDAuthorizationRecord(broken, resources);

    expect(result.valid).toBe(false);
    expect(result.issues.map(({ code }) => code)).toContain("ED_AUTH_BASIS");
  });

  it("rejects a basis without source references", () => {
    const broken: EDAuthorizationRecord = {
      ...authorization,
      bases: [
        {
          basisType: "COURT_ORDER",
          authorityRef: "authority:order-1",
          sourceRefs: [],
        },
      ],
    };

    const result = validateEDAuthorizationRecord(broken, resources);

    expect(result.valid).toBe(false);
    expect(result.issues.map(({ code }) => code)).toContain("ED_AUTH_BASIS");
  });

  it("rejects a missing scoped data source", () => {
    const broken: EDAuthorizationRecord = {
      ...authorization,
      scope: {
        ...authorization.scope,
        dataSourceIds: ["source-missing"],
      },
    };

    const result = validateEDAuthorizationRecord(broken, resources);

    expect(result.valid).toBe(false);
    expect(result.issues.map(({ code }) => code)).toContain("ED_AUTH_REFERENCE_MISSING");
  });

  it("rejects a wrong resource type in dataSourceIds", () => {
    const broken: EDAuthorizationRecord = {
      ...authorization,
      scope: {
        ...authorization.scope,
        dataSourceIds: ["collection-1"],
      },
    };

    const result = validateEDAuthorizationRecord(broken, resources);

    expect(result.valid).toBe(false);
    expect(result.issues.map(({ code }) => code)).toContain("ED_AUTH_REFERENCE_TYPE");
  });

  it("rejects scope whose matter differs from the authorization matter", () => {
    const broken: EDAuthorizationRecord = {
      ...authorization,
      scope: {
        ...authorization.scope,
        matterId: "matter-2",
      },
    };

    const result = validateEDAuthorizationRecord(broken, resources);

    expect(result.valid).toBe(false);
    expect(result.issues.map(({ code }) => code)).toContain("ED_AUTH_SCOPE");
  });

  it("rejects inverted effective dates", () => {
    const broken: EDAuthorizationRecord = {
      ...authorization,
      scope: {
        ...authorization.scope,
        effectiveFrom: "2026-08-01T00:00:00.000Z",
        effectiveUntil: "2026-07-01T00:00:00.000Z",
      },
    };

    const result = validateEDAuthorizationRecord(broken, resources);

    expect(result.valid).toBe(false);
    expect(result.issues.map(({ code }) => code)).toContain("ED_AUTH_TIME");
  });

  it("requires revokedAt when status is REVOKED", () => {
    const broken: EDAuthorizationRecord = {
      ...authorization,
      status: "REVOKED",
      revokedAt: null,
    };

    const result = validateEDAuthorizationRecord(broken, resources);

    expect(result.valid).toBe(false);
    expect(result.issues.map(({ code }) => code)).toContain("ED_AUTH_REVOCATION");
  });

  it("maps collection to COLLECT authorization", () => {
    expect(authorizationRequiredForResource(collection)).toEqual(["COLLECT"]);
  });

  it("maps production resources to PRODUCE authorization", () => {
    expect(authorizationRequiredForResource(production)).toEqual(["PRODUCE"]);
  });

  it("maps destructive disposition to DELETE authorization", () => {
    const disposition: EDDisposition = {
      id: "disposition-1",
      type: "EDDisposition",
      derivationId: "derivation:disposition-1",
      auditRef: "audit:disposition-1",
      matterId: "matter-1",
      action: "DELETE",
      status: "PLANNED",
      affectedResourceIds: ["source-1"],
      authorityRefs: ["authority:retention-1"],
      authorizedBy: null,
      authorizedAt: null,
      completedAt: null,
      exceptionIds: [],
    };

    expect(authorizationRequiredForResource(disposition)).toEqual(["DELETE"]);
  });

  it("does not invent an authorization action for NO_ACTION disposition", () => {
    const disposition: EDDisposition = {
      id: "disposition-2",
      type: "EDDisposition",
      derivationId: "derivation:disposition-2",
      auditRef: "audit:disposition-2",
      matterId: "matter-1",
      action: "NO_ACTION",
      status: "PLANNED",
      affectedResourceIds: [],
      authorityRefs: [],
      authorizedBy: null,
      authorizedAt: null,
      completedAt: null,
      exceptionIds: [],
    };

    expect(authorizationRequiredForResource(disposition)).toEqual([]);
  });
});
