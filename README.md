# dsh-peak-balance

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin that puts two numbers you actually check into the conversation header: **is DeepSeek on peak or off-peak pricing right now**, and **how much is left on your account**.

```
● Непиковое время · ¥60,94        ← off-peak, green dot
● Пиковое время   · ¥60,94        ← peak, amber dot
```

The chip sits in the header's leading seat, so it is visible both on the start screen and inside a session. Hover it for the pricing schedule, the local time of the next change, per-currency balances and bonus credit. Click to refresh; it also refreshes when the window regains focus and every five minutes.

## What it shows

- **Pricing state** from the UTC clock, using DeepSeek's published schedule: peak is **01:00–04:00 and 06:00–10:00 UTC, Monday–Friday**; every other hour is off-peak at half the rate, and whole weekends are off-peak. The status flips by itself at each boundary.
- **Account balance** from the DeepSeek account signed in to this Harness installation: recharge wallets (one per currency, the funded one is displayed) plus bonus credit in the tooltip.

If no account is signed in, the balance shows as `—` and the pricing indicator keeps working.

## Install

The plugin is a profile bundle: install it into the profile you boot (`desktop` for the app, `web` for `dsh web`). The `plugin` subcommand forwards to pnpm and then adds the package to `dsh.profile.bundles`.

```bash
dsh plugin --profile desktop add github:STaiNUm/dsh-peak-balance
```

`dsh` is the CLI bundled with the desktop app
(`…/DeepSeek Harness/resources/runtime/cli/bin/dsh.cmd` on Windows); `npx @deepseek-ai/dsh …` works too.

Restart the Harness app after installing — client bundles load when the page boots. From a local checkout, point `add` at the directory instead:

```bash
git clone https://github.com/STaiNUm/dsh-peak-balance.git
dsh plugin --profile desktop add ./dsh-peak-balance
```

## How it works

- `client.js` registers one component in the `conversation.header.leading` slot and computes the pricing window from `Date` in UTC. Labels come from the Harness locale service (`ru`, `en`, `zh`); styling uses only `--dsw-alias-*` theme tokens.
- `index.js` is the host half. It answers one same-origin route, `/dsh-peak-balance/balance`, which reads the wallet through the account service and returns numbers only — no tokens, no profile data. Requests from another origin are refused (`403`), and the route is reachable only on the local Harness server.

The generated `remote.account` namespace is not exposed to installed client modules, which is why the balance travels over this small route instead of a typed remote call.

## Limits

- Chinese public holidays are not modelled: DeepSeek treats them as off-peak, this plugin still uses the weekday schedule.
- Only the pricing *state* is shown. The plugin does not estimate the cost of a session.
- Peak blocks are read from the [official pricing page](https://api-docs.deepseek.com/quick_start/pricing); if the schedule changes, `PEAK_BLOCKS` in `client.js` is the one line to update.

## License

MIT — see [LICENSE](LICENSE).

---

По-русски: плагин показывает в шапке, пиковое сейчас время у DeepSeek или нет и сколько осталось на балансе. Наведите курсор — расписание, время следующего переключения и бонусы; клик обновляет баланс. Без входа в аккаунт баланс показывается как «—», индикатор тарифа работает всегда.
