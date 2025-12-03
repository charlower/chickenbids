import { motion } from 'framer-motion';
import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import styles from './AuthModal.module.css';

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
  onSuccess: () => void;
  showConfirmedMessage?: boolean;
};

export default function LoginModal({
  isOpen,
  onClose,
  onSwitchToRegister,
  onSuccess,
  showConfirmedMessage = false,
}: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.includes('@')) {
      setError('Invalid email address');
      return;
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    setLoading(true);

    try {
      // Sign in with email + password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError('Invalid email or password');
        setLoading(false);
        return;
      }

      // Success!
      setLoading(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
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
        <div className={styles.header}>&gt;&gt; PLAYER LOGIN &lt;&lt;</div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>EMAIL</label>
            <input
              type='email'
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder='player@example.com'
              autoFocus
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>PASSWORD</label>
            <input
              type='password'
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder='••••••••'
              required
            />
          </div>

          {showConfirmedMessage && (
            <div className={styles.success}>
              ✓ EMAIL CONFIRMED! Login to continue.
            </div>
          )}

          {error && <div className={styles.error}>{error}</div>}

          <button
            type='submit'
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'LOGGING IN...' : 'LOGIN'}
          </button>

          <div className={styles.switchPrompt}>
            New operator?{' '}
            <button
              type='button'
              onClick={onSwitchToRegister}
              className={styles.switchButton}
            >
              REGISTER
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
