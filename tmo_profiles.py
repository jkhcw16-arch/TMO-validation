from dataclasses import dataclass
from typing import FrozenSet, Mapping
@dataclass(frozen=True)
class TMOCore: invariants: FrozenSet[str]
@dataclass(frozen=True)
class Profile:
    profile_id:str; core:TMOCore; projection:FrozenSet[str]; weights:Mapping[str,float]
    def __post_init__(self):
        if not self.projection <= self.core.invariants: raise ValueError('projection outside core')
        if set(self.weights)-set(self.projection): raise ValueError('weight outside projection')
@dataclass(frozen=True)
class RelationEdge:
    source:Profile; target:Profile; qualities:FrozenSet[str]; invariant_refs:Mapping[str,FrozenSet[str]]
    def __post_init__(self):
        if self.source.core != self.target.core: raise ValueError('different cores')
        if set(self.invariant_refs)-set(self.qualities): raise ValueError('reference without quality')
        if any(not refs <= self.source.core.invariants for refs in self.invariant_refs.values()): raise ValueError('reference outside core')
def quality_intersection(a,b):
    if a.source.core != b.source.core: raise ValueError('different cores')
    return a.qualities & b.qualities
def perceptual_invariant_association(a,b):
    refs=set()
    for q in quality_intersection(a,b): refs |= set(a.invariant_refs.get(q,frozenset()) & b.invariant_refs.get(q,frozenset()))
    return frozenset(refs)
def relationally_equivalent(a,b,required): return required <= quality_intersection(a,b)

@dataclass(frozen=True)
class ProfileGraph:
    profiles: tuple[Profile, ...]
    edges: tuple[RelationEdge, ...]

    def __post_init__(self):
        cores = {p.core for p in self.profiles}
        if len(cores) > 1:
            raise ValueError('graph profiles must share one TMO core')
        for edge in self.edges:
            if edge.source not in self.profiles or edge.target not in self.profiles:
                raise ValueError('edge endpoint missing from graph')

    def outgoing(self, profile: Profile) -> FrozenSet[RelationEdge]:
        return tuple(e for e in self.edges if e.source == profile)

    def paths2(self, source: Profile, target: Profile):
        return tuple((e1, e2) for e1 in self.outgoing(source)
                     for e2 in self.outgoing(e1.target) if e2.target == target)

def compose_path(edge_ab: RelationEdge, edge_bc: RelationEdge) -> RelationEdge:
    if edge_ab.target != edge_bc.source:
        raise ValueError('edges are not composable')
    qualities = edge_ab.qualities & edge_bc.qualities
    refs = {}
    for q in qualities:
        shared = edge_ab.invariant_refs.get(q, frozenset()) & edge_bc.invariant_refs.get(q, frozenset())
        if shared:
            refs[q] = shared
    qualities = frozenset(refs)
    return RelationEdge(edge_ab.source, edge_bc.target, qualities, refs)

def compose_graph_path(graph: ProfileGraph, source: Profile, via: Profile, target: Profile) -> RelationEdge:
    left = [e for e in graph.edges if e.source == source and e.target == via]
    right = [e for e in graph.edges if e.source == via and e.target == target]
    if len(left) != 1 or len(right) != 1:
        raise ValueError('path must resolve to exactly two edges')
    return compose_path(left[0], right[0])

def compose_cycle(edges: tuple[RelationEdge, ...]) -> RelationEdge:
    if not edges:
        raise ValueError('cycle must contain at least one edge')
    for left, right in zip(edges, edges[1:]):
        if left.target != right.source:
            raise ValueError('cycle contains nonincident edges')
    if edges[-1].target != edges[0].source:
        raise ValueError('path is not closed')
    result = edges[0]
    for nxt in edges[1:]:
        result = compose_path(result, nxt)
    return result

def cycle_invariant(edges: tuple[RelationEdge, ...]) -> FrozenSet[str]:
    return compose_cycle(edges).qualities
