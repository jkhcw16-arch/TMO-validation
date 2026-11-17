import { describe, expect, test } from "vitest";
import fc from "fast-check";
import { FailureCode, Status, validateCode } from "../../src/validation";
import { validPrimeCodeArb } from "./arbitraries";

describe("prime-role code properties",()=>{
  test("generated valid codes validate",()=>fc.assert(fc.property(validPrimeCodeArb,c=>expect(validateCode(c).status).toBe(Status.VALID))));
  test("composite mutation invalidates",()=>fc.assert(fc.property(validPrimeCodeArb,fc.bigInt({min:1n,max:100000n}),(c,d)=>{
    const r=validateCode({...c,composite:c.composite+d});
    expect(r.status).toBe(Status.INVALID); expect(r.failure).toBe(FailureCode.CONFLICT);
  })));
});
