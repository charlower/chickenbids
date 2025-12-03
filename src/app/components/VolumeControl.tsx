'use client';

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
