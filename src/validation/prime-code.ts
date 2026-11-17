import { FailureCode, invalid, VALID, ValidationResult } from "./result";

export interface PrimeCode {
  composite: bigint;
  primes: readonly number[];
  roles: readonly number[];
  mapping: ReadonlyMap<number, number>;
}

export function isPrime(value: number): boolean {
  if (!Number.isSafeInteger(value) || value < 2) return false;
  if (value % 2 === 0) return value === 2;
  for (let d = 3; d * d <= value; d += 2) if (value % d === 0) return false;
  return true;
}

export function validateCode(code: PrimeCode): ValidationResult {
  const { composite, primes, roles, mapping } = code;
  if (primes.length !== roles.length || mapping.size !== primes.length) return invalid(FailureCode.SCHEMA);
  if (new Set(primes).size !== primes.length) return invalid(FailureCode.SEMANTIC, "Duplicate primes");
  if (!primes.every(isPrime)) return invalid(FailureCode.SEMANTIC, "Nonprime coordinate");
  if (!roles.every((r) => Number.isInteger(r) && (r === 1 || r === 2))) return invalid(FailureCode.SEMANTIC, "Invalid role");
  for (let i = 0; i < primes.length; i++) if (mapping.get(i) !== primes[i]) return invalid(FailureCode.CONFLICT, "Mapping mismatch");
  let reconstructed = 1n;
  for (let i = 0; i < primes.length; i++) reconstructed *= BigInt(primes[i]) ** BigInt(roles[i]);
  return reconstructed === composite ? VALID : invalid(FailureCode.CONFLICT, "Composite mismatch");
}
