import { describe, expect, test } from "vitest";
import fc from "fast-check";
import { Status, validateClosure, validateTriangle, type Edge } from "../../src/validation";
import { validTriangleArb } from "./arbitraries";

describe("geometric properties",()=>{
  test("generated triangles validate",()=>fc.assert(fc.property(validTriangleArb,({vertices,edges})=>expect(validateTriangle(vertices,edges).status).toBe(Status.VALID))));
  test("self-loop invalidates",()=>fc.assert(fc.property(validTriangleArb,({vertices,edges})=>{
    const m:Edge[]=[...edges]; m[0]=[vertices[0],vertices[0]];
    expect(validateTriangle(vertices,m).status).toBe(Status.INVALID);
  })));
  test("exact additive closure validates",()=>fc.assert(fc.property(fc.integer(),fc.integer(),(a,b)=>expect(validateClosure([a,b,a+b]).status).toBe(Status.VALID))));
});
