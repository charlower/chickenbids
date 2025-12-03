'use client';

import { motion, AnimatePresence } from 'framer-motion';
import styles from './InterstitialModal.module.css';

type InterstitialModalProps = {
  isOpen: boolean;
  adProgress: number;
  onClaim: () => void;
};

export default function InterstitialModal({
  isOpen,
  adProgress,
  onClaim,
}: InterstitialModalProps) {
  const isAdComplete = adProgress >= 100;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className={styles.window}
          initial={{ scale: 0.95, rotateX: -5 }}
          animate={{ scale: 1, rotateX: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
        >
          <div className={styles.header}>&gt;&gt; UPLINK REQUIRED &lt;&lt;</div>
          <div className={styles.video}>
            <div className={styles.noise} />
            <div className={styles.scanlines} />
            <span>SPONSOR MESSAGE STREAM</span>
          </div>
          <div className={styles.progress}>
            <div
              className={styles.progressFill}
              style={{ width: `${adProgress}%` }}
            />
          </div>
          <button
            className={`${styles.btn} ${
              !isAdComplete ? styles.btnDisabled : ''
            }`}
            disabled={!isAdComplete}
            onClick={onClaim}
          >
            {isAdComplete ? 'CLAIM CREDIT & CONTINUE' : 'DECRYPTING...'}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
