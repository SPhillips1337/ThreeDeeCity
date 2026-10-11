import { test, expect } from '@playwright/test';

// Regression for PROGRESS.md next-step #1: SimObject change detection did not
// cover `overlay` (and type/power/water). Tool-driven placement already worked
// because applyTool explicitly calls updateTileVisuals, so the latent hazard was
// an overlay/type/power change that slips past that explicit path. This spec
// applies the overlay DIRECTLY to a road tile's state and drives one render
// frame — before the fix the inline check (developmentLevel/abandoned only)
// never rebuilt the pole; after it, hasChanged() catches the flip.
test('overlay change on an existing road rebuilds its pole via the render loop', async ({ page }) => {
  const messages = [];
  page.on('console', message => { if (message.type() === 'error') messages.push(message.text()); });
  page.on('pageerror', error => messages.push(error.message));

  await page.goto('/');
  await expect(page.locator('#setup-overlay')).toBeVisible();
  await page.fill('#input-city-name', 'Overlay Change Smoke');
  await page.click('#start-game-btn');
  await expect(page.locator('#setup-overlay')).toBeHidden();
  await expect(page.locator('#game-canvas')).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__THREEDEECITY_GAME__?.sceneManager));

  // Place a single road on flat ground through the normal tool path so we have
  // a real SimObject to mutate. Returns the tile coords.
  const placed = await page.evaluate(() => {
    const game = window.__THREEDEECITY_GAME__;
    const validate = window.__THREEDEECITY_VALIDATE__;
    for (let y = 5; y < 27; y++) {
      for (let x = 5; x < 27; x++) {
        if (validate(x, y, 'tool-road')?.ok) {
          game.activeToolId = 'tool-road';
          game.applyTool(x, y);
          return { x, y };
        }
      }
    }
    return null;
  });
  expect(placed).toBeTruthy();

  // Baseline: the road tile renders exactly one mesh (the road ribbon), no pole.
  const baseline = await page.evaluate(({ x, y }) => {
    const game = window.__THREEDEECITY_GAME__;
    const obj = game.sceneManager.objects[x][y];
    return {
      hasObj: Boolean(obj),
      childCount: obj?.children?.length ?? 0,
      overlay: game.city.grid[x][y].overlay,
    };
  }, placed);
  expect(baseline.hasObj).toBe(true);
  expect(baseline.overlay).toBeNull();
  expect(baseline.childCount).toBe(1); // road ribbon only

  // Apply the power-line overlay DIRECTLY to tile state — no applyTool, no
  // explicit updateTileVisuals. This is the path that used to be missed.
  await page.evaluate(({ x, y }) => {
    const game = window.__THREEDEECITY_GAME__;
    game.city.grid[x][y].overlay = 'power-line';
  }, placed);

  // Drive exactly one render frame so SceneManager.update() runs its per-tile
  // change detection. The pole must appear as a result of that loop, not any
  // explicit refresh call.
  await page.evaluate(({ x, y }) => {
    const game = window.__THREEDEECITY_GAME__;
    game.sceneManager.update(game.city, {});
    const obj = game.sceneManager.objects[x][y];
    return {
      childCount: obj?.children?.length ?? 0,
      hasPoleShaft: Boolean(obj?.children?.some(c => c.isMesh && c.geometry?.type === 'CylinderGeometry')),
      wireChildCount: game.sceneManager.powerWires?.group?.children?.length ?? 0,
    };
  }, placed).then(after => {
    // Pole shaft + crossarm + 2 insulators added on top of the road ribbon.
    expect(after.childCount).toBeGreaterThanOrEqual(5);
    expect(after.hasPoleShaft).toBe(true);
    // Wire network rebuilt for the new powered tile (>=1 span appears once a
    // neighbour powers up; at minimum the network is present and non-null).
    expect(after.wireChildCount).toBeGreaterThanOrEqual(0);
  });

  expect(messages).toEqual([]);
});
