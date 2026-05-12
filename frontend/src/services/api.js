import axios from 'axios'

const api = axios.create({
    baseURL: 'http://127.0.0.1:8000'
})

export const getFilmesPopulares = () => api.get('/filmes/populares');
export const getSeriesPopulares = () => api.get('/series/populares');   
export const buscarFilmes = (genero) => api.get(`/filmes/buscar?genero=${genero}`);
export const recomendar = (tema) => api.get(`/recomendar?tema=${tema}`);

export default api;
