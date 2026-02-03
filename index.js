const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Intercept fetch BEFORE page loads
  await page.addInitScript(() => {
    const originalFetch = window.fetch;
    window.__PRICE_RESPONSE__ = null;

    window.fetch = async (url, options = {}) => {
      // Only target price endpoint
      if (
        typeof url === "string" &&
        url.includes("/productDesigner/design/price")
      ) {
        try {
          let body = JSON.parse(options.body);

          // ✅ FORCE EXACT BODY LIKE REAL SITE
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

          console.log("✅ PRICE REQUEST BODY SENT:", body);
        } catch (e) {
          console.error("Body parse error", e);
        }
      }

      const response = await originalFetch(url, options);

      // Capture JSON response
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

  console.log("Opening page...");
  await page.goto("https://www.superdoos.nl/doos-op-maat/vouwdozen-op-maat", {
    waitUntil: "networkidle",
  });

  console.log("Waiting for price calculation...");
  await page.waitForFunction(() => window.__PRICE_RESPONSE__ !== null, {
    timeout: 60000,
  });

  const price = await page.evaluate(() => window.__PRICE_RESPONSE__);

  console.log("\n✅ FINAL PRICE RESPONSE");
  console.log(JSON.stringify(price, null, 2));

  await browser.close();
})();
