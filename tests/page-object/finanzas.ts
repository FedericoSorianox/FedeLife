import { Locator, Page } from '@playwright/test';

export class FinanzasPage {
    readonly page: Page;

    readonly header: Locator;
    readonly periodoAnalisis: Locator;
    readonly transaccionesSection: Locator;
    readonly tipoTransaccionField: Locator;
    readonly monedaField: Locator;
    readonly fechaField: Locator;
    readonly descriptionField: Locator;
    readonly categoriaField: Locator;
    readonly montoField: Locator;
    readonly agregarTransaccionButton: Locator;


    constructor(page: Page) {
        this.page = page;
        this.header = page.locator('header');
        this.periodoAnalisis = page.getByText('Período de AnálisisOctubre 2025MensualAnual');
        this.transaccionesSection = page.getByRole('button', { name: 'Transacciones Mostrar' })
        this.tipoTransaccionField = page.getByRole('button', { name: 'Transacciones Mostrar' });
        this.monedaField = page.getByRole('combobox').nth(1);
        this.fechaField = page.locator('input[type="date"]');
        this.categoriaField = page.getByRole('combobox').nth(2);
        this.descriptionField = page.getByRole('textbox', { name: 'Descripción de la transacción' });
        this.montoField = page.getByPlaceholder('0.00');
        this.agregarTransaccionButton = page.getByRole('button', { name: 'Agregar Transacción' });
    }

    async navegarFinanzas() {
        await this.page.goto('/finanzas');
    }

    async getBalance() {
        return await this.page.locator('#balance').innerText();
    }

    async agregarTransaccion(amount: number, description: string) {
        await this.montoField.fill(amount.toString());
        await this.descriptionField.fill(description);
        await this.fechaField.fill(new Date().toISOString().split('T')[0]);
        await this.categoriaField.selectOption({ label: 'Categoría de la transacción' });
        await this.monedaField.selectOption({ label: 'UYU' });
        await this.agregarTransaccionButton.click();
    }
    async abrirTransacciones() {
        await this.transaccionesSection.click();
    }
    async periodoAnalisisVisible() {
        return await this.periodoAnalisis.isVisible();
    }
    async headerVisible() {
        return await this.header.isVisible();
    }
}
