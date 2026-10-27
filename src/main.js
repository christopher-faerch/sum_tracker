const path = require('path');
const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');

const DEMO = process.argv.includes('--demo');
const source = DEMO ? require('./demo') : require('./liveClient');

const PLAYER_POLL_MS = 5000;
const TIME_POLL_MS = 1000;
const TOGGLE_HOTKEY = 'Control+Shift+S';

// Numpad keys are unbound in League by default. Row n = n-th enemy in the overlay.
// Global shortcuts swallow the key, so pick keys the game doesn't need.
const SPELL_HOTKEYS = [1, 2, 3, 4, 5].map((n) => ({
  row: n - 1,
  flash: `num${n}`,
  other: `Control+num${n}`,
}));

let win;

function createWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  win = new BrowserWindow({
    width: 300,
    height: 80,
    x: workArea.x + workArea.width - 320,
    y: workArea.y + 200,
    frame: false,
    transparent: true,
    resizable: false,
    useContentSize: true,
    skipTaskbar: true,
    hasShadow: false,
    // Clicking the overlay must not steal keyboard focus from the game.
    focusable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  // 'screen-saver' keeps the window above borderless-fullscreen games.
  win.setAlwaysOnTop(true, 'screen-saver');
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

function send(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

async function pollPlayers() {
  try {
    send('players', await source.fetchPlayers());
  } catch {
    send('players', null);
  }
}

async function pollTime() {
  try {
    send('game-time', { gameTime: await source.fetchGameTime(), at: Date.now() });
  } catch {
    send('game-time', null);
  }
}

async function loadDataDragon() {
  const versions = await (await fetch('https://ddragon.leagueoflegends.com/api/versions.json')).json();
  const version = versions[0];
  const spells = await (
    await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/summoner.json`)
  ).json();
  const cooldowns = {};
  for (const spell of Object.values(spells.data)) cooldowns[spell.id] = spell.cooldown[0];
  return { version, cooldowns };
}

ipcMain.handle('data-dragon', async () => {
  try {
    return await loadDataDragon();
  } catch {
    return null;
  }
});

ipcMain.on('quit', () => app.quit());

// Fit the window to the panel so empty transparent space never blocks clicks in the game.
ipcMain.on('resize', (_e, height) => {
  if (win && !win.isDestroyed()) win.setContentSize(300, Math.ceil(height));
});

app.whenReady().then(() => {
  createWindow();
  globalShortcut.register(TOGGLE_HOTKEY, () => (win.isVisible() ? win.hide() : win.showInactive()));
  for (const { row, flash, other } of SPELL_HOTKEYS) {
    for (const [accelerator, spell] of [[flash, 'flash'], [other, 'other']]) {
      if (!globalShortcut.register(accelerator, () => send('hotkey', { row, spell }))) {
        console.warn(`Hotkey ${accelerator} is taken by another program`);
      }
    }
  }
  win.webContents.once('did-finish-load', () => {
    pollPlayers();
    pollTime();
    setInterval(pollPlayers, PLAYER_POLL_MS);
    setInterval(pollTime, TIME_POLL_MS);
  });
});

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => app.quit());
