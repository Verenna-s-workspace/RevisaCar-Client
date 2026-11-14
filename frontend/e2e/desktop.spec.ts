import { test, expect } from '@playwright/test';

// Versão desktop (≥ 1024px): barra lateral com rótulos no lugar da barra de abas e modais centrados.
test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false });

test('barra lateral navega e a barra de abas some', async ({ page }) => {
  await page.goto('/');
  const menu = page.getByRole('navigation', { name: 'Menu principal' });
  await expect(menu).toHaveCount(1); // só a barra lateral fica visível
  await menu.getByRole('link', { name: 'Orçamentos' }).click();
  await expect(page).toHaveURL(/\/orcamentos$/);
  await expect(page.getByRole('heading', { name: 'Orçamentos' })).toBeVisible();
  // página do menu não mostra "voltar" no desktop
  await expect(page.getByRole('button', { name: 'Voltar' })).toBeHidden();
});

test('Início mostra próxima manutenção, status e últimos serviços', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Próxima manutenção')).toBeVisible();
  await expect(page.getByText('Status atual')).toBeVisible();
  await expect(page.getByText('Últimos serviços')).toBeVisible();
});

test('barra lateral tem grupos com rótulos e Sair', async ({ page }) => {
  await page.goto('/');
  const lateral = page.locator('aside');
  await expect(lateral.getByText('Oficina', { exact: true })).toBeVisible();
  await expect(lateral.getByRole('link', { name: 'Minhas oficinas' })).toBeVisible();
  await expect(lateral.getByRole('button', { name: 'Sair da conta' })).toBeVisible();
});

test('modal centrado fecha com Esc', async ({ page }) => {
  await page.goto('/oficinas');
  await page.getByRole('button', { name: 'Entrar em uma oficina' }).click();
  const dialog = page.getByRole('dialog', { name: 'Entrar em uma oficina' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
