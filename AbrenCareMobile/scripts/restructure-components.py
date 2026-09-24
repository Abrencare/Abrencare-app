from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1] / "src" / "components"

MOVES = [
    # screens
    ("Home", "screens/Home"),
    ("AlertsScreen", "screens/AlertsScreen"),
    ("ConsultationScreen", "screens/ConsultationScreen"),
    ("HealthScreen", "screens/HealthScreen"),
    ("ProfileScreen", "screens/ProfileScreen"),
    ("SettingsScreen", "screens/SettingsScreen"),
    ("SectionPage.tsx", "screens/SectionPage.tsx"),
    # cards
    ("ServiceCard", "cards/ServiceCard"),
    ("HeroCard", "cards/HeroCard"),
    ("DoctorCard", "cards/DoctorCard"),
    ("HealthCard", "cards/HealthCard"),
    ("MetricCard", "cards/MetricCard"),
    ("Card", "cards/Card"),
    ("card.tsx", "cards/card.tsx"),
    # navigation
    ("Header", "navigation/Header"),
    ("BottomNavigation", "navigation/BottomNavigation"),
    ("app-tabs.tsx", "navigation/app-tabs.tsx"),
    ("app-tabs.web.tsx", "navigation/app-tabs.web.tsx"),
    # ui
    ("Avatar", "ui/Avatar"),
    ("Button", "ui/Button"),
    ("button.tsx", "ui/button.tsx"),
    ("Input", "ui/Input"),
    ("input.tsx", "ui/input.tsx"),
    ("PrimaryButton", "ui/PrimaryButton"),
    ("StatusBadge", "ui/StatusBadge"),
    ("StatusBadgeLegacy", "ui/StatusBadgeLegacy"),
    ("SectionTitle", "ui/SectionTitle"),
    ("InfoChip", "ui/InfoChip"),
    ("ReadingRow", "ui/ReadingRow"),
    ("LanguageToggle.tsx", "ui/LanguageToggle.tsx"),
    ("hint-row.tsx", "ui/hint-row.tsx"),
    ("themed-text.tsx", "ui/themed-text.tsx"),
    ("themed-view.tsx", "ui/themed-view.tsx"),
    ("web-badge.tsx", "ui/web-badge.tsx"),
    ("animated-icon.tsx", "ui/animated-icon.tsx"),
    ("animated-icon.web.tsx", "ui/animated-icon.web.tsx"),
    ("animated-icon.module.css", "ui/animated-icon.module.css"),
    # gates
    ("ServiceAccessGate.tsx", "gates/ServiceAccessGate.tsx"),
    ("ServiceAuthGate.tsx", "gates/ServiceAuthGate.tsx"),
    ("Replace.tsx", "gates/Replace.tsx"),
    # watchers
    ("ReminderWatcher.tsx", "watchers/ReminderWatcher.tsx"),
]

IMPORT_REPLACEMENTS = [
    ("@/components/Header/Header", "@/components/navigation/Header/Header"),
    ("@/components/HeroCard/HeroCard", "@/components/cards/HeroCard/HeroCard"),
    ("@/components/ServiceCard/ServiceCard", "@/components/cards/ServiceCard/ServiceCard"),
    ("@/components/BottomNavigation/BottomNavigation", "@/components/navigation/BottomNavigation/BottomNavigation"),
    ("@/components/Home", "@/components/screens/Home"),
    ("@/components/Replace", "@/components/gates/Replace"),
    ("@/components/ServiceAccessGate", "@/components/gates/ServiceAccessGate"),
    ("@/components/ServiceAuthGate", "@/components/gates/ServiceAuthGate"),
    ("@/components/animated-icon", "@/components/ui/animated-icon"),
    ("@/components/ReminderWatcher", "@/components/watchers/ReminderWatcher"),
    ("@/components/themed-text", "@/components/ui/themed-text"),
    ("@/components/themed-view", "@/components/ui/themed-view"),
    ("@/components/app-tabs", "@/components/navigation/app-tabs"),
]

FILE_LOCAL_REPLACEMENTS = {
    "cards/card.tsx": [
        ("from './themed-text'", "from '@/components/ui/themed-text'"),
        ("from './themed-view'", "from '@/components/ui/themed-view'"),
    ],
    "ui/input.tsx": [
        ("from './themed-text'", "from '@/components/ui/themed-text'"),
        ("from './themed-view'", "from '@/components/ui/themed-view'"),
    ],
    "ui/hint-row.tsx": [
        ("from './themed-text'", "from '@/components/ui/themed-text'"),
        ("from './themed-view'", "from '@/components/ui/themed-view'"),
    ],
    "ui/button.tsx": [
        ("from './themed-text'", "from '@/components/ui/themed-text'"),
    ],
    "ui/web-badge.tsx": [
        ("from './themed-text'", "from '@/components/ui/themed-text'"),
        ("from './themed-view'", "from '@/components/ui/themed-view'"),
    ],
}


def move_path(src_rel: str, dest_rel: str) -> None:
    src = ROOT / src_rel
    dest = ROOT / dest_rel
    if not src.exists():
        print(f"skip missing {src_rel}")
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        print(f"skip exists {dest_rel}")
        return
    shutil.move(str(src), str(dest))
    print(f"moved {src_rel} -> {dest_rel}")


def rewrite(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    original = text
    try:
        rel = str(path.relative_to(ROOT)).replace("\\", "/")
    except ValueError:
        rel = ""
    for old, new in FILE_LOCAL_REPLACEMENTS.get(rel, []):
        text = text.replace(old, new)
    for old, new in IMPORT_REPLACEMENTS:
        text = text.replace(old, new)
    if text != original:
        path.write_text(text, encoding="utf-8")
        print(f"updated {path}")


def main() -> None:
    for src, dest in MOVES:
        move_path(src, dest)

    src_root = ROOT.parent
    for path in src_root.rglob("*"):
        if path.suffix in {".ts", ".tsx"}:
            rewrite(path)


if __name__ == "__main__":
    main()
