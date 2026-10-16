#!/usr/bin/env bash
set -euo pipefail

BACKUP_ROOT=${BACKUP_ROOT:-./backups}
RCLONE_CONFIG_DIR=${RCLONE_CONFIG_DIR:-$HOME/.config/rclone}
RCLONE_IMAGE=${RCLONE_IMAGE:-rclone/rclone:1.75.2}
REMOTE=${REMOTE:-timeweb:uits-stankin-backet1/stand}
REMOTE_KEEP_DAYS=${REMOTE_KEEP_DAYS:-30}
MAX_AGE_DAYS=${MAX_AGE_DAYS:-1}

fail() {
    echo "offsite: $*" >&2
    exit 1
}

command -v docker >/dev/null || fail "docker не найден"
[ -d "$BACKUP_ROOT" ] || fail "каталог $BACKUP_ROOT не найден"
[ -f "$RCLONE_CONFIG_DIR/rclone.conf" ] || fail "нет файла $RCLONE_CONFIG_DIR/rclone.conf"

BACKUP_ROOT=$(cd "$BACKUP_ROOT" && pwd)

latest=$(find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -mtime -"$MAX_AGE_DAYS" -printf '%f\n' | sort | tail -n 1)
[ -n "$latest" ] || fail "в $BACKUP_ROOT нет бэкапа свежее $MAX_AGE_DAYS сут."

for file in db.dump media.tar.gz meta.txt; do
    [ -s "$BACKUP_ROOT/$latest/$file" ] || fail "в $latest нет файла $file или он пуст"
done

rclone() {
    docker run --rm \
        -v "$RCLONE_CONFIG_DIR":/config/rclone \
        -v "$BACKUP_ROOT":/data:ro \
        "$RCLONE_IMAGE" "$@"
}

rclone copy "/data/$latest" "$REMOTE/$latest"
rclone check "/data/$latest" "$REMOTE/$latest"

rclone delete "$REMOTE" --min-age "${REMOTE_KEEP_DAYS}d"

echo "выгрузка завершена: $latest -> $REMOTE/$latest"
