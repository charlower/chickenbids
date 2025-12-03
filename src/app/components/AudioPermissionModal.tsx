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
    localStorage.setItem('cb_audio_permission', 'allowed');

    // Play a silent audio to unlock the audio context
    const silentAudio = new Audio();
    silentAudio.src =
      'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhAC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAA4SgjLCVAAAAAAAAAAAAAAAAAAAAAP/7kGQAD/AAAGkAAAAIAAANgAAAAQAAAaQAAAAgAAA0gAAABExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uQZAoP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=';
    silentAudio.volume = 0.01;

    silentAudio
      .play()
      .then(() => {
        console.log('🔊 Audio unlocked - COMMS ONLINE');
        onClose();
        onAllow();
      })
      .catch((err) => {
        console.error('Failed to unlock audio:', err);
        // Still proceed even if unlock fails
        onClose();
        onAllow();
      });
  };

  const handleDeny = () => {
    localStorage.setItem('cb_audio_permission', 'denied');
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
