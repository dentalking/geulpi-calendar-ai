import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/calendar');
    await expect(page).toHaveURL('/login');
  });

  test('should show Google login button', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=Google로 로그인')).toBeVisible();
  });

  test('should redirect to onboarding after first login', async ({ page }) => {
    // This would require mocking the auth provider
    // Implementation depends on test environment setup
  });

  test('should redirect to calendar after login for existing users', async ({ page }) => {
    // This would require mocking the auth provider with existing user
    // Implementation depends on test environment setup
  });
});