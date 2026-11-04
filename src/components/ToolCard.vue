<script setup lang="ts">
import { useThemeVars } from 'naive-ui';
import FavoriteButton from './FavoriteButton.vue';
import type { Tool } from '@/tools/tools.types';

const props = defineProps<{ tool: Tool & { category: string } }>();
const { tool } = toRefs(props);
const theme = useThemeVars();
</script>

<template>
  <router-link :to="tool.path" class="decoration-none">
    <c-card class="h-full transition transition-duration-0.5s !border-2px !hover:border-primary">
      <div flex items-center justify-between gap-8px>
        <div min-w-0 flex items-center gap-8px>
          <n-icon class="shrink-0 text-neutral-400 dark:text-neutral-600" size="28"><component :is="tool.icon" /></n-icon>

          <div class="truncate text-lg text-black dark:text-white">
            {{ tool.name }}
          </div>
        </div>

        <div flex shrink-0 items-center gap-8px>
          <div
            v-if="tool.isNew"
            class="rounded-full px-8px py-3px text-xs text-white dark:text-neutral-800"
            :style="{
              'background-color': theme.primaryColor,
            }"
          >
            {{ $t('toolCard.new') }}
          </div>

          <FavoriteButton :tool="tool" />
        </div>
      </div>

      <div class="line-clamp-2 mt-5px text-neutral-500 dark:text-neutral-400">
        {{ tool.description }}
      </div>
    </c-card>
  </router-link>
</template>
