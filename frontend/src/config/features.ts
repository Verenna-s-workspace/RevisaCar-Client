/**
 * Feature flags.
 *
 * SHOWCASE: telas de vitrine/demo que ainda NÃO têm backend real (chat com a
 * oficina, clube de pontos, formas de pagamento, acompanhamento em tempo real,
 * análise de gastos, laudo de inspeção). Ficam visíveis em dev (bom pra demo),
 * mas ESCONDIDAS em produção — para não entregar feature falsa ao usuário final.
 *
 * Resolução:
 *   - VITE_SHOWCASE definido  → obedece ('true'/'false');
 *   - não definido            → liga em dev, desliga em produção.
 */
export const SHOWCASE: boolean =
  import.meta.env.VITE_SHOWCASE !== undefined
    ? import.meta.env.VITE_SHOWCASE === 'true'
    : import.meta.env.MODE !== 'production';
