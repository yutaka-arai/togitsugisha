#!/usr/bin/env python3
"""Verify published ukiyoe assets, optionally against local source images.

The default mode uses only the Python standard library and is safe to run
from a clean clone. The optional --with-source mode imports Pillow lazily
and requires the private, gitignored source-images/ directory. Neither mode
changes source or published files.
"""
from hashlib import sha256
from pathlib import Path
import argparse
import json
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_CHECKS = [
    {"id": "ukiyoe-004-main", "item_id": "ukiyoe-004", "published": ROOT / "assets/images/items/ukiyoe-004-main.webp", "size": (844, 1500), "detail_page": ROOT / "items/ukiyoe-004/index.html", "detail_reference": "../../assets/images/items/ukiyoe-004-main.webp"},
    {"id": "ukiyoe-004-thumb", "item_id": "ukiyoe-004", "published": ROOT / "assets/images/items/ukiyoe-004-thumb.webp", "size": (450, 800), "item_thumb_reference": "../assets/images/items/ukiyoe-004-thumb.webp"},
    {"id": "ukiyoe-005-main", "item_id": "ukiyoe-005", "published": ROOT / "assets/images/items/ukiyoe-005-main.webp", "size": (844, 1500), "detail_page": ROOT / "items/ukiyoe-005/index.html", "detail_reference": "../../assets/images/items/ukiyoe-005-main.webp"},
    {"id": "ukiyoe-005-thumb", "item_id": "ukiyoe-005", "published": ROOT / "assets/images/items/ukiyoe-005-thumb.webp", "size": (450, 800), "item_thumb_reference": "../assets/images/items/ukiyoe-005-thumb.webp"},
]
SOURCE_CHECKS = [
    {"id": "ukiyoe-004-main", "source": ROOT / "source-images/S__27377680.jpg", "source_sha256": "ceb21b8bb152209920a87805763ec5bb39ea1892bb31bd4a1ed584f096a8192c", "angle": 0, "size": (844, 1500), "published": ROOT / "assets/images/items/ukiyoe-004-main.webp"},
    {"id": "ukiyoe-004-thumb", "source": ROOT / "source-images/S__27377680.jpg", "source_sha256": "ceb21b8bb152209920a87805763ec5bb39ea1892bb31bd4a1ed584f096a8192c", "angle": 0, "size": (450, 800), "published": ROOT / "assets/images/items/ukiyoe-004-thumb.webp"},
    {"id": "ukiyoe-005-main", "source": ROOT / "source-images/S__27377681.jpg", "source_sha256": "c4d5de9430eb6bc25e27e26ffb40992fadab5374b255a8872f0e31797df98556", "angle": 90, "size": (844, 1500), "published": ROOT / "assets/images/items/ukiyoe-005-main.webp"},
    {"id": "ukiyoe-005-thumb", "source": ROOT / "source-images/S__27377681.jpg", "source_sha256": "c4d5de9430eb6bc25e27e26ffb40992fadab5374b255a8872f0e31797df98556", "angle": 90, "size": (450, 800), "published": ROOT / "assets/images/items/ukiyoe-005-thumb.webp"},
]

def digest(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest()

def webp_size(path: Path) -> tuple[int, int]:
    data = path.read_bytes()
    if len(data) < 16 or data[0:4] != b"RIFF" or data[8:12] != b"WEBP":
        raise AssertionError(f"{path}: not a RIFF WebP file")
    offset = 12
    while offset + 8 <= len(data):
        chunk = data[offset:offset + 4]
        size = int.from_bytes(data[offset + 4:offset + 8], "little")
        payload = data[offset + 8:offset + 8 + size]
        if len(payload) != size:
            raise AssertionError(f"{path}: truncated WebP chunk")
        if chunk == b"VP8X" and len(payload) >= 10:
            return (1 + int.from_bytes(payload[4:7], "little"), 1 + int.from_bytes(payload[7:10], "little"))
        if chunk == b"VP8 ":
            marker = payload.find(b"\x9d\x01\x2a")
            if marker >= 0 and marker + 7 <= len(payload):
                width = int.from_bytes(payload[marker + 3:marker + 5], "little") & 0x3FFF
                height = int.from_bytes(payload[marker + 5:marker + 7], "little") & 0x3FFF
                return (width, height)
        if chunk == b"VP8L" and len(payload) >= 5 and payload[0] == 0x2F:
            width = 1 + ((payload[1] | payload[2] << 8) & 0x3FFF)
            height = 1 + (((payload[2] >> 6) | (payload[3] << 2) | (payload[4] << 10)) & 0x3FFF)
            return (width, height)
        offset += 8 + size + (size & 1)
    raise AssertionError(f"{path}: unsupported or missing WebP dimension chunk")

def transformed(source: Path, angle: int, size: tuple[int, int], destination: Path) -> None:
    try:
        from PIL import Image
    except ModuleNotFoundError as error:
        raise RuntimeError("Pillow is required only for --with-source mode") from error
    image = Image.open(source).convert("RGB")
    if angle:
        image = image.rotate(angle, expand=True)
    image.resize(size, Image.Resampling.LANCZOS).save(destination, "WEBP", quality=88, method=6)

def verify_public_assets() -> list[dict]:
    items = {item["id"]: item for item in json.loads((ROOT / "data/items.json").read_text(encoding="utf-8"))}
    results = []
    for check in PUBLIC_CHECKS:
        item = items.get(check["item_id"])
        if item is None:
            raise AssertionError(f"{check['id']}: missing item ID {check['item_id']}")
        published = check["published"]
        if not published.is_file():
            raise AssertionError(f"{check['id']}: missing published asset {published}")
        actual_size = webp_size(published)
        if actual_size != check["size"]:
            raise AssertionError(f"{check['id']}: size is {actual_size}, expected {check['size']}")
        if "item_thumb_reference" in check and item.get("thumb") != check["item_thumb_reference"]:
            raise AssertionError(f"{check['id']}: item thumb path does not match")
        if "detail_page" in check and check["detail_reference"] not in check["detail_page"].read_text(encoding="utf-8"):
            raise AssertionError(f"{check['id']}: detail page image path does not match")
        results.append({"id": check["id"], "item_id": check["item_id"], "format": "WEBP", "size": list(actual_size), "sha256": digest(published)})
    return results

def verify_source_correspondence() -> list[dict]:
    try:
        from PIL import Image, ImageChops, ImageStat
    except ModuleNotFoundError as error:
        raise RuntimeError("Pillow is required only for --with-source mode") from error
    results = []
    with tempfile.TemporaryDirectory(prefix="togitsugisha-image-check-") as temporary:
        temp = Path(temporary)
        for check in SOURCE_CHECKS:
            source = check["source"]
            published = check["published"]
            if not source.is_file():
                raise FileNotFoundError(f"{source} is unavailable; --with-source requires the private source-images/ directory")
            if digest(source) != check["source_sha256"]:
                raise AssertionError(f"{check['id']}: source SHA256 changed")
            generated = temp / f"{check['id']}.webp"
            transformed(source, check["angle"], check["size"], generated)
            difference = ImageChops.difference(Image.open(generated).convert("RGB"), Image.open(published).convert("RGB"))
            mean_error = max(ImageStat.Stat(difference).mean)
            if mean_error > 3.0:
                raise AssertionError(f"{check['id']}: source correspondence mean error {mean_error:.3f}")
            results.append({"id": check["id"], "angle_degrees_counter_clockwise": check["angle"], "size": list(check["size"]), "sha256": digest(published), "source_correspondence_mean_error": round(mean_error, 3)})
    return results

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--with-source", action="store_true", help="also compare published assets with private source-images/")
    args = parser.parse_args()
    result = {"status": "PASS", "public_asset_checks": verify_public_assets(), "source_correspondence": "SKIPPED", "source_checks": [], "note": "Public asset checks do not prove physical-original orientation or authenticity."}
    if args.with_source:
        result["source_correspondence"] = "PASS"
        result["source_checks"] = verify_source_correspondence()
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except (AssertionError, FileNotFoundError, OSError, RuntimeError, json.JSONDecodeError) as error:
        print(json.dumps({"status": "FAIL", "error": str(error)}, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)
