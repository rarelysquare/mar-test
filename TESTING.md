# Testing Guide

Two tools cover all test scenarios:

- **Admin Players page** (`/admin/players`) — manipulate player state and open the game as any player
- **Debug Panel** — a 🧪 button in the bottom-right corner of `/play`, only visible when you're logged in as admin

---

## Setup

1. Sign in at `/admin/login`
2. Go to `/admin/players`
3. Create a test player if you don't have one (just enter a name at `adelina-game.com` and play once, or use any existing player)

---

## Use Cases

### 1. New user (never played)

**What to look for:** No status pill, no streak, greeting says "Good evening/Welcome back, [name]"

**Steps:**
1. Go to `/admin/players`
2. Click **Delete** on a test player to fully remove them, then go to the game homepage and create a fresh player — OR —
3. Find an existing test player, click **↺ Reset today**, then use **▶ Play as** to open the game

> To simulate true zero-history, delete and re-create the player. ↺ Reset today only removes today's session — past sessions remain.

---

### 2. Existing user who hasn't played yet today

**What to look for:** Status pill says "Today's question is waiting for you", greeting says "Good evening/Welcome back, [name]"

**Steps:**
1. Go to `/admin/players`
2. Find your test player (they should have ≥ 1 past day played; add dummy sessions if needed — see below)
3. Click **↺ Reset today** to clear today's session
4. Click **▶ Play as** → game opens in new tab showing the waiting state

---

### 3. Existing user — mid-play (question visible, not yet answered)

**What to look for:** The question screen itself

**Steps:**
1. Follow steps for "hasn't played yet today" above
2. In the new tab, click **Play today's question**

---

### 4. Completed today's question

**What to look for:** Greeting says "Thanks for playing, [name]", media reward shows, share button behavior depends on days played

**Steps:**
1. Follow "hasn't played yet today" steps
2. In the new tab, answer the question
3. Click **← back** or navigate to `/play` to see the completed home state

**OR** (faster — just reset and re-complete):
1. ↺ Reset today in `/admin/players`
2. ▶ Play as → answer the question

---

### 5. Player with < 3 days played (Share CTA at top)

**What to look for:** After completing, share button appears near the top of the page (below greeting)

**Steps:**
1. Make sure your test player has 1–2 days played total (check the "X days played" stat in `/admin/players`)
2. If they have too many, delete and recreate them, or create a fresh test player
3. Complete today's question → share button appears at top

---

### 6. Player with 3+ days played (Share CTA below video)

**What to look for:** After completing, share button appears below the video/photo and save button

**Steps:**
1. In `/admin/players`, find your test player
2. In the **Add N past days** field, type `3` and click **+** (this inserts 3 dummy past sessions)
3. Click **↺ Reset today** (so they can play today again)
4. Click **▶ Play as** → answer the question → share button now appears below the media

---

### 7. Day UX vs Night UX

**What to look for:** Greeting changes between "Good evening" and "Welcome back". Night illustrations (sleeping) vs day illustrations.

**Steps:**
1. Sign in to admin, then go to `/play` as any player
2. Look for the 🧪 button in the bottom-right corner
3. Click it to open the Debug Panel
4. Under **Time of day**, click ☀️ Day or 🌙 Night — the greeting and illustration pool update instantly

---

### 8. Different illustrations

**What to look for:** The hero illustration at the top of `/play` changes

**Steps:**
1. Open the 🧪 Debug Panel on `/play`
2. Under **Illustration**, use the **‹** and **›** arrows to cycle through every active illustration
3. The name of the current illustration is shown between the arrows
4. Index shows your position in the full list (e.g. "3 / 21")

> To add, remove, or rename illustrations, go to `/admin/illustrations`

---

### 9. Specific question (not just today's auto-selected one)

**What to look for:** A particular question appears when the player starts playing

**Steps:**
1. Go to `/admin/questions` and find the question you want to test — note its ID (shown in the list)
2. Open the 🧪 Debug Panel on `/play`
3. Under **Question ID override**, type the question ID and click **Set**
4. A yellow notice will confirm the override is active
5. Click **Play today's question** — that specific question will load
6. To clear the override, click **✕** next to the input — the game returns to normal question selection

> The question override is stored in `sessionStorage` — it clears automatically when you close the tab.

---

### 10. Reset today's session (from the Debug Panel)

**What to look for:** Page reloads to the "hasn't played yet today" state

**Steps:**
1. Complete a question as a test player
2. On `/play`, open the 🧪 Debug Panel
3. Click **↺ Reset today's session** — the page status refreshes and shows the Play button again

> This is the same as clicking ↺ Reset today in `/admin/players`, just faster when you're already on the play page.

---

## Quick Reference

| Goal | Where |
|---|---|
| Open game as specific player | `/admin/players` → ▶ Play as |
| Clear today's session | `/admin/players` → ↺ Reset today, or 🧪 panel → ↺ Reset today's session |
| Simulate N past days | `/admin/players` → Add N past days field |
| Toggle day/night | 🧪 panel → Time of day |
| Cycle illustrations | 🧪 panel → Illustration ‹ › |
| Force a specific question | 🧪 panel → Question ID override |
| Fully delete a player | `/admin/players` → Delete |
