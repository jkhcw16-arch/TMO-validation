import {
  describe,
  expect,
  it,
} from "vitest";

import {
  LE_CANONICAL_RESOURCE_REGISTRY,
  LE_CANONICAL_RESOURCE_TYPES,
  LE_CANONICAL_RESOURCE_RULE,

  isLECanonicalResourceType,

  getLECanonicalResourceDescriptor,

  getLEResourceTypesByLayer,

  getLEResourceTypesForInvariant,

  validateLECanonicalResourceRegistry,

  type LECanonicalResourceType,
} from "../../src/profiles/le/le-canonical-resource-registry.js";


describe(
  "TMO LE canonical resource registry",
  () => {

    /*
     * Registry completeness
     */

    it(
      "registers every canonical resource type exactly once",
      () => {

        const registered =
          Object.keys(
            LE_CANONICAL_RESOURCE_REGISTRY
          );


        expect(
          registered
        ).toHaveLength(
          LE_CANONICAL_RESOURCE_TYPES.length
        );


        expect(
          new Set(registered).size
        ).toBe(
          registered.length
        );


        expect(
          new Set(registered)
        ).toEqual(
          new Set(
            LE_CANONICAL_RESOURCE_TYPES
          )
        );
      }
    );


    /*
     * Required canonical resources
     */

    it(
      "contains the complete foundational resource set",
      () => {

        expect(
          LE_CANONICAL_RESOURCE_TYPES
        ).toEqual([

          "LEEvent",

          "LEActor",

          "LERole",

          "LEAgency",

          "LEAssertion",

          "LEEvidenceItem",

          "LESourceRecord",

          "LECommunication",

          "LEResponse",

          "LEInstitutionalAction",

          "LEDecision",

          "LETemporalEntity",

          "LEContradiction",

          "LECorroboration",

          "LEAuditFinding",

          "LEProvenanceRecord",

          "LEDerivation",
        ]);
      }
    );


    /*
     * Registry key/type consistency
     */

    it(
      "keeps every registry key equal to its descriptor type",
      () => {

        for (
          const type
          of LE_CANONICAL_RESOURCE_TYPES
        ) {

          expect(
            LE_CANONICAL_RESOURCE_REGISTRY[
              type
            ].type
          ).toBe(
            type
          );
        }
      }
    );


    /*
     * Runtime type guard
     */

    it(
      "recognizes canonical resource types",
      () => {

        expect(
          isLECanonicalResourceType(
            "LEEvent"
          )
        ).toBe(
          true
        );


        expect(
          isLECanonicalResourceType(
            "LEAssertion"
          )
        ).toBe(
          true
        );


        expect(
          isLECanonicalResourceType(
            "LEDerivation"
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "rejects unknown resource types",
      () => {

        expect(
          isLECanonicalResourceType(
            "LEUnknown"
          )
        ).toBe(
          false
        );


        expect(
          isLECanonicalResourceType(
            ""
          )
        ).toBe(
          false
        );
      }
    );


    /*
     * Descriptor lookup
     */

    it(
      "returns the canonical descriptor for a resource",
      () => {

        const assertion =
          getLECanonicalResourceDescriptor(
            "LEAssertion"
          );


        expect(
          assertion.type
        ).toBe(
          "LEAssertion"
        );


        expect(
          assertion.layer
        ).toBe(
          "EVIDENTIARY"
        );


        expect(
          assertion.invariants
        ).toContain(
          "LE-102"
        );


        expect(
          assertion.description
        ).not.toBe(
          ""
        );
      }
    );


    /*
     * Semantic layers
     */

    it(
      "places source records in the preserved layer",
      () => {

        expect(
          getLEResourceTypesByLayer(
            "PRESERVED"
          )
        ).toContain(
          "LESourceRecord"
        );
      }
    );


    it(
      "places communications in the preserved layer",
      () => {

        expect(
          getLEResourceTypesByLayer(
            "PRESERVED"
          )
        ).toContain(
          "LECommunication"
        );
      }
    );


    it(
      "places assertions in the evidentiary layer",
      () => {

        expect(
          getLEResourceTypesByLayer(
            "EVIDENTIARY"
          )
        ).toContain(
          "LEAssertion"
        );
      }
    );


    it(
      "places provenance records in the evidentiary layer",
      () => {

        expect(
          getLEResourceTypesByLayer(
            "EVIDENTIARY"
          )
        ).toContain(
          "LEProvenanceRecord"
        );
      }
    );


    it(
      "places derivations in the interpretive layer",
      () => {

        expect(
          getLEResourceTypesByLayer(
            "INTERPRETIVE"
          )
        ).toContain(
          "LEDerivation"
        );
      }
    );


    it(
      "places decisions in the institutional outcome layer",
      () => {

        expect(
          getLEResourceTypesByLayer(
            "INSTITUTIONAL_OUTCOME"
          )
        ).toContain(
          "LEDecision"
        );
      }
    );


    /*
     * LE-101
     */

    it(
      "applies preservation-before-interpretation broadly",
      () => {

        const resources =
          getLEResourceTypesForInvariant(
            "LE-101"
          );


        expect(
          resources
        ).toContain(
          "LESourceRecord"
        );


        expect(
          resources
        ).toContain(
          "LEAssertion"
        );


        expect(
          resources
        ).toContain(
          "LEDerivation"
        );
      }
    );


    /*
     * LE-102
     */

    it(
      "applies assertion-is-not-fact to assertions and communications",
      () => {

        const resources =
          getLEResourceTypesForInvariant(
            "LE-102"
          );


        expect(
          resources
        ).toContain(
          "LEAssertion"
        );


        expect(
          resources
        ).toContain(
          "LECommunication"
        );
      }
    );


    /*
     * LE-103
     */

    it(
      "applies unknown-is-not-pass across resource classes",
      () => {

        const resources =
          getLEResourceTypesForInvariant(
            "LE-103"
          );


        expect(
          resources.length
        ).toBeGreaterThan(
          0
        );


        expect(
          resources
        ).toContain(
          "LEEvidenceItem"
        );


        expect(
          resources
        ).toContain(
          "LEContradiction"
        );
      }
    );


    /*
     * LE-104
     */

    it(
      "maps evidence independence to provenance-bearing resources",
      () => {

        const resources =
          getLEResourceTypesForInvariant(
            "LE-104"
          );


        expect(
          resources
        ).toContain(
          "LEEvidenceItem"
        );


        expect(
          resources
        ).toContain(
          "LESourceRecord"
        );


        expect(
          resources
        ).toContain(
          "LEProvenanceRecord"
        );


        expect(
          resources
        ).toContain(
          "LECorroboration"
        );
      }
    );


    /*
     * LE-105
     */

    it(
      "maps provenance bounds to findings and derivations",
      () => {

        const resources =
          getLEResourceTypesForInvariant(
            "LE-105"
          );


        expect(
          resources
        ).toContain(
          "LEAuditFinding"
        );


        expect(
          resources
        ).toContain(
          "LECorroboration"
        );


        expect(
          resources
        ).toContain(
          "LEDerivation"
        );
      }
    );


    /*
     * LE-106
     */

    it(
      "maps temporal precision to temporal resources",
      () => {

        const resources =
          getLEResourceTypesForInvariant(
            "LE-106"
          );


        expect(
          resources
        ).toContain(
          "LETemporalEntity"
        );


        expect(
          resources
        ).toContain(
          "LEEvidenceItem"
        );


        expect(
          resources
        ).toContain(
          "LEDerivation"
        );
      }
    );


    /*
     * LE-107
     */

    it(
      "maps relation separation to interpretive resources",
      () => {

        const resources =
          getLEResourceTypesForInvariant(
            "LE-107"
          );


        expect(
          resources
        ).toContain(
          "LEResponse"
        );


        expect(
          resources
        ).toContain(
          "LEAgency"
        );


        expect(
          resources
        ).toContain(
          "LEDerivation"
        );
      }
    );


    /*
     * Reference integrity
     */

    it(
      "allows references only to registered resource types",
      () => {

        const known =
          new Set(
            LE_CANONICAL_RESOURCE_TYPES
          );


        for (
          const descriptor
          of Object.values(
            LE_CANONICAL_RESOURCE_REGISTRY
          )
        ) {

          for (
            const referenceType
            of descriptor.mayReference
          ) {

            expect(
              known.has(
                referenceType
              )
            ).toBe(
              true
            );
          }
        }
      }
    );


    /*
     * Derivation behavior
     */

    it(
      "allows derivations to reference canonical resource types",
      () => {

        const derivation =
          getLECanonicalResourceDescriptor(
            "LEDerivation"
          );


        expect(
          new Set(
            derivation.mayReference
          )
        ).toEqual(
          new Set(
            LE_CANONICAL_RESOURCE_TYPES
          )
        );
      }
    );


    it(
      "places every foundational invariant on derivations",
      () => {

        const derivation =
          getLECanonicalResourceDescriptor(
            "LEDerivation"
          );


        expect(
          new Set(
            derivation.invariants
          )
        ).toEqual(
          new Set([
            "LE-101",
            "LE-102",
            "LE-103",
            "LE-104",
            "LE-105",
            "LE-106",
            "LE-107",
          ])
        );
      }
    );


    /*
     * Evidence-source relationship
     */

    it(
      "allows evidence items to reference source records",
      () => {

        const evidence =
          getLECanonicalResourceDescriptor(
            "LEEvidenceItem"
          );


        expect(
          evidence.mayReference
        ).toContain(
          "LESourceRecord"
        );
      }
    );


    /*
     * Communication/assertion separation
     */

    it(
      "keeps communication and assertion as separate resources",
      () => {

        const communication =
          getLECanonicalResourceDescriptor(
            "LECommunication"
          );


        const assertion =
          getLECanonicalResourceDescriptor(
            "LEAssertion"
          );


        expect(
          communication.type
        ).not.toBe(
          assertion.type
        );


        expect(
          communication.layer
        ).toBe(
          "PRESERVED"
        );


        expect(
          assertion.layer
        ).toBe(
          "EVIDENTIARY"
        );


        expect(
          communication.mayReference
        ).toContain(
          "LEAssertion"
        );
      }
    );


    /*
     * Decision/action separation
     */

    it(
      "keeps decisions and institutional actions separate",
      () => {

        const decision =
          getLECanonicalResourceDescriptor(
            "LEDecision"
          );


        const action =
          getLECanonicalResourceDescriptor(
            "LEInstitutionalAction"
          );


        expect(
          decision.type
        ).not.toBe(
          action.type
        );


        expect(
          action.mayReference
        ).toContain(
          "LEDecision"
        );
      }
    );


    /*
     * Contradiction preservation
     */

    it(
      "represents contradiction without collapsing assertions",
      () => {

        const contradiction =
          getLECanonicalResourceDescriptor(
            "LEContradiction"
          );


        expect(
          contradiction.layer
        ).toBe(
          "EVIDENTIARY"
        );


        expect(
          contradiction.mayReference
        ).toContain(
          "LEAssertion"
        );


        expect(
          contradiction.invariants
        ).toContain(
          "LE-103"
        );
      }
    );


    /*
     * Registry self-validation
     */

    it(
      "passes its structural self-check",
      () => {

        const result =
          validateLECanonicalResourceRegistry();


        expect(
          result.valid
        ).toBe(
          true
        );


        expect(
          result.issues
        ).toEqual([]);
      }
    );


    /*
     * Higher-order canonical rule
     */

    it(
      "publishes the provenance-bounded derivation rule",
      () => {

        expect(
          LE_CANONICAL_RESOURCE_RULE
        ).toContain(
          "preserve traceable inputs"
        );


        expect(
          LE_CANONICAL_RESOURCE_RULE
        ).toContain(
          "provenance bounds strength"
        );


        expect(
          LE_CANONICAL_RESOURCE_RULE
        ).toContain(
          "temporal precision"
        );
      }
    );


    /*
     * Exhaustive descriptor properties
     */

    it(
      "gives every resource a layer, description, and invariant set",
      () => {
