'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import styles from './CommsPortrait.module.css';

interface CommsPortraitProps {
  isVisible: boolean;
  operatorName: string;
  imageSrc: string;
}

export default function CommsPortrait({
  isVisible,
  operatorName,
  imageSrc,
}: CommsPortraitProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={styles.container}
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div className={styles.frame}>
            <div className={styles.imageWrapper}>
              <Image
                src={imageSrc}
                alt={operatorName}
                width={120}
                height={120}
                className={styles.portrait}
              />
              <div className={styles.scanlines} />
            </div>
            <div className={styles.nameplate}>
              <div className={styles.statusDot} />
              <span>{operatorName}</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
