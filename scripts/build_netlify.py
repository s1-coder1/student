import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "dist"


def main():
    OUTPUT.mkdir(exist_ok=True)
    shutil.copy2(ROOT / "index.html", OUTPUT / "index.html")
    shutil.copy2(ROOT / "app.js", OUTPUT / "app.js")
    (OUTPUT / "_redirects").unlink(missing_ok=True)
    print("Netlify frontend files prepared.")


if __name__ == "__main__":
    main()
