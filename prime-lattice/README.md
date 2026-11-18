# PTM Prime Lattice

Reference implementation of the invertible prime-lattice model developed for Pairwise Temporal Memory (PTM).

## Model
A lattice state is `e in Z^n`; distinct primes provide a reversible serialization:

`Phi(e) = product(p_i ** e_i)`

A transition is:

`e[t+1] = R_n^k e[t] + d[t]`

where `R_n` is cyclic left rotation, `k mod n` is orientation, and `d` is an integer edge/role displacement. The inverse is:

`e[t] = R_n^(-k) (e[t+1] - d[t])`

The full transition structure is `Z^n semidirect-product C_n`.

## Quick start
```python
from ptm_lattice import PrimeLattice, Transition

L = PrimeLattice([2, 3, 7, 11, 13])
e0 = (1, 2, 0, -1, 3)
t = Transition(k=1, d=(0, 1, 0, 0, 0))
e1 = L.apply(e0, t)
assert L.invert(e1, t) == e0
assert L.decode(L.encode(e0)) == e0
```

## Test
`python -m unittest discover -s tests -v`

## Ownership
Copyright 2026 Jamie Kinney, Ephrata, Washington. Licensed under AGPL-3.0-only.

## Verify a signed release

A release signature is valid only when the signing public key has been independently confirmed as belonging to the expected release signer.

1. Obtain these release files:
   - `ptm-prime-lattice.zip`
   - `ptm-prime-lattice.zip.sha256`
   - `RELEASE-MANIFEST.txt`
   - `RELEASE-MANIFEST.txt.asc`
   - the trusted public signing key

2. Import the trusted public key if it is not already in your GPG keyring:

   `gpg --import RELEASE-SIGNING-KEY.asc`

3. Inspect and independently compare the key fingerprint with the fingerprint published by the project owner through a trusted channel:

   `gpg --fingerprint YOUR_KEY_FINGERPRINT`

4. Verify the detached signature. The signature file is the first argument and the signed manifest is the second:

   `gpg --verify RELEASE-MANIFEST.txt.asc RELEASE-MANIFEST.txt`

   Continue only if GPG reports a good signature from the expected key and the displayed fingerprint matches the independently trusted fingerprint.

5. Verify the archive checksum:

   `sha256sum -c ptm-prime-lattice.zip.sha256`

6. Compare the SHA-256 recorded inside `RELEASE-MANIFEST.txt` with the checksum of the downloaded archive:

   `sha256sum ptm-prime-lattice.zip`

A valid signature authenticates the signed manifest. The checksum binds the archive to the hash recorded for the release. Do not treat an unverified key identity or a checksum alone as proof of signer identity.
