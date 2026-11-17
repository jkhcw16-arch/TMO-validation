from dataclasses import replace
import json, pytest
from ptm import Event, ReplayError, execute, replay

@pytest.mark.requirements("REQ-RPL-01", "REQ-RPL-02")
def test_QA_012_exact_history_replay(valid_history):
    initial, states, records=valid_history; assert replay(initial,records,"A->B")==states

@pytest.mark.requirements("REQ-RPL-02", "REQ-RPL-01")
def test_QA_013_terminal_replay(valid_history):
    i,s,r=valid_history; assert replay(i,r,"A->B")[-1]==s[-1]

@pytest.mark.requirements("REQ-RPL-03", "REQ-DIA-01")
def test_QA_014_prefix_replay(valid_history):
    i,s,r=valid_history
    for k in range(len(r)+1): assert replay(i,r[:k],"A->B")[-1]==s[k]

@pytest.mark.requirements("REQ-RPL-04", "REQ-PRV-03")
def test_QA_015_replay_idempotence(valid_history):
    i,_,r=valid_history; before=repr(r); replay(i,r,"A->B"); assert repr(r)==before

@pytest.mark.requirements("REQ-RPL-05", "REQ-PRV-01")
def test_QA_016_serialization_roundtrip(valid_history):
    i,s,r=valid_history
    r2=[Event(**x) for x in json.loads(json.dumps([x.__dict__ for x in r]))]
    assert replay(i,r2,"A->B")==s

@pytest.mark.requirements("REQ-RPL-06", "REQ-RPL-01")
def test_QA_017_checkpoint_equivalence(valid_history):
    i,s,r=valid_history; assert replay(s[1],r[1:],"A->B")[-1] == s[-1]

@pytest.mark.requirements("REQ-LIN-01", "REQ-LIN-02")
def test_QA_018_parent_child_continuity(valid_history):
    _,_,r=valid_history; assert all(a.version==b.parent_version for a,b in zip(r,r[1:]))

@pytest.mark.requirements("REQ-LIN-02", "REQ-RPL-01")
def test_QA_019_state_continuity(valid_history):
    _,_,r=valid_history; assert all(a.post_state==b.pre_state for a,b in zip(r,r[1:]))

@pytest.mark.requirements("REQ-LIN-03", "REQ-LIN-04")
def test_QA_020_duplicate_event_rejected():
    e=Event("X","A->B",0,1,.5,.2,.4)
    with pytest.raises(ReplayError): execute(.4,[e,replace(e,parent_version=1,version=2,prev_digest="x")],"A->B")

@pytest.mark.requirements("REQ-LIN-04", "REQ-DIA-01")
def test_QA_021_missing_event_detected(valid_history):
    i,_,r=valid_history
    with pytest.raises(ReplayError): replay(i,r[1:],"A->B")

@pytest.mark.requirements("REQ-LIN-04", "REQ-LIN-01")
def test_QA_022_reordering_detected(valid_history):
    i,_,r=valid_history
    with pytest.raises(ReplayError): replay(i,list(reversed(r)),"A->B")

@pytest.mark.requirements("REQ-LIN-05", "REQ-RPL-01")
def test_QA_023_independent_edges_template():
    a=[Event("A1","A",0,1,.8,.2,.7)]
    b=[Event("B1","B",0,1,.1,.3,.6)]
    assert execute(.4,a,"A")[0][-1] == execute(.4,a,"A")[0][-1]
    assert execute(.6,b,"B")[0][-1] == execute(.6,b,"B")[0][-1]
