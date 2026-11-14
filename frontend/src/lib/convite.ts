/**
 * Convite de oficina.
 *
 * O app da oficina compartilha o link `<app do cliente>/?convite=<código>` (QR,
 * WhatsApp). O código pode chegar antes do login — então guardamos e só usamos
 * depois que o cliente entrar e CONFIRMAR (entrar na carteira da oficina é o
 * consentimento para ela ver o cliente).
 */
const CHAVE = 'revisacar_convite_pendente';

/** UUID (formato do código gerado pela oficina). */
export function codigoValido(codigo: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(codigo.trim());
}

/** Aceita o código puro ou o link inteiro colado pelo cliente. */
export function extrairCodigo(texto: string): string {
  const t = texto.trim();
  try {
    const url = new URL(t);
    const c = url.searchParams.get('convite');
    if (c) return c.trim();
  } catch { /* não é URL */ }
  return t;
}

export function guardarConvitePendente(codigo: string) {
  try { localStorage.setItem(CHAVE, codigo); } catch { /* sem storage */ }
}

export function lerConvitePendente(): string | null {
  try { return localStorage.getItem(CHAVE); } catch { return null; }
}

export function limparConvitePendente() {
  try { localStorage.removeItem(CHAVE); } catch { /* sem storage */ }
}

/** Lê `?convite=` da URL atual, guarda e remove da barra de endereço. */
export function capturarConviteDaUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  const codigo = url.searchParams.get('convite');
  if (!codigo) return null;
  guardarConvitePendente(codigo.trim());
  url.searchParams.delete('convite');
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  return codigo.trim();
}
