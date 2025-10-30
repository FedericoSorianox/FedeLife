import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-object/login';
import { FinanzasPage } from '../page-object/finanzas';
import dotenv from 'dotenv';
import path from 'path';
import { networkInterfaces } from 'os';
dotenv.config({ path: path.resolve(__dirname, '..', '.env.development') });

const user = process.env.TEST_USER!;
const password = process.env.TEST_PASSWORD!;

test('login', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const finanzasPage = new FinanzasPage(page);
  await loginPage.navegarLogin();
  await loginPage.login(user, password);
  await page.waitForURL('**/finanzas**'); // Espera a que cargue la URL de finanzas
  await finanzasPage.navegarFinanzas();

});