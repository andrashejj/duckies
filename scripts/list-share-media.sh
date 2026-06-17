#!/usr/bin/env bash
#
# Lists every image + video in a Nextcloud public share and prints a
# ready-to-paste JS array for a `files` fallback list in src/data/*.ts
# (e.g. a blog post's `media.files` in src/data/blog.ts).
#
# Nextcloud exposes a WebDAV listing for public links: PROPFIND the
# /public.php/webdav/ endpoint using the share token as the HTTP Basic
# username (empty password). This script does that and formats the result.
#
# Run it on any machine/network that can reach owncloud.justnet.pl. (The
# Claude Code web sandbox cannot — that host is not on its egress allowlist —
# which is why fallback lists have to be generated here and pasted in.)
#
# Usage:
#   bash scripts/list-share-media.sh <share-token>
#   bash scripts/list-share-media.sh jZtkwTHpCzoxHaB   # Le Morne reef tour post
#
set -euo pipefail

TOKEN="${1:?usage: list-share-media.sh <share-token>}"
HOST="https://owncloud.justnet.pl"

curl -fsS -X PROPFIND -u "${TOKEN}:" -H 'Depth: 1' "${HOST}/public.php/webdav/" \
| python3 - <<'PY'
import sys, re, json, urllib.parse, posixpath

xml = sys.stdin.read()
hrefs = re.findall(r"<[a-zA-Z]*:?href>([^<]+)</[a-zA-Z]*:?href>", xml)

names = []
for h in hrefs:
    name = posixpath.basename(urllib.parse.unquote(h).rstrip("/"))
    if re.search(r"\.(jpe?g|png|gif|webp|mp4|mov|m4v|webm)$", name, re.IGNORECASE):
        names.append(name)

# Natural sort so "Tour 2" comes before "Tour 13".
def natkey(s):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", s)]

names.sort(key=natkey)

print("        // --- paste the lines below into the post's media.files ---")
for n in names:
    print(f"          {json.dumps(n, ensure_ascii=False)},")
print(f"        // --- {len(names)} files ---")
PY
