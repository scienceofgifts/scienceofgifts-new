import { useCallback, useEffect, useState } from 'react';
import { Product } from '../types/content';

export const SAVED_GIFTS_STORAGE_KEY = 'sog_saved_gifts_v2';
export const RECIPIENT_NOTES_STORAGE_KEY = 'sog_recipient_notes_v2';
export const GIFT_LISTS_STORAGE_KEY = 'sog_gift_lists_v3';

export const DEFAULT_LIST_ID = 'list_default';

const DEFAULT_SAVED_IDS = [
  'prod_fluted_bedside_carafe_09',
  'prod_chili_honey_flight_01',
];

const DEFAULT_RECIPIENT_NOTES: Record<string, string> = {
  prod_fluted_bedside_carafe_09: 'For Elena — Guest bedroom housewarming',
  prod_chili_honey_flight_01: 'For Claire & Dan — Saturday dinner party',
};

export interface SavedGiftItemEntry {
  productId: string;
  addedAt: string;
  note: string;
  purchased: boolean;
}

export interface SavedGiftList {
  id: string;
  name: string;
  recipientLabel?: string;
  occasionLabel?: string;
  createdAt: string;
  updatedAt: string;
  items: SavedGiftItemEntry[];
}

export interface ResolvedSavedGiftItem {
  entry: SavedGiftItemEntry;
  product: Product | null;
  isMissingFromCatalog: boolean;
}

const SAVED_CHANGED_EVENT = 'sog:saved-gifts-changed';
const NOTES_CHANGED_EVENT = 'sog:recipient-notes-changed';
const LISTS_CHANGED_EVENT = 'sog:gift-lists-changed';
export const OPEN_PRODUCT_MODAL_EVENT = 'sog:open-product-modal';
export const OPEN_SAVED_DRAWER_EVENT = 'sog:open-saved-drawer';
export const OPEN_ARCH_MODAL_EVENT = 'sog:open-arch-modal';

function createDefaultGiftLists(
  seedIds: string[] = DEFAULT_SAVED_IDS,
  seedNotes: Record<string, string> = DEFAULT_RECIPIENT_NOTES
): SavedGiftList[] {
  const now = '2026-10-27T12:00:00.000Z';
  const uniqueIds = Array.from(
    new Set(seedIds.filter((id): id is string => typeof id === 'string' && Boolean(id.trim())))
  );
  return [
    {
      id: DEFAULT_LIST_ID,
      name: 'General Saved Ideas',
      recipientLabel: 'All Recipients',
      occasionLabel: 'Any Occasion',
      createdAt: now,
      updatedAt: now,
      items: uniqueIds.map((id) => ({
        productId: id,
        addedAt: now,
        note: typeof seedNotes[id] === 'string' ? seedNotes[id] : '',
        purchased: false,
      })),
    },
  ];
}

function readLegacyV2IdsRaw(): string[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SAVED_GIFTS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return Array.from(
        new Set(parsed.filter((id): id is string => typeof id === 'string' && Boolean(id.trim())))
      );
    }
    return null;
  } catch {
    return null;
  }
}

function readLegacyV2NotesRaw(): Record<string, string> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(RECIPIENT_NOTES_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const clean: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'string') {
          clean[k] = v;
        }
      }
      return clean;
    }
    return null;
  } catch {
    return null;
  }
}

function sanitizeGiftLists(rawLists: unknown): SavedGiftList[] | null {
  if (!Array.isArray(rawLists) || rawLists.length === 0) return null;
  const now = new Date().toISOString();
  const validLists: SavedGiftList[] = [];
  const seenListIds = new Set<string>();

  for (const rawList of rawLists) {
    if (!rawList || typeof rawList !== 'object') continue;
    const obj = rawList as Record<string, unknown>;
    const id =
      typeof obj.id === 'string' && obj.id.trim()
        ? obj.id.trim()
        : `list_${validLists.length + 1}`;
    if (seenListIds.has(id)) continue;
    seenListIds.add(id);

    const name =
      typeof obj.name === 'string' && obj.name.trim()
        ? obj.name.trim()
        : 'Saved Gift List';

    const rawItems = Array.isArray(obj.items) ? obj.items : [];
    const seenProducts = new Set<string>();
    const cleanItems: SavedGiftItemEntry[] = [];

    for (const item of rawItems) {
      if (!item || typeof item !== 'object') continue;
      const itemObj = item as Record<string, unknown>;
      const productId =
        typeof itemObj.productId === 'string' ? itemObj.productId.trim() : '';
      if (!productId || seenProducts.has(productId)) continue;
      seenProducts.add(productId);

      cleanItems.push({
        productId,
        addedAt: typeof itemObj.addedAt === 'string' ? itemObj.addedAt : now,
        note: typeof itemObj.note === 'string' ? itemObj.note : '',
        purchased: Boolean(itemObj.purchased),
      });
    }

    validLists.push({
      id,
      name,
      recipientLabel:
        typeof obj.recipientLabel === 'string' && obj.recipientLabel.trim()
          ? obj.recipientLabel.trim()
          : undefined,
      occasionLabel:
        typeof obj.occasionLabel === 'string' && obj.occasionLabel.trim()
          ? obj.occasionLabel.trim()
          : undefined,
      createdAt: typeof obj.createdAt === 'string' ? obj.createdAt : now,
      updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : now,
      items: cleanItems,
    });
  }

  if (validLists.length === 0) return null;
  if (!validLists.some((l) => l.id === DEFAULT_LIST_ID)) {
    validLists.unshift({
      id: DEFAULT_LIST_ID,
      name: 'General Saved Ideas',
      recipientLabel: 'All Recipients',
      occasionLabel: 'Any Occasion',
      createdAt: now,
      updatedAt: now,
      items: [],
    });
  }
  return validLists;
}

/**
 * Reads all saved gift lists, automatically migrating any legacy v2 saved product IDs
 * and recipient notes so existing browser data is preserved seamlessly.
 */
export function readGiftLists(): SavedGiftList[] {
  if (typeof window === 'undefined') {
    return createDefaultGiftLists();
  }

  const legacyIds = readLegacyV2IdsRaw();
  const legacyNotes = readLegacyV2NotesRaw();

  try {
    const rawV3 = window.localStorage.getItem(GIFT_LISTS_STORAGE_KEY);
    if (rawV3) {
      const parsed = JSON.parse(rawV3);
      const sanitized = sanitizeGiftLists(parsed);
      if (sanitized) {
        // Reconcile if legacy v2 has any newly added ID or updated note not yet in v3
        if (legacyIds) {
          const allV3ProductIds = new Set(
            sanitized.flatMap((l) => l.items.map((i) => i.productId))
          );
          const defaultList =
            sanitized.find((l) => l.id === DEFAULT_LIST_ID) ?? sanitized[0];
          for (const id of legacyIds) {
            if (!allV3ProductIds.has(id)) {
              defaultList.items.push({
                productId: id,
                addedAt: new Date().toISOString(),
                note: legacyNotes?.[id] ?? DEFAULT_RECIPIENT_NOTES[id] ?? '',
                purchased: false,
              });
            }
          }
        }
        return sanitized;
      }
    }
  } catch {
    // Fall back to migration / defaults
  }

  // Migrate from v2 or initialize defaults
  const initialIds = legacyIds ?? DEFAULT_SAVED_IDS;
  const initialNotes = {
    ...DEFAULT_RECIPIENT_NOTES,
    ...(legacyNotes ?? {}),
  };
  return createDefaultGiftLists(initialIds, initialNotes);
}

/**
 * Writes gift lists to `sog_gift_lists_v3` AND synchronizes `sog_saved_gifts_v2` and
 * `sog_recipient_notes_v2` for 100% backward compatibility with all existing islands.
 */
export function writeGiftLists(lists: SavedGiftList[]): SavedGiftList[] {
  const sanitized = sanitizeGiftLists(lists) ?? createDefaultGiftLists([], {});

  const allProductIds = Array.from(
    new Set(sanitized.flatMap((l) => l.items.map((i) => i.productId)))
  );

  const notesMap: Record<string, string> = {
    ...(readLegacyV2NotesRaw() ?? DEFAULT_RECIPIENT_NOTES),
  };
  for (const list of sanitized) {
    for (const item of list.items) {
      if (typeof item.note === 'string') {
        notesMap[item.productId] = item.note;
      }
    }
  }

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(
        GIFT_LISTS_STORAGE_KEY,
        JSON.stringify(sanitized)
      );
      window.localStorage.setItem(
        SAVED_GIFTS_STORAGE_KEY,
        JSON.stringify(allProductIds)
      );
      window.localStorage.setItem(
        RECIPIENT_NOTES_STORAGE_KEY,
        JSON.stringify(notesMap)
      );
    } catch {
      // Ignore storage quota errors
    }

    window.dispatchEvent(
      new CustomEvent<SavedGiftList[]>(LISTS_CHANGED_EVENT, {
        detail: sanitized,
      })
    );
    window.dispatchEvent(
      new CustomEvent<string[]>(SAVED_CHANGED_EVENT, { detail: allProductIds })
    );
    window.dispatchEvent(
      new CustomEvent<Record<string, string>>(NOTES_CHANGED_EVENT, {
        detail: notesMap,
      })
    );
  }

  return sanitized;
}

export function readSavedProductIds(): string[] {
  if (typeof window === 'undefined') {
    return DEFAULT_SAVED_IDS;
  }
  const lists = readGiftLists();
  return Array.from(
    new Set(lists.flatMap((l) => l.items.map((i) => i.productId)))
  );
}

export function writeSavedProductIds(ids: string[]): string[] {
  const deduped = Array.from(
    new Set(ids.filter((id): id is string => typeof id === 'string' && Boolean(id.trim())))
  );
  const currentLists = readGiftLists();
  const currentNotes = readRecipientNotes();
  const now = new Date().toISOString();

  const targetSet = new Set(deduped);
  // Remove any items not in targetSet across all lists
  const updatedLists = currentLists.map((list) => ({
    ...list,
    updatedAt: now,
    items: list.items.filter((item) => targetSet.has(item.productId)),
  }));

  const remainingIds = new Set(
    updatedLists.flatMap((l) => l.items.map((i) => i.productId))
  );
  const defaultList =
    updatedLists.find((l) => l.id === DEFAULT_LIST_ID) ?? updatedLists[0];

  for (const id of deduped) {
    if (!remainingIds.has(id)) {
      defaultList.items.push({
        productId: id,
        addedAt: now,
        note: currentNotes[id] ?? '',
        purchased: false,
      });
    }
  }

  writeGiftLists(updatedLists);
  return deduped;
}

export function toggleSavedProductId(
  productId: string,
  preferredListId: string = DEFAULT_LIST_ID
): string[] {
  const currentIds = readSavedProductIds();
  const isCurrentlySaved = currentIds.includes(productId);

  if (isCurrentlySaved) {
    // Remove from all lists so heart toggle cleanly unsaves the product
    const lists = readGiftLists().map((list) => ({
      ...list,
      updatedAt: new Date().toISOString(),
      items: list.items.filter((item) => item.productId !== productId),
    }));
    writeGiftLists(lists);
  } else {
    saveProductToList(productId, preferredListId);
  }

  return readSavedProductIds();
}

export function readRecipientNotes(): Record<string, string> {
  if (typeof window === 'undefined') {
    return DEFAULT_RECIPIENT_NOTES;
  }
  const legacyNotes = readLegacyV2NotesRaw() ?? DEFAULT_RECIPIENT_NOTES;
  const lists = readGiftLists();
  const merged: Record<string, string> = { ...legacyNotes };
  for (const list of lists) {
    for (const item of list.items) {
      if (item.note) {
        merged[item.productId] = item.note;
      }
    }
  }
  return merged;
}

export function writeRecipientNote(
  productId: string,
  note: string,
  listId?: string
): Record<string, string> {
  const lists = readGiftLists();
  const now = new Date().toISOString();
  let updatedAny = false;

  const nextLists = lists.map((list) => {
    if (listId && list.id !== listId) return list;
    const hasItem = list.items.some((i) => i.productId === productId);
    if (!hasItem) return list;
    updatedAny = true;
    return {
      ...list,
      updatedAt: now,
      items: list.items.map((item) =>
        item.productId === productId ? { ...item, note } : item
      ),
    };
  });

  if (updatedAny) {
    writeGiftLists(nextLists);
  } else if (typeof window !== 'undefined') {
    const current = readRecipientNotes();
    const next = { ...current, [productId]: note };
    try {
      window.localStorage.setItem(
        RECIPIENT_NOTES_STORAGE_KEY,
        JSON.stringify(next)
      );
    } catch {
      // Ignore storage errors
    }
    window.dispatchEvent(
      new CustomEvent<Record<string, string>>(NOTES_CHANGED_EVENT, {
        detail: next,
      })
    );
    return next;
  }

  return readRecipientNotes();
}

/**
 * Multi-List Management Operations (Stage D)
 */
export function createGiftList(input: {
  name: string;
  recipientLabel?: string;
  occasionLabel?: string;
}): SavedGiftList {
  const cleanName = input.name.trim() || 'New Gift List';
  const lists = readGiftLists();
  const now = new Date().toISOString();
  const slugBase = cleanName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 32);
  let id = `list_${slugBase || 'custom'}_${lists.length + 1}`;
  let suffix = 2;
  while (lists.some((l) => l.id === id)) {
    id = `list_${slugBase || 'custom'}_${lists.length + suffix}`;
    suffix++;
  }

  const newList: SavedGiftList = {
    id,
    name: cleanName,
    recipientLabel: input.recipientLabel?.trim() || undefined,
    occasionLabel: input.occasionLabel?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
    items: [],
  };

  writeGiftLists([...lists, newList]);
  return newList;
}

export function updateGiftListMeta(
  listId: string,
  patch: {
    name?: string;
    recipientLabel?: string;
    occasionLabel?: string;
  }
): SavedGiftList[] {
  const lists = readGiftLists();
  const now = new Date().toISOString();
  const updated = lists.map((list) => {
    if (list.id !== listId) return list;
    return {
      ...list,
      name:
        patch.name !== undefined && patch.name.trim()
          ? patch.name.trim()
          : list.name,
      recipientLabel:
        patch.recipientLabel !== undefined
          ? patch.recipientLabel.trim() || undefined
          : list.recipientLabel,
      occasionLabel:
        patch.occasionLabel !== undefined
          ? patch.occasionLabel.trim() || undefined
          : list.occasionLabel,
      updatedAt: now,
    };
  });
  return writeGiftLists(updated);
}

export function deleteGiftList(listId: string): SavedGiftList[] {
  if (listId === DEFAULT_LIST_ID) {
    // Clearing default list keeps the default list shell empty
    const lists = readGiftLists().map((list) =>
      list.id === DEFAULT_LIST_ID
        ? { ...list, items: [], updatedAt: new Date().toISOString() }
        : list
    );
    return writeGiftLists(lists);
  }
  const lists = readGiftLists().filter((l) => l.id !== listId);
  return writeGiftLists(lists);
}

export function saveProductToList(
  productId: string,
  listId: string = DEFAULT_LIST_ID,
  initialNote?: string
): SavedGiftList[] {
  const trimmedId = productId.trim();
  if (!trimmedId) return readGiftLists();

  const lists = readGiftLists();
  const existingNotes = readRecipientNotes();
  const now = new Date().toISOString();

  const targetExists = lists.some((l) => l.id === listId);
  const effectiveListId = targetExists ? listId : DEFAULT_LIST_ID;

  const updated = lists.map((list) => {
    if (list.id !== effectiveListId) return list;
    const existingItem = list.items.find((i) => i.productId === trimmedId);
    if (existingItem) {
      return {
        ...list,
        updatedAt: now,
        items: list.items.map((item) =>
          item.productId === trimmedId && initialNote !== undefined
            ? { ...item, note: initialNote }
            : item
        ),
      };
    }
    return {
      ...list,
      updatedAt: now,
      items: [
        ...list.items,
        {
          productId: trimmedId,
          addedAt: now,
          note: initialNote ?? existingNotes[trimmedId] ?? '',
          purchased: false,
        },
      ],
    };
  });

  return writeGiftLists(updated);
}

export function removeProductFromList(
  productId: string,
  listId: string
): SavedGiftList[] {
  const lists = readGiftLists();
  const now = new Date().toISOString();
  const updated = lists.map((list) => {
    if (list.id !== listId) return list;
    return {
      ...list,
      updatedAt: now,
      items: list.items.filter((i) => i.productId !== productId),
    };
  });
  return writeGiftLists(updated);
}

export function moveProductBetweenLists(
  productId: string,
  fromListId: string,
  toListId: string
): SavedGiftList[] {
  if (fromListId === toListId) return readGiftLists();
  const lists = readGiftLists();
  const sourceList = lists.find((l) => l.id === fromListId);
  const destList = lists.find((l) => l.id === toListId);
  if (!sourceList || !destList) return lists;

  const movingItem = sourceList.items.find((i) => i.productId === productId);
  if (!movingItem) return lists;

  const now = new Date().toISOString();
  const updated = lists.map((list) => {
    if (list.id === fromListId) {
      return {
        ...list,
        updatedAt: now,
        items: list.items.filter((i) => i.productId !== productId),
      };
    }
    if (list.id === toListId) {
      const alreadyInDest = list.items.some((i) => i.productId === productId);
      if (alreadyInDest) {
        return {
          ...list,
          updatedAt: now,
          items: list.items.map((i) =>
            i.productId === productId
              ? {
                  ...i,
                  note: movingItem.note || i.note,
                  purchased: movingItem.purchased || i.purchased,
                }
              : i
          ),
        };
      }
      return {
        ...list,
        updatedAt: now,
        items: [...list.items, { ...movingItem }],
      };
    }
    return list;
  });

  return writeGiftLists(updated);
}

export function toggleSavedItemPurchased(
  productId: string,
  listId: string
): SavedGiftList[] {
  const lists = readGiftLists();
  const now = new Date().toISOString();
  const updated = lists.map((list) => {
    if (list.id !== listId) return list;
    return {
      ...list,
      updatedAt: now,
      items: list.items.map((item) =>
        item.productId === productId
          ? { ...item, purchased: !item.purchased }
          : item
      ),
    };
  });
  return writeGiftLists(updated);
}

export function clearAllSavedGifts(): SavedGiftList[] {
  const now = new Date().toISOString();
  const cleared: SavedGiftList[] = [
    {
      id: DEFAULT_LIST_ID,
      name: 'General Saved Ideas',
      recipientLabel: 'All Recipients',
      occasionLabel: 'Any Occasion',
      createdAt: now,
      updatedAt: now,
      items: [],
    },
  ];
  return writeGiftLists(cleared);
}

/**
 * Resolves saved list items against the canonical product catalog map,
 * surfacing any missing/removed product IDs gracefully rather than crashing.
 */
export function resolveSavedListItems(
  list: SavedGiftList,
  productsMap: Record<string, Product>
): {
  resolvedItems: ResolvedSavedGiftItem[];
  validProductsCount: number;
  missingProductsCount: number;
  purchasedCount: number;
  totalVerifiedPrice: number;
} {
  let validProductsCount = 0;
  let missingProductsCount = 0;
  let purchasedCount = 0;
  let totalVerifiedPrice = 0;

  const resolvedItems: ResolvedSavedGiftItem[] = list.items.map((entry) => {
    const product = productsMap[entry.productId] ?? null;
    const isMissingFromCatalog = !product;
    if (isMissingFromCatalog) {
      missingProductsCount += 1;
    } else {
      validProductsCount += 1;
      if (typeof product.price === 'number' && Number.isFinite(product.price) && product.price > 0) {
        totalVerifiedPrice += product.price;
      }
    }
    if (entry.purchased) {
      purchasedCount += 1;
    }
    return {
      entry,
      product,
      isMissingFromCatalog,
    };
  });

  return {
    resolvedItems,
    validProductsCount,
    missingProductsCount,
    purchasedCount,
    totalVerifiedPrice,
  };
}

export function dispatchOpenProductModal(product: Product): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<Product>(OPEN_PRODUCT_MODAL_EVENT, { detail: product })
    );
  }
}

export function dispatchOpenSavedDrawer(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OPEN_SAVED_DRAWER_EVENT));
  }
}

export function dispatchOpenArchModal(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OPEN_ARCH_MODAL_EVENT));
  }
}

/**
 * React hook for islands that read/toggle saved products and manage multiple recipient lists
 * while staying synchronized across multiple islands on the same Astro page.
 */
export function useSavedGiftsState() {
  const [giftLists, setGiftLists] = useState<SavedGiftList[]>(() =>
    createDefaultGiftLists()
  );
  const [savedProductIds, setSavedProductIds] =
    useState<string[]>(DEFAULT_SAVED_IDS);
  const [recipientNotes, setRecipientNotes] = useState<Record<string, string>>(
    DEFAULT_RECIPIENT_NOTES
  );

  useEffect(() => {
    setGiftLists(readGiftLists());
    setSavedProductIds(readSavedProductIds());
    setRecipientNotes(readRecipientNotes());

    const handleListsChanged = (e: Event) => {
      const custom = e as CustomEvent<SavedGiftList[]>;
      setGiftLists(custom.detail ?? readGiftLists());
      setSavedProductIds(readSavedProductIds());
      setRecipientNotes(readRecipientNotes());
    };
    const handleSavedChanged = (e: Event) => {
      const custom = e as CustomEvent<string[]>;
      setSavedProductIds(custom.detail ?? readSavedProductIds());
      setGiftLists(readGiftLists());
    };
    const handleNotesChanged = (e: Event) => {
      const custom = e as CustomEvent<Record<string, string>>;
      setRecipientNotes(custom.detail ?? readRecipientNotes());
      setGiftLists(readGiftLists());
    };
    const handleStorage = () => {
      setGiftLists(readGiftLists());
      setSavedProductIds(readSavedProductIds());
      setRecipientNotes(readRecipientNotes());
    };

    window.addEventListener(LISTS_CHANGED_EVENT, handleListsChanged);
    window.addEventListener(SAVED_CHANGED_EVENT, handleSavedChanged);
    window.addEventListener(NOTES_CHANGED_EVENT, handleNotesChanged);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(LISTS_CHANGED_EVENT, handleListsChanged);
      window.removeEventListener(SAVED_CHANGED_EVENT, handleSavedChanged);
      window.removeEventListener(NOTES_CHANGED_EVENT, handleNotesChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const toggleSave = useCallback(
    (productId: string, preferredListId?: string) => {
      toggleSavedProductId(productId, preferredListId);
    },
    []
  );

  const updateNote = useCallback(
    (productId: string, note: string, listId?: string) => {
      writeRecipientNote(productId, note, listId);
    },
    []
  );

  const createList = useCallback(
    (input: { name: string; recipientLabel?: string; occasionLabel?: string }) =>
      createGiftList(input),
    []
  );

  const updateListMeta = useCallback(
    (
      listId: string,
      patch: { name?: string; recipientLabel?: string; occasionLabel?: string }
    ) => updateGiftListMeta(listId, patch),
    []
  );

  const removeList = useCallback((listId: string) => deleteGiftList(listId), []);

  const addProductToList = useCallback(
    (productId: string, listId: string, note?: string) =>
      saveProductToList(productId, listId, note),
    []
  );

  const removeItemFromList = useCallback(
    (productId: string, listId: string) =>
      removeProductFromList(productId, listId),
    []
  );

  const moveItemBetweenLists = useCallback(
    (productId: string, fromListId: string, toListId: string) =>
      moveProductBetweenLists(productId, fromListId, toListId),
    []
  );

  const toggleItemPurchased = useCallback(
    (productId: string, listId: string) =>
      toggleSavedItemPurchased(productId, listId),
    []
  );

  const clearAllLists = useCallback(() => clearAllSavedGifts(), []);

  return {
    giftLists,
    savedProductIds,
    recipientNotes,
    toggleSave,
    updateNote,
    toggleSaveProduct: toggleSave,
    updateRecipientNote: updateNote,
    createList,
    updateListMeta,
    removeList,
    addProductToList,
    removeItemFromList,
    moveItemBetweenLists,
    toggleItemPurchased,
    clearAllLists,
  };
}
