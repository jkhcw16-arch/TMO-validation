import pytest
from hypothesis import given, strategies as st
from tmo_profiles import *
CORE=TMOCore(frozenset({'shape','ratio','orientation','temporal-order'}))
def profile(i,p):
    p=frozenset(p); return Profile(i,CORE,p,{x:1. for x in p})
def edge(s,t,q,refs=None):
    q=frozenset(q); return RelationEdge(s,t,q,refs if refs is not None else {x:frozenset({'ratio'}) for x in q})
@pytest.mark.requirements('REQ-TMO-01')
def test_QA_052_profile_layers_core():
    p=profile('P',{'shape','ratio'}); assert p.core is CORE and p.projection <= CORE.invariants
@pytest.mark.requirements('REQ-TMO-02','REQ-LIN-05')
def test_QA_053_relation_connects_profiles():
    a,b=profile('A',{'ratio'}),profile('B',{'shape'}); e=edge(a,b,{'proportional'}); assert e.source==a and e.target==b
@pytest.mark.requirements('REQ-TMO-03','REQ-PRV-04')
def test_QA_054_edge_holds_qualities():
    a,b=profile('A',{'ratio'}),profile('B',{'shape'}); assert edge(a,b,{'proportional','aligned'}).qualities==frozenset({'proportional','aligned'})
@pytest.mark.requirements('REQ-TMO-04','REQ-TMO-05')
def test_QA_055_intersection_associates_invariant():
    a,b,c,d=[profile(x,{'ratio'}) for x in 'ABCD']
    e1=edge(a,b,{'proportional','aligned'},{'proportional':frozenset({'ratio'}),'aligned':frozenset({'orientation'})})
    e2=edge(c,d,{'proportional','opposed'},{'proportional':frozenset({'ratio'}),'opposed':frozenset({'orientation'})})
    assert quality_intersection(e1,e2)==frozenset({'proportional'})
    assert perceptual_invariant_association(e1,e2)==frozenset({'ratio'})
@pytest.mark.requirements('REQ-TMO-06','REQ-NUM-05')
def test_QA_056_different_profiles_same_relational_invariant():
    a,b=profile('A',{'shape','ratio'}),profile('B',{'orientation'}); c,d=profile('C',{'ratio'}),profile('D',{'temporal-order'})
    assert a.projection!=c.projection and relationally_equivalent(edge(a,b,{'proportional'}),edge(c,d,{'proportional'}),frozenset({'proportional'}))
@pytest.mark.requirements('REQ-TMO-07','REQ-VAL-01')
def test_QA_057_profile_reference_outside_core_rejected():
    with pytest.raises(ValueError): Profile('bad',CORE,frozenset({'unknown'}),{})
@pytest.mark.requirements('REQ-TMO-08','REQ-VAL-01')
def test_QA_058_edge_reference_outside_core_rejected():
    a,b=profile('A',{'ratio'}),profile('B',{'ratio'})
    with pytest.raises(ValueError): edge(a,b,{'q'},{'q':frozenset({'unknown'})})
@pytest.mark.requirements('REQ-TMO-04')
@given(st.sets(st.sampled_from(['q1','q2','q3'])),st.sets(st.sampled_from(['q1','q2','q3'])))
def test_QA_059_quality_intersection_symmetric(x,y):
    a,b,c,d=[profile(z,{'ratio'}) for z in 'ABCD']; assert quality_intersection(edge(a,b,x),edge(c,d,y))==quality_intersection(edge(c,d,y),edge(a,b,x))
@pytest.mark.requirements('REQ-TMO-05','REQ-NUM-05')
@given(st.sets(st.sampled_from(['q1','q2','q3'])),st.sets(st.sampled_from(['q1','q2','q3'])))
def test_QA_060_disjoint_qualities_no_association(x,y):
    x=set(x); y=set(y)-x; a,b,c,d=[profile(z,{'ratio'}) for z in 'ABCD']; e1,e2=edge(a,b,x),edge(c,d,y)
    assert not quality_intersection(e1,e2) and not perceptual_invariant_association(e1,e2)
