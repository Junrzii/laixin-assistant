#!/usr/bin/env bash
set -euo pipefail
umask 077
app_dir=/opt/ovo-weixin-assistant
data_dir=/var/lib/ovo-weixin-assistant
service_name=ovo-weixin-assistant
service_user=ovo-weixin
source_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

if [[ ${EUID} -ne 0 ]]; then
  echo '请在服务器 root 终端执行 bash install.sh。'
  exit 1
fi
for dependency in systemctl useradd runuser sha256sum; do
  if ! command -v "$dependency" >/dev/null; then
    echo "找不到 $dependency。请在具备 systemd 的 Linux 系统上安装所需组件。"
    exit 1
  fi
done
(cd "$source_dir" && sha256sum -c SHA256SUMS)
if [[ -e "$app_dir" || -e "$data_dir" || -e /etc/systemd/system/ovo-weixin-assistant.service ]]; then
  echo '检测到已有助手目录或服务。若要更新现有安装，请用 sudo bash upgrade.sh。'
  exit 1
fi
if id "$service_user" >/dev/null 2>&1 || getent group "$service_user" >/dev/null 2>&1; then
  echo '检测到同名系统用户或组，已停止，避免复用其他服务的身份。请先检查。'
  exit 1
fi
python_bin="$(command -v python3.11 || command -v python3 || true)"
if [[ -z "$python_bin" ]]; then
  echo '未找到 Python 3.11 或更新版本。'
  exit 1
fi
"$python_bin" - <<'PY'
import socket,sys
if sys.version_info < (3,11):
    raise SystemExit('需要 Python 3.11 或更新版本。')
with socket.socket() as s:
    try: s.bind(('127.0.0.1',8097))
    except OSError: raise SystemExit('8097 端口已占用；本次未安装，请先检查。')
PY
"$python_bin" -B "$source_dir/assistant.py" --offline doctor
useradd --system --user-group --home-dir "$data_dir" --shell /sbin/nologin "$service_user"
install -d -m 0755 "$app_dir" "$app_dir/static"
install -m 0644 "$source_dir/assistant.py" "$source_dir/qrcodegen.py" "$app_dir/"
assets=(index.html app.js style.css manifest.webmanifest icon-{180,192,512}.png)
install -m 0644 "${assets[@]/#/$source_dir/static/}" "$app_dir/static/"
install -m 0644 "$source_dir/THIRD_PARTY_NOTICES.md" "$source_dir/nginx-location.conf" "$app_dir/"
install -d -m 0700 -o "$service_user" -g "$service_user" "$data_dir"
runuser -u "$service_user" -- "$python_bin" "$app_dir/assistant.py" --data "$data_dir" init
cat > /etc/systemd/system/ovo-weixin-assistant.service <<EOF
[Unit]
Description=Laixin private chat assistant
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$service_user
Group=$service_user
WorkingDirectory=$app_dir
ExecStart=$python_bin $app_dir/assistant.py --data $data_dir run
Restart=on-failure
RestartSec=5
TimeoutStopSec=15
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$data_dir
Environment=PYTHONDONTWRITEBYTECODE=1

[Install]
WantedBy=multi-user.target
EOF
chmod 0644 /etc/systemd/system/ovo-weixin-assistant.service
systemctl daemon-reload
systemctl enable --now "$service_name"
systemctl is-active --quiet "$service_name"
echo '助手已安装并在本机 8097 端口运行。'
echo '外部访问：打开安装包内的 laixin-guide.pdf，按已有 HTTPS 或新站点的步骤配置反向代理。'
echo '请保存上方生成的配置页密码。'
