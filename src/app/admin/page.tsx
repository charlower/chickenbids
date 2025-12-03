'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/contexts/AppContext';
import { supabase } from '@/lib/supabase/client';
import styles from './page.module.css';
import { AuctionControls } from '@/app/components/admin/AuctionControls';
import { CreateAuction } from '@/app/components/admin/CreateAuction';

export default function AdminPage() {
  const router = useRouter();
  const { user, player, isLoading: appLoading } = useApp();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'controls' | 'create'>('controls');

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const checkAdmin = async () => {
      // Set a timeout to force redirect after 3 seconds if still loading
      timeoutId = setTimeout(() => {
        if (appLoading && mounted) {
          setChecking(false);
          router.replace('/');
        }
      }, 3000);

      // Wait for app context to load (but not forever)
      if (appLoading) {
        return;
      }

      // Clear timeout since we're no longer loading
      clearTimeout(timeoutId);

      // No user - redirect immediately
      if (!user) {
        if (mounted) {
          setChecking(false);
          router.replace('/');
        }
        return;
      }

      // Check if player has is_admin flag
      if (player?.is_admin === true) {
        if (mounted) {
          setIsAdmin(true);
          setChecking(false);
        }
        return;
      }

      // Fallback: Query database directly
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (!mounted) return;

      if (error) {
        setChecking(false);
        router.replace('/');
        return;
      }

      if (data?.is_admin === true) {
        setIsAdmin(true);
        setChecking(false);
      } else {
        setChecking(false);
        router.replace('/');
      }
    };

    checkAdmin();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user, appLoading, player, router]);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>ADMIN CONTROL PANEL</h1>
          <p className={styles.subtitle}>
            Operator:{' '}
            <span className={styles.operator}>
              @{player?.callsign || user?.email || 'UNKNOWN'}
            </span>
          </p>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'controls' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('controls')}
          >
            AUCTION CONTROLS
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'create' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('create')}
          >
            CREATE AUCTION
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {activeTab === 'controls' && <AuctionControls />}
          {activeTab === 'create' && <CreateAuction />}
        </div>

        {/* Back to Main */}
        <div className={styles.footer}>
          <button
            className={styles.backButton}
            onClick={() => router.push('/')}
          >
            ← RETURN TO MAIN
          </button>
        </div>
      </div>
    </div>
  );
}
