import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import WrestlerGridPicker from './WrestlerGridPicker';
import { calculateMedalBonuses, StrapConfigOverlay } from './StrapConfig';

const GEM_COLORS = {
  Red:    { bg: 'rgba(255,60,60,0.2)', border: 'rgba(255,60,60,0.3)', text: '#ff6b6b', cls: 'red' },
  Blue:   { bg: 'rgba(76,111,255,0.2)', border: 'rgba(76,111,255,0.3)', text: '#6b90ff', cls: 'blue' },
  Green:  { bg: 'rgba(60,200,80,0.2)', border: 'rgba(60,200,80,0.3)', text: '#4bde68', cls: 'green' },
  Yellow: { bg: 'rgba(255,220,60,0.2)', border: 'rgba(255,220,60,0.3)', text: '#ffd740', cls: 'yellow' },
  Black:  { bg: 'rgba(180,180,180,0.08)', border: 'rgba(255,255,255,0.1)', text: '#aaa', cls: 'black' },
  Purple: { bg: 'rgba(160,76,255,0.2)', border: 'rgba(160,76,255,0.3)', text: '#c084fc', cls: 'purple' },
};

const GEM_ORDER = ['Red', 'Blue', 'Green', 'Yellow', 'Black', 'Purple'];

const parseRarity = (rarity = '') => {
  const m = rarity.match(/(\d+)★\s*(Bronze|Silver|Gold)/i);
  return m ? { stars: parseInt(m[1]), tier: m[2] } : { stars: 1, tier: 'Bronze' };
};

const getStarKeys = (tierData) =>
  Object.keys(tierData || {}).sort((a, b) => Number(a.split('_')[0]) - Number(b.split('_')[0]));

const normaliseStats = (raw = {}) => {
  const MAP = {
    hp: 'HP', HP: 'HP', red: 'Red', Red: 'Red', blue: 'Blue', Blue: 'Blue',
    green: 'Green', Green: 'Green', yellow: 'Yellow', Yellow: 'Yellow',
    black: 'Black', Black: 'Black', purple: 'Purple', Purple: 'Purple',
    talentscore: 'TalentScore', TalentScore: 'TalentScore', talentScore: 'TalentScore',
  };
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const c = MAP[k] ?? MAP[k.toLowerCase()] ?? k;
    if (typeof v === 'number') out[c] = v;
  }
  return out;
};

const CLASS_ADVANTAGE = {
  'Color_Black': 'Color_Green',  // Striker > Technician
  'Color_Green': 'Color_Blue',   // Technician > Acrobat
  'Color_Blue': 'Color_Black',   // Acrobat > Striker
  'Color_Red': 'Color_Purple',   // Powerhouse > Trickster
  'Color_Purple': 'Color_Yellow',// Trickster > Showboat
  'Color_Yellow': 'Color_Red',   // Showboat > Powerhouse
};

const DamageCalculator = ({ roster = [], unrecruitedWrestlers = [] }) => {
  const [playerId, setPlayerId] = useState('');
  const [oppId, setOppId] = useState('');

  const allWrestlers = useMemo(() => {
    const list = [...roster, ...unrecruitedWrestlers];
    const seen = new Set();
    return list.filter(w => {
      const id = String(w.wrestlerId ?? w.ID ?? w.superstarId ?? w.groupId ?? w._id ?? '');
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    }).sort((a,b) => {
      const aName = a.wrestlerName || a.name || a.title || 'Unknown Wrestler';
      const bName = b.wrestlerName || b.name || b.title || 'Unknown Wrestler';
      return aName.localeCompare(bName);
    });
  }, [roster, unrecruitedWrestlers]);

  const player = useMemo(() => {
    if (!playerId) return roster[0] || null;
    return roster.find(w => {
      const id = String(w.wrestlerId ?? w.ID ?? w.superstarId ?? w.groupId ?? w._id ?? w.id ?? '');
      return id === playerId || String(w._id) === playerId;
    }) || roster[0] || null;
  }, [roster, playerId]);

  const opponent = useMemo(() => {
    if (!oppId) return null;
    return allWrestlers.find(w => {
      const id = String(w.wrestlerId ?? w.ID ?? w.superstarId ?? w.groupId ?? w._id ?? '');
      return id === oppId;
    });
  }, [allWrestlers, oppId]);

  const [oppStrap, setOppStrap] = useState({ equipped: false, rarity: 'Rare', boostType: 'Gem Damage', gemBuff: 0, isPercentage: true, medals: [] });
  const [isEditingOppStrap, setIsEditingOppStrap] = useState(false);

  const [playerLevel, setPlayerLevel] = useState(1);
  const [oppLevel, setOppLevel] = useState(1);
  const [myHypeOverride, setMyHypeOverride] = useState('');
  const [oppHypeOverride, setOppHypeOverride] = useState(1);
  
  const [oppStars, setOppStars] = useState(1);
  const [oppTier, setOppTier] = useState('Bronze');

  const [playerApi, setPlayerApi] = useState(null);
  const [oppApi, setOppApi] = useState(null);
  const [loading, setLoading] = useState(false);
  const [playerError, setPlayerError] = useState('');
  const [oppError, setOppError] = useState('');

  const pctOptions = Array.from({ length: 20 }, (_, i) => (i + 1) * 10);

  // Get best possible key for guide API
  // Get best possible key for guide API
  // groupId is what the WWE superstar-guide API actually uses
  const getGuideKey = (wrestler) => {
    if (!wrestler) return null;
    return (
      // Old full-wrestlerData format (pre-sync)
      wrestler.wrestlerData?.groupId ||
      wrestler.wrestlerData?.ID ||
      wrestler.wrestlerData?.superstarId ||
      // Root fields from external API wrestlers
      wrestler.groupId ||
      wrestler.ID ||
      wrestler.superstarId ||
      // DB roster field (stored from superstarId at add-time)
      wrestler.wrestlerId ||
      wrestler.id ||
      null
    );
  };

  // Player (You)
  useEffect(() => {
    if (!player) return;
    const key = getGuideKey(player);
    if (!key) {
      setPlayerError('Could not resolve a guide API key for your wrestler.');
      return;
    }
    setPlayerError('');
    setLoading(true);
    api.get(`/wrestlers/guide/${key}`)
      .then(res => {
        const data = res.data?.data || null;
        setPlayerApi(data);
        if (!data) setPlayerError(`Guide returned no data for key: ${key}`);
      })
      .catch(err => {
        const status = err.response?.status;
        console.error(`Player guide failed for key=${key} | status=${status}`);
        setPlayerError(`Guide load failed (${status || 'network error'}) for key: ${key}`);
        setPlayerApi(null);
      })
      .finally(() => setLoading(false));
  }, [player]);

  // Opponent - Safe & Defensive
  useEffect(() => {
    if (!opponent) {
      setOppApi(null);
      setOppError('');
      return;
    }

    const key = getGuideKey(opponent);
    if (!key || String(key).trim() === '' || String(key) === '0') {
      setOppError("This wrestler has invalid ID. Cannot load detailed stats.");
      setOppApi(null);
      return;
    }

    setLoading(true);
    setOppError('');

    api.get(`/wrestlers/guide/${key}`)
      .then(res => {
        setOppApi(res.data?.data || null);
        setOppError('');
      })
      .catch(err => {
        const status = err.response?.status;
        console.error(`Guide API failed for key=${key} | Status:`, status);

        if (status === 404) {
          setOppError("Wrestler guide not found (404). This wrestler may not have full data yet.");
        } else if (status === 500) {
          setOppError("Server error (500) loading this wrestler. Try another one.");
        } else {
          setOppError("Failed to load wrestler data.");
        }
        setOppApi(null);
      })
      .finally(() => setLoading(false));
  }, [opponent]);

  useEffect(() => { if (player) setPlayerLevel(player.level || 1); }, [player]);
  useEffect(() => { 
    if (opponent) {
      setOppLevel(opponent.level || 10);
      const parsed = parseRarity(opponent.rarity || '');
      setOppStars(parsed.stars || 1);
      setOppTier(parsed.tier || 'Bronze');
      setOppHypeOverride(opponent.hypeLevel || 1);
    } 
  }, [opponent]);

  // Stats with fallback
  const playerData = useMemo(() => {
    if (!playerApi || !player) return { baseStats: {}, abilities: [] };
    const { stars, tier } = parseRarity(player.rarity);
    const tierData = playerApi[tier] || playerApi.Bronze || {};
    const keys = getStarKeys(tierData);
    const activeKey = keys.filter(k => k.startsWith(`${stars}_`)).pop() || keys[keys.length - 1] || '';
    const sec = tierData[activeKey] || {};
    const row = sec.Stats?.find(s => s.level === playerLevel) || sec.Stats?.[0] || {};
    return {
      baseStats: normaliseStats(row.stats || {}),
      abilities: sec.Abilities || [],
    };
  }, [playerApi, player, playerLevel]);

  const playerMoves = useMemo(() => {
    if (!player || !playerData.abilities.length) return [];
    const ids = player.equippedMoves || [];
    return ids.map(id => playerData.abilities.find(a => a.ID === id))
      .filter(Boolean)
      .map(ability => {
        const levels = [...(ability.levels || [])].sort((a, b) => a.level - b.level);
        return { ...ability, activeLevel: levels[levels.length - 1] };
      });
  }, [playerData.abilities, player]);

  const oppData = useMemo(() => {
    if (!oppApi || !opponent) return { baseStats: {}, abilities: [] };
    const tierData = oppApi[oppTier] || oppApi.Bronze || {};
    const keys = getStarKeys(tierData);
    const activeKey = keys.filter(k => k.startsWith(`${oppStars}_`)).pop() || keys[keys.length - 1] || '';
    const sec = tierData[activeKey] || {};
    const row = sec.Stats?.find(s => s.level === oppLevel) || sec.Stats?.[0] || {};
    return {
      baseStats: normaliseStats(row.stats || {}),
      abilities: sec.Abilities || [],
    };
  }, [oppApi, opponent, oppStars, oppTier, oppLevel]);

  const oppMoves = useMemo(() => {
    return oppData.abilities.slice(0, 3).map(ability => {
      const levels = [...(ability.levels || [])].sort((a, b) => a.level - b.level);
      return { ...ability, activeLevel: levels[levels.length - 1] };
    });
  }, [oppData.abilities]);

  // Hype & Class Advantage Logic
  const myHype = myHypeOverride !== '' ? Number(myHypeOverride) : (player?.hypeLevel || 1);
  const oppHype = Number(oppHypeOverride) || 1;
  const hypeDiff = myHype - oppHype;

  // Power swing: 30% per level diff
  // If we are +1 Hype, we deal 130% damage and take 70% damage (relative)
  const hypeDmgMult = 1 + (hypeDiff * 0.3);
  const hypeDefMult = 1 - (hypeDiff * 0.3);

  const myClassCode = player?.wrestlerData?.class ?? player?.wrestlerData?.Class ?? player?.wrestlerData?.color;
  const oppClassCode = opponent?.class ?? opponent?.Class ?? opponent?.color;

  const hasClassAdvantage = CLASS_ADVANTAGE[myClassCode] === oppClassCode;
  const hasClassDisadvantage = CLASS_ADVANTAGE[oppClassCode] === myClassCode;

  // Class advantage = ~50% swing (let's say 25% dmg bonus and 25% def bonus)
  const classDmgMult = hasClassAdvantage ? 1.25 : hasClassDisadvantage ? 0.8 : 1.0;
  const classDefMult = hasClassAdvantage ? 0.8 : hasClassDisadvantage ? 1.25 : 1.0;

  const myStrap = player?.strap;
  const myBonuses = useMemo(() => {
    if (!myStrap?.equipped) return { gemDamageMult: 0, moveDamageMult: 0, gemDefenseFlat: 0, moveDefenseFlat: 0, stats: {} };
    const base = calculateMedalBonuses(myStrap.medals || []);
    if (myStrap.boostType === 'Gem Damage' && myStrap.gemBuff) {
       base.gemDamageMult += (myStrap.isPercentage ? myStrap.gemBuff / 100 : 0);
    }
    if (myStrap.boostType === 'Move Damage' && myStrap.gemBuff) {
       base.moveDamageMult += (myStrap.isPercentage ? myStrap.gemBuff / 100 : 0);
    }
    if (myStrap.boostType === 'Gem Defense' && myStrap.gemBuff && !myStrap.isPercentage) {
       base.gemDefenseFlat += myStrap.gemBuff;
    }
    if (myStrap.boostType === 'Move Defense' && myStrap.gemBuff && !myStrap.isPercentage) {
       base.moveDefenseFlat += myStrap.gemBuff;
    }
    return base;
  }, [myStrap]);

  const oppBonuses = useMemo(() => {
    if (!oppStrap?.equipped) return { gemDamageMult: 0, moveDamageMult: 0, gemDefenseFlat: 0, moveDefenseFlat: 0, stats: {} };
    const base = calculateMedalBonuses(oppStrap.medals || []);
    if (oppStrap.boostType === 'Gem Damage' && oppStrap.gemBuff) {
       base.gemDamageMult += (oppStrap.isPercentage ? oppStrap.gemBuff / 100 : 0);
    }
    if (oppStrap.boostType === 'Move Damage' && oppStrap.gemBuff) {
       base.moveDamageMult += (oppStrap.isPercentage ? oppStrap.gemBuff / 100 : 0);
    }
    if (oppStrap.boostType === 'Gem Defense' && oppStrap.gemBuff && !oppStrap.isPercentage) {
       base.gemDefenseFlat += oppStrap.gemBuff;
    }
    if (oppStrap.boostType === 'Move Defense' && oppStrap.gemBuff && !oppStrap.isPercentage) {
       base.moveDefenseFlat += oppStrap.gemBuff;
    }
    return base;
  }, [oppStrap]);

  // Total Mults
  const finalMyGemDmgMult = (1 + myBonuses.gemDamageMult) * hypeDmgMult * classDmgMult;
  const finalMyMoveDmgMult = (1 + myBonuses.moveDamageMult) * hypeDmgMult * classDmgMult;
  
  const finalOppGemDmgMult = (1 + oppBonuses.gemDamageMult) * (1 / hypeDmgMult) * (1 / classDmgMult);
  const finalOppMoveDmgMult = (1 + oppBonuses.moveDamageMult) * (1 / hypeDmgMult) * (1 / classDmgMult);

  // Damage Calculations
  const myGemResults = useMemo(() => 
    GEM_ORDER.map(gem => {
      const base = playerData.baseStats[gem] || 0;
      let dealt = Math.round(base * finalMyGemDmgMult) - oppBonuses.gemDefenseFlat;
      if (dealt < 0) dealt = 1;
      return { gem, base, dealt };
    }).filter(r => r.base > 0),
    [playerData.baseStats, finalMyGemDmgMult, oppBonuses.gemDefenseFlat]
  );

  const myMoveResults = useMemo(() => 
    playerMoves.map(move => {
      const baseDam = move.activeLevel?.dam || 0;
      let dealt = Math.round(baseDam * finalMyMoveDmgMult) - oppBonuses.moveDefenseFlat;
      if (dealt < 0) dealt = 1;
      return { move, dam: baseDam, dealt };
    }),
    [playerMoves, finalMyMoveDmgMult, oppBonuses.moveDefenseFlat]
  );

  const oppGemResults = useMemo(() => 
    GEM_ORDER.map(gem => {
      const base = oppData.baseStats[gem] || 0;
      let dealt = Math.round(base * finalOppGemDmgMult) - myBonuses.gemDefenseFlat; 
      if (dealt < 0) dealt = 1;
      return { gem, base, dealt };
    }).filter(r => r.base > 0),
    [oppData.baseStats, finalOppGemDmgMult, myBonuses.gemDefenseFlat]
  );

  const oppMoveResults = useMemo(() => 
    oppMoves.map(move => {
      const baseDam = move.activeLevel?.dam || 0;
      let dealt = Math.round(baseDam * finalOppMoveDmgMult) - myBonuses.moveDefenseFlat;
      if (dealt < 0) dealt = 1;
      return { move, dam: baseDam, dealt };
    }),
    [oppMoves, finalOppMoveDmgMult, myBonuses.moveDefenseFlat]
  );

  const playerName = player?.wrestlerName || player?.wrestlerData?.name || 'You';
  const oppName = opponent?.name || opponent?.title || opponent?.wrestlerName || 'Opponent';

  return (
    <div className="damage-calculator">
      <h1>Damage Calculator — You vs Opponent</h1>

      <div className="vs-container">
        {/* YOU */}
        <div className="vs-side you-side">
          <h2>YOU</h2>
          {roster.length > 0 && (
            <WrestlerGridPicker 
              wrestlers={roster}
              selectedId={playerId || (player?._id ?? '')}
              onSelect={id => setPlayerId(id)}
              placeholder="Select Player from Roster"
            />
          )}
          {player && (
            <>
              <div className="wrestler-info">
                {player.wrestlerData?.image && <img src={player.wrestlerData.image} alt={playerName} />}
                <div>
                  <h3>{playerName}</h3>
                  <p>{player.rarity} • Lv {playerLevel}</p>
                  <p style={{fontSize:'11px', color:'#555', wordBreak:'break-all'}}>
                    Guide key: {getGuideKey(player) || '⚠ none'}
                  </p>
                </div>
              </div>
              <div className="roster-controls" style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '10px' }}>
                <label>Level: <input type="number" min="1" value={playerLevel} onChange={e => setPlayerLevel(Number(e.target.value))} style={{ width: '60px' }} /></label>
                <label>Hype Level: <input type="number" min="1" max="50" value={myHype} onChange={e => setMyHypeOverride(e.target.value)} style={{ width: '60px' }} /></label>
              </div>
              <div style={{ fontSize: '12px', color: '#ffd700', marginTop: '5px' }}>
                Hype L{myHype} {hasClassAdvantage && '• Class Advantage!'}
              </div>
              {playerError && <p style={{ color: '#ff6b6b', marginTop: '8px', fontSize: '12px' }}>{playerError}</p>}
            </>
          )}
        </div>



        {/* OPPONENT */}
        <div className="vs-side opp-side">
          <h2>OPPONENT</h2>
          <WrestlerGridPicker 
            wrestlers={allWrestlers}
            selectedId={oppId}
            onSelect={id => setOppId(id)}
            placeholder="Select Any Opponent"
          />

          {opponent && (
            <>
              <div className="wrestler-info">
                {opponent.image && <img src={opponent.image} alt={oppName} />}
                <div>
                  <h3>{oppName}</h3>
                  <p>{oppStars}★ {oppTier} • Lv {oppLevel}</p>
                </div>
              </div>
              <div className="roster-controls" style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '10px' }}>
                <label>Stars: 
                  <select value={oppStars} onChange={e => setOppStars(Number(e.target.value))} style={{ marginLeft: '5px' }}>
                    {[1,2,3,4,5,6].map(s => <option key={s} value={s}>{s}★</option>)}
                  </select>
                </label>
                <label>Tier: 
                  <select value={oppTier} onChange={e => setOppTier(e.target.value)} style={{ marginLeft: '5px' }}>
                    {['Bronze', 'Silver', 'Gold'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <label>Level: <input type="number" min="1" value={oppLevel} onChange={e => setOppLevel(Number(e.target.value))} style={{ width: '60px' }} /></label>
                <label>Hype Level: <input type="number" min="1" max="50" value={oppHypeOverride} onChange={e => setOppHypeOverride(e.target.value)} style={{ width: '60px' }} /></label>
              </div>
              <div style={{ fontSize: '12px', color: '#ffd700', marginTop: '5px' }}>
                Hype L{oppHype} {hasClassDisadvantage && ' (At Disadvantage)'}
              </div>
              
              <div className="opp-strap-btn-container" style={{ marginTop: '15px' }}>
                <button className="btn-primary-gradient" onClick={() => setIsEditingOppStrap(true)}>
                  {oppStrap.equipped ? 'Edit Strap Configuration' : 'Add Custom Strap'}
                </button>
                {oppStrap.equipped && <span style={{ marginLeft: '10px', fontSize: '12px', color: '#4bde68' }}>Strap Active</span>}
              </div>
            </>
          )}

          {oppError && <p style={{ color: '#ff6b6b', marginTop: '12px', fontSize: '13px' }}>{oppError}</p>}
        </div>
      </div>
      
      {isEditingOppStrap && (
        <StrapConfigOverlay 
          strap={oppStrap} 
          onSave={s => { setOppStrap(s); setIsEditingOppStrap(false); }} 
          onClose={() => setIsEditingOppStrap(false)} 
        />
      )}

      {loading && <div className="loading">Loading guide data...</div>}

      <div className="damage-results">
        <div className="damage-column">
          <h3>You deal to Opponent</h3>
          <h4>Gem Damage</h4>
          <div className="gem-grid">
            {myGemResults.map(({ gem, base, dealt }) => {
              const c = GEM_COLORS[gem];
              return (
                <div key={gem} className={`gem-box ${c.cls}`}>
                  <strong>{gem}</strong><br />
                  Base: {base.toLocaleString()}<br />
                  → <strong>{dealt.toLocaleString()}</strong>
                </div>
              );
            })}
          </div>

          <h4>Move Damage</h4>
          {myMoveResults.length === 0 ? <p>No moves equipped</p> : 
            myMoveResults.map(({ move, dealt }) => (
              <div key={move.ID} className="move-row">
                {move.name} → <strong>{dealt}</strong>
              </div>
            ))
          }
        </div>

        <div className="damage-column">
          <h3>Opponent deals to You</h3>
          {!opponent ? (
            <div className="picker-empty-state" style={{ margin: 'auto', opacity: 0.5 }}>
               Select an opponent above to see their incoming damage and calculation details.
            </div>
          ) : oppError ? (
            <p style={{ color: '#ff6b6b' }}>Opponent damage calculation unavailable due to data error.</p>
          ) : (
            <>
              <h4>Gem Damage</h4>
              <div className="gem-grid">
                {oppGemResults.map(({ gem, base, dealt }) => {
                  const c = GEM_COLORS[gem];
                  return (
                    <div key={gem} className={`gem-box ${c.cls}`}>
                      <strong>{gem}</strong><br />
                      Base: {base.toLocaleString()}<br />
                      → <strong>{dealt.toLocaleString()}</strong>
                    </div>
                  );
                })}
              </div>

              <h4>Move Damage</h4>
              {oppMoveResults.length === 0 ? <p>No moves</p> : 
                oppMoveResults.map(({ move, dealt }) => (
                  <div key={move.ID} className="move-row">
                    {move.name} → <strong>{dealt}</strong>
                  </div>
                ))
              }
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DamageCalculator;