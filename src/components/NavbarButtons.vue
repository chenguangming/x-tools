<script setup lang="ts">
import { IconBrandGithub, IconInfoCircle, IconMoon, IconSun } from '@tabler/icons-vue';
import { useStyleStore } from '@/stores/style.store';

const styleStore = useStyleStore();
const { isDarkTheme } = toRefs(styleStore);
const isAboutOpen = ref(false);
</script>

<template>
  <c-tooltip :tooltip="$t('home.nav.github')" position="bottom">
    <c-button
      circle
      variant="text"
      href="https://github.com/chenguangming/x-tools"
      target="_blank"
      rel="noopener noreferrer"
      :aria-label="$t('home.nav.githubRepository')"
    >
      <n-icon size="25"><IconBrandGithub /></n-icon>
    </c-button>
  </c-tooltip>

  <c-tooltip :tooltip="$t('home.nav.about')" position="bottom">
    <c-button circle variant="text" :aria-label="$t('home.nav.aboutLabel')" @click="isAboutOpen = true">
      <n-icon size="25"><IconInfoCircle /></n-icon>
    </c-button>
  </c-tooltip>
  <c-tooltip :tooltip="isDarkTheme ? $t('home.nav.lightMode') : $t('home.nav.darkMode')" position="bottom">
    <c-button circle variant="text" :aria-label="$t('home.nav.mode')" @click="() => styleStore.toggleDark()">
      <n-icon v-if="isDarkTheme" size="25"><IconSun /></n-icon>
      <n-icon v-else size="25"><IconMoon /></n-icon>
    </c-button>
  </c-tooltip>

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

.n-button {
  &:not(:last-child) {
    margin-right: 5px;
  }
}
</style>
