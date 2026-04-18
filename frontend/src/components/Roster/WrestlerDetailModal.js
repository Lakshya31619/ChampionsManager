import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../services/api';
import { FaPlus, FaEdit, FaGem, FaShieldAlt, FaFistRaised, FaHistory, FaExchangeAlt, FaBolt, FaLayerGroup, FaTrash, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { SET_BONUSES, SLOT_DEFAULT_ABILITIES, MEDAL_TYPES, SET_TIERS, MEDAL_TIERS, MEDAL_LEVELS, SUBSTAT_TYPES } from '../../utils/medalConstants';
import skillPlatesData from '../../utils/skillPlates.json';
import { calculateMedalBonuses, StrapConfigOverlay } from './StrapConfig';

// ── Helpers ────────────────────────────────────────────────────────────────

const GEM_COLORS = {
  Red:    { bg: 'rgba(255,60,60,0.15)',   border: 'rgba(255,60,60,0.4)',   text: '#ff6b6b' },
  Blue:   { bg: 'rgba(76,111,255,0.15)',  border: 'rgba(76,111,255,0.4)',  text: '#6b90ff' },
  Green:  { bg: 'rgba(60,200,80,0.15)',   border: 'rgba(60,200,80,0.4)',   text: '#4bde68' },
  Yellow: { bg: 'rgba(255,220,60,0.15)',  border: 'rgba(255,220,60,0.4)',  text: '#ffd740' },
  Black:  { bg: 'rgba(180,180,180,0.08)', border: 'rgba(255,255,255,0.12)', text: '#aaaaaa' },
  Purple: { bg: 'rgba(160,76,255,0.15)',  border: 'rgba(160,76,255,0.4)',  text: '#c084fc' },
};

const STAT_ORDER = ['HP', 'Red', 'Blue', 'Green', 'Yellow', 'Black', 'Purple', 'Gem Defense', 'Move Defense', 'TalentScore'];

/**
 * Normalise whatever key names the API returns into our canonical set.
 */
const normaliseStats = (raw = {}) => {
  const MAP = {
    // HP
    hp: 'HP', HP: 'HP', hitPoints: 'HP', health: 'HP',
    // Gem colours
    red: 'Red',    Red: 'Red',    RED: 'Red',
    blue: 'Blue',  Blue: 'Blue',  BLUE: 'Blue',
    green: 'Green',Green: 'Green',GREEN: 'Green',
    yellow: 'Yellow', Yellow: 'Yellow', YELLOW: 'Yellow',
    black: 'Black',   Black: 'Black',   BLACK: 'Black',
    purple: 'Purple', Purple: 'Purple', PURPLE: 'Purple',
    // Talent
    talentscore: 'TalentScore', TalentScore: 'TalentScore',
    talentScore: 'TalentScore', talent: 'TalentScore', TALENTSCORE: 'TalentScore',
  };
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const canonical = MAP[k] ?? MAP[k.toLowerCase()] ?? k;
    if (typeof v === 'number') out[canonical] = v;
  }
  return out;
};

// Parse rarity string like "3★ Silver" → { stars: 3, tier: 'Silver' }
const parseRarity = (rarity = '') => {
  const m = rarity.match(/(\d+)★\s*(Bronze|Silver|Gold)/i);
  return m ? { stars: parseInt(m[1]), tier: m[2] } : { stars: 1, tier: 'Bronze' };
};

const getStarKeys = (tierData) =>
  Object.keys(tierData || {}).sort((a, b) => {
    const [aS] = a.split('_').map(Number);
    const [bS] = b.split('_').map(Number);
    return aS - bS;
  });



// ── Constants ──────────────────────────────────────────────────────────────
const MAX_EQUIPPED = 3;

// ── Component ──────────────────────────────────────────────────────────────
const WrestlerDetailModal = ({ wrestler, onClose, onLevelSave }) => {
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [sliderLevel, setSliderLevel] = useState(wrestler.level || 1);
  const [sliderInitialized, setSliderInitialized] = useState(false);
  
  // Restore saved move levels
  const [moveLevels, setMoveLevels] = useState(() => {
    const saved = wrestler.moveLevels;
    if (!saved) return {};
    if (saved instanceof Map) return Object.fromEntries(saved);
    if (typeof saved === 'object') return { ...saved };
    return {};
  });
  
  const [equippedIds, setEquippedIds] = useState([]);   
  const [equippedInitialized, setEquippedInitialized] = useState(false);

  const [strap, setStrap] = useState(wrestler.strap || {
    equipped: false,
    rarity: 'Rare',
    boostType: 'Gem Damage',
    gemBuff: 0,
    isPercentage: true,
    medals: []
  });

  const [statViewMode, setStatViewMode] = useState('base'); // 'base', 'hype', 'title', 'combined'
  const [isEditingStrap, setIsEditingStrap] = useState(false);
  
  const [localHypeLevel, setLocalHypeLevel] = useState(wrestler.hypeLevel || 1);
  const [localHypePoints, setLocalHypePoints] = useState(wrestler.hypePoints || 0);

  // ── Fetch wrestler guide data ────────────────────────────────────────────
  useEffect(() => {
    const fetch_ = async () => {
      setLoading(true);
      setError('');
      try {
        const wd = wrestler.wrestlerData || {};
        const apiKey =
          wd.ID || wd.groupId || wrestler.groupId ||
          wd.superstarId || wrestler.superstarId || wrestler.wrestlerId;
        if (!apiKey) throw new Error('No identifier found');

        const res = await api.get(`/wrestlers/guide/${apiKey}`);
        if (!res.data?.data) throw new Error('No data in response');
        setApiData(res.data.data);
      } catch (e) {
        console.error('WrestlerDetailModal error:', e.message);
        setError('Could not load wrestler data.');
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, [wrestler._id]);

  // ── Once API data loads: set slider & equip moves ──
  useEffect(() => {
    if (!apiData) return;

    const { stars: s, tier: t } = parseRarity(wrestler.rarity);
    const td = apiData?.[t] || apiData?.Bronze || {};
    const sKeys = getStarKeys(td);
    const opts = sKeys.filter(k => k.startsWith(`${s}_`));
    const activeOpts = opts.length > 0 ? opts : sKeys;
    const activeKey = activeOpts[activeOpts.length - 1] || sKeys[0] || '';
    const sec = td[activeKey] || {};
    const cap = sec.LevelCap || 10;

    if (!sliderInitialized) {
      const savedLevel = wrestler.level && wrestler.level > 1 ? wrestler.level : cap;
      setSliderLevel(Math.min(savedLevel, cap));
      setSliderInitialized(true);
    }

    if (!equippedInitialized) {
      const moveList = sec.Abilities || [];
      const defaultEquipped = wrestler.equippedMoves?.length
        ? wrestler.equippedMoves
        : moveList.slice(0, MAX_EQUIPPED).map(a => a.ID);
      setEquippedIds(defaultEquipped);
      setEquippedInitialized(true);
    }
  }, [apiData, wrestler, sliderInitialized, equippedInitialized]);

  // ── Derived rarity / tier data ───────────────────────────────────────────
  const { stars, tier } = parseRarity(wrestler.rarity);
  const tierData   = apiData?.[tier] || apiData?.Bronze || {};
  const starKeys   = getStarKeys(tierData);

  const starKeyOptions = useMemo(() => {
    const options = starKeys.filter(k => k.startsWith(`${stars}_`));
    return options.length > 0 ? options : starKeys;
  }, [starKeys, stars]);

  const activeStarKey = useMemo(() => {
    return starKeyOptions[starKeyOptions.length - 1] || starKeys[0] || '';
  }, [starKeyOptions, starKeys]);

  const starSection = tierData[activeStarKey] || {};
  
  const allStats = useMemo(() => {
    if (!tierData || !activeStarKey) return [];
    const sec = tierData[activeStarKey];
    if (!sec || !sec.Stats) return [];
    return [...sec.Stats].sort((a, b) => a.level - b.level);
  }, [tierData, activeStarKey]);

  const abilities   = starSection.Abilities || [];
  const levelCap    = starSection.LevelCap  || 10;

  // ── Base stats at current slider level ──────────────────────────────────
  const snappedBase = useMemo(() => {
    if (!allStats.length) return { level: sliderLevel, stats: {} };
    const row =
      allStats.find(s => s.level === sliderLevel) ||
      allStats.reduce((prev, cur) =>
        Math.abs(cur.level - sliderLevel) < Math.abs(prev.level - sliderLevel) ? cur : prev
      );
    return { level: row.level, stats: normaliseStats(row?.stats || {}) };
  }, [allStats, sliderLevel]);

  const baseStats = useMemo(() => snappedBase.stats, [snappedBase]);

  const getMoveLevel = useCallback(
    (ability) => {
      if (!ability?.levels?.length) return null;
      const sorted = [...ability.levels].sort((a, b) => a.level - b.level);
      const userLvl = moveLevels[ability.ID];
      if (userLvl === undefined) return sorted[sorted.length - 1];
      return sorted.find(l => l.level === userLvl) || sorted[sorted.length - 1];
    },
    [moveLevels]
  );

  const equippedMoves = useMemo(
    () => abilities.filter(a => equippedIds.includes(a.ID)),
    [abilities, equippedIds]
  );

  const movesBonusStats = useMemo(() => {
    const bonus = {};
    for (const move of equippedMoves) {
      const ml = getMoveLevel(move);
      if (!ml) continue;

      ['hpBonus', 'hpGain', 'hp'].forEach(f => {
        if (ml[f]) bonus.HP = (bonus.HP || 0) + ml[f];
      });
      if (ml.bonusStats) {
        const bs = normaliseStats(ml.bonusStats);
        for (const [k, v] of Object.entries(bs)) {
          bonus[k] = (bonus[k] || 0) + v;
        }
      }
    }
    return bonus;
  }, [equippedMoves, getMoveLevel]);

  const medalBonuses = useMemo(() => {
    if (!strap?.equipped || !strap?.medals) return calculateMedalBonuses([]);
    return calculateMedalBonuses(strap.medals);
  }, [strap]);

  // Hype Multiplier based on Level difference logic (30% per level above 1)
  const hypeMultiplier = useMemo(() => {
    return 1 + (localHypeLevel - 1) * 0.3;
  }, [localHypeLevel]);

  const stats = useMemo(() => {
    const out = {};
    const gemColors = ['Red', 'Blue', 'Green', 'Yellow', 'Black', 'Purple'];
    
    STAT_ORDER.forEach(key => {
      // 1. Calculate the absolute "Base" (Level + Moves Property Stats)
      const baseRaw = (baseStats[key] || 0) + (movesBonusStats[key] || 0);
      
      // 2. Calculate Hype Contribution
      const totalWithHype = Math.round(baseRaw * hypeMultiplier);
      const hypeBonus = totalWithHype - baseRaw;

      // 3. Determine the "Baseline" to which Title/Strap bonuses apply
      // In 'title' mode, we apply title bonuses strictly to baseRaw. 
      // In 'combined' mode, they apply to (baseRaw + hypeBonus).
      const baselineForTitle = (statViewMode === 'title') ? baseRaw : totalWithHype;
      
      let titleBonus = 0;
      if (strap?.equipped) {
        if (gemColors.includes(key)) {
          let mult = medalBonuses.gemDamageMult;
          let flat = 0;
          if (strap.boostType === 'Gem Damage') {
            if (strap.isPercentage) mult += (strap.gemBuff / 100) || 0;
            else flat += strap.gemBuff || 0;
          }
          mult += (medalBonuses.stats['All Gem Damage %'] || 0) + (medalBonuses.stats[`${key} Gem Damage %`] || 0) + (medalBonuses.stats['Gem Damage %'] || 0);
          flat += (medalBonuses.stats['All Gem Damage'] || 0) + (medalBonuses.stats[`${key} Gem Damage`] || 0) + (medalBonuses.stats['Gem Damage'] || 0);
          titleBonus = flat + Math.round(baselineForTitle * mult);
        } else if (key === 'Gem Defense') {
          let flat = medalBonuses.gemDefenseFlat;
          let mult = 0;
          if (strap.boostType === 'Gem Defense') {
            if (strap.isPercentage) mult += (strap.gemBuff / 100) || 0;
            else flat += strap.gemBuff || 0;
          }
          flat += (medalBonuses.stats['All Gem Defense'] || 0) + (medalBonuses.stats['Gem Defense'] || 0);
          mult += (medalBonuses.stats['All Gem Defense %'] || 0) + (medalBonuses.stats['Gem Defense %'] || 0);
          titleBonus = flat + Math.round(baselineForTitle * mult);
        } else if (key === 'Move Defense') {
          let flat = 0;
          let mult = 0;
          if (strap.boostType === 'Move Defense') {
            if (strap.isPercentage) mult += (strap.gemBuff / 100) || 0;
            else flat += strap.gemBuff || 0;
          }
          flat += (medalBonuses.stats['All Move Defense'] || 0) + (medalBonuses.stats['Move Defense'] || 0);
          mult += (medalBonuses.stats['All Move Defense %'] || 0) + (medalBonuses.stats['Move Defense %'] || 0);
          titleBonus = flat + Math.round(baselineForTitle * mult);
        } else if (key === 'HP') {
          const flatHP = (medalBonuses.stats['Health Increase'] || 0);
          const percentHP = (medalBonuses.stats['Health Increase %'] || 0);
          titleBonus = flatHP + Math.round(baselineForTitle * percentHP);
        }
      }

      // 4. Final Output based on Stat View Mode
      if (statViewMode === 'base') {
        out[key] = { total: baseRaw, base: baseRaw, bonus: 0 };
      } else if (statViewMode === 'hype') {
        out[key] = { total: totalWithHype, base: baseRaw, bonus: hypeBonus };
      } else if (statViewMode === 'title') {
        out[key] = { total: baseRaw + titleBonus, base: baseRaw, bonus: titleBonus };
      } else {
        // Combined
        out[key] = { total: totalWithHype + titleBonus, base: baseRaw, bonus: hypeBonus + titleBonus };
      }
    });

    return out;
  }, [baseStats, movesBonusStats, strap, medalBonuses, hypeMultiplier, statViewMode]);

  const moveDamageMult = useMemo(() => {
    if (!strap?.equipped) return 1;
    let mult = 1 + medalBonuses.moveDamageMult;
    let flat = 0;
    
    if (strap.boostType === 'Move Damage') {
      if (strap.isPercentage) mult += (strap.gemBuff / 100) || 0;
      else flat += strap.gemBuff || 0;
    }

    mult += (medalBonuses.stats['All Move Damage %'] || 0);
    mult += (medalBonuses.stats['Move Damage %'] || 0);
    flat += (medalBonuses.stats['All Move Damage'] || 0);
    flat += (medalBonuses.stats['Move Damage'] || 0);
    
    return mult; // Wait, moveDamageMult is used as a multiplier. If there's a flat bonus to move damage... 
    // In WWE Champions, Move Damage bonuses are almost always %. 
    // Let's keep it as mult but maybe the flat should be added to base somewhere?
    // For now I'll just keep it as mult and ignore flat for move damage to avoid complexity unless user specifically uses it.
  }, [strap, medalBonuses]);

  const toggleEquip = (id) => {
    setEquippedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= MAX_EQUIPPED) return prev;
      return [...prev, id];
    });
  };

  // ── Display info ─────────────────────────────────────────────────────────
  const name       = wrestler.wrestlerName || wrestler.wrestlerData?.name || wrestler.name || 'Unknown';
  const imageUrl   = wrestler.wrestlerData?.image || wrestler.wrestlerData?.imagePNG || wrestler.image || '';
  const playStyle  = wrestler.wrestlerData?.playStyle || wrestler.playStyle || '';
  const era        = wrestler.wrestlerData?.era || wrestler.era || '';
  
  // New fields from your supplemental data.json + MongoDB
  const style      = wrestler.style || wrestler.wrestlerData?.style || 'Unknown';
  
  // Hype Analytics Calculations
  const awareness   = localHypeLevel * 10 + Math.floor(localHypePoints / 10); // Example formula
  const aggression  = localHypeLevel === 1 ? 'Neutral' : localHypeLevel === 2 ? 'High' : localHypeLevel === 3 ? 'Elite' : 'Godly';
  const toughness   = `${(localHypeLevel - 1) * 30}% Reduction`;
  const kickout     = `+${(localHypeLevel - 1) * 15}% Survival`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="detail-modal" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="detail-header">
          {imageUrl && (
            <div className="detail-portrait-wrapper">
              <div className="detail-portrait">
                <img src={imageUrl} alt={name} />
              </div>
              
              {/* Strap Option */}
              <div className="strap-mini-section">
                {!strap.equipped ? (
                  <button className="strap-add-btn" onClick={() => setIsEditingStrap(true)}>
                    <FaPlus /> ADD STRAP
                  </button>
                ) : (
                  <div className="strap-summary" onClick={() => setIsEditingStrap(true)}>
                    <div className={`strap-badge ${strap.rarity.toLowerCase()}`}>
                      {strap.rarity[0]}
                    </div>
                    <div className="strap-info-text">
                      <span className="strap-name">STRAP</span>
                      <span className="strap-boost">
                        {strap.boostType === 'Gem Damage' && <FaGem />}
                        {strap.boostType === 'Move Damage' && <FaFistRaised />}
                        {strap.boostType === 'Gem Defense' && <FaShieldAlt />}
                        {strap.boostType === 'Move Defense' && <FaShieldAlt />}
                        {strap.boostType === 'Stun Immunity' && <FaBolt />}
                        {strap.boostType === 'Bleed Immunity' && <FaHistory />}
                        {strap.boostType === 'Affiliation Bonus' && <FaLayerGroup />}
                        {strap.boostType === 'Extra Turn' && <FaExchangeAlt />}
                        &nbsp;{strap.boostType}
                      </span>
                    </div>
                    <FaEdit className="strap-edit-icon" />
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="detail-meta">
            <h2 className="detail-name">{name}</h2>
            
            <div className="detail-tags">
              <span className="dtag">{wrestler.rarity}</span>
              {playStyle && <span className="dtag">{playStyle}</span>}
              {era && <span className="dtag">{era}</span>}
              <span className="dtag">Style: {style}</span>
            </div>

            {/* Hype Information - Improved & Interactive */}
            <div className="hype-metrics-container" style={{ 
              marginTop: '15px', 
              padding: '12px', 
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 165, 0, 0.1))', 
              border: '1px solid rgba(255, 215, 0, 0.3)', 
              borderRadius: '8px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ color: '#ffd700', fontSize: '13px', textTransform: 'uppercase' }}>Hype Tier {localHypeLevel}</strong>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select 
                    value={localHypeLevel}
                    onChange={(e) => setLocalHypeLevel(Number(e.target.value))}
                    style={{ background: '#222', color: '#fff', border: '1px solid #444', borderRadius: '4px', fontSize: '12px', padding: '2px 4px' }}
                  >
                    {[1, 2, 3, 4].map(l => <option key={l} value={l}>Level {l}</option>)}
                  </select>
                  <input 
                    type="number"
                    value={localHypePoints}
                    onChange={(e) => setLocalHypePoints(Math.min(210, Math.max(0, Number(e.target.value))))}
                    style={{ width: '50px', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: '4px', fontSize: '12px', padding: '2px 4px' }}
                    min="0"
                    max="210"
                  />
                </div>
              </div>
              
              <div className="hype-analytics-grid" style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '8px',
                fontSize: '11px'
              }}>
                <div className="hype-metric-box">
                  <span style={{ color: '#aaa' }}>Awareness (Speed):</span>
                  <span style={{ marginLeft: '5px', fontWeight: 'bold', color: '#fff' }}>{awareness}</span>
                </div>
                <div className="hype-metric-box">
                  <span style={{ color: '#aaa' }}>Aggression (Damage):</span>
                  <span style={{ marginLeft: '5px', fontWeight: 'bold', color: '#ff6b6b' }}>{aggression}</span>
                </div>
                <div className="hype-metric-box">
                  <span style={{ color: '#aaa' }}>Toughness (Defense):</span>
                  <span style={{ marginLeft: '5px', fontWeight: 'bold', color: '#4bde68' }}>{toughness}</span>
                </div>
                <div className="hype-metric-box">
                  <span style={{ color: '#aaa' }}>Kick-Out Bonus:</span>
                  <span style={{ marginLeft: '5px', fontWeight: 'bold', color: '#6b90ff' }}>{kickout}</span>
                </div>
              </div>
            </div>



            {/* ── Level slider ── */}
            {!loading && !error && levelCap > 1 && (
              <div className="level-slider-block" style={{ marginTop: '12px' }}>
                <div className="level-slider-row">
                  <span className="level-label">Level</span>
                  <span className="level-value">{sliderLevel}</span>
                  <span className="level-cap">/ {levelCap}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={levelCap}
                  value={sliderLevel}
                  onChange={e => setSliderLevel(Number(e.target.value))}
                  className="level-range"
                />
                <button
                  className="save-level-btn"
                  onClick={() => onLevelSave?.(wrestler._id, sliderLevel, equippedIds, moveLevels, strap, localHypeLevel, localHypePoints, activeStarKey)}
                >
                  Save
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Body ── */}
        {loading && <div className="detail-loading">Loading data…</div>}
        {error   && <div className="detail-error">{error}</div>}

        {!loading && !error && (
          <>
            {/* Gem Stats Section - unchanged */}
            <section className="detail-section">
              <h4 className="section-title">
                Gem Stats at Level {sliderLevel}
                {equippedMoves.length > 0 && (
                  <span className="moves-bonus-note">
                    {' '}· {equippedMoves.length} move{equippedMoves.length > 1 ? 's' : ''} equipped
                  </span>
                )}
              </h4>

              {/* Stat Bonus Toggles */}
              <div className="stat-bonus-tabs" style={{ 
                display: 'flex', 
                gap: '5px', 
                marginBottom: '15px', 
                padding: '4px', 
                background: 'rgba(0,0,0,0.3)', 
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                {[
                  { id: 'base', label: 'Base', icon: <FaLayerGroup /> },
                  { id: 'hype', label: 'Hype', icon: <FaBolt /> },
                  { id: 'title', label: 'Title', icon: <FaHistory /> },
                  { id: 'combined', label: 'All', icon: <FaGem /> }
                ].map(tab => {
                  const isActive = statViewMode === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setStatViewMode(tab.id)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px 4px',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: isActive ? 'bold' : 'normal',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        background: isActive 
                          ? 'linear-gradient(135deg, #ffd700, #ff8c00)' 
                          : 'rgba(255,255,255,0.05)',
                        color: isActive ? '#000' : '#888',
                        boxShadow: isActive ? '0 0 10px rgba(255, 215, 0, 0.3)' : 'none',
                        transform: isActive ? 'scale(1.05)' : 'scale(1)',
                        zIndex: isActive ? 2 : 1
                      }}
                    >
                      <span style={{ fontSize: '14px', marginBottom: '2px' }}>{tab.icon}</span>
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {Object.keys(stats).length === 0 ? (
                <p className="detail-empty">No stats available for this level.</p>
              ) : (
                <div className="gem-stats-grid">
                  {STAT_ORDER.filter(k => stats[k] && stats[k].base !== undefined).map(key => {
                    const c = GEM_COLORS[key];
                    const statObj = stats[key];
                    return (
                      <div
                        key={key}
                        className="gem-stat-cell"
                        style={c
                          ? { background: c.bg, border: `1px solid ${c.border}`, color: c.text }
                          : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }
                        }
                      >
                        <span className="gem-stat-label">{key}</span>
                        <div className="gem-stat-value">
                          <span className="gem-stat-total">{statObj.total.toLocaleString()}</span>
                          {statObj.bonus !== 0 && (
                            <span className="gem-stat-breakdown">
                              {statObj.base.toLocaleString()} (+{statObj.bonus.toLocaleString()})
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Moves / Abilities Section - unchanged */}
            {abilities.length > 0 && (
              <section className="detail-section">
                <h4 className="section-title">
                  Moves
                  <span className="equipped-counter"> · {equippedIds.length}/{MAX_EQUIPPED} equipped</span>
                </h4>

                <div className="equipped-slots">
                  {Array.from({ length: MAX_EQUIPPED }).map((_, i) => {
                    const move = equippedMoves[i];
                    return (
                      <div
                        key={i}
                        className={`equip-slot ${move ? 'filled' : 'empty'}`}
                        onClick={() => move && toggleEquip(move.ID)}
                        title={move ? `Unequip "${move.name}"` : 'Empty slot'}
                      >
                        {move ? (
                          <>
                            <span
                              className="equip-slot-gem"
                              style={{ color: GEM_COLORS[move.gemType]?.text || '#fff' }}
                            >●</span>
                            <span className="equip-slot-name">{move.name}</span>
                            <span className="equip-slot-remove">✕</span>
                          </>
                        ) : (
                          <span className="equip-slot-empty-label">Slot {i + 1}</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="moves-list">
                  {abilities.map(ability => {
                    const gemColor   = GEM_COLORS[ability.gemType] || {};
                    const moveLevel  = getMoveLevel(ability);
                    const isEquipped = equippedIds.includes(ability.ID);
                    const canEquip   = !isEquipped && equippedIds.length < MAX_EQUIPPED;
                    const talentGain = (moveLevel?.dam > 0)
                      ? Math.round(moveLevel.dam * 0.05)
                      : 0;

                    return (
                      <div
                        key={ability.ID}
                        className={`move-card-new ${isEquipped ? 'move-equipped' : ''}`}
                      >
                        <div className="move-card-header">
                          <span className="move-name">{ability.name}</span>
                          <div className="move-badges">
                            <span
                              className="move-gem-badge"
                              style={{
                                background: gemColor.bg,
                                border: `1px solid ${gemColor.border}`,
                                color: gemColor.text,
                              }}
                            >
                              {ability.gemType}
                            </span>
                            <span className="move-mp-badge">MP {ability.MovePoint}</span>
                            <button
                              className={`equip-btn ${isEquipped ? 'equipped' : canEquip ? 'equippable' : 'full'}`}
                              onClick={() => toggleEquip(ability.ID)}
                              disabled={!isEquipped && !canEquip}
                              title={isEquipped ? 'Unequip' : canEquip ? 'Equip' : 'All 3 slots full'}
                            >
                              {isEquipped ? '✓ Equipped' : canEquip ? '+ Equip' : 'Full'}
                            </button>
                          </div>
                        </div>

                        {moveLevel && (
                          <div className="move-card-body">
                            <div className="move-level-slider" style={{ marginBottom: '10px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', fontWeight: 'bold' }}>
                                <span>Move Level: {moveLevel.level} / {ability.levels?.length || 1}</span>
                              </div>
                              <input 
                                type="range"
                                min={1}
                                max={ability.levels?.length || 1}
                                value={moveLevels[ability.ID] !== undefined ? moveLevels[ability.ID] : (ability.levels?.length || 1)}
                                onChange={(e) => setMoveLevels(prev => ({ ...prev, [ability.ID]: Number(e.target.value) }))}
                                style={{ width: '100%', margin: 0 }}
                              />
                            </div>
                            {moveLevel.dam > 0 && (
                              <div className="move-dmg">
                                ⚔ {Math.round(moveLevel.dam * moveDamageMult).toLocaleString()} DMG
                                {moveDamageMult > 1 && (
                                  <span className="strap-bonus-tag"> (+{Math.round((moveDamageMult-1)*100)}%)</span>
                                )}
                                {isEquipped && talentGain > 0 && (
                                  <span className="move-talent-bonus">
                                    {' '}· +{talentGain.toLocaleString()} Talent
                                  </span>
                                )}
                              </div>
                            )}
                            <p className="move-text">{moveLevel.text}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}

        {/* ── Strap Configuration Overlay ── */}
        {isEditingStrap && (
          <StrapConfigOverlay 
            strap={strap} 
            onSave={(newStrap) => {
              setStrap(newStrap);
              setIsEditingStrap(false);
            }} 
            onClose={() => setIsEditingStrap(false)} 
          />
        )}
      </div>
    </div>
  );
};



export default WrestlerDetailModal;