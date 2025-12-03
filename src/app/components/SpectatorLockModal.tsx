'use client';

import { useEffect, useState } from 'react';
import styles from './SpectatorLockModal.module.css';

interface SpectatorLockModalProps {
  isOpen: boolean;
  lockedPrice: number;
  lockExpiresAt: string; // ISO string from DB
  onExpire: () => void;
}

export function SpectatorLockModal({
  isOpen,
  lockedPrice,
  lockExpiresAt,
  onExpire,
}: SpectatorLockModalProps) {
  // Initialize countdown with actual remaining time
  const [countdown, setCountdown] = useState(() => {
    const now = Date.now();
    const expires = new Date(lockExpiresAt).getTime();
    return Math.max(0, expires - now);
  });

  // Countdown from lock_expires_at (server time)
  useEffect(() => {
    if (!isOpen) return;

    // Set initial countdown immediately
    const now = Date.now();
    const expires = new Date(lockExpiresAt).getTime();
    const remaining = Math.max(0, expires - now);
    setCountdown(remaining);

    console.log('SpectatorLockModal - Time check:', {
      lockExpiresAt,
      now: new Date(now).toISOString(),
      expires: new Date(expires).toISOString(),
      remaining,
      remainingSeconds: remaining / 1000,
    });

    const timer = setInterval(() => {
      const now = Date.now();
      const expires = new Date(lockExpiresAt).getTime();
      const remaining = Math.max(0, expires - now);

      setCountdown(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        setTimeout(() => {
          onExpire();
        }, 2000); // Show "LOCK EXPIRED" for 2s before closing
      }
    }, 100);

    return () => clearInterval(timer);
  }, [isOpen, lockExpiresAt, onExpire]);

  if (!isOpen) return null;

  const seconds = Math.ceil(countdown / 1000);
  const hasExpired = countdown <= 0;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          {hasExpired ? 'LOCK EXPIRED' : 'ANOTHER OPERATOR HAS LOCKED TARGET'}
        </div>

        <div className={styles.priceSection}>
          <div className={styles.priceLabel}>LOCKED PRICE</div>
          <div className={styles.price}>${lockedPrice.toFixed(2)}</div>
        </div>

        {!hasExpired ? (
          <>
            <div className={styles.timerSection}>
              <div className={styles.timerLabel}>LOCK EXPIRES IN</div>
              <div className={styles.timer}>{seconds}s</div>
            </div>

            <div className={styles.message}>
              STANDBY. AUCTION WILL RESUME IF PAYMENT FAILS OR LOCK EXPIRES.
            </div>
          </>
        ) : (
          <div className={styles.expiredMessage}>
            AUCTION RESUMING - PREPARE TO ENGAGE
          </div>
        )}
      </div>
    </div>
  );
}
