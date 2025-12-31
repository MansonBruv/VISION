export enum ItemType {
  IMAGE = 'IMAGE',
  NOTE = 'NOTE',
  QUOTE = 'QUOTE',
  GOAL_LIST = 'GOAL_LIST'
}

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface BoardItemData {
  id: string;
  type: ItemType;
  position: Position;
  zIndex: number;
  content: string; // URL for image, Text for others
  meta?: {
    color?: string;
    rotation?: number;
    title?: string; // For lists
    items?: string[]; // For checklists
  };
}

export type Theme = 'light' | 'dark' | 'dreamy';
