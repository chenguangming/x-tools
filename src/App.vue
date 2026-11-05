<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router';
import { useHead } from '@vueuse/head';
import { NGlobalStyle, NMessageProvider, NNotificationProvider, darkTheme } from 'naive-ui';
import { darkThemeOverrides, lightThemeOverrides } from './themes';
import { layouts } from './layouts';
import { useStyleStore } from './stores/style.store';
import { LOCALE_STORAGE_KEY } from './plugins/i18n.plugin';
import { trackEvent } from './modules/stats/stats';

const route = useRoute();
const layout = computed(() => route?.meta?.layout ?? layouts.base);
const styleStore = useStyleStore();

const theme = computed(() => (styleStore.isDarkTheme ? darkTheme : null));
const themeOverrides = computed(() => (styleStore.isDarkTheme ? darkThemeOverrides : lightThemeOverrides));

// Every page is its own canonical URL; query strings such as ?tab= are not part of it
const canonicalUrl = computed(() => {
  const path = route.path.length > 1 ? route.path.replace(/\/+$/, '') : route.path;
  return `${window.location.origin}${path}`;
});
useHead(computed(() => (route.name === 'NotFound'
  ? {}
  : {
      link: [{ rel: 'canonical', href: canonicalUrl.value }],
      meta: [{ property: 'og:url', content: canonicalUrl.value }],
    })));

const { locale } = useI18n();

// Persist only explicit changes, so the browser language stays the default until the user picks one
watch(locale, (value) => {
  localStorage.setItem(LOCALE_STORAGE_KEY, value);
  trackEvent('language_change', { language: value });
});

watch(() => styleStore.isDarkTheme, isDark => trackEvent('theme_change', { theme: isDark ? 'dark' : 'light' }));
</script>

<template>
  <n-config-provider :theme="theme" :theme-overrides="themeOverrides">
    <NGlobalStyle />
    <NMessageProvider placement="bottom">
      <NNotificationProvider placement="bottom-right">
        <component :is="layout">
          <RouterView />
        </component>
      </NNotificationProvider>
    </NMessageProvider>
  </n-config-provider>
</template>

<style>
body {
  min-height: 100%;
  margin: 0;
  padding: 0;
}

html {
  height: 100%;
  margin: 0;
  padding: 0;
}

* {
  box-sizing: border-box;
}
</style>
