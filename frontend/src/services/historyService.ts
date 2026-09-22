import { SearchHistoryItem } from '../types';
import { api } from './api';

const STORAGE_KEY = 'smartsearch_history_v2';
const LEGACY_STORAGE_KEY = 'smartsearch_history';

class HistoryService {
  /**
   * Retrieves all search history items, migrating legacy items if necessary.
   */
  getHistory(): SearchHistoryItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: SearchHistoryItem[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }

      // Check legacy array of strings migration
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        const legacyList: string[] = JSON.parse(legacy);
        if (Array.isArray(legacyList) && legacyList.length > 0) {
          const now = Date.now();
          const migrated: SearchHistoryItem[] = legacyList.map((q, idx) => ({
            id: `legacy-${idx}-${Date.now()}`,
            query: q,
            mode: 'hybrid',
            timestamp: now - idx * 60000,
            createdAtIso: new Date(now - idx * 60000).toISOString(),
          }));
          this.persist(migrated);
          return migrated;
        }
      }
    } catch (e) {
      console.error('Failed to load search history', e);
    }
    return [];
  }

  /**
   * Add a new search to the history log.
   */
  addHistory(query: string, mode: string = 'hybrid', resultsCount?: number): SearchHistoryItem | null {
    const clean = query.trim();
    if (!clean) return null;

    const current = this.getHistory();
    // Filter out existing exact matches (case-insensitive) so this entry moves to the top
    const filtered = current.filter((item) => item.query.toLowerCase() !== clean.toLowerCase());

    const newItem: SearchHistoryItem = {
      id: `sh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      query: clean,
      mode,
      resultsCount,
      timestamp: Date.now(),
      createdAtIso: new Date().toISOString(),
    };

    const updated = [newItem, ...filtered].slice(0, 100);
    this.persist(updated);
    return newItem;
  }

  /**
   * Remove a single history item by ID or Query text.
   */
  removeHistoryItem(idOrQuery: string): void {
    const current = this.getHistory();
    const updated = current.filter(
      (item) => item.id !== idOrQuery && item.query.toLowerCase() !== idOrQuery.toLowerCase()
    );
    this.persist(updated);

    // If ID looks like backend ID or is not local-only, try deleting from backend
    if (!idOrQuery.startsWith('sh-') && !idOrQuery.startsWith('legacy-')) {
      api.deleteHistoryItem?.(idOrQuery).catch(() => {});
    }
  }

  /**
   * Clear all search history entries.
   */
  clearAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      window.dispatchEvent(new Event('smartsearch_history_updated'));
      api.clearHistory?.().catch(() => {});
    } catch (e) {
      console.error('Failed to clear search history', e);
    }
  }

  /**
   * Persist history to localStorage and fire custom event for real-time reactivity.
   */
  private persist(items: SearchHistoryItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      // Keep legacy string array in sync for quick lookups
      const simpleStrings = items.map((i) => i.query).slice(0, 15);
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(simpleStrings));
      window.dispatchEvent(new Event('smartsearch_history_updated'));
    } catch (e) {
      console.error('Failed to persist search history', e);
    }
  }

  /**
   * Format timestamp into a pleasant, humanized label.
   */
  formatTimestamp(timestamp: number): string {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 30) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay === 1) return 'Yesterday';
    if (diffDay < 7) return `${diffDay}d ago`;

    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  }

  /**
   * Group items by chronological periods (Today, Yesterday, Last 7 Days, Older).
   */
  groupByPeriod(items: SearchHistoryItem[]): { label: string; items: SearchHistoryItem[] }[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const groups: { [key: string]: SearchHistoryItem[] } = {
      Today: [],
      Yesterday: [],
      'Earlier this week': [],
      Older: [],
    };

    items.forEach((item) => {
      const itemDate = new Date(item.timestamp);
      if (itemDate >= today) {
        groups.Today.push(item);
      } else if (itemDate >= yesterday) {
        groups.Yesterday.push(item);
      } else if (itemDate >= lastWeek) {
        groups['Earlier this week'].push(item);
      } else {
        groups.Older.push(item);
      }
    });

    return Object.entries(groups)
      .filter(([_, list]) => list.length > 0)
      .map(([label, list]) => ({ label, items: list }));
  }
}

export const historyService = new HistoryService();
