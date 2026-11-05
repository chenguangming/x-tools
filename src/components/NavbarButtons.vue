<script setup lang="ts">
import { IconArrowLeft, IconArrowRight, IconBrandGithub, IconDots, IconHeart, IconInfoCircle, IconMoon, IconSun } from '@tabler/icons-vue';
import { NIcon } from 'naive-ui';
import type { DropdownOption } from 'naive-ui';
import { useRoute, useRouter } from 'vue-router';
import { useStyleStore } from '@/stores/style.store';

const styleStore = useStyleStore();
const { isDarkTheme } = toRefs(styleStore);
const isAboutOpen = ref(false);
const router = useRouter();
const route = useRoute();
const { t } = useI18n();

// Depends on route.fullPath so it is re-evaluated after each navigation
const canGoForward = computed(() => !!route.fullPath && !!window.history.state?.forward);

function icon(component: Component) {
  return () => h(NIcon, null, { default: () => h(component) });
}

const menuOptions = computed<DropdownOption[]>(() => [
  { key: 'back', label: t('home.back'), icon: icon(IconArrowLeft) },
  { key: 'forward', label: t('home.forward'), icon: icon(IconArrowRight), disabled: !canGoForward.value },
  { type: 'divider', key: 'd1' },
  { key: 'github', label: t('home.nav.github'), icon: icon(IconBrandGithub) },
  { key: 'about', label: t('home.nav.aboutLabel'), icon: icon(IconInfoCircle) },
  { key: 'support', label: t('home.buyMeACoffee'), icon: icon(IconHeart) },
]);

function onSelect(key: string) {
  if (key === 'back') {
    if (window.history.state?.back) {
      router.back();
    }
    else {
      router.push('/');
    }
  }
  else if (key === 'forward') {
    router.forward();
  }
  else if (key === 'github') {
    window.open('https://github.com/chenguangming/x-tools', '_blank', 'noopener');
  }
  else if (key === 'about') {
    isAboutOpen.value = true;
  }
  else if (key === 'support') {
    window.open('https://afdian.com/a/waying', '_blank', 'noopener');
  }
}
</script>

<template>
  <c-tooltip :tooltip="isDarkTheme ? $t('home.nav.lightMode') : $t('home.nav.darkMode')" position="bottom">
    <c-button circle variant="text" :aria-label="$t('home.nav.mode')" @click="() => styleStore.toggleDark()">
      <NIcon v-if="isDarkTheme" size="25">
        <IconSun />
      </NIcon>
      <NIcon v-else size="25">
        <IconMoon />
      </NIcon>
    </c-button>
  </c-tooltip>

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
