<script lang="ts" setup>
import { useThemeVars } from 'naive-ui';

import { RouterLink } from 'vue-router';

import NavbarButtons from '../components/NavbarButtons.vue';
import { config } from '@/config';

const themeVars = useThemeVars();
const buildDate = config.app.buildDate;
const commitSha = config.app.lastCommitSha.slice(0, 7);
</script>

<template>
  <n-layout class="base-layout" :native-scrollbar="false">
    <div class="page-card">
      <header class="top-bar">
        <div class="top-bar-inner">
          <RouterLink to="/" class="brand">
            X - TOOLS
          </RouterLink>

          <command-palette />

          <locale-selector class="locale-select" />

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

.footer {
  text-align: center;
  color: #838587;
  margin-top: auto;
  padding: 20px 0;
}
</style>
