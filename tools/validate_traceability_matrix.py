from __future__ import annotations
import ast, re, sys
from pathlib import Path
from openpyxl import load_workbook

MATRIX = Path(sys.argv[1] if len(sys.argv)>1 else 'PTM_TMO_Traceability_With_Validation_Report.xlsx')
TESTS = Path('tests')

def executable_links():
    links=set()
    for path in TESTS.glob('test_*.py'):
        tree=ast.parse(path.read_text())
        for node in ast.walk(tree):
            if not isinstance(node,ast.FunctionDef): continue
            qas=re.findall(r'QA[_-](\d{3})',node.name)
            reqs=[]
            for d in node.decorator_list:
                if isinstance(d,ast.Call) and isinstance(d.func,ast.Attribute) and d.func.attr=='requirements':
                    reqs += [ast.literal_eval(a) for a in d.args]
            links |= {(f'QA-{q}',r) for q in qas for r in reqs}
    param={24:['REQ-TAM-01','REQ-DIA-01'],25:['REQ-TAM-01','REQ-PRV-04'],26:['REQ-TAM-01','REQ-PRV-04'],27:['REQ-TAM-01','REQ-LIN-02'],28:['REQ-TAM-01','REQ-RPL-01'],29:['REQ-TAM-02','REQ-NUM-05'],30:['REQ-TAM-01','REQ-VER-01','REQ-VER-02']}
    for q,rs in param.items(): links |= {(f'QA-{q:03d}',r) for r in rs}
    return links

def fail(msg):
    print(f'::error::{msg}')
    raise SystemExit(1)

if not MATRIX.exists(): fail(f'traceability matrix missing: {MATRIX}')
expected=executable_links(); wb=load_workbook(MATRIX,data_only=True)
required_sheets={'Traceability Matrix','Requirements Coverage','Summary','Validation Report'}
missing_sheets=required_sheets-set(wb.sheetnames)
if missing_sheets: fail('missing sheets: '+', '.join(sorted(missing_sheets)))
ws=wb['Traceability Matrix']
raw=[(ws.cell(r,1).value,ws.cell(r,2).value) for r in range(2,ws.max_row+1) if ws.cell(r,1).value and ws.cell(r,2).value]
actual=set(raw)
if len(raw)!=len(actual): fail(f'duplicate matrix links: {len(raw)-len(actual)}')
if expected-actual: fail('missing executable links: '+str(sorted(expected-actual)))
if actual-expected: fail('extra matrix links: '+str(sorted(actual-expected)))
rq=wb['Requirements Coverage']
for r in range(2,rq.max_row+1):
    req=rq.cell(r,1).value
    listed={x.strip() for x in str(rq.cell(r,3).value or '').split(',') if x.strip()}
    mapped={qa for qa,requirement in actual if requirement==req}
    if listed!=mapped: fail(f'coverage list mismatch for {req}')
    if rq.cell(r,4).value!=len(mapped): fail(f'coverage count mismatch for {req}')
summary={wb['Summary'].cell(r,1).value:wb['Summary'].cell(r,2).value for r in range(1,wb['Summary'].max_row+1)}
counts={'Unique QA test IDs':len({q for q,_ in actual}),'Requirements':len({r for _,r in actual}),'Mapped test-requirement links':len(actual)}
for key,value in counts.items():
    if summary.get(key)!=value: fail(f'summary mismatch for {key}: expected {value}, got {summary.get(key)}')
vr={wb['Validation Report'].cell(r,1).value:wb['Validation Report'].cell(r,2).value for r in range(1,wb['Validation Report'].max_row+1)}
for key,value in {'Unique QA test IDs':counts['Unique QA test IDs'],'Unique requirements':counts['Requirements'],'Unique test-requirement links':counts['Mapped test-requirement links'],'Duplicate matrix links':0,'Missing executable links':0,'Extra matrix links':0,'Requirements coverage mismatches':0}.items():
    if vr.get(key)!=value: fail(f'validation report mismatch for {key}: expected {value}, got {vr.get(key)}')
print(f'Matrix validation PASS: {counts["Unique QA test IDs"]} tests, {counts["Requirements"]} requirements, {counts["Mapped test-requirement links"]} links')
