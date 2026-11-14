import { useId } from 'react';

/**
 * Ilustração genérica de carro (lateral, crossover) para os cards do veículo.
 * Não temos foto do carro de cada cliente: a cor da carroceria vem da cor
 * cadastrada (Branco, Prata, Preto, Vermelho...). Puro SVG, sem imagem externa.
 */
const CORES: Record<string, [string, string, string]> = {
  // [topo, base, reflexo]
  branco:   ['#FBFBFA', '#D5D8DC', '#FFFFFF'],
  prata:    ['#ECEEF1', '#A3A9B1', '#FFFFFF'],
  cinza:    ['#A7ADB5', '#5C626B', '#D9DDE2'],
  grafite:  ['#7A8089', '#3E434A', '#B9BEC5'],
  preto:    ['#565B63', '#17191D', '#8A9098'],
  vermelho: ['#E2483B', '#8E1A12', '#F6A097'],
  azul:     ['#4D7EC6', '#1C3866', '#A9C4EC'],
  verde:    ['#4F8F6C', '#1F4A33', '#A6D2B8'],
  amarelo:  ['#F2C744', '#B07F0B', '#FBE7A6'],
  laranja:  ['#F08A3E', '#A44A10', '#F9C8A2'],
  marrom:   ['#8C6449', '#4A3020', '#C9A68C'],
  bege:     ['#E6D7BF', '#B39C78', '#F7EEDF'],
  dourado:  ['#D9B667', '#8F6C1F', '#F2E1B4'],
  vinho:    ['#8A2433', '#4A0F19', '#C97A86'],
};

function paleta(cor?: string) {
  const k = (cor ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const chave = Object.keys(CORES).find(c => k.includes(c));
  return CORES[chave ?? 'prata'];
}

export function CarIllustration({ color, className, title }: { color?: string; className?: string; title?: string }) {
  const id = useId().replace(/:/g, '');
  const [topo, base, reflexo] = paleta(color);

  const Roda = ({ cx }: { cx: number }) => (
    <g>
      <circle cx={cx} cy={154} r={36} fill="#1C1E22" />
      <circle cx={cx} cy={154} r={34} fill={`url(#pneu-${id})`} />
      <circle cx={cx} cy={154} r={23} fill={`url(#aro-${id})`} stroke="#8B9098" strokeWidth={1} />
      {[0, 72, 144, 216, 288].map(a => (
        <rect key={a} x={cx - 2.4} y={133} width={4.8} height={18} rx={2.4} fill="#6E737B"
              transform={`rotate(${a} ${cx} 154)`} />
      ))}
      <circle cx={cx} cy={154} r={6} fill="#5A5F66" />
      <circle cx={cx} cy={154} r={2.4} fill="#C9CDD2" />
    </g>
  );

  return (
    <svg viewBox="0 0 480 200" className={className} role="img" aria-label={title ?? 'Ilustração do veículo'}>
      <defs>
        <linearGradient id={`lat-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={topo} />
          <stop offset="1" stopColor={base} />
        </linearGradient>
        <linearGradient id={`vidro-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3A4049" />
          <stop offset="0.55" stopColor="#1E2228" />
          <stop offset="1" stopColor="#2C3139" />
        </linearGradient>
        <radialGradient id={`aro-${id}`} cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#F2F3F5" />
          <stop offset="0.6" stopColor="#B4B9C0" />
          <stop offset="1" stopColor="#7D838B" />
        </radialGradient>
        <radialGradient id={`pneu-${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.7" stopColor="#2A2D32" />
          <stop offset="1" stopColor="#141518" />
        </radialGradient>
        <radialGradient id={`sombra-${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="0.28" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* sombra no chão */}
      <ellipse cx="244" cy="188" rx="222" ry="12" fill={`url(#sombra-${id})`} />

      {/* carroceria (SUV: cintura alta, vidros baixos, balanços curtos) */}
      <path
        d="M50 154 L36 152 Q25 150 25 138 L26 112 Q27 99 38 93 L62 66 Q73 55 100 53 L262 49
           Q302 49 326 64 L368 92 Q422 98 445 106 Q459 110 460 124 L461 140 Q461 152 449 154 L412 154
           A42 42 0 0 0 328 154 L158 154 A42 42 0 0 0 74 154 Z"
        fill={`url(#lat-${id})`}
      />
      {/* parte inferior mais escura (dá peso ao carro) */}
      <path d="M26 128 L460 128 L461 140 Q461 152 449 154 L412 154 A42 42 0 0 0 328 154 L158 154 A42 42 0 0 0 74 154
               L50 154 L36 152 Q25 150 25 138 Z" fill="#000" opacity="0.06" />
      {/* saia lateral */}
      <path d="M158 154 L328 154 L326 145 L160 145 Z" fill="#2B2F35" opacity="0.85" />
      {/* vinco e reflexo */}
      <path d="M40 110 Q240 100 452 114" stroke={reflexo} strokeWidth="3" fill="none" opacity="0.95" />
      <path d="M42 124 Q240 116 456 128" stroke="#000" strokeOpacity="0.07" strokeWidth="1.5" fill="none" />

      {/* vidros (com coluna B) */}
      <path d="M70 93 Q76 70 102 63 L210 58 L210 93 Z" fill={`url(#vidro-${id})`} />
      <path d="M218 58 Q280 55 308 66 Q328 76 346 93 L218 93 Z" fill={`url(#vidro-${id})`} />
      <path d="M108 66 L200 61" stroke="#fff" strokeOpacity="0.16" strokeWidth="4" strokeLinecap="round" fill="none" />

      {/* portas e maçanetas */}
      <path d="M214 95 L212 144" stroke="#000" strokeOpacity="0.12" strokeWidth="1.4" />
      <path d="M150 95 Q146 122 158 144" stroke="#000" strokeOpacity="0.1" strokeWidth="1.4" fill="none" />
      <path d="M318 95 Q326 122 328 144" stroke="#000" strokeOpacity="0.1" strokeWidth="1.4" fill="none" />
      <rect x="178" y="103" width="18" height="4" rx="2" fill="#000" opacity="0.18" />
      <rect x="278" y="103" width="18" height="4" rx="2" fill="#000" opacity="0.18" />

      {/* retrovisor */}
      <path d="M344 90 Q354 84 362 90 L360 98 Q350 100 344 96 Z" fill={base} />

      {/* faróis e lanterna */}
      <path d="M432 108 Q450 109 456 116 L442 118 Q434 116 430 112 Z" fill="#FFF8E6" stroke="#C9CDD2" strokeWidth="0.8" />
      <path d="M27 99 L38 95 L39 120 L27 122 Z" fill="#CC1400" />
      {/* para-choques */}
      <path d="M440 140 L460 138" stroke="#2B2F35" strokeWidth="5" strokeLinecap="round" opacity="0.7" />
      <path d="M27 138 L46 139" stroke="#2B2F35" strokeWidth="5" strokeLinecap="round" opacity="0.7" />

      <Roda cx={116} />
      <Roda cx={370} />
    </svg>
  );
}
