<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { diffLines, isValidXML, normalizeXml } from './xml-diff.service';
import { useQueryParam } from '@/composable/queryParams';

const { t } = useI18n();
const first = useQueryParam({ name: 'a', defaultValue: '' });
const second = useQueryParam({ name: 'b', defaultValue: '' });
const prettify = ref(true);
const onlyDiff = ref(false);

const firstValid = computed(() => isValidXML(first.value));
const secondValid = computed(() => isValidXML(second.value));

const lines = computed(() => diffLines(normalizeXml(first.value, prettify.value), normalizeXml(second.value, prettify.value)));
const hasDiff = computed(() => lines.value.some(l => l.type !== 'same'));
const shown = computed(() => (onlyDiff.value ? lines.value.filter(l => l.type !== 'same') : lines.value));
const marker = { same: ' ', add: '+', del: '-' } as const;
</script>

<template>
  <div>
    <n-grid x-gap="12" y-gap="12" cols="1 600:2">
      <n-gi>
        <c-input-text
          v-model:value="first"
          :label="t('tools.xml-diff.firstLabel')"
          :placeholder="t('tools.xml-diff.firstPlaceholder')"
          rows="10" raw-text autosize multiline monospace
          :validation-rules="[{ message: t('tools.xml-diff.invalidXml'), validator: () => firstValid }]"
        />
      </n-gi>
      <n-gi>
        <c-input-text
          v-model:value="second"
          :label="t('tools.xml-diff.secondLabel')"
          :placeholder="t('tools.xml-diff.secondPlaceholder')"
          multiline rows="10" raw-text monospace autosize
          :validation-rules="[{ message: t('tools.xml-diff.invalidXml'), validator: () => secondValid }]"
        />
      </n-gi>
    </n-grid>

    <div my-3 flex flex-wrap gap-6>
      <n-switch v-model:value="prettify" />
      <span>{{ t('tools.xml-diff.prettify') }}</span>
      <n-switch v-model:value="onlyDiff" />
      <span>{{ t('tools.xml-diff.onlyDiff') }}</span>
    </div>

    <c-card v-if="first.trim() || second.trim()">
      <div v-if="!hasDiff" text-center op-70>
        {{ t('tools.xml-diff.same') }}
      </div>
      <div v-else max-h-500px overflow-auto text-13px font-mono>
        <div
          v-for="(l, i) in shown" :key="i" flex whitespace-pre
          :style="{ background: l.type === 'add' ? 'rgba(46,160,67,.2)' : l.type === 'del' ? 'rgba(248,81,73,.2)' : 'transparent' }"
        >
          <span w-10 flex-none select-none pr-2 text-right op-50>{{ l.oldNo ?? '' }}</span>
          <span w-10 flex-none select-none pr-2 text-right op-50>{{ l.newNo ?? '' }}</span>
          <span w-4 flex-none select-none>{{ marker[l.type] }}</span>
          <span>{{ l.text }}</span>
        </div>
      </div>
    </c-card>
  </div>
</template>
