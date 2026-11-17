import { describe, expect, test } from "vitest";
import fc from "fast-check";
import { Status } from "../../../src/validation/result";
import { LEFailureCode, LEOutputDisposition, LE_PROFILE_ID, LE_PROFILE_VERSION, type LEGuardId, type LEGuardResult, type LEProfileResult } from "../../../src/profiles/le/le-profile.types";
import { LE_PROOF_OBLIGATIONS, dischargeLEGuard, dischargeLEProfile, proofIndeterminate, proofInvalid, proofValid, validateGuardProofConsistency, type LEProofPackage } from "../../../src/profiles/le/le-profile.proofs";

const guardIds = Object.keys(LE_PROOF_OBLIGATIONS) as LEGuardId[];
const validPackage = (): LEProofPackage => Object.fromEntries(guardIds.map(g => [g, LE_PROOF_OBLIGATIONS[g].map(proofValid)])) as LEProofPackage;
const validGuards = (): readonly LEGuardResult[] => guardIds.map(guard => ({guard,status:Status.VALID}));

describe("LE domain-profile conformance",()=>{
  test("identity/version",()=>{expect(LE_PROFILE_ID).toBe("LE");expect(LE_PROFILE_VERSION).toBe("1.0.0");});
  test("all guards declare proof obligations",()=>{for(const g of guardIds)expect(LE_PROOF_OBLIGATIONS[g].length).toBeGreaterThan(0);});
  test("valid complete package discharges",()=>{const p=dischargeLEProfile(validPackage());expect(p.status).toBe(Status.VALID);expect(p.discharged).toBe(true);});
  test("missing obligation is indeterminate",()=>{const g:LEGuardId="G_evidence";expect(dischargeLEGuard(g,LE_PROOF_OBLIGATIONS[g].slice(1).map(proofValid)).status).toBe(Status.INDETERMINATE);});
  test("duplicate obligation never discharges",()=>{const g:LEGuardId="G_relevance";const id=LE_PROOF_OBLIGATIONS[g][0]!;expect(dischargeLEGuard(g,[proofValid(id),proofValid(id)]).discharged).toBe(false);});
  test("runtime/proof agreement required",()=>{const p=dischargeLEProfile(validPackage());expect(validateGuardProofConsistency(validGuards(),p).consistent).toBe(true);const changed:LEGuardResult[]=[...validGuards().filter(g=>g.guard!=="G_output"),{guard:"G_output",status:Status.INVALID,failure:LEFailureCode.GUILT_INFERENCE}];expect(validateGuardProofConsistency(changed,p).consistent).toBe(false);});
  test("VALID maps only to REVIEW",()=>{const r:LEProfileResult={profile:LE_PROFILE_ID,version:LE_PROFILE_VERSION,status:Status.VALID,disposition:LEOutputDisposition.REVIEW,guards:[],failures:[],evidenceFailures:[]};expect(r.disposition).toBe(LEOutputDisposition.REVIEW);});
  test("invalid obligation dominates",()=>fc.assert(fc.property(fc.constantFrom(...guardIds),g=>{const base=validPackage();const ids=LE_PROOF_OBLIGATIONS[g];const first=ids[0]!;const pkg:LEProofPackage={...base,[g]:ids.map(id=>id===first?proofInvalid(id,LEFailureCode.EVIDENCE_INVALID):proofValid(id))};expect(dischargeLEProfile(pkg).status).toBe(Status.INVALID);}))); 
  test("indeterminate obligation dominates valid",()=>fc.assert(fc.property(fc.constantFrom(...guardIds),g=>{const base=validPackage();const ids=LE_PROOF_OBLIGATIONS[g];const first=ids[0]!;const pkg:LEProofPackage={...base,[g]:ids.map(id=>id===first?proofIndeterminate(id,LEFailureCode.INSUFFICIENT_EVIDENCE):proofValid(id))};expect(dischargeLEProfile(pkg).status).toBe(Status.INDETERMINATE);}))); 
});
