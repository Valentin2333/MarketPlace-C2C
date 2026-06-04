import { Link } from 'react-router-dom'
import { formatPrice } from '../../lib/format'
import styles from './ListingCard.module.css'

type ListingCardProps = {
  id: string
  title: string
  price: number | null
  city: string | null
  imageUrl: string | null
  onClick?: () => void
}

export default function ListingCard({ id, title, price, city, imageUrl, onClick }: ListingCardProps) {
  return (
    <Link to={`/listings/${id}`} className={styles.card} onClick={onClick}>
      <div className={styles.imageWrap}>
        {imageUrl ? (
          <img src={imageUrl} alt={title} loading="lazy" />
        ) : (
          <div className={styles.placeholder}>No image</div>
        )}
      </div>

      <div className={styles.body}>
        <h3 className={styles.title} title={title}>
          {title}
        </h3>
        <p className={styles.price}>{formatPrice(price)}</p>
        <p className={styles.location}>📍 {city || 'Location not specified'}</p>
      </div>
    </Link>
  )
}
