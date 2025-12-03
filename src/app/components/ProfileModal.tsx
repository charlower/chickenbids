import { motion } from 'framer-motion';
import { useState } from 'react';
import styles from './ProfileModal.module.css';

type ProfileModalProps = {
  isOpen: boolean;
  onClose: () => void;
  playerData: {
    callsign: string;
    level: number;
    xp: number;
    xpToNextLevel: number;
    auctionsWon: number;
    totalSpent: number;
    avgWinPrice: number;
    winRate: number;
    email: string;
    phone: string;
    memberSince: string;
    recentActivity: Array<{
      type: 'win' | 'bid';
      item: string;
      price?: number;
      date: string;
    }>;
  };
  onLogout: () => void;
  onUpdateEmail: (newEmail: string) => void;
  onUpdatePhone: (newPhone: string) => void;
};

export default function ProfileModal({
  isOpen,
  onClose,
  playerData,
  onLogout,
  onUpdateEmail,
  onUpdatePhone,
}: ProfileModalProps) {
  const [editMode, setEditMode] = useState<'email' | 'phone' | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const xpProgress = (playerData.xp / playerData.xpToNextLevel) * 100;

  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`;
  };

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={styles.modal}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>&gt;&gt; PLAYER PROFILE &lt;&lt;</div>

        {/* Player Identity */}
        <div className={styles.identity}>
          <div className={styles.callsign}>@{playerData.callsign}</div>
          <div className={styles.levelBadge}>
            LEVEL {playerData.level} · {playerData.xp} XP
          </div>
          <div className={styles.xpBar}>
            <div
              className={styles.xpBarFill}
              style={{ width: `${xpProgress}%` }}
            />
          </div>
          <div className={styles.xpLabel}>
            {playerData.xp}/{playerData.xpToNextLevel} XP to Level{' '}
            {playerData.level + 1}
          </div>
          <div className={styles.memberSince}>
            Member since {playerData.memberSince}
          </div>
        </div>

        {/* Stats */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>STATS</div>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{playerData.auctionsWon}</div>
              <div className={styles.statLabel}>Auctions Won</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>
                ${playerData.totalSpent.toFixed(2)}
              </div>
              <div className={styles.statLabel}>Total Spent</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>
                ${playerData.avgWinPrice.toFixed(2)}
              </div>
              <div className={styles.statLabel}>Avg Win Price</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{playerData.winRate}%</div>
              <div className={styles.statLabel}>Win Rate</div>
            </div>
          </div>
        </div>

        {/* Auction Wins */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>AUCTION WINS</div>
          <div className={styles.activityList}>
            {playerData.recentActivity.length > 0 ? (
              playerData.recentActivity.map((activity, index) => (
                <div key={index} className={styles.activityItem}>
                  <div className={styles.activityBadge}>WON</div>
                  <div className={styles.activityDetails}>
                    <div className={styles.activityItemName}>
                      {activity.item}
                    </div>
                    {activity.price && (
                      <div className={styles.activityPrice}>
                        ${activity.price.toFixed(2)}
                      </div>
                    )}
                  </div>
                  <div className={styles.activityDate}>{activity.date}</div>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>
                No wins yet. Secure a target to see your wins here!
              </div>
            )}
          </div>
        </div>

        {/* Account Info */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>ACCOUNT INFO</div>
          <div className={styles.accountInfo}>
            {/* Email */}
            <div className={styles.accountRow}>
              <span className={styles.accountLabel}>EMAIL</span>
              <span className={styles.accountValue}>{playerData.email}</span>
            </div>

            {/* Phone */}
            <div className={styles.accountRow}>
              <span className={styles.accountLabel}>PHONE</span>
              <span className={styles.accountValue}>{playerData.phone}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button className={styles.logoutButton} onClick={onLogout}>
            LOGOUT
          </button>
          <button className={styles.closeButton} onClick={onClose}>
            CLOSE
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
