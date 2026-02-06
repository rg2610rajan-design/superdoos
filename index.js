const express = require('express');
const { chromium } = require("playwright");
const app = express();

// Important: This allows the API to read JSON sent from PHP
app.use(express.json());

const port = process.env.PORT || 3000;

app.post('/get-price', async (req, res) => {
    const { productId, qty, chosen } = req.body;

    // Basic validation
    if (!productId || !qty || !chosen) {
        return res.status(400).json({ error: "Missing productId, qty, or chosen parameters." });
    }

    console.log(`Scraping price for Product: ${productId}, Qty: ${qty}`);

    const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    try {
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();

        // Pass the PHP parameters into the browser context
        await page.addInitScript(({ productId, qty, chosen }) => {
            const originalFetch = window.fetch;
            window.__PRICE_RESPONSE__ = null;
            window.fetch = async (url, options = {}) => {
                if (typeof url === "string" && url.includes("/productDesigner/design/price")) {
                    try {
                        let body = JSON.parse(options.body);
                        // Apply parameters from PHP
                        body.productId = productId;
                        body.qty = qty;
                        body.chosen = chosen;
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
        }, { productId, qty, chosen });

        await page.goto("https://www.superdoos.nl/doos-op-maat/vouwdozen-op-maat", {
            waitUntil: "domcontentloaded",
            timeout: 60000
        });

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
    console.log(`Dynamic API running on port ${port}`);
});
