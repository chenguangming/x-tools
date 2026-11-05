<script setup lang="ts">
import { IconBrandGithub, IconDots, IconInfoCircle, IconMoon, IconSun } from '@tabler/icons-vue';
import { NIcon } from 'naive-ui';
import type { DropdownOption } from 'naive-ui';
import { useStyleStore } from '@/stores/style.store';

const styleStore = useStyleStore();
const { isDarkTheme } = toRefs(styleStore);
const isAboutOpen = ref(false);
const { t } = useI18n();

function icon(component: Component) {
  return () => h(NIcon, null, { default: () => h(component) });
}

const menuOptions = computed<DropdownOption[]>(() => [
  {
    key: 'theme',
    label: isDarkTheme.value ? t('home.nav.lightMode') : t('home.nav.darkMode'),
    icon: icon(isDarkTheme.value ? IconSun : IconMoon),
  },
  { key: 'github', label: t('home.nav.github'), icon: icon(IconBrandGithub) },
  { key: 'about', label: t('home.nav.aboutLabel'), icon: icon(IconInfoCircle) },
]);

function onSelect(key: string) {
  if (key === 'theme') {
    styleStore.toggleDark();
  }
  else if (key === 'github') {
    window.open('https://github.com/chenguangming/x-tools', '_blank', 'noopener');
  }
  else if (key === 'about') {
    isAboutOpen.value = true;
  }
}
</script>

<template>
  <n-dropdown trigger="click" :options="menuOptions" @select="onSelect">
    <c-button circle variant="text" :aria-label="$t('landing.more')">
      <NIcon size="25">
        <IconDots />
      </NIcon>
    </c-button>
  </n-dropdown>

  <c-modal v-model:open="isAboutOpen">
    <div class="about-content">
      <c-markdown :markdown="$t('about.content')" />
    </div>
  </c-modal>
</template>

<style lang="less" scoped>
.about-content {
  max-height: 70vh;
  overflow: auto;
  overflow-wrap: anywhere;
}
</style>
