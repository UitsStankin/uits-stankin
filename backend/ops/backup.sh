#!/usr/bin/env bash
# Снятие бэкапа: дамп базы и архив тома медиа. Обоснование — docs/ARCHITECTURE.md §7.4.
set -euo pipefail

POSTGRES_CONTAINER=${POSTGRES_CONTAINER:-uits_postgres}
MEDIA_VOLUME=${MEDIA_VOLUME:-uits_media_data}
BACKUP_ROOT=${BACKUP_ROOT:-./backups}
KEEP_DAYS=${KEEP_DAYS:-14}
TAR_IMAGE=${TAR_IMAGE:-alpine:3.20}

fail() {
    echo "backup: $*" >&2
    exit 1
}

command -v docker >/dev/null || fail "docker не найден"

[ "$(docker inspect --format '{{.State.Running}}' "$POSTGRES_CONTAINER" 2>/dev/null)" = "true" ] \
    || fail "контейнер $POSTGRES_CONTAINER не запущен"

docker volume inspect "$MEDIA_VOLUME" >/dev/null 2>&1 \
    || fail "тома $MEDIA_VOLUME нет"

database=$(docker exec "$POSTGRES_CONTAINER" printenv POSTGRES_DB)
username=$(docker exec "$POSTGRES_CONTAINER" printenv POSTGRES_USER)

directory="$BACKUP_ROOT/$(date +%Y-%m-%d_%H%M%S)"
[ -e "$directory" ] && fail "каталог $directory уже существует"
mkdir -p "$directory"

abort() {
    rm -rf "$directory"
    echo "backup: снятие прервано, каталог $directory удалён" >&2
}
trap abort ERR

docker exec "$POSTGRES_CONTAINER" pg_dump -U "$username" -d "$database" -Fc > "$directory/db.dump"
docker exec -i "$POSTGRES_CONTAINER" pg_restore --list > /dev/null < "$directory/db.dump"

docker run --rm -v "$MEDIA_VOLUME":/media:ro "$TAR_IMAGE" \
    sh -c 'cd /media && tar -czf - .' > "$directory/media.tar.gz"

{
    echo "created=$(date -Iseconds)"
    echo "database=$database"
    echo "username=$username"
    echo "media_volume=$MEDIA_VOLUME"
    echo "postgres=$(docker exec "$POSTGRES_CONTAINER" postgres --version)"
} > "$directory/meta.txt"

trap - ERR

find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -mtime +"$KEEP_DAYS" -exec rm -rf {} +

echo "бэкап снят: $directory"
ls -lh "$directory"
