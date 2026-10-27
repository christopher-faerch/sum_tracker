# Sum Tracker

Overlay for League of Legends that tracks enemy summoner spell cooldowns.

The enemy team, their spells and their items are read from Riot's local
[Live Client Data API](https://developer.riotgames.com/docs/lol#game-client-api)
(`https://127.0.0.1:2999`). That API does **not** expose when an enemy uses a spell,
so you press a hotkey (or click) when you see it used and the overlay counts down.

## Setup

### 1. Install the requirements

- [Node.js](https://nodejs.org/) 18 or newer (LTS is fine)
- [Git](https://git-scm.com/)

Check that both work:

```bash
node -v
git --version
```

### 2. Download and install

```bash
git clone https://github.com/christopher-faerch/sum_tracker.git
cd sum_tracker
npm install
```

`npm install` downloads Electron (~100 MB), so the first run takes a minute.

### 3. Try it without a game

```bash
npm run demo
```

An overlay with a fake enemy team appears on the right side of your screen.
Press `Num1` or click a spell to start a timer.

### 4. Set up League

1. In League: **Settings → Video → Window Mode → Borderless**. Exclusive fullscreen hides the overlay.
2. Turn **Num Lock on**. The hotkeys use the numpad.

### 5. Play

```bash
npm start
```

Start it before or during a game. It shows "Waiting for a game…" until the game has loaded,
then fills in the enemy team by itself.

## Controls

| Action | Effect |
| --- | --- |
| `Num1`–`Num5` | Start Flash for enemy 1–5 (the number left of each row) |
| `Ctrl+Num1`–`Ctrl+Num5` | Start the other spell for enemy 1–5 |
| Left-click spell | Start cooldown (click again to restart) |
| Right-click spell | Clear cooldown |
| `CI` button | Toggle Cosmic Insight for that enemy (+18 summoner spell haste) |
| Drag header | Move the overlay |
| `Ctrl+Shift+S` | Hide / show |

Clicking the overlay does not take keyboard focus from the game.

Hotkeys are global, so the game never sees those keys;
change `SPELL_HOTKEYS` in `src/main.js` if you need them for something else.
Enemies without Flash: `NumN` starts their first spell.

## How cooldowns are calculated

`cooldown = base × 100 / (100 + summoner spell haste)`

- Base cooldowns come from Data Dragon for the latest patch (fallback table in `src/renderer/app.js`).
- Ionian Boots of Lucidity are detected from the enemy's items.
- Cosmic Insight is invisible to the API for enemies, so it is a manual toggle.
- Haste values change between patches. Check `SPELL_HASTE_BY_ITEM` and `COSMIC_INSIGHT_HASTE` in `src/renderer/app.js`.

Smite tracks one charge (90 s). Not handled yet: Teleport scaling with level, Smite's second charge.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Overlay is hidden behind the game | Switch League to **Borderless** |
| Stuck on "Waiting for a game…" | The API only runs once you are in the game itself, not in the lobby or loading screen |
| Hotkeys do nothing | Turn on Num Lock. Another program may own the key; check the terminal for "Hotkey … is taken" |
| No icons, only names | Data Dragon could not be reached; timers still work with built-in cooldowns |

## Riot policy

This tool only uses Riot's official Live Client Data API and never reads game memory.
Riot's rules on cooldown-tracking overlays are not clear-cut, and Riot banned enemy
ultimate timers in third-party apps in 2025. Check Riot's
[Third Party Applications](https://support-leagueoflegends.riotgames.com/hc/en-us/articles/225266848-Third-Party-Applications)
page before using it outside custom games. Use at your own risk.

Sum Tracker isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games
or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all
associated properties are trademarks or registered trademarks of Riot Games, Inc.

## Files

- `src/main.js` – overlay window, polling, hotkeys, Data Dragon
- `src/liveClient.js` – Live Client Data API
- `src/demo.js` – fake data for `npm run demo`
- `src/renderer/` – overlay UI and timer logic
