window.__ModuleLoader__.load({
  id: 'dsh-peak-balance',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /** Locale namespace owned by this plugin. */
    const NS = 'peak-balance';
    const MINUTE = 60000;

    /**
     * DeepSeek peak blocks as [start, end) minutes from 00:00 UTC.
     * Source: https://api-docs.deepseek.com/quick_start/pricing
     * Peak: 01:00-04:00 and 06:00-10:00 UTC, Monday-Friday. Everything else,
     * including whole weekends, is off-peak at half the peak rate.
     */
    const PEAK_BLOCKS = [[60, 240], [360, 600]];

    const EN = {
      peak: 'Peak pricing',
      offpeak: 'Off-peak pricing',
      peakHint: 'Full rate now. Off-peak pricing starts at',
      offpeakHint: 'Off-peak rate, 50% off. Peak pricing resumes at',
      schedule: 'Peak hours: 01:00-04:00 and 06:00-10:00 UTC, Monday to Friday.',
      balance: 'DeepSeek balance',
      bonus: 'Bonus',
      refresh: 'Click to refresh',
      signedOut: 'Not signed in to DeepSeek',
      unavailable: 'Balance unavailable',
      loading: 'Loading balance',
    };

    const RU = {
      peak: 'Пиковое время',
      offpeak: 'Непиковое время',
      peakHint: 'Полный тариф. Скидка начнётся в',
      offpeakHint: 'Скидка 50%. Пиковый тариф начнётся в',
      schedule: 'Пиковые часы: 01:00-04:00 и 06:00-10:00 UTC, по будням.',
      balance: 'Баланс DeepSeek',
      bonus: 'Бонусы',
      refresh: 'Нажмите, чтобы обновить',
      signedOut: 'Нет входа в DeepSeek',
      unavailable: 'Баланс недоступен',
      loading: 'Загрузка баланса',
    };

    const ZH = {
      peak: '高峰计费',
      offpeak: '非高峰计费',
      peakHint: '当前为全价。优惠价开始于',
      offpeakHint: '非高峰五折。高峰计费恢复于',
      schedule: '高峰时段：UTC 01:00-04:00 与 06:00-10:00，周一至周五。',
      balance: 'DeepSeek 余额',
      bonus: '赠送金',
      refresh: '点击刷新',
      signedOut: '未登录 DeepSeek',
      unavailable: '余额不可用',
      loading: '正在加载余额',
    };

    const DICTS = { en: EN, ru: RU, zh: ZH };

    /** Whether a UTC day index (0 = Sunday) is a weekend. */
    function isWeekend(dayUtc) {
      return dayUtc === 0 || dayUtc === 6;
    }

    /** Whether an instant falls in a DeepSeek peak window. */
    function inPeak(ms) {
      const date = new Date(ms);
      if (isWeekend(date.getUTCDay())) return false;
      const minutes = date.getUTCHours() * 60 + date.getUTCMinutes();
      for (let i = 0; i < PEAK_BLOCKS.length; i++) {
        if (minutes >= PEAK_BLOCKS[i][0] && minutes < PEAK_BLOCKS[i][1]) return true;
      }
      return false;
    }

    /**
     * First minute-aligned instant whose pricing class differs from `ms`.
     * Bounded to nine days, which always spans the longest weekend stretch.
     */
    function nextChange(ms) {
      const current = inPeak(ms);
      let t = Math.ceil(ms / MINUTE) * MINUTE;
      for (let i = 0; i < 60 * 24 * 9; i++) {
        if (inPeak(t) !== current) return t;
        t += MINUTE;
      }
      return null;
    }

    const CSS = [
      '.dshPeakBalance{display:inline-flex;align-items:center;gap:6px;height:24px;',
      'padding:0 9px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);',
      'background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);',
      'font-size:12px;line-height:16px;font-weight:500;white-space:nowrap;',
      'user-select:none;font-variant-numeric:tabular-nums;transition:background .12s ease;}',
      '.dshPeakBalance:hover{background:var(--dsw-alias-bg-layer-2);}',
      '.dshPeakBalance__dot{width:6px;height:6px;border-radius:50%;flex:none;}',
      '.dshPeakBalance__sep{opacity:.45;}',
      '.dshPeakBalance__value{color:var(--dsw-alias-label-primary);font-weight:600;}',
      '@media (max-width:1100px){.dshPeakBalance__label{display:none;}}',
    ].join('');

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        /** Read an optional service without letting a strict context abort apply. */
        const service = (name) => {
          try {
            const fromProperty = ctx[name];
            if (fromProperty !== undefined && fromProperty !== null) return fromProperty;
            return ctx.get(name);
          } catch (error) {
            return undefined;
          }
        };

        const slots = service('slots');
        if (slots === undefined || slots === null) {
          console.error('peak-balance: the slots service is unavailable');
          return;
        }

        const localeSvc = service('locale');

        /** Active locale id, or `en` when the locale service is unavailable. */
        function readActive() {
          if (localeSvc === undefined || localeSvc === null) return 'en';
          try {
            const snapshot = localeSvc.getLocale();
            const active = snapshot !== null && snapshot !== undefined ? snapshot.active : undefined;
            return typeof active === 'string' && active.length > 0 ? active : 'en';
          } catch (error) {
            return 'en';
          }
        }

        /** Dictionary fallback; used until the locale service registers ours. */
        function pick(key) {
          const dict = DICTS[readActive()] || EN;
          return dict[key] || EN[key] || key;
        }

        let bound = null;
        if (localeSvc !== undefined && localeSvc !== null && typeof localeSvc.bind === 'function') {
          try {
            bound = localeSvc.bind(NS);
          } catch (error) {
            bound = null;
          }
        }

        /** Translate one key, preferring the registered locale dictionaries. */
        function t(key) {
          if (bound !== null) {
            try {
              const text = bound(key);
              if (typeof text === 'string' && text !== key) return text;
            } catch (error) {
              /* fall back to the local dictionary */
            }
          }
          return pick(key);
        }

        if (localeSvc !== undefined && localeSvc !== null && typeof localeSvc.register === 'function') {
          const registerDictionaries = () => {
            const disposers = [];
            for (const id of Object.keys(DICTS)) {
              try {
                disposers.push(localeSvc.register(NS, id, DICTS[id]));
              } catch (error) {
                /* a duplicate registration surfaces through pick() */
              }
            }
            return () => {
              for (const dispose of disposers) {
                try {
                  dispose();
                } catch (error) {
                  /* already removed */
                }
              }
            };
          };
          if (typeof ctx.effect === 'function') {
            try {
              ctx.effect(registerDictionaries, 'peak-balance locale');
            } catch (error) {
              console.error('peak-balance: locale registration failed', error);
            }
          } else {
            try {
              registerDictionaries();
            } catch (error) {
              console.error('peak-balance: locale registration failed', error);
            }
          }
        }

        // `useSyncExternalStore` compares snapshots by reference, so the
        // fallback must be one frozen object rather than a fresh literal.
        const FALLBACK_LOCALE = Object.freeze({ active: 'en', locales: [], revision: 0 });
        const subscribeLocale = localeSvc !== undefined && localeSvc !== null
          && typeof localeSvc.subscribe === 'function'
          ? (callback) => localeSvc.subscribe(callback)
          : () => () => {};
        const getLocaleSnapshot = localeSvc !== undefined && localeSvc !== null
          && typeof localeSvc.getLocale === 'function'
          ? () => {
            const snapshot = localeSvc.getLocale();
            return snapshot === null || snapshot === undefined ? FALLBACK_LOCALE : snapshot;
          }
          : () => FALLBACK_LOCALE;

        /**
         * Balance through this bundle's own Host route. The generated
         * `remote.account` namespace is not reachable from an installed Client
         * module, so the Host half reads the wallet and returns only numbers.
         */
        function requestBalance() {
          if (typeof fetch !== 'function') return Promise.resolve({ status: 'error' });
          return fetch('/dsh-peak-balance/balance', {
            cache: 'no-store',
            headers: { accept: 'application/json' },
          })
            .then((response) => (response.ok ? response.json() : { state: 'unavailable' }))
            .then((payload) => {
              if (payload === null || typeof payload !== 'object') return { status: 'error' };
              if (payload.state === 'ready') {
                return {
                  status: 'ready',
                  wallets: Array.isArray(payload.wallets) ? payload.wallets : [],
                  bonus: Array.isArray(payload.bonus) ? payload.bonus : [],
                };
              }
              if (payload.state === 'signed-out') return { status: 'signed-out' };
              return { status: 'error' };
            })
            .catch((error) => {
              console.error('peak-balance: balance route unavailable', error);
              return { status: 'error' };
            });
        }

        /** Platform-style money text: two decimals, truncated positive cents. */
        function money(wallet, locale) {
          const raw = wallet !== null && wallet !== undefined ? wallet.balance : undefined;
          const amount = typeof raw === 'string' ? Number(raw) : NaN;
          if (!isFinite(amount)) return typeof raw === 'string' ? raw : '—';
          const symbol = wallet.currency === 'USD' ? '$' : '¥';
          const sign = amount < 0 ? '-' : '';
          const abs = Math.abs(amount);
          if (abs > 0 && abs < 0.01) return sign + '<' + symbol + '0.01';
          const cents = abs >= 0.01 ? Math.floor(abs * 100) / 100 : 0;
          let digits;
          try {
            digits = new Intl.NumberFormat(locale, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(cents);
          } catch (error) {
            digits = cents.toFixed(2);
          }
          return sign + symbol + digits;
        }

        /** Local clock time of a boundary instant. */
        function clockTime(ms, locale) {
          try {
            return new Intl.DateTimeFormat(locale, {
              hour: '2-digit',
              minute: '2-digit',
            }).format(new Date(ms));
          } catch (error) {
            const date = new Date(ms);
            const pad = (value) => (value < 10 ? '0' + value : String(value));
            return pad(date.getHours()) + ':' + pad(date.getMinutes());
          }
        }

        /** The header chip. */
        function PeakBalance() {
          const localeSnapshot = React.useSyncExternalStore(subscribeLocale, getLocaleSnapshot);
          const [balance, setBalance] = React.useState({ status: 'loading' });
          const [nowMs, setNowMs] = React.useState(() => Date.now());
          const reloadRef = React.useRef(null);

          React.useEffect(() => {
            let timer = 0;
            const tick = () => {
              const now = Date.now();
              setNowMs(now);
              const next = nextChange(now);
              const delay = next === null
                ? 60 * MINUTE
                : Math.max(1000, Math.min(next - now + 300, 60 * MINUTE));
              timer = window.setTimeout(tick, delay);
            };
            tick();
            return () => window.clearTimeout(timer);
          }, []);

          React.useEffect(() => {
            let cancelled = false;
            let timer = 0;

            const load = () => {
              if (cancelled) return;
              setBalance((prev) => (prev.status === 'ready' ? prev : { status: 'loading' }));
              requestBalance().then(
                (result) => {
                  if (!cancelled) setBalance(result);
                },
                (error) => {
                  console.error('peak-balance: balance request failed', error);
                  if (!cancelled) setBalance({ status: 'error' });
                },
              );
            };

            reloadRef.current = load;
            load();

            const onFocus = () => load();
            window.addEventListener('focus', onFocus);
            timer = window.setInterval(load, 5 * MINUTE);

            return () => {
              cancelled = true;
              reloadRef.current = null;
              window.removeEventListener('focus', onFocus);
              window.clearInterval(timer);
            };
          }, []);

          const active = localeSnapshot !== null && localeSnapshot !== undefined
            && typeof localeSnapshot.active === 'string'
            ? localeSnapshot.active
            : 'en';

          const peak = inPeak(nowMs);
          const next = nextChange(nowMs);
          const dotColor = peak
            ? 'var(--dsw-alias-state-warn-primary)'
            : 'var(--dsw-alias-state-success-primary)';

          let valueText = '—';
          let balanceTitle = t('loading');
          if (balance.status === 'ready') {
            if (balance.wallets.length > 0) {
              // The account ships one wallet per currency; an untouched USD
              // wallet is zero, so show the first funded one.
              const funded = balance.wallets.find((wallet) => Number(wallet.balance) !== 0);
              valueText = money(funded === undefined ? balance.wallets[0] : funded, active);
              balanceTitle = t('balance') + ': '
                + balance.wallets.map((wallet) => money(wallet, active)).join(' · ');
              if (balance.bonus.length > 0) {
                balanceTitle += ' · ' + t('bonus') + ' '
                  + balance.bonus.map((wallet) => money(wallet, active)).join(' · ');
              }
            } else {
              balanceTitle = t('balance') + ': ' + t('unavailable');
            }
          } else if (balance.status === 'signed-out') {
            balanceTitle = t('signedOut');
          } else if (balance.status === 'error') {
            balanceTitle = t('unavailable');
          }

          const hint = peak ? t('peakHint') : t('offpeakHint');
          const when = next === null ? '' : clockTime(next, active);
          const lines = [
            when !== '' ? hint + ' ' + when + '.' : hint + '.',
            t('schedule'),
            '',
            balanceTitle,
            t('refresh'),
          ];

          const label = peak ? t('peak') : t('offpeak');

          return h('div', {
            className: 'dshPeakBalance',
            role: 'group',
            'aria-label': label + ', ' + t('balance') + ' ' + valueText,
            title: lines.join('\n'),
            onClick: () => {
              const reload = reloadRef.current;
              if (typeof reload === 'function') reload();
            },
            style: { cursor: 'pointer' },
          }, [
            h('style', { key: 'css' }, CSS),
            h('span', { key: 'dot', className: 'dshPeakBalance__dot', style: { background: dotColor } }),
            h('span', { key: 'label', className: 'dshPeakBalance__label' }, label),
            h('span', { key: 'sep', className: 'dshPeakBalance__sep', 'aria-hidden': 'true' }, '·'),
            h('span', { key: 'value', className: 'dshPeakBalance__value' }, valueText),
          ]);
        }

        /** Fill the header seat; the declaration may appear after this apply runs. */
        const register = () => slots.register(
          { name: 'conversation.header.leading' },
          PeakBalance,
        );

        try {
          if (typeof slots.inject === 'function') {
            slots.inject('conversation.header.leading', register);
          } else {
            register();
          }
        } catch (error) {
          console.error('peak-balance: could not occupy conversation.header.leading', error);
        }
      },
    };
  },
});
