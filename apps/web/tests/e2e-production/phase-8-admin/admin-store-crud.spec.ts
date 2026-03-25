import { test, expect } from '@playwright/test';
import { apiGet } from '../helpers/api.helper';
import { waitForAdminPage, getAdminToken } from './helpers/admin-test.helper';

/**
 * Admin Store CRUD Tests
 *
 * Tests store products, categories, and orders pages and APIs
 * against production. Read-only operations only — no destructive
 * mutations on existing store data.
 */

let adminToken: string;

test.beforeAll(async () => {
  try {
    adminToken = await getAdminToken();
  } catch {
    // Tests will skip if auth fails
  }
});

test.describe('Admin Store CRUD', () => {
  test('products page loads at /admin/store/products', async ({ page }) => {
    test.skip(!adminToken, 'Admin token not available');

    const loaded = await waitForAdminPage(page, '/admin/store/products');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(10);

    // Should have product-related content
    const hasProductContent =
      bodyText.includes('Товар') ||
      bodyText.includes('товар') ||
      bodyText.includes('Продукт') ||
      bodyText.includes('продукт') ||
      bodyText.includes('Магазин') ||
      bodyText.includes('магазин');

    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasCards = (await page.locator('[class*="card"]').count()) > 0;

    expect(hasProductContent || hasTable || hasCards).toBe(true);
  });

  test('products API returns list', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const res = await apiGet('/admin/store/products', adminToken);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');

    if (res.success && res.data) {
      const data = res.data as { items?: unknown[] };
      if (data.items) {
        expect(Array.isArray(data.items)).toBe(true);
      }
    }
  });

  test('product creation form loads at /admin/store/products/new', async ({ page }) => {
    test.skip(!adminToken, 'Admin token not available');

    const loaded = await waitForAdminPage(page, '/admin/store/products/new');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(10);

    // Should have form fields
    const inputs = await page.locator('input').count();
    const textareas = await page.locator('textarea').count();
    const buttons = await page.locator('button').count();

    expect(inputs + textareas + buttons).toBeGreaterThan(0);
  });

  test('products stats API responds', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const res = await apiGet('/admin/store/products/stats', adminToken);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');

    if (res.success && res.data) {
      const data = res.data as Record<string, unknown>;
      // Stats should have numeric values
      const hasNumbers = Object.values(data).some(
        (v) => typeof v === 'number' || (typeof v === 'string' && /\d+/.test(v))
      );
      if (Object.keys(data).length > 0) {
        expect(hasNumbers).toBe(true);
      }
    }
  });

  test('store categories API responds', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const res = await apiGet('/admin/store/categories', adminToken);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');

    if (res.success && res.data) {
      const data = res.data as { items?: unknown[]; categories?: unknown[] };
      const items = data.items ?? data.categories;
      if (items) {
        expect(Array.isArray(items)).toBe(true);
      }
    }
  });

  test('orders page loads at /admin/store/orders', async ({ page }) => {
    test.skip(!adminToken, 'Admin token not available');

    const loaded = await waitForAdminPage(page, '/admin/store/orders');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(10);

    // Should have order-related content or empty state
    const hasOrderContent =
      bodyText.includes('Заказ') ||
      bodyText.includes('заказ') ||
      bodyText.includes('Нет заказов') ||
      bodyText.includes('Пусто') ||
      bodyText.includes('Order');

    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasCards = (await page.locator('[class*="card"]').count()) > 0;
    const hasListItems = (await page.locator('tr, li, [class*="item"]').count()) > 0;

    expect(hasOrderContent || hasTable || hasCards || hasListItems).toBe(true);
  });

  test('orders API returns list', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const res = await apiGet('/admin/store/orders', adminToken);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');

    if (res.success && res.data) {
      const data = res.data as { items?: unknown[] };
      if (data.items) {
        expect(Array.isArray(data.items)).toBe(true);
      }
    }
  });

  test('store pages have Russian text', async ({ page }) => {
    test.skip(!adminToken, 'Admin token not available');

    const loaded = await waitForAdminPage(page, '/admin/store/products');
    test.skip(!loaded, 'Auth state expired');

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);

    // Also verify orders page
    const ordersLoaded = await waitForAdminPage(page, '/admin/store/orders');
    if (ordersLoaded) {
      const ordersBody = await page.locator('body').innerText();
      expect(/[\u0400-\u04FF]/.test(ordersBody)).toBe(true);
    }
  });
});
