# SPDX-License-Identifier: AGPL-3.0-only
# SPDX-FileCopyrightText: 2026 Jamie Kinney, Ephrata, WA
import unittest
from fractions import Fraction
from ptm_lattice import PrimeLattice, Transition

class TestPrimeLattice(unittest.TestCase):
    def setUp(self): self.L=PrimeLattice([2,3,7,11,13])
    def test_rotation_order(self):
        e=(1,2,3,4,5); self.assertEqual(self.L.rotate(e,5),e); self.assertEqual(self.L.right_rotate(self.L.rotate(e)),e)
    def test_transition_inverse(self):
        e=(2,-1,0,3,1); t=Transition(2,(0,1,-2,0,4)); self.assertEqual(self.L.invert(self.L.apply(e,t),t),e)
    def test_prime_roundtrip(self):
        e=(2,-1,0,3,-2); self.assertEqual(self.L.decode(self.L.encode(e)),e)
    def test_role(self):
        self.assertEqual(self.L.role_displacement(1,1,3),(0,-3,0,0,0)); self.assertEqual(self.L.role_displacement(1,2,3),(0,3,0,0,0))
    def test_composition(self):
        e=(1,0,2,-1,3); a=Transition(1,(1,0,0,0,0)); b=Transition(3,(0,2,0,0,-1)); c=self.L.compose(b,a)
        self.assertEqual(self.L.apply(self.L.apply(e,a),b),self.L.apply(e,c))

if __name__ == "__main__": unittest.main()
