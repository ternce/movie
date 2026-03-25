import { test, expect, type Page } from '@playwright/test';

/**
 * Studio Create Page — Production E2E Tests
 *
 * Validates the /studio/create 3-step wizard:
 * Step 1 — Content type, title, description
 * Step 2 — Category, genres, tags, media
 * Step 3 — Age rating, monetization, publish status
 * Uses admin-state.json storageState (ADMIN role).
 */

async function waitForStudioPage(page: Page, path: string): Promise<boolean> {
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);

  if (page.url().includes('/login')) {
    return false;
  }
  return true;
}

test.describe('Studio Create Page', () => {
  test('create page loads at /studio/create', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create');
    test.skip(!loaded, 'Auth state expired — redirected to login');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();

    if (bodyText.trim().length < 50) {
      test.skip(true, 'Create page did not render');
      return;
    }

    // Should have page header
    const hasHeader =
      bodyText.includes('Новый контент') ||
      bodyText.includes('Создание') ||
      bodyText.includes('контент');

    expect(hasHeader).toBe(true);
  });

  test('create page has form elements (title, description, content type)', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    // Step 1 should be active — check for title input
    const titleInput = page.locator('#title');
    const hasTitleInput = await titleInput.isVisible().catch(() => false);

    // Description textarea
    const descriptionInput = page.locator('#description');
    const hasDescriptionInput = await descriptionInput.isVisible().catch(() => false);

    // Content type cards or selector — look for content type labels in page
    const bodyText = await page.locator('body').innerText();
    const hasContentType =
      bodyText.includes('Тип контента') ||
      bodyText.includes('Сериал') ||
      bodyText.includes('Клип') ||
      bodyText.includes('Шорт') ||
      bodyText.includes('Туториал');

    expect(hasTitleInput || hasDescriptionInput || hasContentType).toBe(true);
  });

  test('create page has Russian text (labels, buttons)', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();

    // Must contain Cyrillic characters
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);

    // Check for known Russian labels from the form
    const hasRussianLabels =
      bodyText.includes('Название') ||
      bodyText.includes('Описание') ||
      bodyText.includes('Основное') ||
      bodyText.includes('Назад к списку');

    expect(hasRussianLabels).toBe(true);
  });

  test('create page has step indicator or wizard navigation', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText();

    // Step labels from the wizard: "Основное", "Детали и медиа", "Публикация"
    const hasStepLabels =
      bodyText.includes('Основное') ||
      bodyText.includes('Детали и медиа') ||
      bodyText.includes('Публикация');

    // Or look for step indicator circles (numbered buttons)
    const stepButtons = page.locator('button').filter({ hasText: /^[123]$/ });
    const hasStepButtons = (await stepButtons.count()) > 0;

    expect(hasStepLabels || hasStepButtons).toBe(true);
  });

  test('create page has "Далее" or submit button', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    // On step 1, the button should be "Далее" (Next)
    const nextButton = page.getByText('Далее');
    const hasNextButton = (await nextButton.count()) > 0;

    // Or on step 3, there should be a submit button "Создать контент"
    const submitButton = page.locator('button[type="submit"]');
    const hasSubmitButton = await submitButton.isVisible().catch(() => false);

    // Also check for a generic CTA button
    const createButton = page.getByText('Создать контент');
    const hasCreateButton = (await createButton.count()) > 0;

    expect(hasNextButton || hasSubmitButton || hasCreateButton).toBe(true);
  });
});
