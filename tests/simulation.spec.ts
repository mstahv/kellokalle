import { test, expect } from '@playwright/test';

test.describe('Simulaatiotila', () => {
  test('simulaatiotilan valintaruutu on oletuksena valittuna', async ({ page }) => {
    await page.goto('/');

    const checkbox = page.locator('input[type="checkbox"]');
    await expect(checkbox).toBeChecked();

    // Tarkista että info-laatikko näkyy
    await expect(page.locator('text=Simulaatiotilassa kello alkaa')).toBeVisible();
  });

  test('simulaatiotilan voi kytkeä pois päältä', async ({ page }) => {
    await page.goto('/');

    const checkbox = page.locator('input[type="checkbox"]');
    await checkbox.uncheck();

    await expect(checkbox).not.toBeChecked();

    // Tarkista että info-laatikko ei näy
    await expect(page.locator('text=Simulaatiotilassa kello alkaa')).not.toBeVisible();
  });

  test('simulaatiotilassa näkyy SIMULAATIO-merkintä', async ({ page }) => {
    test.setTimeout(30000);

    await page.goto('/');

    // Varmista että simulaatio on päällä
    const checkbox = page.locator('input[type="checkbox"]');
    await expect(checkbox).toBeChecked();

    // Lataa esimerkki
    await page.getByRole('button', { name: /käytä esimerkkiä/i }).click();
    await page.getByRole('button', { name: /lataa lähtölista/i }).click();

    // Odota lähtökellonäkymää
    await expect(page.locator('text=Aikaa lähtöön').or(page.locator('text=Ei tulevia lähtöjä'))).toBeVisible({ timeout: 15000 });

    // Tarkista että SIMULAATIO-merkintä näkyy
    await expect(page.locator('text=🎬 SIMULAATIO')).toBeVisible();
  });

  test('simulaatiotilassa näkyy kellon nopeutuspainikkeet', async ({ page }) => {
    test.setTimeout(30000);

    await page.goto('/');

    // Lataa esimerkki simulaatiotilassa
    await page.getByRole('button', { name: /käytä esimerkkiä/i }).click();
    await page.getByRole('button', { name: /lataa lähtölista/i }).click();

    // Odota lähtökellonäkymää
    await expect(page.locator('text=Aikaa lähtöön').or(page.locator('text=Ei tulevia lähtöjä'))).toBeVisible({ timeout: 15000 });

    // Tarkista että nopeutuspainikkeet näkyvät
    await expect(page.getByRole('button', { name: '+10s' })).toBeVisible();
    await expect(page.getByRole('button', { name: '+30s' })).toBeVisible();
    await expect(page.getByRole('button', { name: '+1min' })).toBeVisible();
  });

  test('kellon nopeutuspainikkeet näkyvät ja ovat klikattavissa', async ({ page }) => {
    test.setTimeout(30000);

    await page.goto('/');

    // Lataa esimerkki
    await page.getByRole('button', { name: /käytä esimerkkiä/i }).click();
    await page.getByRole('button', { name: /lataa lähtölista/i }).click();

    // Odota lähtökellonäkymää
    await expect(page.locator('text=Aikaa lähtöön').or(page.locator('text=Ei tulevia lähtöjä'))).toBeVisible({ timeout: 15000 });

    // Tarkista että nopeutuspainikkeet ovat näkyvissä ja klikattavissa
    const skip10Button = page.getByRole('button', { name: '+10s' });
    await expect(skip10Button).toBeVisible();
    await expect(skip10Button).toBeEnabled();

    // Klikkaa nappia - ei pitäisi heittää virheitä
    await skip10Button.click();

    // Tarkista että sovellus on edelleen toiminnassa
    await expect(page.locator('text=🎬 SIMULAATIO')).toBeVisible();
  });

  test('ilman simulaatiotilaa ei näy SIMULAATIO-merkintää eikä nopeutuspainikkeita', async ({ page }) => {
    test.setTimeout(30000);

    await page.goto('/');

    // Kytke simulaatio pois päältä
    const checkbox = page.locator('input[type="checkbox"]');
    await checkbox.uncheck();

    // Lataa esimerkki
    await page.getByRole('button', { name: /käytä esimerkkiä/i }).click();
    await page.getByRole('button', { name: /lataa lähtölista/i }).click();

    // Odota lähtökellonäkymää
    await expect(page.locator('text=Aikaa lähtöön').or(page.locator('text=Ei tulevia lähtöjä'))).toBeVisible({ timeout: 15000 });

    // Tarkista että SIMULAATIO-merkintä ei näy
    await expect(page.locator('text=🎬 SIMULAATIO')).not.toBeVisible();

    // Tarkista että nopeutuspainikkeet eivät näy
    await expect(page.getByRole('button', { name: '+10s' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: '+30s' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: '+1min' })).not.toBeVisible();
  });
});
