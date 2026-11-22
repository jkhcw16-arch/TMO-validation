import {
  FailureCode,
  Status,
  VALID,
  indeterminate,
  invalid,
  type ValidationResult,
} from "../../validation/result.js";


/*
 * Foundational invariant identifiers
 */

export const LE_101 =
  "LE-101" as const;

export const LE_102 =
  "LE-102" as const;

export const LE_103 =
  "LE-103" as const;

export const LE_104 =
  "LE-104" as const;

export const LE_105 =
  "LE-105" as const;

export const LE_106 =
  "LE-106" as const;

export const LE_107 =
  "LE-107" as const;


export type LEFoundationalInvariantId =
  | typeof LE_101
  | typeof LE_102
  | typeof LE_103
  | typeof LE_104
  | typeof LE_105
  | typeof LE_106
  | typeof LE_107;


/*
 * Shared predicate result
 */

export interface LEInvariantResult {
  readonly invariant:
    LEFoundationalInvariantId;

  readonly result:
    ValidationResult;
}


const passed = (
  invariant:
    LEFoundationalInvariantId
): LEInvariantResult => ({

  invariant,

  result:
    VALID,
});


const failed = (
  invariant:
    LEFoundationalInvariantId,

  failure:
    FailureCode,

  details:
    string
): LEInvariantResult => ({

  invariant,

  result:
    invalid(
      failure,
      details
    ),
});


const unresolved = (
  invariant:
    LEFoundationalInvariantId,

  failure:
    FailureCode,

  details:
    string
): LEInvariantResult => ({

  invariant,

  result:
    indeterminate(
      failure,
      details
    ),
});


const nonEmpty = (
  value: string
): boolean =>
  value.trim().length > 0;


const finiteNonNegative = (
  value: number
): boolean =>
  Number.isFinite(value) &&
  value >= 0;


/*
 * LE-101
 * Preservation before interpretation
 */

export interface LE101Input {
  readonly observationId:
    string;

  readonly evidenceRef:
    string;

  readonly contextRef:
    string;

  readonly auditRef:
    string;

  readonly preserved:
    boolean;

  readonly sourceRecoverable:
    boolean;

  readonly uncertaintyPreserved:
    boolean;

  readonly interpretationSourceIds:
    readonly string[];
}


export function guardLE101(
  input: LE101Input
): LEInvariantResult {

  if (
    !nonEmpty(input.observationId) ||
    !nonEmpty(input.evidenceRef) ||
    !nonEmpty(input.contextRef) ||
    !nonEmpty(input.auditRef)
  ) {
    return unresolved(
      LE_101,
      FailureCode.MISSING,
      "Observation identity, evidence, context, " +
      "and audit lineage are required"
    );
  }


  if (
    !input.preserved ||
    !input.sourceRecoverable
  ) {
    return failed(
      LE_101,
      FailureCode.CONFLICT,
      "The source observation was not preserved " +
      "as an independently recoverable record"
    );
  }


  if (
    !input.uncertaintyPreserved
  ) {
    return failed(
      LE_101,
      FailureCode.SEMANTIC,
      "Interpretation changed or removed the " +
      "observation's uncertainty state"
    );
  }


  if (
    !input.interpretationSourceIds
      .includes(
        input.observationId
      )
  ) {
    return failed(
      LE_101,
      FailureCode.CONFLICT,
      "Interpretation is not traceable to the " +
      "preserved observation"
    );
  }


  return passed(LE_101);
}


/*
 * LE-102
 * Assertion is not fact
 */

export type LEAssertionState =
  | "ASSERTED"
  | "CORROBORATED"
  | "ESTABLISHED"
  | "REFUTED"
  | "UNKNOWN";


export interface LE102Input {
  readonly assertionId:
    string;

  readonly assertedBy:
    string;

  readonly state:
    LEAssertionState;

  readonly evidenceRefs:
    readonly string[];

  readonly evidenceValidated:
    boolean | undefined;

  readonly representedAsFact:
    boolean;
}


export function guardLE102(
  input: LE102Input
): LEInvariantResult {

  if (
    !nonEmpty(input.assertionId) ||
    !nonEmpty(input.assertedBy)
  ) {
    return unresolved(
      LE_102,
      FailureCode.MISSING,
      "Assertion identity and asserting source " +
      "are required"
    );
  }


  if (
    input.state === "ASSERTED" &&
    input.representedAsFact
  ) {
    return failed(
      LE_102,
      FailureCode.SEMANTIC,
      "An assertion cannot be represented as fact " +
      "solely because it was asserted"
    );
  }


  if (
    input.state === "ESTABLISHED"
  ) {
    if (
      input.evidenceRefs.length === 0
    ) {
      return unresolved(
        LE_102,
        FailureCode.MISSING,
        "An established assertion requires evidence"
      );
    }


    if (
      input.evidenceValidated === undefined
    ) {
      return unresolved(
        LE_102,
        FailureCode.MISSING,
        "Evidence validation state is unknown"
      );
    }


    if (
      !input.evidenceValidated
    ) {
      return failed(
        LE_102,
        FailureCode.CONFLICT,
        "The assertion is represented as established " +
        "but its evidence was not validated"
      );
    }
  }


  if (
    input.state === "UNKNOWN" &&
    input.representedAsFact
  ) {
    return failed(
      LE_102,
      FailureCode.SEMANTIC,
      "An unknown assertion cannot be represented " +
      "as fact"
    );
  }


  return passed(LE_102);
}


/*
 * LE-103
 * Unknown is not zero, false, or pass
 */

export type LEKnownValue<T> =
  | {
      readonly state:
        "KNOWN";

      readonly value:
        T;
    }
  | {
      readonly state:
        "UNKNOWN";

      readonly reason:
        string;
    };


export interface LE103Input<T> {
  readonly input:
    LEKnownValue<T>;

  readonly outputStatus:
    Status;

  readonly substitutedDefault:
    boolean;

  readonly defaultValue?:
    T;
}


export function guardLE103<T>(
  input: LE103Input<T>
): LEInvariantResult {

  if (
    input.input.state === "KNOWN"
  ) {
    return passed(LE_103);
  }


  if (
    !nonEmpty(input.input.reason)
  ) {
    return unresolved(
      LE_103,
      FailureCode.MISSING,
      "Unknown state requires a reason"
    );
  }


  if (
    input.substitutedDefault
  ) {
    return failed(
      LE_103,
      FailureCode.SEMANTIC,
      "Unknown value was replaced with a default, " +
      "zero, false, or equivalent value"
    );
  }


  if (
    input.outputStatus ===
      Status.VALID
  ) {
    return failed(
      LE_103,
      FailureCode.CONFLICT,
      "Unknown input cannot produce a passed " +
      "validation result"
    );
  }


  if (
    input.outputStatus !==
      Status.INDETERMINATE
  ) {
    return failed(
      LE_103,
      FailureCode.SEMANTIC,
      "Unknown input must remain indeterminate " +
      "unless independent evidence resolves it"
    );
  }


  return passed(LE_103);
}


/*
 * LE-104
 * Evidence independence is origin-based
 */

export interface LEProvenanceNode {
  readonly evidenceId:
    string;

  /*
   * The earliest identified originating source.
   * Two records with the same origin are not
   * independent merely because their record IDs differ.
   */
  readonly originId:
    string | undefined;

  readonly parentEvidenceIds:
    readonly string[];
}


export interface LE104Input {
  readonly evidence:
    readonly LEProvenanceNode[];

  readonly claimedIndependentCount:
    number;
}


export function guardLE104(
  input: LE104Input
): LEInvariantResult {

  if (
    !Number.isSafeInteger(
      input.claimedIndependentCount
    ) ||
    input.claimedIndependentCount < 0
  ) {
    return failed(
      LE_104,
      FailureCode.TYPE,
      "Claimed independent count must be a " +
      "non-negative safe integer"
    );
  }


  if (
    input.evidence.length === 0
  ) {
    return unresolved(
      LE_104,
      FailureCode.MISSING,
      "No evidence records were supplied"
    );
  }


  if (
    input.evidence.some(
      item =>
        item.originId === undefined ||
        !nonEmpty(item.originId)
    )
  ) {
    return unresolved(
      LE_104,
      FailureCode.MISSING,
      "Evidence independence cannot be determined " +
      "until every record has an identified origin"
    );
  }


  const origins =
    new Set(
      input.evidence.map(
        item =>
          item.originId as string
      )
    );


  if (
    input.claimedIndependentCount !==
      origins.size
  ) {
    return failed(
      LE_104,
      FailureCode.CONFLICT,
      "Claimed evidence independence does not match " +
      "the number of distinct origins"
    );
  }


  return passed(LE_104);
}


/*
 * LE-105
 * Finding strength is provenance bounded
 */

export type LEProvenanceStrength =
  | 0
  | 1
  | 2
  | 3
  | 4;


export interface LE105Input {
  /*
   * 0 = unsupported
   * 1 = asserted or weak
   * 2 = limited
   * 3 = supported
   * 4 = established under the relevant policy
   */

  readonly findingStrength:
    LEProvenanceStrength;

  readonly maximumProvenanceStrength:
    LEProvenanceStrength;

  readonly independentOrigins:
    number | undefined;

  readonly transformationCount:
    number;
}


export function guardLE105(
  input: LE105Input
): LEInvariantResult {

  if (
    !Number.isSafeInteger(
      input.transformationCount
    ) ||
    input.transformationCount < 0
  ) {
    return failed(
      LE_105,
      FailureCode.TYPE,
      "Transformation count must be a " +
      "non-negative safe integer"
    );
  }


  if (
    input.independentOrigins ===
      undefined
  ) {
    return unresolved(
      LE_105,
      FailureCode.MISSING,
      "Independent provenance origins are unknown"
    );
  }


  if (
    !Number.isSafeInteger(
      input.independentOrigins
    ) ||
    input.independentOrigins < 0
  ) {
    return failed(
      LE_105,
      FailureCode.TYPE,
      "Independent provenance count must be a " +
      "non-negative safe integer"
    );
  }


  if (
    input.findingStrength >
      input.maximumProvenanceStrength
  ) {
    return failed(
      LE_105,
      FailureCode.SEMANTIC,
      "Finding strength exceeds the maximum strength " +
      "permitted by its provenance"
    );
  }


  /*
   * Repetition or transformation cannot increase
   * provenance strength by itself.
   */

  if (
    input.transformationCount > 0 &&
    input.independentOrigins === 1 &&
    input.findingStrength >
      input.maximumProvenanceStrength
  ) {
    return failed(
      LE_105,
      FailureCode.CONFLICT,
      "Derived records from one origin were treated " +
      "as stronger independent support"
    );
  }


  return passed(LE_105);
}


/*
 * LE-106
 * Temporal precision cannot be manufactured
 */

export interface LETemporalRange {
  readonly earliest:
    number;

  readonly latest:
    number;
}


export interface LE106Input {
  readonly sourceRange:
    LETemporalRange | undefined;

  readonly derivedRange:
    LETemporalRange | undefined;

  readonly additionalTemporalEvidence:
    readonly LEProvenanceNode[];
}


const validTemporalRange = (
  range: LETemporalRange
): boolean =>
  Number.isFinite(range.earliest) &&
  Number.isFinite(range.latest) &&
  range.earliest <= range.latest;


const temporalWidth = (
  range: LETemporalRange
): number =>
  range.latest -
  range.earliest;


export function guardLE106(
  input: LE106Input
): LEInvariantResult {

  if (
    input.sourceRange === undefined ||
    input.derivedRange === undefined
  ) {
    return unresolved(
      LE_106,
      FailureCode.MISSING,
      "Source and derived temporal ranges are required"
    );
  }


  if (
    !validTemporalRange(
      input.sourceRange
    ) ||
    !validTemporalRange(
      input.derivedRange
    )
  ) {
    return failed(
      LE_106,
      FailureCode.TYPE,
      "Temporal ranges must contain finite, ordered values"
    );
  }


  const sourceWidth =
    temporalWidth(
      input.sourceRange
    );

  const derivedWidth =
    temporalWidth(
      input.derivedRange
    );


  const derivedIsMorePrecise =
    derivedWidth <
      sourceWidth;


  if (
    !derivedIsMorePrecise
  ) {
    return passed(LE_106);
  }


  if (
    input.additionalTemporalEvidence
      .length === 0
  ) {
    return failed(
      LE_106,
      FailureCode.SEMANTIC,
      "Derived temporal precision exceeds source " +
      "precision without additional temporal evidence"
    );
  }


  if (
    input.additionalTemporalEvidence
      .some(
        evidence =>
          evidence.originId === undefined ||
          !nonEmpty(
            evidence.originId
          )
      )
  ) {
    return unresolved(
      LE_106,
      FailureCode.MISSING,
      "Additional temporal evidence has unresolved provenance"
    );
  }


  return passed(LE_106);
}


/*
 * LE-107
 * Relation types remain separate
 */

export enum LERelationType {
  ASSOCIATION =
    "ASSOCIATION",

  ATTRIBUTION =
    "ATTRIBUTION",

  COORDINATION =
    "COORDINATION",

  CAUSATION =
    "CAUSATION",

  AUTHORIZATION =
    "AUTHORIZATION",
}


export interface LERelationFinding {
  readonly relation:
    LERelationType;

  readonly subjectId:
    string;

  readonly objectId:
    string;

  readonly evidenceRefs:
    readonly string[];
}


export interface LE107Input {
  readonly establishedRelations:
    readonly LERelationFinding[];

  readonly requestedRelation:
    LERelationType;

  /*
   * Evidence specifically supporting the
   * requested relation type.
   */
  readonly requestedRelationEvidence:
    readonly string[];
}


export function guardLE107(
  input: LE107Input
): LEInvariantResult {

  if (
    input.establishedRelations.length ===
      0
  ) {
    return unresolved(
      LE_107,
      FailureCode.MISSING,
      "No established relations were supplied"
    );
  }


  if (
    input.requestedRelationEvidence
      .length === 0
  ) {
    return unresolved(
      LE_107,
      FailureCode.MISSING,
      `No evidence specifically supports ` +
      `${input.requestedRelation}`
    );
  }


  const requestedEstablished =
    input.establishedRelations
      .some(
        finding =>
          finding.relation ===
            input.requestedRelation &&

          finding.evidenceRefs
            .length > 0
      );


  if (
    !requestedEstablished
  ) {
    return failed(
      LE_107,
      FailureCode.CONFLICT,
      `${input.requestedRelation} was inferred from ` +
      `a different relation type`
    );
  }


  return passed(LE_107);
}


/*
 * Combined foundational guard
 */

export interface LEFoundationalGuardInput {
  readonly le101:
    LE101Input;

  readonly le102:
    LE102Input;

  readonly le103:
    LE103Input<unknown>;

  readonly le104:
    LE104Input;

  readonly le105:
    LE105Input;

  readonly le106:
    LE106Input;

  readonly le107:
    LE107Input;
}


export interface LEFoundationalGuardResult {
  readonly status:
    Status;

  readonly passed:
    boolean;

  readonly invariants:
    readonly LEInvariantResult[];

  readonly failed:
    readonly LEInvariantResult[];

  readonly indeterminate:
    readonly LEInvariantResult[];
}


export function guardLEFoundations(
  input: LEFoundationalGuardInput
): LEFoundationalGuardResult {

  const invariants:
    readonly LEInvariantResult[] = [

    guardLE101(
      input.le101
    ),

    guardLE102(
      input.le102
    ),

    guardLE103(
      input.le103
    ),

    guardLE104(
      input.le104
    ),

    guardLE105(
      input.le105
    ),

    guardLE106(
      input.le106
    ),

    guardLE107(
      input.le107
    ),
  ];


  const failed =
    invariants.filter(
      invariant =>
        invariant.result.status ===
          Status.INVALID
    );


  const indeterminateResults =
    invariants.filter(
      invariant =>
        invariant.result.status ===
          Status.INDETERMINATE
    );


  if (
    failed.length > 0
  ) {
    return {
      status:
        Status.INVALID,

      passed:
        false,

      invariants,

      failed,

      indeterminate:
        indeterminateResults,
    };
  }


  if (
    indeterminateResults.length > 0
  ) {
    return {
      status:
        Status.INDETERMINATE,

      passed:
        false,

      invariants,

      failed: [],

      indeterminate:
        indeterminateResults,
    };
  }


  return {
    status:
      Status.VALID,

    passed:
      true,

    invariants,

    failed: [],

    indeterminate: [],
  };
}
