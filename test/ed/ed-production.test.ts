import { describe, expect, it } from "vitest";
import { evaluateEDProduction, type EDProductionContext, type EDProductionRecord } from "../../src/profiles/ed/ed-production.js";

function context(): EDProductionContext {
  return {
    matterId: "matter-1",
    collectedItemIds: new Set(["item-1"]),
    representationRefs: new Set(["redacted-1"]),
    transformationRefs: new Set(["transform-1"]),
    redactionIds: new Set(["redaction-1"]),
    sourceRecordIds: new Set(["source-1"]),
    exceptionIds: new Set(["exception-1"]),
    requestIds: new Set(["request-1"]),
    authorizations: [{ id: "auth-produce", actorId: "producer-1", matterId: "matter-1", action: "PRODUCE", resourceIds: ["production-1"], state: "AUTHORIZED" }],
    items: [{ id: "prod-item-1", productionId: "production-1", collectedItemId: "item-1", representationRef: "redacted-1", producedForm: "PDF", transformationRefs: ["transform-1"], redactionIds: ["redaction-1"], batesStart: "TMO000001", batesEnd: "TMO000003", exceptionIds: [] }],
    manifests: [{ id: "manifest-1", productionId: "production-1", itemIds: ["prod-item-1"], createdAt: "2026-11-21T22:01:00.000Z" }]
  };
}
function valid(): EDProductionRecord {
  return { id: "production-1", matterId: "matter-1", producedBy: "producer-1", producedAt: "2026-11-21T22:00:00.000Z", authorizationId: "auth-produce", requestId: "request-1", requestedForms: ["PDF"], producedForms: ["PDF"], itemIds: ["prod-item-1"], manifestId: "manifest-1", sourceRefs: ["source-1"], exceptionIds: [], completed: true };
}

describe("TMO-ED production", () => {
  it("returns PRODUCED for a complete authorized production", () => expect(evaluateEDProduction(valid(), context()).status).toBe("PRODUCED"));
  it("requires PRODUCE authorization", () => expect(evaluateEDProduction({ ...valid(), authorizationId: undefined }, context()).status).toBe("INVALID"));
  it("does not allow REVIEW authorization to substitute", () => { const c=context(); expect(evaluateEDProduction(valid(), { ...c, authorizations:[{...c.authorizations[0]!, action:"REVIEW"}] }).status).toBe("INVALID"); });
  it("does not allow authorization to leak across productions", () => { const c=context(); expect(evaluateEDProduction(valid(), { ...c, authorizations:[{...c.authorizations[0]!, resourceIds:["other"]}] }).status).toBe("INVALID"); });
  it("rejects revoked authorization", () => { const c=context(); expect(evaluateEDProduction(valid(), { ...c, authorizations:[{...c.authorizations[0]!, state:"REVOKED"}] }).status).toBe("INVALID"); });
  it("preserves indeterminate authorization", () => { const c=context(); expect(evaluateEDProduction(valid(), { ...c, authorizations:[{...c.authorizations[0]!, state:"INDETERMINATE"}] }).status).toBe("INDETERMINATE"); });
  it("requires collected-item lineage", () => { const c=context(); expect(evaluateEDProduction(valid(), { ...c, collectedItemIds:new Set() }).status).toBe("INVALID"); });
  it("requires produced representation lineage", () => { const c=context(); expect(evaluateEDProduction(valid(), { ...c, representationRefs:new Set() }).status).toBe("INVALID"); });
  it("requires transformation references to resolve", () => { const c=context(); expect(evaluateEDProduction(valid(), { ...c, transformationRefs:new Set() }).status).toBe("INVALID"); });
  it("requires redaction references to resolve", () => { const c=context(); expect(evaluateEDProduction(valid(), { ...c, redactionIds:new Set() }).status).toBe("INVALID"); });
  it("requires all production items to be declared", () => { const c=context(); const r={...valid(), itemIds:[]}; expect(evaluateEDProduction(r,c).status).toBe("INVALID"); });
  it("requires declared production items to exist", () => expect(evaluateEDProduction({ ...valid(), itemIds:["missing"] }, context()).status).toBe("INVALID"));
  it("requires completed production to declare a produced form", () => expect(evaluateEDProduction({ ...valid(), producedForms:[] }, context()).status).toBe("INVALID"));
  it("requires item form to be declared on production", () => expect(evaluateEDProduction({ ...valid(), producedForms:["TIFF"] }, context()).status).toBe("INVALID"));
  it("requires an addressable manifest on completed production", () => expect(evaluateEDProduction({ ...valid(), manifestId:undefined }, context()).status).toBe("INVALID"));
  it("requires manifest membership to match", () => { const c=context(); const altered={...c, manifests:[{...c.manifests[0]!, itemIds:[]}]}; expect(evaluateEDProduction(valid(),altered).status).toBe("INVALID"); });
  it("rejects a manifest pointing at another production", () => { const c=context(); const altered={...c, manifests:[{...c.manifests[0]!, productionId:"other"}]}; expect(evaluateEDProduction(valid(),altered).status).toBe("INVALID"); });
  it("rejects incomplete Bates ranges", () => { const c=context(); const altered={...c, items:[{...c.items[0]!, batesEnd:undefined}]}; expect(evaluateEDProduction(valid(),altered).status).toBe("INVALID"); });
  it("keeps requested/produced form variance explicit as partial", () => expect(evaluateEDProduction({ ...valid(), requestedForms:["NATIVE"] }, context()).status).toBe("PARTIALLY_PRODUCED"));
  it("returns NOT_PRODUCED when nothing has been produced", () => { const c=context(); const r={...valid(), completed:false, itemIds:[], manifestId:undefined, producedForms:[]}; const altered={...c, items:[], manifests:[]}; expect(evaluateEDProduction(r,altered).status).toBe("NOT_PRODUCED"); });
  it("returns PARTIALLY_PRODUCED for incomplete production", () => expect(evaluateEDProduction({ ...valid(), completed:false }, context()).status).toBe("PARTIALLY_PRODUCED"));
  it("preserves production exceptions", () => expect(evaluateEDProduction({ ...valid(), exceptionIds:["exception-1"] }, context()).status).toBe("PARTIALLY_PRODUCED"));
  it("rejects unknown production exceptions", () => expect(evaluateEDProduction({ ...valid(), exceptionIds:["missing"] }, context()).status).toBe("INVALID"));
  it("rejects unknown discovery requests", () => expect(evaluateEDProduction({ ...valid(), requestId:"missing" }, context()).status).toBe("INVALID"));
  it("rejects duplicate production item references", () => expect(evaluateEDProduction({ ...valid(), itemIds:["prod-item-1","prod-item-1"] }, context()).status).toBe("INVALID"));
});
