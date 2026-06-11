import type { MouseEvent } from 'react'
import { useFavorites } from './useFavorites'
import { useToast } from '../Toast/useToast'
import styles from './FavoriteButton.module.css'

type FavoriteButtonProps = {
  listingId: string
  variant?: 'card' | 'detail'
}

export default function FavoriteButton({ listingId, variant = 'card' }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite, isLoggedIn } = useFavorites()
  const toast = useToast()

  const active = isFavorite(listingId)

  const onClick = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isLoggedIn) {
      toast.info('Sign in to save favorites.')
      return
    }

    try {
      await toggleFavorite(listingId)
    } catch {
      toast.error('Could not update favorites.')
    }
  }

  return (
    <button
      type="button"
      className={`${styles.btn} ${styles[variant]} ${active ? styles.active : ''}`}
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? 'Remove from favorites' : 'Add to favorites'}
      title={active ? 'Remove from favorites' : 'Add to favorites'}
    >
      <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    </button>
  )
}
