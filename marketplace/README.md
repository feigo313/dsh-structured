# Marketplace submission (prepared, not submitted)

Source: `marketplace/data/plugins/feigo313__dsh-structured.yml`

Copy this file into a fork of `awesome-dsh-plugin/awesome-dsh-plugin` at
`data/plugins/feigo313__dsh-structured.yml`, then commit and open a PR.
Do not edit the generated README files.

## One-time fork / PR commands (run by Boss with explicit consent)

```powershell
gh repo fork awesome-dsh-plugin/awesome-dsh-plugin --clone
cd awesome-dsh-plugin
git checkout -b add-dsh-structured
Copy-Item 'G:\dsh-structured\marketplace\data\plugins\feigo313__dsh-structured.yml' 'data\plugins\feigo313__dsh-structured.yml'
git add 'data/plugins/feigo313__dsh-structured.yml'
git commit -m 'Add feigo313/dsh-structured'
git push -u origin add-dsh-structured
gh pr create --repo awesome-dsh-plugin/awesome-dsh-plugin --title 'Add feigo313/dsh-structured' --body 'Structured output plugin for DSH: no-label title card, tables/lists/steps, per-session toggle, style.md override.'
```

## Gates

- GitHub repo `feigo313/dsh-structured` must exist and be at least 1 day old.
- Add topic `dsh-plugin` to the repo.
- `package.json` must declare `dsh.bundle` (it does) and `package.json` `repository` must point at the listed repo (it does).
- Publish to npm (preferred) or attach a prebuilt `.tgz` to a GitHub Release.
- Category: `session` (output style / per-session toggle); maintainer may re-file.
- Screenshots: repository `screenshots.json` currently covers title card, table/callout, GenUI; markdown status table, code block and narrow-window screenshots are still missing and must be added before the marketplace listing is considered complete.
