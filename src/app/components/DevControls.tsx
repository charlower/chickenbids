'use client';

import { supabase } from '@/lib/supabase/client';
import styles from './DevControls.module.css';

type TimeWindow = 'no-auction' | 'standby' | 'live';

type DevControlsProps = {
  devOverride: TimeWindow | null;
  devStandbyLockdown: boolean;
  timeMultiplier: number;
  onDevOverrideChange: (val: TimeWindow | null) => void;
  onDevStandbyLockdownToggle: () => void;
  onTimeMultiplierChange: (val: number) => void;
  onTestEndModal: () => void;
  onToast: (message: string) => void;
};

export default function DevControls({
  devOverride,
  devStandbyLockdown,
  timeMultiplier,
  onDevOverrideChange,
  onDevStandbyLockdownToggle,
  onTimeMultiplierChange,
  onTestEndModal,
  onToast,
}: DevControlsProps) {
  const scenarioButtons: TimeWindow[] = ['no-auction', 'standby', 'live'];

  const setAuctionTime = async (minutes: number, label: string) => {
    const { error } = await supabase.rpc('set_auction_time', { minutes });
    if (error) {
      onToast(`ERROR: ${error.message}`);
    } else {
      onToast(`AUCTION SET TO ${label}`);
      window.location.reload();
    }
  };

  const setAuctionSeconds = async (seconds: number, label: string) => {
    const { data: auction } = await supabase
      .from('auctions')
      .select('id')
      .in('status', ['scheduled', 'live'])
      .order('start_at', { ascending: true })
      .limit(1)
      .single();

    if (!auction) {
      onToast('NO AUCTION FOUND');
      return;
    }

    const { error } = await supabase
      .from('auctions')
      .update({
        start_at: new Date(Date.now() + seconds * 1000).toISOString(),
        status: 'scheduled',
      })
      .eq('id', auction.id);

    if (error) {
      onToast(`ERROR: ${error.message}`);
    } else {
      onToast(`AUCTION SET TO ${label}`);
      window.location.reload();
    }
  };

  const startAuctionNow = async () => {
    const { error } = await supabase.rpc('start_auction_now');
    if (error) {
      onToast(`ERROR: ${error.message}`);
    } else {
      onToast('AUCTION STARTED LIVE');
      window.location.reload();
    }
  };

  const clearAuction = () => {
    onToast('AUCTION CLEARED');
    window.location.reload();
  };

  return (
    <div className={styles.devControls}>
      <span>Scenario Override:</span>
      {scenarioButtons.map((option) => (
        <button
          key={option}
          className={`${styles.devBtn} ${
            devOverride === option ? styles.devBtnActive : ''
          }`}
          onClick={() =>
            onDevOverrideChange(devOverride === option ? null : option)
          }
        >
          {option.replace('-', ' ')}
        </button>
      ))}
      {devOverride === 'standby' && (
        <button
          className={`${styles.devBtn} ${
            devStandbyLockdown ? styles.devBtnActive : ''
          }`}
          onClick={onDevStandbyLockdownToggle}
        >
          {devStandbyLockdown ? '< 60 MODE' : '> 60 MODE'}
        </button>
      )}
      <button
        className={`${styles.devBtn} ${
          devOverride === null ? styles.devBtnActive : ''
        }`}
        onClick={() => onDevOverrideChange(null)}
      >
        REAL TIME
      </button>
      <button className={styles.devBtn} onClick={onTestEndModal}>
        TEST END MODAL
      </button>

      <hr className={styles.divider} />

      <span>Update Auction Time:</span>
      <button
        className={styles.devBtn}
        onClick={() => setAuctionTime(10080, '7 DAYS')}
      >
        7 DAYS
      </button>
      <button
        className={styles.devBtn}
        onClick={() => setAuctionTime(90, '90 MINS')}
      >
        STANDBY (90m)
      </button>
      <button
        className={styles.devBtn}
        onClick={() => setAuctionTime(30, '30 MINS')}
      >
        STAGING (30m)
      </button>
      <button
        className={styles.devBtn}
        onClick={() => setAuctionTime(10, '10 MINS')}
      >
        LOCKDOWN (10m)
      </button>
      <button
        className={styles.devBtn}
        onClick={() => setAuctionSeconds(35, '35s COUNTDOWN')}
      >
        35s COUNTDOWN
      </button>
      <button className={styles.devBtn} onClick={startAuctionNow}>
        GO LIVE NOW
      </button>
      <button
        className={styles.devBtn}
        onClick={clearAuction}
        style={{ background: '#dc2626' }}
      >
        CLEAR AUCTION
      </button>

      <hr className={styles.divider} />

      <span>Time Speed:</span>
      <button
        className={`${styles.devBtn} ${
          timeMultiplier === 1 ? styles.devBtnActive : ''
        }`}
        onClick={() => onTimeMultiplierChange(1)}
      >
        1x (REAL)
      </button>
      <button
        className={`${styles.devBtn} ${
          timeMultiplier === 10 ? styles.devBtnActive : ''
        }`}
        onClick={() => onTimeMultiplierChange(10)}
      >
        10x
      </button>
      <button
        className={`${styles.devBtn} ${
          timeMultiplier === 60 ? styles.devBtnActive : ''
        }`}
        onClick={() => onTimeMultiplierChange(60)}
      >
        60x (1min=1sec)
      </button>
    </div>
  );
}
