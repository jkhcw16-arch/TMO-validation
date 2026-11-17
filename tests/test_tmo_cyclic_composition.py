import pytest
from hypothesis import given, strategies as st
from tmo_profiles import *
CORE=TMOCore(frozenset({'ratio','orientation','sequence'}))
def p(i): return Profile(i,CORE,CORE.invariants,{x:1.0 for x in CORE.invariants})
def e(a,b,qs):
    qs=frozenset(qs); return RelationEdge(a,b,qs,{q:frozenset({'ratio'}) for q in qs})

def tri(x,y,z):
    a,b,c=p('A'),p('B'),p('C'); return a,b,c,(e(a,b,x),e(b,c,y),e(c,a,z))

@pytest.mark.requirements('REQ-TMO-17','REQ-TMO-10')
def test_QA_071_closed_cycle_composes_to_origin():
    a,_,_,cycle=tri({'stable'},{'stable'},{'stable'}); out=compose_cycle(cycle)
    assert out.source==a and out.target==a

@pytest.mark.requirements('REQ-TMO-18','REQ-TMO-05')
def test_QA_072_cycle_preserves_quality_shared_by_all_edges():
    *_,cycle=tri({'stable','x'},{'stable','y'},{'stable','z'})
    assert cycle_invariant(cycle)==frozenset({'stable'})

@pytest.mark.requirements('REQ-TMO-19','REQ-NUM-05')
def test_QA_073_cycle_loses_quality_missing_from_one_edge():
    *_,cycle=tri({'stable','x'},{'stable','x'},{'stable'})
    assert 'x' not in cycle_invariant(cycle)

@pytest.mark.requirements('REQ-TMO-20','REQ-TMO-05')
def test_QA_074_cycle_retains_common_core_reference():
    *_,cycle=tri({'stable'},{'stable'},{'stable'}); out=compose_cycle(cycle)
    assert out.invariant_refs['stable']==frozenset({'ratio'})

@pytest.mark.requirements('REQ-TMO-21','REQ-VAL-01')
def test_QA_075_open_path_rejected_as_cycle():
    a,b,c=p('A'),p('B'),p('C')
    with pytest.raises(ValueError): compose_cycle((e(a,b,{'q'}),e(b,c,{'q'})))

@pytest.mark.requirements('REQ-TMO-21','REQ-TMO-11')
def test_QA_076_broken_cycle_rejected():
    a,b,c,d=p('A'),p('B'),p('C'),p('D')
    with pytest.raises(ValueError): compose_cycle((e(a,b,{'q'}),e(c,d,{'q'}),e(d,a,{'q'})))

@pytest.mark.requirements('REQ-TMO-22','REQ-TMO-10')
def test_QA_077_cycle_rotation_preserves_shared_quality():
    _,_,_,cycle=tri({'stable','a'},{'stable','b'},{'stable','c'})
    rotated=(cycle[1],cycle[2],cycle[0])
    assert cycle_invariant(cycle)==cycle_invariant(rotated)==frozenset({'stable'})

@pytest.mark.requirements('REQ-TMO-23','REQ-TMO-13')
def test_QA_078_two_cycles_can_share_cycle_invariant():
    a,b,c=p('A'),p('B'),p('C'); d,e1,f=p('D'),p('E'),p('F')
    c1=(e(a,b,{'stable'}),e(b,c,{'stable'}),e(c,a,{'stable'}))
    c2=(e(d,e1,{'stable'}),e(e1,f,{'stable'}),e(f,d,{'stable'}))
    assert cycle_invariant(c1)==cycle_invariant(c2)==frozenset({'stable'})

@pytest.mark.requirements('REQ-TMO-18','REQ-TMO-16')
@given(st.sets(st.sampled_from(['q1','q2','q3'])),st.sets(st.sampled_from(['q1','q2','q3'])),st.sets(st.sampled_from(['q1','q2','q3'])))
def test_QA_079_hypothesis_cycle_equals_global_intersection(x,y,z):
    *_,cycle=tri(x,y,z)
    assert cycle_invariant(cycle)==frozenset(x & y & z)

@pytest.mark.requirements('REQ-TMO-22','REQ-TMO-18')
@given(st.sets(st.sampled_from(['q1','q2','q3'])),st.sets(st.sampled_from(['q1','q2','q3'])),st.sets(st.sampled_from(['q1','q2','q3'])))
def test_QA_080_hypothesis_cycle_start_point_invariance(x,y,z):
    *_,cycle=tri(x,y,z)
    r1=(cycle[1],cycle[2],cycle[0]); r2=(cycle[2],cycle[0],cycle[1])
    assert cycle_invariant(cycle)==cycle_invariant(r1)==cycle_invariant(r2)
