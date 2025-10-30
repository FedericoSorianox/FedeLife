import { Locator, Page } from '@playwright/test';

export class LoginPage {
    readonly page: Page;
    readonly header: Locator;
    readonly emailTextBox: Locator;
    readonly passwordTextBox: Locator;
    readonly loginButton: Locator;


    constructor(page: Page) {
        this.page = page;
        this.header = page.getByRole('heading', { name: 'Iniciar Sesión' });
        this.emailTextBox = page.getByRole('textbox', { name: 'Email o Usuario' });
        this.passwordTextBox = page.getByRole('textbox', { name: 'Contraseña' });
        this.loginButton = page.getByRole('button', { name: 'Iniciar Sesión' });
    }

    async navegarLogin() {
        await this.page.goto('http://localhost:3000/login');
    }

    async login(email: string, password: string) {
        await this.emailTextBox.fill(email);
        await this.passwordTextBox.fill(password);
        await this.loginButton.click();
    }

    async headerVisible() {
        return await this.header.isVisible();
    }
}
