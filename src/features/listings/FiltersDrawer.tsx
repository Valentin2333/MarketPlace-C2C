import { useEffect } from 'react'
import styles from './FiltersDrawer.module.css'

export type SortOption = 'newest' | 'oldest' | 'price_asc' | 'price_desc'

export type PanelFilters = {
  categoryId: string
  city: string
  minPrice: string
  maxPrice: string
  sort: SortOption
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
]

type FiltersDrawerProps = {
  open: boolean
  draft: PanelFilters
  categories: { id: number; name: string }[]
  cities: string[]
  onChange: (next: Partial<PanelFilters>) => void
  onApply: () => void
  onClear: () => void
  onClose: () => void
}

export default function FiltersDrawer({
  open,
  draft,
  categories,
  cities,
  onChange,
  onApply,
  onClear,
  onClose,
}: FiltersDrawerProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <>
      <div
        className={`${styles.overlay} ${open ? styles.overlayOpen : ''}`}
        onClick={onClose}
      />

      <aside
        className={`${styles.drawer} ${open ? styles.drawerOpen : ''}`}
        aria-hidden={!open}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Filters</h2>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close filters"
          >
            ×
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.group}>
            <span className={styles.label}>Category</span>
            <div className={styles.chips}>
              <button
                type="button"
                className={`${styles.chip} ${draft.categoryId === '' ? styles.chipActive : ''}`}
                onClick={() => onChange({ categoryId: '' })}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`${styles.chip} ${draft.categoryId === String(c.id) ? styles.chipActive : ''}`}
                  onClick={() => onChange({ categoryId: String(c.id) })}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.group}>
            <span className={styles.label}>City</span>
            <div className={styles.chips}>
              <button
                type="button"
                className={`${styles.chip} ${draft.city === '' ? styles.chipActive : ''}`}
                onClick={() => onChange({ city: '' })}
              >
                All
              </button>
              {cities.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`${styles.chip} ${draft.city === c ? styles.chipActive : ''}`}
                  onClick={() => onChange({ city: c })}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.group}>
            <span className={styles.label}>Price range (€)</span>
            <div className={styles.priceRow}>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                className={styles.price}
                placeholder="Min"
                value={draft.minPrice}
                onChange={(e) => onChange({ minPrice: e.target.value })}
                aria-label="Minimum price"
              />
              <span className={styles.priceDash}>–</span>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                className={styles.price}
                placeholder="Max"
                value={draft.maxPrice}
                onChange={(e) => onChange({ maxPrice: e.target.value })}
                aria-label="Maximum price"
              />
            </div>
          </div>

          <div className={styles.group}>
            <span className={styles.label}>Sort by</span>
            <div className={styles.chips}>
              {SORT_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={`${styles.chip} ${draft.sort === o.value ? styles.chipActive : ''}`}
                  onClick={() => onChange({ sort: o.value })}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.clear} onClick={onClear}>
            Clear
          </button>
          <button type="button" className={styles.apply} onClick={onApply}>
            Apply
          </button>
        </div>
      </aside>
    </>
  )
}
