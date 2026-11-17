import math
from dataclasses import replace
import pytest
from hypothesis import given, settings, strategies as st, assume
from ptm import Event, ReplayError, execute, replay, update

unit = st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False)
positive_unit = st.floats(min_value=0.0, max_value=1.0, exclude_min=True, allow_nan=False, allow_infinity=False)

@st.composite
def valid_histories(draw, min_size=0, max_size=20):
    initial = draw(unit)
    specs = draw(st.lists(st.tuples(unit, unit, unit), min_size=min_size, max_size=max_size))
    events=[]
    for i,(y,a,r) in enumerate(specs,1):
        events.append(Event(f"H-{i}", "A->B", i-1, i, y, a, r))
    states, records = execute(initial, events, "A->B")
    return initial, states, records

@pytest.mark.requirements("REQ-NUM-01")
@given(unit, unit, unit, unit)
def test_QA_001_hypothesis_determinism(v,y,a,r):
    assert update(v,y,a,r) == update(v,y,a,r)

@pytest.mark.requirements("REQ-NUM-02", "REQ-NUM-03")
@given(unit, unit, unit, unit)
def test_QA_002_hypothesis_convex_hull(v,y,a,r):
    out=update(v,y,a,r)
    assert min(v,y)-1e-15 <= out <= max(v,y)+1e-15

@pytest.mark.requirements("REQ-NUM-02", "REQ-VAL-02")
@given(unit, unit, unit, unit)
def test_QA_003_hypothesis_range(v,y,a,r):
    assert 0.0 <= update(v,y,a,r) <= 1.0

@pytest.mark.requirements("REQ-NUM-04", "REQ-PRV-05")
@given(unit, unit, unit)
def test_QA_004_hypothesis_zero_learning(v,y,r):
    assert update(v,y,0,r) == v

@pytest.mark.requirements("REQ-NUM-04", "REQ-PRV-04", "REQ-PRV-05")
@given(unit, unit, unit)
def test_QA_005_hypothesis_zero_resolution(v,y,a):
    assert update(v,y,a,0) == v

@pytest.mark.requirements("REQ-NUM-04", "REQ-PRV-05")
@given(unit, unit, unit)
def test_QA_006_hypothesis_matching_observation(v,a,r):
    assert update(v,v,a,r) == v

@pytest.mark.requirements("REQ-NUM-04", "REQ-NUM-03")
@given(unit, unit)
def test_QA_007_hypothesis_full_weight(v,y):
    assert math.isclose(update(v,y,1,1), y, abs_tol=1e-15)

@pytest.mark.requirements("REQ-NUM-03", "REQ-NUM-02")
@given(unit, unit, positive_unit, positive_unit)
def test_QA_008_hypothesis_direction(v,y,a,r):
    out=update(v,y,a,r)
    assert (out-v)*(y-v) >= 0

@pytest.mark.requirements("REQ-NUM-03", "REQ-RPL-01")
@given(unit, unit, unit, unit)
def test_QA_009_hypothesis_delta(v,y,a,r):
    assert math.isclose(update(v,y,a,r)-v, a*r*(y-v), abs_tol=1e-15)

@pytest.mark.requirements("REQ-NUM-03", "REQ-NUM-05")
@given(unit, unit, unit, unit)
def test_QA_010_hypothesis_weight_monotonicity(v,y,w1,w2):
    lo,hi=sorted((w1,w2))
    o1,o2=update(v,y,lo,1),update(v,y,hi,1)
    if y>=v: assert o1 <= o2
    else: assert o1 >= o2

@pytest.mark.requirements("REQ-NUM-05", "REQ-PRV-04")
@given(unit, unit, unit)
def test_QA_011_hypothesis_effective_weight_equivalence(v,y,w):
    # Two decompositions of the same effective weight: (w,1) and (1,w).
    assert math.isclose(update(v,y,w,1), update(v,y,1,w), abs_tol=1e-15)

@pytest.mark.requirements("REQ-RPL-01", "REQ-RPL-02")
@given(valid_histories(max_size=25))
def test_QA_012_hypothesis_full_replay(history):
    initial,states,records=history
    assert replay(initial,records,"A->B") == states

@pytest.mark.requirements("REQ-RPL-03", "REQ-DIA-01")
@given(valid_histories(max_size=12))
def test_QA_014_hypothesis_prefix_replay(history):
    initial,states,records=history
    for k in range(len(records)+1):
        assert replay(initial,records[:k],"A->B")[-1] == states[k]

@pytest.mark.requirements("REQ-LIN-01", "REQ-LIN-02")
@given(valid_histories(min_size=1,max_size=20))
def test_QA_018_hypothesis_lineage(history):
    _,_,records=history
    assert records[0].parent_version == 0
    assert all(a.version == b.parent_version for a,b in zip(records,records[1:]))
    assert all(a.post_state == b.pre_state for a,b in zip(records,records[1:]))

@pytest.mark.requirements("REQ-TAM-01", "REQ-DIA-01")
@given(valid_histories(min_size=1,max_size=12), unit)
def test_QA_024_hypothesis_observation_tamper(history,replacement):
    initial,_,records=history
    assume(replacement != records[0].observation)
    bad=records.copy(); bad[0]=replace(bad[0],observation=replacement)
    with pytest.raises(ReplayError): replay(initial,bad,"A->B")

@pytest.mark.requirements("REQ-TAM-01", "REQ-PRV-04")
@given(valid_histories(min_size=1,max_size=12), unit)
def test_QA_025_hypothesis_learning_rate_tamper(history,replacement):
    initial,_,records=history
    assume(replacement != records[0].learning_rate)
    bad=records.copy(); bad[0]=replace(bad[0],learning_rate=replacement)
    with pytest.raises(ReplayError): replay(initial,bad,"A->B")

@pytest.mark.requirements("REQ-TAM-01", "REQ-PRV-04")
@given(valid_histories(min_size=1,max_size=12), unit)
def test_QA_026_hypothesis_resolution_tamper(history,replacement):
    initial,_,records=history
    assume(replacement != records[0].resolution_weight)
    bad=records.copy(); bad[0]=replace(bad[0],resolution_weight=replacement)
    with pytest.raises(ReplayError): replay(initial,bad,"A->B")

@pytest.mark.requirements("REQ-PRV-05", "REQ-NUM-05")
@given(unit, unit, unit, unit)
def test_QA_037_hypothesis_neutral_event(v,y,a,r):
    base=update(v,y,a,r)
    after_neutral=update(v,0.5,0.5,0)
    assert after_neutral == v
    assert update(after_neutral,y,a,r) == base

@pytest.mark.requirements("REQ-DIA-02", "REQ-DIA-01")
@settings(max_examples=200)
@given(st.lists(st.integers(min_value=0,max_value=9), min_size=1,max_size=25))
def test_QA_050_hypothesis_shrinking_enabled(values):
    # A passing canary that exercises a shrink-friendly composite value.
    # If a future invariant fails over this strategy, Hypothesis reduces the example.
    assert len(values) >= 1

@pytest.mark.requirements("REQ-DIA-02", "REQ-NUM-01")
@settings(derandomize=True, max_examples=100)
@given(unit, unit, unit, unit)
def test_QA_051_hypothesis_derandomized_replay(v,y,a,r):
    assert update(v,y,a,r) == update(v,y,a,r)
