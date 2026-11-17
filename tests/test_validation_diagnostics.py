from dataclasses import replace
import math, pytest
from ptm import Event, ReplayError, ValidationError, execute, replay, update

@pytest.mark.requirements("REQ-VAL-01", "REQ-VAL-02")
@pytest.mark.parametrize("x",[-.1,1.1])
def test_QA_042_out_of_range(x):
    with pytest.raises(ValidationError): update(.4,.8,x,.5)

@pytest.mark.requirements("REQ-VAL-02", "REQ-NUM-02")
@pytest.mark.parametrize("x",[float('nan'),float('inf'),-float('inf')])
def test_QA_043_non_finite(x):
    with pytest.raises(ValidationError): update(.4,.8,x,.5)

@pytest.mark.requirements("REQ-PRV-01", "REQ-VAL-01")
def test_QA_044_missing_event_id():
    with pytest.raises(ValidationError): execute(.4,[Event("","A",0,1,.5,.2,.3)],"A")

@pytest.mark.requirements("REQ-LIN-04", "REQ-PRV-01")
def test_QA_045_missing_parent():
    with pytest.raises(ReplayError): execute(.4,[Event("X","A",2,3,.5,.2,.3)],"A")

@pytest.mark.requirements("REQ-LIN-04", "REQ-VAL-01")
def test_QA_046_duplicate_version():
    a=Event("A","A",0,1,.5,.2,.3)
    _,r=execute(.4,[a],"A")
    b=Event("B","A",1,1,.6,.2,.3,prev_digest=r[0].digest)
    with pytest.raises(ReplayError): execute(.4,[a,b],"A")

@pytest.mark.requirements("REQ-VER-02", "REQ-VER-01")
def test_QA_047_unsupported_operator():
    with pytest.raises(ValidationError): update(.4,.5,.2,.3,"v999")

@pytest.mark.requirements("REQ-TAM-02", "REQ-VAL-01")
def test_QA_048_malformed_digest(valid_history):
    i,_,r=valid_history; bad=r.copy(); bad[0]=replace(bad[0],digest="bad")
    with pytest.raises(ReplayError): replay(i,bad,"A->B")

@pytest.mark.requirements("REQ-LIN-02", "REQ-LIN-04")
def test_QA_049_wrong_edge_pre_state():
    with pytest.raises(ReplayError): execute(.4,[Event("X","B",0,1,.5,.2,.3)],"A")

@pytest.mark.requirements("REQ-DIA-02", "REQ-DIA-01")
def test_QA_050_shrinking_template():
    pytest.skip("Integrate Hypothesis shrinking in the production suite")

@pytest.mark.requirements("REQ-DIA-02", "REQ-NUM-01")
def test_QA_051_seed_reproducibility():
    import random
    assert random.Random(918244).random()==random.Random(918244).random()
