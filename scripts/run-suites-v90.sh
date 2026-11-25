#!/bin/bash
# Runner v90: garante vite dev server no 8099 e corre suítes PW na mesma sessão bash
# (o sandbox mata processos de fundo entre chamadas — padrão v86/v88)
cd /home/z/my-project/bateumz-cb2c44d1 || exit 1
export PW_CHROME=/home/z/.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell

curl -s -o /dev/null -w "%{http_code}" http://localhost:8099/ --max-time 3 | grep -q 200 || {
  echo "[runner] vite abaixo — a arrancar..."
  (setsid nohup npm run dev -- --port 8099 --strictPort > /tmp/vite-90.log 2>&1 < /dev/null &)
  for i in $(seq 1 30); do
    sleep 1
    curl -s -o /dev/null -w "%{http_code}" http://localhost:8099/ --max-time 3 | grep -q 200 && break
  done
  echo "[runner] vite pronto"
}

for suite in "$@"; do
  echo "═══ $suite ═══"
  node "$suite.mjs" 2>&1 | tail -3
done
