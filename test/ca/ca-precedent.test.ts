import { describe, expect, it } from "vitest";
import {
  getCAPropositionSpecificPrecedentUses,
  hasCALaterTreatment,
  validateCAPrecedent,
  type CAPrecedentValidationContext,
} from "../../src/profiles/ca/ca-precedent.js";
import type { CAAuthority, CAClaim, CAPrecedent } from "../../src/profiles/ca/ca-types.js";

const authority: CAAuthority = {
  id: "auth-1", type: "CAAuthority", derivationId: "d-auth", auditRef: "audit-auth",
  authorityType: "SUPREME_COURT_PRECEDENT", citation: "Example citation",
  sourceRef: "official-source", jurisdiction: "US", bindingStatus: "BINDING",
  currentStatus: "CONTROLLING", leEvidenceIds: [],
};

const claim: CAClaim = {
  id: "claim-1", type: "CAClaim", derivationId: "d-claim", auditRef: "audit-claim",
  issueId: "issue-1", proposition: "The challenged action violates the constitutional provision.",
  provisionIds: ["prov-1"], authorityIds: ["auth-1"],
};

const context: CAPrecedentValidationContext = {
  authorities: new Map([[authority.id, authority]]),
  claims: new Map([[claim.id, claim]]),
};

const base = (overrides: Partial<CAPrecedent> = {}): CAPrecedent => ({
  id: "precedent-1", type: "CAPrecedent", derivationId: "d-precedent", auditRef: "audit-precedent",
  authorityId: "auth-1", caseName: "Example Case", court: "Supreme Court",
  citation: "Example citation", relevantFactIds: ["fact-1"], questionPresented: "Example question?",
  holding: "Example holding.", rationale: "Example rationale.", scope: "The identified constitutional issue.",
  laterTreatmentAuthorityIds: [], supportedClaimIds: ["claim-1"], sourceRefs: ["official-source"],
  ...overrides,
});

const validationCodes = (precedent: CAPrecedent, ctx = context) =>
  validateCAPrecedent(precedent, ctx).issues.map((entry) => entry.code);

describe("TMO-CA precedent validation", () => {
  it("accepts a complete proposition-specific precedent", () => {
    expect(validateCAPrecedent(base(), context)).toEqual({ valid: true, issues: [] });
  });

  it("rejects missing core precedent fields", () => {
    expect(validationCodes(base({ caseName: "" }))).toContain("CA_PRECEDENT_REQUIRED_FIELD_MISSING");
  });

  it("rejects a missing authority reference", () => {
    const emptyContext: CAPrecedentValidationContext = { authorities: new Map(), claims: context.claims };
    expect(validationCodes(base(), emptyContext)).toContain("CA_PRECEDENT_AUTHORITY_MISSING");
  });

  it("rejects a nonjudicial authority as precedent authority", () => {
    const textAuthority: CAAuthority = { ...authority, authorityType: "CONSTITUTIONAL_TEXT" };
    const ctx = { ...context, authorities: new Map([[textAuthority.id, textAuthority]]) };
    expect(validationCodes(base(), ctx)).toContain("CA_PRECEDENT_AUTHORITY_NOT_JUDICIAL");
  });

  it("requires a separately addressable holding", () => {
    expect(validationCodes(base({ holding: "" }))).toContain("CA_PRECEDENT_HOLDING_MISSING");
  });

  it("requires rationale separately from holding", () => {
    expect(validationCodes(base({ rationale: "" }))).toContain("CA_PRECEDENT_RATIONALE_MISSING");
  });

  it("requires proposition-specific scope", () => {
    expect(validationCodes(base({ scope: "" }))).toContain("CA_PRECEDENT_SCOPE_MISSING");
  });

  it("requires at least one valid source reference", () => {
    expect(validationCodes(base({ sourceRefs: [] }))).toContain("CA_PRECEDENT_SOURCE_MISSING");
    expect(validationCodes(base({ sourceRefs: [""] }))).toContain("CA_PRECEDENT_SOURCE_MISSING");
  });

  it("requires at least one supported constitutional claim", () => {
    expect(validationCodes(base({ supportedClaimIds: [] }))).toContain("CA_PRECEDENT_PROPOSITION_MISSING");
  });

  it("rejects a supported claim that is absent from context", () => {
    expect(validationCodes(base({ supportedClaimIds: ["missing-claim"] }))).toContain("CA_PRECEDENT_CLAIM_MISSING");
  });

  it("rejects duplicate reference identifiers", () => {
    expect(validationCodes(base({ sourceRefs: ["s1", "s1"] }))).toContain("CA_PRECEDENT_DUPLICATE_REFERENCE");
    expect(validationCodes(base({ supportedClaimIds: ["claim-1", "claim-1"] }))).toContain("CA_PRECEDENT_DUPLICATE_REFERENCE");
  });

  it("rejects self-reference as later treatment", () => {
    expect(validationCodes(base({ laterTreatmentAuthorityIds: ["auth-1"] }))).toContain("CA_PRECEDENT_SELF_TREATMENT");
  });
});

describe("TMO-CA proposition-specific precedent use", () => {
  it("generates one use record per supported claim", () => {
    const secondClaim: CAClaim = { ...claim, id: "claim-2", proposition: "A second constitutional proposition." };
    const ctx: CAPrecedentValidationContext = {
      authorities: context.authorities,
      claims: new Map([[claim.id, claim], [secondClaim.id, secondClaim]]),
    };
    const uses = getCAPropositionSpecificPrecedentUses(
      base({ supportedClaimIds: ["claim-1", "claim-2"] }),
      ctx,
    );
    expect(uses).toHaveLength(2);
    expect(uses.map((entry) => entry.claimId)).toEqual(["claim-1", "claim-2"]);
    expect(uses.every((entry) => entry.holding === "Example holding.")).toBe(true);
  });

  it("returns no proposition-specific uses for an invalid precedent", () => {
    expect(getCAPropositionSpecificPrecedentUses(base({ holding: "" }), context)).toEqual([]);
  });

  it("does not infer later treatment when none is recorded", () => {
    expect(hasCALaterTreatment(base())).toBe(false);
  });

  it("reports later-treatment lineage when explicitly recorded", () => {
    expect(hasCALaterTreatment(base({ laterTreatmentAuthorityIds: ["later-auth"] }))).toBe(true);
  });
});
