from __future__ import annotations
from dataclasses import dataclass, replace
from hashlib import sha256
import json, math
from typing import Iterable

class ValidationError(ValueError): pass
class ReplayError(ValidationError): pass

@dataclass(frozen=True)
class Event:
    event_id: str
    edge_id: str
    parent_version: int
    version: int
    observation: float
    learning_rate: float
    resolution_weight: float
    operator_version: str = "ptm-v1"
    source_ref: str = "fixture"
    certainty: float | None = None
    pre_state: float | None = None
    post_state: float | None = None
    prev_digest: str = "GENESIS"
    digest: str = ""

COMMITTED_FIELDS = (
    "event_id", "edge_id", "parent_version", "version", "observation",
    "learning_rate", "resolution_weight", "operator_version", "source_ref",
    "certainty", "pre_state", "post_state", "prev_digest",
)

def _finite01(name: str, value: float) -> None:
    if not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValidationError(f"{name} must be finite")
    if not 0.0 <= value <= 1.0:
        raise ValidationError(f"{name} must be in [0,1]")

def update(value: float, observation: float, alpha: float, resolution: float,
           operator_version: str = "ptm-v1") -> float:
    if operator_version != "ptm-v1":
        raise ValidationError("unsupported operator version")
    for n, x in (("value", value), ("observation", observation),
                 ("alpha", alpha), ("resolution", resolution)):
        _finite01(n, x)
    return value + alpha * resolution * (observation - value)

def event_digest(event: Event) -> str:
    payload = {k: getattr(event, k) for k in COMMITTED_FIELDS}
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":"), allow_nan=False)
    return sha256(raw.encode()).hexdigest()

def apply_event(state: float, event: Event, expected_edge: str | None = None) -> tuple[float, Event]:
    if not event.event_id or not event.edge_id:
        raise ValidationError("event_id and edge_id are required")
    if expected_edge is not None and event.edge_id != expected_edge:
        raise ReplayError("wrong edge")
    if event.version != event.parent_version + 1:
        raise ReplayError("noncontiguous version")
    if event.pre_state is not None and not math.isclose(event.pre_state, state, abs_tol=1e-12):
        raise ReplayError("pre-state mismatch")
    result = update(state, event.observation, event.learning_rate,
                    event.resolution_weight, event.operator_version)
    if event.post_state is not None and not math.isclose(event.post_state, result, abs_tol=1e-12):
        raise ReplayError("post-state mismatch")
    committed = replace(event, pre_state=state, post_state=result, digest="")
    committed = replace(committed, digest=event_digest(committed))
    return result, committed

def execute(initial: float, events: Iterable[Event], edge_id: str, starting_version: int = 0, starting_digest: str = "GENESIS") -> tuple[list[float], list[Event]]:
    _finite01("initial", initial)
    state, states, records, seen = initial, [initial], [], set()
    expected_parent, prev_digest = starting_version, starting_digest
    for e in events:
        if e.event_id in seen: raise ReplayError("duplicate event id")
        if e.parent_version != expected_parent: raise ReplayError("parent mismatch")
        if not e.digest and e.prev_digest == "GENESIS" and prev_digest != "GENESIS":
            e = replace(e, prev_digest=prev_digest)
        if e.prev_digest != prev_digest: raise ReplayError("digest-chain mismatch")
        state, record = apply_event(state, e, edge_id)
        states.append(state); records.append(record); seen.add(e.event_id)
        expected_parent, prev_digest = record.version, record.digest
    return states, records

def replay(initial: float, records: Iterable[Event], edge_id: str) -> list[float]:
    records = list(records)
    for r in records:
        if not r.digest or r.digest != event_digest(replace(r, digest="")):
            raise ReplayError("event digest mismatch")
    start_version = records[0].parent_version if records else 0
    start_digest = records[0].prev_digest if records else "GENESIS"
    states, rebuilt = execute(initial, [replace(r, digest="") for r in records], edge_id, start_version, start_digest)
    if [r.digest for r in rebuilt] != [r.digest for r in records]:
        raise ReplayError("rebuilt chain mismatch")
    return states
