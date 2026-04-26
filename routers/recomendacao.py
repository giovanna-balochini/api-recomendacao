from fastapi import APIRouter, HTTPException
import httpx
import os
from dotenv import load_dotenv
from routers import cache_get, cache_set

load_dotenv()

router = APIRouter()
TMDB_KEY = os.getenv("TMDB_API_KEY")
TMDB_BASE_URL = "https://api.themoviedb.org/3"
BOOKS_URL = "https://www.googleapis.com/books/v1"
HTTPX_VERIFY = os.getenv("HTTPX_VERIFY", "false").lower() in ("1", "true", "yes")
TMDB_LANGUAGE = "pt-BR"

GENEROS_FILMES = {
    "acao": 28, "comedia": 35, "drama": 18,
    "romance": 10749, "terror": 27, "ficcao": 878
}

@router.get("/recomendar")
async def recomendar(tema: str):
    genero_id = GENEROS_FILMES.get(tema.lower())

    filmes = []
    series = []
    livros = []
    tentativas = 0
    falhas = 0

    async with httpx.AsyncClient(timeout=15.0, verify=HTTPX_VERIFY) as client:
        if TMDB_KEY and genero_id:
            cache_key = f"tmdb:discover:movie:genres:{genero_id}:{TMDB_LANGUAGE}"
            tentativas += 1
            try:
                r_filmes = await client.get(
                    f"{TMDB_BASE_URL}/discover/movie",
                    params={
                        "api_key": TMDB_KEY,
                        "language": TMDB_LANGUAGE,
                        "with_genres": genero_id,
                    },
                )
                r_filmes.raise_for_status()
                payload = r_filmes.json()
                cache_set(cache_key, payload)
                filmes = [
                    {
                        "titulo": f.get("title"),
                        "ano": (f.get("release_date") or "")[:4],
                    }
                    for f in payload.get("results", [])[:5]
                ]
            except (httpx.HTTPError, ValueError) as exc:
                cached = cache_get(cache_key)
                if isinstance(cached, dict):
                    filmes = [
                        {
                            "titulo": f.get("title"),
                            "ano": (f.get("release_date") or "")[:4],
                        }
                        for f in cached.get("results", [])[:5]
                    ]
                falhas += 1

        if TMDB_KEY:
            cache_key = f"tmdb:tv:search:{TMDB_LANGUAGE}:{tema.lower()}"
            tentativas += 1
            try:
                r_series = await client.get(
                    f"{TMDB_BASE_URL}/search/tv",
                    params={
                        "api_key": TMDB_KEY,
                        "language": TMDB_LANGUAGE,
                        "query": tema,
                    },
                )
                r_series.raise_for_status()
                payload = r_series.json()
                cache_set(cache_key, payload)
                series = [
                    {
                        "titulo": s.get("name"),
                        "ano": (s.get("first_air_date") or "")[:4],
                    }
                    for s in payload.get("results", [])[:5]
                ]
            except (httpx.HTTPError, ValueError) as exc:
                cached = cache_get(cache_key)
                if isinstance(cached, dict):
                    series = [
                        {
                            "titulo": s.get("name"),
                            "ano": (s.get("first_air_date") or "")[:4],
                        }
                        for s in cached.get("results", [])[:5]
                    ]
                falhas += 1

        tentativas += 1
        try:
            r_livros = await client.get(
                f"{BOOKS_URL}/volumes",
                params={
                    "q": f"subject:{tema}",
                    "langRestrict": "pt",
                    "maxResults": 5,
                },
            )
            r_livros.raise_for_status()
            livros = [
                {
                    "titulo": (l.get("volumeInfo") or {}).get("title"),
                    "autor": (l.get("volumeInfo") or {}).get("authors", []),
                }
                for l in r_livros.json().get("items", [])[:5]
            ]
        except (httpx.HTTPError, ValueError) as exc:
            falhas += 1

    if tentativas > 0 and falhas == tentativas:
        raise HTTPException(status_code=502, detail="Falha ao consultar APIs externas")

    return {
        "filmes": filmes,
        "series": series,
        "livros": livros,
    }
