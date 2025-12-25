'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import LootIntelModal from '../components/LootIntelModal';
import RegisterModal from '../components/RegisterModal';
import LoginModal from '../components/LoginModal';
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
    retail_price: number | null;
    shipping_time: string;
    shipping_method: string;
    returns_policy: string;
  };
};

export default function LandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [auction, setAuction] = useState<AuctionData | null>(null);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [lootModalOpen, setLootModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

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

    try {
      const { error: insertError } = await supabase.from('waitlist').insert({
        email: email.toLowerCase().trim(),
        source: 'landing',
      });

      if (insertError) {
        // Handle duplicate email
        if (insertError.code === '23505') {
          setError('This email is already on the list!');
        } else {
          console.error('Waitlist insert error:', insertError);
          setError('Something went wrong. Please try again.');
        }
        setIsSubmitting(false);
        return;
      }

      setIsSubmitted(true);
    } catch (err) {
      console.error('Waitlist exception:', err);
      setError('Something went wrong. Please try again.');
    }

    setIsSubmitting(false);
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

        {/* Price Anchor - Retail crossed out, floor price highlighted */}
        {auction && (
          <div className={styles.priceAnchor}>
            {auction.products?.retail_price && (
              <span className={styles.retailPrice}>
                ${auction.products.retail_price}
              </span>
            )}
            <span className={styles.winPrice}>${auction.floor_price}</span>
            <span className={styles.priceLabel}>LOWEST POSSIBLE PRICE</span>
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
            <div className={styles.countdownLabel}>DROP IN</div>
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

      {/* Email Capture - ABOVE THE FOLD */}
      <div className={styles.emailSection}>
        {isSubmitted ? (
          <div className={styles.successMessage}>
            <span className={styles.successIcon}>✓</span>
            <h3>SPOT CLAIMED!</h3>
            <p>We&apos;ll email you before the drop.</p>
            <Link href='/' className={styles.enterButton}>
              ENTER CHICKENBIDS NOW
            </Link>
          </div>
        ) : (
          <>
            <h2>CLAIM YOUR SPOT</h2>
            <p>Get notified before the price drops</p>
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
                {isSubmitting ? 'CLAIMING...' : 'RESERVE MY SPOT'}
              </button>
            </form>
            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.orDivider}>
              <span>or</span>
            </div>

            <button
              type='button'
              className={styles.registerButton}
              onClick={() => setRegisterModalOpen(true)}
            >
              REGISTER NOW
            </button>
          </>
        )}
      </div>

      {/* Item Details Button - After CTA */}
      {auction && lootData && (
        <button
          className={styles.detailsButton}
          onClick={() => setLootModalOpen(true)}
        >
          VIEW ITEM DETAILS
        </button>
      )}

      {/* How It Works */}
      <div className={styles.howItWorks}>
        <h2>HOW IT WORKS</h2>
        <div className={styles.steps}>
          <div className={styles.step}>
            <span className={styles.stepNumber}>1</span>
            <span>Price starts high, drops every second</span>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNumber}>2</span>
            <span>Lock in your price anytime</span>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNumber}>3</span>
            <span>First to lock wins the item</span>
          </div>
        </div>
      </div>

      {/* Trust Footer */}
      <div className={styles.trustFooter}>
        <div className={styles.trustItems}>
          <span>✓ Free to join</span>
          <span>✓ No credit card</span>
          <span>✓ AU shipping included</span>
        </div>
        <p className={styles.noSpam}>No spam, ever. Unsubscribe anytime.</p>
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

      {/* Register Modal */}
      <AnimatePresence>
        {registerModalOpen && (
          <RegisterModal
            isOpen={registerModalOpen}
            onClose={() => setRegisterModalOpen(false)}
            onSwitchToLogin={() => {
              setRegisterModalOpen(false);
              setLoginModalOpen(true);
            }}
            onSuccess={() => {
              setRegisterModalOpen(false);
              router.push('/');
            }}
          />
        )}
      </AnimatePresence>

      {/* Login Modal */}
      <AnimatePresence>
        {loginModalOpen && (
          <LoginModal
            isOpen={loginModalOpen}
            onClose={() => setLoginModalOpen(false)}
            onSwitchToRegister={() => {
              setLoginModalOpen(false);
              setRegisterModalOpen(true);
            }}
            onSuccess={() => {
              setLoginModalOpen(false);
              router.push('/');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
