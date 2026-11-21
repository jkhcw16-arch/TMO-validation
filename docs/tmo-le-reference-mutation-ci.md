# TMO-LE v0.1.0 reference mutation check

Use **Actions → TMO-LE reference mutation gate → Run workflow**. Enter the ID
of an Actions run **in this repository** that uploaded an artifact named
`TMO-LE-v0.1.0-CANDIDATE`, containing
`TMO-LE-v0.1.0-CANDIDATE.zip` at its root. The artifact must not be expired.
If an upstream workflow does not already upload the signed candidate, add
the following step there after it has staged the exact signed ZIP:

```yaml
- uses: actions/upload-artifact@v4
  with:
    name: TMO-LE-v0.1.0-CANDIDATE
    path: path/to/TMO-LE-v0.1.0-CANDIDATE.zip
    if-no-files-found: error
```

The check verifies the candidate SHA-256 before reading its pins or executing
its code. It reproduces all seven archived baseline checks and requires six
mutants of the actual SHACL and query artifacts to fail their intended checks.
It does not change the signed ZIP. When produced, the JSON is retained as
`TMO-LE-release-mutation-results`, including on mutation failure.

This workflow is manual: there is no signed reference candidate producer on
the default branch, and the generic package build is not a substitute. This
workflow does not publish anything and does not gate the npm release. To make
it a required release gate later, call the same script from the workflow that
produces the signed candidate before that workflow publishes. Review the
oracles and digest pin whenever changing the signed baseline. These six checks
do not replace the older 16 reference-logic mutations or establish operational
or legal validity.
