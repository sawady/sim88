import { test, expect } from '@playwright/test';

// Opens SIM88 as a first visit with these settings and waits for it to be
// quiet: font loaded, editor up, the blinking cursor hidden.
async function open(page, settings) {
  await page.addInitScript((value) => {
    window.localStorage.setItem('sim88.settings', JSON.stringify(value));
  }, settings);
  await page.goto('./');
  await expect(page.locator('.ace_content')).toContainText('ORG 2000H');
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: '.ace_cursor { visibility: hidden !important; }' });
}

const step = async (page, times = 1) => {
  for (let i = 0; i < times; i++) await page.keyboard.press('F7');
};

const openMenu = (page, name) => page.getByRole('menuitem', { name }).first().click();
const menuItem = (page, name) => page.getByRole('menu').getByRole('menuitem', { name }).click();

const window_ = (page, id) => page.locator(`[data-window="${id}"]`);

test.describe('themes', () => {
  for (const theme of ['borland', 'msx88', 'green', 'amber', 'contrast']) {
    test(theme, async ({ page }) => {
      await open(page, { lang: 'es', theme });
      await step(page, 4);
      await expect(window_(page, 'cpu')).toContainText('IP');
      await expect(page).toHaveScreenshot(`${theme}.png`);
    });
  }

  test('CRT effect', async ({ page }) => {
    await open(page, { lang: 'es', theme: 'amber', crt: true });
    await step(page, 4);
    await expect(page).toHaveScreenshot('crt.png');
  });
});

test('English interface, switches and LEDs', async ({ page }) => {
  await open(page, { lang: 'en', theme: 'borland' });
  await openMenu(page, /Examples/);
  await menuItem(page, /Lights and switches/);
  await expect(page.locator('.ace_content')).toContainText('microswitches');
  const switches = window_(page, 'peripherals').locator('.switch');
  for (const n of ['1', '3', '5', '6']) await switches.getByText(n, { exact: true }).click();
  await step(page, 7);
  await expect(page).toHaveScreenshot('english.png');
});

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });

  test('screen', async ({ page }) => {
    await open(page, { lang: 'es', theme: 'borland' });
    await page.locator('.statusbar button[title^="F7"]').tap();
    await expect(page).toHaveScreenshot('phone.png');
  });

  test('a menu opens with a tap, and another one replaces it', async ({ page }) => {
    await open(page, { lang: 'es', theme: 'borland' });
    await page.getByRole('menuitem', { name: /Ejecutar/ }).first().tap();
    await expect(page.getByRole('menu')).toContainText('Micro-paso');
    await page.getByRole('menuitem', { name: /Opciones/ }).first().tap();
    await expect(page.getByRole('menu')).toContainText('Frecuencias');
    await expect(page).toHaveScreenshot('phone-menu.png');
  });

  test('what is tapped is big enough for a finger, and the page does not scroll sideways', async ({ page }) => {
    await open(page, { lang: 'es', theme: 'borland' });
    const min = 44;
    for (const selector of ['.statusbar button', '.switch', '.inline-btn']) {
      const boxes = await page.locator(selector).evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
      expect(boxes.length, selector).toBeGreaterThan(0);
      for (const height of boxes) expect(height, selector).toBeGreaterThanOrEqual(min);
    }
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  });

  test('the field under the screen types for INT 6', async ({ page }) => {
    await open(page, { lang: 'en', theme: 'borland' });
    await page.getByRole('menuitem', { name: /Examples/ }).first().tap();
    await page.getByRole('menuitem', { name: /Screen and keyboard/ }).tap();
    await page.locator('.statusbar button[title^="F5"]').tap();
    await page.waitForFunction(() => document.querySelector('.screen-output.waiting'));
    await page.getByLabel('Tap to type').pressSequentially('x');
    await expect(page.locator('.screen-output')).toContainText('Type a letter:');
    // the program runs at the default speed, 500 ms per phase
    await expect(page.locator('.screen-output')).toContainText('x', { timeout: 30000 });
  });
});

test('menu', async ({ page }) => {
  await open(page, { lang: 'es', theme: 'borland' });
  await openMenu(page, /Ejecutar/);
  await expect(page.getByRole('menu')).toBeVisible();
  await expect(page).toHaveScreenshot('menu.png');
});

test('dialog', async ({ page }) => {
  await open(page, { lang: 'es', theme: 'borland' });
  await openMenu(page, /Opciones/);
  await menuItem(page, /Frecuencias/);
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page).toHaveScreenshot('frecuencias.png');
});
