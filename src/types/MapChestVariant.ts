export const chestVariants = [1, 2, 3, 4, 5] as const;

export type MapChestVariant = (typeof chestVariants)[number];
