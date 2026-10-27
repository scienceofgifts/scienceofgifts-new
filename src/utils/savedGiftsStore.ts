import { useCallback, useEffect, useState } from 'react';
import { Product } from '../types/content';

const SAVED_GIFTS_STORAGE_KEY = 'sog_saved_gifts_v2';
const RECIPIENT_NOTES_STORAGE_KEY = 'sog_recipient_notes_v2';

const DEFAULT_SAVED_IDS = [
  'prod_fluted_bedside_carafe_09',
  'prod_chili_honey_flight_01',
];

const DEFAULT_RECIPIENT_NOTES: Record<string, string> = {
  prod_fluted_bedside_carafe_09: 'For Elena — Guest bedroom housewarming',
  prod_chili_honey_flight_01: 'For Claire & Dan — Saturday dinner party',
};

const SAVED_CHANGED_EVENT = 'sog:saved-gifts-changed';
const NOTES_CHANGED_EVENT = 'sog:recipient-notes-changed';
export const OPEN_PRODUCT_MODAL_EVENT = 'sog:open-product-modal';
export const OPEN_SAVED_DRAWER_EVENT = 'sog:open-saved-drawer';
export const OPEN_ARCH_MODAL_EVENT = 'sog:open-arch-modal';

export function readSavedProductIds(): string[] {
  if (typeof window === 'undefined') {
    return DEFAULT_SAVED_IDS;
  }
  try {
    const raw = window.localStorage.getItem(SAVED_GIFTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return Array.from(
          new Set(parsed.filter((id): id is string => typeof id === 'string'))
        );
      }
    }
    return DEFAULT_SAVED_IDS;
  } catch {
    return DEFAULT_SAVED_IDS;
  }
}

export function writeSavedProductIds(ids: string[]): string[] {
  const deduped = Array.from(new Set(ids));
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(
        SAVED_GIFTS_STORAGE_KEY,
        JSON.stringify(deduped)
      );
    } catch {
      // Ignore storage errors
    }
    window.dispatchEvent(
      new CustomEvent<string[]>(SAVED_CHANGED_EVENT, { detail: deduped })
    );
  }
  return deduped;
}

export function toggleSavedProductId(productId: string): string[] {
  const current = readSavedProductIds();
  const next = current.includes(productId)
    ? current.filter((id) => id !== productId)
    : [...current, productId];
  return writeSavedProductIds(next);
}

export function readRecipientNotes(): Record<string, string> {
  if (typeof window === 'undefined') {
    return DEFAULT_RECIPIENT_NOTES;
  }
  try {
    const raw = window.localStorage.getItem(RECIPIENT_NOTES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_RECIPIENT_NOTES;
  } catch {
    return DEFAULT_RECIPIENT_NOTES;
  }
}

export function writeRecipientNote(
  productId: string,
  note: string
): Record<string, string> {
  const current = readRecipientNotes();
  const next = { ...current, [productId]: note };
  if (typeof window !== 'undefined') {
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
  }
  return next;
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
 * React hook for islands that read/toggle saved products and stay synchronized
 * across multiple islands on the same Astro page.
 */
export function useSavedGiftsState() {
  const [savedProductIds, setSavedProductIds] =
    useState<string[]>(DEFAULT_SAVED_IDS);
  const [recipientNotes, setRecipientNotes] = useState<Record<string, string>>(
    DEFAULT_RECIPIENT_NOTES
  );

  useEffect(() => {
    setSavedProductIds(readSavedProductIds());
    setRecipientNotes(readRecipientNotes());

    const handleSavedChanged = (e: Event) => {
      const custom = e as CustomEvent<string[]>;
      setSavedProductIds(custom.detail ?? readSavedProductIds());
    };
    const handleNotesChanged = (e: Event) => {
      const custom = e as CustomEvent<Record<string, string>>;
      setRecipientNotes(custom.detail ?? readRecipientNotes());
    };
    const handleStorage = () => {
      setSavedProductIds(readSavedProductIds());
      setRecipientNotes(readRecipientNotes());
    };

    window.addEventListener(SAVED_CHANGED_EVENT, handleSavedChanged);
    window.addEventListener(NOTES_CHANGED_EVENT, handleNotesChanged);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(SAVED_CHANGED_EVENT, handleSavedChanged);
      window.removeEventListener(NOTES_CHANGED_EVENT, handleNotesChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const toggleSave = useCallback((productId: string) => {
    toggleSavedProductId(productId);
  }, []);

  const updateNote = useCallback((productId: string, note: string) => {
    writeRecipientNote(productId, note);
  }, []);

  return {
    savedProductIds,
    recipientNotes,
    toggleSave,
    updateNote,
    toggleSaveProduct: toggleSave,
    updateRecipientNote: updateNote,
  };
}
