import { test, expect } from '@playwright/test';

// Rotas com cobertura de mock (MSW) que devem renderizar sem estourar o
// ErrorBoundary ("Algo deu errado"). Guarda regressão de render/rota.
const ROUTES = [
  '/veiculo',
  '/orcamentos',
  '/historico',
  '/perfil',
  '/notificacoes',
  '/documentos',
  '/gastos',
  '/preferencias',
];

for (const route of ROUTES) {
  test(`rota ${route} renderiza sem crash`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('#root')).not.toBeEmpty();
    await expect(page.getByText('Algo deu errado')).toHaveCount(0);
  });
}
