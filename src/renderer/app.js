// Summoner spell haste sources. Values change between patches – verify on the current patch.
const SPELL_HASTE_BY_ITEM = { 3158: 10 }; // Ionian Boots of Lucidity
const COSMIC_INSIGHT_HASTE = 18;

// Used when Data Dragon can't be reached (seconds, level 1).
const FALLBACK_COOLDOWNS = {
  SummonerFlash: 300,
  SummonerDot: 180,
  SummonerHeal: 240,
  SummonerBarrier: 180,
  SummonerExhaust: 240,
  SummonerBoost: 210,
  SummonerHaste: 240,
  SummonerTeleport: 360,
  SummonerSmite: 90,
};

// Data Dragon values that don't match what you want to track.
const COOLDOWN_OVERRIDES = {
  SummonerSmite: 90, // Data Dragon lists the 15 s recast lockout, not the charge time
};

const state = {
  ddragon: null,
  players: [],
  signature: '',
  time: null, // { gameTime, at }
  timers: new Map(), // "playerId:slot" -> game second when the spell is ready again
  cosmicInsight: new Set(),
};

const $players = document.getElementById('players');
const $status = document.getElementById('status');
const $clock = document.getElementById('clock');

function now() {
  if (!state.time) return null;
  return state.time.gameTime + (Date.now() - state.time.at) / 1000;
}

function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function itemHaste(player) {
  return player.itemIds.reduce((sum, id) => sum + (SPELL_HASTE_BY_ITEM[id] || 0), 0);
}

function haste(player) {
  return itemHaste(player) + (state.cosmicInsight.has(player.id) ? COSMIC_INSIGHT_HASTE : 0);
}

function cooldown(player, spellKey) {
  const base =
    COOLDOWN_OVERRIDES[spellKey] ??
    state.ddragon?.cooldowns[spellKey] ??
    FALLBACK_COOLDOWNS[spellKey] ??
    300;
  return (base * 100) / (100 + haste(player));
}

function startTimer(player, slot) {
  const t = now();
  if (t == null) return;
  state.timers.set(`${player.id}:${slot}`, t + cooldown(player, player.spells[slot].key));
  tick();
}

function iconUrl(kind, key) {
  if (!state.ddragon || !key) return null;
  return `https://ddragon.leagueoflegends.com/cdn/${state.ddragon.version}/img/${kind}/${key}.png`;
}

function render() {
  $players.replaceChildren(
    ...state.players.map((player, row) => {
      const li = document.createElement('li');
      li.className = 'player';

      const key = document.createElement('span');
      key.className = 'hotkey';
      key.textContent = row + 1;
      key.title = `Num${row + 1}: Flash · Ctrl+Num${row + 1}: other spell`;
      li.append(key);

      const champ = document.createElement('img');
      champ.className = 'champ';
      champ.title = player.champion;
      const champSrc = iconUrl('champion', player.championKey);
      if (champSrc) champ.src = champSrc;
      li.append(champ);

      const name = document.createElement('div');
      name.className = 'champ-name';
      name.textContent = player.champion;
      if (itemHaste(player) > 0) {
        const boots = document.createElement('div');
        boots.className = 'boots';
        boots.textContent = 'Lucidity boots';
        name.append(boots);
      }
      li.append(name);

      const ci = document.createElement('button');
      ci.className = 'ci' + (state.cosmicInsight.has(player.id) ? ' on' : '');
      ci.textContent = 'CI';
      ci.title = 'Cosmic Insight (+18 summoner spell haste)';
      ci.onclick = () => {
        if (state.cosmicInsight.has(player.id)) state.cosmicInsight.delete(player.id);
        else state.cosmicInsight.add(player.id);
        render();
      };
      li.append(ci);

      player.spells.forEach((spell, slot) => {
        const btn = document.createElement('button');
        btn.className = 'spell';
        btn.dataset.timer = `${player.id}:${slot}`;
        btn.title = spell.name;
        const src = iconUrl('spell', spell.key);
        if (src) btn.style.backgroundImage = `url("${src}")`;
        else btn.textContent = spell.name;
        const time = document.createElement('span');
        time.className = 'time';
        btn.append(time);
        btn.onclick = () => startTimer(player, slot);
        btn.oncontextmenu = (e) => {
          e.preventDefault();
          state.timers.delete(btn.dataset.timer);
          tick();
        };
        li.append(btn);
      });

      return li;
    }),
  );
  tick();
}

function tick() {
  const t = now();
  $clock.textContent = t == null ? '--:--' : formatTime(t);
  for (const btn of $players.querySelectorAll('.spell')) {
    const readyAt = state.timers.get(btn.dataset.timer);
    const label = btn.querySelector('.time');
    if (readyAt == null || t == null || t >= readyAt) {
      if (readyAt != null && t != null) {
        // Just came off cooldown.
        state.timers.delete(btn.dataset.timer);
        btn.classList.remove('ready-flash');
        void btn.offsetWidth; // restart the animation
        btn.classList.add('ready-flash');
      }
      btn.classList.remove('cooling');
      label.textContent = '';
    } else {
      btn.classList.add('cooling');
      label.textContent = formatTime(readyAt - t);
    }
  }
}

window.tracker.onPlayers((players) => {
  if (!players) {
    state.players = [];
    state.signature = '';
    $status.textContent = 'Waiting for a game…';
    $players.replaceChildren();
    return;
  }
  $status.textContent = '';
  // Re-render only when the enemy team or their items change, so clicks aren't lost.
  const signature = JSON.stringify(players.map((p) => [p.id, p.championKey, p.itemIds]));
  if (signature === state.signature) return;
  const newGame = state.players.map((p) => p.id).join() !== players.map((p) => p.id).join();
  if (newGame) {
    state.timers.clear();
    state.cosmicInsight.clear();
  }
  state.players = players;
  state.signature = signature;
  render();
});

// Num1-5 starts Flash (or the first spell if they don't run Flash); Ctrl+Num1-5 the other one.
window.tracker.onHotkey(({ row, spell }) => {
  const player = state.players[row];
  if (!player) return;
  const flashSlot = Math.max(0, player.spells.findIndex((s) => s.key === 'SummonerFlash'));
  startTimer(player, spell === 'flash' ? flashSlot : 1 - flashSlot);
});

window.tracker.onGameTime((time) => {
  state.time = time;
});

document.getElementById('quit').onclick = () => window.tracker.quit();

const $panel = document.getElementById('panel');
new ResizeObserver(() => window.tracker.resize($panel.offsetHeight)).observe($panel);

window.tracker.dataDragon().then((ddragon) => {
  state.ddragon = ddragon;
  if (!ddragon) console.warn('Data Dragon unavailable – using fallback cooldowns, no icons');
  render();
});

setInterval(tick, 250);
