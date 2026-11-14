import { test, expect } from '@playwright/test';

test.describe('Smoke — app sobe e navega', () => {
  test('dashboard carrega com o veículo do cliente', async ({ page }) => {
    await page.goto('/');
    // dados vêm do MSW (mockDashboard)
    await expect(page.getByRole('button', { name: /Fiat Uno/ })).toBeVisible();
    await expect(page.getByText('Saúde geral', { exact: true })).toBeVisible();
    // menu flutuante presente
    await expect(page.getByRole('link', { name: 'Início' })).toBeVisible();
  });

  test('navega pelo menu flutuante e volta ao início', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Manutenções' }).click();
    await expect(page).toHaveURL(/\/manutencoes$/);
    await expect(page.getByRole('heading', { name: 'Manutenções' })).toBeVisible();

    await page.getByRole('link', { name: 'Início' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('avatar abre o perfil', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Meu perfil' }).click();
    await expect(page).toHaveURL(/\/perfil$/);
  });
});
