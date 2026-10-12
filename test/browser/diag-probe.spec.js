import { test, expect } from '@playwright/test';

// Reproduce the user's report: a road DRAWN diagonally is a staircase of corner
// tiles. Build one on guaranteed-land, then zoom in and screenshot the middle so
// we can see whether green shows through between the diagonal steps.
test('diagonal staircase road: capture mid-run for green-gap inspection', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#setup-overlay')).toBeVisible();
  await page.fill('#input-city-name', 'DiagProbe');
  await page.click('#start-game-btn');
  await expect(page.locator('#setup-overlay')).toBeHidden();
  await page.waitForFunction(() => Boolean(window.__THREEDEECITY_GAME__?.sceneManager));

  const report = await page.evaluate(() => {
    const game = window.__THREEDEECITY_GAME__;
    const W = game.city.size.width, H = game.city.size.height;
    // Find a land-only region big enough for an 8-step staircase.
    let ox = -1, oy = -1;
    outer:
    for (let y = 4; y < H - 8; y++) {
      for (let x = 4; x < W - 8; x++) {
        let land = true;
        for (let dy = 0; dy < 8 && land; dy++)
          for (let dx = 0; dx < 8 && land; dx++)
            if (game.city.grid[x + dx][y + dy].type === 'water') land = false;
        if (land) { ox = x; oy = y; break outer; }
      }
    }
    if (ox < 0) return { found: false };

    // Staircase: alternate east / south so every interior tile is a corner.
    const path = [];
    let x = ox, y = oy;
    for (let i = 0; i < 8; i++) {
      path.push([x, y]);
      if (i % 2 === 0) x++; else y++;
    }
    for (const [px, py] of path) {
      const r = window.__THREEDEECITY_VALIDATE__?.(px, py, 'tool-road');
      if (r?.ok) { game.activeToolId = 'tool-road'; game.applyTool(px, py); }
    }
    // Classify each tile's road topology to confirm they're corners.
    const maskOf = (px, py) => {
      let m = 0; const g = (a,b)=>game.city.grid[a]?.[b]?.type==='road';
      if (g(px,py-1)) m |= 1; if (g(px+1,py)) m |= 2; if (g(px,py+1)) m |= 4; if (g(px-1,py)) m |= 8;
      return m;
    };
    return { found: true, origin: [ox, oy], path, masks: path.map(([px,py]) => maskOf(px,py)) };
  });

  console.log('DIAG REPORT:', JSON.stringify(report));
  expect(report.found).toBe(true);

  // Zoom into the middle of the staircase.
  await page.evaluate((origin) => {
    const game = window.__THREEDEECITY_GAME__;
    const cam = game.sceneManager.camera;
    const V3 = cam.position.constructor;
    const midX = origin[0] + 4, midY = origin[1] + 4;
    const t = new V3(midX - 16, 0, midY - 16);
    cam.position.set(t.x + 2.5, 4, t.z + 2.5);
    if (game.sceneManager.controls) { game.sceneManager.controls.target.copy(t); game.sceneManager.controls.update(); }
    else cam.lookAt(t);
  }, report.origin);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/diag-staircase.png' });
});
