import { test, expect } from '@playwright/test';

// Reproduce category-B: green poking THROUGH the middle of a road ribbon on a
// slope. Find the steepest row, lay a straight road across it, zoom to the
// steepest segment, and screenshot so we can see terrain showing through.
test('straight road across a steep slope: capture for mid-ribbon green bleed', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#setup-overlay')).toBeVisible();
  await page.fill('#input-city-name', 'SlopeProbe');
  await page.click('#start-game-btn');
  await expect(page.locator('#setup-overlay')).toBeHidden();
  await page.waitForFunction(() => Boolean(window.__THREEDEECITY_GAME__?.sceneManager));

  const report = await page.evaluate(() => {
    const game = window.__THREEDEECITY_GAME__;
    const W = game.city.size.width, H = game.city.size.height;
    // Pick the row (y) whose land tiles span the largest elevation range — that's
    // where a straight road will cross the steepest slope.
    let bestY = -1, bestRange = -1;
    for (let y = 2; y < H - 2; y++) {
      const elevs = [];
      for (let x = 2; x < W - 2; x++) if (game.city.grid[x][y].type !== 'water') elevs.push(game.city.grid[x][y].elevation);
      if (elevs.length > 8) {
        const range = Math.max(...elevs) - Math.min(...elevs);
        if (range > bestRange) { bestRange = range; bestY = y; }
      }
    }
    if (bestY < 0) return { found: false };
    // Lay a road across the whole row.
    let ok = 0;
    for (let x = 2; x < W - 2; x++) {
      const r = window.__THREEDEECITY_VALIDATE__?.(x, bestY, 'tool-road');
      if (r?.ok) { game.activeToolId = 'tool-road'; game.applyTool(x, bestY); ok++; }
    }
    return { found: true, y: bestY, range: Number(bestRange.toFixed(3)), placed: ok };
  });

  console.log('SLOPE REPORT:', JSON.stringify(report));
  expect(report.found).toBe(true);

  // Zoom to the middle of that row.
  await page.evaluate((y) => {
    const game = window.__THREEDEECITY_GAME__;
    const cam = game.sceneManager.camera;
    const V3 = cam.position.constructor;
    const t = new V3(0, 0, y - 16);
    cam.position.set(t.x + 4, 5, t.z + 4);
    if (game.sceneManager.controls) { game.sceneManager.controls.target.copy(t); game.sceneManager.controls.update(); }
    else cam.lookAt(t);
  }, report.y);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/slope-bleed.png' });
});
