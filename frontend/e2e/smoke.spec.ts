import { test, expect } from '@playwright/test';

test.describe('Smoke — app sobe e navega', () => {
  test('Meu carro carrega com o veículo do cliente', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Meu carro' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Fiat Uno/ })).toBeVisible();
    await expect(page.getByText('Saúde geral', { exact: true })).toBeVisible();
    // barra de abas com rótulos
    const abas = page.getByRole('navigation', { name: 'Menu principal' });
    for (const nome of ['Meu carro', 'Manutenção', 'Agendar', 'Serviços', 'Conta']) {
      await expect(abas.getByRole('link', { name: nome })).toBeVisible();
    }
  });

  test('navega pelas abas e volta', async ({ page }) => {
    await page.goto('/');
    const abas = page.getByRole('navigation', { name: 'Menu principal' });
    await abas.getByRole('link', { name: 'Manutenção' }).click();
    await expect(page).toHaveURL(/\/manutencoes$/);
    await expect(page.getByRole('heading', { name: 'Manutenção' })).toBeVisible();
    await abas.getByRole('link', { name: 'Meu carro' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('aba Conta abre a conta', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation', { name: 'Menu principal' }).getByRole('link', { name: 'Conta' }).click();
    await expect(page).toHaveURL(/\/perfil$/);
    await expect(page.getByRole('heading', { name: 'Conta' })).toBeVisible();
  });
});
