'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import type { StripePaymentElementOptions } from '@stripe/stripe-js';
import Image from 'next/image';
import styles from './BidLockModal.module.css';

// Initialize Stripe
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

type BidLockModalProps = {
  isOpen: boolean;
  lockedPrice: number;
  expiresAt: number; // timestamp
  clientSecret: string | null; // Stripe PaymentIntent client secret
  onCancel: () => void;
  onSuccess: () => void; // Called when payment succeeds
  currentTime?: number; // Pass accelerated time from parent
  lockDurationMs: number; // Lock duration in milliseconds
};

// Payment form component (must be inside <Elements>)
// Payment element options (only show cards for MVP)
const paymentElementOptions: StripePaymentElementOptions = {
  layout: 'tabs',
  wallets: {
    applePay: 'never',
    googlePay: 'never',
  },
};

function PaymentForm({
  lockedPrice,
  expiresAt,
  onCancel,
  onSuccess,
  currentTime,
  lockDurationMs,
}: Omit<BidLockModalProps, 'isOpen' | 'clientSecret'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const hasClosedRef = useRef(false);

  // Debug logging
  useEffect(() => {
    console.log('PaymentForm loaded:', {
      stripe: !!stripe,
      elements: !!elements,
    });
  }, [stripe, elements]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);

  // Auto-close when timer expires
  const timeToUse = currentTime || now;
  const actualRemainingMs = Math.max(0, expiresAt - timeToUse);

  useEffect(() => {
    if (hasClosedRef.current || actualRemainingMs > 0) return;

    console.log('Timer expired, closing in 1 second...');
    hasClosedRef.current = true;

    setTimeout(() => {
      console.log('Calling onCancel...');
      onCancel();
    }, 1000);

    return undefined;
  }, [actualRemainingMs, onCancel]);

  const remainingSeconds = Math.floor(actualRemainingMs / 1000);
  const progress = (actualRemainingMs / lockDurationMs) * 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || isProcessing || remainingSeconds === 0) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setErrorMessage(submitError.message || 'Payment failed');
        setIsProcessing(false);
        return;
      }

      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}?payment=success`,
          payment_method_data: {
            billing_details: {
              name: 'ChickenBids Customer', // Provide default name since we're not collecting it
            },
          },
        },
        redirect: 'if_required', // Don't redirect if 3D Secure not needed
      });

      if (error) {
        setErrorMessage(error.message || 'Payment failed');
        setIsProcessing(false);
      } else {
        // Payment succeeded
        console.log('Payment successful!');
        onSuccess();
      }
    } catch (err) {
      console.error('Payment error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Payment failed');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className={styles.header}>&gt;&gt; LOCK CONFIRMED &lt;&lt;</div>

      <div className={styles.content}>
        <div className={styles.priceSection}>
          <div className={styles.priceLabel}>LOCKED PRICE</div>
          <div className={styles.priceValue}>${lockedPrice.toFixed(2)}</div>
        </div>

        <div className={styles.timerSection}>
          <div className={styles.timerLabel}>TIME TO ACQUIRE</div>
          <div className={styles.timerValue}>{remainingSeconds}s</div>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className={styles.timerWarning}>
            Complete payment within the time window before your bid lock
            expires!
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.paymentSection}>
          <div className={styles.paymentLabel}>PAYMENT DETAILS</div>
          {!stripe || !elements ? (
            <div
              style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}
            >
              Loading payment form...
            </div>
          ) : (
            <PaymentElement options={paymentElementOptions} />
          )}
          {errorMessage && <div className={styles.error}>{errorMessage}</div>}
          <div className={styles.shippingNote}>
            Shipping included in locked price. Delivery address details will be
            arranged directly with ChickenBids after winning.
          </div>
          <div className={styles.stripeLogo}>
            <Image
              src='/assets/img/stripe-logo.svg'
              alt='Stripe'
              width={125}
              height={30}
            />
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          type='submit'
          className={styles.payBtn}
          disabled={!stripe || isProcessing || remainingSeconds === 0}
        >
          {isProcessing
            ? 'PROCESSING...'
            : `ACQUIRE TARGET - $${lockedPrice.toFixed(2)}`}
        </button>
        <button
          type='button'
          className={styles.cancelBtn}
          onClick={onCancel}
          disabled={isProcessing || remainingSeconds === 0}
        >
          ABORT BID
        </button>
      </div>

      {remainingSeconds === 0 && (
        <div className={styles.expired}>LOCK EXPIRED - AUCTION RESUMED</div>
      )}
    </form>
  );
}

// Main modal component
export default function BidLockModal({
  isOpen,
  lockedPrice,
  expiresAt,
  clientSecret,
  onCancel,
  onSuccess,
  currentTime,
  lockDurationMs,
}: BidLockModalProps) {
  if (!isOpen || !clientSecret) return null;

  console.log('BidLockModal rendering:', {
    clientSecret: clientSecret?.substring(0, 20) + '...',
    stripeKey:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.substring(0, 20) + '...',
  });

  const options = {
    clientSecret,
    appearance: {
      theme: 'night' as const,
      variables: {
        colorPrimary: '#60a6fa',
        colorBackground: '#0f172a', // Match your darker backgrounds
        colorText: '#f8fafc',
        colorDanger: '#e31515',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSizeBase: '14px',
        spacingUnit: '4px',
        borderRadius: '4px',
        colorTextSecondary: '#94a3b8',
      },
      rules: {
        '.Input': {
          backgroundColor: '#1e293b', // Match your input fields
          border: '1px solid rgba(96, 165, 250, 0.3)',
          boxShadow: 'none',
          padding: '14px',
        },
        '.Input:focus': {
          border: '1px solid #60a6fa',
          boxShadow: '0 0 0 2px rgba(96, 165, 250, 0.1)',
        },
        '.Label': {
          fontSize: '11px',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#94a3b8',
          marginBottom: '8px',
        },
      },
    },
  };

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className={styles.modal}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
        >
          <Elements stripe={stripePromise} options={options}>
            <PaymentForm
              lockedPrice={lockedPrice}
              expiresAt={expiresAt}
              onCancel={onCancel}
              onSuccess={onSuccess}
              currentTime={currentTime}
              lockDurationMs={lockDurationMs}
            />
          </Elements>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
