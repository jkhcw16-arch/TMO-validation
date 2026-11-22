/** TMO LE conflict-resolution precedence. */
export enum LEConflictResolutionStage {
  PRESERVATION = 0,
  COMPARABILITY = 1,
  PROVENANCE = 2,
  INDEPENDENCE = 3,
  VALIDITY = 4,
  SPECIFICITY = 5,
  TEMPORAL_APPLICABILITY = 6,
  CORROBORATION = 7,
  RELATION_PROOF = 8,
  DERIVATION = 9,
  RESOLUTION = 10,
}

export type LEResolutionState =
  | "RESOLVED"
  | "PROBABLE_MATCH"
  | "POSSIBLE_MATCH"
  | "UNRESOLVED"
  | "CONFLICT";

export interface LEConflictResolutionGate {
  readonly preservation: boolean;
  readonly comparable: boolean | undefined;
  readonly provenanceResolved: boolean | undefined;
  readonly independenceResolved: boolean | undefined;
  readonly evidenceValidated: boolean | undefined;
  readonly specificityEvaluated: boolean | undefined;
  readonly temporalApplicabilityResolved: boolean | undefined;
  readonly corroborationEvaluated: boolean | undefined;
  readonly relationProofSatisfied: boolean | undefined;
  readonly derivationRecorded: boolean;
}

export interface LEConflictEvidenceState {
  readonly supportingEvidenceIds: readonly string[];
  readonly contradictingEvidenceIds: readonly string[];
  readonly unresolvedEvidenceIds: readonly string[];
}

export interface LEConflictResolutionDerivation {
  readonly conflictId: string;
  readonly inputEvidenceIds: readonly string[];
  readonly independentOriginIds: readonly string[];
  readonly acceptedEvidenceIds: readonly string[];
  readonly rejectedEvidenceIds: readonly string[];
  readonly unresolvedEvidenceIds: readonly string[];
  readonly ruleIds: readonly string[];
  readonly previousState: "CONFLICT";
  readonly resultingState: LEResolutionState;
}

export const LE_CONFLICT_RESOLUTION_PRECEDENCE = [
  LEConflictResolutionStage.PRESERVATION,
  LEConflictResolutionStage.COMPARABILITY,
  LEConflictResolutionStage.PROVENANCE,
  LEConflictResolutionStage.INDEPENDENCE,
  LEConflictResolutionStage.VALIDITY,
  LEConflictResolutionStage.SPECIFICITY,
  LEConflictResolutionStage.TEMPORAL_APPLICABILITY,
  LEConflictResolutionStage.CORROBORATION,
  LEConflictResolutionStage.RELATION_PROOF,
  LEConflictResolutionStage.DERIVATION,
  LEConflictResolutionStage.RESOLUTION,
] as const;

export function canResolveConflict(gate: LEConflictResolutionGate): boolean {
  return (
    gate.preservation === true &&
    gate.comparable === true &&
    gate.provenanceResolved === true &&
    gate.independenceResolved === true &&
    gate.evidenceValidated === true &&
    gate.specificityEvaluated === true &&
    gate.temporalApplicabilityResolved === true &&
    gate.corroborationEvaluated === true &&
    gate.relationProofSatisfied === true &&
    gate.derivationRecorded === true
  );
}

export function conflictHasPrecedence(evidence: LEConflictEvidenceState): boolean {
  return evidence.supportingEvidenceIds.length > 0 && evidence.contradictingEvidenceIds.length > 0;
}

export function unresolvedHasPrecedence(evidence: LEConflictEvidenceState): boolean {
  return evidence.unresolvedEvidenceIds.length > 0 && !conflictHasPrecedence(evidence);
}

export function validateConflictResolutionDerivation(
  derivation: LEConflictResolutionDerivation,
  gate: LEConflictResolutionGate,
): boolean {
  if (!derivation.conflictId.trim()) return false;
  if (derivation.previousState !== "CONFLICT") return false;
  if (!canResolveConflict(gate) && derivation.resultingState !== "CONFLICT") return false;
  if (derivation.inputEvidenceIds.length === 0) return false;
  if (derivation.ruleIds.length === 0) return false;
  return true;
}
