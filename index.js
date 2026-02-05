const express = require('express');
const { chromium } = require("playwright");
const app = express();
const port = process.env.PORT || 8080;

app.get('/get-price', async (req, res) => {
    // Launch with specific flags for server environments
    const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
    });

    try {
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();

        // --- Your existing intercept logic ---
        await page.addInitScript(() => {
            const originalFetch = window.fetch;
            window.__PRICE_RESPONSE__ = null;
            window.fetch = async (url, options = {}) => {
                if (typeof url === "string" && url.includes("/productDesigner/design/price")) {
                    try {
                        let body = JSON.parse(options.body);
                        body.productId = 1481;
                        body.qty = 1500;
                        body.chosen = {
                            code: "0201",
                            handles: "geen handgrepen / stansbewerking",
                            creases: "nee",
                            printColors: "onbedrukt",
                            qualityCode: 10158,
                            length: "600",
                            width: "600",
                            height: "500",
                            qualityCode_color: "Bruin/Bruin",
                            qualityCode_flute: "BC",
                            qualityCode_cardboardQuality: "standard",
                            designName: "n mn ",
                        };
                        options.body = JSON.stringify(body);
                    } catch (e) {}
                }
                const response = await originalFetch(url, options);
                if (typeof url === "string" && url.includes("/productDesigner/design/price")) {
                    try {
                        const text = await response.clone().text();
                        window.__PRICE_RESPONSE__ = JSON.parse(text);
                    } catch (e) {}
                }
                return response;
            };
        });

        await page.goto("https://www.superdoos.nl/doos-op-maat/vouwdozen-op-maat", {
            waitUntil: "domcontentloaded",
            timeout: 60000
        });

        // Wait for price data
        await page.waitForFunction(() => window.__PRICE_RESPONSE__ !== null, { timeout: 30000 });
        const priceData = await page.evaluate(() => window.__PRICE_RESPONSE__);

        res.json(priceData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        await browser.close();
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`API running on port ${port}`);
});
