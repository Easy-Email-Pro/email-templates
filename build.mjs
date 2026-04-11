import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import mjml2html from "mjml";
import puppeteer from "puppeteer-core";

const rootDir = new URL(".", import.meta.url).pathname;

// Find all template directories that contain index.mjml
const templates = readdirSync(rootDir)
  .filter((name) => /^template\d+$/.test(name))
  .filter((name) => existsSync(join(rootDir, name, "index.mjml")))
  .sort((a, b) => {
    const numA = parseInt(a.replace("template", ""));
    const numB = parseInt(b.replace("template", ""));
    return numA - numB;
  });

console.log(`Found ${templates.length} templates\n`);

// Step 1: Convert all MJML to HTML
const succeeded = [];
for (const dir of templates) {
  const mjmlPath = join(rootDir, dir, "index.mjml");
  const htmlPath = join(rootDir, dir, "index.html");
  const mjmlContent = readFileSync(mjmlPath, "utf-8");

  try {
    const { html, errors } = mjml2html(mjmlContent);

    if (errors.length > 0) {
      console.warn(`⚠ ${dir}: ${errors.length} warning(s)`);
      errors.forEach((e) => console.warn(`  ${e.message}`));
    }

    writeFileSync(htmlPath, html);
    succeeded.push(dir);
    console.log(`✓ ${dir}/index.html`);
  } catch (err) {
    console.error(`✗ ${dir}/index.mjml — ${err.message}`);
  }
}

// Step 2: Screenshot all HTML files
const browser = await puppeteer.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const page = await browser.newPage();
await page.setViewport({ width: 660, height: 800 });

for (const dir of succeeded) {
  const htmlPath = join(rootDir, dir, "index.html");
  const pngPath = join(rootDir, dir, "thumbnail.png");

  await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle0" });
  await page.screenshot({ path: pngPath, fullPage: true });
  console.log(`✓ ${dir}/thumbnail.png`);
}

await browser.close();
console.log("\nDone!");
