# Shared Renovate policy

Use this public preset from any repository:

```json
{
  "extends": ["github>nickysemenza/renovate-config"]
}
```

The unpinned reference follows this repository's default branch. Changes take effect on the next Renovate run; consumers may pin a reviewed tag if they need a fixed policy version.

## Defaults

- Group minor and patch updates into one pull request per repository; keep major upgrades out of that group.
- Wait three days for npm releases, using strict internal-check filtering before creating update branches.
- Automerge major, minor, patch, pin, digest, and lock-file-maintenance updates only through pull requests with passing checks. Renovate performs the merge; native platform automerge and ignoring tests are disabled. Missing checks are not treated as green.
- Preserve Renovate's safe default rebase behavior. Existing repository schedules and PR limits can override the preset.

The npm cooldown filters proposed dependency versions. It is not a substitute for the package manager's release-age checks on transitive dependencies or lockfile changes. Keep those checks enabled in CI.

## Local exceptions

Repository configuration is applied after presets. Matching `packageRules` are merged in order, with later rules winning for a particular field. Keep package-specific opt-outs and manual-verification requirements in the consuming repository.

A longer npm cooldown needs a local rule, because the shared cooldown is itself a package rule:

```json
{
  "extends": ["github>nickysemenza/renovate-config"],
  "packageRules": [
    { "matchDatasources": ["npm"], "minimumReleaseAge": "7 days" },
    {
      "matchPackageNames": ["manual-package"],
      "automerge": false,
      "groupName": null,
      "groupSlug": null
    }
  ]
}
```

Clearing the manual package's group keeps it out of the automatic minor/patch group. Existing local grouping rules should be reviewed during migration, because they can override shared grouping.

Repositories without meaningful CI must explicitly disable automerge in a final matching package rule until checks are available. A root-level `automerge: false` alone does not override an inherited package rule.

## Validation

Requires Node.js 24:

```sh
npm ci --ignore-scripts
npm run validate
npm test
```

CI runs the pinned official Renovate validator and effective-policy regression tests, including local cooldown, manual-verification, disabled-update, and no-CI overrides. Only generic policy and fixtures belong in this public repository.

- [Shareable presets](https://docs.renovatebot.com/config-presets/)
- [Configuration precedence](https://docs.renovatebot.com/config-overview/)
- [Minimum release age](https://docs.renovatebot.com/key-concepts/minimum-release-age/)
