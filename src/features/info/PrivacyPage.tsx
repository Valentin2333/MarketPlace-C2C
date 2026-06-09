import { Link } from 'react-router-dom'
import styles from './InfoPage.module.css'

export default function PrivacyPage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link to="/" className={styles.back}>← Back to MarketPlace</Link>

        <div className={styles.header}>
          <h1 className={styles.title}>Privacy Policy</h1>
          <p className={styles.lead}>
            How MarketPlace collects, uses and protects your personal data, in
            line with the EU General Data Protection Regulation (GDPR).
          </p>
          <p className={styles.updated}>Last updated: 9 June 2026</p>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>1. Who we are</h2>
          <p className={styles.text}>
            MarketPlace is operated by [Company Name], registered in the Republic
            of Bulgaria with company number [UIC / EIK] and registered address
            [Company address, Bulgaria]. For the purposes of the GDPR, we are the
            data controller responsible for your personal data. You can reach us
            at support@marketplace.bg.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>2. Information we collect</h2>
          <p className={styles.text}>We collect the following categories of data:</p>
          <ul className={styles.list}>
            <li className={styles.listItem}>
              <strong>Account data</strong> — your name, email address and the
              password you set when registering.
            </li>
            <li className={styles.listItem}>
              <strong>Profile data</strong> — optional details such as your city
              and profile picture.
            </li>
            <li className={styles.listItem}>
              <strong>Listing data</strong> — the titles, descriptions, prices,
              locations and photos you publish.
            </li>
            <li className={styles.listItem}>
              <strong>Technical data</strong> — limited information generated as
              you use the Platform, such as your approximate location and basic
              device or browser information.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>3. How we use your data</h2>
          <p className={styles.text}>We use your personal data to:</p>
          <ul className={styles.list}>
            <li className={styles.listItem}>create and manage your account;</li>
            <li className={styles.listItem}>
              publish your listings and make them searchable by other users;
            </li>
            <li className={styles.listItem}>
              allow buyers and sellers to connect with one another;
            </li>
            <li className={styles.listItem}>
              keep the Platform secure and prevent fraud and abuse; and
            </li>
            <li className={styles.listItem}>
              respond to your enquiries and comply with our legal obligations.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>4. Legal bases for processing</h2>
          <p className={styles.text}>
            We process your data on the basis of the performance of our contract
            with you (providing the Platform), our legitimate interests (keeping
            the service safe and functional), your consent (where we ask for it,
            such as for an optional profile photo), and compliance with our legal
            obligations.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>5. Sharing your data</h2>
          <p className={styles.text}>
            Some of your data is visible to other users by design — for example
            your name, city, profile picture and the listings you publish. We also
            share data with trusted service providers who process it on our behalf,
            including our hosting and database provider (Supabase). We may disclose
            data where required by law or to protect our users. We do not sell your
            personal data.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>6. Storage, security and retention</h2>
          <p className={styles.text}>
            Your data is stored using our infrastructure provider on servers that
            may be located within the European Union. We apply appropriate
            technical and organisational measures to protect it. We keep your data
            for as long as your account is active, and delete or anonymise it when
            it is no longer needed, unless we are required to retain it by law.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>7. Your rights</h2>
          <p className={styles.text}>
            Under the GDPR you have the right to access your data, to have it
            corrected or erased, to restrict or object to its processing, to
            receive it in a portable format, and to withdraw any consent you have
            given. To exercise these rights, contact us at support@marketplace.bg.
          </p>
          <p className={styles.text}>
            You also have the right to lodge a complaint with the Bulgarian
            supervisory authority, the Commission for Personal Data Protection
            (Комисия за защита на личните данни), if you believe your data has been
            handled improperly.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>8. Cookies and local storage</h2>
          <p className={styles.text}>
            We use cookies and similar browser storage that are necessary to keep
            you signed in and to remember your preferences. We do not use these
            technologies for advertising.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>9. Children’s privacy</h2>
          <p className={styles.text}>
            MarketPlace is not intended for anyone under 18, and we do not
            knowingly collect data from minors. If you believe a minor has provided
            us with personal data, please contact us so we can remove it.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>10. Changes to this policy</h2>
          <p className={styles.text}>
            We may update this policy from time to time. When we do, we will revise
            the "Last updated" date above and, where appropriate, let you know of
            significant changes.
          </p>
        </section>
      </div>
    </div>
  )
}
