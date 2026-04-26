from fastapi import FastAPI
from routers import filmes, livros, recomendacao

app = FastAPI()

app.include_router(filmes.router)
app.include_router(livros.router)
app.include_router(recomendacao.router)

@app.get("/")
def read_root():
    return {"message": "API de recomendação funcionando"}
