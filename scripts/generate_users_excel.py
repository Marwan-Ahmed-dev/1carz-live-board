"""Generate 1CARZ Live Board — users Excel sheet.

Creates an Excel workbook containing:
  - 4 admin accounts
  - 40 normal user accounts
Total: 44 accounts.

Output: ../../1carz_users.xlsx (next to the project folder)
"""
from __future__ import annotations

from datetime import datetime
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter


# ---------------------------------------------------------------------------
# Source data — 4 admins (FAKE / test accounts only)
# ---------------------------------------------------------------------------
# No real names. These are throwaway accounts used purely for local
# development + manual Firebase seeding during testing. The display name
# is generic ("حساب اختبار 1", "حساب اختبار 2", ...) and the username
# is left empty — the user picks it during the app's onboarding flow.
ADMINS = [
    {"label": "أدمن 1", "phone": "+201000000001", "notes": "حساب اختبار — Super Admin"},
    {"label": "أدمن 2", "phone": "+201000000002", "notes": "حساب اختبار — Sales"},
    {"label": "أدمن 3", "phone": "+201000000003", "notes": "حساب اختبار — Senior"},
    {"label": "أدمن 4", "phone": "+201000000004", "notes": "حساب اختبار — Marketing"},
]


# ---------------------------------------------------------------------------
# Source data — 40 normal users (FAKE / test accounts only)
# ---------------------------------------------------------------------------
# Zero-padded numbering: user001 .. user040. Generic labels only — no real
# names. The `username` field is the DEFAULT placeholder; the actual user
# picks their own during onboarding and overwrites this in Firestore.
NORMAL_USERS = [
    {
        "label": f"مستخدم {i:03d}",
        "username": f"user{i:03d}",
        "phone": f"+20110000{i:04d}",
    }
    for i in range(1, 41)
]


def arabic_to_username(arabic_name: str, used: set[str]) -> str:
    """Convert an Arabic name to a unique latin username."""
    parts = arabic_name.split()
    latin_parts = [TRANSLIT.get(part, part) for part in parts]
    base = ".".join(latin_parts).lower()
    candidate = base
    counter = 2
    while candidate in used:
        candidate = f"{base}{counter}"
        counter += 1
    used.add(candidate)
    return candidate


def admin_username(index: int) -> str:
    return f"admin{index}"


def make_email(username: str) -> str:
    return f"{username}@1carz.com"


def make_password() -> str:
    return "User@2026"


def build_admin(index: int, base: dict) -> dict:
    username = admin_username(index)
    return {
        "id": index,
        "name": base["label"],
        "username": username,
        "email": make_email(username),
        "password": base.get("password", "Admin@2026"),
        "role": "admin",
        "phone": base["phone"],
        "status": "active",
        "created_at": "2026-09-17",
        "notes": base["notes"],
    }


def build_normal_user(index: int, base: dict) -> dict:
    username = base["username"]
    return {
        "id": index,
        "name": base["label"],
        "username": username,
        "email": make_email(username),
        "password": make_password(),
        "role": "user",
        "phone": base["phone"],
        "status": "active",
        "created_at": "2026-09-17",
        "notes": "حساب اختبار — username placeholder (يتغير وقت الـonboarding)",
    }


# ---------------------------------------------------------------------------
# Workbook construction
# ---------------------------------------------------------------------------
def build_workbook(users: list[dict]) -> Workbook:
    wb = Workbook()

    # ---------- Sheet 1: كل الحسابات (44) ----------
    ws_all = wb.active
    ws_all.title = "كل الحسابات"
    ws_all.sheet_view.rightToLeft = True

    headers = [
        "#",
        "الاسم الكامل",
        "اسم المستخدم",
        "البريد الإلكتروني",
        "كلمة المرور",
        "الدور",
        "رقم الهاتف",
        "الحالة",
        "تاريخ الإنشاء",
        "ملاحظات",
    ]

    header_fill = PatternFill("solid", fgColor="1F2937")  # slate-800
    header_font = Font(name="Cairo", size=12, bold=True, color="FFFFFF")
    admin_fill = PatternFill("solid", fgColor="FEF3C7")  # amber-100
    admin_font = Font(name="Cairo", size=11, color="92400E", bold=True)  # amber-900
    user_fill = PatternFill("solid", fgColor="F9FAFB")  # gray-50
    user_font = Font(name="Cairo", size=11, color="1F2937")
    alt_fill = PatternFill("solid", fgColor="FFFFFF")
    thin_border = Border(
        left=Side(style="thin", color="E5E7EB"),
        right=Side(style="thin", color="E5E7EB"),
        top=Side(style="thin", color="E5E7EB"),
        bottom=Side(style="thin", color="E5E7EB"),
    )
    centered = Alignment(horizontal="center", vertical="center", wrap_text=True)
    right_aligned = Alignment(horizontal="right", vertical="center", wrap_text=True)
    left_aligned = Alignment(horizontal="left", vertical="center", wrap_text=True)

    # Title row
    ws_all.merge_cells("A1:J1")
    title_cell = ws_all["A1"]
    title_cell.value = f"1CARZ LIVE BOARD — قائمة الحسابات ({len(users)} حساب)"
    title_cell.font = Font(name="Cairo", size=16, bold=True, color="FCD34D")
    title_cell.fill = PatternFill("solid", fgColor="0F172A")  # slate-900
    title_cell.alignment = centered
    ws_all.row_dimensions[1].height = 36

    # Header row (row 3)
    for col_idx, header in enumerate(headers, start=1):
        cell = ws_all.cell(row=3, column=col_idx, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = centered
        cell.border = thin_border
    ws_all.row_dimensions[3].height = 28

    # Data rows
    for row_idx, user in enumerate(users, start=4):
        is_admin = user["role"] == "admin"
        row_fill = admin_fill if is_admin else (user_fill if row_idx % 2 == 0 else alt_fill)
        row_font = admin_font if is_admin else user_font

        values = [
            user["id"],
            user["name"],
            user["username"],
            user["email"],
            user["password"],
            "أدمن" if is_admin else "مستخدم",
            user["phone"],
            "نشط" if user["status"] == "active" else "موقوف",
            user["created_at"],
            user["notes"],
        ]

        for col_idx, value in enumerate(values, start=1):
            cell = ws_all.cell(row=row_idx, column=col_idx, value=value)
            cell.font = row_font
            cell.fill = row_fill
            cell.border = thin_border
            if col_idx in (1, 5, 6, 7, 8, 9):  # numbers + role + status
                cell.alignment = centered
            elif col_idx == 2 or col_idx == 10:  # arabic text
                cell.alignment = right_aligned
            else:  # latin text (username, email)
                cell.alignment = left_aligned

        ws_all.row_dimensions[row_idx].height = 24

    # Column widths
    widths = [5, 22, 22, 28, 14, 10, 18, 10, 14, 36]
    for col_idx, width in enumerate(widths, start=1):
        ws_all.column_dimensions[get_column_letter(col_idx)].width = width

    # Freeze header
    ws_all.freeze_panes = "A4"

    # ---------- Sheet 2: الأدمن (4) ----------
    ws_admin = wb.create_sheet("الأدمن")
    ws_admin.sheet_view.rightToLeft = True

    admins = [u for u in users if u["role"] == "admin"]

    ws_admin.merge_cells("A1:E1")
    title = ws_admin["A1"]
    title.value = f"حسابات الأدمن ({len(admins)} حساب)"
    title.font = Font(name="Cairo", size=16, bold=True, color="FCD34D")
    title.fill = PatternFill("solid", fgColor="0F172A")
    title.alignment = centered
    ws_admin.row_dimensions[1].height = 36

    admin_headers = ["#", "الاسم", "اسم المستخدم", "البريد", "كلمة المرور"]
    for col_idx, h in enumerate(admin_headers, start=1):
        cell = ws_admin.cell(row=3, column=col_idx, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = centered
        cell.border = thin_border

    for row_idx, admin in enumerate(admins, start=4):
        values = [
            admin["id"],
            admin["name"],
            admin["username"],
            admin["email"],
            admin["password"],
        ]
        for col_idx, value in enumerate(values, start=1):
            cell = ws_admin.cell(row=row_idx, column=col_idx, value=value)
            cell.font = admin_font
            cell.fill = admin_fill
            cell.border = thin_border
            cell.alignment = centered if col_idx == 1 else right_aligned
        ws_admin.row_dimensions[row_idx].height = 26

    for col_idx, w in enumerate([5, 24, 24, 30, 16], start=1):
        ws_admin.column_dimensions[get_column_letter(col_idx)].width = w

    # ---------- Sheet 3: المستخدمين (40) ----------
    ws_users = wb.create_sheet("المستخدمين")
    ws_users.sheet_view.rightToLeft = True

    normal = [u for u in users if u["role"] == "user"]

    ws_users.merge_cells("A1:I1")
    title = ws_users["A1"]
    title.value = f"حسابات المستخدمين العاديين ({len(normal)} حساب)"
    title.font = Font(name="Cairo", size=16, bold=True, color="FCD34D")
    title.fill = PatternFill("solid", fgColor="0F172A")
    title.alignment = centered
    ws_users.row_dimensions[1].height = 36

    user_headers = ["#", "الاسم", "اسم المستخدم", "البريد", "كلمة المرور", "الهاتف", "الحالة", "تاريخ الإنشاء", "ملاحظات"]
    for col_idx, h in enumerate(user_headers, start=1):
        cell = ws_users.cell(row=3, column=col_idx, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = centered
        cell.border = thin_border

    for row_idx, user in enumerate(normal, start=4):
        values = [
            user["id"],
            user["name"],
            user["username"],
            user["email"],
            user["password"],
            user["phone"],
            "نشط" if user["status"] == "active" else "موقوف",
            user["created_at"],
            user["notes"],
        ]
        for col_idx, value in enumerate(values, start=1):
            cell = ws_users.cell(row=row_idx, column=col_idx, value=value)
            cell.font = user_font
            cell.fill = user_fill if row_idx % 2 == 0 else alt_fill
            cell.border = thin_border
            if col_idx in (1, 5, 6, 7, 8):
                cell.alignment = centered
            elif col_idx in (2, 9):
                cell.alignment = right_aligned
            else:
                cell.alignment = left_aligned
        ws_users.row_dimensions[row_idx].height = 24

    for col_idx, w in enumerate([5, 22, 22, 28, 14, 18, 10, 14, 36], start=1):
        ws_users.column_dimensions[get_column_letter(col_idx)].width = w
    ws_users.freeze_panes = "A4"

    # ---------- Sheet 4: ملخص ----------
    ws_summary = wb.create_sheet("ملخص", 0)  # make first sheet
    ws_summary.sheet_view.rightToLeft = True

    admin_count = len(admins)
    user_count = len(normal)

    ws_summary.merge_cells("A1:C1")
    title = ws_summary["A1"]
    title.value = "ملخص الحسابات"
    title.font = Font(name="Cairo", size=18, bold=True, color="FCD34D")
    title.fill = PatternFill("solid", fgColor="0F172A")
    title.alignment = centered
    ws_summary.row_dimensions[1].height = 42

    summary_rows = [
        ("", "", ""),
        ("العنصر", "العدد", "النسبة"),
        ("حسابات الأدمن", admin_count, "=ROUND(B4/B6*100, 1)&\"%\""),
        ("حسابات المستخدمين", user_count, "=ROUND(B5/B6*100, 1)&\"%\""),
        ("الإجمالي", admin_count + user_count, "100%"),
        ("", "", ""),
        ("تاريخ الإنشاء", datetime.now().strftime("%Y-%m-%d"), ""),
        ("كلمة مرور الأدمن الافتراضية", "Admin@2026", "غيّرها بعد الدخول"),
        ("كلمة مرور المستخدم الافتراضية", "User@2026", "غيّرها بعد الدخول"),
        ("", "", ""),
        ("ملاحظة 1", "حسابات تجريبية فقط — مفيش أسماء حقيقية", ""),
        ("ملاحظة 2", "اسم المستخدم placeholder — المستخدم يحدده وقت الـonboarding في التطبيق", ""),
        ("ملاحظة 3", "Firebase Auth email = البريد الإلكتروني", ""),
        ("ملاحظة 4", "كلمة المرور في الـExcel — لازم تتشال بعد الـseed في الإنتاج", ""),
        ("ملاحظة 5", "أنماط الحسابات: admin1..admin4 / user001..user040", ""),
    ]

    label_font = Font(name="Cairo", size=12, bold=True, color="1F2937")
    value_font = Font(name="Cairo", size=12, color="0F172A")
    summary_fill = PatternFill("solid", fgColor="FEF3C7")
    header_summary_fill = PatternFill("solid", fgColor="FCD34D")

    for row_idx, (label, value, note) in enumerate(summary_rows, start=2):
        is_header = row_idx == 3
        is_total = row_idx == 7
        for col_idx, val in enumerate([label, value, note], start=1):
            cell = ws_summary.cell(row=row_idx, column=col_idx, value=val)
            cell.font = label_font if col_idx == 1 else value_font
            cell.border = thin_border
            cell.alignment = centered
            if is_header:
                cell.fill = header_summary_fill
            elif is_total:
                cell.fill = summary_fill
                cell.font = Font(name="Cairo", size=12, bold=True, color="92400E")
            else:
                cell.fill = alt_fill
        ws_summary.row_dimensions[row_idx].height = 22

    for col_idx, w in enumerate([28, 18, 50], start=1):
        ws_summary.column_dimensions[get_column_letter(col_idx)].width = w

    # Make summary the first visible sheet
    wb.active = 0

    return wb


def main() -> Path:
    users: list[dict] = []

    for idx, admin in enumerate(ADMINS, start=1):
        users.append(build_admin(idx, admin))

    for offset, base in enumerate(NORMAL_USERS, start=1):
        idx = len(ADMINS) + offset
        users.append(build_normal_user(idx, base))

    output_path = Path(__file__).resolve().parent.parent.parent / "1carz_users.xlsx"
    wb = build_workbook(users)
    wb.save(output_path)
    print(f"[OK] Saved {len(users)} FAKE/TEST accounts to: {output_path}")
    print(f"     - {len(ADMINS)} admins (admin1..admin4)")
    print(f"     - {len(NORMAL_USERS)} normal users (user001..user040)")
    print("     - No real names used — generic labels only")
    print("     - Username will be replaced by the user during onboarding")
    return output_path


if __name__ == "__main__":
    main()
