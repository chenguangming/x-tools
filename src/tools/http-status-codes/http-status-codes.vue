<script setup lang="ts">
import { codesByCategories } from './http-status-codes.constants';
import { useFuzzySearch } from '@/composable/fuzzySearch';

const { t } = useI18n();
const search = ref('');

const categoryKeys: Record<string, string> = {
  '1xx informational response': 'category1xx',
  '2xx success': 'category2xx',
  '3xx redirection': 'category3xx',
  '4xx client error': 'category4xx',
  '5xx server error': 'category5xx',
  'Search results': 'searchResults',
};

const categoryLabel = (category: string) => t(`tools.http-status-codes.${categoryKeys[category]}`);

const { searchResult } = useFuzzySearch({
  search,
  data: codesByCategories.flatMap(({ codes, category }) => codes.map(code => ({ ...code, category }))),
  options: {
    keys: [{ name: 'code', weight: 3 }, { name: 'name', weight: 2 }, 'description', 'category'],
  },
});

const codesByCategoryFiltered = computed(() => {
  if (!search.value) {
    return codesByCategories;
  }

  return [{ category: 'Search results', codes: searchResult.value }];
});
</script>

<template>
  <div>
    <c-input-text
      v-model:value="search"
      :placeholder="$t('tools.http-status-codes.searchPlaceholder')"
      autofocus raw-text mb-10
    />

    <div v-for="{ codes, category } of codesByCategoryFiltered" :key="category" mb-8>
      <div mb-2 text-xl>
        {{ categoryLabel(category) }}
      </div>

      <c-card v-for="{ code, description, name, type } of codes" :key="code" mb-2>
        <div text-lg font-bold>
          {{ code }} {{ name }}
        </div>
        <div op-70>
          {{ description }} {{ type !== 'HTTP' ? $t('tools.http-status-codes.forType', { type }) : '' }}
        </div>
      </c-card>
    </div>
  </div>
</template>
