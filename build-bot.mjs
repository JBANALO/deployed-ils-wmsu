import puppeteer from 'puppeteer';

(async () => {
  // Use --no-sandbox for compatibility
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  try {
    console.log('[Build Bot] Opening Expo Dashboard...');
    await page.goto('https://expo.dev/accounts/heidi23/projects/wmsu-elemscan', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('[Build Bot] Page loaded. Taking screenshot...');
    await page.screenshot({ path: '/tmp/expo-dashboard.png' });

    // Look for Build button
    const buildButtonSelector = 'button:has-text("Build")';
    const buildButton = await page.$(buildButtonSelector);
    
    if (buildButton) {
      console.log('[Build Bot] Found Build button, clicking...');
      await buildButton.click();
      await page.waitForTimeout(2000);
      
      // Look for Android option
      const androidOption = await page.$('text=Android');
      if (androidOption) {
        console.log('[Build Bot] Found Android option, clicking...');
        await androidOption.click();
        await page.waitForTimeout(2000);
        
        // Look for Preview profile
        const previewProfile = await page.$('text=preview');
        if (previewProfile) {
          console.log('[Build Bot] Found Preview profile, clicking...');
          await previewProfile.click();
          await page.waitForTimeout(2000);
          
          // Look for Start Build button
          const startBuildButton = await page.$('button:has-text("Start Build")');
          if (startBuildButton) {
            console.log('[Build Bot] Clicking Start Build button...');
            await startBuildButton.click();
            console.log('[Build Bot] Build submitted!');
            await page.waitForTimeout(3000);
          }
        }
      }
    } else {
      console.log('[Build Bot] Build button not found on page');
      console.log('[Build Bot] Page content: ', await page.content());
    }

    await page.screenshot({ path: '/tmp/expo-after-build.png' });
    
  } catch (error) {
    console.error('[Build Bot] Error:', error);
  } finally {
    await browser.close();
  }
})();
