<script setup lang="ts">
import { IconDragDrop, IconHeart } from '@tabler/icons-vue';
import { useHead } from '@vueuse/head';
import { computed } from 'vue';
import { useRouteQuery } from '@vueuse/router';
import Draggable from 'vuedraggable';
import ColoredCard from '../components/ColoredCard.vue';
import ToolCard from '../components/ToolCard.vue';
import { useToolStore } from '@/tools/tools.store';
import { config } from '@/config';

const toolStore = useToolStore();

useHead({ title: 'IT Tools - Handy online tools for developers' });
const { t } = useI18n();

const activeTab = useRouteQuery('tab', 'home');
const gridClass = 'grid grid-cols-1 gap-12px lg:grid-cols-3 md:grid-cols-3 sm:grid-cols-2 xl:grid-cols-4';

const favoriteTools = computed(() => toolStore.favoriteTools);

// Update favorite tools order when drag is finished
function onUpdateFavoriteTools() {
  toolStore.updateFavoriteTools(favoriteTools.value); // Update the store with the new order
}
</script>

<template>
  <div class="pt-50px">
    <div class="grid-wrapper">
      <div class="grid grid-cols-1 gap-12px lg:grid-cols-3 md:grid-cols-3 sm:grid-cols-2 xl:grid-cols-4">
        <ColoredCard v-if="config.showBanner" :title="$t('home.follow.title')" :icon="IconHeart">
          {{ $t('home.follow.p1') }}
          <a
            href="https://github.com/CorentinTh/it-tools"
            rel="noopener"
            target="_blank"
            :aria-label="$t('home.follow.githubRepository')"
          >GitHub</a>
          {{ $t('home.follow.p2') }}
          <a
            href="https://x.com/ittoolsdottech"
            rel="noopener"
            target="_blank"
            :aria-label="$t('home.follow.twitterXAccount')"
          >X</a>.
          {{ $t('home.follow.thankYou') }}
          <n-icon :component="IconHeart" />
        </ColoredCard>
      </div>

      <n-tabs v-model:value="activeTab" type="line" animated class="mt-25px">
        <n-tab-pane name="home" :tab="$t('home.home')">
          <h3 class="mb-5px text-neutral-400 font-500">
            {{ $t('home.categories.favoriteTools') }}
            <c-tooltip v-if="favoriteTools.length > 0" :tooltip="$t('home.categories.favoritesDndToolTip')">
              <n-icon :component="IconDragDrop" size="18" />
            </c-tooltip>
          </h3>
          <Draggable
            v-if="favoriteTools.length > 0"
            :list="favoriteTools"
            :class="gridClass"
            ghost-class="ghost-favorites-draggable"
            item-key="name"
            @end="onUpdateFavoriteTools"
          >
            <template #item="{ element: tool }">
              <ToolCard :tool="tool" />
            </template>
          </Draggable>
          <div v-else class="text-neutral-400">
            {{ $t('home.categories.emptyFavorites') }}
          </div>

          <template v-if="toolStore.newTools.length > 0">
            <h3 class="mb-5px mt-25px text-neutral-400 font-500">
              {{ t('home.categories.newestTools') }}
            </h3>
            <div :class="gridClass">
              <ToolCard v-for="tool in toolStore.newTools" :key="tool.name" :tool="tool" />
            </div>
          </template>
        </n-tab-pane>

        <n-tab-pane v-for="category in toolStore.toolsByCategory" :key="category.name" :name="category.key" :tab="category.name">
          <div :class="gridClass">
            <ToolCard v-for="tool in category.components" :key="tool.name" :tool="tool" />
          </div>
        </n-tab-pane>
      </n-tabs>
    </div>
  </div>
</template>

<style scoped lang="less">
.ghost-favorites-draggable {
  opacity: 0.4;
  background-color: #ccc;
  border: 2px dashed #666;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  transform: scale(1.1);
  animation: ghost-favorites-draggable-animation 0.2s ease-out;
}

@keyframes ghost-favorites-draggable-animation {
  0% {
    opacity: 0;
    transform: scale(0.9);
  }
  100% {
    opacity: 0.4;
    transform: scale(1.0);
  }
}
</style>
