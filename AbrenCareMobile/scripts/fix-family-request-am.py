#!/usr/bin/env python3
"""Fix Ge'ez typos in the Amharic family landing/request blocks."""
from pathlib import Path
import re

PATH = Path(__file__).resolve().parents[1] / 'src' / 'i18n' / 'translations.ts'
text = PATH.read_text(encoding='utf-8')
am_start = text.find('export const am:')

# Known-good snippets already in the file.
behwala = re.search('\u1260\u128b\u120b', text[am_start:]).group(0)
medhanit = re.search('\u1218\u12f5\u1203\u1292\u1275', text[am_start:]).group(0)
active = re.search(r"active: '([^']+)'", text[am_start:]).group(1)
other = re.search(r"\bother: '([^']+)'", text[text.find('familyAdd: {', am_start) :]).group(1)

start = text.find('  familyLanding: {', am_start)
end = text.find('\n  executiveLanding:', start)
block = text[start:end]

fixes = [
    ('\u12ce\u12f3\u1305', '\u12c8\u12f3\u1305'),  # wodaj
    ('\u12a5\u1295\u12ce\u12eb\u12eb\u1208\u1295', '\u12a5\u1295\u12c8\u12eb\u12eb\u1208\u1295'),
    ('\u12ed\u12ce\u12eb\u12eb\u120d', '\u12ed\u12c8\u12eb\u12eb\u120d'),
    ('\u1321\u1242', '\u1325\u1242\u1275'),
    ('\u1235\u120d\u12ae', '\u1235\u120d\u12ad\u12ce'),
    ('\u1200\u1308\u122e', '\u1200\u1308\u122d\u12ce'),
    ('\u130d\u1295\u1299\u1295\u1275', '\u130d\u1295\u1299\u1290\u1275'),
    ('\u1325\u12eb\u1244 \u12ed\u120b\u12ad', '\u1325\u12eb\u1244 \u12ed\u120b\u12a9'),
    ('\u1261\u12d9\u121d', '\u1265\u12d9\u121d'),
    ('\u12a5\u1295\u1306', '\u12a5\u1295\u1302'),
    ('\u1260\u1291\u120b', behwala),
    ('\u12e8\u1320\u1293', '\u12e8\u1324\u1293'),
    ('\u1245\u1295\u133d\u1275', '\u1245\u1295\u1335\u1275'),
    ('\u12dd\u130d\u1305', '\u12dd\u130d\u1301'),
    ('\u12a5\u1293\u12d8\u130b\u1305\u1208\u1295', '\u12a5\u1293\u12d8\u130b\u1303\u1208\u1295'),
    ('\u1218\u12f5\u1293\u1292\u1275', medhanit),
    ("child: '\u120d\u1305 / \u12c8\u1295\u12f5'", "child: '\u120d\u1305'"),
    ("other: 'Other'", f"other: '{other}'"),
    (f"\u12a0\u1308\u120d\u130d\u120e\u1275 {active}\u1275", f"\u12a0\u1308\u120d\u130d\u120e\u1275 {active}"),
]

for old, new in fixes:
    if old not in block and 'Other' not in old:
        print('missing', old.encode('unicode_escape').decode())
        continue
    block = block.replace(old, new)

text = text[:start] + block + text[end:]
PATH.write_text(text, encoding='utf-8')
print('fixed am typos')
