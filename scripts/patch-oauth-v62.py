#!/usr/bin/env python3
# v62 — roadmap item 5: OAuth Google/Apple com erros CORRETOS e honestos.
# · Login/Register: handlers unificados, com cap de 15 s (o «A ligar...»
#   nunca fica preso), mensagem pela língua do utilizador (t()) e o retorno
#   do provedor (?error=… / #error=…) mostrado UMA vez na chegada.
# · authErrors.ts: «email_exists» devolvia action "signup" (mostrar «criar
#   conta» a quem JÁ tem conta = erro de UX); passa a orientar para ENTRAR.
import sys

LOGIN = "src/pages/Login.tsx"
REGISTER = "src/pages/Register.tsx"
AUTHERR = "src/lib/authErrors.ts"

falhas = 0
def substituir(caminho, pares):
    global falhas
    src = open(caminho, encoding="utf-8").read()
    for old, new, esperado in pares:
        n = src.count(old)
        if n != esperado:
            print(f"ERRO em {caminho} ({n} ocorrências, esperava {esperado}): {old[:90]!r}")
            falhas += 1
            continue
        src = src.replace(old, new)
    open(caminho, "w", encoding="utf-8").write(src)

# ── LOGIN ─────────────────────────────────────────────────────
substituir(LOGIN, [
  ('import { describeSignInError, type FriendlyAuthError } from "@/lib/authErrors";',
   'import { describeSignInError, type FriendlyAuthError } from "@/lib/authErrors";\nimport { erroOAuthDoUrl, limparErroOAuth, comTimeoutOAuth } from "@/lib/oauthReturn";\nimport { useLanguage } from "@/contexts/LanguageContext";',
   1),
  ('export default function Login() {\n  const { signIn } = useAuth();',
   'export default function Login() {\n  const { signIn } = useAuth();\n  const { t } = useLanguage();',
   1),
  ('  const [focusedField, setFocusedField] = useState<string | null>(null);',
   '  const [focusedField, setFocusedField] = useState<string | null>(null);\n\n  /* v62 (item 5): o retorno do provedor com erro (?error=… / #error=…)\n     chega à homepage/login calado — mostra-se UMA vez e limpa-se o URL. */\n  useEffect(() => {\n    const retorno = erroOAuthDoUrl(window.location.search, window.location.hash);\n    if (!retorno) return;\n    limparErroOAuth();\n    const provedor = retorno.provedor === "apple" ? "Apple" : retorno.provedor === "google" ? "Google" : "OAuth";\n    if (retorno.erro === "access_denied" || retorno.erro === "user_cancelled_login") {\n      setError(t("auth.oauth.cancelado", { provedor }));\n    } else {\n      setError(t("auth.oauth.erro", { provedor, detalhe: retorno.descricao ? ` (${retorno.descricao})` : "" }));\n    }\n  }, [t]);',
   1),
])

# handlers do LOGIN — substituir os dois por um unificado
substituir(LOGIN, [
  ('  const handleGoogleLogin = async () => {\n    setGoogleLoading(true);\n    playPopSound();\n    const nextTarget = nextPath ?? "";\n    if (nextTarget) localStorage.setItem(\'bateu_oauth_next\', nextTarget);\n    const result = await lovable.auth.signInWithOAuth(\'google\', { redirect_uri: window.location.origin });\n    const error = result.error;\n    if (result.redirected) return;\n    if (!error) { const n = localStorage.getItem(\'bateu_oauth_next\'); localStorage.removeItem(\'bateu_oauth_next\'); window.location.href = n || \'/\'; return; }\n    if (error) {\n      setError(`Could not connect with Google. ${(error as any)?.message ? "(" + (error as any).message + ") " : ""}Please try again — allow pop-ups for this site.`); console.error("[oauth]", error);\n      setGoogleLoading(false);\n    }\n  };\n\n  const handleAppleLogin = async () => {\n    setAppleLoading(true);\n    playPopSound();\n    const nextTarget = nextPath ?? \'/dashboard\';\n    if (nextTarget) localStorage.setItem(\'bateu_oauth_next\', nextTarget);\n    const result = await lovable.auth.signInWithOAuth(\'apple\', { redirect_uri: window.location.origin });\n    const error = result.error;\n    if (result.redirected) return;\n    if (!error) { const n = localStorage.getItem(\'bateu_oauth_next\'); localStorage.removeItem(\'bateu_oauth_next\'); window.location.href = n || \'/\'; return; }\n    if (error) {\n      setError(`Could not connect with Apple. ${(error as any)?.message ? "(" + (error as any).message + ") " : ""}Please try again — allow pop-ups for this site.`); console.error("[oauth]", error);\n      setAppleLoading(false);\n    }\n  };',
   '  /* v62 (item 5): um SÓ handler para os dois provedores — cap de 15 s\n     (o popup/redirect pode morrer calado em webviews e o «A ligar...»\n     ficava preso para sempre), mensagens pela língua do utilizador e\n     reset honesto do estado de loading em TODOS os caminhos. */\n  const iniciarOAuth = async (provedor: "google" | "apple") => {\n    const rotulo = provedor === "apple" ? "Apple" : "Google";\n    const definirLoading = provedor === "apple" ? setAppleLoading : setGoogleLoading;\n    definirLoading(true);\n    playPopSound();\n    const nextTarget = nextPath ?? "";\n    if (nextTarget) localStorage.setItem(\'bateu_oauth_next\', nextTarget);\n    const r = await comTimeoutOAuth(lovable.auth.signInWithOAuth(provedor, { redirect_uri: window.location.origin }));\n    if (r.porTimeout) {\n      setError(t("auth.oauth.timeout", { provedor: rotulo }));\n      console.error("[oauth]", "timeout");\n      definirLoading(false);\n      return;\n    }\n    if (r.erro) {\n      setError(t("auth.oauth.erro", { provedor: rotulo, detalhe: r.erro.message ? ` (${r.erro.message})` : "" }));\n      console.error("[oauth]", r.erro);\n      definirLoading(false);\n      return;\n    }\n    const result = r.valor!;\n    if (result.redirected) return; // o provedor assumiu a navegação\n    const error = result.error;\n    if (!error) { const n = localStorage.getItem(\'bateu_oauth_next\'); localStorage.removeItem(\'bateu_oauth_next\'); window.location.href = n || \'/\'; return; }\n    setError(t("auth.oauth.erro", { provedor: rotulo, detalhe: (error as any)?.message ? ` (${(error as any).message})` : "" }));\n    console.error("[oauth]", error);\n    definirLoading(false);\n  };',
   1),
  ('              onClick={handleGoogleLogin}', '              onClick={() => iniciarOAuth("google")}', 1),
  ('              onClick={handleAppleLogin}', '              onClick={() => iniciarOAuth("apple")}', 1),
])

# ── REGISTER ──────────────────────────────────────────────────
substituir(REGISTER, [
  ('import { lovable } from "@/integrations/lovable/index";',
   'import { lovable } from "@/integrations/lovable/index";\nimport { erroOAuthDoUrl, limparErroOAuth, comTimeoutOAuth } from "@/lib/oauthReturn";\nimport { useLanguage } from "@/contexts/LanguageContext";',
   1),
])

# achar o ponto de injeção do t() no Register (depois do useAuth)
src = open(REGISTER, encoding="utf-8").read()
ancoras = [
  ('  const handleGoogleSignUp = async () => {\n    setGoogleLoading(true);\n        const result = await lovable.auth.signInWithOAuth(\'google\', { redirect_uri: window.location.origin });\n    const error = result.error;\n    if (result.redirected) return;\n    if (!error) { const n = localStorage.getItem(\'bateu_oauth_next\'); localStorage.removeItem(\'bateu_oauth_next\'); window.location.href = n || \'/\'; return; }\n    if (error) {\n      setError(`Could not connect with Google. ${(error as any)?.message ? "(" + (error as any).message + ") " : ""}Please try again — allow pop-ups for this site.`); console.error("[oauth]", error);\n      setGoogleLoading(false);\n    }\n  };\n\n  const handleAppleSignUp = async () => {\n    setAppleLoading(true);\n        const result = await lovable.auth.signInWithOAuth(\'apple\', { redirect_uri: window.location.origin });\n    const error = result.error;\n    if (result.redirected) return;\n    if (!error) { const n = localStorage.getItem(\'bateu_oauth_next\'); localStorage.removeItem(\'bateu_oauth_next\'); window.location.href = n || \'/\'; return; }\n    if (error) {\n      setError(`Could not connect with Apple. ${(error as any)?.message ? "(" + (error as any).message + ") " : ""}Please try again — allow pop-ups for this site.`); console.error("[oauth]", error);\n      setAppleLoading(false);\n    }\n  };',
   '  /* v62 (item 5): um SÓ handler para os dois provedores — cap de 15 s,\n     mensagens pela língua do utilizador e reset honesto do loading. */\n  const iniciarOAuth = async (provedor: "google" | "apple") => {\n    const rotulo = provedor === "apple" ? "Apple" : "Google";\n    const definirLoading = provedor === "apple" ? setAppleLoading : setGoogleLoading;\n    definirLoading(true);\n    const nextTarget = nextPath ?? "";\n    if (nextTarget) localStorage.setItem(\'bateu_oauth_next\', nextTarget);\n    const r = await comTimeoutOAuth(lovable.auth.signInWithOAuth(provedor, { redirect_uri: window.location.origin }));\n    if (r.porTimeout) {\n      setError(t("auth.oauth.timeout", { provedor: rotulo }));\n      console.error("[oauth]", "timeout");\n      definirLoading(false);\n      return;\n    }\n    if (r.erro) {\n      setError(t("auth.oauth.erro", { provedor: rotulo, detalhe: r.erro.message ? ` (${r.erro.message})` : "" }));\n      console.error("[oauth]", r.erro);\n      definirLoading(false);\n      return;\n    }\n    const result = r.valor!;\n    if (result.redirected) return;\n    const error = result.error;\n    if (!error) { const n = localStorage.getItem(\'bateu_oauth_next\'); localStorage.removeItem(\'bateu_oauth_next\'); window.location.href = n || \'/\'; return; }\n    setError(t("auth.oauth.erro", { provedor: rotulo, detalhe: (error as any)?.message ? ` (${(error as any).message})` : "" }));\n    console.error("[oauth]", error);\n    definirLoading(false);\n  };\n  /* v62 (item 5): retorno do provedor com erro mostrado UMA vez na chegada. */\n  useEffect(() => {\n    const retorno = erroOAuthDoUrl(window.location.search, window.location.hash);\n    if (!retorno) return;\n    limparErroOAuth();\n    const provedor = retorno.provedor === "apple" ? "Apple" : retorno.provedor === "google" ? "Google" : "OAuth";\n    if (retorno.erro === "access_denied" || retorno.erro === "user_cancelled_login") {\n      setError(t("auth.oauth.cancelado", { provedor }));\n    } else {\n      setError(t("auth.oauth.erro", { provedor, detalhe: retorno.descricao ? ` (${retorno.descricao})` : "" }));\n    }\n  }, [t]);'),
]
for old, new in ancoras:
    n = src.count(old)
    if n != 1:
        print(f"ERRO no REGISTER handler ({n} ocorrências)")
        falhas += 1
        continue
    src = src.replace(old, new)
open(REGISTER, "w", encoding="utf-8").write(src)

# ── authErrors.ts ─────────────────────────────────────────────
substituir(AUTHERR, [
  ('    return {\n      kind: "email_exists",\n      message: "An account with this email already exists. Try signing in instead, or use another email.",\n      action: "signup",\n    };',
   '    return {\n      kind: "email_exists",\n      message: "An account with this email already exists. Try signing in instead, or use another email.",\n      // v62 (item 5): a conta EXISTE — mandar o utilizador «criar conta» era\n      // o caminho errado; o correto é entrar (ou recuperar a palavra-passe).\n      action: "reset_password",\n    };',
   1),
])

if falhas:
    print(f"FALHAS: {falhas}")
    sys.exit(1)
print("OK — Login/Register/authErrors corrigidos (item 5)")
