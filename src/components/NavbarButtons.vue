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
      <n-icon size="25" :component="IconBrandGithub" />
    </c-button>
  </c-tooltip>

  <c-tooltip :tooltip="$t('home.nav.about')" position="bottom">
    <c-button circle variant="text" :aria-label="$t('home.nav.aboutLabel')" @click="isAboutOpen = true">
      <n-icon size="25" :component="IconInfoCircle" />
    </c-button>
  </c-tooltip>
  <c-tooltip :tooltip="isDarkTheme ? $t('home.nav.lightMode') : $t('home.nav.darkMode')" position="bottom">
    <c-button circle variant="text" :aria-label="$t('home.nav.mode')" @click="() => styleStore.toggleDark()">
      <n-icon v-if="isDarkTheme" size="25" :component="IconSun" />
      <n-icon v-else size="25" :component="IconMoon" />
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
  width: min(600px, 80vw);
  max-height: 70vh;
  overflow: auto;
}

.n-button {
  &:not(:last-child) {
    margin-right: 5px;
  }
}
</style>
