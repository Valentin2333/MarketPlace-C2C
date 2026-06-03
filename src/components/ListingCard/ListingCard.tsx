import styles from './ListingCard.module.css'

type ListingCardProps = {
  title: string
  price: number | null
  city: string | null
  imageUrl: string | null
}

function formatPrice(price: number | null): string {
  if (price == null) return 'Price on request'
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(price)
}

export default function ListingCard({ title, price, city, imageUrl }: ListingCardProps) {
  return (
    <article className={styles.card}>
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
    </article>
  )
}
