# PTM / TMO QA and Traceability Suite

Executable reference models and QA tests for PTM replay/provenance and the TMO profile-relation model, including multi-profile and cyclic composition.

## Included

- `ptm.py` - PTM state-transition, replay, lineage, and provenance reference implementation.
- `tmo_profiles.py` - TMO core, profile, relation-edge, graph, path, and cycle composition model.
- `tests/` - pytest and Hypothesis tests QA-001 through QA-080.
- `PTM_TMO_Traceability_With_Validation_Report.xlsx` - QA-to-requirement traceability workbook.
- `tools/validate_traceability_matrix.py` - executable consistency check between tests and the workbook.
- `.github/workflows/pytest.yml` - CI workflow.
- `requirements.in` - direct dependency inputs.
- `requirements.txt` - exact direct dependency pins.
- `pylock.toml` - resolved lockfile used by CI.

## Requirements

Install a Python version supported by the repository CI matrix. The workflow itself uses `actions/setup-python` to configure Python consistently on GitHub-hosted runners.

## Quick setup

Clone the repository and move into it:

```bash
git clone <repository-url>
cd <repository-directory>
```

Create an isolated environment:

### macOS / Linux

```bash
python -m venv .venv
source .venv/bin/activate
```

### Windows PowerShell

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
```

Upgrade pip:

```bash
python -m pip install --upgrade pip
```

Install the locked environment:

```bash
python -m pip install -r pylock.toml
```

The lock was generated with pip's native lock command. It is tied to the Python/platform environment for which it was generated. If your local interpreter or platform cannot use that lock, install the exact direct pins instead:

```bash
python -m pip install -r requirements.txt
```

## Run the complete QA suite

```bash
python -m pytest
```

The current baseline represented by the traceability workbook is:

```text
297 passed
1 skipped
```

## Validate the traceability matrix

Run:

```bash
python tools/validate_traceability_matrix.py PTM_TMO_Traceability_With_Validation_Report.xlsx
```

A successful check reports:

```text
Matrix validation PASS: 80 tests, 53 requirements, 159 links
```

The validator fails when it detects duplicate, missing, or extra QA-to-requirement links, stale coverage lists or counts, inconsistent summary totals, inconsistent validation-report totals, or missing required workbook sheets.

## Run a test group

Numerical PTM tests:

```bash
python -m pytest tests/test_numerical.py
```

Replay and lineage:

```bash
python -m pytest tests/test_replay_lineage.py
```

TMO profile model:

```bash
python -m pytest tests/test_tmo_profiles.py
```

Multi-profile graph composition:

```bash
python -m pytest tests/test_tmo_graph_composition.py
```

Cyclic profile composition:

```bash
python -m pytest tests/test_tmo_cyclic_composition.py
```

Hypothesis properties:

```bash
python -m pytest tests/test_hypothesis_properties.py
```

## Traceability

Tests carry requirement IDs as pytest markers, for example:

```python
@pytest.mark.requirements("REQ-TMO-18", "REQ-TMO-05")
def test_QA_072_cycle_preserves_quality_shared_by_all_edges():
    ...
```

Generate the text traceability listing with:

```bash
python traceability.py
```

The Excel workbook provides the expanded QA-to-requirement matrix, requirement coverage, summary, and validation report.

## Dependency updates

Direct versions are declared in `requirements.in` / `requirements.txt`. When intentionally changing dependencies, update the direct pins and regenerate the lockfile using a compatible pip version:

```bash
python -m pip lock -r requirements.in -o pylock.toml
```

After changing dependencies, always rerun both checks:

```bash
python -m pytest
python tools/validate_traceability_matrix.py PTM_TMO_Traceability_With_Validation_Report.xlsx
```

## Continuous integration

The GitHub Actions workflow under `.github/workflows/pytest.yml` automatically installs dependencies, runs pytest, validates the Excel traceability matrix, and generates the requirement traceability listing for configured Python versions.

## Repository acceptance criteria

A change is ready when:

1. The pytest suite completes without new failures.
2. The traceability validator reports PASS.
3. New QA cases carry requirement markers.
4. Changes to QA-to-requirement mappings are reflected in the Excel traceability matrix.
5. Dependency changes are reflected in the direct pins and lockfile.
