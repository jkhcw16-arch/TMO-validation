# TMO-CA Constitutional Analysis Modules

## Status

Initial profile specification.

TMO-CA is the Constitutional Analysis profile for the TMO validation architecture. It is designed to consume qualified factual and evidentiary outputs from TMO-LE while keeping constitutional text, legal authority, doctrine, justiciability, application, counterargument, remedy, and conclusion analytically distinct.

TMO-CA is an analysis and validation framework. It does not treat a computed evidence score, an assertion, or a factual finding as sufficient by itself to establish a constitutional conclusion.

## Design basis

The profile is informed by the organizational and source-discipline principles reflected in the U.S. Constitution Annotated. Constitution Annotated analyzes and interprets the Constitution through authoritative constitutional materials, including Supreme Court case law and, where relevant, historical practices. Its stated methodology emphasizes objective, comprehensive, authoritative, non-partisan, coherent, and accessible treatment.

TMO-CA adapts those high-level principles into machine-verifiable resource boundaries. The CA rules in this repository are TMO specifications unless a rule explicitly cites an external legal authority.

## Architecture

```text
TMO-LE
  preserved resources
  provenance
  evidence
  qualified dimensions
  epistemic assessment
  conflict resolution
        |
        v
TMO-CA
  constitutional provision
  issue
  authority
  precedent
  doctrine
  standard of review
  justiciability
  application
  counterargument
  remedy
  conclusion
        |
        v
Audit / Traceability
```

The LE-to-CA boundary is deliberate:

```text
LE question:
What does the evidence support about the factual proposition?

CA question:
Given the qualified factual predicates and applicable legal authorities,
what constitutional analysis is supported?
```

A stronger LE evidence score does not automatically create a stronger CA conclusion.

## Module layout

```text
src/profiles/ca/
├── README.md
├── ca-types.ts
├── ca-authority.ts
├── ca-issue.ts
├── ca-claim.ts
├── ca-doctrine.ts
├── ca-precedent.ts
├── ca-standard-of-review.ts
├── ca-justiciability.ts
├── ca-application.ts
├── ca-counterargument.ts
├── ca-remedy.ts
├── ca-conclusion.ts
├── ca-validation.ts
├── ca-resource-registry.ts
└── schema/
    ├── ca-analysis.schema.json
    ├── ca-authority.schema.json
    ├── ca-precedent.schema.json
    └── ca-conclusion.schema.json

test/ca/
├── ca-authority.test.ts
├── ca-doctrine.test.ts
├── ca-precedent.test.ts
├── ca-justiciability.test.ts
├── ca-application.test.ts
└── ca-validation.test.ts
```

## Canonical resources

The initial CA resource vocabulary is:

```ts
export type CACanonicalResourceType =
  | "CAIssue"
  | "CAConstitutionalProvision"
  | "CAClaim"
  | "CAAuthority"
  | "CAPrecedent"
  | "CADoctrine"
  | "CAStandardOfReview"
  | "CAJusticiabilityFinding"
  | "CAApplication"
  | "CACounterargument"
  | "CARemedy"
  | "CAConclusion";
```

### CAIssue

Defines the constitutional question under analysis and identifies the provisions and claims that bound the inquiry.

### CAConstitutionalProvision

Represents addressable constitutional text. Provision identity should remain separate from interpretations of the provision.

### CAClaim

Represents an explicit constitutional proposition advanced for evaluation. A claim is not a conclusion merely because it has been recorded.

### CAAuthority

Represents a legal authority relied upon in the analysis. Authority classification and current legal status are explicit fields rather than assumptions derived from citation count or evidence weight.

### CAPrecedent

Represents precedent at sufficient granularity to distinguish the relevant holding, factual context, rationale, later treatment, and the proposition for which the precedent is cited.

### CADoctrine

Represents a constitutional doctrine together with its supported elements, requirements, exceptions, and authority lineage.

### CAStandardOfReview

Represents the applicable legal review framework separately from both doctrine and factual evidence.

### CAJusticiabilityFinding

Represents threshold judicial-power questions independently from the merits of the constitutional claim.

### CAApplication

Connects legally qualified factual propositions to a doctrine or legal rule. This is the primary bridge between TMO-LE outputs and constitutional reasoning.

### CACounterargument

Preserves supported competing legal interpretations, adverse authority, distinctions, exceptions, and responses rather than deleting them from the analysis path.

### CARemedy

Represents the requested or legally available remedy separately from the merits conclusion.

### CAConclusion

Records the direction and epistemic support of a constitutional conclusion together with its authorities, applications, limitations, derivation, and audit record.

## Authority model

Initial authority categories:

```ts
export type CAAuthorityType =
  | "CONSTITUTIONAL_TEXT"
  | "SUPREME_COURT_PRECEDENT"
  | "FEDERAL_APPELLATE_PRECEDENT"
  | "FEDERAL_DISTRICT_PRECEDENT"
  | "STATE_PRECEDENT"
  | "HISTORICAL_PRACTICE"
  | "SECONDARY_AUTHORITY";
```

Authority type, binding status, current treatment, and evidentiary support remain separate dimensions.

A future authority module may refine jurisdiction-specific binding rules. Until those rules are implemented and tested, authority status must be explicit and source-grounded rather than inferred merely from the authority category.

## Precedent discipline

Judicial precedent is a core source of constitutional interpretation, but TMO-CA must preserve the proposition-specific use of precedent.

A precedent record should be capable of distinguishing:

```text
case identity
court
citation
relevant facts
question presented
holding
rationale
scope
later treatment
proposition supported
source references
```

The framework must not silently treat every statement in a judicial opinion as equivalent to the holding for the proposition under analysis.

## Historical practice

Historical practice may be relevant to constitutional interpretation. TMO-CA therefore permits historical-practice authority while keeping the practice, the evidence establishing it, and the legal inference drawn from it as separate resources.

```text
historical evidence
      |
      v
qualified historical practice
      |
      v
constitutional use / inference
```

Historical practice is not transformed into constitutional text.

## Justiciability

Justiciability is evaluated separately from merits.

Initial dimensions may include:

```ts
export type CAJusticiabilityDimension =
  | "STANDING"
  | "RIPENESS"
  | "MOOTNESS"
  | "POLITICAL_QUESTION";

export type CAJusticiabilityStatus =
  | "SATISFIED"
  | "PARTIALLY_SATISFIED"
  | "NOT_SATISFIED"
  | "INDETERMINATE";
```

These labels are TMO-CA structural states. Doctrine-specific tests must be modeled separately before a production system treats a status as a legal determination.

Core boundary:

```text
JUSTICIABLE != MERITS SATISFIED
NOT JUSTICIABLE != CLAIM FALSE
```

## Application model

CAApplication should trace each analytical step:

```text
constitutional issue
      |
      v
applicable provision
      |
      v
authority / doctrine / standard
      |
      v
qualified LE factual predicates
      |
      v
application
      |
      v
counterarguments and adverse authority
      |
      v
CA conclusion
```

Every material legal conclusion should remain traceable to both its legal authorities and the qualified factual predicates used in application.

## Counterarguments and adverse authority

TMO-CA preserves adverse authority and materially supported counterarguments.

A stronger supporting argument does not authorize deletion of conflicting or adverse legal material.

Where legal authorities cannot be reconciled by the applicable rules, the unresolved condition should remain explicit in the conclusion or audit record.

## Conclusion model

Conclusion direction and conclusion support are separate.

```ts
export type CAConclusionDirection =
  | "CONSTITUTIONAL"
  | "UNCONSTITUTIONAL"
  | "NO_MERITS_DETERMINATION";

export type CAConclusionStatus =
  | "SUPPORTED"
  | "PARTIALLY_SUPPORTED"
  | "CONTESTED"
  | "INDETERMINATE";
```

Example:

```json
{
  "direction": "UNCONSTITUTIONAL",
  "status": "PARTIALLY_SUPPORTED"
}
```

The direction identifies the legal conclusion under analysis. The status identifies the support available for that conclusion within the defined scope.

## Initial CA invariants

### CA-101 — Text and interpretation remain distinct

Constitutional text must remain separately addressable from a judicial, historical, doctrinal, or analytical interpretation of that text.

### CA-102 — Fact support does not establish a legal conclusion

```text
LE factual proposition: SUPPORTED
```

does not imply:

```text
CA constitutional conclusion: SUPPORTED
```

The legal rule and application must still be established.

### CA-103 — Authority status is not evidence weight

Binding status, current precedential treatment, evidentiary quality, and proposition-specific relevance must not collapse into one numeric property.

### CA-104 — Binding and persuasive authority remain distinct

The system must preserve the authority classification applicable to the analysis rather than treating all citations as equal votes.

### CA-105 — Justiciability does not establish merits

A justiciability finding addresses whether the threshold judicial inquiry is satisfied within its modeled scope. It does not prove the underlying constitutional claim.

### CA-106 — Holding remains distinct

The relevant holding must remain distinguishable from facts, rationale, dicta or other non-holding discussion, later characterization, and secondary commentary.

### CA-107 — Adverse authority remains represented

Material adverse authority must remain traceable even when the final analysis adopts a contrary interpretation.

### CA-108 — Elements and exceptions are separate

Doctrinal elements, exceptions, defenses, limitations, and other rule components must be evaluated according to their own requirements rather than collapsed into one undifferentiated score.

### CA-109 — Conclusion strength is bounded

A constitutional conclusion may not exceed the legal authority and qualified factual predicates supporting the conclusion.

### CA-110 — No score-only constitutional conclusion

A Proposition Evidence Score cannot by itself determine whether governmental action, a law, a claim, or other subject is constitutional or unconstitutional.

## Relationship to TMO-LE

TMO-CA should reference LE resources rather than duplicate them.

Typical CA application inputs may include:

```text
LEAssertion
LEEvidenceItem
LEProvenanceRecord
LEContradiction
LECorroboration
LEEpistemicAssessment
LEDerivation
LEAuditFinding
```

The LE profile answers evidentiary questions. The CA profile performs the legal analysis that depends on those evidentiary findings.

The profiles therefore enforce:

```text
EVIDENCE != LAW
FACTUAL SUPPORT != LEGAL RESULT
PROPOSITION EVIDENCE SCORE != CONSTITUTIONALITY SCORE
```

## Epistemic behavior

CA should preserve uncertainty rather than convert incomplete legal analysis into a binary answer.

`INDETERMINATE` is appropriate when required legal authority, factual predicates, jurisdictional context, or other required inputs cannot be established.

`CONTESTED` is appropriate when material competing legal arguments or authorities remain applicable and unresolved under the analysis rules.

No unknown value should silently become a negative finding, a zero score, or a pass.

## Audit requirements

Every material CA conclusion should be auditable to:

```text
issue
constitutional provision
claim
legal authorities
precedent records
doctrine
standard of review
justiciability findings
qualified factual predicates
application
counterarguments / adverse authority
remedy analysis
conclusion
derivation
audit record
```

Updates should preserve prior analyses rather than mutate historical legal conclusions without lineage.

A superseding analysis should record the prior analysis identifier, changed authority or factual predicate, derivation, reason for change, and audit reference.

## Validation strategy

Initial validation should cover at least:

1. canonical resource registration;
2. reference integrity;
3. constitutional-text / interpretation separation;
4. authority classification requirements;
5. precedent proposition linkage;
6. holding / rationale separation;
7. justiciability / merits separation;
8. required LE predicate references for applications;
9. adverse-authority preservation;
10. conclusion provenance and derivation;
11. `INDETERMINATE` handling;
12. rejection of score-only constitutional conclusions.

Property tests should target invariants rather than only examples.

Examples:

```text
Supported LE evidence alone never produces a CA conclusion.

Changing a precedent citation count alone never changes binding status.

Setting justiciability to SATISFIED never automatically sets merits to SUPPORTED.

Deleting required adverse authority causes validation failure.

Missing required factual predicates produces INDETERMINATE rather than false.
```

## Source discipline

TMO-CA should prefer primary and official legal sources whenever the legal proposition can be established from them. Source identity and version/date information must remain addressable so later changes in controlling authority can trigger re-analysis without rewriting historical records.

The framework should not label an authority controlling, overruled, superseded, or otherwise legally operative without source-grounded support appropriate to that assertion.

## Non-goals

TMO-CA is not designed to:

- convert constitutional analysis into a citation-counting system;
- treat evidence weights as probabilities of constitutionality;
- infer binding authority merely from source prestige;
- erase adverse precedent;
- turn a justiciability determination into a merits conclusion;
- manufacture missing facts or legal authority;
- replace provenance and audit history with a final label.

## Canonical rule

> TMO-CA separates constitutional text, authority, precedent, doctrine, factual predicates, application, counterargument, remedy, and conclusion so that every constitutional analysis remains source-grounded, proposition-specific, uncertainty-preserving, and auditable.

## Implementation sequence

Recommended implementation order:

```text
1. ca-types.ts
2. ca-resource-registry.ts
3. ca-authority.ts
4. ca-precedent.ts
5. ca-doctrine.ts
6. ca-justiciability.ts
7. ca-application.ts
8. ca-counterargument.ts
9. ca-conclusion.ts
10. JSON Schemas
11. invariant tests
12. property tests
13. CI integration
```

Until the CA implementation and its tests are committed, this README defines the proposed profile boundary and initial invariant set rather than claiming completed constitutional-analysis functionality.
