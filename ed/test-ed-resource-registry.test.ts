import { describe, expect, it } from "vitest";

import type { EDResourceType } from "../../src/profiles/ed/ed-types.js";
import {
  ED_BRIDGE_RULES,
  ED_INVARIANTS,
  ED_RELATIONS,
  ED_RESOURCES,
  getEDBridgeRules,
  getEDIncomingRelations,
  getEDOutgoingRelations,
  getEDResourceDescriptor,
  listEDResourcesByLayer,
  listEDResourceTypes,
} from "../../src/profiles/ed/ed-resource-registry.js";

const EXPECTED_RESOURCE_TYPES: readonly EDResourceType[] = [
  "EDMatter",
  "EDDiscoveryRequest",
  "EDDiscoveryResponse",
  "EDScope",
  "EDCustodian",
  "EDDataSource",
  "EDPreservationNotice",
  "EDPreservationAction",
  "EDCollection",
  "EDCollectedItem",
  "EDProcessingEvent",
  "EDDocumentFamily",
  "EDReviewDecision",
  "EDPrivilegeAssessment",
  "EDRedaction",
  "EDProduction",
  "EDProductionItem",
  "EDProductionManifest",
  "EDException",
  "EDDisposition",
] as const;

describe("TMO-ED canonical resource registry", () => {
  it("registers every canonical resource exactly once", () => {
    const actual = listEDResourceTypes();

    expect(actual).toHaveLength(EXPECTED_RESOURCE_TYPES.length);
    expect(new Set(actual).size).toBe(actual.length);
    expect(new Set(actual)).toEqual(new Set(EXPECTED_RESOURCE_TYPES));
  });

  it("keeps registry keys consistent with descriptor types", () => {
    for (const type of EXPECTED_RESOURCE_TYPES) {
      expect(ED_RESOURCES[type].type).toBe(type);
      expect(getEDResourceDescriptor(type).type).toBe(type);
    }
  });

  it("places matter resources in the MATTER layer", () => {
    const types = listEDResourcesByLayer("MATTER").map(({ type }) => type);

    expect(types).toContain("EDMatter");
    expect(types).toContain("EDDiscoveryRequest");
    expect(types).toContain("EDDiscoveryResponse");
  });

  it("places scope resources in the SCOPE layer", () => {
    const types = listEDResourcesByLayer("SCOPE").map(({ type }) => type);

    expect(types).toContain("EDScope");
    expect(types).toContain("EDCustodian");
  });

  it("places acquisition resources in DATA_ACQUISITION", () => {
    const types = listEDResourcesByLayer("DATA_ACQUISITION").map(({ type }) => type);

    expect(types).toContain("EDDataSource");
    expect(types).toContain("EDPreservationAction");
    expect(types).toContain("EDCollection");
    expect(types).toContain("EDCollectedItem");
    expect(types).toContain("EDProcessingEvent");
  });

  it("keeps review, privilege, and redaction separately addressable", () => {
    const types = listEDResourcesByLayer("REVIEW").map(({ type }) => type);

    expect(types).toContain("EDReviewDecision");
    expect(types).toContain("EDPrivilegeAssessment");
    expect(types).toContain("EDRedaction");
    expect(new Set(types).size).toBe(types.length);
  });

  it("keeps production set, production item, and manifest distinct", () => {
    const types = listEDResourcesByLayer("PRODUCTION").map(({ type }) => type);

    expect(types).toContain("EDProduction");
    expect(types).toContain("EDProductionItem");
    expect(types).toContain("EDProductionManifest");
  });

  it("registers exception as cross-cutting and disposition separately", () => {
    expect(getEDResourceDescriptor("EDException").layer).toBe("CROSS_CUTTING");
    expect(getEDResourceDescriptor("EDDisposition").layer).toBe("DISPOSITION");
  });

  it("declares ED-101 through ED-110 without gaps", () => {
    expect(Object.keys(ED_INVARIANTS)).toEqual([
      "ED-101",
      "ED-102",
      "ED-103",
      "ED-104",
      "ED-105",
      "ED-106",
      "ED-107",
      "ED-108",
      "ED-109",
      "ED-110",
    ]);
  });

  it("preserves source-to-collection lineage in the relation graph", () => {
    expect(getEDOutgoingRelations("EDDataSource")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ to: "EDPreservationAction" }),
        expect.objectContaining({ to: "EDCollection" }),
      ]),
    );

    expect(getEDOutgoingRelations("EDCollection")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ to: "EDCollectedItem" }),
      ]),
    );
  });

  it("requires production items to trace back to collected items", () => {
    expect(getEDOutgoingRelations("EDProductionItem")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          to: "EDCollectedItem",
          cardinality: "ONE",
        }),
      ]),
    );
  });

  it("keeps privilege assessment separate from review responsiveness", () => {
    const incomingPrivilege = getEDIncomingRelations("EDPrivilegeAssessment");
    const incomingReview = getEDIncomingRelations("EDReviewDecision");

    expect(incomingPrivilege).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: "EDCollectedItem" }),
      ]),
    );
    expect(incomingReview).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: "EDCollectedItem" }),
      ]),
    );
    expect("EDPrivilegeAssessment").not.toBe("EDReviewDecision");
  });

  it("requires privilege assessment before privilege-linked redaction lineage", () => {
    expect(getEDOutgoingRelations("EDPrivilegeAssessment")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ to: "EDRedaction" }),
      ]),
    );
  });

  it("contains only relations whose endpoints are registered resources", () => {
    const registered = new Set(listEDResourceTypes());

    for (const relation of ED_RELATIONS) {
      expect(registered.has(relation.from)).toBe(true);
      expect(registered.has(relation.to)).toBe(true);
    }
  });

  it("uses unique relation identifiers", () => {
    const ids = ED_RELATIONS.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("defines the ED to LE bridge", () => {
    const rules = getEDBridgeRules("TMO-LE");

    expect(rules).toHaveLength(1);
    expect(rules[0]?.id).toBe("ED-LE-01");
    expect(rules[0]?.sourceTypes).toContain("EDCollectedItem");
    expect(rules[0]?.sourceTypes).toContain("EDProcessingEvent");
    expect(rules[0]?.sourceTypes).toContain("EDProductionItem");
  });

  it("forbids automatic promotion of discovery material to verified fact", () => {
    const rule = getEDBridgeRules("TMO-LE")[0];

    expect(rule).toBeDefined();
    expect(rule?.forbids.join(" ")).toMatch(/verified fact/i);
    expect(rule?.forbids.join(" ")).toMatch(/authenticity/i);
    expect(rule?.forbids.join(" ")).toMatch(/independence/i);
  });

  it("requires the ED to CA bridge to pass through LE qualification", () => {
    const rules = getEDBridgeRules("TMO-CA");

    expect(rules).toHaveLength(1);
    expect(rules[0]?.id).toBe("ED-CA-01");
    expect(rules[0]?.forbids.join(" ")).toMatch(/without the TMO-LE qualification boundary/i);
    expect(rules[0]?.forbids.join(" ")).toMatch(/legal merits/i);
  });

  it("keeps bridge identifiers unique", () => {
    const ids = ED_BRIDGE_RULES.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("marks collected items as non-authoritative for truth and admissibility", () => {
    const descriptor = getEDResourceDescriptor("EDCollectedItem");
    const exclusions = descriptor.notAuthoritativeFor.join(" ");

    expect(exclusions).toMatch(/truth/i);
    expect(exclusions).toMatch(/admissibility/i);
    expect(exclusions).toMatch(/authenticity/i);
  });

  it("does not let a preservation notice prove preservation success", () => {
    const descriptor = getEDResourceDescriptor("EDPreservationNotice");

    expect(descriptor.notAuthoritativeFor).toContain("actual preservation success");
  });

  it("does not let deduplication establish evidentiary independence", () => {
    const descriptor = getEDResourceDescriptor("EDProcessingEvent");

    expect(descriptor.notAuthoritativeFor).toContain("evidentiary independence");
  });
});
