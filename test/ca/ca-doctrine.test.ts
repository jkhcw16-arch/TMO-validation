import { describe, expect, it } from "vitest";
import {
  evaluateCADoctrine,
  validateCADoctrine,
  validateCADoctrineComponent,
  type CADoctrineComponent,
  type CADoctrineComponentFinding,
  type CADoctrineValidationContext,
} from "../../src/profiles/ca/ca-doctrine.js";
import type {
  CAAuthority,
  CAConstitutionalProvision,
  CADoctrine,
} from "../../src/profiles/ca/ca-types.js";

const provision: CAConstitutionalProvision = {
  id: "prov-1", type: "CAConstitutionalProvision", derivationId: "d-prov", auditRef: "a-prov",
  article: null, amendment: "X", section: null, clause: null, sourceRef: "constitution-source",
};

const authority: CAAuthority = {
  id: "auth-1", type: "CAAuthority", derivationId: "d-auth", auditRef: "a-auth",
  authorityType: "SUPREME_COURT_PRECEDENT", citation: "Example citation", sourceRef: "official-source",
  jurisdiction: "US", bindingStatus: "BINDING", currentStatus: "CONTROLLING", leEvidenceIds: [],
};

const element: CADoctrineComponent = {
  id: "element-1", doctrineId: "doctrine-1", kind: "ELEMENT", name: "Required element",
  description: "A separately evaluated doctrinal element.", authorityIds: ["auth-1"], precedentIds: [],
  derivationId: "d-element", auditRef: "a-element",
};

const exception: CADoctrineComponent = {
  id: "exception-1", doctrineId: "doctrine-1", kind: "EXCEPTION", name: "Exception",
  description: "A separately evaluated doctrinal exception.", authorityIds: ["auth-1"], precedentIds: [],
  derivationId: "d-exception", auditRef: "a-exception",
};

const doctrine: CADoctrine = {
  id: "doctrine-1", type: "CADoctrine", derivationId: "d-doctrine", auditRef: "a-doctrine",
  name: "Example doctrine", provisionIds: ["prov-1"], authorityIds: ["auth-1"],
  elementIds: ["element-1"], exceptionIds: ["exception-1"],
};

const context = (overrides: Partial<CADoctrineValidationContext> = {}): CADoctrineValidationContext => ({
  provisions: new Map([[provision.id, provision]]),
  authorities: new Map([[authority.id, authority]]),
  precedents: new Map(),
  components: new Map([[element.id, element], [exception.id, exception]]),
  ...overrides,
});

const codes = (d: CADoctrine, ctx = context()) =>
  validateCADoctrine(d, ctx).issues.map((entry) => entry.code);

const finding = (
  componentId: string,
  status: CADoctrineComponentFinding["status"],
): CADoctrineComponentFinding => ({
  componentId, status, factualPredicateIds: ["fact-1"], authorityIds: ["auth-1"],
  derivationId: `d-${componentId}`, auditRef: `a-${componentId}`,
});

describe("TMO-CA doctrine validation", () => {
  it("accepts a complete doctrine with separate element and exception", () => {
    expect(validateCADoctrine(doctrine, context())).toEqual({ valid: true, issues: [] });
  });

  it("requires constitutional provision support", () => {
    expect(codes({ ...doctrine, provisionIds: [] })).toContain("CA_DOCTRINE_PROVISION_MISSING");
  });

  it("rejects a missing constitutional provision reference", () => {
    expect(codes({ ...doctrine, provisionIds: ["missing"] })).toContain("CA_DOCTRINE_PROVISION_MISSING");
  });

  it("requires explicit legal authority", () => {
    expect(codes({ ...doctrine, authorityIds: [] })).toContain("CA_DOCTRINE_AUTHORITY_MISSING");
  });

  it("requires at least one element or exception", () => {
    expect(codes({ ...doctrine, elementIds: [], exceptionIds: [] })).toContain("CA_DOCTRINE_COMPONENT_MISSING");
  });

  it("rejects the same component as both element and exception", () => {
    expect(codes({ ...doctrine, exceptionIds: ["element-1"] })).toContain("CA_DOCTRINE_ELEMENT_EXCEPTION_COLLISION");
  });

  it("rejects component kind mismatch", () => {
    expect(codes({ ...doctrine, elementIds: ["exception-1"], exceptionIds: [] })).toContain("CA_DOCTRINE_COMPONENT_TYPE_MISMATCH");
  });

  it("rejects duplicate doctrine references", () => {
    expect(codes({ ...doctrine, authorityIds: ["auth-1", "auth-1"] })).toContain("CA_DOCTRINE_DUPLICATE_REFERENCE");
  });
});

describe("TMO-CA doctrine component validation", () => {
  it("accepts a component supported by legal authority", () => {
    expect(validateCADoctrineComponent(element, context())).toEqual({ valid: true, issues: [] });
  });

  it("requires authority or precedent support", () => {
    const broken = { ...element, authorityIds: [], precedentIds: [] };
    expect(validateCADoctrineComponent(broken, context()).issues.map((i) => i.code)).toContain(
      "CA_DOCTRINE_COMPONENT_AUTHORITY_MISSING",
    );
  });

  it("rejects a missing component authority", () => {
    const broken = { ...element, authorityIds: ["missing"] };
    expect(validateCADoctrineComponent(broken, context()).issues.map((i) => i.code)).toContain(
      "CA_DOCTRINE_COMPONENT_AUTHORITY_MISSING",
    );
  });
});

describe("TMO-CA doctrine evaluation", () => {
  it("is satisfied when every element is satisfied and no exception is satisfied", () => {
    const result = evaluateCADoctrine(doctrine, [
      finding("element-1", "SATISFIED"),
      finding("exception-1", "NOT_SATISFIED"),
    ]);
    expect(result.status).toBe("SATISFIED");
  });

  it("is not satisfied when a required element fails", () => {
    const result = evaluateCADoctrine(doctrine, [
      finding("element-1", "NOT_SATISFIED"),
      finding("exception-1", "NOT_SATISFIED"),
    ]);
    expect(result.status).toBe("NOT_SATISFIED");
  });

  it("gives a satisfied exception precedence over satisfied elements", () => {
    const result = evaluateCADoctrine(doctrine, [
      finding("element-1", "SATISFIED"),
      finding("exception-1", "SATISFIED"),
    ]);
    expect(result.status).toBe("NOT_SATISFIED");
  });

  it("propagates indeterminate component status", () => {
    const result = evaluateCADoctrine(doctrine, [
      finding("element-1", "INDETERMINATE"),
      finding("exception-1", "NOT_SATISFIED"),
    ]);
    expect(result.status).toBe("INDETERMINATE");
  });

  it("is indeterminate when a required component finding is missing", () => {
    expect(evaluateCADoctrine(doctrine, [finding("element-1", "SATISFIED")]).status).toBe("INDETERMINATE");
  });

  it("preserves partial satisfaction instead of promoting it to satisfied", () => {
    const result = evaluateCADoctrine(doctrine, [
      finding("element-1", "PARTIALLY_SATISFIED"),
      finding("exception-1", "NOT_SATISFIED"),
    ]);
    expect(result.status).toBe("PARTIALLY_SATISFIED");
  });
});
