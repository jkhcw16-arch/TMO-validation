export enum Status {
  VALID = "VALID",
  INVALID = "INVALID",
  INDETERMINATE = "INDETERMINATE",
}

export enum FailureCode {
  SCHEMA = "V_SCHEMA",
  DIGEST = "V_DIGEST",
  TYPE = "V_TYPE",
  SUBJECT = "V_SUBJECT",
  CONTEXT = "V_CONTEXT",
  SEMANTIC = "V_SEMANTIC",
  CONFLICT = "V_CONFLICT",
  MISSING = "V_MISSING",
  CIRCULAR = "V_CIRCULAR",
  STALE = "V_STALE",
  UNAUTHORIZED = "V_UNAUTHORIZED",
}

export interface ValidationResult {
  status: Status;
  failure?: FailureCode;
  details?: string;
}

export const VALID: ValidationResult = { status: Status.VALID };
export const invalid = (failure: FailureCode, details = ""): ValidationResult => ({ status: Status.INVALID, failure, details });
export const indeterminate = (failure = FailureCode.MISSING, details = ""): ValidationResult => ({ status: Status.INDETERMINATE, failure, details });
