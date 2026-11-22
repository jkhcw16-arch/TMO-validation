import { describe, expect, it } from "vitest";
import { validateCAAnalysis } from "../../src/profiles/ca/ca-validation.js";
import type { CAResource } from "../../src/profiles/ca/ca-types.js";

const common = { derivationId: "d1", auditRef: "a1" } as const;

const provision: CAResource = {
  ...common, id: "prov1", type: "CAConstitutionalProvision",
  article: null, amendment: "X", section: null, clause: null,
  sourceRef: "constitution-source"
};
const issue: CAResource = {
  ...common, id: "issue1", type: "CAIssue",
  question: "Does the challenged action violate the identified constitutional provision?",
  provisionIds: ["prov1"], claimIds: ["claim1"]
};
const claim: CAResource = {
  ...common, id: "claim1", type: "CAClaim", issueId: "issue1",
  proposition: "The challenged action is unconstitutional.",
  provisionIds: ["prov1"], authorityIds: ["auth1"]
};
const authority: CAResource = {
  ...common, id: "auth1", type: "CAAuthority",
  authorityType: "SUPREME_COURT_PRECEDENT", citation: "Example citation",
  sourceRef: "official-source", jurisdiction: "US", bindingStatus: "BINDING",
  currentStatus: "CONTROLLING", leEvidenceIds: []
};
const doctrine: CAResource = {
  ...common, id: "doc1", type: "CADoctrine", name: "Example doctrine",
  provisionIds: ["prov1"], authorityIds: ["auth1"],
  elementIds: ["element1"], exceptionIds: []
};
const application: CAResource = {
  ...common, id: "app1", type: "CAApplication", issueId: "issue1",
  doctrineId: "doc1", standardOfReviewId: null,
  propositionIds: ["fact-prop1"], factQualificationIds: ["le-fq1"],
  epistemicAssessmentIds: ["le-ea1"], authorityIds: ["auth1"],
  supportingArgumentIds: [], counterargumentIds: []
};
const conclusion: CAResource = {
  ...common, id: "conclusion1", type: "CAConclusion", issueId: "issue1",
  direction: "UNCONSTITUTIONAL", status: "SUPPORTED",
  controllingAuthorityIds: ["auth1"], supportingAuthorityIds: [],
  adverseAuthorityIds: [], applicationIds: ["app1"], limitationIds: []
};

const validAnalysis = (): CAResource[] => [
  provision, issue, claim, authority, doctrine, application, conclusion,
];
const leIds = new Set(["le-fq1", "le-ea1"]);
const codes = (resources: readonly CAResource[], ids = leIds) =>
  validateCAAnalysis(resources, ids).issues.map((entry) => entry.code);

describe("TMO-CA validation", () => {
  it("accepts a minimally complete analysis graph", () => {
    expect(validateCAAnalysis(validAnalysis(), leIds)).toEqual({ valid: true, issues: [] });
  });

  it("rejects constitutional text without an Article or Amendment locator", () => {
    const broken = { ...provision, article: null, amendment: null } as CAResource;
    expect(codes(validAnalysis().map((r) => r.id === "prov1" ? broken : r))).toContain("CA_REQUIRED_FIELD_MISSING");
  });

  it("rejects ungrounded authority classification", () => {
    const broken = { ...authority, sourceRef: "" } as CAResource;
    expect(codes(validAnalysis().map((r) => r.id === "auth1" ? broken : r))).toContain("CA_AUTHORITY_STATUS_UNGROUNDED");
  });

  it("rejects controlling authority represented as merely persuasive", () => {
    const broken = { ...authority, bindingStatus: "PERSUASIVE" } as CAResource;
    expect(codes(validAnalysis().map((r) => r.id === "auth1" ? broken : r))).toContain("CA_BINDING_STATUS_COLLAPSE");
  });

  it("rejects precedent without a separately addressable holding", () => {
    const precedent: CAResource = {
      ...common, id: "p1", type: "CAPrecedent", authorityId: "auth1",
      caseName: "Example", court: "Supreme Court", citation: "Example citation",
      relevantFactIds: [], questionPresented: "Question?", holding: "",
      rationale: "Rationale", scope: "Scope", laterTreatmentAuthorityIds: [],
      supportedClaimIds: ["claim1"], sourceRefs: ["official-source"]
    };
    expect(codes([...validAnalysis(), precedent])).toContain("CA_PRECEDENT_HOLDING_MISSING");
  });

  it("rejects precedent that is not linked to a proposition", () => {
    const precedent: CAResource = {
      ...common, id: "p1", type: "CAPrecedent", authorityId: "auth1",
      caseName: "Example", court: "Supreme Court", citation: "Example citation",
      relevantFactIds: [], questionPresented: "Question?", holding: "Holding",
      rationale: "Rationale", scope: "Scope", laterTreatmentAuthorityIds: [],
      supportedClaimIds: [], sourceRefs: ["official-source"]
    };
    expect(codes([...validAnalysis(), precedent])).toContain("CA_PRECEDENT_PROPOSITION_MISSING");
  });

  it("rejects doctrine without separately represented elements or exceptions", () => {
    const broken = { ...doctrine, elementIds: [], exceptionIds: [] } as CAResource;
    expect(codes(validAnalysis().map((r) => r.id === "doc1" ? broken : r))).toContain("CA_DOCTRINE_STRUCTURE_MISSING");
  });

  it("rejects application with no qualified LE epistemic predicate", () => {
    const broken = { ...application, epistemicAssessmentIds: [] } as CAResource;
    expect(codes(validAnalysis().map((r) => r.id === "app1" ? broken : r))).toContain("CA_FACT_TO_LAW_SHORTCUT");
  });

  it("rejects application with no legal authority", () => {
    const broken = { ...application, authorityIds: [] } as CAResource;
    expect(codes(validAnalysis().map((r) => r.id === "app1" ? broken : r))).toContain("CA_FACT_TO_LAW_SHORTCUT");
  });

  it("rejects references to LE predicates not present in the LE context", () => {
    expect(codes(validAnalysis(), new Set())).toContain("CA_REFERENCE_MISSING");
  });

  it("rejects a merits conclusion without CAApplication", () => {
    const broken = { ...conclusion, applicationIds: [] } as CAResource;
    expect(codes(validAnalysis().map((r) => r.id === "conclusion1" ? broken : r))).toContain("CA_SCORE_ONLY_CONCLUSION");
  });

  it("rejects a merits conclusion without legal authority", () => {
    const broken = {
      ...conclusion, controllingAuthorityIds: [], supportingAuthorityIds: [], adverseAuthorityIds: []
    } as CAResource;
    expect(codes(validAnalysis().map((r) => r.id === "conclusion1" ? broken : r))).toContain("CA_CONCLUSION_SUPPORT_EXCEEDS_INPUT");
  });

  it("requires adverse authority for a contested conclusion", () => {
    const broken = { ...conclusion, status: "CONTESTED", adverseAuthorityIds: [] } as CAResource;
    expect(codes(validAnalysis().map((r) => r.id === "conclusion1" ? broken : r))).toContain("CA_ADVERSE_AUTHORITY_OMITTED");
  });

  it("rejects supported merits status when no merits determination was made", () => {
    const broken = { ...conclusion, direction: "NO_MERITS_DETERMINATION", status: "SUPPORTED" } as CAResource;
    expect(codes(validAnalysis().map((r) => r.id === "conclusion1" ? broken : r))).toContain("CA_JUSTICIABILITY_MERITS_COLLAPSE");
  });

  it("rejects duplicate justiciability dimensions", () => {
    const j: CAResource = {
      ...common, id: "j1", type: "CAJusticiabilityFinding", issueId: "issue1",
      dimensions: [
        { dimension: "STANDING", status: "SATISFIED", authorityIds: ["auth1"], evidenceIds: [] },
        { dimension: "STANDING", status: "INDETERMINATE", authorityIds: ["auth1"], evidenceIds: [] }
      ]
    };
    expect(codes([...validAnalysis(), j])).toContain("CA_JUSTICIABILITY_MERITS_COLLAPSE");
  });

  it("rejects wrong-type CA references", () => {
    const broken = { ...application, doctrineId: "auth1" } as CAResource;
    expect(codes(validAnalysis().map((r) => r.id === "app1" ? broken : r))).toContain("CA_TYPE_MISMATCH");
  });

  it("rejects duplicate CA resource ids", () => {
    expect(codes([...validAnalysis(), { ...authority }])).toContain("CA_TYPE_MISMATCH");
  });
});
