// Fake enemy team for testing the overlay without a running game (`npm run demo`).
const startedAt = Date.now();

const players = [
  { champion: 'Darius', championKey: 'Darius', spells: ['SummonerFlash', 'SummonerTeleport'], itemIds: [] },
  { champion: 'Lee Sin', championKey: 'LeeSin', spells: ['SummonerFlash', 'SummonerSmite'], itemIds: [] },
  { champion: 'Ahri', championKey: 'Ahri', spells: ['SummonerFlash', 'SummonerDot'], itemIds: [3158] },
  { champion: "Kai'Sa", championKey: 'Kaisa', spells: ['SummonerFlash', 'SummonerHeal'], itemIds: [] },
  { champion: 'Thresh', championKey: 'Thresh', spells: ['SummonerFlash', 'SummonerExhaust'], itemIds: [3158] },
].map((p, i) => ({
  id: `demo${i}`,
  name: `Enemy ${i + 1}`,
  team: 'CHAOS',
  level: 6,
  ...p,
  spells: p.spells.map((key) => ({ key, name: key.replace('Summoner', '') })),
}));

module.exports = {
  fetchPlayers: async () => players,
  fetchGameTime: async () => (Date.now() - startedAt) / 1000 + 600,
};
