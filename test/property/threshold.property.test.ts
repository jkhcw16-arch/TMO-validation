import { describe, expect, test } from "vitest";
import fc from "fast-check";
import { Status, validateThreshold } from "../../src/validation";
import { finiteDoubleArb } from "./arbitraries";

describe("threshold properties",()=>{
  test("equality classifies as 0-edge",()=>fc.assert(fc.property(finiteDoubleArb,t=>{
    expect(validateThreshold(t,t,0).status).toBe(Status.VALID);
    expect(validateThreshold(t,t,1).status).toBe(Status.INVALID);
  })));
  test("edge agrees with threshold comparison",()=>fc.assert(fc.property(finiteDoubleArb,finiteDoubleArb,(m,t)=>{
    const e:0|1=m<t?1:0;
    expect(validateThreshold(m,t,e).status).toBe(Status.VALID);
    expect(validateThreshold(m,t,e===0?1:0).status).toBe(Status.INVALID);
  })));
});
