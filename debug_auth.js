import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/api/auth/signin');
    const html = await page.content();
    console.log("HTML START");
    console.log(html);
    console.log("HTML END");
    await browser.close();
})();
