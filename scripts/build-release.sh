#!/usr/bin/env bash
set -euo pipefail
tag="${1:-}"
[[ "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.-]+)?$ ]] || { echo "invalid tag: $tag" >&2; exit 2; }
rm -rf dist; mkdir -p dist
prefix="tmo-validation-${tag#v}"
tar --exclude='./node_modules' --exclude='./coverage' --exclude='./dist' --exclude='./.git' -czf "dist/${prefix}.tar.gz" .
zip -qr "dist/${prefix}.zip" . -x 'node_modules/*' 'coverage/*' 'dist/*' '.git/*'
(cd dist && sha256sum "${prefix}.tar.gz" "${prefix}.zip" > SHA256SUMS.txt)
