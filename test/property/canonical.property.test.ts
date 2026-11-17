import { describe, expect, test } from "vitest";
import fc from "fast-check";
import { canonicalize, digest } from "../../src/validation";

describe("canonicalization properties",()=>{
  test("object insertion order is irrelevant",()=>fc.assert(fc.property(fc.dictionary(fc.string(),fc.jsonValue()),obj=>{
    const reversed=Object.fromEntries(Object.entries(obj).reverse()); expect(digest(obj)).toBe(digest(reversed));
  })));
  test("array order remains significant",()=>fc.assert(fc.property(fc.uniqueArray(fc.integer(),{minLength:2,maxLength:20}),values=>{
    const reversed=[...values].reverse(); if(JSON.stringify(values)!==JSON.stringify(reversed)) expect(canonicalize(values)).not.toBe(canonicalize(reversed));
  })));
});
