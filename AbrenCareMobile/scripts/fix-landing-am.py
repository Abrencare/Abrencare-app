from pathlib import Path

path = Path("/Users/melattilahun/Desktop/App/AbrenCare-App/AbrenCareMobile/src/i18n/translations.ts")
text = path.read_text(encoding="utf-8")
am_start = text.find("export const am")
start = text.find("  executiveLanding: {", am_start)
end = text.find("\n  consultationSignup: {", start)
block = text[start:end]

if "includedTitle:" not in block:
    needle = "    includedSubtitle:"
    insert = "    includedTitle: '\u121d\u1295 \u12ed\u12ab\u1270\u1273\u120d?',\n    includedSubtitle:"
    # use the already-good Amharic title from earlier parse by reconstructing from file later
    block = block.replace(needle, "    includedTitle: 'WHAT_INCLUDED',\n    includedSubtitle:", 1)

block = block.replace(
    "    howSubtitle: 'Simple steps to keep your health on track.',",
    "    howSubtitle: 'HOW_SUB',",
    1,
)
block = block.replace(
    "    step2Body: 'Our team arranges tests, screenings and physician consultations.',",
    "    step2Body: 'STEP2_BODY',",
    1,
)
if "whyBody:" not in block:
    block = block.replace(
        "    whyTitle:",
        "    whyBody: 'WHY_BODY',\n    whyTitle:",
        1,
    )

# Fill placeholders from nearby good Amharic already in the block if present
# includedTitle: copy from a dedicated assignment below
replacements = {
    "WHAT_INCLUDED": "\u121d\u1295 \u12ed\u12ab\u1270\u1273\u120d?",
    "HOW_SUB": "\u130d\u1293\u12ce\u1295 \u1260\u1275\u12ad\u12ad\u1208\u129b \u1218\u1295\u1308\u12f5 \u1208\u121b\u1235\u1240\u1320\u120d \u1240\u120b\u120d \u12a5\u122d\u121d\u1303\u12ce\u127d\u1362",
    "STEP2_BODY": "\u1261\u12f5\u1293\u127d\u1295 \u121d\u122d\u1218\u122b\u12ce\u127d\u1295\u1363 \u1235\u12ad\u122a\u1292\u1295\u130d \u12a5\u1293 \u12e8\u1213\u12aa\u121d \u121d\u12ad\u12ad\u122d \u12eb\u12d8\u130b\u1303\u120d\u1362",
    "WHY_BODY": "\u130d\u1293\u12ce \u1260\u120d\u121d\u12f5 \u1263\u120b\u1278\u12cd \u1263\u1208\u1219\u12eb\u12ce\u127d \u12a5\u1293 \u1260\u12a2\u1275\u12ee\u1335\u12eb \u1260\u1270\u1218\u12f0\u1260 \u12e8\u12a5\u1295\u12ad\u1265\u12ab\u1264 \u1261\u12f5\u1295 \u12a5\u1305 \u1290\u12cd\u1362",
}

for key, value in replacements.items():
    block = block.replace(key, value)

path.write_text(text[:start] + block + text[end:], encoding="utf-8")
print(block)
print("bad", block.count("\ufffd"))
