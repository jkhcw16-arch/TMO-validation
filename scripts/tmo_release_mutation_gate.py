#!/usr/bin/env python3
"""Run targeted mutations against the exact TMO-LE v0.1.0 reference package."""
import argparse
import hashlib
import importlib.metadata
import json
from pathlib import Path, PurePosixPath
import platform
import re
import subprocess
import sys
import tempfile
import zipfile

CANDIDATE_SHA256 = "a7aac3ab8333acefd3cc3c1e6180d52d74605bf6ffe6e794137a02732bdbc5ac"
SHAPES = "shapes/tmo-le.shacl.ttl"
RESULT = "validation/TMO-LE-Conformance-Results.json"
MUTATIONS = [
    ("M07_SKIP_COORD_EVIDENCE_GATE", SHAPES,
     '  sh:sparql [ sh:message "Nonzero coordination strength requires explicit coordination evidence." ; sh:select "SELECT $this WHERE { $this le:coordinationStrength ?v . FILTER(?v > 0) FILTER NOT EXISTS { $this le:coordinationEvidence ?e } }" ] ;\n',
     "", "fixtures", "invalid/coordination-without-evidence.ttl", True),
    ("M08_SKIP_RIGHT_BASIS_GATE", SHAPES,
     'FILTER(?v > 0) FILTER NOT EXISTS { $this le:identifiedRightBasis ?b }',
     'FILTER(?v > 1) FILTER NOT EXISTS { $this le:identifiedRightBasis ?b }',
     "fixtures", "invalid/rights-without-basis.ttl", True),
    ("M10_SKIP_ROLE_ATTRIBUTION_GATE", SHAPES,
     "sh:path le:supportedByAttribution ; sh:minCount 1 ; sh:maxCount 1",
     "sh:path le:supportedByAttribution ; sh:minCount 0 ; sh:maxCount 1",
     "fixtures", "invalid/role-without-attribution.ttl", True),
    ("QUERY_ROLE_WRONG_ATTRIBUTION_TYPE", "queries/LE-CQ-01-role-attribution.rq",
     "?a a le:ActorAttribution", "?a a le:LegalDetermination",
     "queries", "LE-CQ-01-role-attribution.rq", {"ask": False}),
    ("QUERY_COUNT_WRONG_CLASS", "queries/LE-CQ-02-condition-vector.rq",
     "?cv a le:ConditionVector", "?cv a le:LegalDetermination",
     "queries", "LE-CQ-02-condition-vector.rq", {"rows": 0}),
    ("QUERY_SEPARATION_WRONG_CLASSES", "queries/LE-CQ-03-legal-separation.rq",
     "le:Assessment, le:LegalDetermination", "le:RoleAssignment, le:RoleAssignment",
     "queries", "LE-CQ-03-legal-separation.rq", {"ask": True}),
]


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def materialize(entries, root):
    for name, data in entries.items():
        p = root / name
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data)
    # A crashing validator must never be able to return the archived result.
    (root / RESULT).unlink()


def run_validator(root):
    completed = subprocess.run(
        [sys.executable, "-I", "validation/validate_tmo_le.py"], cwd=root,
        capture_output=True, timeout=60, check=False,
    )
    p = root / RESULT
    if not p.is_file():
        raise RuntimeError(f"validator produced no fresh result (exit {completed.returncode})")
    output = p.read_bytes()
    if completed.stderr or completed.stdout != output:
        raise RuntimeError("unexpected validator stderr or disagreement between stdout and result")
    return completed.returncode, output, json.loads(output)


def checks(result):
    return {(family, name): case for family in ("fixtures", "queries")
            for name, case in result[family].items()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("candidate", type=Path)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    data = args.candidate.read_bytes()
    digest = sha256(data)
    if args.candidate.resolve() == args.report.resolve():
        parser.error("report must not overwrite the candidate")
    if digest != CANDIDATE_SHA256:
        parser.error(f"candidate SHA-256 mismatch: {digest}; expected {CANDIDATE_SHA256}")
    from io import BytesIO
    with zipfile.ZipFile(BytesIO(data)) as archive:
        entries = {info.filename: archive.read(info) for info in archive.infolist()}
        if len(entries) != len(archive.infolist()) or any(
            not re.fullmatch(r"[A-Za-z0-9_.-]+(?:/[A-Za-z0-9_.-]+)*", name)
            or any(part in {".", ".."} for part in name.split("/"))
            or PurePosixPath(name).is_absolute() for name in entries
        ):
            raise RuntimeError("unsafe or duplicate archive entries")
    pins = dict(line.split("==") for line in entries["requirements-ci.txt"].decode().splitlines()
                if line.strip())
    versions = {name: importlib.metadata.version(name) for name in pins}
    if versions != pins:
        raise RuntimeError("installed direct dependency versions do not match candidate pins")

    with tempfile.TemporaryDirectory(prefix="tmo-release-mutation-") as scratch:
        baseline_dir = Path(scratch, "baseline")
        materialize(entries, baseline_dir)
        rc, baseline_bytes, baseline = run_validator(baseline_dir)
        cases = checks(baseline)
        if (rc != 0 or baseline["status"] != "PASS" or baseline_bytes != entries[RESULT]
                or len(baseline["fixtures"]) != 4 or len(baseline["queries"]) != 3
                or not all(case["pass"] for case in cases.values())):
            raise RuntimeError("baseline did not reproduce the candidate's archived PASS")
        outcomes = []
        for number, (name, path, old, new, family, case, expected_mutant_value) in enumerate(MUTATIONS):
            root = Path(scratch, f"mutant-{number}")
            source = entries[path]
            old, new = old.encode(), new.encode()
            if source.count(old) != 1:
                raise RuntimeError(f"{name}: mutation anchor must occur exactly once")
            mutated = source.replace(old, new, 1)
            materialize({**entries, path: mutated}, root)
            target = (family, case)
            record = dict(id=name, artifact=path, original_sha256=sha256(source),
                          mutated_sha256=sha256(mutated), check_family=family, check=case,
                          baseline_actual=cases[target]["actual"],
                          expected_mutant_actual=expected_mutant_value)
            try:
                rc, _, result = run_validator(root)
                observed = checks(result)
                changed = sorted(f"{group}/{item}" for group, item in cases.keys() | observed.keys()
                                 if cases.get((group, item)) != observed.get((group, item)))
                target_result = observed.get(target, {})
                expected_target = {**cases[target], "actual": expected_mutant_value, "pass": False}
                if (rc == 1 and result["status"] == "FAIL" and
                        changed == [f"{family}/{case}"] and target_result == expected_target and
                        result["ontology_triples"] == baseline["ontology_triples"]):
                    status = "KILLED"
                elif rc == 0 and result == baseline:
                    status = "SURVIVED"
                else:
                    status = "UNEXPECTED"
                record.update(status=status, validator_exit=rc, actual=target_result.get("actual"),
                              changed_checks=changed)
            except (RuntimeError, subprocess.TimeoutExpired, ValueError, KeyError) as exc:
                record.update(status="ERROR", error=str(exc))
            outcomes.append(record)

    killed = sum(item["status"] == "KILLED" for item in outcomes)
    passed = killed == len(outcomes)
    report = dict(schema="tmo-le-release-mutation-gate-1",
                  scope="Targeted mutations of the packaged reference validator inputs only",
                  candidate_sha256=digest, gate_sha256=sha256(Path(__file__).read_bytes()),
                  python=platform.python_version(), direct_dependencies=versions,
                  baseline_result_sha256=sha256(baseline_bytes),
                  baseline_checks={"fixtures": 4, "queries": 3},
                  status="PASS" if passed else "FAIL", killed=killed, total=len(outcomes),
                  mutations=outcomes)
    args.report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"{report['status']}: {killed}/{len(outcomes)} targeted mutants killed")
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
