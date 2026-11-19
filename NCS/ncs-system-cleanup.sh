#!/usr/bin/env bash
# Remove NCS-owned system installation artifacts only. Dry run by default.
set -euo pipefail
apply=0
case "${1:-}" in '') ;; --apply) apply=1;; *) echo 'Usage: ncs-system-cleanup.sh [--apply]' >&2; exit 2;; esac
(( $# <= 1 )) || exit 2
if ((apply)) && ((EUID!=0)); then echo 'Run with sudo only when using --apply.' >&2; exit 2; fi
# Use a fixed safe path even if invoked with a modified environment.
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
printf 'NCS system cleanup (%s). No HOME directories, /mnt, /media, Git trees, Wine prefixes, or user projects are scanned.\n' "$([[ $apply == 1 ]] && echo APPLY || echo DRY-RUN)"
if dpkg-query -W -f='${db:Status-Abbrev}' ncs 2>/dev/null | grep -Eq '^(ii|rc|iU|iF|iH)'; then
  # Refuse to purge an unrelated package sharing the name.
  if dpkg-query -W -f='${Maintainer}\n${Homepage}\n' ncs | grep -Fxq 'https://github.com/Phoenixwolf1245/Node-container-system'; then
    echo 'Purge registered NCS Debian package: ncs'; if ((apply)); then dpkg --purge ncs; fi
  else echo 'Unrecognized package named ncs; left untouched.'; fi
fi
# Exact known legacy command links, only if they point to NCS managed runtime.
for link in /usr/local/bin/ncs /usr/local/bin/NCS /usr/bin/ncs /usr/bin/NCS; do
  [[ -L "$link" ]] || continue
  target=$(readlink -f -- "$link" || true)
  case "$target" in /usr/lib/ncs/ncs|/usr/local/lib/ncs/ncs|/opt/ncs/ncs|/opt/NCS/ncs|/usr/lib/ncs-runtime/ncs)
    if dpkg-query -S "$link" >/dev/null 2>&1; then echo "Package-owned, skipped: $link"; continue; fi
    echo "Remove managed legacy link: $link -> $target"; if ((apply)); then rm -- "$link"; fi;;
  *) echo "Not a recognized NCS system link; skipped: $link";; esac
done
# Never recursively delete arbitrary dirs; legacy installs are removed only when
# an explicit immutable-layout marker identifies them. The marker is written by this kit.
for dir in /usr/lib/ncs /usr/local/lib/ncs /opt/ncs /opt/NCS /usr/lib/ncs-runtime; do
  [[ -d "$dir" && ! -L "$dir" && -f "$dir/.ncs-managed-install" && ! -L "$dir/.ncs-managed-install" ]] || continue
  [[ "$(cat -- "$dir/.ncs-managed-install")" == 'Phoenixwolf1245/Node-container-system managed runtime v1' ]] || continue
  if dpkg-query -S "$dir/.ncs-managed-install" >/dev/null 2>&1; then echo "Package-owned, skipped: $dir"; continue; fi
  echo "Managed runtime exists: $dir (left for manual review if not owned by package)"
done
if (( !apply )); then echo 'Rerun with sudo bash ncs-system-cleanup.sh --apply to remove the listed managed package and links.'; fi
