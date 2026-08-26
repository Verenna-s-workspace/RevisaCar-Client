import { test, expect } from '@playwright/test';

test.describe('Adicionar veículo — consulta de placa', () => {
  test('busca pela placa pré-preenche o card editável e salva', async ({ page }) => {
    await page.goto('/veiculos/novo');
    await expect(page.getByText('Adicionar veículo')).toBeVisible();

    // placa conhecida no mock do provedor (mockPlateDb) → Hyundai HB20
    await page.getByPlaceholder('ABC1D23').fill('ABC1D23');
    await page.getByRole('button', { name: 'Buscar' }).click();

    // card editável aparece pré-preenchido
    await expect(page.getByPlaceholder('Fiat')).toHaveValue('Hyundai');
    await expect(page.getByPlaceholder('Uno')).toHaveValue('HB20');
    await expect(page.getByPlaceholder('2020')).toHaveValue('2020');

    // completa km e salva
    await page.getByPlaceholder('45000').fill('30000');
    await page.getByRole('button', { name: 'Salvar veículo' }).click();

    // volta para a lista de veículos
    await expect(page).toHaveURL(/\/veiculo$/);
  });

  test('placa desconhecida cai no preenchimento manual', async ({ page }) => {
    await page.goto('/veiculos/novo');
    await page.getByPlaceholder('ABC1D23').fill('ZZZ9Z99');
    await page.getByRole('button', { name: 'Buscar' }).click();

    // form aparece vazio (modo manual) — salvar bloqueado até marca+modelo
    await expect(page.getByPlaceholder('Fiat')).toHaveValue('');
    await expect(page.getByRole('button', { name: 'Salvar veículo' })).toBeDisabled();

    await page.getByPlaceholder('Fiat').fill('Renault');
    await page.getByPlaceholder('Uno').fill('Kwid');
    await expect(page.getByRole('button', { name: 'Salvar veículo' })).toBeEnabled();
  });
});
