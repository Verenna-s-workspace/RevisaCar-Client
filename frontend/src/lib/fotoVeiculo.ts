import indice from '../data/veiculos-indice.json';

/**
 * Foto do veículo do cliente (pacote de 265 modelos, Wikimedia Commons — ver
 * tela "Créditos de imagens"). Casa marca + modelo do cadastro com o índice;
 * sem correspondência, o app usa a ilustração genérica.
 */
type Entrada = [id: string, marca: string, modelo: string];
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

const ENTRADAS = (indice as Entrada[]).map(([id, marca, modelo]) => ({ id, marca: norm(marca), modelo: norm(modelo) }));
const cache = new Map<string, string | null>();

export function fotoDoVeiculo(marca?: string, modelo?: string): string | null {
  if (!modelo) return null;
  const chave = `${marca ?? ''}|${modelo}`;
  if (cache.has(chave)) return cache.get(chave)!;
  const m = norm(modelo);
  const b = norm(marca ?? '');
  const mesmaMarca = ENTRADAS.filter(e => !b || e.marca === b || b.includes(e.marca) || e.marca.includes(b));
  // 1) modelo idêntico; 2) cadastro começa com o modelo ("onix plus ltz" → "onix plus"); 3) modelo contido.
  const achado =
    mesmaMarca.find(e => e.modelo === m) ??
    [...mesmaMarca].sort((x, y) => y.modelo.length - x.modelo.length).find(e => m.startsWith(`${e.modelo} `) || m === e.modelo) ??
    [...mesmaMarca].sort((x, y) => y.modelo.length - x.modelo.length).find(e => m.includes(e.modelo) && e.modelo.length >= 3);
  const url = achado ? `/veiculos/${achado.id}.webp` : null;
  cache.set(chave, url);
  return url;
}
