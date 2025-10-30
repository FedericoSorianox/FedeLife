import { test, expect } from '@playwright/test';
import { FinanzasPage } from '../page-object/finanzas';
import { LoginPage } from '../page-object/login';
import dotenv from 'dotenv';
import path from 'path';
import { networkInterfaces } from 'os';
dotenv.config({ path: path.resolve(__dirname, '..', '.env.development') });


let finanzasPage: FinanzasPage;

const user = process.env.TEST_USER!;
const password = process.env.TEST_PASSWORD!;

test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    finanzasPage = new FinanzasPage(page);
    await loginPage.navegarLogin();
    await loginPage.login(user, password);
    await page.waitForURL('**/finanzas**'); // Espera a que cargue la URL de finanzas
    await finanzasPage.navegarFinanzas();

});

test('should display header and periodo de análisis', async () => {
    expect(await finanzasPage.headerVisible()).toBe(true);
    expect(await finanzasPage.periodoAnalisisVisible()).toBe(true);
});