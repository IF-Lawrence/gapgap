#!/usr/bin/env bash
#
# 部署 GapGap 官网到 https://acesiare.com/GapGap/
#   线上目录：ECS /var/www/html/GapGap（Nginx 直接托管静态文件）
#   只上传 FILES 里列出的文件；部署前把线上目录整体备份到 /root/backups/GapGap/<时间>
#
#   ./scripts/deploy.sh            部署
#   ./scripts/deploy.sh --dry-run  只打印要上传的文件，不检查 git、不连服务器

set -euo pipefail

SERVER_ALIAS="acesiare"
REMOTE_DIR="/var/www/html/GapGap"
BACKUP_ROOT="/root/backups/GapGap"
URL="https://acesiare.com/GapGap/"
FILES="index.html favicon.png"

DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    *) echo "未知参数：$arg"; exit 1 ;;
  esac
done

red() { printf '\033[0;31m%s\033[0m\n' "$1"; }
green() { printf '\033[0;32m%s\033[0m\n' "$1"; }

cd "$(dirname "${BASH_SOURCE[0]}")/.."

for f in $FILES; do
  [ -f "$f" ] || { red "缺少 $f"; exit 1; }
done

if [ "$DRY_RUN" -eq 1 ]; then
  echo "dry run，要上传到 $SERVER_ALIAS:$REMOTE_DIR："
  for f in $FILES; do echo "  $f"; done
  exit 0
fi

# 线上只跑已推送的提交：有未提交 / 未推送的改动就拒绝部署
if [ -n "$(git status --porcelain)" ]; then
  red "有未提交的改动，先提交并推送再部署："
  git status --short
  exit 1
fi
git fetch -q origin
if [ "$(git rev-parse HEAD)" != "$(git rev-parse '@{u}')" ]; then
  red "本地和 $(git rev-parse --abbrev-ref '@{u}') 不一致，先 git push / git pull 再部署"
  exit 1
fi
green "部署提交：$(git log -1 --format='%h %s')"

stamp="$(date '+%Y%m%d_%H%M%S')"
echo "[1/3] 备份线上目录到 $BACKUP_ROOT/$stamp"
ssh "$SERVER_ALIAS" "set -e
  mkdir -p '$BACKUP_ROOT'
  if [ -d '$REMOTE_DIR' ]; then cp -a '$REMOTE_DIR' '$BACKUP_ROOT/$stamp'; fi"

echo "[2/3] 上传文件"
# shellcheck disable=SC2086
COPYFILE_DISABLE=1 tar --no-xattrs -czf - $FILES | ssh "$SERVER_ALIAS" "set -e
  mkdir -p '$REMOTE_DIR'
  tar -xzf - -C '$REMOTE_DIR' --no-same-owner
  chown -R www-data:www-data '$REMOTE_DIR'"
for f in $FILES; do echo "  $f"; done

echo "[3/3] 线上检查"
fail=0
for f in $FILES; do
  path="$f"; [ "$f" = "index.html" ] && path=""
  code="$(curl -sS -o /dev/null -w '%{http_code}' -m 20 "$URL$path" || echo 000)"
  printf '  %s %s\n' "$code" "$URL$path"
  [ "$code" = "200" ] || fail=1
done
[ "$fail" -eq 0 ] || { red "线上检查失败。回滚：ssh $SERVER_ALIAS \"rm -rf '$REMOTE_DIR' && cp -a '$BACKUP_ROOT/$stamp' '$REMOTE_DIR'\""; exit 1; }
green "部署完成：$URL"
