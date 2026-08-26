import { test, expect } from '@playwright/test';

test.describe('Smoke — app sobe e navega', () => {
  test('dashboard carrega com o veículo do cliente', async ({ page }) => {
    await page.goto('/');
    // dados vêm do MSW (mockDashboard)
    await expect(page.getByText('Fiat Uno')).toBeVisible();
    await expect(page.getByText('SAÚDE')).toBeVisible();
    // bottom nav presente
    await expect(page.getByText('Início')).toBeVisible();
  });

  test('navega pela bottom nav até Perfil e volta', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Perfil' }).click();
    await expect(page).toHaveURL(/\/perfil$/);

    await page.getByRole('link', { name: 'Início' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('Fiat Uno')).toBeVisible();
  });
});
