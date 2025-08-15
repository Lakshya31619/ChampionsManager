import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import WrestlerCard from './WrestlerCard';
import { FaFilter } from 'react-icons/fa';
import data from '../../data.json';

const AddWrestler = () => {
  const [wrestlers, setWrestlers] = useState([]);
  const [rosterIds, setRosterIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [addedWrestlers, setAddedWrestlers] = useState(new Set());
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingWrestler, setPendingWrestler] = useState(null);
  const [pendingWrestlerName, setPendingWrestlerName] = useState('');

  const [filterOption, setFilterOption] = useState('name-asc');
  const [eraFilter, setEraFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const eraOptions = [
    { label: 'All Eras', value: 'all' },
    { label: 'Legends', value: 'Era_Classic' },
    { label: 'Modern', value: 'Era_Modern' },
    { label: 'Ruthless Aggression', value: 'Era_RuthlessAggression' },
    { label: 'Icons Of Wrestlemania', value: 'Era_IconsOfWrestleMania' },
    { label: 'Reality', value: 'Era_Reality' },
    { label: 'PG', value: 'Era_PG' },
    { label: 'Attitude', value: 'Era_Attitude' },
    { label: 'New Generation', value: 'Era_NewGen' },
    { label: 'Hall Of Fame', value: 'Era_HallOfFame' },
  ];

  const classFilterMap = {
    all: 'all',
    Showboat: 'Color_Yellow',
    Striker: 'Color_Black',
    Powerhouse: 'Color_Red',
    Technician: 'Color_Green',
    Trickster: 'Color_Purple',
    Acrobat: 'Color_Blue',
  };

  const localDataMap = useMemo(() => {
    const map = new Map();
    data.data.forEach(entry => map.set(entry.superstarId, entry));
    return map;
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        const [wrestlersRes, rosterRes] = await Promise.all([
          api.get('/wrestlers'),
          api.get('/roster'),
        ]);

        const wrestlerData = wrestlersRes.data?.wrestlers || [];
        const rosterData = rosterRes.data?.roster || [];

        const existingIds = new Set(
          rosterData.map(item =>
            item.wrestlerId ?? item.wrestlerData?.ID ?? item.wrestlerData?.id ?? item.wrestlerData?._id
          )
        );
        setRosterIds(existingIds);

        const filtered = wrestlerData
          .filter(w => !existingIds.has(w.wrestlerId ?? w.ID ?? w.id ?? w._id))
          .map(w => {
            const merged = { ...w };
            const local = localDataMap.get(w.superstarId);
            if (local) {
              merged.recruit_shards = local.recruit_shards ?? merged.recruit_shards;
              merged.style = local.style ?? merged.style;
            }
            return merged;
          });

        setWrestlers(filtered);
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Failed to load wrestlers. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [localDataMap]);

  const requestAddWrestler = wrestlerData => {
    const wrestlerName = wrestlerData.name || `${wrestlerData.firstName ?? ''} ${wrestlerData.lastName ?? ''}`.trim();
    setPendingWrestler(wrestlerData);
    setPendingWrestlerName(wrestlerName);
    setShowConfirmModal(true);
  };

  const confirmAddWrestler = async () => {
  if (!pendingWrestler) return;

  const wrestlerId =
    pendingWrestler.wrestlerId ||
    pendingWrestler.ID ||
    pendingWrestler.id ||
    pendingWrestler._id;

  setAddedWrestlers(prev => new Set(prev).add(wrestlerId));
  setShowConfirmModal(false);
  setPendingWrestlerName('');

  try {
    // Unified payload for add-or-update endpoint
    const rosterPayload = {
      wrestlerId,
      name: pendingWrestler.name ||
            `${pendingWrestler.firstName || ''} ${pendingWrestler.lastName || ''}`.trim(),
      superstarId: pendingWrestler.superstarId,
      shards: pendingWrestler.shards || pendingWrestler.recruit_shards || 0,
      style: pendingWrestler.style || 'Unknown',
      era: pendingWrestler.era || null,
      class: pendingWrestler.class || pendingWrestler.color || null
    };

    // Single call handles both adding and updating
    await api.post('/roster', rosterPayload); 

    // Remove added wrestler from local list
    setWrestlers(prev =>
      prev.filter(w =>
        (w.wrestlerId || w.ID || w.id || w._id) !== wrestlerId
      )
    );

    // Notify other parts of the app
    window.dispatchEvent(new Event('roster-updated'));
  } catch (err) {
    const message = err.response?.data?.message || 'Failed to add/update wrestler';
    setAddedWrestlers(prev => {
      const copy = new Set(prev);
      copy.delete(wrestlerId);
      return copy;
    });
    setError(message);
    console.error('Add/update wrestler failed:', err);
  }
};


  const filteredWrestlers = useMemo(() => {
    const list = wrestlers.filter(wrestler => {
      const name = wrestler.name ?? `${wrestler.firstName ?? ''} ${wrestler.lastName ?? ''}`.trim();
      const matchesName = name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEra = eraFilter === 'all' || wrestler.era === eraFilter;
      const wrestlerClass = wrestler.class ?? wrestler.Class ?? wrestler.color;
      const matchesClass = classFilter === 'all' || wrestlerClass === classFilterMap[classFilter];
      return matchesName && matchesEra && matchesClass;
    });

    const sorters = {
      'name-asc': (a, b) => (a.name ?? '').localeCompare(b.name ?? ''),
      'name-desc': (a, b) => (b.name ?? '').localeCompare(a.name ?? ''),
      'shards-asc': (a, b) => (a.recruit_shards ?? 0) - (b.recruit_shards ?? 0),
      'shards-desc': (a, b) => (b.recruit_shards ?? 0) - (a.recruit_shards ?? 0),
      'id-asc': (a, b) => (a.superstarId ?? 0) - (b.superstarId ?? 0),
      'id-desc': (a, b) => (b.superstarId ?? 0) - (a.superstarId ?? 0),
    };

    return list.sort(sorters[filterOption] ?? sorters['name-asc']);
  }, [wrestlers, searchTerm, eraFilter, classFilter, filterOption]);

  if (loading) return <div className="loading">Loading wrestlers...</div>;

  return (
    <div className="roster-wrapper">
      <div className="roster-search-section">
        <h2>Unrecruited ({filteredWrestlers.length})</h2>
        <div className="roster-search-controls">
          <select value={eraFilter} onChange={e => setEraFilter(e.target.value)}>
            {eraOptions.map(era => (
              <option key={era.value} value={era.value}>{era.label}</option>
            ))}
          </select>

          <select value={classFilter} onChange={e => setClassFilter(e.target.value)}>
            <option value="all">All Classes</option>
            {Object.keys(classFilterMap).filter(c => c !== 'all').map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <input
            type="text"
            className="search-input"
            placeholder="Search wrestlers..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />

          <button onClick={() => setShowFilterMenu(!showFilterMenu)} className="filter-toggle-btn" title="Sort">
            <FaFilter />
          </button>

          {showFilterMenu && (
            <div className="filter-menu">
              <div onClick={() => setFilterOption('name-asc')}>Name A-Z</div>
              <div onClick={() => setFilterOption('name-desc')}>Name Z-A</div>
              <div onClick={() => setFilterOption('shards-asc')}>Shards ↑</div>
              <div onClick={() => setFilterOption('shards-desc')}>Shards ↓</div>
              <div onClick={() => setFilterOption('id-asc')}>ID ↑</div>
              <div onClick={() => setFilterOption('id-desc')}>ID ↓</div>
            </div>
          )}
        </div>

        {error && <div className="error">{error}</div>}
      </div>

      {filteredWrestlers.length === 0 ? (
        <div className="roster-empty">
          {searchTerm || classFilter !== 'all'
            ? 'No wrestlers match your search or filter.'
            : 'No wrestlers available to add.'}
        </div>
      ) : (
        <div className="wrestlers-grid">
          {filteredWrestlers.map(wrestler => {
            const wrestlerId = wrestler.wrestlerId ?? wrestler.ID ?? wrestler.id ?? wrestler._id;
            const isAdded = addedWrestlers.has(wrestlerId);

            return (
              <div key={wrestlerId} style={{ position: 'relative' }}>
                {isAdded && (
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: '#4CAF50',
                    color: 'white',
                    padding: '5px 10px',
                    borderRadius: '15px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    zIndex: 1
                  }}>Added ✓</div>
                )}
                <WrestlerCard wrestler={wrestler} onAdd={requestAddWrestler} isRosterItem={false} />
              </div>
            );
          })}
        </div>
      )}

      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Confirm Addition</h3>
            <p>Are you sure you want to add <strong>{pendingWrestlerName}</strong> to your roster?</p>
            <div className="modal-buttons">
              <button onClick={confirmAddWrestler} className="modal-btn success">Yes, Add</button>
              <button onClick={() => setShowConfirmModal(false)} className="modal-btn">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddWrestler;
