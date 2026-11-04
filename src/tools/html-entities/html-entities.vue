<script setup lang="ts">
import { escape, unescape } from 'lodash';

import { useCopy } from '@/composable/copy';

const escapeInput = ref('<title>IT Tool</title>');
const escapeOutput = computed(() => escape(escapeInput.value));
const { copy: copyEscaped } = useCopy({ source: escapeOutput });

const unescapeInput = ref('&lt;title&gt;IT Tool&lt;/title&gt;');
const unescapeOutput = computed(() => unescape(unescapeInput.value));
const { copy: copyUnescaped } = useCopy({ source: unescapeOutput });
</script>

<template>
  <c-card :title="$t('tools.html-entities.escapeTitle')">
    <n-form-item :label="$t('tools.html-entities.yourString')">
      <c-input-text
        v-model:value="escapeInput"
        multiline
        :placeholder="$t('tools.html-entities.stringToEscape')"
        rows="3"
        autosize
        raw-text
      />
    </n-form-item>

    <n-form-item :label="$t('tools.html-entities.yourStringEscaped')">
      <c-input-text
        multiline
        readonly
        :placeholder="$t('tools.html-entities.escapedPlaceholder')"
        :value="escapeOutput"
        rows="3"
        autosize
      />
    </n-form-item>

    <div flex justify-center>
      <c-button @click="copyEscaped()">
        {{ $t('tools.html-entities.copy') }}
      </c-button>
    </div>
  </c-card>
  <c-card :title="$t('tools.html-entities.unescapeTitle')">
    <n-form-item :label="$t('tools.html-entities.yourEscapedString')">
      <c-input-text
        v-model:value="unescapeInput"
        multiline
        :placeholder="$t('tools.html-entities.stringToUnescape')"
        rows="3"
        autosize
        raw-text
      />
    </n-form-item>

    <n-form-item :label="$t('tools.html-entities.yourStringUnescaped')">
      <c-input-text
        :value="unescapeOutput"
        multiline
        readonly
        :placeholder="$t('tools.html-entities.unescapedPlaceholder')"
        rows="3"
        autosize
      />
    </n-form-item>

    <div flex justify-center>
      <c-button @click="copyUnescaped()">
        {{ $t('tools.html-entities.copy') }}
      </c-button>
    </div>
  </c-card>
</template>
