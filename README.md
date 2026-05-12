# 🎬 API de Recomendação

API REST para recomendação de filmes e séries, construída com FastAPI, integrada ao TMDB.

## 🚀 Tecnologias
- Python + FastAPI
- TMDB API (filmes e séries)
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

```env
TMDB_API_KEY=sua_chave_aqui

# opcionais
HTTPX_VERIFY=false
TMDB_IMAGE_SIZE=w185
TMDB_REGION=BR
DEFAULT_FAIXA_ETARIA=N/D
MAX_RESULTS=24
MAX_PAGES=5
```


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
| GET | /recomendar?tema= | Recomenda filmes e séries por gênero ou tema livre (ex: "viagem no tempo") |
| GET | /recomendar/{tema} | Mesmo endpoint (alternativa sem querystring) |

## 🧾 Resposta do /recomendar

Cada item em `filmes` e `series` inclui:

- `titulo` (string)
- `ano` (string)
- `overview` (string, pode vir vazio)
- `poster_url` (string ou null)
- `faixa_etaria` (string, ex.: `L`, `16+`, `18+`, `N/D`)

