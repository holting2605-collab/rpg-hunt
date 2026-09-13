"""Package the offline game without external dependencies or repository metadata."""
from pathlib import Path
import shutil
import zipfile

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'dist'
BUILD = OUT / 'RPG-Hunt-v0.6'
FILES = ['index.html', 'styles.css', 'game.js', 'data.js', 'v3data.js',
         'weapons.json', 'README.md', 'CHANGELOG.md', 'ARTWORK.md', 'ART_OVERHAUL_STATUS.md', 'BUILD_REPORT.txt', 'tools/art-manifest.json',
         'tools/art-overhaul/status.json', 'tools/art-overhaul/visual-review.json',
         'tools/art-overhaul/open-corrections.json',
         'START_RPG_HUNT.bat', 'START_RPG_HUNT.command', 'START_RPG_HUNT.sh']

def build():
    assets = [p for folder in ['assets', 'ui'] for p in (ROOT / folder).rglob('*') if p.is_file()]
    sources = [ROOT / name for name in FILES] + assets
    for source in sources:
        if not source.is_file():
            raise FileNotFoundError(source)
    BUILD.mkdir(parents=True, exist_ok=True)
    for source in sources:
        target = BUILD / source.relative_to(ROOT)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
    archive = OUT / 'RPG-Hunt-v0.6.zip'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as bundle:
        for source in sources:
            relative = source.relative_to(ROOT)
            bundle.write(BUILD / relative, Path(BUILD.name) / relative)
    with zipfile.ZipFile(archive) as bundle:
        assert bundle.testzip() is None
        assert len(bundle.namelist()) == len(sources)
    print(f'Build: {BUILD}\nZIP: {archive}\nFiles: {len(sources)}')

if __name__ == '__main__':
    build()
