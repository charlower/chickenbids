# How to Use AppContext

## Setup Complete! ✅

The `AppProvider` is now wrapping your entire app in `layout.tsx`.

---

## Using the Context in Components

### Import the hook:

```typescript
import { useApp } from '@/lib/contexts/AppContext';
```

### Access data:

```typescript
function MyComponent() {
  const { user, player, credits, products, isLoading } = useApp();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {player ? (
        <div>
          <p>Welcome @{player.callsign}</p>
          <p>Level: {player.level}</p>
          <p>XP: {player.xp}</p>
          <p>Credits: {credits}</p>
        </div>
      ) : (
        <button>Login</button>
      )}
    </div>
  );
}
```

---

## What's Available

### Auth State

- `user` - Supabase User object (or null if logged out)
- `isLoading` - Boolean, true while checking auth

### Player Profile

- `player.callsign` - Username (@charlie)
- `player.email` - Email address
- `player.level` - Current level (1-50)
- `player.xp` - Experience points
- `player.total_spent` - Lifetime spending
- `player.auctions_won` - Number of wins
- `player.total_bids` - Number of bids
- `player.marketing_opt_in` - SMS/email preference

### Credits

- `credits` - Current credit balance (0 or 1)

### Products

- `products` - Array of all active products with images

### Actions

- `refreshProfile()` - Manually refresh player data
- `refreshCredits()` - Manually refresh credits

---

## Example: Player Stats Module

Replace your mock data:

```typescript
// OLD (mock data)
const [player, setPlayer] = useState({ callsign: 'P1-420' });

// NEW (from context)
const { player, credits, isLoading } = useApp();

return (
  <div className={styles.playerModule}>
    {isLoading ? (
      <div>Loading...</div>
    ) : player ? (
      <>
        <div>Callsign: @{player.callsign}</div>
        <div>XP: {player.xp}</div>
        <div>Credits: {credits}</div>
      </>
    ) : (
      <button onClick={() => setLoginModalOpen(true)}>LOGIN</button>
    )}
  </div>
);
```

---

## Example: After Interstitial Ad

When user earns a credit:

```typescript
const { refreshCredits } = useApp();

const handleAdComplete = async () => {
  // Update credits in database
  await supabase.from('credits').update({ balance: 1 }).eq('user_id', user.id);

  // Refresh context
  await refreshCredits();

  // UI automatically updates!
};
```

---

## What Happens Automatically

### On Login:

1. ✅ `user` is set
2. ✅ `player` profile is fetched
3. ✅ `credits` are fetched
4. ✅ All components using `useApp()` re-render with real data

### On Logout:

1. ✅ `user` is cleared
2. ✅ `player` is cleared
3. ✅ `credits` reset to 0
4. ✅ All components update

### On Page Load:

1. ✅ Checks for existing session
2. ✅ Fetches profile if logged in
3. ✅ Loads all products

---

## Performance Notes

- ✅ Auth/user/products change **rarely** (good for context)
- ❌ Don't put auction price/countdown here (changes too often)
- ✅ Use `refreshProfile()` / `refreshCredits()` sparingly (causes re-render)

---

## Next Steps

1. Remove mock `player` state from `page.tsx`
2. Replace with `const { player } = useApp()`
3. Use `player?.callsign` in Player Stats
4. Use `credits` for credit display
5. Remove mock login logic
6. Remove `window.location.reload()` from verify modal
