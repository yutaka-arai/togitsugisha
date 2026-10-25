const { test } = require("@playwright/test");
const { execFileSync } = require("child_process");
const path = require("path");

test("ukiyoe public assets are self-contained and mapped to products", () => {
  const script = path.join(__dirname, "..", "scripts", "verify-ukiyoe-images.py");
  const output = execFileSync("python3", [script], { encoding: "utf8" });
  const result = JSON.parse(output);
  const expected = new Map([
    ["ukiyoe-004-main", ["ukiyoe-004", "WEBP", 844, 1500]],
    ["ukiyoe-004-thumb", ["ukiyoe-004", "WEBP", 450, 800]],
    ["ukiyoe-005-main", ["ukiyoe-005", "WEBP", 844, 1500]],
    ["ukiyoe-005-thumb", ["ukiyoe-005", "WEBP", 450, 800]],
  ]);
  if (result.status !== "PASS" || result.source_correspondence !== "SKIPPED" || result.source_checks.length !== 0 || result.public_asset_checks.length !== expected.size) {
    throw new Error("Unexpected ukiyoe image verification mode or count: " + output);
  }
  for (const check of result.public_asset_checks) {
    const expectedCheck = expected.get(check.id);
    if (!expectedCheck || check.item_id !== expectedCheck[0] || check.format !== expectedCheck[1] || check.size[0] !== expectedCheck[2] || check.size[1] !== expectedCheck[3]) {
      throw new Error("Unexpected public asset verification entry: " + JSON.stringify(check));
    }
  }
});
