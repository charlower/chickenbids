import Link from 'next/link';
import styles from '../how-it-works/page.module.css';

export default function PrivacyPage() {
  return (
    <div className={styles.page}>
      <header className={styles.hudBar}>
        <div className={styles.title}>CHICKENBIDS // PRIVACY</div>

        <div className={styles.meta}>
          <Link href='/'>HOME</Link>
          <span>•</span>
          <Link href='/how-it-works'>HOW IT WORKS</Link>
          <span>•</span>
          <Link href='/terms'>TERMS</Link>
          <span>•</span>
          <Link href='/privacy'>PRIVACY</Link>
        </div>
      </header>

      <main className={styles.main}>
        <section>
          <h1 className={styles.headline}>Data Briefing: Privacy</h1>
          <p className={styles.lede}>
            We collect just enough data to keep the drops fair, stop bots, and
            verify winners. Your card details stay locked with Stripe. We use
            your email and phone to secure your identity, send payment links,
            and alert you when the next Drop goes live.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>What we collect</h2>
          <ul className={styles.list}>
            <li>
              <span className={styles.listItemLabel}>Contact details.</span>{' '}
              Your email and mobile number so we can verify you and send payment
              or order updates.
            </li>
            <li>
              <span className={styles.listItemLabel}>Basic usage data.</span>{' '}
              Logs of joins, locks, and wins so we can operate the game and
              block bots.
            </li>
            <li>
              <span className={styles.listItemLabel}>Anonymous Analytics.</span>{' '}
              We use standard tools to monitor site traffic and performance.
              This data is aggregated and anonymous; we use it to fix lag and
              optimize the engine.
            </li>
            <li>
              <span className={styles.listItemLabel}>Payment details.</span>{' '}
              Card details are handled by Stripe. We don&apos;t store or process
              your full card number on our servers.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>How we use it</h2>
          <ul className={styles.list}>
            <li>To verify real users and reduce bots and fake accounts.</li>
            <li>To contact you if you win an item or there&apos;s an issue.</li>
            <li>To understand how drops perform and improve the experience.</li>
            <li>To notify you when the next Drop goes live.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Data sharing</h2>
          <ul className={styles.list}>
            <li>We don&apos;t sell your personal data to third parties.</li>
            <li>
              We may use third-party services (like Stripe or analytics tools)
              that process limited data on our behalf.
            </li>
          </ul>
        </section>

        <p className={styles.backLink}>
          <Link href='/'>◀ Back to auction</Link>
        </p>
      </main>
    </div>
  );
}
