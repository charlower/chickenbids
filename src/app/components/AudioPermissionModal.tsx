'use client';

import { motion, AnimatePresence } from 'framer-motion';
import styles from './AudioPermissionModal.module.css';

type AudioPermissionModalProps = {
  isOpen: boolean;
  onAllow: () => void;
  onDeny: () => void;
  onClose: () => void;
  preloadAudioTracks: () => Promise<void>;
};

export default function AudioPermissionModal({
  isOpen,
  onAllow,
  onDeny,
  onClose,
  preloadAudioTracks,
}: AudioPermissionModalProps) {
  const handleAllow = () => {
    console.log('🎯 Enable Comms clicked');

    let didComplete = false;

    const completeAction = () => {
      if (!didComplete) {
        didComplete = true;
        console.log('✅ Completing audio permission action');
        onClose();
        onAllow();
      }
    };

    console.log('🔓 Unlocking audio for all tracks...');
    const unlockPromise = preloadAudioTracks();

    // Wait for all unlocks or timeout
    const timeoutId = setTimeout(() => {
      console.log('⏱️ Audio unlock timeout - proceeding anyway');
      completeAction();
    }, 800);

    unlockPromise
      .then(() => {
        console.log('🔊 All audio unlocked - COMMS ONLINE');
      })
      .catch((err) => {
        console.error('⚠️ Failed to unlock audio:', err);
      })
      .finally(() => {
        clearTimeout(timeoutId);
        completeAction();
      });
  };

  const handleDeny = () => {
    onClose();
    onDeny();
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
            <button className={styles.buttonPrimary} onClick={handleAllow}>
              🔊 ENABLE COMMS
            </button>
            <button className={styles.buttonSecondary} onClick={handleDeny}>
              CONTINUE SILENT
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
