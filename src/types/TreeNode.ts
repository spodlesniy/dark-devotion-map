import type { ReactNode } from 'react';

export type TreeNode = Readonly<{
  id: string;
  title: string;
  icon?: ReactNode;
  showIcon?: boolean;
  showVisibility?: boolean;
  count?: number;
  countChanged?: boolean;
  hidden?: boolean;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  expansionRequest?: string;
  alwaysExpanded?: boolean;
  disabled?: boolean;
  onActivate?: () => void;
  showCount?: boolean;
  children?: readonly TreeNode[];
}>;

export type TreeVisibility = 'visible' | 'hidden' | 'mixed';
