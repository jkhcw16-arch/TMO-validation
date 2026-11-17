import { FailureCode, indeterminate, invalid, VALID, ValidationResult } from "./result";
export type Edge = readonly [string, string];

export function validateTriangle(vertices: readonly string[], edges: readonly Edge[]): ValidationResult {
  if (vertices.length !== 3 || new Set(vertices).size !== 3) return invalid(FailureCode.SEMANTIC, "Three distinct vertices required");
  const encoded = edges.map(([a,b]) => `${a}\u0000${b}`);
  if (edges.length !== 3 || new Set(encoded).size !== 3) return invalid(FailureCode.SEMANTIC, "Three distinct edges required");
  const vs = new Set(vertices), incoming = new Map(vertices.map(v => [v,0])), outgoing = new Map(vertices.map(v => [v,0]));
  for (const [from,to] of edges) {
    if (!vs.has(from) || !vs.has(to) || from === to) return invalid(FailureCode.SEMANTIC);
    outgoing.set(from, outgoing.get(from)! + 1); incoming.set(to, incoming.get(to)! + 1);
  }
  if (vertices.some(v => incoming.get(v)!==1 || outgoing.get(v)!==1)) return invalid(FailureCode.SEMANTIC, "Not one directed cycle");
  return VALID;
}

export function validateClosure(coefficients: readonly [number,number,number] | undefined): ValidationResult {
  if (!coefficients) return indeterminate(FailureCode.MISSING);
  const [a,b,c] = coefficients;
  return a + b - c === 0 ? VALID : invalid(FailureCode.SEMANTIC, "Nonzero closure residual");
}
