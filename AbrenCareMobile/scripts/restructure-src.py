from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1] / "src"

MOVES = [
    ("auth/parseService.ts", "service/parseService.ts"),
    ("auth/serviceTheme.ts", "service/serviceTheme.ts"),
    ("auth/types.ts", "types/auth.ts"),
    ("auth/AuthContext.tsx", "context/AuthContext.tsx"),
    ("family/AppointmentsContext.tsx", "context/AppointmentsContext.tsx"),
    ("consultation/ConsultationContext.tsx", "context/ConsultationContext.tsx"),
    ("i18n/LanguageContext.tsx", "context/LanguageContext.tsx"),
    ("consultation/doctors.ts", "data/doctors.ts"),
    ("executive/weeklyReport.ts", "data/weeklyReport.ts"),
    ("models/User.ts", "data/User.ts"),
    ("models/Patient.ts", "data/Patient.ts"),
    ("models/HealthRecord.ts", "data/HealthRecord.ts"),
    ("models/Consultation.ts", "data/Consultation.ts"),
    ("models/Alert.ts", "data/Alert.ts"),
    ("lib/storage.ts", "utilities/storage.ts"),
    ("family/format.ts", "utilities/familyFormat.ts"),
    ("consultation/format.ts", "utilities/consultationFormat.ts"),
    ("components/auth/AuthField.tsx", "auth/AuthField.tsx"),
    ("components/auth/AuthNav.tsx", "auth/AuthNav.tsx"),
    ("components/auth/AuthScaffold.tsx", "auth/AuthScaffold.tsx"),
    ("components/auth/MedicalDecor.tsx", "auth/MedicalDecor.tsx"),
    ("components/auth/ServiceIntro.tsx", "auth/ServiceIntro.tsx"),
    ("components/auth/ExecutiveLanding.tsx", "auth/ExecutiveLanding.tsx"),
    ("app/(auth)/login.tsx", "auth/login.tsx"),
    ("app/(auth)/signup.tsx", "auth/signup.tsx"),
    ("app/(auth)/family-setup.tsx", "auth/family-setup.tsx"),
    ("app/(auth)/consultation-profile.tsx", "auth/consultation-profile.tsx"),
    ("app/(auth)/executive-profile.tsx", "auth/executive-profile.tsx"),
    ("app/(auth)/executive-monitor.tsx", "auth/executive-monitor.tsx"),
    ("app/(auth)/executive-ready.tsx", "auth/executive-ready.tsx"),
    ("family/ReminderWatcher.tsx", "components/ReminderWatcher.tsx"),
    ("Header", "components/Header"),
    ("HeroCard", "components/HeroCard"),
    ("BottomNavigation", "components/BottomNavigation"),
    ("DoctorCard", "components/DoctorCard"),
    ("ReadingRow", "components/ReadingRow"),
    ("PrimaryButton", "components/PrimaryButton"),
    ("MetricCard", "components/MetricCard"),
    ("InfoChip", "components/InfoChip"),
    ("screens/ServiceCard", "components/ServiceCard"),
    ("screens/Home", "components/Home"),
    ("screens/Consultation", "components/ConsultationScreen"),
    ("screens/Alerts", "components/AlertsScreen"),
    ("screens/Health", "components/HealthScreen"),
    ("screens/Settings", "components/SettingsScreen"),
    ("screens/Profile", "components/ProfileScreen"),
]

ROUTE_REEXPORTS = {
    "app/(auth)/login.tsx": "@/auth/login",
    "app/(auth)/signup.tsx": "@/auth/signup",
    "app/(auth)/family-setup.tsx": "@/auth/family-setup",
    "app/(auth)/consultation-profile.tsx": "@/auth/consultation-profile",
    "app/(auth)/executive-profile.tsx": "@/auth/executive-profile",
    "app/(auth)/executive-monitor.tsx": "@/auth/executive-monitor",
    "app/(auth)/executive-ready.tsx": "@/auth/executive-ready",
    "app/(auth)/service.tsx": "@/auth/ServiceIntro",
}

IMPORT_REPLACEMENTS = [
    ("@/auth/AuthContext", "@/context/AuthContext"),
    ("@/auth/parseService", "@/service/parseService"),
    ("@/auth/serviceTheme", "@/service/serviceTheme"),
    ("@/auth/types", "@/types/auth"),
    ("@/family/AppointmentsContext", "@/context/AppointmentsContext"),
    ("@/consultation/ConsultationContext", "@/context/ConsultationContext"),
    ("@/i18n/LanguageContext", "@/context/LanguageContext"),
    ("@/lib/storage", "@/utilities/storage"),
    ("@/family/format", "@/utilities/familyFormat"),
    ("@/consultation/format", "@/utilities/consultationFormat"),
    ("@/consultation/doctors", "@/data/doctors"),
    ("@/executive/weeklyReport", "@/data/weeklyReport"),
    ("@/family/ReminderWatcher", "@/components/ReminderWatcher"),
    ("@/components/auth/ServiceIntro", "@/auth/ServiceIntro"),
    ("@/components/auth/ExecutiveLanding", "@/auth/ExecutiveLanding"),
    ("@/components/auth/AuthField", "@/auth/AuthField"),
    ("@/components/auth/AuthNav", "@/auth/AuthNav"),
    ("@/components/auth/AuthScaffold", "@/auth/AuthScaffold"),
    ("@/components/auth/MedicalDecor", "@/auth/MedicalDecor"),
    ("@/Header/Header", "@/components/Header/Header"),
    ("@/HeroCard/HeroCard", "@/components/HeroCard/HeroCard"),
    ("@/BottomNavigation/BottomNavigation", "@/components/BottomNavigation/BottomNavigation"),
    ("@/DoctorCard/DoctorCard", "@/components/DoctorCard/DoctorCard"),
    ("@/screens/ServiceCard/ServiceCard", "@/components/ServiceCard/ServiceCard"),
    ("@/screens/Home", "@/components/Home"),
    ("@/screens/Consultation", "@/components/ConsultationScreen"),
    ("@/screens/Alerts", "@/components/AlertsScreen"),
    ("@/screens/Health", "@/components/HealthScreen"),
    ("@/screens/Settings", "@/components/SettingsScreen"),
    ("@/screens/Profile", "@/components/ProfileScreen"),
]

FILE_LOCAL_REPLACEMENTS = {
    "context/AuthContext.tsx": [
        ("from './serviceTheme'", "from '@/service/serviceTheme'"),
        ("from './types'", "from '@/types/auth'"),
    ],
    "context/LanguageContext.tsx": [
        ("from './translations'", "from '@/i18n/translations'"),
    ],
    "components/ReminderWatcher.tsx": [
        ("from './AppointmentsContext'", "from '@/context/AppointmentsContext'"),
        ("from './format'", "from '@/utilities/familyFormat'"),
    ],
    "service/parseService.ts": [
        ("from './types'", "from '@/types/auth'"),
    ],
    "service/serviceTheme.ts": [
        ("from './types'", "from '@/types/auth'"),
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


def rewrite_imports(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    original = text
    rel = str(path.relative_to(ROOT)).replace("\\", "/")
    for old, new in FILE_LOCAL_REPLACEMENTS.get(rel, []):
        text = text.replace(old, new)
    for old, new in IMPORT_REPLACEMENTS:
        text = text.replace(old, new)
    if text != original:
        path.write_text(text, encoding="utf-8")
        print(f"updated imports {rel}")


def write_reexport(rel: str, target: str) -> None:
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"export {{ default }} from '{target}';\n", encoding="utf-8")
    print(f"route {rel} -> {target}")


def remove_empty_dirs() -> None:
    for folder in sorted(ROOT.rglob("*"), reverse=True):
        if folder.is_dir() and not any(folder.iterdir()):
            folder.rmdir()
            print(f"removed empty {folder.relative_to(ROOT)}")


def main() -> None:
    for src, dest in MOVES:
        move_path(src, dest)

    for rel, target in ROUTE_REEXPORTS.items():
        write_reexport(rel, target)

    for path in ROOT.rglob("*"):
        if path.suffix in {".ts", ".tsx"}:
            rewrite_imports(path)

    remove_empty_dirs()


if __name__ == "__main__":
    main()
