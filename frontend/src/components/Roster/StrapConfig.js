import React, { useState, useMemo } from 'react';
import { FaLayerGroup, FaCheckCircle, FaTrash } from 'react-icons/fa';
import { SET_BONUSES, SLOT_DEFAULT_ABILITIES, MEDAL_TYPES, SET_TIERS, MEDAL_TIERS, MEDAL_LEVELS, SUBSTAT_TYPES } from '../../utils/medalConstants';
import skillPlatesData from '../../utils/skillPlates.json';

export const calculateMedalBonuses = (medals = []) => {
  const bonuses = {
    gemDamageMult: 0,
    moveDamageMult: 0,
    gemDefenseFlat: 0,
    moveDefenseFlat: 0,
    stats: {} // For specific color boosts or flat boosts
  };

  if (!medals?.length) return bonuses;

  // 1. Group for Set Bonuses
  const sets = {};
  medals.forEach(m => {
    if (m.setType && m.setTier) {
      const key = `${m.setType}_${m.setTier}`;
      sets[key] = (sets[key] || 0) + 1;
    }

    // 2. Add Slot Default Abilities
    if (m.defaultAbility?.type && m.defaultAbility?.value !== undefined) {
      const type = m.defaultAbility.type;
      const val = m.defaultAbility.value;
      const isPct = m.defaultAbility.isPercentage;
      const bonusKey = isPct ? `${type} %` : type;
      bonuses.stats[bonusKey] = (bonuses.stats[bonusKey] || 0) + (isPct ? val / 100 : val);
    }

    // 3. Add Sub-stats
    m.subStats?.forEach(ss => {
      if (ss.type && ss.value) {
        const bonusKey = ss.isPercentage ? `${ss.type} %` : ss.type;
        bonuses.stats[bonusKey] = (bonuses.stats[bonusKey] || 0) + (ss.isPercentage ? ss.value / 100 : ss.value);
      }
    });
  });

  // 4. Calculate Set Bonuses
  Object.entries(sets).forEach(([key, count]) => {
    const [type, tier] = key.split('_');
    const bonusConfig = SET_BONUSES[type]?.[tier];
    if (bonusConfig) {
      // Find highest applicable bonus (e.g. if count is 4, look for 4 then 2)
      const applicableCount = Object.keys(bonusConfig)
        .map(Number)
        .sort((a, b) => b - a)
        .find(c => count >= c);
      
      if (applicableCount !== undefined) {
        const value = bonusConfig[applicableCount] / 100;
        if (type === 'Fury') bonuses.gemDamageMult += value;
        if (type === 'Takedown') bonuses.moveDamageMult += value;
        if (type === 'Armor') bonuses.gemDefenseFlat += bonusConfig[applicableCount]; // Armor is Gem Defense
      }
    }
  });

  return bonuses;
};

export const StrapConfigOverlay = ({ strap, onSave, onClose }) => {
  const [localStrap, setLocalStrap] = useState({ 
    ...strap, 
    isPercentage: strap.isPercentage !== undefined ? strap.isPercentage : true,
    medals: strap.medals?.map(m => ({
      ...m,
      subStats: m.subStats ? [...m.subStats] : [],
      defaultAbility: m.defaultAbility ? { 
        isPercentage: false, 
        ...m.defaultAbility 
      } : { type: '', value: 0, isPercentage: false }
    })) || [] 
  });

  const [plateSearch, setPlateSearch] = useState({});

  const rarities = ['Rare', 'Epic', 'Legendary', 'Ultimate'];
  const boostTypes = ['Gem Damage', 'Move Damage', 'Gem Defense', 'Move Defense', 'Stun Immunity', 'Bleed Immunity', 'Affiliation Bonus', 'Extra Turn'];

  const getSlotCount = (rarity) => {
    if (rarity === 'Rare') return 3;
    if (rarity === 'Epic') return 4;
    if (rarity === 'Legendary') return 5;
    if (rarity === 'Ultimate') return 6;
    return 3;
  };

  const slotCount = getSlotCount(localStrap.rarity);

  const handleMedalChange = (slot, field, value) => {
    const newMedals = [...localStrap.medals];
    const index = newMedals.findIndex(m => m.slot === slot);
    
    if (index > -1) {
      newMedals[index] = { ...newMedals[index], [field]: value };
    } else {
      const defaultType = SLOT_DEFAULT_ABILITIES[slot]?.type || '';
      newMedals.push({ 
        slot, 
        [field]: value, 
        tier: 1, 
        level: 1,
        setType: 'Fury',
        setTier: 'I',
        defaultAbility: { type: defaultType, value: 0, isPercentage: slot >= 3 },
        subStats: [] 
      });
    }
    setLocalStrap({ ...localStrap, medals: newMedals });
  };

  const handleDefaultAbilityChange = (slot, field, value) => {
    const newMedals = [...localStrap.medals];
    const index = newMedals.findIndex(m => m.slot === slot);
    if (index > -1) {
      newMedals[index] = { 
        ...newMedals[index], 
        defaultAbility: { ...newMedals[index].defaultAbility, [field]: value } 
      };
      setLocalStrap({ ...localStrap, medals: newMedals });
    }
  };

  const addSubStat = (slot) => {
    const newMedals = [...localStrap.medals];
    const index = newMedals.findIndex(m => m.slot === slot);
    const newSS = { type: SUBSTAT_TYPES[0], value: 0, isPercentage: false };
    
    if (index > -1) {
      newMedals[index] = { 
        ...newMedals[index], 
        subStats: [...(newMedals[index].subStats || []), newSS] 
      };
    } else {
      const defaultType = SLOT_DEFAULT_ABILITIES[slot]?.type || '';
      newMedals.push({ 
        slot, tier: 1, level: 1, 
        setType: 'Fury', setTier: 'I',
        defaultAbility: { type: defaultType, value: 0 },
        subStats: [newSS] 
      });
    }
    setLocalStrap({ ...localStrap, medals: newMedals });
  };

  const updateSubStat = (slot, ssIndex, field, value) => {
    const newMedals = [...localStrap.medals];
    const index = newMedals.findIndex(m => m.slot === slot);
    if (index > -1) {
      const newSSList = [...(newMedals[index].subStats || [])];
      newSSList[ssIndex] = { ...newSSList[ssIndex], [field]: value };
      newMedals[index] = { ...newMedals[index], subStats: newSSList };
      setLocalStrap({ ...localStrap, medals: newMedals });
    }
  };

  const removeSubStat = (slot, ssIndex) => {
    const newMedals = [...localStrap.medals];
    const index = newMedals.findIndex(m => m.slot === slot);
    if (index > -1) {
      const newSSList = [...(newMedals[index].subStats || [])];
      newSSList.splice(ssIndex, 1);
      newMedals[index] = { ...newMedals[index], subStats: newSSList };
      setLocalStrap({ ...localStrap, medals: newMedals });
    }
  };

  const handlePlateSelect = (slot, plate) => {
    const newMedals = [...localStrap.medals];
    const index = newMedals.findIndex(m => m.slot === slot);
    const forcedCategory = slot === 5 ? 'Skill Plate' : 'Ultimate Plate';

    if (index > -1) {
      newMedals[index] = {
        ...newMedals[index],
        category: forcedCategory,
        name: plate.name,
        description: plate.description,
        imageUrl: plate.imageUrl
      };
    } else {
      const defaultType = SLOT_DEFAULT_ABILITIES[slot]?.type || '';
      newMedals.push({
        slot,
        tier: 1,
        level: 1,
        setType: 'Fury',
        setTier: 'I',
        defaultAbility: { type: defaultType, value: 0 },
        subStats: [],
        category: forcedCategory,
        name: plate.name,
        description: plate.description,
        imageUrl: plate.imageUrl
      });
    }

    setLocalStrap({ ...localStrap, medals: newMedals });
    setPlateSearch(prev => ({ ...prev, [slot]: '' }));
  };

  const removePlate = (slot) => {
    const newMedals = localStrap.medals.filter(m => m.slot !== slot);
    setLocalStrap({ ...localStrap, medals: newMedals });
  };

  const getMedal = (slot) => {
    const m = localStrap.medals.find(m => m.slot === slot);
    if (m) return m;
    const defaultType = SLOT_DEFAULT_ABILITIES[slot]?.type || '';
    return { slot, tier: 1, level: 1, setType: 'Fury', setTier: 'I', defaultAbility: { type: defaultType, value: 0, isPercentage: slot >= 3 }, subStats: [] };
  };

  const activeSetBonuses = useMemo(() => {
    const sets = {};
    localStrap.medals.forEach(m => {
      if (m.setType && m.setTier) {
        const key = `${m.setType} ${m.setTier}`;
        sets[key] = (sets[key] || 0) + 1;
      }
    });

    const active = [];
    Object.entries(sets).forEach(([key, count]) => {
      const [type, tier] = key.split(' ');
      const bonusConfig = SET_BONUSES[type]?.[tier];
      if (bonusConfig) {
        const applicableCount = Object.keys(bonusConfig).map(Number).sort((a,b)=>b-a).find(c => count >= c);
        if (applicableCount !== undefined) {
          active.push({ key, count, value: bonusConfig[applicableCount] });
        }
      }
    });
    return active;
  }, [localStrap.medals]);

  return (
    <div className="strap-config-overlay">
      <div className="strap-config-content">
        <div className="strap-config-header">
          <div className="header-title-group">
            <h3>Advanced Medal System</h3>
            <p>Configure your strap, medals, and plates for maximum performance.</p>
          </div>
          <button className="close-overlay" onClick={onClose}>✕</button>
        </div>

        <div className="strap-config-body">
          {/* Main Strap Settings */}
          <section className="config-card main-settings">
            <div className="card-header">
              <FaLayerGroup /> Strap Base Settings
            </div>
            <div className="card-content">
              <div className="config-row-modern">
                <label>Equipped Status</label>
                <div 
                  className={`modern-toggle ${localStrap.equipped ? 'active' : ''}`}
                  onClick={() => setLocalStrap({ ...localStrap, equipped: !localStrap.equipped })}
                >
                  <div className="toggle-slider"></div>
                  <span>{localStrap.equipped ? 'EQUIPPED' : 'NOT EQUIPPED'}</span>
                </div>
              </div>

              {localStrap.equipped && (
                <div className="settings-grid">
                  <div className="config-item-modern">
                    <label>Strap Rarity</label>
                    <div className="select-wrapper">
                      <select 
                        value={localStrap.rarity} 
                        onChange={(e) => setLocalStrap({ ...localStrap, rarity: e.target.value })}
                      >
                        {rarities.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="config-item-modern">
                    <label>Base Boost Type</label>
                    <div className="select-wrapper">
                      <select 
                        value={localStrap.boostType} 
                        onChange={(e) => setLocalStrap({ ...localStrap, boostType: e.target.value })}
                      >
                        {boostTypes.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  </div>
                  {['Gem Damage', 'Move Damage', 'Gem Defense', 'Move Defense'].includes(localStrap.boostType) && (
                    <div className="config-item-modern slider-item">
                      <label>Base Boost Strength</label>
                      <div className="slider-with-label">
                        <input 
                          type={localStrap.isPercentage ? "range" : "number"} 
                          min="0" max={localStrap.isPercentage ? "200" : "10000"} 
                          step={localStrap.isPercentage ? "10" : "1"}
                          value={localStrap.gemBuff} 
                          onChange={(e) => setLocalStrap({ ...localStrap, gemBuff: Number(e.target.value) })}
                        />
                        <div 
                           className={`unit-toggle ${localStrap.isPercentage ? 'pct' : 'flat'}`}
                           onClick={() => setLocalStrap({ ...localStrap, isPercentage: !localStrap.isPercentage })}
                           style={{ cursor: 'pointer', padding: '4px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginLeft: '8px' }}
                        >
                           {localStrap.isPercentage ? '%' : '#'}
                        </div>
                        <span className="slider-value">{localStrap.gemBuff}{localStrap.isPercentage ? '%' : ''}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {localStrap.equipped && (
            <>
              {/* Active Bonuses Summary */}
              {activeSetBonuses.length > 0 && (
                <div className="active-bonuses-strip">
                  <span className="strip-label">Active Set Bonuses:</span>
                  {activeSetBonuses.map(b => (
                    <div key={b.key} className="bonus-pill">
                      <FaCheckCircle className="pill-icon" />
                      {b.key} ({b.count}): +{b.value}%
                    </div>
                  ))}
                </div>
              )}

              {/* Medals Grid */}
              <div className="medals-scroll-container">
                <div className="medals-grid-detailed">
                  {Array.from({ length: slotCount }).map((_, i) => {
                    const slotNum = i + 1;
                    const medal = getMedal(slotNum);
                    const isPlate = slotNum === 5 || slotNum === 6;

                    return (
                      <div key={slotNum} className={`medal-card-detailed ${isPlate ? 'plate-card' : ''}`}>
                        <div className="medal-card-header">
                          <div className="slot-id">SLOT {slotNum}</div>
                          <div className="slot-type">{isPlate ? 'PLATE' : 'MEDAL'}</div>
                        </div>

                        {!isPlate ? (
                          <div className="medal-card-body">
                            {/* Tier and Level */}
                            <div className="medal-row-split">
                              <div className="medal-input-group">
                                <label>Tier</label>
                                <select value={medal.tier} onChange={(e)=>handleMedalChange(slotNum, 'tier', Number(e.target.value))}>
                                  {MEDAL_TIERS.map(t => <option key={t} value={t}>Tier {t}</option>)}
                                </select>
                              </div>
                              <div className="medal-input-group">
                                <label>Level</label>
                                <select value={medal.level} onChange={(e)=>handleMedalChange(slotNum, 'level', Number(e.target.value))}>
                                  {MEDAL_LEVELS.map(l => <option key={l} value={l}>Lvl {l}</option>)}
                                </select>
                              </div>
                            </div>

                            {/* Set Type */}
                            <div className="medal-row-split">
                              <div className="medal-input-group">
                                <label>Set Type</label>
                                <select value={medal.setType} onChange={(e)=>handleMedalChange(slotNum, 'setType', e.target.value)}>
                                  {MEDAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                              </div>
                              <div className="medal-input-group">
                                <label>Set Tier</label>
                                <select value={medal.setTier} onChange={(e)=>handleMedalChange(slotNum, 'setTier', e.target.value)}>
                                  {SET_TIERS.map(st => <option key={st} value={st}>{st}</option>)}
                                </select>
                              </div>
                            </div>

                            {/* Default Ability */}
                            <div className="medal-ability-box">
                              <label>Default Ability: {SLOT_DEFAULT_ABILITIES[slotNum]?.label}</label>
                              <div className="ability-input-row">
                                <input 
                                  type="number" 
                                  value={medal.defaultAbility?.value || 0}
                                  onChange={(e) => handleDefaultAbilityChange(slotNum, 'value', Number(e.target.value))}
                                  placeholder="Value"
                                />
                                <div 
                                  className={`unit-toggle-mini ${medal.defaultAbility?.isPercentage ? 'pct' : 'flat'}`}
                                  onClick={() => handleDefaultAbilityChange(slotNum, 'isPercentage', !medal.defaultAbility?.isPercentage)}
                                  style={{ cursor: 'pointer', padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', fontSize: '10px' }}
                                >
                                  {medal.defaultAbility?.isPercentage ? '%' : '#'}
                                </div>
                              </div>
                            </div>

                            {/* Sub-stats */}
                            <div className="medal-substats-header">
                              <span>Sub-stats</span>
                              <button className="add-ss-btn" onClick={() => addSubStat(slotNum)}>+ ADD</button>
                            </div>
                            <div className="substats-list">
                              {medal.subStats?.map((ss, ssIndex) => (
                                <div key={ssIndex} className="substat-item">
                                  <select 
                                    className="ss-type"
                                    value={ss.type} 
                                    onChange={(e) => updateSubStat(slotNum, ssIndex, 'type', e.target.value)}
                                  >
                                    {SUBSTAT_TYPES.map(st => <option key={st} value={st}>{st}</option>)}
                                  </select>
                                  <input 
                                    className="ss-val"
                                    type="number" 
                                    value={ss.value} 
                                    onChange={(e) => updateSubStat(slotNum, ssIndex, 'value', Number(e.target.value))}
                                  />
                                  <div 
                                    className={`ss-toggle ${ss.isPercentage ? 'pct' : 'flat'}`}
                                    onClick={() => updateSubStat(slotNum, ssIndex, 'isPercentage', !ss.isPercentage)}
                                    title={ss.isPercentage ? 'Percentage' : 'Flat'}
                                  >
                                    {ss.isPercentage ? '%' : '#'}
                                  </div>
                                  <button className="ss-remove" onClick={() => removeSubStat(slotNum, ssIndex)}><FaTrash /></button>
                                </div>
                              ))}
                              {!medal.subStats?.length && <div className="ss-empty">No sub-stats added.</div>}
                            </div>
                          </div>
                        ) : (
                          <div className="plate-card-body">
                            {medal.category ? (
                              <div className="equipped-plate-info">
                                <div className="plate-header-row">
                                  <img src={medal.imageUrl} alt={medal.name} className="plate-icon-large" />
                                  <div className="plate-meta">
                                    <span className="plate-name-display">{medal.name}</span>
                                    <span className="plate-cat-badge">{medal.category}</span>
                                  </div>
                                  <button className="remove-plate-btn" onClick={() => removePlate(slotNum)} title="Remove Plate">
                                    <FaTrash />
                                  </button>
                                </div>
                                <div className="plate-effect-box">
                                  <div className="effect-label">EFFECT</div>
                                  <p className="effect-text">{medal.description}</p>
                                </div>
                              </div>
                            ) : (
                              <div className="plate-picker-section">
                                <div className="picker-search-bar">
                                  <input 
                                    type="text" 
                                    placeholder="Search plates..."
                                    value={plateSearch[slotNum] || ''}
                                    onChange={(e) => setPlateSearch(prev => ({ ...prev, [slotNum]: e.target.value }))}
                                  />
                                </div>
                                <div className="plate-list-scroll">
                                  {skillPlatesData
                                    .filter(p => p.name.toLowerCase().includes((plateSearch[slotNum] || '').toLowerCase()))
                                    .map((p, idx) => (
                                      <div key={`${p.name}-${idx}`} className="plate-picker-item" onClick={() => handlePlateSelect(slotNum, p)}>
                                        <img src={p.imageUrl} alt={p.name} className="mini-plate-icon" />
                                        <div className="plate-picker-info">
                                          <div className="plate-picker-name">
                                            {p.name}
                                            <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, color: p.category === 'Skill Plate' ? '#a78bfa' : '#ffd700', background: p.category === 'Skill Plate' ? 'rgba(167,139,250,0.12)' : 'rgba(255,215,0,0.12)', padding: '1px 5px', borderRadius: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                              {p.category === 'Skill Plate' ? 'Skill' : 'Ultimate'}
                                            </span>
                                          </div>
                                          <div className="plate-picker-desc">{p.description.substring(0, 60)}...</div>
                                        </div>
                                      </div>
                                    ))
                                  }
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="strap-config-footer">
          <div className="footer-info">
             Settings are applied immediately to the preview but must be saved to persist.
          </div>
          <div className="footer-actions">
            <button className="btn-cancel" onClick={onClose}>Cancel</button>
            <button className="btn-primary-gradient" onClick={() => onSave(localStrap)}>Apply to Wrestler</button>
          </div>
        </div>
      </div>
    </div>
  );
};
