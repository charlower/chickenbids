'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import LootIntelModal from '../components/LootIntelModal';
import styles from './page.module.css';

const formatCountdown = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const formatDropTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

type AuctionData = {
  id: string;
  status: string;
  start_at: string;
  start_price: number;
  floor_price: number;
  product_id: string;
  products: {
    name: string;
    variant: string | null;
    condition: string;
    description: string | null;
    contents: string[];
    shipping_time: string;
    shipping_method: string;
    returns_policy: string;
  };
};

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [auction, setAuction] = useState<AuctionData | null>(null);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [lootModalOpen, setLootModalOpen] = useState(false);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch auction data
  useEffect(() => {
    const fetchAuction = async () => {
      const { data } = await supabase
        .from('auctions')
        .select('*, products(*)')
        .in('status', ['scheduled', 'live'])
        .order('start_at', { ascending: true })
        .limit(1)
        .single();

      if (data) {
        setAuction(data);

        // Fetch product images
        const { data: images } = await supabase
          .from('product_images')
          .select('url')
          .eq('product_id', data.product_id)
          .order('position', { ascending: true });

        if (images) {
          setProductImages(images.map((img) => img.url));
        }
      }
    };

    fetchAuction();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }

    setIsSubmitting(true);

    // TODO: Save to database
    // For now, just simulate success
    await new Promise((r) => setTimeout(r, 500));

    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  const auctionStartTime = auction?.start_at
    ? new Date(auction.start_at).getTime()
    : null;
  const countdownMs = auctionStartTime
    ? Math.max(auctionStartTime - now, 0)
    : 0;
  const isLive = auction?.status === 'live';

  const lootData = auction?.products
    ? {
        name: auction.products.name,
        variant: auction.products.variant || '',
        condition: auction.products.condition,
        description: auction.products.description || '',
        images:
          productImages.length > 0
            ? productImages
            : ['/assets/img/chickenbids-logo.png'],
        contents: auction.products.contents || [],
        dropTime: auctionStartTime ? formatDropTime(auctionStartTime) : 'TBA',
        startPrice: auction.start_price,
        floorPrice: auction.floor_price,
        shippingTime: auction.products.shipping_time,
        shippingMethod: auction.products.shipping_method,
        returnsPolicy: auction.products.returns_policy,
      }
    : null;

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.hudBar}>
        <div className={styles.title}>CHICKENBIDS</div>
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

      {/* Hero */}
      <div className={styles.hero}>
        {/* Product Image */}
        <div className={styles.productImageWrapper}>
          {productImages[0] ? (
            <Image
              src={productImages[0]}
              alt={auction?.products?.name || 'Auction Item'}
              fill
              className={styles.productImage}
              priority
            />
          ) : (
            <div className={styles.productPlaceholder}>
              <Image
                src='/assets/img/chickenbids-logo.png'
                alt='ChickenBids'
                width={100}
                height={100}
              />
            </div>
          )}
        </div>

        {/* Product Name */}
        <h1 className={styles.productName}>
          {auction?.products?.name || 'Loading...'}
        </h1>
        {auction?.products?.variant && (
          <p className={styles.productVariant}>{auction.products.variant}</p>
        )}

        {/* Item Details Button */}
        {auction && lootData && (
          <button
            className={styles.detailsButton}
            onClick={() => setLootModalOpen(true)}
          >
            VIEW ITEM DETAILS
          </button>
        )}

        {/* Price Range */}
        {auction && (
          <div className={styles.priceRange}>
            <span className={styles.priceLabel}>WIN FOR AS LOW AS</span>
            <span className={styles.priceValue}>${auction.floor_price}</span>
          </div>
        )}
      </div>

      {/* Countdown Section */}
      <div className={styles.countdownSection}>
        {isLive ? (
          <div className={styles.liveIndicator}>
            <span className={styles.liveDot} />
            AUCTION LIVE NOW
          </div>
        ) : auction ? (
          <>
            <div className={styles.countdownLabel}>AUCTION STARTS IN</div>
            <div className={styles.countdown}>
              {formatCountdown(countdownMs)}
            </div>
            <div className={styles.dropTime}>
              {auctionStartTime && formatDropTime(auctionStartTime)}
            </div>
          </>
        ) : (
          <div className={styles.countdownLabel}>NO AUCTION SCHEDULED</div>
        )}
      </div>

      {/* How It Works */}
      <div className={styles.howItWorks}>
        <h2>HOW IT WORKS</h2>
        <div className={styles.steps}>
          <div className={styles.step}>
            <span className={styles.stepNumber}>1</span>
            <span>Price starts high, drops every second.</span>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNumber}>2</span>
            <span>Lock in your price anytime.</span>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNumber}>3</span>
            <span>Pay what you locked, that&apos;s it.</span>
          </div>
        </div>
      </div>

      {/* Why Section */}
      <div className={styles.whySection}>
        <h2>WHY SO CHEAP?</h2>
        <p className={styles.whyText}>
          Winners typically pay <strong>less than 50%</strong> of retail price.
        </p>
        <p className={styles.whyExplainer}>
          We make money from ads shown during the auction, not from you.
          That&apos;s how you score gear at prices that seem too good to be
          true.
        </p>
      </div>

      {/* Email Capture */}
      <div className={styles.emailSection}>
        {isSubmitted ? (
          <div className={styles.successMessage}>
            <span className={styles.successIcon}>✓</span>
            <h3>You&apos;re on the list!</h3>
            <p>We&apos;ll email you before the auction goes live.</p>
            <Link href='/' className={styles.enterButton}>
              ENTER CHICKENBIDS
            </Link>
          </div>
        ) : (
          <>
            <h2>GET NOTIFIED</h2>
            <p>Be the first to know when the auction drops</p>
            <form onSubmit={handleSubmit} className={styles.emailForm}>
              <input
                type='email'
                placeholder='your@email.com'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.emailInput}
                disabled={isSubmitting}
              />
              <button
                type='submit'
                className={styles.submitButton}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'JOINING...' : 'NOTIFY ME'}
              </button>
            </form>
            {error && <p className={styles.error}>{error}</p>}
            <p className={styles.noSpam}>No spam. Unsubscribe anytime.</p>
          </>
        )}
      </div>

      {/* Trust Footer */}
      <div className={styles.trustFooter}>
        <div className={styles.trustItems}>
          <span>✓ No credit card required</span>
          <span>✓ Free to join</span>
          <span>✓ AU shipping included</span>
        </div>
      </div>

      {/* Loot Intel Modal */}
      <AnimatePresence>
        {lootModalOpen && lootData && (
          <LootIntelModal
            isOpen={lootModalOpen}
            onClose={() => setLootModalOpen(false)}
            lootData={lootData}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
