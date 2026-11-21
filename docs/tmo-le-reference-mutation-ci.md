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

There is no signed reference candidate producer on the default branch, and the
generic package build is not a substitute. This workflow does not publish
anything and does not gate the npm release. To make
it a required release gate later, call the same script from the workflow that
produces the signed candidate before that workflow publishes. Review the
oracles and digest pin whenever changing the signed baseline. These six checks
do not replace the older 16 reference-logic mutations or establish operational
or legal validity.
