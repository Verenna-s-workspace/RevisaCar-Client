import { useState } from 'react';
import { fotoDoVeiculo } from '../../lib/fotoVeiculo';
import { CarIllustration } from './CarIllustration';

/** Foto real do modelo quando existe no pacote; senão, a ilustração na cor cadastrada. */
export function FotoVeiculo({ marca, modelo, cor, className }: {
  marca?: string; modelo?: string; cor?: string; className?: string;
}) {
  const url = fotoDoVeiculo(marca, modelo);
  const [falhou, setFalhou] = useState(false);
  const nome = [marca, modelo].filter(Boolean).join(' ') || 'Veículo';
  if (!url || falhou) return <CarIllustration color={cor} title={nome} className={className} />;
  return (
    <img src={url} alt={nome} loading="lazy" decoding="async" onError={() => setFalhou(true)}
         className={`${className ?? ''} object-contain select-none`} draggable={false}
         style={{ aspectRatio: '1200 / 750' }} />
  );
}
