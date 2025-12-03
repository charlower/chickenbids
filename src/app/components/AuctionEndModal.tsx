import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect } from 'react';
import styles from './AuctionEndModal.module.css';

type AuctionEndModalProps = {
  isOpen: boolean;
  onClose: () => void;
  auctionData: {
    winnerCallsign: string;
    lockedPrice: number;
    startPrice: number;
    floorPrice: number;
    spread: number;
    duration: string;
  };
  isWinner: boolean;
  isLoggedIn: boolean;
};

function AnimatedNumber({
  value,
  decimals = 0,
  delay = 0,
}: {
  value: number;
  decimals?: number;
  delay?: number;
}) {
  const spring = useSpring(0, {
    stiffness: 150,
    damping: 30,
    mass: 1,
    duration: 1500,
  });
  const display = useTransform(spring, (latest) => latest.toFixed(decimals));

  useEffect(() => {
    const timer = setTimeout(() => {
      spring.set(value);
    }, delay);
    return () => clearTimeout(timer);
  }, [spring, value, delay]);

  return <motion.span>{display}</motion.span>;
}
export default function AuctionEndModal({
  isOpen,
  onClose,
  auctionData,
  isWinner,
  isLoggedIn,
}: AuctionEndModalProps) {
  if (!isOpen) return null;

  const hasWinner =
    auctionData.winnerCallsign && auctionData.winnerCallsign !== '';

  return (
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
        <div className={styles.header}>
          &gt;&gt; {hasWinner ? 'AUCTION TERMINATED' : 'TARGET LOST'} &lt;&lt;
        </div>

        <div
          className={`${styles.badge} ${
            hasWinner
              ? isWinner
                ? styles.badgeWinner
                : styles.badgeLoser
              : styles.badgeFailed
          }`}
        >
          {hasWinner
            ? isWinner
              ? 'Target has been secured, congratulations!'
              : 'You missed the target, better luck next time.'
            : 'NO BIDS PLACED - HOUSE RETAINS THE LOOT!'}
        </div>

        <div className={styles.stats}>
          <div className={styles.statRow}>
            <span>AUCTION DURATION</span>
            <span>{auctionData.duration}</span>
          </div>
          {hasWinner && (
            <div className={styles.statRow}>
              <span>WINNING PLAYER</span>
              <span>@{auctionData.winnerCallsign}</span>
            </div>
          )}
          <div className={styles.statRow}>
            <span>START PRICE</span>
            <span className={styles.startPrice}>
              $<AnimatedNumber value={auctionData.startPrice} decimals={0} />
            </span>
          </div>
          <div className={styles.statRow}>
            <span>FLOOR PRICE</span>
            <span className={styles.floorPrice}>
              $
              <AnimatedNumber
                value={auctionData.floorPrice}
                decimals={0}
                delay={1700}
              />
            </span>
          </div>
          {hasWinner && (
            <>
              <div className={styles.statRow}>
                <span>WIN PRICE</span>
                <span className={styles.lockedPrice}>
                  $
                  <AnimatedNumber
                    value={auctionData.lockedPrice}
                    decimals={2}
                    delay={3600}
                  />
                </span>
              </div>
              <div className={styles.statRow}>
                <span>SPREAD</span>
                <span className={styles.spread}>
                  $
                  <AnimatedNumber
                    value={auctionData.spread}
                    decimals={2}
                    delay={6200}
                  />
                </span>
              </div>
            </>
          )}
        </div>

        {isLoggedIn && (
          <div className={styles.xpBanner}>
            <div className={styles.xpLabel}>XP EARNED</div>
            <div className={styles.xpValue}>
              +
              <AnimatedNumber
                value={isWinner ? 10 : 1}
                decimals={0}
                delay={8200}
              />{' '}
              XP
            </div>
          </div>
        )}

        <div className={styles.message}>
          {!hasWinner
            ? 'BETTER LUCK NEXT TIME. STAY LOCKED IN FOR THE NEXT DROP. FOLLOW @CHICKENBIDS FOR AUCTION INTEL.'
            : isWinner
            ? 'TARGET SECURED. PAYMENT PROCESSING. STAND BY FOR DELIVERY BRIEF VIA EMAIL.'
            : isLoggedIn
            ? 'ANOTHER OPERATOR CLAIMED THE TARGET. STAY ALERT FOR NEXT DROP.'
            : 'AUCTION CONCLUDED. REGISTER TO SECURE FUTURE TARGETS.'}
        </div>

        <button className={styles.button} onClick={onClose}>
          {!hasWinner ? 'RETURN TO LOBBY' : 'RETURN TO LOBBY'}
        </button>
      </motion.div>
    </motion.div>
  );
}
