import { createHash } from "node:crypto";

import {
  CORE_OUTPUT_CONTRACT,
  CORE_OUTPUT_VERSION,
  CoreOutputStatus,
  asCoreAuditRef,
  asCoreDigest,
  asCoreEvaluationId,
  asCoreEvidenceRef,
  type CoreAssertion,
  type CoreEvidenceRef,
  type CoreOutputEnvelope,
} from "../core/contract/core-output.types.js";

import {
  FailureCode,
  Status,
  VALID,
  indeterminate,
  invalid,
  type ValidationResult,
} from "./result.js";

/**
 * Reciprocal Center / LE validation.
 *
 * Separates:
 * 1. observations,
 * 2. derived center values,
 * 3. temporal differences,
 * 4. LE interface classification.
 *
 * Convergence alone never establishes learning.
 */

export enum LEInterface {
  LEARNING = "LEARNING",
  ESCALATION = "ESCALATION",
  NULL = "NULL",
  MIXED = "MIXED",
}

export interface PerspectiveObservation {
  readonly value: number;
  readonly reliability: number;
  readonly evidenceRef: string;
}

export interface InteractionDelta {
  readonly informationGainA: number;
  readonly informationGainB: number;

  readonly motivationGainA: number;
  readonly motivationGainB: number;

  readonly forceChangeA: number;
  readonly forceChangeB: number;

  readonly distortionChangeA: number;
  readonly distortionChangeB: number;
}

export interface ReciprocalCenterInput {
  readonly evaluationId: string;
  readonly time: number;

  readonly participantA: PerspectiveObservation;
  readonly participantB: PerspectiveObservation;
  readonly evidence: PerspectiveObservation;

  readonly delta: InteractionDelta;

  readonly auditRef: string;
  readonly generatedAt: string;
}

export interface ReciprocalCenterPolicy {
  readonly epsilon: number;

  readonly maxDistortionForLearning: number;

  readonly informationWeight: number;
  readonly reciprocalWeight: number;

  readonly forcePenalty: number;
  readonly distortionPenalty: number;
}

export interface CenterWeights {
  readonly participantA: number;
  readonly participantB: number;
  readonly evidence: number;
}

export interface ReciprocalCenterMetrics {
  readonly center: number;

  readonly weights: CenterWeights;

  readonly informationGain: number;
  readonly reciprocalValue: number;

  readonly forceChange: number;
  readonly distortionChange: number;

  readonly quality: number;

  readonly interface: LEInterface;
}

export interface ReciprocalCenterValidation {
  readonly validation: ValidationResult;

  readonly metrics?: ReciprocalCenterMetrics;

  readonly output?: CoreOutputEnvelope;
}


export const DEFAULT_RECIPROCAL_CENTER_POLICY:
  ReciprocalCenterPolicy = {

  epsilon: 1e-9,

  maxDistortionForLearning: 0,

  informationWeight: 1,
  reciprocalWeight: 1,

  forcePenalty: 1,
  distortionPenalty: 1,
};


const isFiniteNumber = (
  value: number
): boolean => Number.isFinite(value);


const sum = (
  ...values: readonly number[]
): number =>
  values.reduce(
    (total, value) => total + value,
    0
  );


function validatePolicy(
  policy: ReciprocalCenterPolicy
): ValidationResult {

  const values = [
    policy.epsilon,
    policy.maxDistortionForLearning,
    policy.informationWeight,
    policy.reciprocalWeight,
    policy.forcePenalty,
    policy.distortionPenalty,
  ];

  if (!values.every(isFiniteNumber)) {
    return invalid(
      FailureCode.TYPE,
      "Policy values must be finite numbers"
    );
  }

  if (
    policy.epsilon < 0 ||
    policy.maxDistortionForLearning < 0
  ) {
    return invalid(
      FailureCode.SEMANTIC,
      "Policy thresholds cannot be negative"
    );
  }

  if (
    policy.informationWeight < 0 ||
    policy.reciprocalWeight < 0 ||
    policy.forcePenalty < 0 ||
    policy.distortionPenalty < 0
  ) {
    return invalid(
      FailureCode.SEMANTIC,
      "Quality weights and penalties cannot be negative"
    );
  }

  return VALID;
}


function validatePerspective(
  label: string,
  observation: PerspectiveObservation
): ValidationResult {

  if (
    !isFiniteNumber(observation.value) ||
    !isFiniteNumber(observation.reliability)
  ) {
    return invalid(
      FailureCode.TYPE,
      `${label} value and reliability must be finite`
    );
  }

  if (observation.reliability < 0) {
    return invalid(
      FailureCode.SEMANTIC,
      `${label} reliability cannot be negative`
    );
  }

  if (!observation.evidenceRef.trim()) {
    return indeterminate(
      FailureCode.MISSING,
      `${label} evidenceRef is required`
    );
  }

  return VALID;
}


function validateInput(
  input: ReciprocalCenterInput
): ValidationResult {

  if (
    !input.evaluationId.trim() ||
    !input.auditRef.trim()
  ) {
    return invalid(
      FailureCode.SCHEMA,
      "evaluationId and auditRef are required"
    );
  }

  if (!isFiniteNumber(input.time)) {
    return invalid(
      FailureCode.TYPE,
      "time must be finite"
    );
  }

  if (
    Number.isNaN(
      Date.parse(input.generatedAt)
    )
  ) {
    return invalid(
      FailureCode.TYPE,
      "generatedAt must be an ISO-compatible timestamp"
    );
  }

  const observations = [
    ["participantA", input.participantA],
    ["participantB", input.participantB],
    ["evidence", input.evidence],
  ] as const;

  for (
    const [label, observation]
    of observations
  ) {
    const result =
      validatePerspective(
        label,
        observation
      );

    if (
      result.status !== Status.VALID
    ) {
      return result;
    }
  }

  const deltaValues =
    Object.values(input.delta);

  if (
    !deltaValues.every(isFiniteNumber)
  ) {
    return invalid(
      FailureCode.TYPE,
      "All interaction deltas must be finite numbers"
    );
  }

  return VALID;
}


export function normalizeCenterWeights(
  participantA: PerspectiveObservation,
  participantB: PerspectiveObservation,
  evidence: PerspectiveObservation
): CenterWeights | undefined {

  const total =
    participantA.reliability +
    participantB.reliability +
    evidence.reliability;

  if (total <= 0) {
    return undefined;
  }

  return {
    participantA:
      participantA.reliability / total,

    participantB:
      participantB.reliability / total,

    evidence:
      evidence.reliability / total,
  };
}


export function classifyLEInterface(
  delta: InteractionDelta,
  policy:
    ReciprocalCenterPolicy =
      DEFAULT_RECIPROCAL_CENTER_POLICY
): LEInterface {

  const informationGain =
    sum(
      delta.informationGainA,
      delta.informationGainB
    );

  const reciprocalValue =
    sum(
      informationGain,
      delta.motivationGainA,
      delta.motivationGainB
    );

  const forceChange =
    sum(
      delta.forceChangeA,
      delta.forceChangeB
    );

  const distortionChange =
    sum(
      delta.distortionChangeA,
      delta.distortionChangeB
    );

  const epsilon =
    policy.epsilon;


  /*
   * ESCALATION
   *
   * Both sides increase force.
   */

  if (
    delta.forceChangeA > epsilon &&
    delta.forceChangeB > epsilon
  ) {
    return LEInterface.ESCALATION;
  }


  /*
   * LEARNING
   *
   * Learning requires:
   * - useful information gain
   * - reciprocal constructive value
   * - no meaningful force increase
   * - distortion below threshold
   *
   * Participant convergence by itself
   * does not satisfy this condition.
   */

  if (
    informationGain > epsilon &&
    reciprocalValue > epsilon &&
    forceChange <= epsilon &&
    distortionChange <=
      policy.maxDistortionForLearning +
        epsilon
  ) {
    return LEInterface.LEARNING;
  }


  /*
   * NULL
   *
   * No material information,
   * reciprocal value,
   * force,
   * or distortion change.
   */

  if (
    Math.abs(informationGain)
      <= epsilon &&

    Math.abs(reciprocalValue)
      <= epsilon &&

    Math.abs(forceChange)
      <= epsilon &&

    Math.abs(distortionChange)
      <= epsilon
  ) {
    return LEInterface.NULL;
  }


  /*
   * Anything not uniquely described
   * by one of the three interfaces
   * remains MIXED.
   */

  return LEInterface.MIXED;
}


export function
deriveReciprocalCenterMetrics(
  input: ReciprocalCenterInput,

  policy:
    ReciprocalCenterPolicy =
      DEFAULT_RECIPROCAL_CENTER_POLICY
):
  ReciprocalCenterMetrics |
  undefined {

  const weights =
    normalizeCenterWeights(
      input.participantA,
      input.participantB,
      input.evidence
    );

  if (!weights) {
    return undefined;
  }


  const informationGain =
    sum
