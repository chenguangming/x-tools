import { type MaybeRef, get, useStorage } from '@vueuse/core';
import { defineStore } from 'pinia';
import type { Ref } from 'vue';
import _ from 'lodash';
import type { Tool, ToolCategory, ToolWithCategory } from './tools.types';
import { toolsWithCategory } from './index';
import { trackEvent } from '@/modules/stats/stats';

const defaultFavoriteTools = [
  '/base64-string-converter',
  '/hash-text',
  '/git-memo',
  '/date-converter',
  '/text-to-unicode',
  '/uuid-generator',
  '/json-prettify',
  '/url-encoder',
];

export const useToolStore = defineStore('tools', () => {
  const favoriteToolsName = useStorage('favoriteToolsName', [...defaultFavoriteTools]) as Ref<string[]>;

  // Defaults are seeded once; afterwards an empty list is a deliberate user choice
  const favoritesInitialized = useStorage('favoriteToolsInitialized', false);
  if (!favoritesInitialized.value) {
    if (favoriteToolsName.value.length === 0) {
      favoriteToolsName.value = [...defaultFavoriteTools];
    }
    favoritesInitialized.value = true;
  }

  const { t } = useI18n();

  const tools = computed<ToolWithCategory[]>(() => toolsWithCategory.map((tool) => {
    const toolI18nKey = tool.path.replace(/\//g, '');

    return ({
      ...tool,
      path: tool.path,
      name: t(`tools.${toolI18nKey}.title`, tool.name),
      description: t(`tools.${toolI18nKey}.description`, tool.description),
      categoryKey: tool.category.toLowerCase(),
      category: t(`tools.categories.${tool.category.toLowerCase()}`, tool.category),
    });
  }));

  const toolsByCategory = computed<ToolCategory[]>(() => {
    return _.chain(tools.value)
      .groupBy('categoryKey')
      .map((components, key) => ({
        key,
        name: components[0].category,
        components,
      }))
      .value();
  });

  const favoriteTools = computed(() => {
    return favoriteToolsName.value
      .map(favoriteName => tools.value.find(({ name, path }) => name === favoriteName || path === favoriteName))
      .filter(Boolean) as ToolWithCategory[]; // cast because .filter(Boolean) does not remove undefined from type
  });

  return {
    tools,
    favoriteTools,
    // True until the user adds, removes or reorders a favorite
    hasDefaultFavorites: computed(() => favoriteToolsName.value.length === defaultFavoriteTools.length
      && favoriteToolsName.value.every((name, index) => name === defaultFavoriteTools[index])),
    toolsByCategory,
    newTools: computed(() => tools.value.filter(({ isNew }) => isNew)),

    addToolToFavorites({ tool }: { tool: MaybeRef<Tool> }) {
      const toolPath = get(tool).path;
      if (toolPath) {
        favoriteToolsName.value.push(toolPath);
        trackEvent('favorite_add', { tool: toolPath.slice(1) });
      }
    },

    removeToolFromFavorites({ tool }: { tool: MaybeRef<Tool> }) {
      trackEvent('favorite_remove', { tool: (get(tool).path ?? get(tool).name).replace(/^\//, '') });
      favoriteToolsName.value = favoriteToolsName.value.filter(name => get(tool).name !== name && get(tool).path !== name);
    },

    isToolFavorite({ tool }: { tool: MaybeRef<Tool> }) {
      return favoriteToolsName.value.includes(get(tool).name)
        || favoriteToolsName.value.includes(get(tool).path);
    },

    updateFavoriteTools(newOrder: ToolWithCategory[]) {
      favoriteToolsName.value = newOrder.map(tool => tool.path);
    },
  };
});
