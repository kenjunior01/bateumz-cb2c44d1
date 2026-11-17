#!/usr/bin/env python3
# v62 — roadmap item 11: badges de confiança só com factos VERIFICÁVEIS.
# · footer.ssl       «SSL 256-bit»  → «Ligação segura (HTTPS)»
# · footer.blockchain «Blockchain Verified» → «Prova de sorteio (SHA-256)»
# · footer.rng       «Certified RNG» → «Apuramento server-side»
# · footer.checkout  «Checkout seguro via PayPal» → «Pagamentos: PayPal ·
#   M-Pesa · e-Mola» (métodos que existem de facto; Visa/MC/Amex saem dos
#   logos do TrustSignals)
import re, sys

CAMINHO = "src/contexts/LanguageContext.tsx"
src = open(CAMINHO, encoding="utf-8").read()

VALORES = {
  "footer.ssl": ["Secure connection (HTTPS)", "Ligação segura (HTTPS)", "Conexão segura (HTTPS)", "Conexión segura (HTTPS)", "Connexion sécurisée (HTTPS)", "सुरक्षित कनेक्शन (HTTPS)"],
  "footer.blockchain": ["Draw proof (SHA-256)", "Prova de sorteio (SHA-256)", "Prova de sorteio (SHA-256)", "Prueba de sorteo (SHA-256)", "Preuve de tirage (SHA-256)", "ड्रॉ प्रमाण (SHA-256)"],
  "footer.rng": ["Server-side draw", "Apuramento server-side", "Apuração server-side", "Sorteo server-side", "Tirage server-side", "server-side ड्रॉ"],
  "footer.checkout": ["Payments: PayPal · M-Pesa · e-Mola", "Pagamentos: PayPal · M-Pesa · e-Mola", "Pagamentos: PayPal · M-Pesa · e-Mola", "Pagos: PayPal · M-Pesa · e-Mola", "Paiements : PayPal · M-Pesa · e-Mola", "भुगतान: PayPal · M-Pesa · e-Mola"],
}

total = 0
for chave, valores in VALORES.items():
    padrao = re.compile(r'("' + re.escape(chave) + r'":\s*")([^"]+)(")')
    achados = list(padrao.finditer(src))
    if len(achados) != 6:
        print(f"ERRO: {chave} tem {len(achados)} ocorrências (esperava 6)")
        sys.exit(1)
    # substituir de TRÁS para a frente — os offsets anteriores continuam válidos
    for lingua_idx in reversed(range(6)):
        m = achados[lingua_idx]
        src = src[:m.start()] + m.group(1) + valores[lingua_idx] + m.group(3) + src[m.end():]
    total += 6

open(CAMINHO, "w", encoding="utf-8").write(src)
print(f"OK — {total} valores substituídos")
