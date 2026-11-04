<script setup lang="ts">
import type { Colord } from 'colord';
import { colord, extend } from 'colord';
import _ from 'lodash';
import cmykPlugin from 'colord/plugins/cmyk';
import hwbPlugin from 'colord/plugins/hwb';
import namesPlugin from 'colord/plugins/names';
import lchPlugin from 'colord/plugins/lch';
import { buildColorFormat } from './color-converter.models';

const { t } = useI18n();

extend([cmykPlugin, hwbPlugin, namesPlugin, lchPlugin]);

function invalidFormat(format: string) {
  return t('tools.color-converter.invalidFormat', { format });
}

const formats = {
  picker: buildColorFormat({
    label: 'color picker',
    format: (v: Colord) => v.toHex(),
    type: 'color-picker',
  }),
  hex: buildColorFormat({
    label: 'hex',
    invalidMessage: invalidFormat('hex'),
    format: (v: Colord) => v.toHex(),
    placeholder: t('tools.color-converter.example', { value: '#ff0000' }),
  }),
  rgb: buildColorFormat({
    label: 'rgb',
    invalidMessage: invalidFormat('rgb'),
    format: (v: Colord) => v.toRgbString(),
    placeholder: t('tools.color-converter.example', { value: 'rgb(255, 0, 0)' }),
  }),
  hsl: buildColorFormat({
    label: 'hsl',
    invalidMessage: invalidFormat('hsl'),
    format: (v: Colord) => v.toHslString(),
    placeholder: t('tools.color-converter.example', { value: 'hsl(0, 100%, 50%)' }),
  }),
  hwb: buildColorFormat({
    label: 'hwb',
    invalidMessage: invalidFormat('hwb'),
    format: (v: Colord) => v.toHwbString(),
    placeholder: t('tools.color-converter.example', { value: 'hwb(0, 0%, 0%)' }),
  }),
  lch: buildColorFormat({
    label: 'lch',
    invalidMessage: invalidFormat('lch'),
    format: (v: Colord) => v.toLchString(),
    placeholder: t('tools.color-converter.example', { value: 'lch(53.24, 104.55, 40.85)' }),
  }),
  cmyk: buildColorFormat({
    label: 'cmyk',
    invalidMessage: invalidFormat('cmyk'),
    format: (v: Colord) => v.toCmykString(),
    placeholder: t('tools.color-converter.example', { value: 'cmyk(0, 100%, 100%, 0)' }),
  }),
  name: buildColorFormat({
    label: 'name',
    invalidMessage: invalidFormat('name'),
    format: (v: Colord) => v.toName({ closest: true }) ?? t('tools.color-converter.unknown'),
    placeholder: t('tools.color-converter.example', { value: 'red' }),
  }),
};

function displayLabel(key: string, label: string) {
  if (key === 'picker') {
    return t('tools.color-converter.colorPicker');
  }
  if (key === 'name') {
    return t('tools.color-converter.name');
  }
  return label;
}

updateColorValue(colord('#1ea54c'));

function updateColorValue(value: Colord | undefined, omitLabel?: string) {
  if (value === undefined) {
    return;
  }

  if (!value.isValid()) {
    return;
  }

  _.forEach(formats, ({ value: valueRef, format }, key) => {
    if (key !== omitLabel) {
      valueRef.value = format(value);
    }
  });
}
</script>

<template>
  <c-card>
    <template v-for="({ label, parse, placeholder, validation, type }, key) in formats" :key="key">
      <input-copyable
        v-if="type === 'text'"
        v-model:value="formats[key].value.value"
        :test-id="`input-${key}`"
        :label="`${displayLabel(key, label)}:`"
        label-position="left"
        label-width="100px"
        label-align="right"
        :placeholder="placeholder"
        :validation="validation"
        raw-text
        clearable
        mt-2
        @update:value="(v:string) => updateColorValue(parse(v), key)"
      />

      <n-form-item v-else-if="type === 'color-picker'" :label="`${displayLabel(key, label)}:`" label-width="100" label-placement="left" :show-feedback="false">
        <n-color-picker
          v-model:value="formats[key].value.value"
          placement="bottom-end"
          @update:value="(v:string) => updateColorValue(parse(v), key)"
        />
      </n-form-item>
    </template>
  </c-card>
</template>
