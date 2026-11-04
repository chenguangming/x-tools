<script setup lang="ts">
import { UAParser } from 'ua-parser-js';
import { Adjustments, Browser, Cpu, Devices, Engine } from '@vicons/tabler';
import UserAgentResultCards from './user-agent-result-cards.vue';
import type { UserAgentResultSection } from './user-agent-parser.types';
import { withDefaultOnError } from '@/utils/defaults';

const { t } = useI18n();

const ua = ref(navigator.userAgent as string);

// If not input in the ua field is present return an empty object of type UAParser.IResult because otherwise
// UAParser returns the values for the current Browser. This is confusing because results are shown for an empty
// UA field value.
function getUserAgentInfo(userAgent: string) {
  return userAgent.trim().length > 0
    ? UAParser(userAgent.trim())
    : ({ ua: '', browser: {}, cpu: {}, device: {}, engine: {}, os: {} } as UAParser.IResult);
}
const userAgentInfo = computed(() => withDefaultOnError(() => getUserAgentInfo(ua.value), undefined));

const sections = computed<UserAgentResultSection[]>(() => [
  {
    heading: t('tools.user-agent-parser.headingBrowser'),
    icon: Browser,
    content: [
      {
        label: t('tools.user-agent-parser.labelName'),
        getValue: block => block?.browser.name,
        undefinedFallback: t('tools.user-agent-parser.noBrowserName'),
      },
      {
        label: t('tools.user-agent-parser.labelVersion'),
        getValue: block => block?.browser.version,
        undefinedFallback: t('tools.user-agent-parser.noBrowserVersion'),
      },
    ],
  },
  {
    heading: t('tools.user-agent-parser.headingEngine'),
    icon: Engine,
    content: [
      {
        label: t('tools.user-agent-parser.labelName'),
        getValue: block => block?.engine.name,
        undefinedFallback: t('tools.user-agent-parser.noEngineName'),
      },
      {
        label: t('tools.user-agent-parser.labelVersion'),
        getValue: block => block?.engine.version,
        undefinedFallback: t('tools.user-agent-parser.noEngineVersion'),
      },
    ],
  },
  {
    heading: t('tools.user-agent-parser.headingOs'),
    icon: Adjustments,
    content: [
      {
        label: t('tools.user-agent-parser.labelName'),
        getValue: block => block?.os.name,
        undefinedFallback: t('tools.user-agent-parser.noOsName'),
      },
      {
        label: t('tools.user-agent-parser.labelVersion'),
        getValue: block => block?.os.version,
        undefinedFallback: t('tools.user-agent-parser.noOsVersion'),
      },
    ],
  },
  {
    heading: t('tools.user-agent-parser.headingDevice'),
    icon: Devices,
    content: [
      {
        label: t('tools.user-agent-parser.labelModel'),
        getValue: block => block?.device.model,
        undefinedFallback: t('tools.user-agent-parser.noDeviceModel'),
      },
      {
        label: t('tools.user-agent-parser.labelType'),
        getValue: block => block?.device.type,
        undefinedFallback: t('tools.user-agent-parser.noDeviceType'),
      },
      {
        label: t('tools.user-agent-parser.labelVendor'),
        getValue: block => block?.device.vendor,
        undefinedFallback: t('tools.user-agent-parser.noDeviceVendor'),
      },
    ],
  },
  {
    heading: t('tools.user-agent-parser.headingCpu'),
    icon: Cpu,
    content: [
      {
        label: t('tools.user-agent-parser.labelArchitecture'),
        getValue: block => block?.cpu.architecture,
        undefinedFallback: t('tools.user-agent-parser.noCpuArchitecture'),
      },
    ],
  },
]);
</script>

<template>
  <div>
    <c-input-text
      v-model:value="ua"
      :label="$t('tools.user-agent-parser.uaLabel')"

      :placeholder="$t('tools.user-agent-parser.uaPlaceholder')"

      rows="2"

      multiline raw-text autosize clearable monospace mb-3
    />

    <UserAgentResultCards :user-agent-info="userAgentInfo" :sections="sections" />
  </div>
</template>
