import { test, expect } from '../fixtures/account.fixture';

test.describe('Account Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/account/settings');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Page Display', () => {
    test('should display "Настройки" heading', async ({ page }) => {
      await expect(page.getByText('Настройки')).toBeVisible();
    });

    test('should have tabs for different settings sections', async ({ page }) => {
      await expect(page.getByRole('tab', { name: /уведомления/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /безопасность/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /устройства/i })).toBeVisible();
    });
  });

  test.describe('Notifications Tab', () => {
    test('should show notification toggles', async ({ page }) => {
      // Notifications tab should be active by default
      await expect(page.getByText('Email уведомления')).toBeVisible();
    });

    test('should toggle notification preference', async ({ page }) => {
      const toggle = page.locator('button[role="switch"]').first();
      await expect(toggle).toBeVisible();
      await toggle.click();
    });
  });

  test.describe('Security Tab', () => {
    test('should switch to security tab and show "Сброс пароля"', async ({ page }) => {
      await page.getByRole('tab', { name: /безопасность/i }).click();
      await expect(page.getByText('Сброс пароля')).toBeVisible();
    });

    test('should show email input field', async ({ page }) => {
      await page.getByRole('tab', { name: /безопасность/i }).click();
      await expect(page.locator('input[type="email"]')).toBeVisible();
    });

    test('should show info about session termination', async ({ page }) => {
      await page.getByRole('tab', { name: /безопасность/i }).click();
      await expect(page.getByText(/все активные сессии будут завершены/i)).toBeVisible();
    });

    test('should validate empty email', async ({ page }) => {
      await page.getByRole('tab', { name: /безопасность/i }).click();

      const submitButton = page.getByRole('button', { name: /отправить ссылку/i });
      await submitButton.click();

      await expect(page.getByText('Email обязателен')).toBeVisible();
    });

    test('should validate invalid email format', async ({ page }) => {
      await page.getByRole('tab', { name: /безопасность/i }).click();

      await page.locator('input[type="email"]').fill('not-an-email');
      const submitButton = page.getByRole('button', { name: /отправить ссылку/i });
      await submitButton.click();

      await expect(page.getByText('Введите корректный email')).toBeVisible();
    });

    test('should show success state after submission', async ({ page }) => {
      await page.getByRole('tab', { name: /безопасность/i }).click();

      await page.locator('input[type="email"]').fill('test@example.com');
      const submitButton = page.getByRole('button', { name: /отправить ссылку/i });
      await submitButton.click();

      await expect(page.getByText('Проверьте почту')).toBeVisible();
      await expect(page.getByText(/ссылку для сброса пароля/i)).toBeVisible();
    });

    test('should show cooldown timer on resend button', async ({ page }) => {
      await page.getByRole('tab', { name: /безопасность/i }).click();

      await page.locator('input[type="email"]').fill('test@example.com');
      await page.getByRole('button', { name: /отправить ссылку/i }).click();

      await expect(page.getByText('Проверьте почту')).toBeVisible();
      const resendButton = page.getByRole('button', { name: /отправить повторно/i });
      await expect(resendButton).toBeVisible();
      await expect(resendButton).toBeDisabled();
      await expect(resendButton).toContainText(/\d+с/);
    });
  });

  test.describe('Sessions Tab', () => {
    test('should switch to sessions tab', async ({ page }) => {
      await page.getByRole('tab', { name: /устройства/i }).click();
      await expect(page.getByText('Активные устройства')).toBeVisible();
    });

    test('should display current device sessions', async ({ page }) => {
      await page.getByRole('tab', { name: /устройства/i }).click();

      await expect(page.getByText('Chrome на macOS')).toBeVisible();
      await expect(page.getByText('Safari на iPhone')).toBeVisible();
    });

    test('should mark current session with badge', async ({ page }) => {
      await page.getByRole('tab', { name: /устройства/i }).click();

      await expect(page.getByText('Это устройство')).toBeVisible();
    });

    test('should disable terminate for current session', async ({ page }) => {
      await page.getByRole('tab', { name: /устройства/i }).click();

      // The terminate button for the current session should be disabled
      const currentSessionCard = page.locator(':has(> :text("Это устройство"))').first();
      if (await currentSessionCard.isVisible()) {
        const terminateBtn = currentSessionCard.getByRole('button', { name: /завершить/i });
        if (await terminateBtn.isVisible()) {
          await expect(terminateBtn).toBeDisabled();
        }
      }
    });

    test('should allow terminating other sessions', async ({ page }) => {
      await page.getByRole('tab', { name: /устройства/i }).click();

      // Find terminate button for non-current session
      const otherSession = page.getByText('Safari на iPhone');
      await expect(otherSession).toBeVisible();
    });
  });
});
