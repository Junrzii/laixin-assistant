#!/usr/bin/env bash
set -euo pipefail
umask 077

app_dir=/opt/ovo-weixin-assistant
data_dir=/var/lib/ovo-weixin-assistant
service_name=ovo-weixin-assistant
source_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
installed_file="$app_dir/assistant.py"
runtime_files=(assistant.py static/index.html static/app.js static/style.css
               static/manifest.webmanifest static/icon-{180,192,512}.png)

if [[ $EUID -ne 0 ]]; then
  echo '请在服务器 root 终端运行这个更新。'
  exit 1
fi
if [[ ! -f "$installed_file" || ! -f "$data_dir/assistant.sqlite3" ]]; then
  echo '未找到已有的微信助手安装。'
  exit 1
fi

exec 9>/run/lock/ovo-weixin-assistant-upgrade.lock
flock -n 9 || { echo '另一次更新正在进行。'; exit 1; }
(cd "$source_dir" && sha256sum -c SHA256SUMS)
already_current=yes
for file in "${runtime_files[@]}"; do
  if ! cmp -s "$source_dir/$file" "$app_dir/$file"; then
    already_current=no
  fi
done
if [[ $already_current == yes ]]; then
  echo '来信助手 v0.2.3已安装。'
  exit 0
fi
if ! grep -Eq "^VERSION = '(0\.1\.[0123456789]|0\.2\.[0123])'$" "$installed_file"; then
  echo '当前版本不在支持的升级范围内。请核对已安装版本。'
  exit 1
fi

python_bin="$(command -v python3.11 || command -v python3)"
PYTHONPATH="$app_dir" "$python_bin" -B "$source_dir/assistant.py" --offline doctor

backup_dir="$(mktemp -d /root/ovo-weixin-upgrade-backup.XXXXXX)"
mkdir "$backup_dir/static"
for file in "${runtime_files[@]}"; do
  if [[ -f "$app_dir/$file" ]]; then
    cp -a -- "$app_dir/$file" "$backup_dir/$file"
  fi
done
timeout 20 "$python_bin" - "$data_dir/assistant.sqlite3" "$backup_dir/assistant.sqlite3" <<'PY'
import sqlite3
import sys
from contextlib import closing
from pathlib import Path

source = Path(sys.argv[1]).as_uri() + '?mode=ro'
with closing(sqlite3.connect(source, uri=True, timeout=5)) as original:
    with closing(sqlite3.connect(sys.argv[2])) as backup:
        original.backup(backup)
PY
echo "更新前备份：$backup_dir"

stage_dir="$(mktemp -d "$app_dir/.upgrade.XXXXXX")"
deploy_pending=no

put_files() {
  local from=$1 file
  for file in "${runtime_files[@]}"; do
    if [[ -f "$from/$file" ]]; then
      install -D -m 0644 "$from/$file" "$stage_dir/$file" || return
    else
      rm -f -- "$stage_dir/$file" || return
    fi
  done
  for file in "${runtime_files[@]}"; do
    if [[ -f "$stage_dir/$file" ]]; then
      mv -f -- "$stage_dir/$file" "$app_dir/$file" || return
    else
      rm -f -- "$app_dir/$file" || return
    fi
  done
}

check_health() {
  for ((attempt=0; attempt<10; attempt++)); do
    if systemctl is-active --quiet "$service_name" &&
       [[ $(curl -sS --max-time 2 -o /dev/null -w '%{http_code}' http://127.0.0.1:8097/wx-assistant/ 2>/dev/null) == 200 ]]; then
      return 0
    fi
    sleep 1
  done
  return 1
}

finish() {
  local status=$?
  trap - EXIT
  if [[ $deploy_pending == yes ]]; then
    echo '更新没有完成，正在恢复原程序和配置页。'
    if systemctl stop "$service_name" && put_files "$backup_dir" &&
       systemctl start "$service_name" && check_health; then
      echo '原版本已恢复运行。'
    else
      echo "恢复需要检查，备份在 $backup_dir。"
    fi
  fi
  rm -rf -- "$stage_dir"
  exit "$status"
}

trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
systemctl stop "$service_name"
deploy_pending=yes
put_files "$source_dir"
systemctl start "$service_name"
check_health
page="$(curl -fsS --max-time 5 http://127.0.0.1:8097/wx-assistant/)"
[[ $page == *'id="wb-panel"'* && $page == *'id="memory-list"'* &&
   $page == *'id="tg-pages-fields"'* && $page == *'id="message-channel"'* &&
   $page == *'id="worldbook-file-note"'* && $page == *'id="experience-form"'* &&
   $page == *'rel="manifest"'* && $page == *'id="chat-time-note"'* &&
   $page == *'id="setup-card"'* && $page == *'id="model-test"'* &&
   $page == *'id="photo-enabled"'* ]]
curl -fsS --max-time 5 http://127.0.0.1:8097/wx-assistant/manifest.webmanifest >/dev/null
deploy_pending=no
echo '来信助手 v0.2.3已运行。'
