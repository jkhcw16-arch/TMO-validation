import {
  describe,
  expect,
  it,
} from "vitest";

import {
  LEInterface,
  classifyLEInterface,
  validateReciprocalCenter,
  type ReciprocalCenterInput,
} from "../../src/validation/reciprocal-center-le-validation.js";

import {
  Status,
} from "../../src/validation/result.js";


const baseInput = (
  delta:
    ReciprocalCenterInput["delta"]
):
  ReciprocalCenterInput => ({

  evaluationId:
    "rc-001",

  time:
    1,

  participantA: {
    value: 25,
    reliability: 0.6,
    evidenceRef: "ev:a",
  },

  participantB: {
    value: 75,
    reliability: 0.7,
    evidenceRef: "ev:b",
  },

  evidence: {
    value: 60,
    reliability: 0.9,
    evidenceRef: "ev:z",
  },

  delta,

  auditRef:
    "audit:rc-001",

  generatedAt:
    "2026-11-21T00:00:00.000Z",
});


describe(
  "reciprocal center LE validation",
  () => {

    it(
      "classifies reciprocal information gain as LEARNING",
      () => {

        const input =
          baseInput({

            informationGainA: 4,
            informationGainB: 2,

            motivationGainA: 1,
            motivationGainB: 1,

            forceChangeA: 0,
            forceChangeB: 0,

            distortionChangeA: 0,
            distortionChangeB: 0,
          });


        const result =
          validateReciprocalCenter(
            input
          );


        expect(
          result.validation.status
        ).toBe(
          Status.VALID
        );


        expect(
          result.metrics?.interface
        ).toBe(
          LEInterface.LEARNING
        );


        expect(
          result.output?.status
        ).toBe(
          "VALID"
        );


        expect(
          result.output?.assertions
            .map(
              assertion =>
                assertion.kind
            )
        ).toEqual([

          "OBSERVATION",

          "RELATION",

          "TEMPORAL_CHANGE",

          "CONTEXTUAL_CONDITION",
        ]);
      }
    );


    it(
      "classifies reciprocal force growth as ESCALATION",
      () => {

        const delta = {

          informationGainA: 0,
          informationGainB: 0,

          motivationGainA: 0,
          motivationGainB: 0,

          forceChangeA: 0.2,
          forceChangeB: 0.3,

          distortionChangeA: 0.02,
          distortionChangeB: 0.03,
        };


        expect(
          classifyLEInterface(
            delta
          )
        ).toBe(
          LEInterface.ESCALATION
        );
      }
    );


    it(
      "classifies zero change as NULL",
      () => {

        const zero = {

          informationGainA: 0,
          informationGainB: 0,

          motivationGainA: 0,
          motivationGainB: 0,

          forceChangeA: 0,
          forceChangeB: 0,

          distortionChangeA: 0,
          distortionChangeB: 0,
        };


        expect(
          classifyLEInterface(
            zero
          )
        ).toBe(
          LEInterface.NULL
        );
      }
    );


    it(
      "returns INDETERMINATE for mixed signals",
      () => {

        const input =
          baseInput({

            informationGainA: 2,
            informationGainB: 1,

            motivationGainA: 0,
            motivationGainB: 0,

            forceChangeA: 0.4,
            forceChangeB: 0,

            distortionChangeA: 0.1,
            distortionChangeB: 0,
          });


        const result =
          validateReciprocalCenter(
            input
          );


        expect(
          result.validation.status
        ).toBe(
          Status.INDETERMINATE
        );


        expect(
          result.metrics?.interface
        ).toBe(
          LEInterface.MIXED
        );


        expect(
          result.output?.status
        ).toBe(
          "INDETERMINATE"
        );
      }
    );


    it(
      "does not derive a center with zero reliability",
      () => {

        const input =
          baseInput({

            informationGainA: 1,
            informationGainB: 1,

            motivationGainA: 1,
            motivationGainB: 1,

            forceChangeA: 0,
            forceChangeB: 0,

            distortionChangeA: 0,
            distortionChangeB: 0,
          });


        const zero = {

          ...input,

          participantA: {
            ...input.participantA,
            reliability: 0,
          },

          participantB: {
            ...input.participantB,
            reliability: 0,
          },

          evidence: {
            ...input.evidence,
            reliability: 0,
          },
        };


        const result =
          validateReciprocalCenter(
            zero
          );


        expect(
          result.validation.status
        ).toBe(
          Status.INDETERMINATE
        );


        expect(
          result.metrics
        ).toBeUndefined();
      }
    );
  }
);

