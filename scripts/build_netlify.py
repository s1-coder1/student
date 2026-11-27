import os
import shutil
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "dist"


def main():
    backend_url = os.environ.get("RENDER_EXTERNAL_URL", "").strip().rstrip("/")
    parsed_url = urlparse(backend_url)
    if parsed_url.scheme != "https" or not parsed_url.netloc or parsed_url.path:
        raise ValueError(
            "RENDER_EXTERNAL_URL must be the HTTPS origin of the Render API service."
        )

    OUTPUT.mkdir(exist_ok=True)
    shutil.copy2(ROOT / "index.html", OUTPUT / "index.html")
    shutil.copy2(ROOT / "app.js", OUTPUT / "app.js")
    (OUTPUT / "_redirects").write_text(
        "/api/* {}/api/:splat 200\n".format(backend_url),
        encoding="utf-8",
    )
    print("Netlify files prepared with the Render API proxy.")


if __name__ == "__main__":
    main()
