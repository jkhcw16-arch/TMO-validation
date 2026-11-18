from openpyxl import load_workbook
p='PTM_TMO_Traceability_With_Validation_Report.xlsx'; wb=load_workbook(p,data_only=True)
needed={'Traceability Matrix','Requirements Coverage','Summary','Validation Report'}
assert needed<=set(wb.sheetnames)
print('Traceability workbook structure PASS')
