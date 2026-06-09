import { useState } from 'react'
import { Link } from 'react-router-dom'
import styles from './InfoPage.module.css'

type Faq = {
  question: string
  answer: string
}

const FAQS: Faq[] = [
  {
    question: 'How do I post a listing?',
    answer:
      'Click the "Sell" button in the top navigation. If you are not signed in yet, you will be asked to log in or create an account first. Then add a title, pick a category, set your price, write a short description and upload up to five photos. Hit "Publish listing" and it goes live straight away.',
  },
  {
    question: 'How do I edit or remove a listing I posted?',
    answer:
      'Open your own listing while signed in and you will see Edit and Delete buttons. Editing lets you change any detail or swap photos, and deleting removes the listing along with its images permanently.',
  },
  {
    question: 'How do I contact a seller?',
    answer:
      'Open any listing and you will find the seller linked at the bottom of the page. From their profile you can see their other items and reach out to arrange the details of the sale.',
  },
  {
    question: 'I forgot my password. What do I do?',
    answer:
      'On the login screen, click "Forgot password?" and enter your email. We will send you a secure link to set a new one. You can trigger the same email from the Security section of your profile.',
  },
  {
    question: 'How do I report a suspicious listing or user?',
    answer:
      'You can use the report button for both suspicious listing or user, and our admins will investigate further',
  },
]

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggle = (index: number) => {
    setOpenIndex((current) => (current === index ? null : index))
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link to="/" className={styles.back}>← Back to MarketPlace</Link>

        <div className={styles.header}>
          <h1 className={styles.title}>Frequently asked questions</h1>
          <p className={styles.lead}>
            Everything you need to know about buying and selling on MarketPlace.
          </p>
        </div>

        <div className={styles.faqList}>
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index
            return (
              <div key={faq.question} className={styles.faqItem}>
                <button
                  type="button"
                  className={styles.faqQuestion}
                  onClick={() => toggle(index)}
                  aria-expanded={isOpen}
                >
                  {faq.question}
                  <span className={`${styles.faqIcon} ${isOpen ? styles.faqIconOpen : ''}`}>
                    +
                  </span>
                </button>
                {isOpen && <p className={styles.faqAnswer}>{faq.answer}</p>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
