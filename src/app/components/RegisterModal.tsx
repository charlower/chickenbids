import { motion } from 'framer-motion';
import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import styles from './AuthModal.module.css';

type RegisterModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
  onSuccess: () => void;
};

const RESERVED_USERNAMES = [
  'admin',
  'administrator',
  'support',
  'moderator',
  'mod',
  'chickenbids',
  'official',
  'staff',
  'team',
  'system',
  'root',
  'superuser',
  'bot',
  'api',
  'help',
  'service',
  'customer',
  'billing',
];

export default function RegisterModal({
  isOpen,
  onClose,
  onSwitchToLogin,
  onSuccess,
}: RegisterModalProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    // Only allow alphanumeric and underscore
    const sanitized = value.replace(/[^a-z0-9_]/g, '');
    setUsername(sanitized);
  };

  const formatPhone = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');

    // Format as 04XX XXX XXX
    if (digits.length <= 4) {
      return digits;
    } else if (digits.length <= 7) {
      return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    } else {
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(
        7,
        10
      )}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 6) {
      return 'Password must be at least 6 characters';
    }
    if (!/[A-Za-z]/.test(pwd)) {
      return 'Password must contain a letter';
    }
    if (!/[0-9]/.test(pwd)) {
      return 'Password must contain a number';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (username.length < 3 || username.length > 20) {
      setError('Username must be 3-20 characters');
      return;
    }
    if (!/^[a-z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }
    if (RESERVED_USERNAMES.includes(username)) {
      setError('This username is reserved');
      return;
    }
    if (!email.includes('@')) {
      setError('Invalid email address');
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    const phoneDigits = phone.replace(/\D/g, '');
    if (
      phoneDigits &&
      (!phoneDigits.startsWith('04') || phoneDigits.length !== 10)
    ) {
      setError('Invalid Australian phone number');
      return;
    }
    if (!agreeTerms) {
      setError('You must agree to Terms & Privacy');
      return;
    }

    setLoading(true);

    try {
      // Check if username already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single();

      if (existingProfile) {
        setError('Username already taken');
        setLoading(false);
        return;
      }

      // Sign up with Supabase (email + password)
      // Store username in metadata - profile will be created after email confirmation
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            phone,
            marketing_opt_in: agreeMarketing,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // Success - user needs to confirm email
      // Profile will be auto-created by database trigger when they confirm
      setLoading(false);
      setSuccess(true);

      // Close modal and show instructions
      setTimeout(() => {
        onSuccess();
      }, 4000);
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
        <button
          type='button'
          className={styles.closeButton}
          onClick={onClose}
          aria-label='Close'
        >
          ×
        </button>

        <div className={styles.header}>&gt;&gt; REGISTRATION &lt;&lt;</div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>USERNAME</label>
            <div className={styles.inputWrapper}>
              <span className={styles.prefix}>@</span>
              <input
                type='text'
                className={styles.inputWithPrefix}
                value={username}
                onChange={handleUsernameChange}
                placeholder='callsign'
                maxLength={20}
                autoFocus
                required
              />
            </div>
            <div className={styles.hint}>
              Your callsign (3-20 chars, letters/numbers/underscore only)
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>EMAIL</label>
            <input
              type='email'
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder='player@example.com'
              required
            />
            <div className={styles.hint}>For login and updates</div>
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
            <div className={styles.hint}>
              Min 6 chars, must include letters and numbers
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>PHONE (AU) - OPTIONAL</label>
            <input
              type='tel'
              className={styles.input}
              value={phone}
              onChange={handlePhoneChange}
              placeholder='04XX XXX XXX'
            />
            <div className={styles.hint}>For payment notifications</div>
          </div>

          <div className={styles.checkboxGroup}>
            <label className={styles.checkbox}>
              <input
                type='checkbox'
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                required
              />
              <span>
                I agree to{' '}
                <a href='/terms' target='_blank' className={styles.link}>
                  Terms
                </a>{' '}
                &{' '}
                <a href='/privacy' target='_blank' className={styles.link}>
                  Privacy
                </a>
              </span>
            </label>

            <label className={styles.checkbox}>
              <input
                type='checkbox'
                checked={agreeMarketing}
                onChange={(e) => setAgreeMarketing(e.target.checked)}
              />
              <span>Send me auction intel and updates</span>
            </label>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          {success && (
            <div className={styles.success}>
              ACCOUNT CREATED! Check your email to confirm and login. Please
              check your spam folder if you don&apos;t see it.
            </div>
          )}

          <button
            type='submit'
            className={styles.submitButton}
            disabled={loading || success}
          >
            {loading
              ? 'CREATING ACCOUNT...'
              : success
                ? 'CHECK YOUR EMAIL'
                : 'REGISTER'}
          </button>

          <div className={styles.switchPrompt}>
            Already registered?{' '}
            <button
              type='button'
              onClick={onSwitchToLogin}
              className={styles.switchButton}
            >
              LOG IN
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
