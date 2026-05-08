from fastapi import APIRouter, HTTPException
import httpx
import os
import unicodedata
from dotenv import load_dotenv
from routers import cache_get, cache_set

load_dotenv()

router = APIRouter()
TMDB_KEY = os.getenv("TMDB_API_KEY")
TMDB_BASE_URL = "https://api.themoviedb.org/3"
HTTPX_VERIFY = os.getenv("HTTPX_VERIFY", "false").lower() in ("1", "true", "yes")
TMDB_LANGUAGE = "pt-BR"
MAX_RESULTS = int(os.getenv("MAX_RESULTS", "24"))
MAX_PAGES = int(os.getenv("MAX_PAGES", "5"))

GENEROS_FILMES = {
    "acao": 28, "comedia": 35, "drama": 18,
    "romance": 10749, "terror": 27, "ficcao": 878, "suspense": 53
}

GENEROS_TV = {
    "acao": 10759,
    "comedia": 35,
    "drama": 18,
    "ficcao": 10765,
    "suspense": 9648,
}

TEMAS_EN = {
    "acao": "action",
    "comedia": "comedy",
    "drama": "drama",
    "terror": "horror",
    "ficcao": "science fiction",
    "romance": "romance",
    "suspense": "thriller",
}


def _norm(text: str) -> str:
    value = (text or "").strip().lower()
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = " ".join(value.split())
    return value


ALIAS_KEYWORDS = {
    "viagem no tempo": "time travel",
    "viajar no tempo": "time travel",
    "investigacao": "investigation",
    "investigacao policial": "police investigation",
    "detetive": "detective",
    "crime": "crime",
    "assassinato": "murder",
    "serial killer": "serial killer",
    "zumbi": "zombie",
    "zumbis": "zombie",
    "apocalipse": "post-apocalyptic",
    "pos apocaliptico": "post-apocalyptic",
    "super heroi": "superhero",
    "super herois": "superhero",
    "espaco": "space",
    "alien": "alien",
    "extraterrestre": "alien",
    "guerra": "war",
    "medieval": "medieval",
    "mitologia": "mythology",
    "pirata": "pirate",
    "piratas": "pirate",
    "robos": "robot",
    "robo": "robot",
    "inteligencia artificial": "artificial intelligence",
    "ia": "artificial intelligence",
}


async def _keyword_id(client: httpx.AsyncClient, query: str) -> int | None:
    q = (query or "").strip()
    if not q:
        return None

    cache_key = f"tmdb:keyword:search:{q.lower()}"
    cached = cache_get(cache_key)
    if isinstance(cached, int):
        return cached

    response = await client.get(
        f"{TMDB_BASE_URL}/search/keyword",
        params={"api_key": TMDB_KEY, "query": q},
    )
    response.raise_for_status()
    payload = response.json()
    results = payload.get("results", []) if isinstance(payload, dict) else []
    if not results:
        return None

    keyword = results[0].get("id")
    if isinstance(keyword, int):
        cache_set(cache_key, keyword)
        return keyword
    return None


def _movie_item(raw: dict) -> dict | None:
    titulo = raw.get("title")
    if not titulo:
        return None
    return {"titulo": titulo, "ano": (raw.get("release_date") or "")[:4]}


def _tv_item(raw: dict) -> dict | None:
    titulo = raw.get("name")
    if not titulo:
        return None
    return {"titulo": titulo, "ano": (raw.get("first_air_date") or "")[:4]}


async def _collect_tmdb(
    client: httpx.AsyncClient,
    path: str,
    params: dict,
    cache_base: str,
    item_builder,
) -> list[dict]:
    results: list[dict] = []
    seen: set[tuple[str, str]] = set()

    for page in range(1, max(1, MAX_PAGES) + 1):
        page_params = dict(params)
        page_params["page"] = page
        cache_key = f"{cache_base}:page:{page}"
        payload = None

        try:
            resp = await client.get(f"{TMDB_BASE_URL}{path}", params=page_params)
            resp.raise_for_status()
            payload = resp.json()
            if isinstance(payload, dict):
                cache_set(cache_key, payload)
        except (httpx.HTTPError, ValueError):
            cached = cache_get(cache_key)
            if isinstance(cached, dict):
                payload = cached

        for raw in (payload or {}).get("results", []):
            if not isinstance(raw, dict):
                continue
            item = item_builder(raw)
            if not isinstance(item, dict):
                continue
            key = (str(item.get("titulo") or ""), str(item.get("ano") or ""))
            if key in seen:
                continue
            seen.add(key)
            results.append(item)
            if len(results) >= max(1, MAX_RESULTS):
                return results

    return results

@router.get("/recomendar")
async def recomendar(tema: str):
    tema_norm = (tema or "").strip()
    if not TMDB_KEY or not tema_norm:
        return {"filmes": [], "series": []}

    tema_key = _norm(tema_norm)
    tema_en = TEMAS_EN.get(tema_key, tema_norm)
    keyword_query = ALIAS_KEYWORDS.get(tema_key, tema_en)

    genero_id = GENEROS_FILMES.get(tema_key)
    genero_tv_id = GENEROS_TV.get(tema_key)

    filmes = []
    series = []

    async with httpx.AsyncClient(timeout=15.0, verify=HTTPX_VERIFY) as client:
        keyword = None
        if not genero_id or not genero_tv_id:
            try:
                keyword = await _keyword_id(client, keyword_query)
            except httpx.HTTPError:
                keyword = None

        if genero_id:
            filmes = await _collect_tmdb(
                client,
                "/discover/movie",
                {
                    "api_key": TMDB_KEY,
                    "language": TMDB_LANGUAGE,
                    "with_genres": genero_id,
                    "sort_by": "popularity.desc",
                    "include_adult": "false",
                },
                f"tmdb:discover:movie:genres:{genero_id}:{TMDB_LANGUAGE}",
                _movie_item,
            )
        elif keyword:
            filmes = await _collect_tmdb(
                client,
                "/discover/movie",
                {
                    "api_key": TMDB_KEY,
                    "language": TMDB_LANGUAGE,
                    "with_keywords": keyword,
                    "sort_by": "popularity.desc",
                    "include_adult": "false",
                },
                f"tmdb:discover:movie:keywords:{keyword}:{TMDB_LANGUAGE}",
                _movie_item,
            )
        else:
            filmes = await _collect_tmdb(
                client,
                "/search/movie",
                {
                    "api_key": TMDB_KEY,
                    "language": TMDB_LANGUAGE,
                    "query": tema_en,
                    "include_adult": "false",
                },
                f"tmdb:movie:search:{TMDB_LANGUAGE}:{tema_en.lower()}",
                _movie_item,
            )

        if genero_tv_id:
            series = await _collect_tmdb(
                client,
                "/discover/tv",
                {
                    "api_key": TMDB_KEY,
                    "language": TMDB_LANGUAGE,
                    "with_genres": genero_tv_id,
                    "sort_by": "popularity.desc",
                },
                f"tmdb:tv:discover:{TMDB_LANGUAGE}:{genero_tv_id}",
                _tv_item,
            )
        elif keyword:
            series = await _collect_tmdb(
                client,
                "/discover/tv",
                {
                    "api_key": TMDB_KEY,
                    "language": TMDB_LANGUAGE,
                    "with_keywords": keyword,
                    "sort_by": "popularity.desc",
                },
                f"tmdb:discover:tv:keywords:{keyword}:{TMDB_LANGUAGE}",
                _tv_item,
            )
        else:
            series = await _collect_tmdb(
                client,
                "/search/tv",
                {
                    "api_key": TMDB_KEY,
                    "language": TMDB_LANGUAGE,
                    "query": tema_en,
                },
                f"tmdb:tv:search:{TMDB_LANGUAGE}:{tema_en.lower()}",
                _tv_item,
            )

    return {
        "filmes": filmes,
        "series": series,
    }


@router.get("/recomendar/{tema}")
async def recomendar_path(tema: str):
    return await recomendar(tema)
