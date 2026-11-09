#!/usr/bin/env bash
# Проверка восстановления: разворачивает бэкап в одноразовые том и контейнер,
# рабочие данные не трогает. Обоснование — docs/ARCHITECTURE.md §7.4.
set -euo pipefail

PG_IMAGE=${PG_IMAGE:-postgres:17-alpine}
TAR_IMAGE=${TAR_IMAGE:-alpine:3.20}
READY_TIMEOUT=${READY_TIMEOUT:-60}

fail() {
    echo "restore-check: $*" >&2
    exit 1
}

[ $# -eq 1 ] || fail "использование: restore-check.sh <каталог бэкапа>"

directory=$1
for file in db.dump media.tar.gz meta.txt; do
    [ -f "$directory/$file" ] || fail "в $directory нет файла $file"
done

database=$(sed -n 's/^database=//p' "$directory/meta.txt")
username=$(sed -n 's/^username=//p' "$directory/meta.txt")
[ -n "$database" ] && [ -n "$username" ] || fail "meta.txt не содержит database и username"

suffix=$(date +%s)
container="uits_restore_check_$suffix"
pg_volume="uits_restore_check_pg_$suffix"
media_volume="uits_restore_check_media_$suffix"

cleanup() {
    docker rm -f "$container" >/dev/null 2>&1 || true
    docker volume rm "$pg_volume" "$media_volume" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker volume create "$pg_volume" >/dev/null
docker volume create "$media_volume" >/dev/null

docker run -d --name "$container" \
    -v "$pg_volume":/var/lib/postgresql/data \
    -e POSTGRES_DB="$database" \
    -e POSTGRES_USER="$username" \
    -e POSTGRES_PASSWORD=restore-check \
    "$PG_IMAGE" >/dev/null

ready=""
for _ in $(seq 1 "$READY_TIMEOUT"); do
    if docker exec "$container" pg_isready -h 127.0.0.1 -U "$username" -d "$database" >/dev/null 2>&1; then
        ready=yes
        break
    fi
    sleep 1
done
[ -n "$ready" ] || fail "проверочная база не поднялась за $READY_TIMEOUT с"

docker exec -i "$container" pg_restore -U "$username" -d "$database" --no-owner < "$directory/db.dump"

echo "восстановлено из $directory"
echo
echo "строк в ключевых таблицах:"
docker exec "$container" psql -U "$username" -d "$database" -At -F $'\t' -c "
    select 'databasechangelog', count(*) from databasechangelog
    union all select 'users_user', count(*) from users_user
    union all select 'news_post', count(*) from news_post
    union all select 'employee_teacher', count(*) from employee_teacher
    union all select 'editable_pages_editablepage', count(*) from editable_pages_editablepage
    union all select 'scientific_publications_scientificpublication', count(*)
        from scientific_publications_scientificpublication
    order by 1"

docker run --rm -i -v "$media_volume":/media "$TAR_IMAGE" sh -c 'cd /media && tar -xzf -' < "$directory/media.tar.gz"

echo
echo "медиа:"
docker run --rm -v "$media_volume":/media:ro "$TAR_IMAGE" sh -c \
    'printf "файлов\t%s\n" "$(find /media -type f | wc -l)"; printf "размер\t%s\n" "$(du -sh /media | cut -f1)"'

echo
echo "проверка пройдена, временные контейнер и тома удалены"
