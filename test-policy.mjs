import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const root = path.dirname(require.resolve("renovate/package.json"));
const load = (file) =>
  import(pathToFileURL(path.join(root, "dist", file)).href);
const { mergeChildConfig } = await load("config/utils.js");
const { resolveConfigPresets } = await load("config/presets/index.js");
const { applyPackageRules } = await load("util/package-rules/index.js");
const raw = JSON.parse(
  fs.readFileSync(new URL("default.json", import.meta.url)),
);
const { config: preset } = await resolveConfigPresets(raw);
const types = [
  "major",
  "minor",
  "patch",
  "pin",
  "digest",
  "pinDigest",
  "lockFileMaintenance",
];
let cases = 0;

async function resolve(
  type,
  datasource = "npm",
  local = {},
  name = "example-dependency",
) {
  const config = mergeChildConfig(preset, local);
  return applyPackageRules({
    ...config,
    depName: name,
    packageName: name,
    datasource,
    manager:
      datasource === "npm"
        ? "npm"
        : datasource === "crate"
          ? "cargo"
          : "github-actions",
    updateType: type,
  });
}

for (const datasource of ["npm", "crate", "github-tags"]) {
  for (const type of types) {
    const result = await resolve(type, datasource);
    assert.equal(result.automerge, true);
    assert.equal(result.automergeType, "pr");
    assert.equal(result.platformAutomerge, false);
    assert.equal(result.ignoreTests, false);
    assert.equal(result.internalChecksAsSuccess, false);
    assert.equal(result.separateMajorMinor, true);
    assert.equal(
      result.groupSlug,
      ["minor", "patch"].includes(type) ? "minor-patch" : undefined,
    );
    if (datasource === "npm") {
      assert.equal(result.minimumReleaseAge, "3 days");
      assert.equal(result.internalChecksFilter, "strict");
    }
    cases++;
  }
}

const longerDelay = {
  minimumReleaseAge: "7 days",
  packageRules: [{ matchDatasources: ["npm"], minimumReleaseAge: "7 days" }],
  schedule: ["* 0-5 * * 0"],
  prConcurrentLimit: 1,
};
const long = await resolve("minor", "npm", longerDelay);
assert.equal(long.minimumReleaseAge, "7 days");
assert.equal(long.prConcurrentLimit, 1);
assert.deepEqual(long.schedule, ["* 0-5 * * 0"]);
cases++;

const manual = {
  packageRules: [
    {
      matchPackageNames: ["manual-package"],
      automerge: false,
      groupName: null,
      groupSlug: null,
    },
  ],
};
for (const type of ["major", "minor", "patch"]) {
  const result = await resolve(type, "npm", manual, "manual-package");
  assert.equal(result.automerge, false);
  assert.equal(result.groupName, null);
  assert.equal(result.groupSlug, null);
  cases++;
}

const noCi = {
  automerge: false,
  packageRules: [{ matchUpdateTypes: types, automerge: false }],
};
for (const type of types) {
  assert.equal((await resolve(type, "npm", noCi)).automerge, false);
  cases++;
}
const disabled = {
  packageRules: [{ matchUpdateTypes: ["patch", "digest"], enabled: false }],
};
assert.equal((await resolve("patch", "npm", disabled)).enabled, false);
assert.equal((await resolve("digest", "npm", disabled)).enabled, false);
cases += 2;
console.log(`PASS: ${cases} resolved-policy cases`);
