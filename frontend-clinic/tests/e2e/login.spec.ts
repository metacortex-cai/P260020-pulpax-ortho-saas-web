import { test, expect } from '@playwright/test';

test('@regression login page renders and exposes form fields', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveURL(/.*\/login/);
  await expect(page.locator('input')).not.toHaveCount(0);
  await expect(page.locator('button')).not.toHaveCount(0);
});
