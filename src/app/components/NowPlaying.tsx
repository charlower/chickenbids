import styles from './NowPlaying.module.css';

type NowPlayingProps = {
  trackName: string;
  artist: string;
};

export default function NowPlaying({ trackName, artist }: NowPlayingProps) {
  return (
    <div className={styles.container}>
      <div className={styles.scrollWrapper}>
        <div className={styles.scrollText}>
          SONG ID: {trackName} • BY: {artist} • SONG ID: {trackName} • BY:{' '}
          {artist} • SONG ID: {trackName} • BY: {artist} • SONG ID: {trackName}{' '}
          • BY: {artist}
        </div>
      </div>
    </div>
  );
}
