#!/usr/bin/env python3
# v54 — insere as chaves i18n da BATEU IA nos 6 idiomas do LanguageContext.
# Padrão dos scripts add-i18n-keys*.py: inserção imediata a seguir à abertura
# de cada dicionário, indentação de 4 espaços, valores com JSON escaping.
import json, re, sys

CAMINHO = "src/contexts/LanguageContext.tsx"

def K(**kw):  # mantém a ordem de inserção
    return list(kw.items())

PT = K(
    **{"nav.ia": "Bateu IA", "nav.ia.desc": "Assistente NVIDIA Nemotron — responde, pensa e cria contigo", "footer.ia": "Bateu IA"},
    **{"ia.title": "Bateu IA — Nemotron", "ia.subtitle": "NVIDIA nemotron-3-ultra-550b-a55b · streaming real · pensamento visível"},
    **{"ia.enviar": "Enviar", "ia.parar": "Parar", "ia.escrever": "Escreve a tua mensagem… (Enter envia · Shift+Enter nova linha)", "ia.a.pensar": "A pensar…"},
    **{"ia.nova.conversa": "Nova conversa", "ia.conversas": "Conversas", "ia.sem.conversas": "Ainda não há conversas — começa em cima ou clica numa sugestão.", "ia.apagar": "Apagar conversa", "ia.exportar": "Exportar (.md)", "ia.exportar.feito": "Conversa exportada em Markdown"},
    **{"ia.config": "Configuração", "ia.config.modelo": "Modelo", "ia.config.modelo.custom": "Modelo personalizado (id do catálogo NVIDIA)", "ia.config.temperatura": "Temperatura (criatividade)", "ia.config.topp": "Top-p (variedade)", "ia.config.maxtokens": "Máx. de tokens", "ia.config.thinking": "Modo pensamento", "ia.config.thinking.desc": "O modelo razoa antes de responder (reasoning_content)"},
    **{"ia.config.endpoint.edge": "Edge Function", "ia.config.endpoint.proxy": "Proxy local", "ia.config.endpoint.directo": "Directo (dev — chave no bundle)"},
    **{"ia.raciocinio": "Pensamento", "ia.raciocinio.desc": "Mostrar/ocultar o raciocínio do modelo"},
    **{"ia.stats.tokens": "tokens", "ia.stats.segundo": "tok/s", "ia.stats.primeiro": "1.º tok"},
    **{"ia.erro.ligacao": "A IA não respondeu — tenta de novo", "ia.erro.limite": "Muitas chamadas — espera", "ia.erro.parado": "Geração parada por ti"},
    **{"ia.vazio.titulo": "Como posso ajudar?", "ia.vazio.desc": "Escolhe uma persona (o modo de trabalho da IA) e faz a primeira pergunta — as respostas chegam ao vivo, token a token."},
    **{"ia.rodape.honesto": "A IA pode errar — sem conselho financeiro ou jurídico. Jogo responsável, sempre."},
    **{"ia.persona.assistente.nome": "Guia da Bateu", "ia.persona.assistente.desc": "Como participar, bilhetes, carteira, levantamentos — passo a passo.", "ia.persona.assistente.s1": "Como participo num sorteio?", "ia.persona.assistente.s2": "Como funcionam os bilhetes e a carteira?", "ia.persona.assistente.s3": "Onde vejo os vencedores verificados?"},
    **{"ia.persona.desporto.nome": "Comentador", "ia.persona.desporto.desc": "Análise de futebol e esports com energia de narrador.", "ia.persona.desporto.s1": "Analisa a forma dos Mambas", "ia.persona.desporto.s2": "Como melhorar o meu palpite de hoje?", "ia.persona.desporto.s3": "Explica o sistema de palpites da Bateu"},
    **{"ia.persona.criativo.nome": "Criativo", "ia.persona.criativo.desc": "Legendas, stories, ideias e nomes prontos a usar.", "ia.persona.criativo.s1": "Legenda para um story do meu prémio", "ia.persona.criativo.s2": "5 nomes para a minha loja no marketplace", "ia.persona.criativo.s3": "Ideias de vídeo para divulgar o meu sorteio"},
    **{"ia.persona.tradutor.nome": "Tradutor", "ia.persona.tradutor.desc": "PT ↔ EN ↔ ES ↔ FR com o tom preservado.", "ia.persona.tradutor.s1": "Traduz «Parabéns, ganhaste!» para inglês", "ia.persona.tradutor.s2": "Traduz a descrição do meu produto para francês", "ia.persona.tradutor.s3": "Como se diz «sorteio verificado» em espanhol?"},
    **{"ia.persona.programador.nome": "Programador", "ia.persona.programador.desc": "Código completo e correto, com exemplos executáveis.", "ia.persona.programador.s1": "Um hook React de contagem decrescente", "ia.persona.programador.s2": "Como validar um formulário com zod?", "ia.persona.programador.s3": "Explica o erro: Cannot read properties of undefined"},
    **{"ia.persona.pensador.nome": "Modo profundo", "ia.persona.pensador.desc": "Pensa devagar, mostra o raciocínio e separa facto de opinião.", "ia.persona.pensador.s1": "Vale a pena criar um sorteio social? Prós e contras", "ia.persona.pensador.s2": "Analisa: leilão ou venda directa?", "ia.persona.pensador.s3": "Ajuda-me a escolher o prémio ideal com 20 000 MT"},
)

EN = K(
    **{"nav.ia": "Bateu AI", "nav.ia.desc": "NVIDIA Nemotron assistant — answers, thinks and creates with you", "footer.ia": "Bateu AI"},
    **{"ia.title": "Bateu AI — Nemotron", "ia.subtitle": "NVIDIA nemotron-3-ultra-550b-a55b · real streaming · visible thinking"},
    **{"ia.enviar": "Send", "ia.parar": "Stop", "ia.escrever": "Type your message… (Enter sends · Shift+Enter new line)", "ia.a.pensar": "Thinking…"},
    **{"ia.nova.conversa": "New chat", "ia.conversas": "Chats", "ia.sem.conversas": "No chats yet — start one above or tap a suggestion.", "ia.apagar": "Delete chat", "ia.exportar": "Export (.md)", "ia.exportar.feito": "Chat exported as Markdown"},
    **{"ia.config": "Settings", "ia.config.modelo": "Model", "ia.config.modelo.custom": "Custom model (NVIDIA catalog id)", "ia.config.temperatura": "Temperature (creativity)", "ia.config.topp": "Top-p (variety)", "ia.config.maxtokens": "Max tokens", "ia.config.thinking": "Thinking mode", "ia.config.thinking.desc": "The model reasons before answering (reasoning_content)"},
    **{"ia.config.endpoint.edge": "Edge Function", "ia.config.endpoint.proxy": "Local proxy", "ia.config.endpoint.directo": "Direct (dev — key in bundle)"},
    **{"ia.raciocinio": "Thinking", "ia.raciocinio.desc": "Show/hide the model's reasoning"},
    **{"ia.stats.tokens": "tokens", "ia.stats.segundo": "tok/s", "ia.stats.primeiro": "1st tok"},
    **{"ia.erro.ligacao": "The AI did not answer — try again", "ia.erro.limite": "Too many calls — wait", "ia.erro.parado": "Generation stopped by you"},
    **{"ia.vazio.titulo": "How can I help?", "ia.vazio.desc": "Pick a persona (the AI's working mode) and ask your first question — answers arrive live, token by token."},
    **{"ia.rodape.honesto": "AI can make mistakes — no financial or legal advice. Responsible play, always."},
    **{"ia.persona.assistente.nome": "Bateu Guide", "ia.persona.assistente.desc": "How to join, tickets, wallet, withdrawals — step by step.", "ia.persona.assistente.s1": "How do I join a raffle?", "ia.persona.assistente.s2": "How do tickets and the wallet work?", "ia.persona.assistente.s3": "Where can I see verified winners?"},
    **{"ia.persona.desporto.nome": "Commentator", "ia.persona.desporto.desc": "Football and esports analysis with announcer energy.", "ia.persona.desporto.s1": "Analyse the Mambas' current form", "ia.persona.desporto.s2": "How to improve my prediction today?", "ia.persona.desporto.s3": "Explain the Bateu prediction system"},
    **{"ia.persona.criativo.nome": "Creative", "ia.persona.criativo.desc": "Captions, stories, ideas and names ready to use.", "ia.persona.criativo.s1": "Caption for a story about my prize", "ia.persona.criativo.s2": "5 names for my marketplace shop", "ia.persona.criativo.s3": "Video ideas to promote my raffle"},
    **{"ia.persona.tradutor.nome": "Translator", "ia.persona.tradutor.desc": "PT ↔ EN ↔ ES ↔ FR with the tone preserved.", "ia.persona.tradutor.s1": "Translate «Congrats, you won!» to English", "ia.persona.tradutor.s2": "Translate my product description to French", "ia.persona.tradutor.s3": "How do you say «verified raffle» in Spanish?"},
    **{"ia.persona.programador.nome": "Coder", "ia.persona.programador.desc": "Complete, correct code with runnable examples.", "ia.persona.programador.s1": "A React countdown hook", "ia.persona.programador.s2": "How to validate a form with zod?", "ia.persona.programador.s3": "Explain the error: Cannot read properties of undefined"},
    **{"ia.persona.pensador.nome": "Deep mode", "ia.persona.pensador.desc": "Thinks slowly, shows the reasoning and separates fact from opinion.", "ia.persona.pensador.s1": "Is a social raffle worth it? Pros and cons", "ia.persona.pensador.s2": "Analyse: auction or direct sale?", "ia.persona.pensador.s3": "Help me pick the ideal prize with a 20 000 MZN budget"},
)

PTBR = K(
    **{"nav.ia": "Bateu IA", "nav.ia.desc": "Assistente NVIDIA Nemotron — responde, pensa e cria com você", "footer.ia": "Bateu IA"},
    **{"ia.title": "Bateu IA — Nemotron", "ia.subtitle": "NVIDIA nemotron-3-ultra-550b-a55b · streaming real · pensamento visível"},
    **{"ia.enviar": "Enviar", "ia.parar": "Parar", "ia.escrever": "Digite sua mensagem… (Enter envia · Shift+Enter nova linha)", "ia.a.pensar": "Pensando…"},
    **{"ia.nova.conversa": "Nova conversa", "ia.conversas": "Conversas", "ia.sem.conversas": "Ainda não há conversas — comece acima ou toque numa sugestão.", "ia.apagar": "Apagar conversa", "ia.exportar": "Exportar (.md)", "ia.exportar.feito": "Conversa exportada em Markdown"},
    **{"ia.config": "Configuração", "ia.config.modelo": "Modelo", "ia.config.modelo.custom": "Modelo personalizado (id do catálogo NVIDIA)", "ia.config.temperatura": "Temperatura (criatividade)", "ia.config.topp": "Top-p (variedade)", "ia.config.maxtokens": "Máx. de tokens", "ia.config.thinking": "Modo pensamento", "ia.config.thinking.desc": "O modelo raciocina antes de responder (reasoning_content)"},
    **{"ia.config.endpoint.edge": "Edge Function", "ia.config.endpoint.proxy": "Proxy local", "ia.config.endpoint.directo": "Direto (dev — chave no bundle)"},
    **{"ia.raciocinio": "Pensamento", "ia.raciocinio.desc": "Mostrar/ocultar o raciocínio do modelo"},
    **{"ia.stats.tokens": "tokens", "ia.stats.segundo": "tok/s", "ia.stats.primeiro": "1.º tok"},
    **{"ia.erro.ligacao": "A IA não respondeu — tente de novo", "ia.erro.limite": "Muitas chamadas — espere", "ia.erro.parado": "Geração parada por você"},
    **{"ia.vazio.titulo": "Como posso ajudar?", "ia.vazio.desc": "Escolha uma persona (o modo de trabalho da IA) e faça a primeira pergunta — as respostas chegam ao vivo, token a token."},
    **{"ia.rodape.honesto": "A IA pode errar — sem conselho financeiro ou jurídico. Jogo responsável, sempre."},
    **{"ia.persona.assistente.nome": "Guia da Bateu", "ia.persona.assistente.desc": "Como participar, bilhetes, carteira, saques — passo a passo.", "ia.persona.assistente.s1": "Como participo de um sorteio?", "ia.persona.assistente.s2": "Como funcionam os bilhetes e a carteira?", "ia.persona.assistente.s3": "Onde vejo os vencedores verificados?"},
    **{"ia.persona.desporto.nome": "Comentarista", "ia.persona.desporto.desc": "Análise de futebol e esports com energia de narrador.", "ia.persona.desporto.s1": "Analise a forma dos Mambas", "ia.persona.desporto.s2": "Como melhorar meu palpite de hoje?", "ia.persona.desporto.s3": "Explique o sistema de palpites da Bateu"},
    **{"ia.persona.criativo.nome": "Criativo", "ia.persona.criativo.desc": "Legendas, stories, ideias e nomes prontos para usar.", "ia.persona.criativo.s1": "Legenda para um story do meu prêmio", "ia.persona.criativo.s2": "5 nomes para minha loja no marketplace", "ia.persona.criativo.s3": "Ideias de vídeo para divulgar meu sorteio"},
    **{"ia.persona.tradutor.nome": "Tradutor", "ia.persona.tradutor.desc": "PT ↔ EN ↔ ES ↔ FR com o tom preservado.", "ia.persona.tradutor.s1": "Traduza «Parabéns, você ganhou!» para inglês", "ia.persona.tradutor.s2": "Traduza a descrição do meu produto para francês", "ia.persona.tradutor.s3": "Como se diz «sorteio verificado» em espanhol?"},
    **{"ia.persona.programador.nome": "Programador", "ia.persona.programador.desc": "Código completo e correto, com exemplos executáveis.", "ia.persona.programador.s1": "Um hook React de contagem regressiva", "ia.persona.programador.s2": "Como validar um formulário com zod?", "ia.persona.programador.s3": "Explique o erro: Cannot read properties of undefined"},
    **{"ia.persona.pensador.nome": "Modo profundo", "ia.persona.pensador.desc": "Pensa devagar, mostra o raciocínio e separa fato de opinião.", "ia.persona.pensador.s1": "Vale a pena criar um sorteio social? Prós e contras", "ia.persona.pensador.s2": "Analise: leilão ou venda direta?", "ia.persona.pensador.s3": "Ajude-me a escolher o prêmio ideal com 20 000 MZN"},
)

ES = K(
    **{"nav.ia": "Bateu IA", "nav.ia.desc": "Asistente NVIDIA Nemotron — responde, piensa y crea contigo", "footer.ia": "Bateu IA"},
    **{"ia.title": "Bateu IA — Nemotron", "ia.subtitle": "NVIDIA nemotron-3-ultra-550b-a55b · streaming real · pensamiento visible"},
    **{"ia.enviar": "Enviar", "ia.parar": "Parar", "ia.escrever": "Escribe tu mensaje… (Enter envía · Shift+Enter nueva línea)", "ia.a.pensar": "Pensando…"},
    **{"ia.nova.conversa": "Nueva conversación", "ia.conversas": "Conversaciones", "ia.sem.conversas": "Aún no hay conversaciones — empieza arriba o toca una sugerencia.", "ia.apagar": "Eliminar conversación", "ia.exportar": "Exportar (.md)", "ia.exportar.feito": "Conversación exportada en Markdown"},
    **{"ia.config": "Ajustes", "ia.config.modelo": "Modelo", "ia.config.modelo.custom": "Modelo personalizado (id del catálogo NVIDIA)", "ia.config.temperatura": "Temperatura (creatividad)", "ia.config.topp": "Top-p (variedad)", "ia.config.maxtokens": "Máx. de tokens", "ia.config.thinking": "Modo pensamiento", "ia.config.thinking.desc": "El modelo razona antes de responder (reasoning_content)"},
    **{"ia.config.endpoint.edge": "Edge Function", "ia.config.endpoint.proxy": "Proxy local", "ia.config.endpoint.directo": "Directo (dev — clave en el bundle)"},
    **{"ia.raciocinio": "Pensamiento", "ia.raciocinio.desc": "Mostrar/ocultar el razonamiento del modelo"},
    **{"ia.stats.tokens": "tokens", "ia.stats.segundo": "tok/s", "ia.stats.primeiro": "1.er tok"},
    **{"ia.erro.ligacao": "La IA no respondió — inténtalo de nuevo", "ia.erro.limite": "Demasiadas llamadas — espera", "ia.erro.parado": "Generación detenida por ti"},
    **{"ia.vazio.titulo": "¿Cómo puedo ayudarte?", "ia.vazio.desc": "Elige una persona (el modo de trabajo de la IA) y haz tu primera pregunta — las respuestas llegan en vivo, token a token."},
    **{"ia.rodape.honesto": "La IA puede equivocarse — sin consejos financieros ni jurídicos. Juego responsable, siempre."},
    **{"ia.persona.assistente.nome": "Guía de Bateu", "ia.persona.assistente.desc": "Cómo participar, boletos, cartera, retiros — paso a paso.", "ia.persona.assistente.s1": "¿Cómo participo en un sorteo?", "ia.persona.assistente.s2": "¿Cómo funcionan los boletos y la cartera?", "ia.persona.assistente.s3": "¿Dónde veo los ganadores verificados?"},
    **{"ia.persona.desporto.nome": "Comentador", "ia.persona.desporto.desc": "Análisis de fútbol y esports con energía de narrador.", "ia.persona.desporto.s1": "Analiza la forma de los Mambas", "ia.persona.desporto.s2": "¿Cómo mejorar mi pronóstico de hoy?", "ia.persona.desporto.s3": "Explica el sistema de pronósticos de Bateu"},
    **{"ia.persona.criativo.nome": "Creativo", "ia.persona.criativo.desc": "Leyendas, stories, ideas y nombres listos para usar.", "ia.persona.criativo.s1": "Leyenda para un story de mi premio", "ia.persona.criativo.s2": "5 nombres para mi tienda en el marketplace", "ia.persona.criativo.s3": "Ideas de vídeo para promocionar mi sorteo"},
    **{"ia.persona.tradutor.nome": "Traductor", "ia.persona.tradutor.desc": "PT ↔ EN ↔ ES ↔ FR con el tono preservado.", "ia.persona.tradutor.s1": "Traduce «¡Felicidades, ganaste!» al inglés", "ia.persona.tradutor.s2": "Traduce la descripción de mi producto al francés", "ia.persona.tradutor.s3": "¿Cómo se dice «sorteo verificado» en español?"},
    **{"ia.persona.programador.nome": "Programador", "ia.persona.programador.desc": "Código completo y correcto, con ejemplos ejecutables.", "ia.persona.programador.s1": "Un hook React de cuenta regresiva", "ia.persona.programador.s2": "¿Cómo validar un formulario con zod?", "ia.persona.programador.s3": "Explica el error: Cannot read properties of undefined"},
    **{"ia.persona.pensador.nome": "Modo profundo", "ia.persona.pensador.desc": "Piensa despacio, muestra el razonamiento y separa hecho de opinión.", "ia.persona.pensador.s1": "¿Vale la pena crear un sorteo social? Pros y contras", "ia.persona.pensador.s2": "Analiza: ¿subasta o venta directa?", "ia.persona.pensador.s3": "Ayúdame a elegir el premio ideal con 20 000 MZN"},
)

FR = K(
    **{"nav.ia": "Bateu IA", "nav.ia.desc": "Assistant NVIDIA Nemotron — répond, réfléchit et crée avec vous", "footer.ia": "Bateu IA"},
    **{"ia.title": "Bateu IA — Nemotron", "ia.subtitle": "NVIDIA nemotron-3-ultra-550b-a55b · streaming réel · pensée visible"},
    **{"ia.enviar": "Envoyer", "ia.parar": "Arrêter", "ia.escrever": "Écrivez votre message… (Entrée envoie · Maj+Entrée nouvelle ligne)", "ia.a.pensar": "Réflexion…"},
    **{"ia.nova.conversa": "Nouvelle conversation", "ia.conversas": "Conversations", "ia.sem.conversas": "Pas encore de conversations — commencez ci-dessus ou touchez une suggestion.", "ia.apagar": "Supprimer la conversation", "ia.exportar": "Exporter (.md)", "ia.exportar.feito": "Conversation exportée en Markdown"},
    **{"ia.config": "Réglages", "ia.config.modelo": "Modèle", "ia.config.modelo.custom": "Modèle personnalisé (id du catalogue NVIDIA)", "ia.config.temperatura": "Température (créativité)", "ia.config.topp": "Top-p (variété)", "ia.config.maxtokens": "Tokens max", "ia.config.thinking": "Mode réflexion", "ia.config.thinking.desc": "Le modèle raisonne avant de répondre (reasoning_content)"},
    **{"ia.config.endpoint.edge": "Edge Function", "ia.config.endpoint.proxy": "Proxy local", "ia.config.endpoint.directo": "Direct (dev — clé dans le bundle)"},
    **{"ia.raciocinio": "Réflexion", "ia.raciocinio.desc": "Afficher/masquer le raisonnement du modèle"},
    **{"ia.stats.tokens": "tokens", "ia.stats.segundo": "tok/s", "ia.stats.primeiro": "1er tok"},
    **{"ia.erro.ligacao": "L'IA n'a pas répondu — réessayez", "ia.erro.limite": "Trop d'appels — patientez", "ia.erro.parado": "Génération arrêtée par vous"},
    **{"ia.vazio.titulo": "Comment puis-je aider ?", "ia.vazio.desc": "Choisissez une persona (le mode de travail de l'IA) et posez votre première question — les réponses arrivent en direct, token par token."},
    **{"ia.rodape.honesto": "L'IA peut se tromper — sans conseil financier ou juridique. Jeu responsable, toujours."},
    **{"ia.persona.assistente.nome": "Guide Bateu", "ia.persona.assistente.desc": "Comment participer, billets, portefeuille, retraits — pas à pas.", "ia.persona.assistente.s1": "Comment participer à un tirage ?", "ia.persona.assistente.s2": "Comment fonctionnent billets et portefeuille ?", "ia.persona.assistente.s3": "Où voir les gagnants vérifiés ?"},
    **{"ia.persona.desporto.nome": "Commentateur", "ia.persona.desporto.desc": "Analyse football et esports avec l'énergie d'un narrateur.", "ia.persona.desporto.s1": "Analyse la forme des Mambas", "ia.persona.desporto.s2": "Comment améliorer mon pronostic du jour ?", "ia.persona.desporto.s3": "Explique le système de pronostics Bateu"},
    **{"ia.persona.criativo.nome": "Créatif", "ia.persona.criativo.desc": "Légendes, stories, idées et noms prêts à l'emploi.", "ia.persona.criativo.s1": "Légende pour une story sur mon prix", "ia.persona.criativo.s2": "5 noms pour ma boutique marketplace", "ia.persona.criativo.s3": "Idées de vidéo pour promouvoir mon tirage"},
    **{"ia.persona.tradutor.nome": "Traducteur", "ia.persona.tradutor.desc": "PT ↔ EN ↔ ES ↔ FR avec le ton préservé.", "ia.persona.tradutor.s1": "Traduis « Félicitations, tu as gagné ! » en anglais", "ia.persona.tradutor.s2": "Traduis la description de mon produit en français", "ia.persona.tradutor.s3": "Comment dit-on « tirage vérifié » en espagnol ?"},
    **{"ia.persona.programador.nome": "Développeur", "ia.persona.programador.desc": "Code complet et correct, avec des exemples exécutables.", "ia.persona.programador.s1": "Un hook React de compte à rebours", "ia.persona.programador.s2": "Comment valider un formulaire avec zod ?", "ia.persona.programador.s3": "Explique l'erreur : Cannot read properties of undefined"},
    **{"ia.persona.pensador.nome": "Mode profond", "ia.persona.pensador.desc": "Réfléchit lentement, montre le raisonnement et sépare fait et opinion.", "ia.persona.pensador.s1": "Un tirage social vaut-il le coup ? Pour et contre", "ia.persona.pensador.s2": "Analyse : enchère ou vente directe ?", "ia.persona.pensador.s3": "Aide-moi à choisir le prix idéal avec 20 000 MZN"},
)

HI = K(
    **{"nav.ia": "Bateu AI", "nav.ia.desc": "NVIDIA Nemotron असिस्टेंट — आपके साथ जवाब देता, सोचता और बनाता है", "footer.ia": "Bateu AI"},
    **{"ia.title": "Bateu AI — Nemotron", "ia.subtitle": "NVIDIA nemotron-3-ultra-550b-a55b · रीयल स्ट्रीमिंग · दिखने वाली सोच"},
    **{"ia.enviar": "भेजें", "ia.parar": "रोकें", "ia.escrever": "अपना संदेश लिखें… (Enter भेजता है · Shift+Enter नई लाइन)", "ia.a.pensar": "सोच रहा है…"},
    **{"ia.nova.conversa": "नई बातचीत", "ia.conversas": "बातचीत", "ia.sem.conversas": "अभी कोई बातचीत नहीं — ऊपर से शुरू करें या किसी सुझाव पर टैप करें।", "ia.apagar": "बातचीत मिटाएँ", "ia.exportar": "निर्यात (.md)", "ia.exportar.feito": "बातचीत Markdown में निर्यात हुई"},
    **{"ia.config": "सेटिंग्स", "ia.config.modelo": "मॉडल", "ia.config.modelo.custom": "कस्टम मॉडल (NVIDIA कैटलॉग id)", "ia.config.temperatura": "टेम्परेचर (रचनात्मकता)", "ia.config.topp": "Top-p (विविधता)", "ia.config.maxtokens": "अधिकतम tokens", "ia.config.thinking": "सोच मोड", "ia.config.thinking.desc": "मॉडल जवाब से पहले सोचता है (reasoning_content)"},
    **{"ia.config.endpoint.edge": "Edge Function", "ia.config.endpoint.proxy": "लोकल प्रॉक्सी", "ia.config.endpoint.directo": "डायरेक्ट (dev — बंडल में कुंजी)"},
    **{"ia.raciocinio": "सोच", "ia.raciocinio.desc": "मॉडल की सोच दिखाएँ/छिपाएँ"},
    **{"ia.stats.tokens": "tokens", "ia.stats.segundo": "tok/s", "ia.stats.primeiro": "पहला tok"},
    **{"ia.erro.ligacao": "AI ने जवाब नहीं दिया — फिर कोशिश करें", "ia.erro.limite": "बहुत सारे कॉल — प्रतीक्षा करें", "ia.erro.parado": "आपने जनरेशन रोक दी"},
    **{"ia.vazio.titulo": "मैं कैसे मदद करूँ?", "ia.vazio.desc": "एक persona चुनें (AI का काम करने का तरीका) और पहला सवाल पूछें — जवाब लाइव आते हैं, token-दर-token।"},
    **{"ia.rodape.honesto": "AI गलती कर सकता है — कोई वित्तीय या कानूनी सलाह नहीं। ज़िम्मेदारी से खेलें, हमेशा।"},
    **{"ia.persona.assistente.nome": "Bateu गाइड", "ia.persona.assistente.desc": "कैसे भाग लें, टिकट, वॉलेट, निकासी — कदम-दर-कदम।", "ia.persona.assistente.s1": "मैं सॉर्टी (raffle) में कैसे भाग लूँ?", "ia.persona.assistente.s2": "टिकट और वॉलेट कैसे काम करते हैं?", "ia.persona.assistente.s3": "सत्यापित विजेता कहाँ देखूँ?"},
    **{"ia.persona.desporto.nome": "कमेंटेटर", "ia.persona.desporto.desc": "फुटबॉल और esports का विश्लेषण, कमेंटेटर अंदाज़ में।", "ia.persona.desporto.s1": "Mambas का वर्तमान फॉर्म विश्लेषण करें", "ia.persona.desporto.s2": "आज का अपना अनुमान कैसे सुधारें?", "ia.persona.desporto.s3": "Bateu का अनुमान सिस्टम समझाएँ"},
    **{"ia.persona.criativo.nome": "क्रिएटिव", "ia.persona.criativo.desc": "कैप्शन, stories, विचार और नाम — तैयार।", "ia.persona.criativo.s1": "मेरे इनाम के story के लिए कैप्शन", "ia.persona.criativo.s2": "मार्केटप्लेस दुकान के लिए 5 नाम", "ia.persona.criativo.s3": "मेरे सॉर्टी का प्रचार करने के वीडियो विचार"},
    **{"ia.persona.tradutor.nome": "अनुवादक", "ia.persona.tradutor.desc": "PT ↔ EN ↔ ES ↔ FR, लहजा बरकरार।", "ia.persona.tradutor.s1": "«Congrats, you won!» का अंग्रेज़ी अनुवाद", "ia.persona.tradutor.s2": "मेरे प्रोडक्ट का विवरण फ्रेंच में अनुवाद करें", "ia.persona.tradutor.s3": "«verified raffle» स्पेनिश में क्या कहलाता है?"},
    **{"ia.persona.programador.nome": "प्रोग्रामर", "ia.persona.programador.desc": "पूरा और सही कोड, चलने योग्य उदाहरणों के साथ।", "ia.persona.programador.s1": "React काउंटडाउन hook", "ia.persona.programador.s2": "zod से फॉर्म कैसे वैलिडेट करें?", "ia.persona.programador.s3": "एरर समझाएँ: Cannot read properties of undefined"},
    **{"ia.persona.pensador.nome": "डीप मोड", "ia.persona.pensador.desc": "धीरे सोचता है, सोच दिखाता है और तथ्य-राय अलग करता है।", "ia.persona.pensador.s1": "सोशल सॉर्टी बनाना ठीक है? फायदे-नुकसान", "ia.persona.pensador.s2": "विश्लेषण: नीलामी या सीधी बिक्री?", "ia.persona.pensador.s3": "20 000 MZN में आदर्श इनाम चुनने में मदद"},
)

BLOCOS = [("en", EN), ("pt", PT), ("pt-BR", PTBR), ("es", ES), ("fr", FR), ("hi", HI)]

with open(CAMINHO, "r", encoding="utf-8") as f:
    linhas = f.readlines()

total = 0
for chave_dict, pares in BLOCOS:
    ancora = f'  "{chave_dict}": {{' if "-" in chave_dict else f"  {chave_dict}: {{"
    idx = None
    for i, linha in enumerate(linhas):
        if linha.rstrip("\n").rstrip() == ancora:
            idx = i
            break
    if idx is None:
        print(f"ÂNCORA NÃO ENCONTRADA: {ancora}")
        sys.exit(1)
    bloco = "".join(f'    {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)},\n' for k, v in pares)
    linhas.insert(idx + 1, bloco)
    total += len(pares)
    print(f"  {chave_dict}: +{len(pares)} chaves")

with open(CAMINHO, "w", encoding="utf-8") as f:
    f.writelines(linhas)

print(f"TOTAL: {total} chaves inseridas")
