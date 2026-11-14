import { test, expect } from '@playwright/test';

// Versão desktop (≥ 1024px): menu de ícones no topo no lugar do menu flutuante e modais centrados.
test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false });

test('menu do topo navega e o menu flutuante some', async ({ page }) => {
  await page.goto('/');
  const menu = page.getByRole('navigation', { name: 'Menu principal' });
  await expect(menu).toHaveCount(1); // só o do topo fica visível
  await menu.getByRole('link', { name: 'Orçamentos' }).click();
  await expect(page).toHaveURL(/\/orcamentos$/);
  await expect(page.getByRole('heading', { name: 'Orçamentos' })).toBeVisible();
  // página do menu não mostra "voltar" no desktop
  await expect(page.getByRole('button', { name: 'Voltar' })).toBeHidden();
});

test('painel mostra saúde, manutenções e custo', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Saúde' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Próximas manutenções/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Custo de manutenção' })).toBeVisible();
});

test('menu da conta tem Sair', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Conta' }).click();
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
});

test('modal centrado fecha com Esc', async ({ page }) => {
  await page.goto('/oficinas');
  await page.getByRole('button', { name: 'Entrar em uma oficina' }).click();
  const dialog = page.getByRole('dialog', { name: 'Entrar em uma oficina' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
