const express = require("express");
const puppeteer = require("puppeteer");
const path = require("path");
const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON body
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// Screenshot API endpoint
app.post("/api/screenshot", async (req, res) => {
  try {
    const { selector } = req.body;

    if (!selector) {
      return res.status(400).json({ error: "Selector is required" });
    }

    // Launch a headless browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // Set viewport to ensure consistent rendering
    await page.setViewport({
      width: 1024,
      height: 768,
      deviceScaleFactor: 2, // Higher resolution for better quality
    });

    // Navigate to our page
    const fullUrl = `http://localhost:${port}`;
    await page.goto(fullUrl, { waitUntil: "networkidle0" });

    // Wait for the specific element (the blue imgbb card) to be fully loaded
    await page.waitForSelector(selector, { visible: true });

    // Get the element we want to screenshot (just the imgbb.com blue card)
    const element = await page.$(selector);

    if (!element) {
      await browser.close();
      return res.status(404).json({ error: "Element not found" });
    }

    // Take screenshot of just that element with padding
    const screenshot = await element.screenshot({
      type: "png",
      omitBackground: false,
      padding: 0,
    });

    await browser.close();

    // Set appropriate headers
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="imgbb-image.png"'
    );
    res.setHeader("Content-Type", "image/png");

    // Send the screenshot
    res.send(screenshot);
  } catch (error) {
    console.error("Screenshot error:", error);
    res
      .status(500)
      .json({ error: "Failed to capture screenshot: " + error.message });
  }
});

// Serve the main HTML page for any other route
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(
    `Screenshot service ready at http://localhost:${port}/api/screenshot`
  );
});
