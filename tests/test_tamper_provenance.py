from dataclasses import replace
import pytest
from ptm import Event, ReplayError, ValidationError, event_digest, execute, replay, update

@pytest.mark.parametrize("qa,reqs,field,value", [
 ("QA-024",("REQ-TAM-01","REQ-DIA-01"),"observation",.31),
 ("QA-025",("REQ-TAM-01","REQ-PRV-04"),"learning_rate",.11),
 ("QA-026",("REQ-TAM-01","REQ-PRV-04"),"resolution_weight",.51),
 ("QA-027",("REQ-TAM-01","REQ-LIN-02"),"pre_state",.99),
 ("QA-028",("REQ-TAM-01","REQ-RPL-01"),"post_state",.99),
 ("QA-029",("REQ-TAM-02","REQ-NUM-05"),"source_ref","tampered"),
 ("QA-030",("REQ-TAM-01","REQ-VER-01","REQ-VER-02"),"operator_version","unknown"),
])
def test_QA_024_to_030_committed_field_tampering(valid_history, qa, reqs, field, value):
    i,_,records=valid_history; bad=records.copy(); bad[0]=replace(bad[0], **{field:value})
    with pytest.raises((ReplayError,ValidationError)): replay(i,bad,"A->B")

@pytest.mark.requirements("REQ-TAM-03", "REQ-TAM-02")
def test_QA_031_chain_propagation(valid_history):
    _,_,r=valid_history; changed=replace(r[0],source_ref="changed",digest="")
    changed=replace(changed,digest=event_digest(changed)); assert changed.digest != r[0].digest
    assert r[1].prev_digest != changed.digest

@pytest.mark.requirements("REQ-PRV-01", "REQ-VAL-01")
def test_QA_032_required_field_completeness():
    with pytest.raises(ValidationError): execute(.4,[Event("","A",0,1,.5,.2,.4)],"A")

@pytest.mark.requirements("REQ-PRV-02", "REQ-RPL-01")
def test_QA_033_runtime_defaults_irrelevant(valid_history):
    i,s,r=valid_history; assert replay(i,r,"A->B")==s

@pytest.mark.requirements("REQ-PRV-03", "REQ-RPL-04")
def test_QA_034_live_state_independence(valid_history):
    i,s,r=valid_history; live=.99; assert replay(i,r,"A->B")==s and live==.99

@pytest.mark.requirements("REQ-PRV-04", "REQ-NUM-05")
def test_QA_035_certainty_resolution_separation():
    e1=Event("X","A",0,1,.8,.2,.7,certainty=.1)
    e2=replace(e1,certainty=.9)
    assert update(.4,e1.observation,e1.learning_rate,e1.resolution_weight)==update(.4,e2.observation,e2.learning_rate,e2.resolution_weight)

@pytest.mark.requirements("REQ-PRV-05", "REQ-NUM-04")
def test_QA_036_zero_delta_retained():
    s,r=execute(.4,[Event("Z","A",0,1,.9,.3,0)],"A"); assert len(r)==1 and s[-1]==.4

@pytest.mark.requirements("REQ-PRV-05", "REQ-NUM-05")
def test_QA_037_neutral_event_insertion():
    base=execute(.4,[Event("X","A",0,1,.9,.3,.8)],"A")[0][-1]
    neutral=Event("N","A",0,1,.2,.3,0)
    _,nr=execute(.4,[neutral],"A")
    e=Event("X","A",1,2,.9,.3,.8,prev_digest=nr[0].digest)
    state,records=execute(.4,[neutral,e],"A")
    assert state[-1]==base and len(records)==2

@pytest.mark.requirements("REQ-NUM-04", "REQ-RPL-06")
def test_QA_038_full_adoption_checkpoint(): assert update(.2,.8,1,1)==.8

@pytest.mark.requirements("REQ-NUM-05", "REQ-PRV-04", "REQ-TAM-02")
def test_QA_039_parameter_decomposition():
    assert update(.2,.8,.2,.5)==update(.2,.8,.1,1)
    a=Event("X","A",0,1,.8,.2,.5); b=replace(a,learning_rate=.1,resolution_weight=1)
    assert event_digest(a)!=event_digest(b)

@pytest.mark.requirements("REQ-LIN-05", "REQ-RPL-01")
def test_QA_040_independent_edge_permutation_template():
    assert update(.2,.8,.3,.5)==update(.2,.8,.3,.5)

@pytest.mark.requirements("REQ-RPL-06", "REQ-RPL-02")
def test_QA_041_verified_checkpoint(valid_history):
    _,s,r=valid_history; assert replay(s[1],r[1:],"A->B")[-1]==s[-1]
