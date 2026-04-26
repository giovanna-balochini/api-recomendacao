# 🎬 API de Recomendação

API REST para recomendação de filmes, séries e livros, construída com FastAPI, integrada ao TMDB e Google Books.

## 🚀 Tecnologias
- Python + FastAPI
- TMDB API (filmes e séries)
- Google Books API (livros)
- Uvicorn

## 📦 Instalação

```bash
git clone https://github.com/giovanna-balochini/api-recomendacao.git
cd api-recomendacao
python -m venv venv
source venv/Scripts/activate
pip install -r requirements.txt
```

## ⚙️ Configuração

Crie um arquivo `.env` na raiz:
            TMDB_API_KEY=sua_chave_aqui
            SSL_CERT_FILE=caminho_do_certificado

## ▶️ Como rodar

```bash
uvicorn main:app --reload
```

Acesse a documentação em: http://127.0.0.1:8000/docs

## 🔗 Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /filmes/populares | Lista filmes populares |
| GET | /series/populares | Lista séries populares |
| GET | /filmes/buscar?genero= | Busca filmes por gênero |
| GET | /livros/buscar?tema= | Busca livros por tema |
| GET | /recomendar?tema= | Recomenda filmes, séries e livros |
