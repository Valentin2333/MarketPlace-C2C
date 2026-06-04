import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigationType, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import ListingCard from '../../components/ListingCard/ListingCard'
import FiltersDrawer from './FiltersDrawer'
import type { PanelFilters, SortOption } from './FiltersDrawer'
import styles from './ListingsPage.module.css'

type ListingRow = {
  id: string
  title: string
  price: number | null
  city: string | null
  listing_images: { url: string }[] | null
}

type CacheEntry = {
  listings: ListingRow[]
  total: number | null
  hasMore: boolean
  scrollY: number
}

const PAGE_SIZE = 10

const DEFAULT_PANEL: PanelFilters = {
  categoryId: '',
  city: '',
  minPrice: '',
  maxPrice: '',
  sort: 'newest',
}

const listCache = new Map<string, CacheEntry>()
let facetsCache: { categories: { id: number; name: string }[]; cities: string[] } | null = null

if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

function parsePanel(params: URLSearchParams): PanelFilters {
  const sort = params.get('sort')
  const validSort: SortOption =
    sort === 'oldest' || sort === 'price_asc' || sort === 'price_desc' ? sort : 'newest'
  return {
    categoryId: params.get('category') ?? '',
    city: params.get('city') ?? '',
    minPrice: params.get('min') ?? '',
    maxPrice: params.get('max') ?? '',
    sort: validSort,
  }
}

function buildParams(search: string, f: PanelFilters): Record<string, string> {
  const p: Record<string, string> = {}
  const q = search.trim()
  if (q) p.q = q
  if (f.categoryId) p.category = f.categoryId
  if (f.city) p.city = f.city
  if (f.minPrice) p.min = f.minPrice
  if (f.maxPrice) p.max = f.maxPrice
  if (f.sort !== 'newest') p.sort = f.sort
  return p
}

function keyOf(search: string, f: PanelFilters): string {
  return new URLSearchParams(buildParams(search, f)).toString()
}

async function fetchPage(search: string, f: PanelFilters, from: number) {
  const keyword = search.trim().replace(/[%,()]/g, ' ').trim()
  const min = parseFloat(f.minPrice)
  const max = parseFloat(f.maxPrice)

  const base =
    from === 0
      ? supabase
          .from('listings')
          .select('id, title, price, city, listing_images ( url )', { count: 'exact' })
      : supabase.from('listings').select('id, title, price, city, listing_images ( url )')

  let query = base.eq('status', 'active')

  if (keyword) {
    query = query.or(`title.ilike.%${keyword}%,description.ilike.%${keyword}%`)
  }
  if (f.categoryId) query = query.eq('category_id', Number(f.categoryId))
  if (f.city) query = query.eq('city', f.city)
  if (!Number.isNaN(min)) query = query.gte('price', min)
  if (!Number.isNaN(max)) query = query.lte('price', max)

  const ordered =
    f.sort === 'oldest'
      ? query.order('created_at', { ascending: true })
      : f.sort === 'price_asc'
        ? query.order('price', { ascending: true, nullsFirst: false })
        : f.sort === 'price_desc'
          ? query.order('price', { ascending: false, nullsFirst: false })
          : query.order('created_at', { ascending: false })

  const { data, count, error } = await ordered.range(from, from + PAGE_SIZE - 1)
  if (error) throw new Error(error.message)
  return { rows: (data ?? []) as ListingRow[], count: count ?? null }
}

export default function ListingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navType = useNavigationType()

  const initialSearch = searchParams.get('q') ?? ''
  const initialPanel = parsePanel(searchParams)
  const initialCache = listCache.get(keyOf(initialSearch, initialPanel))

  const [search, setSearch] = useState(initialSearch)
  const [applied, setApplied] = useState<PanelFilters>(initialPanel)
  const [draft, setDraft] = useState<PanelFilters>(initialPanel)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [categories, setCategories] = useState<{ id: number; name: string }[]>(
    facetsCache?.categories ?? [],
  )
  const [cities, setCities] = useState<string[]>(facetsCache?.cities ?? [])
  const [listings, setListings] = useState<ListingRow[]>(initialCache?.listings ?? [])
  const [total, setTotal] = useState<number | null>(initialCache?.total ?? null)
  const [hasMore, setHasMore] = useState<boolean>(initialCache?.hasMore ?? false)
  const [loading, setLoading] = useState(!initialCache)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const didRestore = useRef(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const listingsRef = useRef(listings)
  const hasMoreRef = useRef(hasMore)
  const loadingRef = useRef(loading)
  const loadingMoreRef = useRef(false)
  const searchRef = useRef(search)
  const appliedRef = useRef(applied)

  useEffect(() => {
    listingsRef.current = listings
    hasMoreRef.current = hasMore
    loadingRef.current = loading
    searchRef.current = search
    appliedRef.current = applied
  })

  useEffect(() => {
    setSearchParams(buildParams(search, applied), { replace: true })
  }, [search, applied, setSearchParams])

  useEffect(() => {
    if (facetsCache) return
    const loadFacets = async () => {
      const { data: cats } = await supabase
        .from('categories')
        .select('id, name')
        .order('name')
      const categoriesData = (cats ?? []) as { id: number; name: string }[]

      const { data: cityRows } = await supabase
        .from('listings')
        .select('city')
        .eq('status', 'active')
      const citiesData = Array.from(
        new Set(
          ((cityRows ?? []) as { city: string | null }[])
            .map((r) => r.city)
            .filter((c): c is string => !!c),
        ),
      ).sort()

      facetsCache = { categories: categoriesData, cities: citiesData }
      setCategories(categoriesData)
      setCities(citiesData)
    }
    loadFacets()
  }, [])

  useEffect(() => {
    let active = true
    const key = keyOf(search, applied)
    const cached = listCache.get(key)
    const delay = cached ? 0 : 300

    const timer = setTimeout(async () => {
      if (cached) {
        if (!active) return
        setListings(cached.listings)
        setTotal(cached.total)
        setHasMore(cached.hasMore)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      try {
        const { rows, count } = await fetchPage(search, applied, 0)
        if (!active) return
        const more = rows.length === PAGE_SIZE
        setListings(rows)
        setTotal(count)
        setHasMore(more)
        listCache.set(key, {
          listings: rows,
          total: count,
          hasMore: more,
          scrollY: listCache.get(key)?.scrollY ?? 0,
        })
      } catch (e) {
        if (!active) return
        setError(e instanceof Error ? e.message : 'Failed to load listings')
        setListings([])
      } finally {
        if (active) setLoading(false)
      }
    }, delay)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [search, applied])

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || loadingRef.current || !hasMoreRef.current) return
    loadingMoreRef.current = true
    setLoadingMore(true)

    const s = searchRef.current
    const a = appliedRef.current
    const from = listingsRef.current.length

    try {
      const { rows, count } = await fetchPage(s, a, from)
      const next = [...listingsRef.current, ...rows]
      const more = rows.length === PAGE_SIZE
      setListings(next)
      setHasMore(more)
      if (count != null) setTotal(count)

      const key = keyOf(s, a)
      const prev = listCache.get(key)
      listCache.set(key, {
        listings: next,
        total: count ?? prev?.total ?? null,
        hasMore: more,
        scrollY: prev?.scrollY ?? window.scrollY,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load more')
    } finally {
      loadingMoreRef.current = false
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { rootMargin: '300px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore, hasMore])

  useLayoutEffect(() => {
    if (didRestore.current) return
    if (navType !== 'POP') {
      didRestore.current = true
      return
    }
    if (loading) return
    const entry = listCache.get(keyOf(search, applied))
    window.scrollTo({ top: entry?.scrollY ?? 0, left: 0, behavior: 'instant' as ScrollBehavior })
    didRestore.current = true
  }, [loading, navType, search, applied])

  const saveScroll = useCallback(() => {
    const key = keyOf(search, applied)
    const entry = listCache.get(key)
    if (entry) listCache.set(key, { ...entry, scrollY: window.scrollY })
  }, [search, applied])

  const openDrawer = useCallback(() => {
    setDraft(applied)
    setDrawerOpen(true)
  }, [applied])

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  const updateDraft = useCallback(
    (next: Partial<PanelFilters>) => setDraft((prev) => ({ ...prev, ...next })),
    [],
  )

  const applyFilters = useCallback(() => {
    setApplied(draft)
    setDrawerOpen(false)
  }, [draft])

  const clearFilters = useCallback(() => {
    setDraft(DEFAULT_PANEL)
    setApplied(DEFAULT_PANEL)
  }, [])

  const activeCount =
    (applied.categoryId ? 1 : 0) +
    (applied.city ? 1 : 0) +
    (applied.minPrice ? 1 : 0) +
    (applied.maxPrice ? 1 : 0) +
    (applied.sort !== 'newest' ? 1 : 0)

  const count = total ?? listings.length

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.heading}>Listings</h1>

        <div className={styles.toolbar}>
          <input
            type="search"
            className={styles.search}
            placeholder="Search listings…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="button" className={styles.filterBtn} onClick={openDrawer}>
            Filters{activeCount > 0 ? ` (${activeCount})` : ''}
          </button>
        </div>

        {loading ? (
          <div className={styles.state}>Loading listings…</div>
        ) : error ? (
          <div className={styles.stateError}>{error}</div>
        ) : listings.length === 0 ? (
          <div className={styles.state}>No listings found.</div>
        ) : (
          <>
            <p className={styles.resultsInfo}>
              {count} {count === 1 ? 'listing' : 'listings'}
            </p>
            <div className={styles.grid}>
              {listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  id={listing.id}
                  title={listing.title}
                  price={listing.price}
                  city={listing.city}
                  imageUrl={listing.listing_images?.[0]?.url ?? null}
                  onClick={saveScroll}
                />
              ))}
            </div>
            {hasMore && <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />}
            {loadingMore && <div className={styles.loadingMore}>Loading more…</div>}
          </>
        )}
      </div>

      <FiltersDrawer
        open={drawerOpen}
        draft={draft}
        categories={categories}
        cities={cities}
        onChange={updateDraft}
        onApply={applyFilters}
        onClear={clearFilters}
        onClose={closeDrawer}
      />
    </div>
  )
}
