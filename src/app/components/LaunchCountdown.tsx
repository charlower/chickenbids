'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './LaunchCountdown.module.css';

type LaunchCountdownProps = {
  isOpen: boolean;
  onComplete: () => void;
  currentTime?: number;
  timeMultiplier?: number;
};

export default function LaunchCountdown({
  isOpen,
  onComplete,
  currentTime,
  timeMultiplier = 1,
}: LaunchCountdownProps) {
  const [countdown, setCountdown] = useState(35.14);
  const startTimeRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  const blurDigitRef = useRef<HTMLSpanElement>(null);

  // Keep onCompleteRef up to date
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Reset countdown when modal closes
  useEffect(() => {
    if (!isOpen) {
      startTimeRef.current = null;
      // Reset countdown after a short delay to avoid setState in effect warning
      setTimeout(() => setCountdown(35.14), 0);
    }
  }, [isOpen]);

  // Main countdown timer
  useEffect(() => {
    if (!isOpen) return;

    // Set start time once when modal opens
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now();
      console.log('Set startTimeRef:', startTimeRef.current);
    }

    const duration = 35140; // 35.14 seconds in ms
    console.log('Starting timer with startTime:', startTimeRef.current);

    const timer = setInterval(() => {
      if (startTimeRef.current === null) {
        console.log('ERROR: startTimeRef is null in interval');
        return;
      }

      const now = Date.now();
      const elapsed = now - startTimeRef.current;
      const remaining = Math.max(0, (duration - elapsed) / 1000);

      setCountdown(remaining);

      if (remaining <= 0) {
        console.log('Countdown complete');
        clearInterval(timer);
        setTimeout(() => {
          onCompleteRef.current();
        }, 300);
      }
    }, 100); // Update every 100ms

    return () => {
      console.log('Cleaning up timer');
      clearInterval(timer);
    };
  }, [isOpen]);

  // Fast blur digit animation (direct DOM update, no re-renders)
  useEffect(() => {
    if (!isOpen) return;

    let currentDigit = 9;
    const blurTimer = setInterval(() => {
      currentDigit = currentDigit === 0 ? 9 : currentDigit - 1;
      if (blurDigitRef.current) {
        blurDigitRef.current.textContent = currentDigit.toString();
      }
    }, 10); // Cycle 9→0 every 100ms

    return () => clearInterval(blurTimer);
  }, [isOpen]);

  if (!isOpen) return null;

  const seconds = Math.floor(countdown);
  const deciseconds = Math.floor((countdown % 1) * 10); // First decimal only
  const formattedSeconds = seconds.toString().padStart(2, '0');
  const formattedDs = deciseconds.toString();

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className={styles.countdownContainer}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className={styles.label}>AUCTION LAUNCH IN</div>
          <div className={styles.countdown}>
            <span className={styles.time}>
              {formattedSeconds}:{formattedDs}
            </span>
            <span className={styles.blurDigit} ref={blurDigitRef}>
              9
            </span>
          </div>
          <div className={styles.message}>
            {countdown > 30 && '>> INITIALIZING AUCTION PROTOCOL <<'}
            {countdown <= 30 && countdown > 20 && '>> SECURING CONNECTION <<'}
            {countdown <= 20 && countdown > 10 && '>> LOADING TARGET DATA <<'}
            {countdown <= 10 && countdown > 5 && '>> STANDBY FOR LIVE FEED <<'}
            {countdown <= 5 && '>> AUCTION GOING LIVE <<'}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
