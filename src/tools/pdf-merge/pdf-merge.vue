<script setup lang="ts">
import { useMessage } from 'naive-ui';
import type { SortableItem } from '../pdf-common/pdf-common';
import { downloadBlob, formatSize, loadPdfLib, nextId } from '../pdf-common/pdf-common';
import SortableFileList from '../pdf-common/sortable-file-list.vue';

const { t } = useI18n();
const message = useMessage();

interface Entry extends SortableItem { data: ArrayBuffer; pages: number }

const entries = ref<Entry[]>([]);
const isBusy = ref(false);

const items = computed({
  get: () => entries.value as SortableItem[],
  set: (value) => {
    const byId = new Map(entries.value.map(e => [e.id, e]));
    entries.value = value.map(v => byId.get(v.id)!);
  },
});

const totalPages = computed(() => entries.value.reduce((sum, e) => sum + e.pages, 0));

async function addFiles(files: File[]) {
  const { PDFDocument } = await loadPdfLib();
  for (const file of files) {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      message.error(`${file.name}: ${t('tools.pdf-merge.notAPdf')}`);
      continue;
    }
    try {
      const data = await file.arrayBuffer();
      const doc = await PDFDocument.load(data);
      const pages = doc.getPageCount();
      entries.value.push({
        id: nextId(),
        name: file.name,
        detail: `${t('tools.pdf-merge.pages', { count: pages })} · ${formatSize(file.size)}`,
        data,
        pages,
      });
    }
    catch {
      message.error(`${file.name}: ${t('tools.pdf-merge.openFailed')}`);
    }
  }
}

function remove(id: number) {
  entries.value = entries.value.filter(e => e.id !== id);
}

async function merge() {
  if (entries.value.length < 2 || isBusy.value) {
    return;
  }
  isBusy.value = true;
  try {
    const { PDFDocument } = await loadPdfLib();
    const output = await PDFDocument.create();
    for (const entry of entries.value) {
      const source = await PDFDocument.load(entry.data);
      const pages = await output.copyPages(source, source.getPageIndices());
      pages.forEach(page => output.addPage(page));
    }
    const bytes = await output.save();
    downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'merged.pdf');
    message.success(t('tools.pdf-merge.done'));
  }
  catch {
    message.error(t('tools.pdf-merge.failed'));
  }
  finally {
    isBusy.value = false;
  }
}
</script>

<template>
  <div>
    <c-file-upload
      multiple
      accept="application/pdf,.pdf"
      :title="$t('tools.pdf-merge.upload')"
      @files-upload="addFiles"
    />

    <div v-if="entries.length" mt-4>
      <SortableFileList v-model:items="items" :disabled="isBusy" @remove="remove" />
      <div mt-1 text-12px op-60>
        {{ $t('tools.pdf-merge.summary', { files: entries.length, pages: totalPages }) }} · {{ $t('tools.pdf-merge.dragHint') }}
      </div>
      <div mt-3 flex gap-2>
        <c-button type="primary" class="solid-primary" :disabled="isBusy || entries.length < 2" @click="merge">
          {{ isBusy ? $t('tools.pdf-merge.working') : $t('tools.pdf-merge.merge') }}
        </c-button>
        <c-button :disabled="isBusy" @click="entries = []">
          {{ $t('tools.pdf-merge.clear') }}
        </c-button>
      </div>
      <div v-if="entries.length < 2" mt-2 text-12px op-70>
        {{ $t('tools.pdf-merge.needTwo') }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.solid-primary {
  color: #fff !important;
  background-color: #18a058 !important;

  &:hover:not([disabled]) {
    background-color: #36ad6a !important;
  }

  &[disabled] {
    opacity: 0.6;
  }
}
</style>
