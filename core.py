# SPDX-License-Identifier: AGPL-3.0-only
# SPDX-FileCopyrightText: 2026 Jamie Kinney, Ephrata, WA
from __future__ import annotations
from dataclasses import dataclass
from fractions import Fraction
from math import prod
from typing import Iterable, Sequence

Vector = tuple[int, ...]

@dataclass(frozen=True)
class Transition:
    k: int
    d: Vector

class PrimeLattice:
    def __init__(self, primes: Sequence[int]):
        self.primes = tuple(primes)
        if not self.primes or len(set(self.primes)) != len(self.primes):
            raise ValueError("primes must be a nonempty distinct sequence")
        if any(not self._is_prime(p) for p in self.primes):
            raise ValueError("every basis value must be prime")
        self.n = len(self.primes)

    @staticmethod
    def _is_prime(p: int) -> bool:
        if p < 2: return False
        i = 2
        while i * i <= p:
            if p % i == 0: return False
            i += 1
        return True

    def _vec(self, x: Iterable[int]) -> Vector:
        v = tuple(int(i) for i in x)
        if len(v) != self.n: raise ValueError(f"expected dimension {self.n}")
        return v

    def rotate(self, e: Iterable[int], k: int = 1) -> Vector:
        v = self._vec(e); k %= self.n
        return v[k:] + v[:k]

    def right_rotate(self, e: Iterable[int], k: int = 1) -> Vector:
        return self.rotate(e, -k)

    def apply(self, e: Iterable[int], t: Transition) -> Vector:
        d = self._vec(t.d); r = self.rotate(e, t.k)
        return tuple(a+b for a,b in zip(r,d))

    def invert(self, e_next: Iterable[int], t: Transition) -> Vector:
        d = self._vec(t.d); y = self._vec(e_next)
        return self.rotate(tuple(a-b for a,b in zip(y,d)), -t.k)

    def role_displacement(self, axis: int, role: int, magnitude: int = 1) -> Vector:
        if not 0 <= axis < self.n: raise IndexError("axis out of range")
        if role not in (1,2): raise ValueError("role must be 1 (left child) or 2 (parent)")
        if magnitude < 0: raise ValueError("magnitude must be nonnegative")
        d=[0]*self.n; d[axis] = magnitude*(2*role-3)
        return tuple(d)

    def encode(self, e: Iterable[int]) -> Fraction:
        v=self._vec(e); out=Fraction(1,1)
        for p,a in zip(self.primes,v):
            out *= Fraction(p**a,1) if a >= 0 else Fraction(1,p**(-a))
        return out

    def decode(self, value: Fraction | int) -> Vector:
        q=Fraction(value); num,den=q.numerator,q.denominator; exps=[]
        for p in self.primes:
            a=0
            while num % p == 0: num//=p; a+=1
            while den % p == 0: den//=p; a-=1
            exps.append(a)
        if num != 1 or den != 1:
            raise ValueError("value contains primes outside this lattice basis")
        return tuple(exps)

    def compose(self, later: Transition, earlier: Transition) -> Transition:
        # later(earlier(e)) = R^(k2+k1)e + R^k2 d1 + d2
        d1=self._vec(earlier.d); d2=self._vec(later.d)
        rd1=self.rotate(d1,later.k)
        return Transition((earlier.k+later.k)%self.n, tuple(a+b for a,b in zip(rd1,d2)))

    def inverse_transition(self, t: Transition) -> Transition:
        d=self._vec(t.d)
        return Transition((-t.k)%self.n, tuple(-x for x in self.rotate(d,-t.k)))
