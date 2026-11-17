import { FailureCode, indeterminate, invalid, VALID, ValidationResult } from "./result";

export function validateThreshold(measure: number | undefined, threshold: number | undefined, edge?: 0 | 1): ValidationResult {
  if (measure === undefined || threshold === undefined) return indeterminate(FailureCode.MISSING);
  if (!Number.isFinite(measure) || !Number.isFinite(threshold)) return invalid(FailureCode.SCHEMA);
  const expectedEdge: 0 | 1 = measure < threshold ? 1 : 0;
  if (edge !== undefined && edge !== expectedEdge) return invalid(FailureCode.CONFLICT, "Edge contradicts threshold");
  return VALID;
}
