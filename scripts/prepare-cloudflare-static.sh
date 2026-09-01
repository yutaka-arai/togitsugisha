#!/usr/bin/env bash
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT_DIR/.cloudflare-static"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

cp "$ROOT_DIR/index.html" "$OUT_DIR/index.html"
cp "$ROOT_DIR/favicon.ico" "$OUT_DIR/favicon.ico"
cp -R "$ROOT_DIR/items" "$OUT_DIR/items"
cp -R "$ROOT_DIR/about" "$OUT_DIR/about"
cp -R "$ROOT_DIR/owner" "$OUT_DIR/owner"
cp -R "$ROOT_DIR/news" "$OUT_DIR/news"
cp -R "$ROOT_DIR/contact" "$OUT_DIR/contact"
cp -R "$ROOT_DIR/assets" "$OUT_DIR/assets"
cp -R "$ROOT_DIR/data" "$OUT_DIR/data"
