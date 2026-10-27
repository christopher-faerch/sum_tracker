// Reads Riot's Live Client Data API, which only runs while a game is in progress.
// https://developer.riotgames.com/docs/lol#game-client-api
const https = require('https');

const BASE = 'https://127.0.0.1:2999/liveclientdata';

// The game serves a self-signed certificate on localhost only.
const agent = new https.Agent({ rejectUnauthorized: false });

function getJson(path) {
  return new Promise((resolve, reject) => {
    const req = https.get(`${BASE}${path}`, { agent, timeout: 1500 }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

// "GeneratedTip_SummonerSpell_SummonerFlash_DisplayName" -> "SummonerFlash"
function spellKey(spell) {
  const match = /SummonerSpell_(\w+?)_DisplayName/.exec(spell?.rawDisplayName || '');
  return match ? match[1] : null;
}

// "game_character_displayname_Kaisa" -> "Kaisa"
function championKey(player) {
  const match = /displayname_(\w+)/.exec(player.rawChampionName || '');
  return match ? match[1] : player.championName.replace(/[^A-Za-z]/g, '');
}

function toPlayer(p) {
  return {
    id: p.riotId || p.summonerName,
    name: p.riotIdGameName || p.summonerName,
    champion: p.championName,
    championKey: championKey(p),
    team: p.team,
    level: p.level,
    itemIds: (p.items || []).map((i) => i.itemID),
    spells: [p.summonerSpells?.summonerSpellOne, p.summonerSpells?.summonerSpellTwo].map((s) => ({
      key: spellKey(s),
      name: s?.displayName || '?',
    })),
  };
}

async function fetchPlayers() {
  const [activeName, players] = await Promise.all([
    getJson('/activeplayername'),
    getJson('/playerlist'),
  ]);
  const me = players.find((p) => p.riotId === activeName || p.summonerName === activeName);
  const myTeam = me ? me.team : 'ORDER';
  return players.filter((p) => p.team !== myTeam).map(toPlayer);
}

async function fetchGameTime() {
  const stats = await getJson('/gamestats');
  return stats.gameTime;
}

module.exports = { fetchPlayers, fetchGameTime };
