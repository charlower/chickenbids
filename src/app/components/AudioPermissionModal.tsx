'use client';

import { motion, AnimatePresence } from 'framer-motion';
import styles from './AudioPermissionModal.module.css';

type AudioPermissionModalProps = {
  isOpen: boolean;
  onAllow: () => void;
  onDeny: () => void;
  onClose: () => void;
};

export default function AudioPermissionModal({
  isOpen,
  onAllow,
  onDeny,
  onClose,
}: AudioPermissionModalProps) {
  const handleAllow = () => {
    console.log('🎯 Enable Comms clicked');

    // Create and play silent audio SYNCHRONOUSLY (critical for Safari)
    const silentAudio = new Audio();
    silentAudio.volume = 0.01;
    silentAudio.src =
      'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhAC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAA4SgjLCVAAAAAAAAAAAAAAAAAAAAAP/7kGQAD/AAAGkAAAAIAAANgAAAAQAAAaQAAAAgAAA0gAAABExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uQZAoP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=';

    let didComplete = false;

    const completeAction = () => {
      if (!didComplete) {
        didComplete = true;
        console.log('✅ Completing audio permission action');
        onClose();
        onAllow();
      }
    };

    // Timeout fallback in case Safari hangs the promise
    const timeoutId = setTimeout(() => {
      console.log('⏱️ Audio unlock timeout - proceeding anyway');
      completeAction();
    }, 500);

    // Must call play() synchronously in Safari
    const playPromise = silentAudio.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('🔊 Audio unlocked - COMMS ONLINE');
          clearTimeout(timeoutId);
          completeAction();
        })
        .catch((err) => {
          console.error('⚠️ Audio unlock failed (but proceeding anyway):', err);
          clearTimeout(timeoutId);
          completeAction();
        });
    } else {
      // Fallback for older browsers
      clearTimeout(timeoutId);
      completeAction();
    }
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
