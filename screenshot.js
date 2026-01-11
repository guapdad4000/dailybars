const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 430, height: 932 });
    await page.goto('https://8080-i8rzdos0u1ik853ijt0w1-82b888ba.sandbox.novita.ai', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
    });
    
    // Wait for the app to render
    await page.waitForTimeout(3000);
    
    // Click to navigate to Scratch Lab
    const navItems = await page.$$('[style*="cursor: pointer"]');
    // Find and click Scratch Lab tab if available
    await page.evaluate(() => {
        const tabs = document.querySelectorAll('[style*="cursor: pointer"]');
        tabs.forEach(tab => {
            if (tab.textContent && tab.textContent.includes('SCRATCH')) {
                tab.click();
            }
        });
    });
    
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: '/home/user/webapp/scratch-lab-screenshot.png' });
    console.log('Screenshot saved');
    await browser.close();
})();
