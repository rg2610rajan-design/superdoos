import { chromium } from "playwright-core";

const BROWSERLESS_WS =
  `wss://production-sfo.browserless.io/chromium/playwright?token=${process.env.BROWSERLESS_TOKEN}`;

(async () => {
  // ✅ CONNECT to Browserless (DO NOT launch)
  const browser = await chromium.connect(BROWSERLESS_WS);

  const context = await browser.newContext();
  const page = await context.newPage();

  // Intercept fetch BEFORE page loads
  await page.addInitScript(() => {
    const originalFetch = window.fetch;
    window.__PRICE_RESPONSE__ = null;

    window.fetch = async (url, options = {}) => {
      if (
        typeof url === "string" &&
        url.includes("/productDesigner/design/price")
      ) {
        try {
          let body = JSON.parse(options.body);

          body.productId = 1481;
          body.qty = 1500;
          body.customField = "";

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

      if (
        typeof url === "string" &&
        url.includes("/productDesigner/design/price")
      ) {
        try {
          const text = await response.clone().text();
          if (!text.startsWith("<")) {
            window.__PRICE_RESPONSE__ = JSON.parse(text);
          }
        } catch (e) {}
      }

      return response;
    };
  });

  await page.goto(
    "https://www.superdoos.nl/doos-op-maat/vouwdozen-op-maat",
    { waitUntil: "networkidle" }
  );

  await page.waitForFunction(
    () => window.__PRICE_RESPONSE__ !== null,
    { timeout: 60000 }
  );

  const price = await page.evaluate(() => window.__PRICE_RESPONSE__);

  console.log("✅ FINAL PRICE RESPONSE");
  console.log(JSON.stringify(price, null, 2));

  await browser.close();
})();
