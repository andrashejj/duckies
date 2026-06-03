#!/usr/bin/env bash
#
# Lists every image in the Sunset Duckies Cup public share and prints a
# ready-to-paste JS array for `cup.photos.files` in src/data/site.ts.
#
# WHY THIS SCRIPT EXISTS
# ----------------------
# The Cup photos live in a Nextcloud public share. Nextcloud exposes a WebDAV
# listing for public links: PROPFIND the /public.php/webdav/ endpoint using the
# share token as the HTTP Basic username (empty password). This script does that
# and formats the result.
#
# Run it on any machine/network that can reach owncloud.justnet.pl. (The Claude
# Code web sandbox cannot — that host is not on its egress allowlist — which is
# why the file list has to be generated here and pasted in.)
#
# Usage:
#   bash scripts/list-cup-photos.sh                 # print the array
#   bash scripts/list-cup-photos.sh > /tmp/list.txt # save it
#
set -euo pipefail

TOKEN="kmNsjY62yRzergT"
HOST="https://owncloud.justnet.pl"

curl -fsS -X PROPFIND -u "${TOKEN}:" -H 'Depth: 1' "${HOST}/public.php/webdav/" \
| python3 - <<'PY'
import sys, re, json, urllib.parse, posixpath

xml = sys.stdin.read()
hrefs = re.findall(r"<[a-zA-Z]*:?href>([^<]+)</[a-zA-Z]*:?href>", xml)

names = []
for h in hrefs:
    name = posixpath.basename(urllib.parse.unquote(h).rstrip("/"))
    if re.search(r"\.(jpe?g|png|gif|webp)$", name, re.IGNORECASE):
        names.append(name)

# Natural sort so "Cup 2" comes before "Cup 13".
def natkey(s):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", s)]

names.sort(key=natkey)

print("    // --- paste the lines below into cup.photos.files in src/data/site.ts ---")
for n in names:
    print(f"      {json.dumps(n, ensure_ascii=False)},")
print(f"    // --- {len(names)} photos ---")
PY
