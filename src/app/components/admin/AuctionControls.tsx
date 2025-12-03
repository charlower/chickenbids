'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import styles from './AuctionControls.module.css';

type Auction = {
  id: string;
  status: string;
  current_price: number | null;
  floor_price: number;
  locked_by: string | null;
  start_at: string;
  start_price: number;
  product_id: string;
};

type Product = {
  name: string;
  variant: string | null;
};

type AuctionWithProduct = Auction & {
  products: Product;
};

export function AuctionControls() {
  const [currentAuction, setCurrentAuction] = useState<Auction | null>(null);
  const [allAuctions, setAllAuctions] = useState<AuctionWithProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Fetch auctions
  useEffect(() => {
    const fetchAuctions = async () => {
      // Fetch active/current auction
      const { data: currentData, error: currentError } = await supabase
        .from('auctions')
        .select(
          'id, status, current_price, floor_price, locked_by, start_at, start_price, product_id'
        )
        .in('status', ['live', 'paused'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (currentData && !currentError) {
        setCurrentAuction(currentData as Auction);
      } else {
        setCurrentAuction(null);
      }

      // Fetch all scheduled auctions with product info
      const { data: scheduledData, error: scheduledError } = await supabase
        .from('auctions')
        .select(
          'id, status, current_price, floor_price, locked_by, start_at, start_price, product_id, products(name, variant)'
        )
        .eq('status', 'scheduled')
        .order('start_at', { ascending: true });

      if (scheduledData && !scheduledError) {
        setAllAuctions(scheduledData as AuctionWithProduct[]);
      }
    };

    fetchAuctions();
  }, []);

  const refreshAuctions = async () => {
    // Fetch active/current auction
    const { data: currentData, error: currentError } = await supabase
      .from('auctions')
      .select(
        'id, status, current_price, floor_price, locked_by, start_at, start_price, product_id'
      )
      .in('status', ['live', 'paused'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (currentData && !currentError) {
      setCurrentAuction(currentData as Auction);
    } else {
      setCurrentAuction(null);
    }

    // Fetch all scheduled auctions
    const { data: scheduledData, error: scheduledError } = await supabase
      .from('auctions')
      .select(
        'id, status, current_price, floor_price, locked_by, start_at, start_price, product_id, products(name, variant)'
      )
      .eq('status', 'scheduled')
      .order('start_at', { ascending: true });

    if (scheduledData && !scheduledError) {
      setAllAuctions(scheduledData as AuctionWithProduct[]);
    }
  };

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleCancelScheduled = async (auctionId: string) => {
    if (!confirm('Cancel this scheduled auction?')) return;
    setLoading(true);

    const { error } = await supabase
      .from('auctions')
      .update({
        status: 'cancelled',
        ended_at: new Date().toISOString(),
      })
      .eq('id', auctionId);

    if (error) {
      showMessage(`ERROR: ${error.message}`);
    } else {
      showMessage('AUCTION CANCELLED');
      refreshAuctions();
    }
    setLoading(false);
  };

  const handlePause = async () => {
    if (!currentAuction) return;
    setLoading(true);

    const { error } = await supabase
      .from('auctions')
      .update({ status: 'paused' })
      .eq('id', currentAuction.id);

    if (error) {
      showMessage(`ERROR: ${error.message}`);
    } else {
      showMessage('AUCTION PAUSED');
      refreshAuctions();
    }
    setLoading(false);
  };

  const handleResume = async () => {
    if (!currentAuction) return;
    setLoading(true);

    const { error } = await supabase
      .from('auctions')
      .update({ status: 'live' })
      .eq('id', currentAuction.id);

    if (error) {
      showMessage(`ERROR: ${error.message}`);
    } else {
      showMessage('AUCTION RESUMED');
      refreshAuctions();
    }
    setLoading(false);
  };

  const handleCancel = async () => {
    if (!currentAuction) return;
    if (
      !confirm(
        'Are you sure you want to CANCEL this auction? This cannot be undone.'
      )
    )
      return;

    setLoading(true);

    const { error } = await supabase
      .from('auctions')
      .update({
        status: 'cancelled',
        ended_at: new Date().toISOString(),
      })
      .eq('id', currentAuction.id);

    if (error) {
      showMessage(`ERROR: ${error.message}`);
    } else {
      showMessage('AUCTION CANCELLED');
      refreshAuctions();
    }
    setLoading(false);
  };

  const handleComplete = async () => {
    if (!currentAuction) return;
    if (
      !confirm(
        'Manually complete this auction with NO WINNER? This cannot be undone.'
      )
    )
      return;

    setLoading(true);

    const { error } = await supabase
      .from('auctions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        winner_id: null,
        winning_price: null,
      })
      .eq('id', currentAuction.id);

    if (error) {
      showMessage(`ERROR: ${error.message}`);
    } else {
      showMessage('AUCTION COMPLETED (NO WINNER)');
      refreshAuctions();
    }
    setLoading(false);
  };

  const handleReleaseLock = async () => {
    if (!currentAuction?.locked_by) return;
    setLoading(true);

    const { error } = await supabase
      .from('auctions')
      .update({
        locked_by: null,
        locked_at: null,
        lock_expires_at: null,
      })
      .eq('id', currentAuction.id);

    if (error) {
      showMessage(`ERROR: ${error.message}`);
    } else {
      showMessage('LOCK RELEASED');
      refreshAuctions();
    }
    setLoading(false);
  };

  return (
    <div className={styles.container}>
      {/* Message Banner */}
      {message && <div className={styles.messageBanner}>{message}</div>}

      {/* Scheduled Auctions List */}
      {allAuctions.length > 0 && (
        <div className={styles.scheduledSection}>
          <div className={styles.sectionHeader}>
            SCHEDULED AUCTIONS ({allAuctions.length})
          </div>
          <div className={styles.auctionTable}>
            {allAuctions.map((auction) => (
              <div key={auction.id} className={styles.auctionRow}>
                <div className={styles.auctionInfo}>
                  <div className={styles.auctionName}>
                    {auction.products.name}
                    {auction.products.variant && (
                      <span className={styles.variant}>
                        {' '}
                        · {auction.products.variant}
                      </span>
                    )}
                  </div>
                  <div className={styles.auctionMeta}>
                    <span>ID: {auction.id.slice(0, 8)}...</span>
                    <span>START: ${auction.start_price.toFixed(2)}</span>
                    <span>FLOOR: ${auction.floor_price.toFixed(2)}</span>
                    <span>
                      {new Date(auction.start_at).toLocaleString('en-AU', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                </div>
                <button
                  className={`${styles.controlButton} ${styles.buttonDanger} ${styles.buttonSmall}`}
                  onClick={() => handleCancelScheduled(auction.id)}
                  disabled={loading}
                >
                  ✕ CANCEL
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!currentAuction && allAuctions.length === 0 && (
        <div className={styles.noAuction}>
          <div className={styles.icon}>⚠️</div>
          <p>NO ACTIVE OR SCHEDULED AUCTIONS</p>
          <p className={styles.hint}>Create a new auction to manage it here.</p>
        </div>
      )}

      {/* Current Auction Controls */}
      {currentAuction && (
        <>
          <div className={styles.sectionDivider}>ACTIVE AUCTION</div>

          {/* Auction Info */}
          <div className={styles.infoCard}>
            <div className={styles.infoHeader}>CURRENT AUCTION</div>
            <div className={styles.infoGrid}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>ID:</span>
                <span className={styles.infoValue}>
                  {currentAuction.id.slice(0, 8)}...
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>STATUS:</span>
                <span
                  className={`${styles.infoValue} ${styles[`status${currentAuction.status}`]}`}
                >
                  {currentAuction.status.toUpperCase()}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>CURRENT PRICE:</span>
                <span className={styles.infoValue}>
                  ${currentAuction.current_price?.toFixed(2) ?? 'N/A'}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>FLOOR PRICE:</span>
                <span className={styles.infoValue}>
                  ${currentAuction.floor_price.toFixed(2)}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>SCHEDULED START:</span>
                <span className={styles.infoValue}>
                  {new Date(currentAuction.start_at).toLocaleString('en-AU', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
              {currentAuction.locked_by && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>LOCKED BY:</span>
                  <span
                    className={styles.infoValue}
                    style={{ color: '#fbbf24' }}
                  >
                    User {currentAuction.locked_by.slice(0, 8)}...
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className={styles.controlsGrid}>
            {/* Pause/Resume */}
            {currentAuction.status === 'live' && (
              <button
                className={`${styles.controlButton} ${styles.buttonWarning}`}
                onClick={handlePause}
                disabled={loading}
              >
                ⏸ PAUSE AUCTION
              </button>
            )}

            {currentAuction.status === 'paused' && (
              <button
                className={`${styles.controlButton} ${styles.buttonSuccess}`}
                onClick={handleResume}
                disabled={loading}
              >
                ▶ RESUME AUCTION
              </button>
            )}

            {/* Release Lock */}
            {currentAuction.locked_by && (
              <button
                className={`${styles.controlButton} ${styles.buttonWarning}`}
                onClick={handleReleaseLock}
                disabled={loading}
              >
                🔓 RELEASE LOCK
              </button>
            )}

            {/* Complete */}
            {(currentAuction.status === 'live' ||
              currentAuction.status === 'paused') && (
              <button
                className={`${styles.controlButton} ${styles.buttonPrimary}`}
                onClick={handleComplete}
                disabled={loading}
              >
                ✓ COMPLETE (NO WINNER)
              </button>
            )}

            {/* Cancel */}
            {currentAuction.status !== 'completed' &&
              currentAuction.status !== 'cancelled' && (
                <button
                  className={`${styles.controlButton} ${styles.buttonDanger}`}
                  onClick={handleCancel}
                  disabled={loading}
                >
                  ✕ CANCEL AUCTION
                </button>
              )}
          </div>

          {loading && (
            <div className={styles.loadingOverlay}>PROCESSING...</div>
          )}
        </>
      )}
    </div>
  );
}
