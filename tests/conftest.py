import random
import pytest
from ptm import Event, execute

SEEDS = tuple(range(40))

@pytest.fixture
def valid_history():
    events = [
        Event("OBS-1", "A->B", 0, 1, .9, .3, .8),
        Event("OBS-2", "A->B", 1, 2, .2, .3, .25),
    ]
    states, records = execute(.4, events, "A->B")
    return .4, states, records

def generated_case(seed):
    r = random.Random(seed)
    return tuple(r.random() for _ in range(4))
