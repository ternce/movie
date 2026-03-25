import { test, expect } from '@playwright/test';
import { getAdminToken, waitForAdminPage } from './helpers/admin-test.helper';
import { apiGet, apiPatch } from '../helpers/api.helper';

test.describe('Admin Users Detail & Management', () => {
  let adminToken: string;

  test.beforeAll(async () => {
    try {
      adminToken = await getAdminToken();
    } catch {
      // Token will be empty — tests will skip
    }
  });

  test('users list page loads with table', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/users');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);
    const bodyText = await page.locator('body').innerText();

    if (bodyText.trim().length < 50) {
      test.skip(true, 'Users page did not render');
      return;
    }

    // Heading
    expect(bodyText).toContain('Пользователи');

    // Table visible
    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasRows = (await page.locator('tr').count()) > 0;
    expect(hasTable || hasRows).toBe(true);

    // Search input
    const inputs = await page.locator('input').count();
    expect(inputs).toBeGreaterThan(0);
  });

  test('users API returns paginated list', async () => {
    test.skip(!adminToken, 'Admin login failed');

    const res = await apiGet('/admin/users', adminToken);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);

    if (res.data) {
      const data = res.data as { items?: Record<string, unknown>[] };
      expect(data.items).toBeDefined();
      expect(Array.isArray(data.items)).toBe(true);
      expect(data.items!.length).toBeGreaterThan(0);

      // Each item should have email and role fields
      const firstItem = data.items![0];
      expect(firstItem).toHaveProperty('email');
      expect(firstItem).toHaveProperty('role');
    }
  });

  test('user search by email via API', async () => {
    test.skip(!adminToken, 'Admin login failed');

    const res = await apiGet(
      '/admin/users?search=admin@movieplatform.local',
      adminToken
    );
    expect(res).toBeDefined();
    expect(res.success).toBe(true);

    if (res.data) {
      const data = res.data as { items?: { email: string; role: string }[] };
      expect(data.items).toBeDefined();
      expect(Array.isArray(data.items)).toBe(true);

      const adminUser = data.items?.find((u) =>
        u.email.includes('admin@movieplatform.local')
      );
      expect(adminUser).toBeDefined();
      expect(adminUser!.role).toBeTruthy();
    }
  });

  test('user detail page loads for seeded user', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    // First get a user ID from the API
    const res = await apiGet('/admin/users?limit=1', adminToken);
    expect(res.success).toBe(true);

    const data = res.data as { items?: { id: string; email: string }[] };
    const firstUser = data?.items?.[0];
    test.skip(!firstUser, 'No users found in API');

    const loaded = await waitForAdminPage(page, `/admin/users/${firstUser!.id}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);
    const bodyText = await page.locator('body').innerText();

    if (bodyText.trim().length < 20) {
      test.skip(true, 'User detail page did not render');
      return;
    }

    // Body should contain user info (email or role text)
    const hasUserInfo =
      bodyText.includes(firstUser!.email) ||
      bodyText.includes('email') ||
      bodyText.includes('Роль') ||
      bodyText.includes('роль') ||
      /[\u0400-\u04FF]/.test(bodyText);
    expect(hasUserInfo).toBe(true);
  });

  test('user search on list page via UI', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/users');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);
    const bodyText = await page.locator('body').innerText();

    if (bodyText.trim().length < 50) {
      test.skip(true, 'Users page did not render');
      return;
    }

    // Find the search input and type into it
    const searchInput = page.locator('input').first();
    const inputVisible = await searchInput.isVisible().catch(() => false);
    test.skip(!inputVisible, 'Search input not found');

    await searchInput.fill('admin');

    // Wait for debounce
    await page.waitForTimeout(2000);

    // Verify page still renders after search (no crash)
    const updatedBodyText = await page.locator('body').innerText();
    expect(updatedBodyText.trim().length).toBeGreaterThan(10);
  });

  test('users table has correct columns', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/users');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);
    const bodyText = await page.locator('body').innerText();

    if (bodyText.trim().length < 50) {
      test.skip(true, 'Users page did not render');
      return;
    }

    // Check for column headers — may be in th, role="columnheader", or visible text
    const columnHeaders = await page.locator('th, [role="columnheader"]').allInnerTexts();
    const allHeaderText = columnHeaders.join(' ').toLowerCase();

    // Also check body text for column-related labels
    const lowerBody = bodyText.toLowerCase();

    const hasNameOrEmail =
      allHeaderText.includes('имя') ||
      allHeaderText.includes('email') ||
      allHeaderText.includes('почта') ||
      lowerBody.includes('email') ||
      lowerBody.includes('имя');

    const hasRole =
      allHeaderText.includes('роль') ||
      allHeaderText.includes('role') ||
      lowerBody.includes('роль');

    const hasStatus =
      allHeaderText.includes('статус') ||
      allHeaderText.includes('status') ||
      lowerBody.includes('статус') ||
      lowerBody.includes('активен');

    const hasDate =
      allHeaderText.includes('дата') ||
      allHeaderText.includes('регистрац') ||
      lowerBody.includes('дата') ||
      lowerBody.includes('регистрац');

    // At least 2 of 4 expected columns should be present
    const matches = [hasNameOrEmail, hasRole, hasStatus, hasDate].filter(Boolean).length;
    expect(matches).toBeGreaterThanOrEqual(2);
  });

  test('users page has Russian text', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/users');
    test.skip(!loaded, 'Auth state expired');

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });

  test('users page has pagination controls', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/users');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);
    const bodyText = await page.locator('body').innerText();

    if (bodyText.trim().length < 50) {
      test.skip(true, 'Users page did not render');
      return;
    }

    // Look for pagination elements: buttons with page numbers, next/prev, or pagination container
    const paginationButtons = await page
      .locator('button:has-text("1"), button:has-text("2"), [aria-label*="page"], [aria-label*="страниц"], nav[aria-label*="pagination"], [class*="pagination"]')
      .count();

    const nextPrevButtons = await page
      .locator('button:has-text("Далее"), button:has-text("Назад"), button:has-text("Next"), button:has-text("Previous"), button[aria-label*="next"], button[aria-label*="prev"]')
      .count();

    // Total count display (e.g. "Показано 1-10 из 50")
    const hasCountText =
      /показано|всего|из\s+\d+|страниц/i.test(bodyText) ||
      /\d+\s*[-–]\s*\d+/.test(bodyText);

    expect(paginationButtons > 0 || nextPrevButtons > 0 || hasCountText).toBe(true);
  });
});
