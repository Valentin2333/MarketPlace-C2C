import { Link } from 'react-router-dom'
import styles from './InfoPage.module.css'

export default function TermsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link to="/" className={styles.back}>← Back to MarketPlace</Link>

        <div className={styles.header}>
          <h1 className={styles.title}>Terms &amp; Conditions</h1>
          <p className={styles.lead}>
            The rules for using MarketPlace. By creating an account or using the
            platform, you agree to these terms.
          </p>
          <p className={styles.updated}>Last updated: 9 June 2026</p>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>1. Introduction</h2>
          <p className={styles.text}>
            These Terms &amp; Conditions govern your access to and use of
            MarketPlace (the "Platform"), a consumer-to-consumer listings service
            operated by [Company Name], registered in the Republic of Bulgaria
            with company number [UIC / EIK]. In these terms, "we", "us" and "our"
            refer to the operator of MarketPlace, and "you" refers to any person
            who accesses or uses the Platform.
          </p>
          <p className={styles.text}>
            If you do not agree with any part of these terms, please do not use
            the Platform.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>2. Eligibility</h2>
          <p className={styles.text}>
            You must be at least 18 years old and able to enter into a legally
            binding contract to use MarketPlace. By using the Platform you confirm
            that you meet these requirements and that the information you provide
            about yourself is accurate.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>3. Your account</h2>
          <p className={styles.text}>
            You are responsible for keeping your login details confidential and
            for all activity that takes place under your account. Notify us
            immediately if you believe your account has been accessed without your
            permission. You may close your account at any time from your profile.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>4. Listings and content</h2>
          <p className={styles.text}>
            When you post a listing you are responsible for the accuracy of its
            title, description, price, photos and any other information. Listings
            must describe a real item that you own and are entitled to sell, and
            must comply with all applicable laws of the Republic of Bulgaria and
            the European Union.
          </p>
          <p className={styles.text}>You must not post listings that:</p>
          <ul className={styles.list}>
            <li className={styles.listItem}>
              offer illegal, stolen, counterfeit or unsafe goods;
            </li>
            <li className={styles.listItem}>
              relate to weapons, drugs, tobacco, alcohol or other restricted or
              age-controlled products;
            </li>
            <li className={styles.listItem}>
              contain misleading, fraudulent or spam content;
            </li>
            <li className={styles.listItem}>
              infringe the intellectual property or privacy rights of others; or
            </li>
            <li className={styles.listItem}>
              are offensive, discriminatory or otherwise unlawful.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>5. The role of MarketPlace</h2>
          <p className={styles.text}>
            MarketPlace is a venue that allows private individuals to advertise
            and discover items. We are not a party to any agreement between a
            buyer and a seller, we do not take ownership of any item, and we do
            not process payments or handle delivery. Any transaction is concluded
            solely between the buyer and the seller, who are responsible for
            agreeing the terms of the sale, payment and hand-over.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>6. Fees</h2>
          <p className={styles.text}>
            Browsing, registering and posting listings on MarketPlace are
            currently free of charge. If we introduce paid features in the future,
            we will make the applicable fees clear before you choose to use them.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>7. Licence to your content</h2>
          <p className={styles.text}>
            You retain ownership of the content you upload. By posting a listing
            you grant us a non-exclusive, royalty-free licence to host, store,
            display and reproduce that content for the purpose of operating and
            promoting the Platform. This licence ends when you delete the relevant
            content, except where it must be retained to comply with the law.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>8. Acceptable use</h2>
          <p className={styles.text}>
            You agree not to misuse the Platform, including by attempting to
            access it through unauthorised means, interfering with its normal
            operation, scraping data, or using it to harass other users or to send
            unsolicited communications.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>9. Disclaimers</h2>
          <p className={styles.text}>
            The Platform is provided on an "as is" and "as available" basis. We do
            not guarantee that listings are accurate, that items are as described,
            or that the Platform will be uninterrupted or error-free. We do not
            verify the identity of users and cannot guarantee the conduct of any
            buyer or seller.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>10. Limitation of liability</h2>
          <p className={styles.text}>
            To the fullest extent permitted by Bulgarian law, we will not be liable
            for any loss or damage arising from transactions between users, from
            the conduct of any user, or from your inability to use the Platform.
            Nothing in these terms limits any liability that cannot be excluded
            under applicable law.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>11. Suspension and termination</h2>
          <p className={styles.text}>
            We may suspend or remove listings, or suspend or terminate accounts,
            where we reasonably believe these terms or the law have been breached,
            or to protect the safety of our users.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>12. Changes to these terms</h2>
          <p className={styles.text}>
            We may update these terms from time to time. When we do, we will revise
            the "Last updated" date above. Significant changes will be brought to
            your attention where appropriate. Continuing to use the Platform after
            changes take effect means you accept the updated terms.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>13. Governing law and disputes</h2>
          <p className={styles.text}>
            These terms are governed by the laws of the Republic of Bulgaria. Any
            disputes that cannot be resolved amicably will be subject to the
            jurisdiction of the competent Bulgarian courts. If you are a consumer,
            you may also have the right to use the European Commission’s online
            dispute resolution platform.
          </p>
        </section>
      </div>
    </div>
  )
}
