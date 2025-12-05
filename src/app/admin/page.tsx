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
    // Still loading auth state
    if (appLoading) {
      return;
    }

    // Not logged in
    if (!user) {
      router.replace('/');
      return;
    }

    // Check player's is_admin flag from context
    if (player) {
      if (player.is_admin === true) {
        setIsAdmin(true);
        setChecking(false);
      } else {
        router.replace('/');
      }
      return;
    }

    // Player not loaded yet but user exists - query DB directly
    const checkAdminFromDB = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (error || !data?.is_admin) {
        router.replace('/');
        return;
      }

      setIsAdmin(true);
      setChecking(false);
    };

    checkAdminFromDB();
  }, [user, appLoading, player, router]);

  // Show loading while checking authorization
  if (checking || !isAdmin) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>VERIFYING CLEARANCE...</div>
      </div>
    );
  }

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
