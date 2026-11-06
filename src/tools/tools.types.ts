import type { Component } from 'vue';

export interface Tool {
  name: string
  path: string
  description: string
  keywords: string[]
  component: () => Promise<Component>
  icon: Component
  redirectFrom?: string[]
  isNew: boolean
  createdAt?: Date
}

export type ToolWithCategory = Tool & { category: string; categoryKey: string };

export interface ToolCategory {
  key: string
  name: string
  components: ToolWithCategory[]
}
