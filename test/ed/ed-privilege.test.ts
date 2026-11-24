import { describe, expect, it } from "vitest";
import {
  evaluateEDPrivilege,
  type EDPrivilegeAssessmentRecord,
  type EDPrivilegeContext
} from "../../src/profiles/ed/ed-privilege.js";

function context(): EDPrivilegeContext {
  return {
    matterId: "matter-1",
    collectedItemIds: new Set(["item-1"]),
    sourceRecordIds: new Set(["source-1"]),
    disclosureEventIds: new Set(["disclosure-1"]),
    rectificationIds: new Set(["rectify-1"]),
    courtOrderIds: new Set(["order-502d"]),
    agreementIds: new Set(["agreement-1"]),
    exceptionIds: new Set(["exception-1"]),
    authorizations: [{
      id: "auth-review",
      actorId: "reviewer-1",
      matterId: "matter-1",
      action: "REVIEW",
      resourceIds: ["item-1"],
      state: "AUTHORIZED"
    }]
  };
}

function validAssessment(): EDPrivilegeAssessmentRecord {
  return {
    id: "priv-1",
    matterId: "matter-1",
    collectedItemId: "item-1",
    assessedBy: "reviewer-1",
    assessedAt: "2026-11-21T20:00:00.000Z",
    authorizationId: "auth-review",
    status: "PRIVILEGED",
    bases: [{
      type: "ATTORNEY_CLIENT",
      authorityRef: "authority-1",
      description: "Claimed confidential legal communication"
    }],
    sourceRefs: ["source-1"],
    disclosureState: "NOT_DISCLOSED",
    disclosureEventRefs: [],
    rectificationRefs: [],
    courtOrderRefs: [],
    agreementRefs: [],
    exceptionIds: [],
    claimDescription: "Privilege claim asserted for the collected item"
  };
}

describe("TMO-ED privilege", () => {
  it("validates a structurally supported privilege assessment", () => {
    expect(evaluateEDPrivilege(validAssessment(), context()).status).toBe("VALID");
  });

  it("requires an addressable collected item", () => {
    expect(evaluateEDPrivilege({ ...validAssessment(), collectedItemId: "missing" }, context()).status).toBe("INVALID");
  });

  it("requires REVIEW authorization", () => {
    expect(evaluateEDPrivilege({ ...validAssessment(), authorizationId: undefined }, context()).status).toBe("INVALID");
  });

  it("does not let PRODUCE authorization substitute for REVIEW", () => {
    const c = context();
    const altered: EDPrivilegeContext = { ...c, authorizations: [{ ...c.authorizations[0]!, action: "PRODUCE" }] };
    expect(evaluateEDPrivilege(validAssessment(), altered).status).toBe("INVALID");
  });

  it("does not let authorization cross actors", () => {
    const c = context();
    const altered: EDPrivilegeContext = { ...c, authorizations: [{ ...c.authorizations[0]!, actorId: "other" }] };
    expect(evaluateEDPrivilege(validAssessment(), altered).status).toBe("INVALID");
  });

  it("rejects revoked authorization", () => {
    const c = context();
    const altered: EDPrivilegeContext = { ...c, authorizations: [{ ...c.authorizations[0]!, state: "REVOKED" }] };
    expect(evaluateEDPrivilege(validAssessment(), altered).status).toBe("INVALID");
  });

  it("keeps indeterminate authorization indeterminate", () => {
    const c = context();
    const altered: EDPrivilegeContext = { ...c, authorizations: [{ ...c.authorizations[0]!, state: "INDETERMINATE" }] };
    expect(evaluateEDPrivilege(validAssessment(), altered).status).toBe("INDETERMINATE");
  });

  it("requires an explicit basis for PRIVILEGED", () => {
    expect(evaluateEDPrivilege({ ...validAssessment(), bases: [] }, context()).status).toBe("INVALID");
  });

  it("requires a claim description for PRIVILEGED", () => {
    expect(evaluateEDPrivilege({ ...validAssessment(), claimDescription: "" }, context()).status).toBe("INVALID");
  });

  it("rejects privilege bases without authority lineage", () => {
    const a = validAssessment();
    const altered = { ...a, bases: [{ ...a.bases[0]!, authorityRef: "" }] };
    expect(evaluateEDPrivilege(altered, context()).status).toBe("INVALID");
  });

  it("preserves POTENTIALLY_PRIVILEGED as limited rather than privileged", () => {
    const a = { ...validAssessment(), status: "POTENTIALLY_PRIVILEGED" as const };
    const result = evaluateEDPrivilege(a, context());
    expect(result.status).toBe("VALID_WITH_LIMITATIONS");
    expect(result.privilegeStatus).toBe("POTENTIALLY_PRIVILEGED");
  });

  it("preserves CONTESTED as limited", () => {
    const a = { ...validAssessment(), status: "CONTESTED" as const };
    expect(evaluateEDPrivilege(a, context()).status).toBe("VALID_WITH_LIMITATIONS");
  });

  it("preserves INDETERMINATE", () => {
    const a = { ...validAssessment(), status: "INDETERMINATE" as const };
    expect(evaluateEDPrivilege(a, context()).status).toBe("INDETERMINATE");
  });

  it("allows NOT_PRIVILEGED without promoting it to another review dimension", () => {
    const a = { ...validAssessment(), status: "NOT_PRIVILEGED" as const, bases: [], claimDescription: undefined };
    const result = evaluateEDPrivilege(a, context());
    expect(result.status).toBe("VALID");
    expect(result.privilegeStatus).toBe("NOT_PRIVILEGED");
  });

  it("requires disclosure lineage when intentional disclosure is recorded", () => {
    const a = { ...validAssessment(), disclosureState: "INTENTIONALLY_DISCLOSED" as const };
    expect(evaluateEDPrivilege(a, context()).status).toBe("INVALID");
  });

  it("accepts intentional disclosure with an addressable disclosure event without deciding waiver", () => {
    const a = {
      ...validAssessment(),
      disclosureState: "INTENTIONALLY_DISCLOSED" as const,
      disclosureEventRefs: ["disclosure-1"]
    };
    expect(evaluateEDPrivilege(a, context()).status).toBe("VALID");
  });

  it("preserves inadvertent disclosure with rectification lineage", () => {
    const a = {
      ...validAssessment(),
      disclosureState: "INADVERTENTLY_DISCLOSED" as const,
      disclosureEventRefs: ["disclosure-1"],
      rectificationRefs: ["rectify-1"]
    };
    expect(evaluateEDPrivilege(a, context()).status).toBe("VALID");
  });

  it("limits inadvertent disclosure when no rectification/order/agreement lineage is recorded", () => {
    const a = {
      ...validAssessment(),
      disclosureState: "INADVERTENTLY_DISCLOSED" as const,
      disclosureEventRefs: ["disclosure-1"]
    };
    expect(evaluateEDPrivilege(a, context()).status).toBe("VALID_WITH_LIMITATIONS");
  });

  it("preserves an unknown disclosure state as INDETERMINATE", () => {
    const a = { ...validAssessment(), disclosureState: "DISCLOSURE_UNKNOWN" as const };
    expect(evaluateEDPrivilege(a, context()).status).toBe("INDETERMINATE");
  });

  it("rejects NOT_DISCLOSED with a contrary disclosure event", () => {
    const a = { ...validAssessment(), disclosureEventRefs: ["disclosure-1"] };
    expect(evaluateEDPrivilege(a, context()).status).toBe("INVALID");
  });

  it("rejects nonexistent disclosure references", () => {
    const a = {
      ...validAssessment(),
      disclosureState: "INTENTIONALLY_DISCLOSED" as const,
      disclosureEventRefs: ["missing"]
    };
    expect(evaluateEDPrivilege(a, context()).status).toBe("INVALID");
  });

  it("preserves court-order and agreement lineage", () => {
    const a = {
      ...validAssessment(),
      courtOrderRefs: ["order-502d"],
      agreementRefs: ["agreement-1"]
    };
    expect(evaluateEDPrivilege(a, context()).status).toBe("VALID");
  });

  it("preserves exceptions as limitations", () => {
    const a = { ...validAssessment(), exceptionIds: ["exception-1"] };
    expect(evaluateEDPrivilege(a, context()).status).toBe("VALID_WITH_LIMITATIONS");
  });

  it("rejects duplicate reference IDs", () => {
    const a = { ...validAssessment(), sourceRefs: ["source-1", "source-1"] };
    expect(evaluateEDPrivilege(a, context()).status).toBe("INVALID");
  });
});
