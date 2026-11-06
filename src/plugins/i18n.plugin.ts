import messages from '@intlify/unplugin-vue-i18n/messages';
import { get } from '@vueuse/core';
import type { Plugin } from 'vue';
import { createI18n } from 'vue-i18n';

export const LOCALE_STORAGE_KEY = 'x-tools-locale';

function detectLocale(): string {
  const available = Object.keys(messages ?? {});
  const find = (code: string) => available.find(l => l.toLowerCase() === code.toLowerCase());

  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && find(stored)) {
      return find(stored)!;
    }
  }
  catch {}

  for (const lang of navigator.languages ?? [navigator.language]) {
    const code = lang.toLowerCase();
    const exact = find(code);
    if (exact) {
      return exact;
    }
    if (/^zh-(tw|hk|mo|hant)/.test(code)) {
      return 'zh-TW';
    }
    const base = code.split('-')[0];
    const mapped = base === 'nb' || base === 'nn' ? 'no' : base;
    const match = find(mapped);
    if (match) {
      return match;
    }
  }
  return 'en';
}

const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'en',
  missingWarn: false,
  fallbackWarn: false,
  messages,
});

export const i18nPlugin: Plugin = {
  install: (app) => {
    app.use(i18n);
  },
};

export const translate = function (localeKey: string) {
  const hasKey = i18n.global.te(localeKey, get(i18n.global.locale));
  return hasKey ? i18n.global.t(localeKey) : localeKey;
};
