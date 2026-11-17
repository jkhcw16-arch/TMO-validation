import { describe, expect, test } from "vitest";
import fc from "fast-check";
import { FailureCode, Status, canonicalAngle, validateHalfTurn } from "../../src/validation";

describe("half-turn properties",()=>{
  test("canonical half-turn angles validate",()=>fc.assert(fc.property(fc.constantFrom(-540,-180,180,540),fc.bigInt({min:1n,max:100000n}),(angle,code)=>{
    expect(validateHalfTurn({angle,axis:"A",designatedAxis:"A",squareIsIdentity:true,preCode:code,postCode:code,invariantPreserved:true,domainComplete:true}).status).toBe(Status.VALID);
  })));
  test("other angles fail",()=>fc.assert(fc.property(fc.double({min:-720,max:720,noNaN:true,noDefaultInfinity:true}).filter(a=>canonicalAngle(a)!==180),angle=>{
    expect(validateHalfTurn({angle,axis:"A",designatedAxis:"A",squareIsIdentity:true,preCode:18n,postCode:18n,invariantPreserved:true,domainComplete:true}).status).toBe(Status.INVALID);
  })));
  test("code may not change",()=>fc.assert(fc.property(fc.bigInt({min:1n}),fc.bigInt({min:1n}),(a,b)=>{
    fc.pre(a!==b); const r=validateHalfTurn({angle:180,axis:"A",designatedAxis:"A",squareIsIdentity:true,preCode:a,postCode:b,invariantPreserved:true,domainComplete:true});
    expect(r.status).toBe(Status.INVALID); expect(r.failure).toBe(FailureCode.CONFLICT);
  })));
});
