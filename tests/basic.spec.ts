import { test, expect } from '@playwright/test';

test.describe('Kellokalle sovellus', () => {
  test('sovellus käynnistyy ja näyttää konfigurointinäkymän', async ({ page }) => {
    await page.goto('/');

    // Tarkista että sivulla on otsikko
    await expect(page.locator('h1')).toContainText('Kellokalle');

    // Tarkista että URL-syöte on näkyvissä
    const urlInput = page.locator('input[type="text"]');
    await expect(urlInput).toBeVisible();
    await expect(urlInput).toHaveAttribute('placeholder', /tulospalvelu/i);

    // Tarkista että napit ovat näkyvissä
    await expect(page.getByRole('button', { name: /lataa lähtölista/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /käytä esimerkkiä/i })).toBeVisible();
  });

  test('voi täyttää URL-kentän', async ({ page }) => {
    await page.goto('/');

    const urlInput = page.locator('input[type="text"]');
    const testUrl = 'https://example.com/startlist.xml';

    await urlInput.fill(testUrl);
    await expect(urlInput).toHaveValue(testUrl);
  });

  test('esimerkkinappi täyttää URL-kentän', async ({ page }) => {
    await page.goto('/');

    const urlInput = page.locator('input[type="text"]');
    const exampleButton = page.getByRole('button', { name: /käytä esimerkkiä/i });

    await exampleButton.click();

    // Tarkista että URL on täytetty esimerkkiarvolla
    await expect(urlInput).toHaveValue(/tulospalvelu\.fi/);
  });

  test('tyhjän URL:n lähetys näyttää virheviestin', async ({ page }) => {
    await page.goto('/');

    const loadButton = page.getByRole('button', { name: /lataa lähtölista/i });
    await loadButton.click();

    // Tarkista että virheviesti näytetään
    await expect(page.locator('text=Anna XML-tiedoston URL')).toBeVisible();
  });

  test('lataa esimerkin ja siirtyy lähtökellonäkymään', async ({ page }) => {
    // Kasvatetaan timeoutia koska ladataan XML-tiedosto
    test.setTimeout(30000);

    await page.goto('/');

    // Klikkaa esimerkkinappia
    const exampleButton = page.getByRole('button', { name: /käytä esimerkkiä/i });
    await exampleButton.click();

    // Klikkaa lataa-nappia
    const loadButton = page.getByRole('button', { name: /lataa lähtölista/i });
    await loadButton.click();

    // Odota että sivu latautuu (voi kestää hetken)
    // Tarkista että lähtökellonäkymä näytetään
    await expect(page.locator('text=Aikaa lähtöön').or(page.locator('text=Ei tulevia lähtöjä'))).toBeVisible({ timeout: 15000 });

    // Tarkista että asetukset-nappi on näkyvissä
    await expect(page.getByRole('button', { name: /asetukset/i })).toBeVisible();
  });

  test('voi palata lähtökellonäkymästä asetuksiin', async ({ page }) => {
    test.setTimeout(30000);

    await page.goto('/');

    // Lataa esimerkki
    await page.getByRole('button', { name: /käytä esimerkkiä/i }).click();
    await page.getByRole('button', { name: /lataa lähtölista/i }).click();

    // Odota lähtökellonäkymää
    await expect(page.locator('text=Aikaa lähtöön').or(page.locator('text=Ei tulevia lähtöjä'))).toBeVisible({ timeout: 15000 });

    // Klikkaa asetukset-nappia
    const settingsButton = page.getByRole('button', { name: /asetukset/i });
    await settingsButton.click();

    // Tarkista että olemme takaisin konfigurointinäkymässä
    await expect(page.locator('h1')).toContainText('Kellokalle');
    await expect(page.locator('input[type="text"]')).toBeVisible();
  });

  test('sovellus lataa välimuistissa olevan lähtölistan uudelleenkäynnistyksessä', async ({ page, context }) => {
    test.setTimeout(30000);

    // Lataa lähtölista ensimmäisellä kerralla
    await page.goto('/');
    await page.getByRole('button', { name: /käytä esimerkkiä/i }).click();
    await page.getByRole('button', { name: /lataa lähtölista/i }).click();
    await expect(page.locator('text=Aikaa lähtöön').or(page.locator('text=Ei tulevia lähtöjä'))).toBeVisible({ timeout: 15000 });

    // Avaa uusi sivu samassa kontekstissa (simuloi uudelleenkäynnistys)
    const newPage = await context.newPage();
    await newPage.goto('/');

    // Sovelluksen pitäisi ladata välimuistista ja näyttää lähtökellonäkymä
    await expect(newPage.locator('text=Aikaa lähtöön').or(newPage.locator('text=Ei tulevia lähtöjä'))).toBeVisible({ timeout: 5000 });
  });
});
