import { test, expect } from '@playwright/test';

test('power lines render poles and wires', async ({ page }, testInfo) => {
  const messages = [];
  page.on('console', message => {
    if (message.type === 'error') messages.push(message.text());
  });
  page.on('pageerror', error => messages.push(error.message));

  await page.goto('/');
  await expect(page.locator('#setup-overlay')).toBeVisible();
  await page.fill('#input-city-name', 'Power Line Smoke');
  await page.click('#start-game-btn');
  await expect(page.locator('#setup-overlay')).toBeHidden();
  await expect(page.locator('#game-canvas')).toBeVisible();

  await page.waitForFunction(() => Boolean(window.__THREEDEECITY_GAME__?.sceneManager));

  // Find a flat area and place a 3-tile power line run
  const placed = await page.evaluate(() => {
    const game = window.__THREEDEECITY_GAME__;
    const validate = window.__THREEDEECITY_VALIDATE__;
    for (let y = 5; y < 27; y++) {
      for (let x = 5; x < 27; x++) {
        if (validate(x, y, 'tool-power-line')?.ok &&
            validate(x + 1, y, 'tool-power-line')?.ok &&
            validate(x + 2, y, 'tool-power-line')?.ok) {
          for (const px of [x, x + 1, x + 2]) {
            game.activeToolId = 'tool-power-line';
            game.applyTool(px, y);
          }
          return { x, y, ok: true };
        }
      }
    }
    return { ok: false };
  });
  console.log('Placement results:', JSON.stringify(placed));
  expect(placed.ok).toBe(true);

  // Verify the wire network has children (spans)
  const wireState = await page.evaluate(() => {
    const game = window.__THREEDEECITY_GAME__;
    const network = game.sceneManager.powerWires;
    return {
      hasNetwork: Boolean(network),
      childCount: network?.group?.children?.length ?? 0,
    };
  });
  console.log('Wire state:', JSON.stringify(wireState));
  expect(wireState.hasNetwork).toBe(true);
  expect(wireState.childCount).toBeGreaterThanOrEqual(4); // 2 spans × 2 cables

  // Screenshot for visual verification
  await page.evaluate(() => {
    const game = window.__THREEDEECITY_GAME__;
    const camera = game.sceneManager.camera;
    const controls = game.sceneManager.controls;
    controls.target.set(0, 0, 0);
    camera.position.set(25, 22, 25);
    camera.lookAt(0, 0, 0);
    game.sceneManager.update(game.city, {});
  });
  await page.screenshot({ path: testInfo.outputPath('power-line-smoke.png') });

  expect(messages).toEqual([]);
});
