import { test, expect } from '@playwright/test';

// Versão desktop (≥ 1024px): sidebar no lugar da bottom nav e modais centrados.
test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false });

test('sidebar navega e a bottom nav some', async ({ page }) => {
  await page.goto('/');
  const sidebar = page.locator('aside');
  await expect(sidebar).toBeVisible();
  await expect(page.getByRole('link', { name: 'Início' }).last()).toBeVisible();
  // a bottom nav (celular) fica escondida
  await expect(page.locator('nav.fixed')).toBeHidden();

  await sidebar.getByRole('link', { name: 'Orçamentos' }).click();
  await expect(page).toHaveURL(/\/orcamentos$/);
  await expect(page.getByRole('heading', { name: 'Orçamentos' })).toBeVisible();
  // página da sidebar não mostra "voltar" no desktop
  await expect(page.getByRole('button', { name: 'Voltar' })).toBeHidden();
});

test('botão Agendar serviço da sidebar abre o agendamento', async ({ page }) => {
  await page.goto('/documentos');
  await page.getByRole('button', { name: 'Agendar serviço' }).click();
  await expect(page).toHaveURL(/\/agendar$/);
});

test('modal centrado fecha com Esc', async ({ page }) => {
  await page.goto('/oficinas');
  await page.getByRole('button', { name: 'Entrar em uma oficina' }).click();
  const dialog = page.getByRole('dialog', { name: 'Entrar em uma oficina' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
