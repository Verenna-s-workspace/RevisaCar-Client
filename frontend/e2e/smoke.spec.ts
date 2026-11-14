import { test, expect } from '@playwright/test';

test.describe('Smoke — app sobe e navega', () => {
  test('Início carrega com o veículo do cliente', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Olá/ })).toBeVisible();
    await expect(page.getByText('Próxima manutenção')).toBeVisible();
    await expect(page.getByRole('img', { name: /Fiat Uno/ })).toBeVisible(); // foto real do modelo
    const abas = page.getByRole('navigation', { name: 'Menu principal' });
    for (const nome of ['Início', 'Serviços', 'Agendar', 'Veículo', 'Perfil']) {
      await expect(abas.getByRole('link', { name: nome })).toBeVisible();
    }
  });

  test('navega pelas abas e volta', async ({ page }) => {
    await page.goto('/');
    const abas = page.getByRole('navigation', { name: 'Menu principal' });
    await abas.getByRole('link', { name: 'Veículo' }).click();
    await expect(page).toHaveURL(/\/veiculo$/);
    await expect(page.getByRole('heading', { name: 'Meus veículos' })).toBeVisible();
    await abas.getByRole('link', { name: 'Início' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('aba Perfil abre o perfil', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation', { name: 'Menu principal' }).getByRole('link', { name: 'Perfil' }).click();
    await expect(page).toHaveURL(/\/perfil$/);
    await expect(page.getByRole('heading', { name: 'Perfil' })).toBeVisible();
  });
});
