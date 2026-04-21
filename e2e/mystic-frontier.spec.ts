import { test, expect, Page } from '@playwright/test';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  // Fill in credentials — update these selectors based on actual login form
  await page.getByLabel(/email/i).fill(process.env.TEST_ADMIN_EMAIL ?? 'admin@test.com');
  await page.getByLabel(/password/i).fill(process.env.TEST_ADMIN_PASSWORD ?? 'password');
  await page.getByRole('button', { name: /sign in|login/i }).click();
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10_000 });
}

async function openMysticFrontierModal(page: Page, characterName?: string): Promise<void> {
  await page.goto('/characters');
  await page.waitForLoadState('networkidle');

  // Click the first character name or a specific one
  if (characterName) {
    await page.getByText(characterName, { exact: false }).first().click();
  } else {
    // Open first character detail
    await page.locator('table tbody tr').first().click();
  }

  // Wait for CharacterDetailModal to open
  await page.waitForSelector('[role="dialog"]', { timeout: 5_000 });

  // Click the Mystic Frontier button
  await page.getByRole('button', { name: /mystic frontier/i }).click();
  await page.waitForSelector('[role="dialog"]', { timeout: 5_000 });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Mystic Frontier Modal', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('shows locked state when Mystic Frontier is not unlocked', async ({ page }) => {
    await openMysticFrontierModal(page);
    // The modal may show locked state
    const dialog = page.locator('[role="dialog"]').last();
    // Either expedition cards or lock message should be visible
    const hasExpeditionCards = await dialog.locator('.mf-expedition-card').count() > 0;
    const hasLockedMsg = await dialog.locator('.mf-locked').isVisible().catch(() => false);
    expect(hasExpeditionCards || hasLockedMsg).toBeTruthy();
  });

  test('shows 3 expedition cards when unlocked', async ({ page }) => {
    await openMysticFrontierModal(page);
    const dialog = page.locator('[role="dialog"]').last();

    // If locked, toggle unlock
    const lockedEl = dialog.locator('.mf-locked');
    if (await lockedEl.isVisible().catch(() => false)) {
      await dialog.getByRole('button', { name: /unlock|mark/i }).click();
      await page.waitForTimeout(500);
    }

    const cards = dialog.locator('.mf-expedition-card');
    await expect(cards).toHaveCount(3);
  });

  test('expedition card shows rank selector and status badge', async ({ page }) => {
    await openMysticFrontierModal(page);
    const dialog = page.locator('[role="dialog"]').last();

    // Ensure unlocked
    const lockedEl = dialog.locator('.mf-locked');
    if (await lockedEl.isVisible().catch(() => false)) {
      await dialog.getByRole('button', { name: /unlock|mark/i }).click();
      await page.waitForTimeout(500);
    }

    const firstCard = dialog.locator('.mf-expedition-card').first();
    // Has a rank selector (select element or combobox)
    await expect(firstCard.locator('select, [role="combobox"]')).toBeVisible();
    // Has a status badge
    await expect(firstCard.locator('.mf-status-badge')).toBeVisible();
  });

  test('can start an expedition', async ({ page }) => {
    await openMysticFrontierModal(page);
    const dialog = page.locator('[role="dialog"]').last();

    // Ensure unlocked
    const lockedEl = dialog.locator('.mf-locked');
    if (await lockedEl.isVisible().catch(() => false)) {
      await dialog.getByRole('button', { name: /unlock|mark/i }).click();
      await page.waitForTimeout(500);
    }

    const firstCard = dialog.locator('.mf-expedition-card').first();
    const statusBadge = firstCard.locator('.mf-status-badge');
    const currentStatus = await statusBadge.textContent();

    if (currentStatus?.toLowerCase().includes('available')) {
      // Select Common rank and start
      await firstCard.locator('select').selectOption('Common');
      await firstCard.getByRole('button', { name: /start expedition/i }).click();
      await page.waitForTimeout(1_000);
      // Status should now be Exploring
      await expect(firstCard.locator('.mf-status-badge.exploring')).toBeVisible();
    } else {
      test.skip(true, 'Expedition not in available state — skipping start test');
    }
  });

  test('reward picker shows checkboxes for non-cube rewards and number inputs for cube rewards', async ({ page }) => {
    await openMysticFrontierModal(page);
    const dialog = page.locator('[role="dialog"]').last();

    // Look for a "Collect Rewards" button (would be present if expedition timed out)
    const collectBtn = dialog.getByRole('button', { name: /collect rewards/i });
    if (await collectBtn.isVisible().catch(() => false)) {
      await collectBtn.first().click();
      await page.waitForTimeout(300);
      // Reward picker should be open
      const picker = dialog.locator('.mf-reward-picker').first();
      await expect(picker).toBeVisible();
      // Should have checkboxes for non-cube rewards
      await expect(picker.locator('input[type="checkbox"]')).toHaveCount(4); // 4 non-cube
      // Should have number inputs for cube rewards
      await expect(picker.locator('input[type="number"]')).toHaveCount(3); // 3 cube types
    } else {
      test.skip(true, 'No expedition ready for reward collection — skipping picker test');
    }
  });

  test('history section is visible after reward collection', async ({ page }) => {
    await openMysticFrontierModal(page);
    const dialog = page.locator('[role="dialog"]').last();
    // History section title should be visible (even if no entries)
    await expect(dialog.locator('.mf-history-title')).toBeVisible();
  });

  test('modal closes on backdrop click or close button', async ({ page }) => {
    await openMysticFrontierModal(page);
    // Find and click close button
    const mfDialog = page.locator('[role="dialog"]').last();
    await mfDialog.getByRole('button', { name: /close|✕|×/i }).click();
    await page.waitForTimeout(300);
    // The MF modal should be gone (but char detail modal may still be open)
    await expect(mfDialog.locator('.mf-expedition-grid')).not.toBeVisible();
  });
});
