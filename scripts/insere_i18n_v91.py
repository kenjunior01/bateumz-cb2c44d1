#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════════════════
# v91 — i18n das chaves «E-SPORT SEGUE A CONTA» (esport.sinc.*) ×6
# Âncora: a linha "esport.nota.aparelho" (presente nos 6 dicionários,
# na ordem en → pt → pt-BR → es → fr → hi). Inserção baixo→cima para
# não deslocar os offsets; idempotente (não insere se já existir).
# ═══════════════════════════════════════════════════════════════════════
import sys

FICHEIRO = "src/contexts/LanguageContext.tsx"
ANCORA = '"esport.nota.aparelho"'

BLOCOS = {
    "en": [
        ('"esport.sinc.chip.conta"', '"In account"'),
        ('"esport.sinc.chip.aguardar"', '"Saving"'),
        ('"esport.sinc.chip.migracao"', '"Migration pending"'),
        ('"esport.sinc.chip.erro"', '"On device"'),
        ('"esport.sinc.linha.conta"', '"Tournaments and leagues saved to your account · they follow you on any device"'),
        ('"esport.sinc.linha.aguardar"', '"Saving your tournaments and leagues to the account…"'),
        ('"esport.sinc.linha.migracao"', '"Migration pending — tournaments stay on this device for now"'),
        ('"esport.sinc.linha.erro"', '"Could not sync ({motivo}) — tournaments stay safe on this device"'),
    ],
    "pt": [
        ('"esport.sinc.chip.conta"', '"Na conta"'),
        ('"esport.sinc.chip.aguardar"', '"A guardar"'),
        ('"esport.sinc.chip.migracao"', '"Migração pendente"'),
        ('"esport.sinc.chip.erro"', '"No aparelho"'),
        ('"esport.sinc.linha.conta"', '"Torneios e ligas guardados na conta · seguem-te em qualquer dispositivo"'),
        ('"esport.sinc.linha.aguardar"', '"A guardar os teus torneios e ligas na conta…"'),
        ('"esport.sinc.linha.migracao"', '"Migração pendente — os torneios ficam neste aparelho por agora"'),
        ('"esport.sinc.linha.erro"', '"Não foi possível sincronizar ({motivo}) — os torneios ficam seguros neste aparelho"'),
    ],
    "pt-BR": [
        ('"esport.sinc.chip.conta"', '"Na conta"'),
        ('"esport.sinc.chip.aguardar"', '"Salvando"'),
        ('"esport.sinc.chip.migracao"', '"Migração pendente"'),
        ('"esport.sinc.chip.erro"', '"No aparelho"'),
        ('"esport.sinc.linha.conta"', '"Torneios e ligas salvos na conta · acompanham você em qualquer dispositivo"'),
        ('"esport.sinc.linha.aguardar"', '"Salvando seus torneios e ligas na conta…"'),
        ('"esport.sinc.linha.migracao"', '"Migração pendente — os torneios ficam neste aparelho por enquanto"'),
        ('"esport.sinc.linha.erro"', '"Não foi possível sincronizar ({motivo}) — os torneios ficam seguros neste aparelho"'),
    ],
    "es": [
        ('"esport.sinc.chip.conta"', '"En la cuenta"'),
        ('"esport.sinc.chip.aguardar"', '"Guardando"'),
        ('"esport.sinc.chip.migracao"', '"Migración pendiente"'),
        ('"esport.sinc.chip.erro"', '"En el dispositivo"'),
        ('"esport.sinc.linha.conta"', '"Torneos y ligas guardados en la cuenta · te siguen en cualquier dispositivo"'),
        ('"esport.sinc.linha.aguardar"', '"Guardando tus torneos y ligas en la cuenta…"'),
        ('"esport.sinc.linha.migracao"', '"Migración pendiente — los torneos quedan en este dispositivo por ahora"'),
        ('"esport.sinc.linha.erro"', '"No se pudo sincronizar ({motivo}) — los torneos quedan seguros en este dispositivo"'),
    ],
    "fr": [
        ('"esport.sinc.chip.conta"', '"Dans le compte"'),
        ('"esport.sinc.chip.aguardar"', '"Enregistrement"'),
        ('"esport.sinc.chip.migracao"', '"Migration en attente"'),
        ('"esport.sinc.chip.erro"', '"Sur l’appareil"'),
        ('"esport.sinc.linha.conta"', '"Tournois et ligas enregistrés dans le compte · ils vous suivent sur tout appareil"'),
        ('"esport.sinc.linha.aguardar"', '"Enregistrement de vos tournois et ligas dans le compte…"'),
        ('"esport.sinc.linha.migracao"', '"Migration en attente — les tournois restent sur cet appareil pour l’instant"'),
        ('"esport.sinc.linha.erro"', '"Impossible de synchroniser ({motivo}) — les tournois restent en sécurité sur cet appareil"'),
    ],
    "hi": [
        ('"esport.sinc.chip.conta"', '"खाते में"'),
        ('"esport.sinc.chip.aguardar"', '"सहेज रहे हैं"'),
        ('"esport.sinc.chip.migracao"', '"माइग्रेशन लंबित"'),
        ('"esport.sinc.chip.erro"', '"डिवाइस पर"'),
        ('"esport.sinc.linha.conta"', '"टूर्नामेंट और लीग खाते में सहेजे गए · किसी भी डिवाइस पर आपके साथ रहते हैं"'),
        ('"esport.sinc.linha.aguardar"', '"आपके टूर्नामेंट और लीग खाते में सहेज रहे हैं…"'),
        ('"esport.sinc.linha.migracao"', '"माइग्रेशन लंबित — टूर्नामेंट अभी इस डिवाइस पर रहते हैं"'),
        ('"esport.sinc.linha.erro"', '"सिंक नहीं हो सका ({motivo}) — टूर्नामेंट इस डिवाइस पर सुरक्षित रहते हैं"'),
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
    if any('"esport.sinc.chip.conta"' in l for l in linhas):
        print("Chaves esport.sinc.* já presentes — nada a fazer.")
        return

    # inserir baixo→cima (não desloca os offsets); cada bloco logo DEPOIS da âncora
    for i, lingua in reversed(list(enumerate(ORDEM))):
        idx = idxs[i]
        novas = [f'    {k}: {v},\n' for (k, v) in BLOCOS[lingua]]
        linhas[idx + 1:idx + 1] = novas

    with open(FICHEIRO, "w", encoding="utf-8") as f:
        f.writelines(linhas)
    print(f"OK — {len(ORDEM) * 8} chaves esport.sinc.* inseridas (6 dicionários).")

if __name__ == "__main__":
    main()
