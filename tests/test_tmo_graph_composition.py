from dataclasses import replace
import pytest
from hypothesis import given, strategies as st
from tmo_profiles import *

CORE=TMOCore(frozenset({'ratio','orientation','sequence'}))
def p(i): return Profile(i,CORE,CORE.invariants,{x:1.0 for x in CORE.invariants})
def e(a,b,qs):
    qs=frozenset(qs)
    return RelationEdge(a,b,qs,{q:frozenset({'ratio'}) for q in qs})

@pytest.mark.requirements('REQ-TMO-09','REQ-LIN-05')
def test_QA_061_multi_profile_graph_accepts_shared_core():
    a,b,c=p('A'),p('B'),p('C'); g=ProfileGraph((a,b,c),(e(a,b,{'q'}),e(b,c,{'q'})))
    assert len(g.profiles)==3 and len(g.edges)==2

@pytest.mark.requirements('REQ-TMO-10','REQ-TMO-04')
def test_QA_062_two_edge_composition_preserves_shared_quality():
    a,b,c=p('A'),p('B'),p('C')
    out=compose_path(e(a,b,{'stable','aligned'}),e(b,c,{'stable','ordered'}))
    assert out.source==a and out.target==c and out.qualities==frozenset({'stable'})

@pytest.mark.requirements('REQ-TMO-10','REQ-TMO-05')
def test_QA_063_composition_maps_shared_quality_to_invariant():
    a,b,c=p('A'),p('B'),p('C'); out=compose_path(e(a,b,{'stable'}),e(b,c,{'stable'}))
    assert out.invariant_refs['stable']==frozenset({'ratio'})

@pytest.mark.requirements('REQ-TMO-11','REQ-VAL-01')
def test_QA_064_nonincident_edges_cannot_compose():
    a,b,c,d=p('A'),p('B'),p('C'),p('D')
    with pytest.raises(ValueError): compose_path(e(a,b,{'q'}),e(c,d,{'q'}))

@pytest.mark.requirements('REQ-TMO-12','REQ-NUM-05')
def test_QA_065_disjoint_path_qualities_collapse():
    a,b,c=p('A'),p('B'),p('C'); out=compose_path(e(a,b,{'x'}),e(b,c,{'y'}))
    assert not out.qualities and not out.invariant_refs

@pytest.mark.requirements('REQ-TMO-13','REQ-TMO-06')
def test_QA_066_parallel_paths_can_share_composed_invariant():
    a,b,c,d=p('A'),p('B'),p('C'),p('D')
    left=compose_path(e(a,b,{'stable'}),e(b,d,{'stable'}))
    right=compose_path(e(a,c,{'stable'}),e(c,d,{'stable'}))
    assert left.qualities==right.qualities==frozenset({'stable'})
    assert left.invariant_refs==right.invariant_refs

@pytest.mark.requirements('REQ-TMO-14','REQ-LIN-04')
def test_QA_067_graph_rejects_missing_endpoint():
    a,b,c=p('A'),p('B'),p('C')
    with pytest.raises(ValueError): ProfileGraph((a,b),(e(b,c,{'q'}),))

@pytest.mark.requirements('REQ-TMO-15','REQ-TMO-04')
def test_QA_068_graph_path_resolution():
    a,b,c=p('A'),p('B'),p('C'); g=ProfileGraph((a,b,c),(e(a,b,{'q'}),e(b,c,{'q'})))
    assert len(g.paths2(a,c))==1
    assert compose_graph_path(g,a,b,c).qualities==frozenset({'q'})

@pytest.mark.requirements('REQ-TMO-10')
@given(st.sets(st.sampled_from(['q1','q2','q3'])),st.sets(st.sampled_from(['q1','q2','q3'])))
def test_QA_069_hypothesis_composition_equals_quality_intersection(x,y):
    a,b,c=p('A'),p('B'),p('C'); out=compose_path(e(a,b,x),e(b,c,y))
    assert out.qualities==frozenset(x & y)

@pytest.mark.requirements('REQ-TMO-16','REQ-TMO-10')
@given(st.sets(st.sampled_from(['q1','q2','q3'])),st.sets(st.sampled_from(['q1','q2','q3'])),st.sets(st.sampled_from(['q1','q2','q3'])))
def test_QA_070_hypothesis_three_edge_associativity_of_quality_core(x,y,z):
    a,b,c,d=p('A'),p('B'),p('C'),p('D')
    ab,bc,cd=e(a,b,x),e(b,c,y),e(c,d,z)
    left=compose_path(compose_path(ab,bc),cd)
    right=compose_path(ab,compose_path(bc,cd))
    assert left.qualities==right.qualities==frozenset(x & y & z)
    assert left.invariant_refs==right.invariant_refs
