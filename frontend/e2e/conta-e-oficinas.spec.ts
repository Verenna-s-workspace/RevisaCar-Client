import { test, expect } from '@playwright/test';

// Fluxos reais (contra o MSW): nada aqui pode ser só um aviso na tela.
const CONVITE = '7d1c2a3b-4e5f-4a6b-8c7d-9e0f1a2b3c4d';

test.describe('Oficinas e convite', () => {
  test('link de convite abre a confirmação e entra na oficina', async ({ page }) => {
    await page.goto(`/?convite=${CONVITE}`);
    await expect(page).toHaveURL(/\/oficinas$/);
    await expect(page.getByLabel('Código ou link do convite')).toHaveValue(CONVITE);
    await page.getByRole('button', { name: 'Autorizar e entrar' }).click();
    await expect(page.getByText('Mecânica Bairro', { exact: true })).toBeVisible();
  });

  test('código inválido não habilita o botão', async ({ page }) => {
    await page.goto('/oficinas');
    await page.getByRole('button', { name: 'Entrar em uma oficina' }).click();
    await page.getByLabel('Código ou link do convite').fill('abc');
    await expect(page.getByText('Código inválido')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Autorizar e entrar' })).toBeDisabled();
  });
});

test.describe('Agendamento', () => {
  test('agenda na oficina do cliente com horário vindo da API', async ({ page }) => {
    await page.goto('/agendar');
    await expect(page.getByText('Auto Center Paulista')).toBeVisible();
    await page.getByRole('button', { name: /Troca de Óleo/ }).click();
    await page.getByRole('button', { name: /Escolher Data/ }).click();
    // primeiro dia disponível do calendário
    await page.locator('button:not([disabled])').filter({ hasText: /^\d{1,2}$/ }).first().click();
    await page.getByRole('button', { name: /Escolher Horário/ }).click();
    await page.getByRole('button', { name: '09:00' }).click();
    await page.getByRole('button', { name: /Próximo: Confirmar/ }).click();
    await expect(page.getByText('Auto Center Paulista').last()).toBeVisible();
    await page.getByRole('button', { name: /Confirmar agendamento/ }).click();
    await expect(page.getByText('Agendamento enviado')).toBeVisible();
  });
});

test.describe('Orçamentos da oficina', () => {
  test('mostra o orçamento enviado com os itens', async ({ page }) => {
    await page.goto('/orcamentos');
    await expect(page.getByText('Auto Center Paulista').first()).toBeVisible();
    await expect(page.getByText('Pastilha de freio dianteira')).toBeVisible();
    await expect(page.getByText(/use o link que a oficina enviou/)).toBeVisible();
  });
});

test.describe('Documentos', () => {
  test('anexa um PDF e o documento aparece na lista', async ({ page }) => {
    await page.goto('/documentos');
    await page.getByRole('button', { name: 'Adicionar documento' }).first().click();
    await page.getByLabel('Título').fill('Seguro 2027');
    await page.locator('input[type=file]').setInputFiles({
      name: 'seguro.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 teste'),
    });
    await expect(page.getByText('seguro.pdf')).toBeVisible();
    await page.getByRole('button', { name: 'Salvar documento' }).click();
    await expect(page.getByText('Documento salvo')).toBeVisible();
    await expect(page.getByText('Seguro 2027')).toBeVisible();
  });

  test('baixar entrega um arquivo', async ({ page }) => {
    await page.goto('/documentos');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar CRLV 2026' }).click();
    expect((await download).suggestedFilename()).toBe('crlv-2026.pdf');
  });
});

test.describe('Conta', () => {
  test('excluir conta exige EXCLUIR e a senha', async ({ page }) => {
    await page.goto('/excluir-conta');
    const botao = page.getByRole('button', { name: 'Excluir permanentemente' });
    await page.getByPlaceholder('EXCLUIR').fill('EXCLUIR');
    await expect(botao).toBeDisabled();
    await page.getByLabel('Sua senha').fill('senha12345');
    await expect(botao).toBeEnabled();
  });

  test('exportar dados baixa um JSON', async ({ page }) => {
    await page.goto('/privacidade');
    const download = page.waitForEvent('download');
    await page.getByText('Baixar meus dados').click();
    expect((await download).suggestedFilename()).toMatch(/^revisacar-meus-dados-.*\.json$/);
  });
});

test.describe('Veículo', () => {
  test('detalhe tem abas com dados reais', async ({ page }) => {
    await page.goto('/veiculo/v1');
    await expect(page.getByText('ABC-1234')).toBeVisible();
    await page.getByRole('tab', { name: 'Manutenção' }).click();
    await expect(page.getByText('Troca de Óleo')).toBeVisible();
    await page.getByRole('tab', { name: 'Documentos' }).click();
    await expect(page.getByText('CRLV 2026')).toBeVisible();
  });
});
