import {
  describe,
  expect,
  it,
} from "vitest";

import {
  LE_101,
  LE_102,
  LE_103,
  LE_104,
  LE_105,
  LE_106,
  LE_107,

  LERelationType,

  guardLE101,
  guardLE102,
  guardLE103,
  guardLE104,
  guardLE105,
  guardLE106,
  guardLE107,

  guardLEFoundations,

  type LEFoundationalGuardInput,
} from "../../src/profiles/le/le-foundational-invariants.js";

import {
  Status,
} from "../../src/validation/result.js";


/*
 * LE-101
 * Preservation before interpretation
 */

describe(
  "LE-101 preservation before interpretation",
  () => {

    it(
      "passes when observation and uncertainty are preserved",
      () => {

        const result =
          guardLE101({
            observationId: "obs-1",
            evidenceRef: "evidence-1",
            contextRef: "context-1",
            auditRef: "audit-1",

            preserved: true,
            sourceRecoverable: true,
            uncertaintyPreserved: true,

            interpretationSourceIds: [
              "obs-1",
            ],
          });


        expect(
          result.invariant
        ).toBe(
          LE_101
        );

        expect(
          result.result.status
        ).toBe(
          Status.VALID
        );
      }
    );


    it(
      "fails when interpretation replaces the source",
      () => {

        const result =
          guardLE101({
            observationId: "obs-1",
            evidenceRef: "evidence-1",
            contextRef: "context-1",
            auditRef: "audit-1",

            preserved: false,
            sourceRecoverable: false,
            uncertaintyPreserved: true,

            interpretationSourceIds: [
              "obs-1",
            ],
          });


        expect(
          result.result.status
        ).toBe(
          Status.INVALID
        );
      }
    );


    it(
      "fails when interpretation is not traceable to observation",
      () => {

        const result =
          guardLE101({
            observationId: "obs-1",
            evidenceRef: "evidence-1",
            contextRef: "context-1",
            auditRef: "audit-1",

            preserved: true,
            sourceRecoverable: true,
            uncertaintyPreserved: true,

            interpretationSourceIds: [
              "obs-other",
            ],
          });


        expect(
          result.result.status
        ).toBe(
          Status.INVALID
        );
      }
    );
  }
);


/*
 * LE-102
 * Assertion is not fact
 */

describe(
  "LE-102 assertion is not fact",
  () => {

    it(
      "passes for a preserved assertion not represented as fact",
      () => {

        const result =
          guardLE102({
            assertionId: "assertion-1",
            assertedBy: "source-1",

            state: "ASSERTED",

            evidenceRefs: [],

            evidenceValidated:
              undefined,

            representedAsFact:
              false,
          });


        expect(
          result.invariant
        ).toBe(
          LE_102
        );

        expect(
          result.result.status
        ).toBe(
          Status.VALID
        );
      }
    );


    it(
      "fails when assertion alone is represented as fact",
      () => {

        const result =
          guardLE102({
            assertionId: "assertion-1",
            assertedBy: "source-1",

            state: "ASSERTED",

            evidenceRefs: [],

            evidenceValidated:
              undefined,

            representedAsFact:
              true,
          });


        expect(
          result.result.status
        ).toBe(
          Status.INVALID
        );
      }
    );


    it(
      "does not establish a finding without evidence",
      () => {

        const result =
          guardLE102({
            assertionId: "assertion-1",
            assertedBy: "source-1",

            state: "ESTABLISHED",

            evidenceRefs: [],

            evidenceValidated:
              true,

            representedAsFact:
              true,
          });


        expect(
          result.result.status
        ).toBe(
          Status.INDETERMINATE
        );
      }
    );


    it(
      "passes an established assertion with validated evidence",
      () => {

        const result =
          guardLE102({
            assertionId: "assertion-1",
            assertedBy: "source-1",

            state: "ESTABLISHED",

            evidenceRefs: [
              "evidence-1",
            ],

            evidenceValidated:
              true,

            representedAsFact:
              true,
          });


        expect(
          result.result.status
        ).toBe(
          Status.VALID
        );
      }
    );
  }
);


/*
 * LE-103
 * Unknown is not zero or pass
 */

describe(
  "LE-103 unknown is not zero or pass",
  () => {

    it(
      "passes when a known value remains known",
      () => {

        const result =
          guardLE103({
            input: {
              state: "KNOWN",
              value: 0,
            },

            outputStatus:
              Status.VALID,

            substitutedDefault:
              false,
          });


        expect(
          result.invariant
        ).toBe(
          LE_103
        );

        expect(
          result.result.status
        ).toBe(
          Status.VALID
        );
      }
    );


    it(
      "passes when unknown remains indeterminate",
      () => {

        const result =
          guardLE103({
            input: {
              state: "UNKNOWN",
              reason:
                "Measurement unavailable",
            },

            outputStatus:
              Status.INDETERMINATE,

            substitutedDefault:
              false,
          });


        expect(
          result.result.status
        ).toBe(
          Status.VALID
        );
      }
    );


    it(
      "fails when unknown is replaced with zero",
      () => {

        const result =
          guardLE103({
            input: {
              state: "UNKNOWN",
              reason:
                "Measurement unavailable",
            },

            outputStatus:
              Status.INDETERMINATE,

            substitutedDefault:
              true,

            defaultValue:
              0,
          });


        expect(
          result.result.status
        ).toBe(
          Status.INVALID
        );
      }
    );


    it(
      "fails when unknown produces a passing result",
      () => {

        const result =
          guardLE103({
            input: {
              state: "UNKNOWN",
              reason:
                "Evidence missing",
            },

            outputStatus:
              Status.VALID,

            substitutedDefault:
              false,
          });


        expect(
          result.result.status
        ).toBe(
          Status.INVALID
        );
      }
    );
  }
);


/*
 * LE-104
 * Evidence independence is origin based
 */

describe(
  "LE-104 evidence independence is origin based",
  () => {

    it(
      "counts distinct origins as independent evidence",
      () => {

        const result =
          guardLE104({
            evidence: [
              {
                evidenceId: "e1",
                originId: "origin-a",
                parentEvidenceIds: [],
              },

              {
                evidenceId: "e2",
                originId: "origin-b",
                parentEvidenceIds: [],
              },
            ],

            claimedIndependentCount:
              2,
          });


        expect(
          result.invariant
        ).toBe(
          LE_104
        );

        expect(
          result.result.status
        ).toBe(
          Status.VALID
        );
      }
    );


    it(
      "rejects duplicate records counted as independent origins",
      () => {

        const result =
          guardLE104({
            evidence: [
              {
                evidenceId: "raw",
                originId: "origin-a",
                parentEvidenceIds: [],
              },

              {
                evidenceId: "report",
                originId: "origin-a",
                parentEvidenceIds: [
                  "raw",
                ],
              },

              {
                evidenceId: "summary",
                originId: "origin-a",
                parentEvidenceIds: [
                  "report",
                ],
              },
            ],

            claimedIndependentCount:
              3,
          });


        expect(
          result.result.status
        ).toBe(
          Status.INVALID
        );
      }
    );


    it(
      "is indeterminate when origin is unknown",
      () => {

        const result =
          guardLE104({
            evidence: [
              {
                evidenceId: "e1",
                originId:
                  undefined,
                parentEvidenceIds: [],
              },
            ],

            claimedIndependentCount:
              1,
          });


        expect(
          result.result.status
        ).toBe(
          Status.INDETERMINATE
        );
      }
    );
  }
);


/*
 * LE-105
 * Finding strength is provenance bounded
 */

describe(
  "LE-105 finding strength is provenance bounded",
  () => {

    it(
      "passes when finding does not exceed provenance bound",
      () => {

        const result =
          guardLE105({
            findingStrength:
              3,

            maximumProvenanceStrength:
              3,

            independentOrigins:
              2,

            transformationCount:
              1,
          });


        expect(
          result.invariant
        ).toBe(
          LE_105
        );

        expect(
          result.result.status
        ).toBe(
          Status.VALID
        );
      }
    );


    it(
      "fails when finding strength exceeds provenance",
      () => {

        const result =
          guardLE105({
            findingStrength:
              4,

            maximumProvenanceStrength:
              2,

            independentOrigins:
              1,

            transformationCount:
              5,
          });


        expect(
          result.result.status
        ).toBe(
          Status.INVALID
        );
      }
    );


    it(
      "does not resolve strength when origin count is unknown",
      () => {

        const result =
          guardLE105({
            findingStrength:
              2,

            maximumProvenanceStrength:
              2,

            independentOrigins:
              undefined,

            transformationCount:
              1,
          });


        expect(
          result.result.status
        ).toBe(
          Status.INDETERMINATE
        );
      }
    );
  }
);


/*
 * LE-106
 * Temporal precision cannot be manufactured
 */

describe(
  "LE-106 temporal precision cannot be manufactured",
  () => {

    it(
      "passes when derived time is no more precise than source",
      () => {

        const result =
          guardLE106({
            sourceRange: {
              earliest: 100,
              latest: 200,
            },

            derivedRange: {
              earliest: 90,
              latest: 210,
            },

            additionalTemporalEvidence: [],
          });


        expect(
          result.invariant
        ).toBe(
          LE_106
        );

        expect(
          result.result.status
        ).toBe(
          Status.VALID
        );
      }
    );


    it(
      "fails when precision is manufactured",
      () => {

        const result =
          guardLE106({
            sourceRange: {
              earliest: 100,
              latest: 200,
            },

            derivedRange: {
              earliest: 149,
              latest: 151,
            },

            additionalTemporalEvidence: [],
          });


        expect(
          result.result.status
        ).toBe(
          Status.INVALID
        );
      }
    );


    it(
      "permits narrower time when additional evidence has provenance",
      () => {

        const result =
          guardLE106({
            sourceRange: {
              earliest: 100,
              latest: 200,
            },

            derivedRange: {
              earliest: 149,
              latest: 151,
            },

            additionalTemporalEvidence: [
              {
                evidenceId:
                  "clock-record",

                originId:
                  "clock-origin",

                parentEvidenceIds: [],
              },
            ],
          });


        expect(
          result.result.status
        ).toBe(
          Status.VALID
        );
      }
    );


    it(
      "is indeterminate when additional timing provenance is unresolved",
      () => {

        const result =
          guardLE106({
            sourceRange: {
              earliest: 100,
              latest: 200,
            },

            derivedRange: {
              earliest: 149,
              latest: 151,
            },

            additionalTemporalEvidence: [
              {
                evidenceId:
                  "clock-record",

                originId:
                  undefined,

                parentEvidenceIds: [],
              },
            ],
          });


        expect(
          result.result.status
        ).toBe(
          Status.INDETERMINATE
        );
      }
    );
  }
);


/*
 * LE-107
 * Relation types remain separate
 */

describe(
  "LE-107 relation types remain separate",
  () => {

    it(
      "passes when requested relation has relation-specific evidence",
      () => {

        const result =
          guardLE107({
            establishedRelations: [
              {
                relation:
                  LERelationType.CAUSATION,

                subjectId:
                  "A",

                objectId:
                  "B",

                evidenceRefs: [
                  "causal-evidence",
                ],
              },
            ],

            requestedRelation:
              LERelationType.CAUSATION,

            requestedRelationEvidence: [
              "causal-evidence",
            ],
          });


        expect(
          result.invariant
        ).toBe(
          LE_107
        );

        expect(
          result.result.status
        ).toBe(
          Status.VALID
        );
      }
    );


    it(
      "does not convert association into causation",
      () => {

        const result =
          guardLE107({
            establishedRelations: [
              {
                relation:
                  LERelationType.ASSOCIATION,

                subjectId:
                  "A",

                objectId:
                  "B",

                evidenceRefs: [
                  "association-evidence",
                ],
              },
            ],

            requestedRelation:
              LERelationType.CAUSATION,

            requestedRelationEvidence: [
              "association-evidence",
            ],
          });


        expect(
          result.result.status
        ).toBe(
          Status.INVALID
        );
      }
    );


    it(
      "does not convert coordination into authorization",
      () => {

        const result =
          guardLE107({
            establishedRelations: [
              {
                relation:
                  LERelationType.COORDINATION,

                subjectId:
                  "A",

                objectId:
                  "B",

                evidenceRefs: [
                  "coordination-evidence",
                ],
              },
            ],

            requestedRelation:
              LERelationType.AUTHORIZATION,

            requestedRelationEvidence: [
              "coordination-evidence",
            ],
          });


        expect(
          result.result.status
        ).toBe(
          Status.INVALID
        );
      }
    );


    it(
      "is indeterminate without relation-specific evidence",
      () => {

        const result =
          guardLE107({
            establishedRelations: [
              {
                relation:
                  LERelationType.ATTRIBUTION,

                subjectId:
                  "A",

                objectId:
                  "B",

                evidenceRefs: [
                  "attribution-evidence",
                ],
              },
            ],

            requestedRelation:
              LERelationType.ATTRIBUTION,

            requestedRelationEvidence: [],
          });


        expect(
          result.result.status
        ).toBe(
          Status.INDETERMINATE
        );
      }
    );
  }
);


/*
 * Combined foundational guard
 */

describe(
  "TMO LE foundational invariant gate",
  () => {

    const validInput:
      LEFoundationalGuardInput = {

      le101: {
        observationId: "obs-1",
        evidenceRef: "e1",
        contextRef: "ctx-1",
        auditRef: "audit-1",

        preserved: true,
        sourceRecoverable: true,
        uncertaintyPreserved: true,

        interpretationSourceIds: [
          "obs-1",
        ],
      },


      le102: {
        assertionId: "assertion-1",
        assertedBy: "source-1",

        state: "ESTABLISHED",

        evidenceRefs: [
          "evidence-1",
        ],

        evidenceValidated:
          true,

        representedAsFact:
          true,
      },


      le103: {
        input: {
          state: "KNOWN",
          value: 10,
        },

        outputStatus:
          Status.VALID,

        substitutedDefault:
          false,
      },


      le104: {
        evidence: [
          {
            evidenceId: "e1",
            originId: "origin-1",
            parentEvidenceIds: [],
          },

          {
            evidenceId: "e2",
            originId: "origin-2",
            parentEvidenceIds: [],
          },
        ],

        claimedIndependentCount:
          2,
      },


      le105: {
        findingStrength:
          3,

        maximumProvenanceStrength:
          3,

        independentOrigins:
          2,

        transformationCount:
          1,
      },


      le106: {
        sourceRange: {
          earliest: 100,
          latest: 200,
        },

        derivedRange: {
          earliest: 100,
          latest: 200,
        },

        additionalTemporalEvidence: [],
      },


      le107: {
        establishedRelations: [
          {
            relation:
              LERelationType.ASSOCIATION,

            subjectId:
              "A",

            objectId:
              "B",

            evidenceRefs: [
              "relationship-evidence",
            ],
          },
        ],

        requestedRelation:
          LERelationType.ASSOCIATION,

        requestedRelationEvidence: [
          "relationship-evidence",
        ],
      },
    };


    it(
      "passes when all foundational invariants pass",
      () => {

        const result =
          guardLEFoundations(
            validInput
          );


        expect(
          result.status
        ).toBe(
          Status.VALID
        );

        expect(
          result.passed
        ).toBe(
          true
        );

        expect(
          result.invariants
        ).toHaveLength(
          7
        );

        expect(
          result.failed
        ).toEqual([]);

        expect(
          result.indeterminate
        ).toEqual([]);
      }
    );


    it(
      "becomes INVALID if one foundational invariant fails",
      () => {

        const input:
          LEFoundationalGuardInput = {

          ...validInput,

          le107: {
            establishedRelations: [
              {
                relation:
                  LERelationType.ASSOCIATION,

                subjectId: "A",
                objectId: "B",

                evidenceRefs: [
                  "evidence-1",
                ],
              },
            ],

            requestedRelation:
              LERelationType.CAUSATION,

            requestedRelationEvidence: [
              "evidence-1",
            ],
          },
        };


        const result =
          guardLEFoundations(
            input
          );


        expect(
          result.status
        ).toBe(
          Status.INVALID
        );

        expect(
          result.passed
        ).toBe(
          false
        );

        expect(
          result.failed.some(
            invariant =>
              invariant.invariant ===
                LE_107
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "becomes INDETERMINATE if no guard fails but one remains unknown",
      () => {

        const input:
          LEFoundationalGuardInput = {

          ...validInput,

          le104: {
            evidence: [
              {
                evidenceId:
                  "e1",

                originId:
                  undefined,

                parentEvidenceIds: [],
              },
            ],

            claimedIndependentCount:
              1,
          },
        };


        const result =
          guardLEFoundations(
            input
          );


        expect(
          result.status
        ).toBe(
          Status.INDETERMINATE
        );

        expect(
          result.passed
        ).toBe(
          false
        );

        expect(
          result.indeterminate
            .some(
              invariant =>
                invariant.invariant ===
                  LE_104
            )
        ).toBe(
          true
        );
      }
    );
  }
);
