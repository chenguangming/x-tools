<script setup lang="ts">
const { availableLocales, locale } = useI18n();

const localesLong: Record<string, string> = {
  'en': 'English',
  'de': 'Deutsch',
  'es': 'Español',
  'fr': 'Français',
  'no': 'Norwegian',
  'pt': 'Português',
  'ru': 'Русский',
  'uk': 'Українська',
  'zh': '简体中文',
  'zh-TW': '繁體中文',
  'ja': '日本語',
  'ko': '한국어',
  'vi': 'Tiếng Việt',
};

const localeOptions = computed(() =>
  availableLocales.map(locale => ({
    label: localesLong[locale] ?? locale,
    value: locale,
  })),
);
</script>

<template>
  <c-select
    v-model:value="locale"
    :options="localeOptions"
    placeholder="Select a language"
    w-150px
  />
</template>
