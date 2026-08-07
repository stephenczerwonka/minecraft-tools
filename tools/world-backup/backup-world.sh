#!/usr/bin/env bash

set -Eeuo pipefail

usage() {
  cat <<'EOF'
Usage: backup-world.sh WORLD_DIRECTORY SAVE_DIRECTORY

Creates a timestamped .tar.gz archive of a Minecraft world and a matching
SHA-256 checksum in SAVE_DIRECTORY.

Example:
  backup-world.sh /srv/minecraft/world /srv/minecraft/backups
EOF
}

if [[ ${1:-} == "-h" || ${1:-} == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -ne 2 ]]; then
  usage >&2
  exit 2
fi

world_dir=$1
save_dir=$2

if [[ ! -d $world_dir ]]; then
  printf 'World directory does not exist: %s\n' "$world_dir" >&2
  exit 1
fi

for command_name in tar sha256sum flock; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf 'Required command is not installed: %s\n' "$command_name" >&2
    exit 1
  fi
done

mkdir -p "$save_dir"

world_dir=$(cd "$world_dir" && pwd -P)
save_dir=$(cd "$save_dir" && pwd -P)

case "$save_dir/" in
  "$world_dir"/*)
    printf 'Save directory must not be inside the world directory.\n' >&2
    exit 1
    ;;
esac

world_parent=${world_dir%/*}
world_name=${world_dir##*/}
safe_world_name=${world_name//[^a-zA-Z0-9._-]/_}
timestamp=$(date '+%Y-%m-%d_%H-%M-%S')
archive_name="${safe_world_name}_${timestamp}.tar.gz"
archive_path="$save_dir/$archive_name"
temporary_archive=''

cleanup() {
  if [[ -n $temporary_archive && -e $temporary_archive ]]; then
    rm -f -- "$temporary_archive"
  fi
}
trap cleanup EXIT

exec 9>"$save_dir/.world-backup.lock"
if ! flock -n 9; then
  printf 'Another world backup is already running for: %s\n' "$save_dir" >&2
  exit 1
fi

if [[ -e $archive_path || -e $archive_path.sha256 ]]; then
  printf 'Refusing to replace an existing backup: %s\n' "$archive_path" >&2
  exit 1
fi

temporary_archive=$(mktemp "$save_dir/.${safe_world_name}.XXXXXXXXXX.tmp")

printf 'Backing up %s to %s\n' "$world_dir" "$archive_path"
tar -czf "$temporary_archive" -C "$world_parent" "./$world_name"
mv -- "$temporary_archive" "$archive_path"
temporary_archive=''

(
  cd "$save_dir"
  sha256sum "$archive_name" >"$archive_name.sha256"
)

printf 'Backup complete: %s\n' "$archive_path"
