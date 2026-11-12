<script lang="ts" setup>
import { NIcon, useThemeVars } from 'naive-ui';

import { RouterLink, useRoute, useRouter } from 'vue-router';
import { ArrowLeft, ArrowRight, Heart, Home2 } from '@vicons/tabler';

import NavbarButtons from '../components/NavbarButtons.vue';
import { useStyleStore } from '@/stores/style.store';
import { config } from '@/config';

const { locale } = useI18n();
const supportUrl = computed(() => (locale.value === 'zh' ? 'https://afdian.com/a/waying' : 'https://ko-fi.com/wayings'));

const themeVars = useThemeVars();
const styleStore = useStyleStore();
const buildDate = config.app.buildDate;
const commitSha = config.app.lastCommitSha.slice(0, 7);

const router = useRouter();
const route = useRoute();

// Depends on route.fullPath so it is re-evaluated after each navigation
const canGoForward = computed(() => route.fullPath && !!window.history.state?.forward);

function goBack() {
  if (window.history.state?.back) {
    router.back();
  }
  else {
    router.push('/');
  }
}
</script>

<template>
  <n-layout class="base-layout" :native-scrollbar="false">
    <div class="page-card">
      <header class="top-bar">
        <div class="top-bar-inner">
          <RouterLink v-if="!styleStore.isSmallScreen" to="/" class="brand">
            X - TOOLS
          </RouterLink>

          <c-tooltip :tooltip="$t('home.back')" position="bottom">
            <c-button circle variant="text" :aria-label="$t('home.back')" @click="goBack">
              <NIcon size="25">
                <ArrowLeft />
              </NIcon>
            </c-button>
          </c-tooltip>

          <c-tooltip :tooltip="$t('home.home')" position="bottom">
            <c-button to="/" circle variant="text" :aria-label="$t('home.home')">
              <NIcon size="25">
                <Home2 />
              </NIcon>
            </c-button>
          </c-tooltip>

          <c-tooltip v-if="!styleStore.isSmallScreen" :tooltip="$t('home.forward')" position="bottom">
            <c-button circle variant="text" :disabled="!canGoForward" :aria-label="$t('home.forward')" @click="router.forward()">
              <NIcon size="25">
                <ArrowRight />
              </NIcon>
            </c-button>
          </c-tooltip>

          <command-palette />

          <locale-selector class="locale-select" />

          <c-tooltip position="bottom" :tooltip="$t('home.support')">
            <c-button
              round
              :href="supportUrl"
              rel="noopener"
              target="_blank"
              class="support-button"
              :bordered="false"
              :aria-label="$t('home.support')"
            >
              <template v-if="!styleStore.isSmallScreen">
                {{ $t('home.buyMeACoffee') }}
              </template>
              <NIcon :ml-2="!styleStore.isSmallScreen">
                <Heart />
              </NIcon>
            </c-button>
          </c-tooltip>

          <NavbarButtons />
        </div>
      </header>

      <main class="page-content">
        <slot />
      </main>

      <div class="footer">
        <div>
          X-Tools

          <template v-if="buildDate">
            {{ buildDate }}
          </template>

          <template v-if="commitSha && commitSha.length > 0">
            -
            <c-link
              target="_blank"
              rel="noopener"
              type="primary"
              :href="`https://github.com/chenguangming/x-tools/tree/${commitSha}`"
            >
              {{ commitSha }}
            </c-link>
          </template>
        </div>
        <div>
          © {{ new Date().getFullYear() }}
          X-Tools
        </div>
      </div>
    </div>
  </n-layout>
</template>

<style lang="less" scoped>
.base-layout {
  height: 100vh;
}

.page-card {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 66.667%;
  min-height: calc(100vh - 48px);
  margin: 24px auto;
  background-color: v-bind('themeVars.cardColor');
  border: 1px solid v-bind('themeVars.borderColor');
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);

  @media (max-width: 1500px) {
    width: 100%;
    min-height: 100vh;
    margin: 0;
    border: none;
    border-radius: 0;
    box-shadow: none;
  }
}

.top-bar {
  border-bottom: 1px solid v-bind('themeVars.borderColor');
  padding: 12px 26px;

  @media (max-width: 700px) {
    padding: 10px 12px;
  }

  .top-bar-inner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
  }

  .brand {
    font-size: 22px;
    font-weight: 600;
    margin-right: 12px;
    color: inherit;
    text-decoration: none;
    white-space: nowrap;
  }

  .locale-select {
    flex: none;
    width: 150px;
  }

  @media (max-width: 700px) {
    gap: 4px;

    .brand {
      margin-right: 4px;
      font-size: 18px;
    }

    .locale-select {
      width: 110px;
    }
  }
}

.page-content {
  flex: 1;
  padding: 0 26px;
}

.support-button {
  flex: none;
  white-space: nowrap;
  background: linear-gradient(48deg, rgba(37, 99, 108, 1) 0%, rgba(59, 149, 111, 1) 60%, rgba(20, 160, 88, 1) 100%);
  color: #fff !important;
}

.footer {
  text-align: center;
  color: #838587;
  margin-top: auto;
  padding: 20px 0;
}
</style>
