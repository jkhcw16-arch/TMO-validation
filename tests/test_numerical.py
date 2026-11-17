import math
import pytest
from ptm import update
from conftest import SEEDS, generated_case

@pytest.mark.requirements("REQ-NUM-01")
@pytest.mark.parametrize("seed", SEEDS)
def test_QA_001_deterministic_transition(seed):
    v,y,a,r = generated_case(seed)
    assert update(v,y,a,r) == update(v,y,a,r)

@pytest.mark.requirements("REQ-NUM-02", "REQ-NUM-03")
@pytest.mark.parametrize("seed", SEEDS)
def test_QA_002_convex_hull(seed):
    v,y,a,r = generated_case(seed); out=update(v,y,a,r)
    assert min(v,y) <= out <= max(v,y)

@pytest.mark.requirements("REQ-NUM-02", "REQ-VAL-02")
@pytest.mark.parametrize("seed", SEEDS)
def test_QA_003_range_preservation(seed):
    v,y,a,r=generated_case(seed); assert 0 <= update(v,y,a,r) <= 1

@pytest.mark.requirements("REQ-NUM-04", "REQ-PRV-05")
def test_QA_004_zero_learning(): assert update(.4,.9,0,.8)==.4

@pytest.mark.requirements("REQ-NUM-04", "REQ-PRV-04", "REQ-PRV-05")
def test_QA_005_zero_resolution(): assert update(.4,.9,.3,0)==.4

@pytest.mark.requirements("REQ-NUM-04", "REQ-PRV-05")
def test_QA_006_matching_observation(): assert update(.4,.4,.3,.8)==.4

@pytest.mark.requirements("REQ-NUM-04", "REQ-NUM-03")
def test_QA_007_full_weight(): assert update(.4,.9,1,1)==.9

@pytest.mark.requirements("REQ-NUM-03", "REQ-NUM-02")
@pytest.mark.parametrize("seed", SEEDS)
def test_QA_008_direction(seed):
    v,y,a,r=generated_case(seed); out=update(v,y,a,r)
    assert (out-v)*(y-v) >= 0

@pytest.mark.requirements("REQ-NUM-03", "REQ-RPL-01")
@pytest.mark.parametrize("seed", SEEDS)
def test_QA_009_delta(seed):
    v,y,a,r=generated_case(seed); assert math.isclose(update(v,y,a,r)-v, a*r*(y-v))

@pytest.mark.requirements("REQ-NUM-03", "REQ-NUM-05")
def test_QA_010_weight_monotonicity():
    v,y=.2,.9
    assert update(v,y,.2,.5) <= update(v,y,.5,.8)

@pytest.mark.requirements("REQ-NUM-05", "REQ-PRV-04")
def test_QA_011_effective_weight_equivalence():
    assert math.isclose(update(.2,.9,.2,.5), update(.2,.9,.1,1))
