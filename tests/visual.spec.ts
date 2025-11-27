import { test, expect } from '@playwright/test';

const viewports = [
  { width: 360,  height: 740,  name: 'mobile' },
  { width: 768,  height: 1024, name: 'tablet' },
  { width: 1280, height: 800,  name: 'laptop' },
  { width: 1440, height: 900,  name: 'desktop' }
];

const sections = ['presentacion', 'about', 'servicios', 'faq'];

test.describe('Smoke + Visual flow', () => {
  for (const vp of viewports) {
    test.describe(`${vp.name} ${vp.width}x${vp.height}`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test('navegación por secciones + snapshots', async ({ page }) => {
        await page.goto('/index.html');
        await page.waitForLoadState('load');

        // Estabilizar animaciones/transiciones para snapshots
        await page.addStyleTag({
          content: `
            * { transition: none !important; animation: none !important; }
            html { scroll-behavior: auto !important; }
          `
        });

        // Header visible
        await expect(page.locator('header')).toBeVisible();

        // Recorre cada sección con la navbar o menú móvil según visibilidad
        for (const id of sections) {
          const desktopLink = page.locator(`a.nav-link[data-page="${id}"]`);
          if (await desktopLink.isVisible()) {
            await desktopLink.click();
          } else {
            // Abrir menú móvil si no está abierto
            const mobileMenu = page.locator('#mobile-menu');
            if (!(await mobileMenu.evaluate(el => el.classList.contains('open')))) {
              await page.locator('#mobile-menu-btn').click();
              await page.waitForTimeout(200);
            }
            const mobileLink = page.locator(`a.nav-link-mobile[data-page="${id}"]`);
            await mobileLink.click();
            // Forzar cierre del menú móvil removiendo la clase 'open'
            await page.evaluate(() => {
              const m = document.getElementById('mobile-menu');
              if (m && m.classList.contains('open')) m.classList.remove('open');
            });
          }

          await page.waitForTimeout(450); // dejar terminar scroll suave/capturas
          await expect(page.locator('#' + id)).toBeVisible();

          // Snapshot de la vista completa
          await expect(page).toHaveScreenshot(`${vp.name}-${id}.png`, {
            fullPage: true,
            animations: 'disabled',
            maxDiffPixelRatio: 0.02
          });
        }

        // WhatsApp flotante visible
        await expect(page.locator('text=¿Necesita Asesoramiento?').first()).toBeVisible();

        // Footer visible después de FAQ (manejo desktop / móvil)
        const faqDesktopLink = page.locator('a.nav-link[data-page="faq"]');
        if (await faqDesktopLink.isVisible()) {
          await faqDesktopLink.click();
        } else {
          const mobileMenu = page.locator('#mobile-menu');
          if (!(await mobileMenu.evaluate(el => el.classList.contains('open')))) {
            await page.locator('#mobile-menu-btn').click();
            await page.waitForTimeout(150);
          }
          const faqMobileLink = page.locator('a.nav-link-mobile[data-page="faq"]');
          await faqMobileLink.click();
          await page.evaluate(() => {
            const m = document.getElementById('mobile-menu');
            if (m && m.classList.contains('open')) m.classList.remove('open');
          });
        }
        await page.waitForTimeout(300);
        await page.locator('footer').scrollIntoViewIfNeeded();
        await expect(page.locator('footer')).toBeVisible();
      });
    });
  }
});
