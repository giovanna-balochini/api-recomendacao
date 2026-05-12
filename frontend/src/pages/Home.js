import React, { useEffect, useMemo, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { getFilmesPopulares, recomendar } from '../services/api';

const generos = [
  { label: 'Ação', value: 'acao' },
  { label: 'Comédia', value: 'comedia' },
  { label: 'Drama', value: 'drama' },
  { label: 'Terror', value: 'terror' },
  { label: 'Suspense', value: 'suspense' },
  { label: 'Ficção', value: 'ficcao' },
  { label: 'Romance', value: 'romance' }
];

const tipos = [
  { label: 'Todos', value: 'todos' },
  { label: 'Filmes', value: 'filmes' },
  { label: 'Séries', value: 'series' }
];

function useCinemaBackdrops() {
  const cacheKey = 'cinema_backdrops_v1';
  const [backdrops, setBackdrops] = useState(() => {
    try {
      const raw = localStorage.getItem(cacheKey);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((u) => typeof u === 'string' && u.startsWith('http')).slice(0, 12);
    } catch {
      return [];
    }
  });

  useEffect(() => {
    let cancelled = false;

    getFilmesPopulares()
      .then((res) => {
        const data = res?.data;
        const items = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

        const imgs = items
          .map((m) => m?.backdrop_path || m?.backdropPath || m?.backdrop_url || m?.backdropUrl)
          .filter(Boolean)
          .slice(0, 12)
          .map((p) => (String(p).startsWith('http') ? p : `https://image.tmdb.org/t/p/w780${p}`));

        if (cancelled) return;

        if (imgs.length > 0) {
          setBackdrops(imgs);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(imgs));
          } catch {
          }
        }
      })
      .catch(() => {
        if (cancelled) return;
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (backdrops.length < 2) return;
    const interval = setInterval(() => {
      setBackdrops((prev) => (prev.length > 1 ? [...prev.slice(1), prev[0]] : prev));
    }, 3500);
    return () => clearInterval(interval);
  }, [backdrops.length]);

  return backdrops;
}

function CinemaBackground({ backdrops }) {
  if (!backdrops || backdrops.length === 0) return null;
  return (
    <BgGrid aria-hidden="true">
      {backdrops.map((url, i) => (
        <BgCell key={`${url}-${i}`} style={{ backgroundImage: `url(${url})` }} />
      ))}
      <BgOverlay />
    </BgGrid>
  );
}

export default function Home() {
  const backdrops = useCinemaBackdrops();
  const [tipo, setTipo] = useState('todos');
  const [tema, setTema] = useState('');
  const [query, setQuery] = useState('');
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const temaAtivo = query.trim() || tema;

  const buscar = async (valor) => {
    const valorNormalizado = String(valor || '').trim();
    if (!valorNormalizado) return;

    setErro('');
    setTema(valorNormalizado);
    setQuery(valorNormalizado);
    setLoading(true);

    try {
      const res = await recomendar(valorNormalizado);
      setResultado(res.data);
    } catch (e) {
      setResultado(null);
      setErro('Não foi possível buscar recomendações. Verifique se o backend está rodando.');
    } finally {
      setLoading(false);
    }
  };

  const sugestoes = useMemo(() => generos, []);

  return (
    <Page>
      <CinemaBackground backdrops={backdrops} />
      <TopGlow />
      <Shell>
        <Header>
          <Brand>
            <BrandMark />
            <BrandName>Recomendador</BrandName>
          </Brand>
          <Title>O que você quer assistir hoje?</Title>
          <Subtitle>Escolha um tema e mergulhe em um mundo de recomendações!</Subtitle>
        </Header>

        <Panel>
          <Row>
            <Tabs aria-label="Filtro de tipo">
              {tipos.map((t) => (
                <Tab
                  key={t.value}
                  type="button"
                  data-active={tipo === t.value}
                  onClick={() => setTipo(t.value)}
                >
                  {t.label}
                </Tab>
              ))}
            </Tabs>

            <Search>
              <SearchInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Digite um tema (ex.: suspense, viagem no tempo, investigação...)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') buscar(query);
                }}
              />
              <PrimaryButton type="button" onClick={() => buscar(query)} disabled={loading}>
                Buscar
              </PrimaryButton>
            </Search>
          </Row>

          <Hint>
            <HintLabel>Sugestões</HintLabel>
            <Chips>
              {sugestoes.map((g) => (
                <Chip
                  key={g.value}
                  type="button"
                  data-active={temaAtivo === g.value}
                  onClick={() => buscar(g.value)}
                  disabled={loading}
                >
                  {g.label}
                </Chip>
              ))}
            </Chips>
          </Hint>

          {erro && (
            <ErrorBanner role="alert">
              <ErrorDot />
              {erro}
            </ErrorBanner>
          )}
        </Panel>

        <Results>
          {loading && (
            <>
              <StatusLine>Buscando recomendações…</StatusLine>
              <SkeletonGrid>
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </SkeletonGrid>
            </>
          )}

          {!loading && !resultado && (
            <Empty>
              <EmptyTitle>Pronto para recomendar</EmptyTitle>
              <EmptyText>Escolha uma sugestão ou digite um tema para ver resultados de filmes e séries.</EmptyText>
            </Empty>
          )}

          {!loading && resultado && (
            <>
              {temaAtivo && <StatusLine>Resultados para: {temaAtivo}</StatusLine>}
              {(tipo === 'todos' || tipo === 'filmes') && (
                <Secao titulo="Filmes" itens={resultado.filmes} campo="titulo" sub="ano" />
              )}
              {(tipo === 'todos' || tipo === 'series') && (
                <Secao titulo="Séries" itens={resultado.series} campo="titulo" sub="ano" />
              )}
            </>
          )}
        </Results>
      </Shell>
    </Page>
  );
}

function temScriptNaoLatino(titulo) {
  const s = String(titulo || '').trim();
  if (!s) return false;
  for (const ch of s) {
    if (!/\p{L}/u.test(ch)) continue;
    if (/\p{Script=Latin}/u.test(ch)) continue;
    return true;
  }
  return false;
}

function normalizarFaixaEtaria(valor) {
  if (valor == null) return '';
  const s = String(valor).trim().toUpperCase();
  if (!s) return '';
  if (s === 'L' || s.includes('LIVRE')) return 'L';
  const match = s.match(/\d{1,2}/);
  if (!match) return '';
  const n = Number(match[0]);
  if (!Number.isFinite(n)) return '';
  if (n < 0 || n > 21) return '';
  return String(n);
}

function Secao({ titulo, itens, campo, sub }) {
  const listaOriginal = Array.isArray(itens) ? itens : [];
  const lista = listaOriginal.filter((item) => !temScriptNaoLatino(item?.[campo]));
  const [expanded, setExpanded] = useState({});
  if (lista.length === 0) return null;

  return (
    <Section>
      <SectionHeader>
        <SectionTitle>{titulo}</SectionTitle>
        <SectionMeta>
          {lista.length}
          {lista.length !== listaOriginal.length ? ` de ${listaOriginal.length}` : ''} itens
        </SectionMeta>
      </SectionHeader>

      <Cards>
        {lista.map((item, i) => {
          const cardKey = `${titulo}-${i}`;
          const poster =
            item?.poster_path || item?.posterPath || item?.poster_url || item?.posterUrl || item?.poster;
          const posterUrl = poster
            ? String(poster).startsWith('http')
              ? poster
              : `https://image.tmdb.org/t/p/w342${poster}`
            : '';
          const backdrop =
            item?.backdrop_path || item?.backdropPath || item?.backdrop_url || item?.backdropUrl || item?.backdrop;
          const backdropUrl = !posterUrl && backdrop
            ? String(backdrop).startsWith('http')
              ? backdrop
              : `https://image.tmdb.org/t/p/w780${backdrop}`
            : '';
          const imageUrl = posterUrl || backdropUrl;
          const fallbackText = String(item?.[campo] ?? '').trim().slice(0, 1).toUpperCase();
          const sinopseRaw =
            item?.overview ||
            item?.sinopse ||
            item?.descricao ||
            item?.description ||
            item?.resumo ||
            item?.plot;
          const sinopse = String(sinopseRaw || '').trim();
          const sinopseCompacta = sinopse.replace(/\s+/g, ' ').trim();
          const hasSinopse = Boolean(sinopseCompacta);
          const isLong = sinopseCompacta.length > 90;
          const isExpanded = Boolean(expanded[cardKey]);
          const faixaEtaria = normalizarFaixaEtaria(
            item?.faixa_etaria ||
              item?.faixaEtaria ||
              item?.classificacao ||
              item?.classificacaoIndicativa ||
              item?.age_rating ||
              item?.ageRating ||
              item?.certification ||
              item?.certificado
          );
          const faixaLabel = faixaEtaria ? (faixaEtaria === 'L' ? 'L' : `${faixaEtaria}+`) : '';

          return (
            <Card key={cardKey}>
              <Poster
                aria-hidden="true"
                data-empty={imageUrl ? 'false' : 'true'}
                style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
              >
                {!imageUrl && <PosterFallback>{fallbackText || '•'}</PosterFallback>}
              </Poster>
              <CardBody>
                <CardTop>
                  <CardTitle>{item?.[campo] ?? 'Sem título'}</CardTitle>
                  <Badges>
                    {faixaLabel && <AgeBadge data-age={faixaEtaria}>{faixaLabel}</AgeBadge>}
                    {item?.[sub] != null && (
                      <Badge>{Array.isArray(item[sub]) ? item[sub].join(', ') : item[sub]}</Badge>
                    )}
                  </Badges>
                </CardTop>
                <CardHint
                  data-expanded={isExpanded ? 'true' : 'false'}
                  data-empty={hasSinopse ? 'false' : 'true'}
                >
                  {hasSinopse ? sinopseCompacta : 'Sinopse indisponível'}
                </CardHint>
                {hasSinopse && isLong && (
                  <ReadMoreButton
                    type="button"
                    onClick={() => setExpanded((prev) => ({ ...prev, [cardKey]: !prev[cardKey] }))}
                  >
                    {isExpanded ? 'Ler menos' : 'Ler mais'}
                  </ReadMoreButton>
                )}
              </CardBody>
            </Card>
          );
        })}
      </Cards>
    </Section>
  );
}

const floatGradient = keyframes`
  0% { transform: translate3d(-10px, -6px, 0) scale(1); opacity: 0.85; }
  50% { transform: translate3d(10px, 6px, 0) scale(1.02); opacity: 1; }
  100% { transform: translate3d(-10px, -6px, 0) scale(1); opacity: 0.85; }
`;

const shimmer = keyframes`
  0% { transform: translateX(-60%); opacity: 0.0; }
  20% { opacity: 0.55; }
  100% { transform: translateX(160%); opacity: 0.0; }
`;

const bgFade = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const Page = styled.div`
  min-height: 100vh;
  color: #eaf0ff;
  background: radial-gradient(1200px 800px at 20% -10%, rgba(229, 9, 20, 0.18), transparent 60%),
    radial-gradient(900px 700px at 90% 10%, rgba(84, 214, 255, 0.16), transparent 58%),
    radial-gradient(1200px 700px at 50% 120%, rgba(120, 90, 255, 0.18), transparent 60%),
    #070815;
  position: relative;
  isolation: isolate;
  overflow-x: hidden;
`;

const TopGlow = styled.div`
  position: absolute;
  inset: -180px -120px auto -120px;
  height: 360px;
  background: radial-gradient(closest-side, rgba(84, 214, 255, 0.18), transparent 65%);
  filter: blur(18px);
  animation: ${floatGradient} 9s ease-in-out infinite;
  z-index: 0;
  pointer-events: none;
`;

const BgGrid = styled.div`
  position: fixed;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 4px;
  transform: scale(1.06);
  z-index: 0;
  pointer-events: none;
`;

const BgCell = styled.div`
  background-size: cover;
  background-position: center;
  filter: brightness(0.45) saturate(0.85);
  transition: opacity 0.8s ease;
  animation: ${bgFade} 600ms ease;
`;

const BgOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(7, 8, 21, 0.6) 0%, rgba(7, 8, 21, 0.88) 100%);
`;

const Shell = styled.div`
  width: min(1120px, calc(100% - 40px));
  margin: 0 auto;
  padding: 44px 0 64px;
  position: relative;
  z-index: 1;
`;

const Header = styled.header`
  text-align: left;
  margin-bottom: 18px;
`;

const Brand = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(10px);
`;

const BrandMark = styled.div`
  width: 14px;
  height: 14px;
  border-radius: 4px;
  background: linear-gradient(135deg, #e50914, #54d6ff);
`;

const BrandName = styled.span`
  font-weight: 700;
  letter-spacing: 0.2px;
  color: rgba(234, 240, 255, 0.9);
`;

const Title = styled.h1`
  margin: 16px 0 8px;
  font-size: clamp(28px, 3.4vw, 44px);
  line-height: 1.08;
  letter-spacing: -0.6px;
`;

const Subtitle = styled.p`
  margin: 0;
  color: rgba(234, 240, 255, 0.72);
  max-width: 70ch;
`;

const Panel = styled.section`
  margin-top: 22px;
  padding: 18px;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.04));
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(14px);
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.45);
`;

const Row = styled.div`
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr;

  @media (min-width: 900px) {
    grid-template-columns: auto 1fr;
    align-items: center;
  }
`;

const Tabs = styled.div`
  display: inline-flex;
  gap: 6px;
  padding: 6px;
  border-radius: 999px;
  background: rgba(7, 8, 21, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.12);
`;

const Tab = styled.button`
  appearance: none;
  border: 0;
  color: rgba(234, 240, 255, 0.85);
  background: transparent;
  padding: 10px 14px;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 600;
  transition: transform 140ms ease, background 140ms ease, color 140ms ease;

  &[data-active='true'] {
    background: linear-gradient(135deg, rgba(229, 9, 20, 0.9), rgba(120, 90, 255, 0.75));
    color: #fff;
  }

  &:hover {
    transform: translateY(-1px);
  }
`;

const Search = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(7, 8, 21, 0.5);
  color: rgba(234, 240, 255, 0.92);
  outline: none;
  transition: border 160ms ease, box-shadow 160ms ease;

  &::placeholder {
    color: rgba(234, 240, 255, 0.45);
  }

  &:focus {
    border-color: rgba(84, 214, 255, 0.55);
    box-shadow: 0 0 0 4px rgba(84, 214, 255, 0.12);
  }
`;

const PrimaryButton = styled.button`
  appearance: none;
  border: 0;
  padding: 12px 16px;
  border-radius: 14px;
  cursor: pointer;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #e50914, #785aff);
  box-shadow: 0 10px 26px rgba(229, 9, 20, 0.18);
  transition: transform 140ms ease, filter 140ms ease;

  &:hover {
    transform: translateY(-1px);
    filter: brightness(1.03);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
    transform: none;
    filter: none;
  }
`;

const Hint = styled.div`
  margin-top: 14px;
  display: grid;
  gap: 10px;
`;

const HintLabel = styled.div`
  color: rgba(234, 240, 255, 0.7);
  font-weight: 600;
  font-size: 0.95rem;
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const Chip = styled.button`
  appearance: none;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(7, 8, 21, 0.35);
  color: rgba(234, 240, 255, 0.9);
  padding: 10px 14px;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 600;
  transition: transform 140ms ease, border 140ms ease, background 140ms ease;

  &[data-active='true'] {
    border-color: rgba(84, 214, 255, 0.6);
    background: rgba(84, 214, 255, 0.12);
  }

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(255, 255, 255, 0.24);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
    transform: none;
  }
`;

const ErrorBanner = styled.div`
  margin-top: 14px;
  padding: 12px 12px;
  border-radius: 14px;
  display: flex;
  gap: 10px;
  align-items: center;
  border: 1px solid rgba(229, 9, 20, 0.35);
  background: rgba(229, 9, 20, 0.08);
  color: rgba(255, 235, 238, 0.92);
`;

const ErrorDot = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #e50914;
  box-shadow: 0 0 0 6px rgba(229, 9, 20, 0.12);
`;

const Results = styled.main`
  margin-top: 18px;
`;

const StatusLine = styled.div`
  margin: 16px 0 12px;
  color: rgba(234, 240, 255, 0.72);
  font-weight: 600;
`;

const Empty = styled.div`
  margin-top: 18px;
  padding: 22px 18px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(7, 8, 21, 0.35);
`;

const EmptyTitle = styled.div`
  font-weight: 800;
  font-size: 1.1rem;
`;

const EmptyText = styled.div`
  margin-top: 6px;
  color: rgba(234, 240, 255, 0.68);
`;

const Section = styled.section`
  margin-top: 16px;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin: 18px 0 12px;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 1.15rem;
  letter-spacing: -0.2px;
`;

const SectionMeta = styled.div`
  color: rgba(234, 240, 255, 0.6);
  font-weight: 600;
  font-size: 0.9rem;
`;

const Cards = styled.div`
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(1, minmax(0, 1fr));

  @media (min-width: 700px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (min-width: 1020px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const Card = styled.div`
  display: grid;
  grid-template-columns: 52px 1fr;
  gap: 12px;
  border-radius: 18px;
  padding: 14px 14px 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(7, 8, 21, 0.2));
  box-shadow: 0 14px 44px rgba(0, 0, 0, 0.35);
  transition: transform 160ms ease, border 160ms ease, box-shadow 160ms ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(84, 214, 255, 0.18);
    box-shadow: 0 18px 60px rgba(0, 0, 0, 0.45);
  }
`;

const Poster = styled.div`
  width: 52px;
  aspect-ratio: 2 / 3;
  border-radius: 14px;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  background-size: cover;
  background-position: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  padding: 8px;

  &[data-empty='true'] {
    background: linear-gradient(135deg, rgba(229, 9, 20, 0.35), rgba(84, 214, 255, 0.25));
  }
`;

const PosterFallback = styled.div`
  width: 22px;
  height: 22px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-weight: 900;
  color: rgba(234, 240, 255, 0.92);
  background: rgba(7, 8, 21, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.12);
`;

const CardBody = styled.div`
  min-width: 0;
`;

const CardTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`;

const Badges = styled.div`
  display: inline-flex;
  gap: 8px;
  align-items: center;
  flex: none;
`;

const CardTitle = styled.div`
  font-weight: 800;
  letter-spacing: -0.2px;
  line-height: 1.2;
`;

const Badge = styled.div`
  flex: none;
  padding: 6px 10px;
  border-radius: 999px;
  font-weight: 800;
  font-size: 0.8rem;
  color: rgba(234, 240, 255, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(7, 8, 21, 0.45);
`;

const AgeBadge = styled(Badge)`
  background: rgba(7, 8, 21, 0.45);

  &[data-age='L'] {
    border-color: rgba(72, 230, 145, 0.35);
    background: rgba(72, 230, 145, 0.12);
  }

  &[data-age='10'] {
    border-color: rgba(84, 214, 255, 0.35);
    background: rgba(84, 214, 255, 0.12);
  }

  &[data-age='12'] {
    border-color: rgba(255, 208, 102, 0.35);
    background: rgba(255, 208, 102, 0.12);
  }

  &[data-age='14'] {
    border-color: rgba(255, 162, 84, 0.35);
    background: rgba(255, 162, 84, 0.12);
  }

  &[data-age='16'] {
    border-color: rgba(255, 84, 84, 0.35);
    background: rgba(255, 84, 84, 0.12);
  }

  &[data-age='18'] {
    border-color: rgba(229, 9, 20, 0.35);
    background: rgba(229, 9, 20, 0.12);
  }
`;

const CardHint = styled.div`
  margin-top: 8px;
  color: rgba(234, 240, 255, 0.62);
  font-weight: 600;
  font-size: 0.76rem;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;

  &[data-expanded='true'] {
    display: block;
    -webkit-line-clamp: initial;
    -webkit-box-orient: initial;
    overflow: visible;
  }

  &[data-empty='true'] {
    color: rgba(234, 240, 255, 0.42);
    font-weight: 500;
  }
`;

const ReadMoreButton = styled.button`
  appearance: none;
  border: 0;
  background: transparent;
  padding: 0;
  margin-top: 6px;
  color: rgba(84, 214, 255, 0.9);
  font-weight: 800;
  font-size: 0.74rem;
  cursor: pointer;
  text-align: left;

  &:hover {
    text-decoration: underline;
  }
`;

const SkeletonGrid = styled.div`
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(1, minmax(0, 1fr));

  @media (min-width: 700px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (min-width: 1020px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const SkeletonCard = styled.div`
  position: relative;
  border-radius: 18px;
  height: 110px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(7, 8, 21, 0.35);
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
    transform: translateX(-60%);
    animation: ${shimmer} 1.2s ease-in-out infinite;
  }
`;
