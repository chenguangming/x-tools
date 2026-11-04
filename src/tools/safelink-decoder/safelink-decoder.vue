<script setup lang="ts">
import { decodeSafeLinksURL } from './safelink-decoder.service';
import TextareaCopyable from '@/components/TextareaCopyable.vue';

const inputSafeLinkUrl = ref('');
const outputDecodedUrl = computed(() => {
  try {
    return decodeSafeLinksURL(inputSafeLinkUrl.value);
  }
  catch (e: any) {
    return e.toString();
  }
});
</script>

<template>
  <div>
    <c-input-text
      v-model:value="inputSafeLinkUrl"

      :placeholder="$t('tools.safelink-decoder.inputPlaceholder')"
      autofocus raw-text
      :label="$t('tools.safelink-decoder.inputLabel')"
    />

    <n-divider />

    <n-form-item :label="$t('tools.safelink-decoder.outputLabel')">
      <TextareaCopyable :value="outputDecodedUrl" :word-wrap="true" />
    </n-form-item>
  </div>
</template>
