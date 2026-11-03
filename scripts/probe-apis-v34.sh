#!/bin/bash
# Probe v34 — candidatas restantes da lista public-apis
# Validação ao vivo: HTTP status + CORS (Access-Control-Allow-Origin) + amostra do payload
ORIGIN="https://bateumz.com"

probe() {
  local nome="$1"; shift
  local url="$1"; shift
  echo "═══ $nome"
  echo "URL: $url"
  local hdr body
  hdr=$(curl -s -m 20 -D - -o /tmp/probe_body.txt -H "Origin: $ORIGIN" -H "User-Agent: bateumz-probe/1.0 (prova de CORS)" "$url")
  local status=$(echo "$hdr" | head -1 | tr -d '\r')
  local aco=$(echo "$hdr" | rg -i "access-control-allow-origin" | tr -d '\r' | head -1)
  local ct=$(echo "$hdr" | rg -i "^content-type" | tr -d '\r' | head -1)
  echo "STATUS: $status"
  echo "CORS: ${aco:-AUSENTE}"
  echo "CT: ${ct:-?}"
  echo "BODY(300): $(head -c 300 /tmp/probe_body.txt)"
  echo ""
}

probe "RADIO-BROWSER MZ" "https://de1.api.radio-browser.info/json/stations/bycountrycodeexact/MZ?limit=2&hidebroken=true&order=votes&reverse=true"
probe "RADIO-BROWSER CV" "https://de1.api.radio-browser.info/json/stations/bycountrycodeexact/CV?limit=2&hidebroken=true&order=votes&reverse=true"
probe "WIKIPEDIA PT summary" "https://pt.wikipedia.org/api/rest_v1/page/summary/Hist%C3%B3ria_de_Mo%C3%A7ambique"
probe "AIR-QUALITY Maputo" "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=-25.9686&longitude=32.5832&current=european_aqi,pm2_5&timezone=auto"
probe "FRANKFURTER latest" "https://api.frankfurter.app/latest?from=EUR&to=USD,BRL,ZAR"
probe "FRANKFURTER timeseries" "https://api.frankfurter.app/2025-10-01..2025-10-10?from=EUR&to=USD"
probe "THEAUDIODB search artist" "https://www.theaudiodb.com/api/v1/json/2/search.php?s=coldplay"
probe "QUOTABLE random" "https://api.quotable.io/random?tags=wisdom"
probe "OPENLIBRARY search" "https://openlibrary.org/search.json?q=Mia+Couto&limit=2&fields=title,author_name,cover_i,first_publish_year"
