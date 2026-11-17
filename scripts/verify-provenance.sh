#!/usr/bin/env bash
set -euo pipefail

pkg="${1:-$(node -p "require('./package.json').name")}" 
version="${2:-$(node -p "require('./package.json').version")}" 

if [[ -z "$pkg" || -z "$version" ]]; then
  echo "usage: $0 [package] [version]" >&2
  exit 2
fi

encoded_pkg="${pkg/@/%40}"
encoded_pkg="${encoded_pkg//\//%2F}"
meta_url="https://registry.npmjs.org/${encoded_pkg}/${version}"
att_url="https://registry.npmjs.org/-/npm/v1/attestations/${encoded_pkg}@${version}"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

curl --fail --silent --show-error "$meta_url" > "$tmp/meta.json"
curl --fail --silent --show-error "$att_url" > "$tmp/attestations.json"

node - "$pkg" "$version" "$tmp/meta.json" "$tmp/attestations.json" <<'NODE'
const fs = require('node:fs');
const [pkg, version, metaPath, attPath] = process.argv.slice(2);
const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
const attest = JSON.parse(fs.readFileSync(attPath, 'utf8'));
if (meta.name !== pkg || meta.version !== version) throw new Error(`registry metadata mismatch: ${meta.name}@${meta.version}`);
if (!meta.dist?.integrity) throw new Error('registry metadata has no dist.integrity');
const list = Array.isArray(attest.attestations) ? attest.attestations : [];
if (list.length === 0) throw new Error('no npm attestations found');
const text = JSON.stringify(attest);
if (!/provenance|slsa/i.test(text)) throw new Error('no provenance/SLSA attestation found');
console.log(`Found provenance attestations for ${pkg}@${version}`);
console.log(`Registry integrity: ${meta.dist.integrity}`);
NODE
