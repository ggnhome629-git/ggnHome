const assert = require("node:assert/strict");
const library = require("../data/notification-templates.json");

assert.equal(library.locale, "en-IN", "Template locale must be explicit");
assert.ok(Array.isArray(library.templates), "templates must be an array");
assert.ok(library.templates.length >= 200, "At least 200 templates are required");

const ids = new Set();
const categories = new Set();
const placeholders = new Set(["propertyTitle", "priceLabel", "sector", "location", "bedrooms", "propertyPath"]);

for (const template of library.templates) {
  assert.ok(template.id && !ids.has(template.id), `Missing or duplicate template id: ${template.id}`);
  ids.add(template.id);
  assert.ok(template.category, `Missing category: ${template.id}`);
  categories.add(template.category);
  assert.ok(typeof template.requiresProperty === "boolean", `requiresProperty must be boolean: ${template.id}`);
  assert.ok(template.title && template.title.length <= 100, `Invalid title length: ${template.id}`);
  assert.ok(template.body && template.body.length <= 240, `Invalid body length: ${template.id}`);
  assert.ok(template.deepLink, `Missing deepLink: ${template.id}`);
  const all = `${template.title} ${template.body} ${template.deepLink}`;
  for (const match of all.matchAll(/{{(\w+)}}/g)) {
    assert.ok(placeholders.has(match[1]), `Unknown placeholder {{${match[1]}}} in ${template.id}`);
  }
  if (template.requiresProperty) {
    assert.ok(template.deepLink.includes("{{propertyPath}}"), `Property template needs propertyPath: ${template.id}`);
  }
}
assert.ok(categories.size >= 10, "Templates should cover at least 10 notification categories");
console.log(`Validated ${ids.size} notification templates across ${categories.size} categories.`);
