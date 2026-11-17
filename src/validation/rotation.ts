import { FailureCode, indeterminate, invalid, VALID, ValidationResult } from "./result";
export interface RotationWitness { angle:number; axis:string; designatedAxis:string; squareIsIdentity:boolean; preCode:bigint; postCode:bigint; invariantPreserved:boolean; domainComplete:boolean; }
export const canonicalAngle = (a:number):number => ((a % 360) + 360) % 360;
export function validateHalfTurn(w:RotationWitness):ValidationResult {
  if (!w.domainComplete) return indeterminate(FailureCode.MISSING);
  if (!Number.isFinite(w.angle) || canonicalAngle(w.angle)!==180) return invalid(FailureCode.SEMANTIC);
  if (w.axis!==w.designatedAxis || !w.squareIsIdentity || !w.invariantPreserved) return invalid(FailureCode.SEMANTIC);
  if (w.preCode!==w.postCode) return invalid(FailureCode.CONFLICT, "Code changed");
  return VALID;
}
