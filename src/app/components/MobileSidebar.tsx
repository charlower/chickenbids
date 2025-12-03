'use client';

import { motion, AnimatePresence } from 'framer-motion';
import styles from './MobileSidebar.module.css';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function MobileSidebar({
  isOpen,
  onClose,
  children,
}: MobileSidebarProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.div
            className={styles.sidebar}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.2 }}
          >
            <div className={styles.header}>
              <div className={styles.title}>INTEL</div>
              <button className={styles.closeButton} onClick={onClose}>
                ✕
              </button>
            </div>

            <div className={styles.content}>{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
