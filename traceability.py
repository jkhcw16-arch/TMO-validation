import ast
from pathlib import Path
for path in sorted(Path("tests").glob("test_*.py")):
    tree=ast.parse(path.read_text())
    for node in tree.body:
        if isinstance(node,(ast.FunctionDef,ast.AsyncFunctionDef)) and "QA_" in node.name:
            req=[]
            for d in node.decorator_list:
                if isinstance(d,ast.Call) and getattr(d.func,"attr",None)=="requirements":
                    req=[ast.literal_eval(a) for a in d.args]
            print(f"{node.name}: {', '.join(req)}")
