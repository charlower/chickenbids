import Link from 'next/link';
import styles from '../how-it-works/page.module.css';

export default function TermsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.hudBar}>
        <div className={styles.title}>CHICKENBIDS // TERMS</div>

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
          <h1 className={styles.headline}>Rules of Engagement: Terms</h1>
          <p className={styles.lede}>
            These are the ground rules for playing ChickenBids. It&apos;s an
            experimental, high-speed auction game. When you lock a price,
            you&apos;re committing to buy, and a sale is only final once payment
            clears.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Participation</h2>
          <ul className={styles.list}>
            <li>
              You must be at least 18 years old and legally able to enter into a
              purchase agreement in your jurisdiction.
            </li>
            <li>
              You agree to provide accurate contact details so we can verify
              your account and fulfil any orders.
            </li>
            <li>
              We reserve the right to refuse, cancel, or reverse a drop in case
              of obvious error, abuse, or technical failure.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Locks & payments</h2>
          <ul className={styles.list}>
            <li>
              When you press LOCK IN, the current price is reserved for you for
              a short payment window.
            </li>
            <li>
              If payment is not completed within the stated time, your
              reservation is cancelled and the price may resume dropping.
            </li>
            <li>
              A sale is only final once payment has been successfully processed
              and we&apos;ve confirmed it.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Condition & Reseller Status</h2>
          <ul className={styles.list}>
            <li>
              <span className={styles.listItemLabel}>
                Not an authorized retailer.
              </span>{' '}
              ChickenBids is an independent reseller. We are not affiliated with
              Sony, Apple, or any other manufacturer.
            </li>
            <li>
              <span className={styles.listItemLabel}>
                &quot;Sealed&quot; items.
              </span>{' '}
              Items listed as &quot;Sealed&quot; are sourced from authorized
              Australian retailers and have never been opened. However, legally
              they are sold by us as &quot;second-hand&quot; goods.
            </li>
            <li>
              <span className={styles.listItemLabel}>Balance of warranty.</span>{' '}
              These items come with the original retailer receipt. You are
              entitled to the <em>balance</em>
              of the manufacturer&apos;s warranty from the original date of
              purchase by ChickenBids, not the date of your auction win.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Items sold as is</h2>
          <ul className={styles.list}>
            <li>
              <span className={styles.listItemLabel}>
                What you see is what you get.
              </span>{' '}
              All items are sold &quot;As Is.&quot; We inspect everything
              personally. If there is a scuff, a scratch, or a quirk, we will
              photograph it and write it in the description. Trust the photos,
              not your imagination.
            </li>
            <li>
              <span className={styles.listItemLabel}>
                The &quot;Sealed&quot; deal.
              </span>{' '}
              If an item is listed as &quot;Sealed,&quot; it means it is
              unopened stock straight from a retailer. It is pristine and
              &quot;As-New,&quot; but legally sold as second-hand because we
              bought it first. You get the fresh unboxing experience without the
              retail price, with original receipt provided.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Returns & Cancellations</h2>
          <ul className={styles.list}>
            <li>
              <span className={styles.listItemLabel}>No change of mind.</span>{' '}
              Due to the live, high-speed nature of our drops, all sales are
              final. We do not offer refunds, credits, or exchanges if you
              simply change your mind, find the item cheaper elsewhere, or
              decide you no longer want it.
            </li>
            <li>
              <span className={styles.listItemLabel}>Faulty items.</span> If an
              item arrives significantly different from its description or
              dead-on-arrival (DOA), you must notify us within 48 hours of
              delivery. We will arrange a repair, replacement, or refund in
              accordance with Australian Consumer Law.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Shipping & Risk</h2>
          <ul className={styles.list}>
            <li>
              <span className={styles.listItemLabel}>Carrier handover.</span> We
              ship via Australia Post. Ownership of the goods passes to you once
              full payment is received. Risk of loss or damage passes to you
              upon our delivery of the goods to the carrier.
            </li>
            <li>
              <span className={styles.listItemLabel}>
                Transit damage & loss.
              </span>{' '}
              While we pack every item securely, we are not the courier. If an
              item is lost or damaged in transit, our liability is limited to
              the compensation value provided by the carrier&apos;s insurance.
              We will manage the claim on your behalf, but we will not refund
              more than the carrier reimburses.
            </li>
            <li>
              <span className={styles.listItemLabel}>Authority to leave.</span>{' '}
              If you or the carrier select &quot;Authority to Leave&quot; (Safe
              Drop), we are not responsible for the package once it has been
              left at your premises.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Liability</h2>
          <ul className={styles.list}>
            <li>
              ChickenBids is provided &quot;as is&quot; without any guarantees
              of uptime or availability. We&apos;re not liable for indirect or
              consequential losses resulting from the use of the site.
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
