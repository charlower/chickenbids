import Link from 'next/link';
import styles from './page.module.css';

export default function HowItWorksPage() {
  return (
    <div className={styles.page}>
      <header className={styles.hudBar}>
        <div className={styles.title}>CHICKENBIDS // HOW IT WORKS</div>

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
          <h1 className={styles.headline}>Mission Briefing: How IT Works</h1>
          <p className={styles.lede}>
            ChickenBids is a live, descending-price auction. The clock is your
            enemy, and hesitation is how you lose. The price goes down until
            someone locks it in, then they get one minute to pull the trigger
            and pay.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Overview</h2>
          <ul className={styles.list}>
            <li>
              <span className={styles.listItemLabel}>
                1. Price starts high.
              </span>{' '}
              Each drop begins above normal retail so there&apos;s room to fall.
            </li>
            <li>
              <span className={styles.listItemLabel}>2. Price ticks down.</span>{' '}
              The amount and speed of the drop are shown on-screen.
            </li>
            <li>
              <span className={styles.listItemLabel}>3. You lock in.</span> When
              you hit LOCK IN the current price is reserved just for you.
            </li>
            <li>
              <span className={styles.listItemLabel}>
                4. One-minute window.
              </span>{' '}
              You receive a secure payment link. You have 60 seconds to pay.
            </li>
            <li>
              <span className={styles.listItemLabel}>
                5. If you don&apos;t pay.
              </span>{' '}
              The lock expires and the auction resumes from where it stopped.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Accounts & verification</h2>
          <ul className={styles.list}>
            <li>
              <span className={styles.listItemLabel}>Email + phone.</span> You
              need an email to register. Phone helps us organise delivery - but
              it&apos;s optional. We can communicate through email if you
              prefer.
            </li>
            <li>
              <span className={styles.listItemLabel}>Secure payment.</span>{' '}
              Payment is processed securly with Stripe. We do not store any of
              your card details. We currently support all major cards.
            </li>
            <li>
              <span className={styles.listItemLabel}>
                One winner at a time.
              </span>{' '}
              While a lock is pending payment, no other buyers can take that
              item.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>FAQ</h2>
          <ul className={styles.faqList}>
            <li>
              <div className={styles.faqQ}>
                What happens if someone doesn&apos;t pay in time?
              </div>
              <div>
                Users have 60 seconds to pay. If they don&apos;t, their
                reservation is cancelled and the price starts dropping again
                from where it paused. The item isn&apos;t sold until a payment
                succeeds.
              </div>
            </li>
            <li>
              <div className={styles.faqQ}>
                Is this a lottery or pay-to-bid?
              </div>
              <div>
                No. Watching and entering drops is free. You only pay if you
                successfully lock in a price and complete checkout.
              </div>
            </li>
            <li>
              <div className={styles.faqQ}>How is payment processed?</div>
              <div>
                All card payments are handled securely by Stripe. ChickenBids
                never sees your full card details. We use your email and phone
                to verify you and send payment links.
              </div>
            </li>
            <li>
              <div className={styles.faqQ}>How do I know if I won an item?</div>
              <div>
                The app will notifiy you that you have won an auction. Upon
                winning an item, you will receive a confirmation email. Delivery
                details will be provided via email or phone.
              </div>
            </li>
            <li>
              <div className={styles.faqQ}>What about shipping?</div>
              <div>
                Shipping is included in the final price of the item and handled
                by Australia Post. We will get your shipping address from you
                upon winning the auction. Items are dispatched within 24 hours
                of payment being received with tracking provided.
              </div>
            </li>
            <li>
              <div className={styles.faqQ}>Are the items new?</div>
              <div>
                <p>
                  Most of our &quot;Sealed&quot; items are brand new stock
                  sourced from major Australian retailers. However, because we
                  are an independent reseller (not a factory partner), we
                  legally sell them as &quot;Second-Hand / Sealed.&quot; This
                  means you get the fresh unboxing experience and the factory
                  seal is intact, but you are technically the second owner.
                </p>
              </div>
            </li>

            <li>
              <div className={styles.faqQ}>
                What&apos;s the deal with used items?
              </div>
              <div>
                <p>
                  If an item isn&apos;t marked &quot;Sealed,&quot; it is sold
                  &quot;As Is.&quot; We inspect everything personally. If
                  there&apos;s a scratch, a dent, or a quirk, we photograph it
                  and put it in the Drop Description.{' '}
                  <strong>Trust the Intel:</strong> Don&apos;t rely on generic
                  specs from the manufacturer&apos;s website. If our listing
                  says it&apos;s missing a cable, it&apos;s missing a cable.
                  What you see in the Drop is exactly what you get.
                </p>
              </div>
            </li>

            <li>
              <div className={styles.faqQ}>What about warranties?</div>
              <div>
                <p>
                  <strong>For Sealed Items:</strong> You get the balance of the
                  Manufacturer&apos;s Warranty. We provide the original retailer
                  receipt so you can claim directly with Sony, Apple, etc.
                </p>
                <p style={{ marginTop: '8px' }}>
                  <strong>For Used Items:</strong> These come with statutory
                  guarantees under Australian Consumer Law (they will work as
                  described), but we do not offer extra warranties for
                  age-related wear or cosmetic damage that was disclosed in the
                  listing.
                </p>
              </div>
            </li>
            <li>
              <div className={styles.faqQ}>What countries can participate?</div>
              <div>
                We are currently only open to Australian users. We will expand
                to other countries in the future.
              </div>
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
