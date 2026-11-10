/**
 * Host half of the peak/balance indicator.
 *
 * An installed Client module cannot reach the generated `remote.account`
 * namespace, so this half reads the wallet through the account service and
 * exposes one same-origin route that returns wallet numbers only. Peak pricing
 * needs no Host support: the client half derives it from the UTC clock.
 */
export function apply(ctx) {
  const webServer = ctx.get('webServer');
  const account = ctx.get('deepseekAccount');
  if (webServer === undefined || account === undefined) return;

  const respond = (response, payload, status = 200) => {
    response.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    });
    response.end(JSON.stringify(payload));
  };

  ctx.effect(() => webServer.register({
    kind: 'exact',
    path: '/dsh-peak-balance/balance',
    handler: (request, response) => {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        respond(response, { state: 'unavailable' }, 405);
        return;
      }
      // A browser page from another origin must not read the wallet.
      const site = request.headers['sec-fetch-site'];
      if (site !== undefined && site !== 'same-origin' && site !== 'none') {
        respond(response, { state: 'unavailable' }, 403);
        return;
      }
      const client = { version: '0.2.2', locale: 'en', timezoneOffsetSeconds: 0 };
      Promise.resolve()
        .then(() => account.getBalance(client))
        .then((balance) => {
          if (balance === null || balance === undefined) {
            respond(response, { state: 'signed-out' });
            return;
          }
          if (balance.status !== 'ready') {
            respond(response, { state: 'unavailable' });
            return;
          }
          const wallet = (entry) => ({ currency: entry.currency, balance: entry.balance });
          respond(response, {
            state: 'ready',
            wallets: balance.value.map(wallet),
            bonus: balance.bonusWallets.map(wallet),
          });
        })
        .catch((error) => {
          ctx.logger?.warn?.(error);
          respond(response, { state: 'unavailable' });
        });
    },
  }), 'peak-balance: balance route');
}
