import { type ReactNode, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate, type PanInfo } from 'framer-motion';

/**
 * Linha com ação ao deslizar (padrão iOS): deslize para a esquerda para revelar
 * a ação; deslizar até o fim executa. Acompanha o dedo 1:1, resiste no limite e
 * volta com mola. A ação também fica acessível por botão (teclado/leitor de tela).
 */
const MOLA = { type: 'spring' as const, bounce: 0, duration: 0.35 };
const LARGURA_ACAO = 88;

export function SwipeRow({ children, actionLabel, actionColor = 'var(--red)', onAction, icon }: {
  children: ReactNode; actionLabel: string; actionColor?: string; onAction: () => void; icon?: ReactNode;
}) {
  const x = useMotionValue(0);
  const ref = useRef<HTMLDivElement>(null);
  // A cor da ação só aparece quando a linha começa a deslizar.
  const opacidade = useTransform(x, [-24, 0], [1, 0]);

  const soltar = (_: unknown, info: PanInfo) => {
    const largura = ref.current?.offsetWidth ?? 360;
    // projeção de momento: um arremesso curto também conta
    const destino = info.offset.x + (info.velocity.x / 1000) * 0.998 / (1 - 0.998);
    if (destino < -largura * 0.6) {
      animate(x, -largura, { ...MOLA, velocity: info.velocity.x }).then(onAction);
    } else if (destino < -LARGURA_ACAO / 2) {
      animate(x, -LARGURA_ACAO, { ...MOLA, velocity: info.velocity.x });
    } else {
      animate(x, 0, { ...MOLA, velocity: info.velocity.x });
    }
  };

  return (
    <div ref={ref} className="relative overflow-hidden rounded-2xl">
      <motion.div aria-hidden className="absolute inset-0 rounded-2xl" style={{ background: actionColor, opacity: opacidade }} />
      <motion.button type="button" onClick={onAction}
        className="absolute inset-y-0 right-0 flex flex-col items-center justify-center gap-1 text-white t-footnote font-semibold focus:opacity-100"
        style={{ width: LARGURA_ACAO, opacity: opacidade }}>
        {icon}{actionLabel}
      </motion.button>
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -LARGURA_ACAO, right: 0 }}
        dragElastic={{ left: 0.6, right: 0.05 }}
        dragMomentum={false}
        onDragEnd={soltar}
        style={{ x, touchAction: 'pan-y' }}
        className="relative"
      >
        {children}
      </motion.div>
    </div>
  );
}
