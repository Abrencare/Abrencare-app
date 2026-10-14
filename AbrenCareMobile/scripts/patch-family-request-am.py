#!/usr/bin/env python3
"""ASCII-only Amharic patcher. Ge'ez is written with unicode escapes."""
from pathlib import Path
import re

PATH = Path(__file__).resolve().parents[1] / 'src' / 'i18n' / 'translations.ts'
text = PATH.read_text(encoding='utf-8')

am_start = text.find('export const am:')
if am_start < 0:
    raise SystemExit('am block missing')


def set_field(block: str, key: str, value: str) -> str:
    escaped = value.replace('\\', '\\\\').replace("'", "\\'")
    updated, count = re.subn(
        rf"(\b{key}:\s*')(?:\\'|[^'])*(')",
        rf"\1{escaped}\2",
        block,
        count=1,
    )
    if count != 1:
        raise SystemExit(f'could not set {key}')
    return updated


def insert_after(block: str, after_key: str, key: str, value: str) -> str:
    if re.search(rf"\b{key}:\s*'", block):
        return set_field(block, key, value)
    escaped = value.replace('\\', '\\\\').replace("'", "\\'")
    updated, count = re.subn(
        rf"({after_key}:\s*'(?:\\'|[^'])*',\n)",
        rf"\1    {key}: '{escaped}',\n",
        block,
        count=1,
    )
    if count != 1:
        raise SystemExit(f'could not insert {key}')
    return updated


landing = {
    'headline': (
        '\u1260\u12a2\u1275\u12ee\u1335\u12eb \u12eb\u1209\u1275 \u12e8\u12ce\u12f3\u1306\u127d\u12ce\u1295 '
        '\u12ed\u1295\u12a8\u1263\u12a8\u1261\u1363 \u1229\u1245 \u1262\u1296\u1229\u121d\u1362'
    ),
    'description': (
        '\u12e8\u1264\u1275 \u12a5\u1295\u12ad\u1265\u12ab\u1264 \u12ed\u1320\u12ed\u1241 '
        '\u12a5\u1293 \u12a8\u12a5\u12eb\u1295\u12f3\u1295\u12f1 \u1309\u1265\u129d\u1275 \u1260\u1291\u120b '
        '\u12dd\u1218\u1293 \u12ed\u1240\u1260\u1209\u1362 \u1218\u1300\u1218\u122a\u12eb \u12a8\u1264\u1270\u1230\u1265 '
        '\u130b\u122d \u12a5\u1295\u1290\u130b\u1308\u122b\u1208\u1295\u1363 \u12a8\u12da\u12eb \u12e8\u130d\u120d '
        '\u12e8\u12a5\u1295\u12ad\u1265\u12ab\u1264 \u12a5\u1245\u12f5 \u12a5\u1293\u12d8\u130b\u1305\u1208\u1295\u1362'
    ),
    'howSubtitle': (
        '\u12a5\u1295\u12ad\u1265\u12ab\u1264 \u12ed\u1320\u12ed\u1241\u1363 \u12a5\u1295\u1308\u1293\u129b\u1208\u1295\u1363 '
        '\u12a8\u12da\u12eb \u12e8\u130d\u120d \u12a5\u1245\u12f5 \u12a5\u1295\u12ab\u1348\u120b\u1208\u1295\u1362'
    ),
    'howCta': '\u12a5\u1295\u12f4\u1275 \u12a5\u1295\u12f0\u121a\u1230\u122b',
    'requestNote': (
        '\u12e8\u1205\u12dd\u1265 \u12cb\u130b \u12e8\u1208\u121d\u1362 \u1218\u1300\u1218\u122a\u12eb \u134d\u120b\u130e\u1275 '
        '\u12a5\u1295\u12ce\u12eb\u12eb\u1208\u1295 \u12a5\u1293 \u12e8\u130d\u120d \u12a5\u1245\u12f5 \u12a5\u1295\u12ab\u1348\u120b\u1208\u1295\u1362'
    ),
    'step1Title': '\u12a5\u1295\u12ad\u1265\u12ab\u1264 \u12ed\u1320\u12ed\u1241',
    'step1Body': (
        '\u1321\u1242 \u12dd\u122d\u12dd\u122e\u127d \u12ed\u1295\u1308\u1229\u1295\u1362 '
        '\u1218\u1208\u12eb \u12c8\u12ed\u121d \u12ad\u134d\u12eb \u12a0\u12eb\u1235\u1348\u120d\u130d\u121d\u1362'
    ),
    'step2Title': '\u12a5\u1295\u1308\u1293\u129b\u1208\u1295',
    'step2Body': (
        '\u12a0\u1235\u1270\u1263\u1263\u122a \u134d\u120b\u130e\u1275\u1363 \u1266\u1273 \u12a5\u1293 '
        '\u1270\u1308\u129d\u1290\u1275\u1295 \u12ed\u12ce\u12eb\u12eb\u120d\u1362'
    ),
    'step3Title': '\u12e8\u130d\u120d \u12e8\u12a5\u1295\u12ad\u1265\u12ab\u1264 \u12a5\u1245\u12f5',
    'step3Body': '\u12e8\u130d\u120d \u12a5\u1245\u12f5 \u1208\u1264\u1270\u1230\u1265\u12ce \u1265\u127b \u12a5\u1295\u12ab\u1348\u120b\u1208\u1295\u1362',
    'ctaTitle': '\u12a5\u1295\u12ad\u1265\u12ab\u1264 \u1208\u1218\u1320\u12e8\u1245 \u12dd\u130d\u1305 \u1290\u12ce\u1275?',
    'ctaBody': (
        '\u12e8\u1205\u12dd\u1265 \u12cb\u130b \u12e8\u1208\u121d\u1362 \u1218\u1300\u1218\u122a\u12eb \u134d\u120b\u130e\u1275 '
        '\u12a5\u1295\u12ce\u12eb\u12eb\u1208\u1295 \u12a5\u1293 \u12e8\u130d\u120d \u12a5\u1245\u12f5 \u12a5\u1295\u12ab\u1348\u120b\u1208\u1295\u1362'
    ),
    'createAccount': '\u12a5\u1295\u12ad\u1265\u12ab\u1264 \u12ed\u1320\u12ed\u1241',
}

request = {
    'noAccount': '\u1218\u1208\u12eb \u12a0\u12eb\u1235\u1348\u120d\u130d\u121d',
    'title': '\u1208\u12ce\u12f3\u1305\u12ce \u12a5\u1295\u12ad\u1265\u12ab\u1264 \u12ed\u1320\u12ed\u1241',
    'subtitle': (
        '\u1321\u1242 \u12dd\u122d\u12dd\u122e\u127d \u12ed\u1295\u1308\u1229\u1295\u1363 \u1261\u12f5\u1293\u127d\u1295 \u12eb\u1308\u129d\u12ce\u1273\u120d\u1362 '
        '\u1325\u12eb\u1244 \u1208\u1218\u120b\u12ad \u1218\u1208\u12eb \u12c8\u12ed\u121d \u12ad\u134d\u12eb \u12a0\u12eb\u1235\u1348\u120d\u130d\u121d\u1362'
    ),
    'name': '\u1235\u121d\u12ce',
    'namePlaceholder': '\u1208\u121d\u1233\u120c \u1233\u122b',
    'phone': 'WhatsApp \u12c8\u12ed\u121d \u1235\u120d\u12ae',
    'phonePlaceholder': '+46 ...',
    'country': '\u1200\u1308\u122e',
    'city': '\u12ce\u12f3\u1305\u12ce \u12e8\u1275 \u12ed\u1296\u122b\u1209?',
    'relationship': '\u12a8\u12ce\u12f3\u1305\u12ce \u130b\u122d \u12eb\u1208\u12ce\u1275 \u130d\u1295\u1299\u1295\u1275',
    'support': '\u121d\u1295 \u12d3\u12ed\u1290\u1275 \u12f5\u130b\u134d \u12ed\u1348\u120d\u130b\u1209?',
    'notes': '\u121b\u12c8\u1245 \u12eb\u1208\u1265\u1295 \u1290\u1308\u122d \u12a0\u1208? (\u12a0\u121b\u122b\u132d)',
    'notesPlaceholder': (
        '\u1208\u121d\u1233\u120c \u12a0\u1201\u1295 \u12eb\u1208\u12cd \u1201\u1294\u1273\u1363 '
        '\u12e8\u1218\u1296\u122a\u12eb \u1201\u1294\u1273\u1363 \u120d\u12e9 \u134d\u120b\u130e\u1276\u127d...'
    ),
    'consent': (
        '\u1235\u1208\u12da\u1205 \u1325\u12eb\u1244 \u12a5\u1295\u12f5\u1295\u1308\u1293\u129d \u1270\u1235\u121b\u121d\u127b\u1208\u1201\u1362 '
        '\u12a5\u1263\u12ad\u12ce \u1219\u1209 \u12e8\u1215\u12ad\u121d\u1293 \u1218\u12dd\u1308\u1265 \u1260\u12da\u1205 \u1245\u133d \u12cd\u1235\u1325 \u12a0\u12eb\u1235\u1308\u1261\u1362'
    ),
    'send': '\u1325\u12eb\u1244 \u12ed\u120b\u12ad',
    'demoNote': '\u12e8\u121b\u1233\u12eb \u1245\u133d \u1265\u127b\u1362 \u1218\u1228\u1303 \u1260\u12a5\u12cd\u1290\u1275 \u12a0\u12ed\u120b\u12ad\u121d\u1362',
    'receivedTitle': '\u1325\u12eb\u1244\u12ce \u12f0\u122d\u1236\u1293\u120d',
    'receivedBody': (
        '\u12a5\u1293\u1218\u1230\u130d\u1293\u1208\u1295\u1362 \u12e8\u12a5\u1295\u12ad\u1265\u12ab\u1264 \u12a0\u1235\u1270\u1263\u1263\u122a '
        '\u1261\u12d9\u121d \u1233\u12ed\u1246\u12ed \u12e8\u1264\u1270\u1230\u1265\u12ce\u1295 \u134d\u120b\u130e\u1275 \u1208\u1218\u1228\u12f3\u1275 \u12eb\u1308\u129d\u12ce\u1273\u120d\u1362'
    ),
    'statusKicker': '\u12a0\u1201\u1295 \u12eb\u1208\u12cd \u1201\u1294\u1273',
    'statusTitle': '\u1261\u12f5\u1293\u127d\u1295 \u12a5\u1295\u12f2\u12eb\u1308\u129d\u12ce \u12a5\u12e8\u1320\u1260\u1245\u1295 \u1290\u12cd',
    'statusBody': '\u12e8\u12a5\u1295\u12ad\u1265\u12ab\u1264 \u12a5\u1245\u12f5 \u12a0\u120d\u1270\u1300\u1218\u1228\u121d\u1363 \u12ad\u134d\u12eb\u121d \u12e8\u1208\u121d\u1362',
    'nextTitle': '\u1240\u1323\u12e9 \u121d\u1295\u12f5\u1295 \u1290\u12cd?',
    'next1': '\u12a5\u1295\u1308\u1293\u129b\u1208\u1295\u1362',
    'next2': '\u134d\u120b\u130e\u1275 \u12a5\u1293 \u1266\u1273 \u12a5\u1295\u12ce\u12eb\u12eb\u1208\u1295\u1362',
    'next3': '\u12e8\u12a0\u1308\u120d\u130d\u120e\u1275 \u1270\u1308\u129d\u1290\u1275 \u12a5\u1293\u1228\u130b\u130d\u1323\u1208\u1295\u1362',
    'next4': '\u12e8\u130d\u120d \u12e8\u12a5\u1295\u12ad\u1265\u12ab\u1264 \u1203\u1233\u1265 \u12a5\u1295\u12ab\u1348\u120b\u1208\u1295\u1362',
    'backFamily': '\u12c8\u12f0 \u12e8\u1264\u1270\u1230\u1265 \u12a5\u1295\u12ad\u1265\u12ab\u1264 \u1270\u1218\u1208\u1235',
    'seePlan': '\u12e8\u1293\u1219\u1293 \u12e8\u12a5\u1295\u12ad\u1265\u12ab\u1264 \u12a5\u1245\u12f5 \u12ed\u1218\u120d\u12a8\u1271',
    'proposalNote': '\u12e8\u12a5\u1295\u12ad\u1265\u12ab\u1264 \u1203\u1233\u1265 \u1260\u130d\u120d \u12a5\u1295\u1306 \u1260\u1205\u12dd\u1265 \u12a0\u12ed\u130b\u122b\u121d\u1362',
    'planKicker': '\u12e8\u12a5\u1295\u12ad\u1265\u12ab\u1264 \u12a5\u1245\u12f5 \u1201\u1294\u1273',
    'private': '\u12e8\u130d\u120d',
    'planTitle': '\u12e8\u12a5\u1295\u12ad\u1265\u12ab\u1264 \u12a5\u1245\u12f5\u12ce \u12dd\u130d\u1301 \u1290\u12cd',
    'planSubtitle': (
        '\u12a8\u1261\u12f5\u1293\u127d\u1295 \u130b\u122d \u12a8\u1270\u1290\u130b\u1308\u122d\u1295 \u1260\u1291\u120b \u1270\u12d8\u130b\u1305\u1277\u120d\u1362 '
        '\u1208\u1264\u1270\u1230\u1265\u12ce \u1260\u130d\u120d \u12ed\u130b\u122b\u120d\u1362'
    ),
    'stepRequest': '\u1325\u12eb\u1244 \u12f0\u122d\u1237\u120d',
    'stepCall': '\u12e8\u1264\u1270\u1230\u1265 \u1325\u122a \u1270\u1320\u1293\u1241\u12cb\u120d',
    'stepShared': '\u12a5\u1245\u12f5 \u1270\u130b\u122d\u1277\u120d',
    'stepActive': '\u12a0\u1308\u120d\u130d\u120e\u1275 \u1295\u1241\u1275',
    'summaryTitle': '\u12e8\u12a5\u1245\u12f5 \u121b\u1320\u1243\u1208\u12eb',
    'summary1': '\u12e8\u1273\u1240\u12f1 \u12e8\u1264\u1275 \u1309\u1265\u129d\u1276\u127d',
    'summary2': '\u1260\u1309\u1265\u129d\u1275 \u130a\u12dc \u1218\u1230\u1228\u1273\u12ca \u12e8\u1320\u1293 \u121d\u122d\u1218\u122b\u12ce\u127d',
    'summary3': '\u12e8\u1309\u1265\u129d\u1275 \u121b\u1320\u1243\u1208\u12eb\u12ce\u127d \u12a5\u1293 \u12e8\u12ad\u1275\u1275\u120d \u121b\u1235\u1273\u12c8\u123b\u12ce\u127d',
    'summary4': '\u1260\u1270\u1235\u121b\u121b\u12cd \u1230\u12d3\u1275 \u12e8\u12a5\u1295\u12ad\u1265\u12ab\u1264 \u1245\u1295\u133d\u1275',
    'pricingTitle': '\u12e8\u12cb\u130b \u1218\u1228\u1303',
    'pricingBody': (
        '\u12cb\u130b \u12a8\u121d\u12ad\u12ad\u122d \u1260\u1291\u120b \u1260\u130d\u120d \u12ed\u130b\u122b\u120d\u1362 '
        '\u12e8\u1218\u1328\u1228\u123b\u12cd \u12cb\u130b \u1260\u134d\u120b\u130e\u1275\u1363 \u1266\u1273\u1363 \u12f5\u130d\u130d\u121e\u123d \u12a5\u1293 \u12a0\u1308\u120d\u130d\u120e\u1276\u127d \u12ed\u12c8\u1230\u1293\u120d\u1362'
    ),
    'accept': '\u12e8\u12a5\u1295\u12ad\u1265\u12ab\u1264 \u12a5\u1245\u12f5 \u12ed\u1240\u1260\u1209',
    'ask': '\u1325\u12eb\u1244 \u12ed\u1320\u12ed\u1241',
    'extrasNote': (
        '\u12e8\u120b\u1265\u122b\u1276\u122a \u121d\u122d\u1218\u122b\u12ce\u127d\u1363 \u12e8\u1210\u12aa\u121d \u1240\u1320\u122e \u12c8\u12ed\u121d \u1270\u1328\u121b\u122a \u1309\u1265\u129d\u1275 '
        '\u1260\u1218\u1328\u1228\u123b\u12cd \u12a5\u1245\u12f5 \u12a8\u1270\u133d\u1349 \u1265\u127b \u12ed\u12ab\u1270\u1273\u1209\u1362'
    ),
    'askedTitle': '\u1325\u12eb\u1244 \u1270\u120d\u12ae\u12cb\u120d',
    'askedBody': (
        '\u12a0\u1235\u1270\u1263\u1263\u122a \u1260\u130d\u120d \u12ed\u1218\u120d\u1233\u120d\u1362 '
        '\u12ed\u1205 \u121b\u1233\u12eb \u1290\u12cd \u2014 \u1218\u120d\u12a5\u12ad\u1275 \u1260\u12a5\u12cd\u1290\u1275 \u12a0\u12ed\u120b\u12ad\u121d\u1362'
    ),
}

nested = {
    'addis': '\u12a0\u12f2\u1235 \u12a0\u1260\u1263',
    'direDawa': '\u12f5\u122c \u12f3\u12cb',
    'hawassa': '\u1210\u12cb\u1233',
    'bahirDar': '\u1263\u1215\u122d \u12f3\u122d',
    'mekelle': '\u1218\u1240\u120c',
    'gondar': '\u130e\u1295\u12f0\u122d',
    'other': '\u120c\u120b \u12a8\u1270\u121b \u1260\u12a2\u1275\u12ee\u1335\u12eb',
    'child': '\u120d\u1305 / \u12c8\u1295\u12f5',
    'spouse': '\u1275\u12f3\u122d',
    'sibling': '\u12c8\u1295\u12f5\u121d / \u12a5\u1205\u1275',
    'grandchild': '\u12e8\u120d\u1305 \u120d\u1305',
    'relative': '\u12d8\u1218\u12f5',
    'unsure': '\u12a5\u122d\u130d\u1320\u129b \u12a0\u12ed\u12f0\u1208\u1201\u121d\u1363 \u12a5\u1263\u12ad\u12ce \u12ed\u121d\u1229\u129d',
    'visits': '\u12e8\u1264\u1275 \u1309\u1265\u129d\u1276\u127d',
    'vitals': '\u1260\u1309\u1265\u129d\u1275 \u130a\u12dc \u12e8\u1320\u1293 \u121d\u122d\u1218\u122b',
    'medication': '\u12e8\u1218\u12f5\u1293\u1292\u1275 \u12f5\u130b\u134d',
    'labs': '\u12e8\u120b\u1265\u122b\u1276\u122a \u121d\u122d\u1218\u122b',
    'doctor': '\u12e8\u1210\u12aa\u121d \u1245\u1295\u133d\u1275',
}

en_req_match = re.search(
    r'  familyRequest: \{.*?\n  \},\n  executiveLanding:',
    text[:am_start],
    re.S,
)
if not en_req_match:
    raise SystemExit('en familyRequest missing')
am_req = en_req_match.group(0)

for key, value in request.items():
    escaped = value.replace('\\', '\\\\').replace("'", "\\'")
    am_req, count = re.subn(
        rf"(\b{key}:\s*')(?:\\'|[^'])*(')",
        rf"\1{escaped}\2",
        am_req,
        count=1,
    )
    if count != 1:
        raise SystemExit(f'failed to replace {key}')

for key, value in nested.items():
    escaped = value.replace('\\', '\\\\').replace("'", "\\'")
    am_req, count = re.subn(
        rf"(\b{key}:\s*')(?:\\'|[^'])*(')",
        rf"\1{escaped}\2",
        am_req,
        count=1,
    )
    if count != 1:
        raise SystemExit(f'failed nested {key}')

if 'familyRequest:' not in text[am_start:]:
    pos = text.find('\n  executiveLanding:', am_start)
    if pos < 0:
        raise SystemExit('am executiveLanding missing')
    text = text[:pos] + '\n' + am_req.replace('  executiveLanding:', '').rstrip() + '\n' + text[pos:]

am_landing_start = text.find('  familyLanding: {', am_start)
am_landing_end = text.find('\n  familyRequest:', am_landing_start)
if am_landing_end < 0:
    am_landing_end = text.find('\n  executiveLanding:', am_landing_start)
block = text[am_landing_start:am_landing_end]
block = insert_after(block, 'howTitle', 'howCta', landing['howCta'])
block = insert_after(block, 'howCta', 'requestNote', landing['requestNote'])
for key, value in landing.items():
    if key in ('howCta', 'requestNote'):
        continue
    block = set_field(block, key, value)
text = text[:am_landing_start] + block + text[am_landing_end:]

manifesto_start = text.find('  familyManifesto: {', am_start)
manifesto_end = text.find('\n  familyAdd:', manifesto_start)
manifesto = set_field(
    text[manifesto_start:manifesto_end],
    'cta',
    '\u12a5\u1295\u12ad\u1265\u12ab\u1264 \u12ed\u1320\u12ed\u1241',
)
text = text[:manifesto_start] + manifesto + text[manifesto_end:]

PATH.write_text(text, encoding='utf-8')
print('patched family request Amharic')
print('familyRequest am', text[am_start:].count('familyRequest:'))
print('howCta am', 'howCta:' in text[text.find('  familyLanding: {', am_start):])
