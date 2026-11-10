import { expect, test } from '@playwright/test';

test('visits the app root url', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /find your next favorite thing/i })).toBeVisible();
  const firstProduct = page.locator('.product-card').first();
  if (await firstProduct.count()) {
    await firstProduct.locator('.buy-button').click();
    await expect(page).toHaveURL(/\/bag$/);
    await expect(page.locator('.bag-item')).toHaveCount(1);
    await page.getByRole('button', { name: 'Remove' }).click();
  } else {
    await page.goto('/bag');
  }
  await expect(page.getByText('Your bag is waiting for a good find.')).toBeVisible();
});
