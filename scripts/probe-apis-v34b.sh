#!/bin/bash
# Probe v34 ronda 2 — correções de domínio/forma + diagnóstico dos falhados
ORIGIN="https://bateumz.com"

probe() {
  local nome="$1"; shift
  local url="$1"; shift
  echo "═══ $nome"
  echo "URL: $url"
  local hdr
  hdr=$(curl -s -m 25 -D - -o /tmp/probe_body.txt -H "Origin: $ORIGIN" -H "User-Agent: bateumz-probe/1.0" "$url")
  local status=$(echo "$hdr" | head -1 | tr -d '\r')
  local aco=$(echo "$hdr" | rg -i "access-control-allow-origin" | tr -d '\r' | head -1)
  echo "STATUS: $status"
  echo "CORS: ${aco:-AUSENTE}"
  echo "BODY(400): $(head -c 400 /tmp/probe_body.txt)"
  echo ""
}

probe "WIKIPEDIA REST retry" "https://pt.wikipedia.org/api/rest_v1/page/summary/Hist%C3%B3ria_de_Mo%C3%A7ambique"
probe "WIKIPEDIA action API (origin=*)" "https://pt.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&format=json&origin=*&formatversion=2&titles=Hist%C3%B3ria%20de%20Mo%C3%A7ambique"
probe "FRANKFURTER .dev latest" "https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD,BRL,ZAR"
probe "FRANKFURTER .dev timeseries" "https://api.frankfurter.dev/v1/2025-10-01..2025-10-10?base=EUR&symbols=USD"
probe "THEAUDIODB key1" "https://www.theaudiodb.com/api/v1/json/1/search.php?s=coldplay"
probe "THEAUDIODB track key2" "https://www.theaudiodb.com/api/v1/json/2/track-mid.php?m=2116889"
probe "QUOTABLE -v diag" "https://api.quotable.io/random"
probe "OPENLIBRARY -v diag" "https://openlibrary.org/search.json?q=agualusa&limit=1&fields=title,author_name"
