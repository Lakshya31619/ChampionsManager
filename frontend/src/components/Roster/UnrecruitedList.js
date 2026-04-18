import React, { useState, useMemo } from 'react';
import api from '../../services/api';
import WrestlerCard from './WrestlerCard';
import WrestlerDetailModal from './WrestlerDetailModal';
import { FaFilter, FaSync, FaUserPlus } from 'react-icons/fa';
import { ERA_OPTIONS, CLASS_FILTER_MAP, STYLE_OPTIONS } from '../../utils/constants';

const resolveId    = (w) => String(w.wrestlerId ?? w._id ?? '');
const resolveName  = (w) => w.wrestlerName || w.wrestlerData?.name || w.name || 'Unknown Wrestler';
const resolveImage = (w) =>
  w.wrestlerData?.image    ||
  w.wrestlerData?.imagePNG ||
  w.wrestlerData?.imageUrl ||
  w.image    ||
  w.imagePNG ||
  w.imageUrl ||
  null;
const resolveClass = (w) =>
  w.wrestlerData?.class || w.wrestlerData?.Class ||
  w.class || w.Class || w.color || null;

const STORAGE_KEY = 'unrecruited_edits';

// Load edits from localStorage
const loadEditsFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (err) {
    console.error('Failed to load edits from storage:', err);
    return {};
  }
};

// Save edits to localStorage
const saveEditsToStorage = (edits) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(edits));
  } catch (err) {
    console.error('Failed to save edits to storage:', err);
  }
};

const UnrecruitedList = ({ unrecruited = [], loading, onEntryUpdated, onRecruited }) => {
  const [selectedId, setSelectedId]   = useState(null);
  const [searchTerm, setSearchTerm]   = useState('');
  const [filterOption, setFilterOption] = useState('name-asc');
  const [eraFilter, setEraFilter]     = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [styleFilter, setStyleFilter] = useState('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [syncing, setSyncing]         = useState(false);
  const [syncMsg, setSyncMsg]         = useState('');
  const [localError, setLocalError]   = useState('');
  // Local edits persisted in localStorage across page refreshes
  const [localEdits, setLocalEdits] = useState(() => loadEditsFromStorage());

  const selectedWrestler = selectedId
    ? (() => {
        const found = unrecruited.find(w => resolveId(w) === selectedId);
        return found && localEdits[found._id] ? { ...found, ...localEdits[found._id] } : found;
      })()
    : null;

  // ── Sync catalog from live API ──────────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg('');
    setLocalError('');
    try {
      const res = await api.post('/roster/sync-catalog');
      setSyncMsg(res.data?.message || 'Sync complete!');
      window.dispatchEvent(new Event('roster-updated'));
    } catch (err) {
      setLocalError(err.response?.data?.message || 'Sync failed. Try again.');
    } finally {
      setSyncing(false);
    }
  };

  // ── Update from card changes (rarity/shards dropdowns) ─────────────────────
  const handleCardUpdate = async (wrestlerId, updates) => {
    try {
      const res = await api.put(`/roster/${wrestlerId}`, updates);
      if (onEntryUpdated) onEntryUpdated(res.data.rosterEntry);
      // Store in localStorage for persistence
      const updatedEdits = {
        ...localEdits,
        [wrestlerId]: res.data.rosterEntry,
      };
      setLocalEdits(updatedEdits);
      saveEditsToStorage(updatedEdits);
    } catch (err) {
      setLocalError(err.response?.data?.message || 'Failed to save changes.');
    }
  };

  // ── Recruit (isRecruited → true) ────────────────────────────────────────────
  const handleRecruit = async (wrestler) => {
    try {
      const res = await api.put(`/roster/${wrestler._id}`, { isRecruited: true });
      if (onRecruited) onRecruited(res.data.rosterEntry);
      // Clear local edits for this wrestler from memory and storage
      const updatedEdits = { ...localEdits };
      delete updatedEdits[wrestler._id];
      setLocalEdits(updatedEdits);
      saveEditsToStorage(updatedEdits);
      window.dispatchEvent(new Event('roster-updated'));
    } catch (err) {
      setLocalError(err.response?.data?.message || 'Failed to recruit.');
    }
  };

  // ── Save edits from detail modal ────────────────────────────────────────────
  const handleSaveEdits = async (id, level, equippedMoves, moveLevels, strap, hypeLevel, hypePoints, starKey) => {
    if (!selectedWrestler) return;
    try {
      const updates = {
        level: level,
        equippedMoves: equippedMoves,
        moveLevels: moveLevels,
        strap: strap,
        hypeLevel: hypeLevel,
        hypePoints: hypePoints,
        starKey: starKey,
      };
      const res = await api.put(`/roster/${selectedWrestler._id}`, updates);
      if (onEntryUpdated) onEntryUpdated(res.data.rosterEntry);
      // Store in both memory AND localStorage for persistence across page refresh
      const updatedEdits = {
        ...localEdits,
        [selectedWrestler._id]: res.data.rosterEntry,
      };
      setLocalEdits(updatedEdits);
      saveEditsToStorage(updatedEdits);
    } catch (err) {
      setLocalError(err.response?.data?.message || 'Failed to save.');
    }
    setSelectedId(null);
  };

  // ── Filtered + sorted list ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    // Apply local edits on top of unrecruited data
    const wrestlersWithEdits = unrecruited.map(w => {
      const id = resolveId(w);
      return localEdits[w._id] ? { ...w, ...localEdits[w._id] } : w;
    });

    const list = wrestlersWithEdits.filter(w => {
      const name   = resolveName(w);
      const wClass = resolveClass(w);
      const era    = w.wrestlerData?.era || w.era;
      const style  = w.style || w.wrestlerData?.style;

      return (
        name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (eraFilter   === 'all' || era   === eraFilter) &&
        (classFilter === 'all' || wClass === CLASS_FILTER_MAP[classFilter]) &&
        (styleFilter === 'all' || style  === styleFilter)
      );
    });

    const sorters = {
      'name-asc':    (a, b) => resolveName(a).localeCompare(resolveName(b)),
      'name-desc':   (a, b) => resolveName(b).localeCompare(resolveName(a)),
      'shards-asc':  (a, b) => (a.shards ?? 0) - (b.shards ?? 0),
      'shards-desc': (a, b) => (b.shards ?? 0) - (a.shards ?? 0),
    };
    return list.sort(sorters[filterOption] ?? sorters['name-asc']);
  }, [unrecruited, localEdits, searchTerm, eraFilter, classFilter, styleFilter, filterOption]);

  if (loading) return <div className="loading">Loading unrecruited wrestlers...</div>;

  return (
    <div className="roster-wrapper">
      {/* Header controls */}
      <div className="roster-search-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2>Unrecruited ({filtered.length})</h2>
          <button
            className="btn-primary-gradient"
            onClick={handleSync}
            disabled={syncing}
            title="Pull new wrestlers from the live WWE API and add them to database"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '8px 16px' }}
          >
            <FaSync className={syncing ? 'spin' : ''} />
            {syncing ? 'Syncing…' : 'Update Database from API'}
          </button>
        </div>

        {syncMsg  && <div style={{ color: '#4bde68', marginBottom: '8px', fontSize: '13px' }}>✓ {syncMsg}</div>}
        {localError && <div className="error">{localError}</div>}

        <div className="roster-search-controls">
          <select value={eraFilter} onChange={e => setEraFilter(e.target.value)}>
            {ERA_OPTIONS.map(era => <option key={era.value} value={era.value}>{era.label}</option>)}
          </select>

          <select value={classFilter} onChange={e => setClassFilter(e.target.value)}>
            <option value="all">All Classes</option>
            {Object.keys(CLASS_FILTER_MAP).map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={styleFilter} onChange={e => setStyleFilter(e.target.value)}>
            <option value="all">All Styles</option>
            {STYLE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <input
            type="text"
            className="search-input"
            placeholder="Search wrestlers…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />

          <button onClick={() => setShowFilterMenu(!showFilterMenu)} className="filter-toggle-btn" title="Sort">
            <FaFilter />
          </button>

          {showFilterMenu && (
            <div className="filter-menu">
              <div onClick={() => { setFilterOption('name-asc');    setShowFilterMenu(false); }}>Name A-Z</div>
              <div onClick={() => { setFilterOption('name-desc');   setShowFilterMenu(false); }}>Name Z-A</div>
              <div onClick={() => { setFilterOption('shards-asc');  setShowFilterMenu(false); }}>Shards ↑</div>
              <div onClick={() => { setFilterOption('shards-desc'); setShowFilterMenu(false); }}>Shards ↓</div>
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="roster-empty">
          {unrecruited.length === 0
            ? <>No wrestlers in database yet. Click <strong>"Update Database from API"</strong> to populate!</>
            : 'No wrestlers match your filters.'}
        </div>
      ) : (
        <div className="wrestlers-grid">
          {filtered.map(wrestler => {
            const id = resolveId(wrestler);
            return (
              <div key={id} style={{ position: 'relative' }}>
                {/* Quick Recruit overlay button on card */}
                <button
                  className="btn-recruit-overlay"
                  title="Recruit this wrestler"
                  onClick={(e) => { e.stopPropagation(); handleRecruit(wrestler); }}
                  style={{
                    position: 'absolute', top: '8px', right: '8px',
                    zIndex: 2, background: '#16a34a', color: '#fff',
                    border: 'none', borderRadius: '6px', padding: '4px 8px',
                    fontSize: '11px', fontWeight: 'bold', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}
                >
                  <FaUserPlus size={10} /> Recruit
                </button>

                <WrestlerCard
                  wrestler={{
                    ...wrestler,
                    name: resolveName(wrestler),
                    image: resolveImage(wrestler),
                    class: resolveClass(wrestler),
                    recruit_shards: wrestler.shards,
                  }}
                  isRosterItem={false}
                  onViewDetails={() => setSelectedId(id)}
                  onUpdate={handleCardUpdate}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal for editing shards/rarity/hype of unrecruited */}
      {selectedWrestler && (
        <WrestlerDetailModal
          wrestler={{
            ...selectedWrestler,
            rarity: selectedWrestler.rarity || '1★ Bronze',
            level:  selectedWrestler.level  || 1,
            style:  selectedWrestler.style  || selectedWrestler.wrestlerData?.style || 'Focused',
            wrestlerData: selectedWrestler.wrestlerData || selectedWrestler,
          }}
          onClose={() => setSelectedId(null)}
          onLevelSave={handleSaveEdits}
        />
      )}
    </div>
  );
};

export default UnrecruitedList;
