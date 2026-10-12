/**
 * Loads the full route table. Express throws at startup when a route is given
 * an undefined handler (e.g. a controller function that isn't exported), which
 * crashes the deploy — this test catches that before it ships.
 */
process.env.DISABLE_CRON = "true";

test("all routes load with defined handlers", () => {
  expect(() => require("../Route/route.js")).not.toThrow();
});

test("admin dashboard tool lock endpoints are registered", () => {
  const router = require("../Route/route.js");
  const paths = router.stack.filter((l) => l.route).map((l) => `${Object.keys(l.route.methods)[0].toUpperCase()} ${l.route.path}`);
  expect(paths).toEqual(expect.arrayContaining(["GET /api/admin/dashboard-tools", "PUT /api/admin/dashboard-tools"]));
});
