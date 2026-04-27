from fastapi import FastAPI
from routers import filmes, recomendacao
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://192.168.15.124:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(filmes.router)
app.include_router(recomendacao.router)

@app.get("/")
def read_root():
    return {"message": "API de recomendação funcionando"}
