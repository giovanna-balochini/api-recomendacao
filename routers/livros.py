from fastapi import APIRouter, HTTPException
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
BASE_URL = "https://www.googleapis.com/books/v1"
HTTPX_VERIFY = os.getenv("HTTPX_VERIFY", "false").lower() in ("1", "true", "yes")

@router.get("/livros/buscar")
async def buscar_livros(tema: str):
    try:
        async with httpx.AsyncClient(timeout=15.0, verify=HTTPX_VERIFY) as client:
            response = await client.get(
                f"{BASE_URL}/volumes",
                params={"q": tema, "langRestrict": "pt", "maxResults": 10},
            )
            response.raise_for_status()
            dados = response.json()

            livros = []
            for item in dados.get("items", []):
                info = item.get("volumeInfo", {})
                livros.append({
                    "titulo": info.get("title"),
                    "autor": info.get("authors", []),
                    "editora": info.get("publisher", ""),
                    "ano": info.get("publishedDate", ""),
                    "descricao": info.get("description", ""),
                })
            return {"total": dados.get("totalItems", 0), "livros": livros}
    except httpx.HTTPStatusError as exc:
        try:
            payload = exc.response.json()
        except ValueError:
            payload = {"message": exc.response.text}
        raise HTTPException(status_code=exc.response.status_code, detail=payload) from exc
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(status_code=502, detail="Falha ao consultar a API do Google Books") from exc
