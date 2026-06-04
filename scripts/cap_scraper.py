import os
import firebase_admin
from firebase_admin import credentials, firestore
from bs4 import BeautifulSoup
import requests
import json
import time
from google import genai

# ==============================================================================
# SCRIPT DE EXTRAÇÃO, TRADUÇÃO E UPLOAD DE QUESTÕES OFICIAIS CAP (ESPANHA)
# ==============================================================================
# Este script realiza as seguintes etapas:
# 1. Scraping: Acessa um banco de questões ou site espanhol para extrair as perguntas.
# 2. IA Tradutora: Usa o modelo Gemini para traduzir o texto de ES para PT com precisão.
# 3. Categorização: Separa as questões por "Comunidade Autônoma" (ex: Madrid, Andaluzia, Nacional).
# 4. Upload: Sincroniza diretamente com o seu Firebase Firestore da nuvem.

# 1. Configurando Firebase Admin
# Baixe a chave de serviço JSON em: Firebase Console -> Project Settings -> Service Accounts
FIREBASE_CREDENTIALS_PATH = "./firebase-service-account.json"

try:
    cred = credentials.Certificate(FIREBASE_CREDENTIALS_PATH)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✅ Firebase conectado com sucesso!")
except Exception as e:
    print("⚠️  Aviso: Firebase não conectado. Adicione firebase-service-account.json para upload.")
    db = None

# 2. Configurando a API do Gemini para Tradução Nativa e Precisa
# (A API Key do Google AI Studio pode ser colocada nas variáveis de ambiente)
try:
    gemini_client = genai.Client()
    print("✅ Gemini API configurada!")
except Exception as e:
    gemini_client = None
    print("⚠️ Aviso: Gemini API não configurada. Defina GEMINI_API_KEY no terminal.")

def translate_es_to_pt(text_es: str) -> str:
    """Traduz o texto com precisão para Português, focando no contexto rodoviário e mecânico."""
    if not gemini_client:
        return "[Tradução Automática Pendente]" # Fallback
    
    prompt = f"Traduza a seguinte frase sobre regras de trânsito e condução profissional da Espanha (CAP) para o Português de Portugal de forma técnica e precisa. Responda APENAS com a tradução:\n\n{text_es}"
    response = gemini_client.models.generate_content(
        model='gemini-3.1-pro',
        contents=prompt,
    )
    return response.text.strip()

# ==========================================================
# EXEMPLO DE FUNÇÃO DE SCRAPING (A SER ADAPTADA AO SITE REAL)
# ==========================================================
def scrape_official_questions(url, community_name="Nacional"):
    """
    Exemplo de lógica de Web Scraping usando BeautifulSoup.
    (Você deve inspecionar o site alvo e ajustar as classes/tags HTML)
    """
    print(f"🔍 Iniciando scraping para comunidade: {community_name}")
    try:
        # Simulando uma resposta ou fazendo um GET real (descomente a linha abaixo)
        # response = requests.get(url) 
        # soup = BeautifulSoup(response.text, 'html.parser')
        
        # Exemplo Mock (Substituir pelo seu parse de HTML real)
        mock_scraped_questions = [
            {
                "id": f"scraped_{int(time.time())}_1",
                "category": "Reglamentación",
                "question_es": "¿Cada cuánto tiempo debe renovarse la tarjeta CAP?",
                "options": [
                    {"id": "o1", "text_es": "Cada 5 años.", "isCorrect": True},
                    {"id": "o2", "text_es": "Cada 10 años.", "isCorrect": False},
                    {"id": "o3", "text_es": "No caduca nunca.", "isCorrect": False}
                ],
                "explanation_es": "La tarjeta de cualificación del conductor tiene un período de validez máximo de cinco años."
            }
        ]
        
        return [(q, community_name) for q in mock_scraped_questions]

    except Exception as e:
        print(f"Erro no scraping: {e}")
        return []

# ==========================================================
# PROCESSAMENTO E TRADUÇÃO COM GEMINI
# ==========================================================
def process_and_upload_questions(scraped_data):
    if not db:
        print("Cancelando upload, DB não conectado.")
        return

    print(f"⚙️ Processando {len(scraped_data)} questões...")
    for q_data, community in scraped_data:
        print(f"Tratando questão: {q_data['question_es']}")
        
        # 1. Traduzir a pergunta
        question_pt = translate_es_to_pt(q_data['question_es'])
        
        # 2. Traduzir as opções
        options_formatted = []
        for opt in q_data['options']:
            opt_pt = translate_es_to_pt(opt['text_es'])
            options_formatted.append({
                "id": opt["id"],
                "text": { "es": opt["text_es"], "pt": opt_pt, "en": "" },
                "isCorrect": opt["isCorrect"]
            })
            
        # 3. Traduzir a explicação
        explanation_pt = translate_es_to_pt(q_data['explanation_es'])
        
        # 4. Formatar o Documento para o Firestore
        firestore_document = {
            "id": q_data["id"],
            "category": q_data["category"],
            "community": community,
            "question": { "es": q_data["question_es"], "pt": question_pt, "en": "" },
            "options": options_formatted,
            "explanation": { "es": q_data["explanation_es"], "pt": explanation_pt, "en": "" }
        }
        
        # 5. Salvar na coleção 'quizzes' do Firebase
        db.collection('quizzes').document(q_data["id"]).set(firestore_document)
        print(f"✅ Uploaded: {q_data['id']} ({community})")
        
        # Rate limit simulation para APIs
        time.sleep(1)

# Ponto de Entrada Local
if __name__ == "__main__":
    url_alvo = "https://exemplo-web-cap-espanha.com/testes/nacional"
    dados = scrape_official_questions(url_alvo, community_name="Nacional")
    
    if dados:
        process_and_upload_questions(dados)
    else:
        print("Nenhum dado capturado.")
