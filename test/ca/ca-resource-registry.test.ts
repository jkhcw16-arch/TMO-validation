import { describe, expect, it } from "vitest";
import {
  CA_CANONICAL_RESOURCE_REGISTRY,
  CA_LE_BRIDGE_RESOURCE_TYPES,
  getCAResourceDescriptor,
  getCAResourceTypesByLayer,
  getCAResourceTypesForInvariant,
  mayCAResourceReference,
  validateCACanonicalResourceRegistry,
} from "../../src/profiles/ca/ca-resource-registry.js";
import {
  CA_CANONICAL_RESOURCE_TYPES,
  CA_INVARIANT_IDS,
  isCACanonicalResourceType,
} from "../../src/profiles/ca/ca-types.js";

describe("TMO-CA canonical resource registry", () => {
  it("registers every canonical CA resource exactly once", () => {
    expect(Object.keys(CA_CANONICAL_RESOURCE_REGISTRY).sort()).toEqual(
      [...CA_CANONICAL_RESOURCE_TYPES].sort(),
    );
  });

  it("keeps descriptor type equal to its registry key", () => {
    for (const type of CA_CANONICAL_RESOURCE_TYPES) {
      expect(getCAResourceDescriptor(type).type).toBe(type);
    }
  });

  it("recognizes canonical resource types and rejects arbitrary strings", () => {
    expect(isCACanonicalResourceType("CAConclusion")).toBe(true);
    expect(isCACanonicalResourceType("LEEvidenceItem")).toBe(false);
    expect(isCACanonicalResourceType("CAUnknown")).toBe(false);
  });

  it("places constitutional provisions in the TEXT layer", () => {
    expect(getCAResourceTypesByLayer("TEXT")).toContain(
      "CAConstitutionalProvision",
    );
  });

  it("places precedent and authority in the AUTHORITY layer", () => {
    expect(getCAResourceTypesByLayer("AUTHORITY")).toEqual(
      expect.arrayContaining(["CAAuthority", "CAPrecedent"]),
    );
  });

  it("keeps justiciability in the THRESHOLD layer and conclusion in CONCLUSION", () => {
    expect(getCAResourceDescriptor("CAJusticiabilityFinding").layer).toBe(
      "THRESHOLD",
    );
    expect(getCAResourceDescriptor("CAConclusion").layer).toBe("CONCLUSION");
  });
});

describe("TMO-CA invariant mappings", () => {
  it("maps CA-101 to constitutional text", () => {
    expect(getCAResourceTypesForInvariant("CA-101")).toContain(
      "CAConstitutionalProvision",
    );
  });

  it("maps CA-105 to justiciability and conclusion", () => {
    const resources = getCAResourceTypesForInvariant("CA-105");
    expect(resources).toContain("CAJusticiabilityFinding");
    expect(resources).toContain("CAConclusion");
  });

  it("maps CA-106 to precedent and conclusion", () => {
    const resources = getCAResourceTypesForInvariant("CA-106");
    expect(resources).toContain("CAPrecedent");
    expect(resources).toContain("CAConclusion");
  });

  it("maps CA-107 to adverse-authority-bearing resources", () => {
    const resources = getCAResourceTypesForInvariant("CA-107");
    expect(resources).toEqual(
      expect.arrayContaining([
        "CAAuthority",
        "CAPrecedent",
        "CAApplication",
        "CACounterargument",
        "CAConclusion",
      ]),
    );
  });

  it("maps CA-110 to issue, claim, justiciability, application, and conclusion", () => {
    const resources = getCAResourceTypesForInvariant("CA-110");
    expect(resources).toEqual(
      expect.arrayContaining([
        "CAIssue",
        "CAClaim",
        "CAJusticiabilityFinding",
        "CAApplication",
        "CAConclusion",
      ]),
    );
  });

  it("registers every declared invariant on at least one resource", () => {
    for (const invariant of CA_INVARIANT_IDS) {
      expect(getCAResourceTypesForInvariant(invariant).length).toBeGreaterThan(0);
    }
  });
});

describe("TMO-CA reference boundaries", () => {
  it("allows CA applications to consume qualified LE resources", () => {
    expect(mayCAResourceReference("CAApplication", "LEEvidenceItem")).toBe(true);
    expect(
      mayCAResourceReference("CAApplication", "LEEpistemicAssessment"),
    ).toBe(true);
    expect(mayCAResourceReference("CAApplication", "LEProvenanceRecord")).toBe(
      true,
    );
  });

  it("allows CA applications to reference doctrine and standards of review", () => {
    expect(mayCAResourceReference("CAApplication", "CADoctrine")).toBe(true);
    expect(
      mayCAResourceReference("CAApplication", "CAStandardOfReview"),
    ).toBe(true);
  });

  it("does not allow constitutional text to reference conclusions", () => {
    expect(
      mayCAResourceReference("CAConstitutionalProvision", "CAConclusion"),
    ).toBe(false);
  });

  it("does not let a claim directly reference an LE epistemic assessment", () => {
    expect(mayCAResourceReference("CAClaim", "LEEpistemicAssessment")).toBe(
      false,
    );
  });

  it("allows conclusions to preserve adverse authority and applications", () => {
    expect(mayCAResourceReference("CAConclusion", "CAAuthority")).toBe(true);
    expect(mayCAResourceReference("CAConclusion", "CAPrecedent")).toBe(true);
    expect(mayCAResourceReference("CAConclusion", "CAApplication")).toBe(true);
    expect(mayCAResourceReference("CAConclusion", "CACounterargument")).toBe(
      true,
    );
  });

  it("exposes only the declared LE bridge resource vocabulary", () => {
    expect(CA_LE_BRIDGE_RESOURCE_TYPES).toEqual([
      "LEAssertion",
      "LEEvidenceItem",
      "LEProvenanceRecord",
      "LEContradiction",
      "LECorroboration",
      "LEEpistemicAssessment",
      "LEDerivation",
      "LEAuditFinding",
    ]);
  });
});

describe("TMO-CA registry self-validation", () => {
  it("passes complete registry validation", () => {
    expect(validateCACanonicalResourceRegistry()).toEqual({
      valid: true,
      issues: [],
    });
  });

  it("contains no duplicate invariant mappings", () => {
    for (const descriptor of Object.values(CA_CANONICAL_RESOURCE_REGISTRY)) {
      expect(new Set(descriptor.invariants).size).toBe(
        descriptor.invariants.length,
      );
    }
  });

  it("contains no duplicate reference mappings", () => {
    for (const descriptor of Object.values(CA_CANONICAL_RESOURCE_REGISTRY)) {
      expect(new Set(descriptor.mayReference).size).toBe(
        descriptor.mayReference.length,
      );
    }
  });
});
