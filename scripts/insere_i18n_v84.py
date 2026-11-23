#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════════════════
# v84 — i18n das chaves «O PROGRESSO SEGUE A CONTA» (reten.sinc.*) ×6
# Âncora: a linha "reten.missao.aparelho" (presente nos 6 dicionários,
# na ordem en → pt → pt-BR → es → fr → hi). Inserção baixo→cima para
# não deslocar os offsets; idempotente (não insere se já existir).
# ═══════════════════════════════════════════════════════════════════════
import re, sys, unicodedata

FICHEIRO = "src/contexts/LanguageContext.tsx"
ANCORA = '"reten.missao.aparelho"'

BLOCOS = {
    "en": [
        ('"reten.sinc.chip.conta"', '"In account"'),
        ('"reten.sinc.chip.aguardar"', '"Saving"'),
        ('"reten.sinc.chip.migracao"', '"Migration pending"'),
        ('"reten.sinc.chip.erro"', '"On device"'),
        ('"reten.sinc.linha.conta"', '"Progress saved to your account · it follows you on any device"'),
        ('"reten.sinc.linha.aguardar"', '"Saving your progress to the account…"'),
        ('"reten.sinc.linha.migracao"', '"Migration pending — progress stays on this device for now"'),
        ('"reten.sinc.linha.erro"', '"Could not sync ({motivo}) — progress stays safe on this device"'),
    ],
    "pt": [
        ('"reten.sinc.chip.conta"', '"Na conta"'),
        ('"reten.sinc.chip.aguardar"', '"A guardar"'),
        ('"reten.sinc.chip.migracao"', '"Migração pendente"'),
        ('"reten.sinc.chip.erro"', '"No aparelho"'),
        ('"reten.sinc.linha.conta"', '"Progresso guardado na conta · segue-te em qualquer dispositivo"'),
        ('"reten.sinc.linha.aguardar"', '"A guardar o teu progresso na conta…"'),
        ('"reten.sinc.linha.migracao"', '"Migração pendente — o progresso fica neste aparelho por agora"'),
        ('"reten.sinc.linha.erro"', '"Não foi possível sincronizar ({motivo}) — o progresso fica seguro neste aparelho"'),
    ],
    "pt-BR": [
        ('"reten.sinc.chip.conta"', '"Na conta"'),
        ('"reten.sinc.chip.aguardar"', '"Salvando"'),
        ('"reten.sinc.chip.migracao"', '"Migração pendente"'),
        ('"reten.sinc.chip.erro"', '"No aparelho"'),
        ('"reten.sinc.linha.conta"', '"Progresso salvo na conta · acompanha você em qualquer dispositivo"'),
        ('"reten.sinc.linha.aguardar"', '"Salvando seu progresso na conta…"'),
        ('"reten.sinc.linha.migracao"', '"Migração pendente — o progresso fica neste aparelho por agora"'),
        ('"reten.sinc.linha.erro"', '"Não foi possível sincronizar ({motivo}) — o progresso fica seguro neste aparelho"'),
    ],
    "es": [
        ('"reten.sinc.chip.conta"', '"En la cuenta"'),
        ('"reten.sinc.chip.aguardar"', '"Guardando"'),
        ('"reten.sinc.chip.migracao"', '"Migración pendiente"'),
        ('"reten.sinc.chip.erro"', '"En el dispositivo"'),
        ('"reten.sinc.linha.conta"', '"Progreso guardado en la cuenta · te sigue en cualquier dispositivo"'),
        ('"reten.sinc.linha.aguardar"', '"Guardando tu progreso en la cuenta…"'),
        ('"reten.sinc.linha.migracao"', '"Migración pendiente — el progreso queda en este dispositivo por ahora"'),
        ('"reten.sinc.linha.erro"', '"No se pudo sincronizar ({motivo}) — el progreso queda seguro en este dispositivo"'),
    ],
    "fr": [
        ('"reten.sinc.chip.conta"', '"Dans le compte"'),
        ('"reten.sinc.chip.aguardar"', '"Enregistrement"'),
        ('"reten.sinc.chip.migracao"', '"Migration en attente"'),
        ('"reten.sinc.chip.erro"', '"Sur l’appareil"'),
        ('"reten.sinc.linha.conta"', '"Progression enregistrée dans le compte · elle vous suit sur tout appareil"'),
        ('"reten.sinc.linha.aguardar"', '"Enregistrement de votre progression dans le compte…"'),
        ('"reten.sinc.linha.migracao"', '"Migration en attente — la progression reste sur cet appareil pour l’instant"'),
        ('"reten.sinc.linha.erro"', '"Impossible de synchroniser ({motivo}) — la progression reste en sécurité sur cet appareil"'),
    ],
    "hi": [
        ('"reten.sinc.chip.conta"', '"खाते में"'),
        ('"reten.sinc.chip.aguardar"', '"सहेज रहे हैं"'),
        ('"reten.sinc.chip.migracao"', '"माइग्रेशन लंबित"'),
        ('"reten.sinc.chip.erro"', '"डिवाइस पर"'),
        ('"reten.sinc.linha.conta"', '"प्रगति खाते में सहेजी गई · किसी भी डिवाइस पर आपके साथ रहती है"'),
        ('"reten.sinc.linha.aguardar"', '"आपकी प्रगति खाते में सहेज रहे हैं…"'),
        ('"reten.sinc.linha.migracao"', '"माइग्रेशन लंबित — प्रगति अभी इस डिवाइस पर रहती है"'),
        ('"reten.sinc.linha.erro"', '"सिंक नहीं हो सका ({motivo}) — प्रगति इस डिवाइस पर सुरक्षित रहती है"'),
    ],
}

ORDEM = ["en", "pt", "pt-BR", "es", "fr", "hi"]

def main():
    with open(FICHEIRO, "r", encoding="utf-8") as f:
        linhas = f.readlines()

    # localizar as ocorrências da âncora (uma por dicionário)
    idxs = [i for i, l in enumerate(linhas) if ANCORA in l and '":' in l]
    if len(idxs) != len(ORDEM):
        print(f"ERRO: {len(idxs)} ocorrências da âncora (esperava {len(ORDEM)}) — abortar sem escrever.")
        sys.exit(1)

    # idempotência: se a 1.ª chave nova já existe, sair
    if any('"reten.sinc.chip.conta"' in l for l in linhas):
        print("Chaves reten.sinc.* já presentes — nada a fazer.")
        return

    # inserir baixo→cima (offsets estáveis)
    for lang, idx in reversed(list(zip(ORDEM, idxs))):
        par = linhas[idx]
        if par.rstrip().endswith(","):
            marge = ""
        else:
            marge = ","
        recuos = re.match(r"\s*", par).group(0)
        bloco = [f"{recuos}{k}: {v},{marge}\n" for k, v in BLOCOS[lang]]
        linhas[idx + 1: idx + 1] = bloco

    with open(FICHEIRO, "w", encoding="utf-8") as f:
        f.writelines(linhas)
    print(f"OK: 8 chaves reten.sinc.* ×6 dicionários ({len(ORDEM)} âncoras).")

if __name__ == "__main__":
    main()
