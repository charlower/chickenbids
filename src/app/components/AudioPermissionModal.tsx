'use client';

import { motion, AnimatePresence } from 'framer-motion';
import styles from './AudioPermissionModal.module.css';

type AudioPermissionModalProps = {
  isOpen: boolean;
  onAllow: () => void;
  onDeny: () => void;
  onClose: () => void;
  unlockAudio: () => void;
};

export default function AudioPermissionModal({
  isOpen,
  onAllow,
  onDeny,
  onClose,
  unlockAudio,
}: AudioPermissionModalProps) {
  // This MUST be a direct click handler, not through any abstraction
  const handleEnableClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('🎯 ENABLE COMMS button clicked');

    // Call unlock SYNCHRONOUSLY - this is the user gesture
    unlockAudio();

    // Then update React state
    onAllow();
    onClose();
  };

  const handleDenyClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    onDeny();
    onClose();
  };

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
          className={styles.panel}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
        >
          <div className={styles.header}>
            &gt;&gt; AUDIO SYSTEMS CHECK &lt;&lt;
          </div>

          <div className={styles.icon}>🎧</div>

          <div className={styles.message}>
            FOR THE FULL TACTICAL EXPERIENCE, CHICKENBIDS USES:
          </div>

          <ul className={styles.featureList}>
            <li>🔊 REAL-TIME COMMS CHATTER</li>
            <li>🎵 MISSION-CRITICAL AUDIO CUES</li>
            <li>⏱️ AUCTION COUNTDOWN ALERTS</li>
          </ul>

          <div className={styles.hint}>
            ENABLE AUDIO TO STAY IN THE LOOP, OPERATOR.
          </div>

          <div className={styles.buttons}>
            <button
              className={styles.buttonPrimary}
              onClick={handleEnableClick}
              type='button'
            >
              🔊 ENABLE COMMS
            </button>
            <button
              className={styles.buttonSecondary}
              onClick={handleDenyClick}
              type='button'
            >
              CONTINUE SILENT
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
