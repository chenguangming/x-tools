<script setup lang="ts">
import { IconArrowRight, IconDragDrop, IconHeart } from '@tabler/icons-vue';
import { useHead } from '@vueuse/head';
import { computed } from 'vue';
import { useRouteQuery } from '@vueuse/router';
import Draggable from 'vuedraggable';
import ColoredCard from '../components/ColoredCard.vue';
import ToolCard from '../components/ToolCard.vue';
import { useToolStore } from '@/tools/tools.store';
import { useCommandPaletteStore } from '@/modules/command-palette/command-palette.store';
import { config } from '@/config';

const toolStore = useToolStore();
const commandPaletteStore = useCommandPaletteStore();

const featuredTasks = [
  { key: 'idPhoto', path: '/id-photo' },
  { key: 'crop', path: '/image-cropper' },
  { key: 'xml', path: '/xml-diff' },
  { key: 'json', path: '/json-prettify' },
  { key: 'time', path: '/date-converter' },
  { key: 'audio', path: '/audio-trimmer' },
].map(task => ({ ...task, icon: toolStore.tools.find(tool => tool.path === task.path)?.icon }));

useHead({ title: 'X-Tools - Handy online tools for everyone' });
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
            href="https://github.com/chenguangming/x-tools"
            rel="noopener"
            target="_blank"
            :aria-label="$t('home.follow.githubRepository')"
          >GitHub</a>.
          {{ $t('home.follow.thankYou') }}
          <n-icon><IconHeart /></n-icon>
        </ColoredCard>
      </div>

      <section v-if="activeTab === 'home'" class="hero">
        <a class="promo" href="https://aura.codestudio.uk" target="_blank" rel="noopener">
          <span class="promo-label">{{ $t('landing.promo.label') }}</span>
          <span class="promo-name">{{ $t('landing.promo.name') }}</span>
          <span class="promo-desc">{{ $t('landing.promo.description') }}</span>
        </a>
        <h1 class="hero-title">
          {{ $t('landing.title') }}
        </h1>
        <p class="hero-subtitle">
          {{ $t('landing.subtitle') }}
        </p>
        <button type="button" class="hero-search" @click="commandPaletteStore.isOpen = true">
          <icon-mdi-search class="text-22px" />
          <span class="hero-search-text">{{ $t('landing.searchPlaceholder') }}</span>
        </button>
      </section>

      <n-tabs v-model:value="activeTab" type="line" animated class="home-tabs mt-25px">
        <n-tab-pane name="home" :tab="$t('home.home')">
          <div class="flex flex-col">
            <div v-if="favoriteTools.length > 0" :style="{ order: toolStore.hasDefaultFavorites ? 2 : 1 }">
              <h3 class="mb-5px text-neutral-400 font-500">
                {{ $t('home.categories.favoriteTools') }}
                <c-tooltip :tooltip="$t('home.categories.favoritesDndToolTip')">
                  <n-icon size="18">
                    <IconDragDrop />
                  </n-icon>
                </c-tooltip>
              </h3>
              <Draggable
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
            </div>

            <div :style="{ order: toolStore.hasDefaultFavorites ? 1 : 2 }" class="my-25px">
              <h3 class="mb-5px text-neutral-400 font-500">
                {{ $t('landing.tasksTitle') }}
              </h3>
              <div class="grid grid-cols-1 gap-12px md:grid-cols-3 sm:grid-cols-2">
                <router-link v-for="task in featuredTasks" :key="task.key" :to="task.path" class="decoration-none">
                  <c-card class="h-full transition transition-duration-0.5s !border-2px !hover:border-primary">
                    <div flex items-center justify-between gap-8px>
                      <div min-w-0 flex items-center gap-8px>
                        <n-icon v-if="task.icon" class="shrink-0 text-neutral-400 dark:text-neutral-600" size="28">
                          <component :is="task.icon" />
                        </n-icon>
                        <div class="truncate text-lg text-black dark:text-white">
                          {{ $t(`landing.tasks.${task.key}.title`) }}
                        </div>
                      </div>
                      <n-icon class="task-action shrink-0" size="20" :title="$t('landing.open')">
                        <IconArrowRight />
                      </n-icon>
                    </div>
                    <div class="line-clamp-2 mt-5px text-neutral-500 dark:text-neutral-400">
                      {{ $t(`landing.tasks.${task.key}.description`) }}
                    </div>
                  </c-card>
                </router-link>
              </div>
            </div>
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
.hero {
  position: relative;
  padding: 24px 0 8px;
  text-align: center;
}

.promo {
  position: absolute;
  top: 8px;
  right: 0;
  display: none;
  flex-direction: column;
  gap: 4px;
  width: 210px;
  padding: 10px 14px;
  font-size: 12px;
  line-height: 1.5;
  text-align: left;
  color: inherit;
  text-decoration: none;
  border: 1px solid rgba(24, 160, 88, 0.35);
  border-radius: 10px;
  transition: background-color 0.2s;

  &:hover {
    background: rgba(24, 160, 88, 0.08);
  }

  @media (min-width: 1200px) {
    display: flex;
  }
}

.promo-label {
  font-size: 11px;
  color: #18a058;
}

.promo-name {
  font-size: 14px;
  font-weight: 600;
}

.promo-desc {
  opacity: 0.65;
}

.hero-title {
  margin: 0 0 12px;
  font-size: clamp(24px, 4vw, 36px);
  font-weight: 700;
  letter-spacing: -0.5px;
}

.hero-subtitle {
  margin: 0;
  opacity: 0.65;
  line-height: 1.7;
}

.hero-search {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 670px;
  margin: 24px auto 0;
  padding: 14px 20px;
  font: inherit;
  text-align: left;
  color: inherit;
  cursor: text;
  background: transparent;
  border: 2px solid #18a058;
  border-radius: 13px;
  box-shadow: 0 6px 24px rgba(24, 160, 88, 0.08);

  .hero-search-text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    opacity: 0.5;
  }
}

.task-action {
  color: #18a058;
}

.home-tabs :deep(.n-tabs-tab) {
  font-weight: 600 !important;
}
</style>
