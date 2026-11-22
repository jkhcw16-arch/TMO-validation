# TMO Validation

Validation primitives, proof-oriented domain profiles, and property-tested invariants for TMO and Pairwise Temporal Memory integrations.

The repository contains:

- TypeScript validation primitives
- a versioned TMO core-output contract
- domain-profile and LE safeguards
- Pairwise Temporal Memory prime-lattice utilities
- deterministic canonicalization and SHA-256 digests
- unit, property, fuzz, provenance, replay, and composition tests
- API and worker integration materials

> Validation establishes whether supplied evidence satisfies explicit rules. It does not establish facts that were not supplied, and it does not replace required human review.

## Repository status

The TypeScript package is currently versioned as `1.0.0` and is configured as an ES module package. Its package description is “TMO validation primitives and property-tested invariants.” 【1-b0dc32】【2-aa6f5d】

The Python package is named `ptm-prime-lattice`, versioned as `0.1.0`, requires Python 3.10 or later, and describes itself as providing invertible n-dimensional prime-lattice transitions for Pairwise Temporal Memory. 【3-909c0d】【4-8ba79b】

## Design principles

The repository follows several core principles:

1. **Explicit evidence**  
   Claims should reference identifiable evidence.

2. **Deterministic validation**  
   The same valid input and policy should produce the same result.

3. **Three-state results**  
   Validation supports:
   - `VALID`
   - `INVALID`
   - `INDETERMINATE`

4. **Uncertainty preservation**  
   Missing, conflicting, or insufficient evidence should remain indeterminate rather than being converted into a definite conclusion.

5. **Separation of observation and inference**  
   An observation, a derived relationship, and a later interpretation are represented separately.

6. **Auditability**  
   Core outputs include evidence references, an audit reference, limitations, a timestamp, and a digest.

7. **Human review for consequential outputs**  
   Domain profiles can require review or reject unsupported output requests.

## TypeScript package

The TypeScript package is built from `src/**/*.ts` into `dist-lib`. The build configuration emits JavaScript, declarations, declaration maps, and source maps. 【5-a18e7f】【6-105c7a】

### Requirements

- Node.js
- npm

### Install dependencies

npm ci
