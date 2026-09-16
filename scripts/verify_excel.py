"""Verify the generated Excel file (ASCII-safe output)."""
import sys
from openpyxl import load_workbook
from pathlib import Path

# Force UTF-8 stdout
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

xlsx_path = Path(r"C:\Users\Mrwan\.minimax\sessions\mvs_4b8b2e42a6664442a08cc9b2b2882873\workspace\1carz_users.xlsx")

if not xlsx_path.exists():
    print(f"[MISSING] File not found at {xlsx_path}")
    raise SystemExit(1)

print(f"[OK] File exists: {xlsx_path}")
print(f"     Size: {xlsx_path.stat().st_size} bytes")
print()

wb = load_workbook(xlsx_path, read_only=True)
print(f"Sheets ({len(wb.sheetnames)}):")
for name in wb.sheetnames:
    ws = wb[name]
    print(f"  - {name}: {ws.max_row} rows x {ws.max_column} cols")

print()
print("=== Sheet: كل الحسابات — first 6 data rows ===")
ws = wb["كل الحسابات"]
for i, row in enumerate(ws.iter_rows(min_row=4, max_row=9, values_only=True)):
    print(f"  Row {i+4}: id={row[0]} | name={row[1]} | username={row[2]} | role={row[5]}")

print()
print("=== Sheet: الأدمن — full content ===")
ws = wb["الأدمن"]
for i, row in enumerate(ws.iter_rows(min_row=3, values_only=True)):
    if any(cell is not None for cell in row):
        print(f"  Row {i+3}: {row}")

print()
print("=== Sheet: المستخدمين — first 5 users ===")
ws = wb["المستخدمين"]
for i, row in enumerate(ws.iter_rows(min_row=4, max_row=8, values_only=True)):
    print(f"  Row {i+4}: id={row[0]} | name={row[1]} | username={row[2]} | phone={row[5]}")

print()
print("=== Sheet: ملخص (preview) ===")
ws = wb["ملخص"]
for i, row in enumerate(ws.iter_rows(min_row=2, max_row=14, values_only=True)):
    if any(cell is not None for cell in row):
        print(f"  Row {i+2}: {row}")

wb.close()
