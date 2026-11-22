# TMO-LE v0.1.0 reference mutation check

The check runs on pull requests that change the workflow or gate script.
Once the workflow is on the default branch, it can also run from
**Actions → TMO-LE reference mutation gate → Run workflow**.

The signed candidate is stored on the separate `artifacts/tmo-le-v0.1.0-reference`
branch of this private repository. The workflow pins the exact source commit and
sparsely checks out only `release-inputs`. Keep that branch unmerged and
retain it so the pinned commit remains reachable. The workflow does not copy
the ZIP into the default branch or upload it as a public release asset.

The check verifies the candidate SHA-256 before reading its pins or executing
its code. It reproduces all seven archived baseline checks and requires six
mutants of the actual SHACL and query artifacts to fail their intended checks.
It does not change the signed ZIP. When produced, the JSON is retained as
`TMO-LE-release-mutation-results`, including on mutation failure.

## Signed reference publication

**TMO-LE signed reference release** calls the same gate first. The publication
job skips on pull requests, failed gates, non-`main` refs, and manual runs where
`publish` is left unchecked. For a validation-only run on `main`, leave that
box unchecked. Only after deliberate release approval, dispatch from `main`
with `publish` checked. The job re-verifies the ZIP before writing a tag or
release, then creates a GitHub prerelease with the ZIP and its checksum. It
does not publish to npm or mark the release as latest.

The workflow will not move an existing tag. If publication fails after tag
creation, inspect GitHub Releases and the tag before retrying the same run. A
separate manual release made outside this workflow is not governed by this
check. Review the oracles and digest pin whenever changing the signed baseline.
These six checks do not replace the older 16 reference-logic mutations or
establish operational or legal validity.
