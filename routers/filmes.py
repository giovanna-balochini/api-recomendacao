from fastapi import APIRouter, HTTPException
from dotenv import load_dotenv
import httpx
import os
from routers import cache_get, cache_set

load_dotenv()

router = APIRouter()
TMDB_KEY = os.getenv("TMDB_API_KEY")
BASE_URL = "https://api.themoviedb.org/3"
HTTPX_VERIFY = os.getenv("HTTPX_VERIFY", "false").lower() in ("1", "true", "yes")
TMDB_LANGUAGE = "pt-BR"

@router.get("/filmes/populares")
async def filmes_populares():
    if not TMDB_KEY:
        raise HTTPException(status_code=500, detail="TMDB_API_KEY não configurada")

    cache_key = f"tmdb:movie:popular:{TMDB_LANGUAGE}"
    try:
        async with httpx.AsyncClient(timeout=15.0, verify=HTTPX_VERIFY) as client:
            response = await client.get(
                f"{BASE_URL}/movie/popular",
                params={
                    "api_key": TMDB_KEY,
                    "language": TMDB_LANGUAGE,
                },
            )
            response.raise_for_status()
            payload = response.json()
            cache_set(cache_key, payload)
            return payload
    except httpx.HTTPStatusError as exc:
        try:
            payload = exc.response.json()
        except ValueError:
            payload = {"message": exc.response.text}
        raise HTTPException(status_code=exc.response.status_code, detail=payload) from exc
    except (httpx.HTTPError, ValueError) as exc:
        cached = cache_get(cache_key)
        if cached is not None:
            return cached
        return {"page": 1, "results": [], "total_pages": 1, "total_results": 0}

@router.get("/series/populares")
async def series_populares():
    if not TMDB_KEY:
        raise HTTPException(status_code=500, detail="TMDB_API_KEY não configurada")

    cache_key = f"tmdb:tv:popular:{TMDB_LANGUAGE}"
    try:
        async with httpx.AsyncClient(timeout=15.0, verify=HTTPX_VERIFY) as client:
            response = await client.get(
                f"{BASE_URL}/tv/popular",
                params={
                    "api_key": TMDB_KEY,
                    "language": TMDB_LANGUAGE,
                },
            )
            response.raise_for_status()
            payload = response.json()
            cache_set(cache_key, payload)
            return payload
    except httpx.HTTPStatusError as exc:
        try:
            payload = exc.response.json()
        except ValueError:
            payload = {"message": exc.response.text}
        raise HTTPException(status_code=exc.response.status_code, detail=payload) from exc
    except (httpx.HTTPError, ValueError) as exc:
        cached = cache_get(cache_key)
        if cached is not None:
            return cached
        return {"page": 1, "results": [], "total_pages": 1, "total_results": 0}

@router.get("/filmes/buscar")
async def buscar_filmes(genero: str):
    if not TMDB_KEY:
        raise HTTPException(status_code=500, detail="TMDB_API_KEY não configurada")

    generos = {
        "acao": 28, "comedia": 35, "drama": 18,
        "terror": 27, "ficcao": 878, "romance": 10749
    }
    genero_id = generos.get(genero.lower())
    if not genero_id:
        raise HTTPException(status_code=404, detail="Gênero não encontrado")

    cache_key = f"tmdb:discover:movie:genres:{genero_id}:{TMDB_LANGUAGE}"
    try:
        async with httpx.AsyncClient(timeout=15.0, verify=HTTPX_VERIFY) as client:
            response = await client.get(
                f"{BASE_URL}/discover/movie",
                params={
                    "api_key": TMDB_KEY,
                    "language": TMDB_LANGUAGE,
                    "with_genres": genero_id,
                },
            )
            response.raise_for_status()
            payload = response.json()
            cache_set(cache_key, payload)
            return payload
    except httpx.HTTPStatusError as exc:
        try:
            payload = exc.response.json()
        except ValueError:
            payload = {"message": exc.response.text}
        raise HTTPException(status_code=exc.response.status_code, detail=payload) from exc
    except (httpx.HTTPError, ValueError) as exc:
        cached = cache_get(cache_key)
        if cached is not None:
            return cached
        return {"page": 1, "results": [], "total_pages": 1, "total_results": 0}

