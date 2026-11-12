<script setup lang="ts">
import Draggable from 'vuedraggable';
import type { SortableItem } from './pdf-common';

const props = defineProps<{ items: SortableItem[]; disabled?: boolean }>();
const emit = defineEmits<{ (e: 'update:items', items: SortableItem[]): void; (e: 'remove', id: number): void }>();

const model = computed({
  get: () => props.items,
  set: value => emit('update:items', value),
});
</script>

<template>
  <Draggable v-model="model" item-key="id" handle=".handle" :animation="150" :disabled="disabled">
    <template #item="{ element, index }">
      <div class="row">
        <span class="handle" title="drag">⠿</span>
        <span class="index">{{ index + 1 }}</span>
        <img v-if="element.thumb" :src="element.thumb" class="thumb" alt="">
        <div class="meta">
          <div class="name">
            {{ element.name }}
          </div>
          <div v-if="element.detail" class="detail">
            {{ element.detail }}
          </div>
        </div>
        <button class="remove" :disabled="disabled" @click="emit('remove', element.id)">
          ✕
        </button>
      </div>
    </template>
  </Draggable>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  margin-bottom: 6px;
  background: rgba(128, 128, 128, 0.12);
  border-radius: 6px;
}

.handle {
  cursor: grab;
  padding: 0 6px;
  font-size: 18px;
  opacity: 0.6;
  touch-action: none;
}

.index {
  min-width: 20px;
  opacity: 0.6;
  font-size: 12px;
}

.thumb {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
}

.meta {
  flex: 1;
  min-width: 0;
}

.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail {
  font-size: 12px;
  opacity: 0.6;
}

.remove {
  padding: 4px 8px;
  cursor: pointer;
  background: none;
  border: none;
  color: inherit;
  opacity: 0.6;

  &:hover {
    opacity: 1;
  }
}
</style>
