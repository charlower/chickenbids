'use client';

import { useEffect, useState } from 'react';
import styles from './VolumeControl.module.css';

type VolumeControlProps = {
  volume: number;
  onChange: (volume: number) => void;
  label: string;
};

export default function VolumeControl({
  volume,
  onChange,
  label,
}: VolumeControlProps) {
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS
    const iOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(iOS);
  }, []);

  // On iOS, show message instead of slider
  if (isIOS) {
    return (
      <div className={styles.content}>
        <span className={styles.volumeLabel}>{label}</span>
        <span className={styles.iosMessage}>USE DEVICE VOLUME</span>
      </div>
    );
  }

  return (
    <div className={styles.content}>
      <span className={styles.volumeLabel}>{label}</span>
      <input
        type='range'
        min='0'
        max='100'
        value={volume * 100}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className={styles.slider}
      />
      <span className={styles.volumeValue}>{Math.round(volume * 100)}</span>
    </div>
  );
}
