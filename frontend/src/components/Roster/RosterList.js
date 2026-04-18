import React, { useState, useMemo, useEffect } from 'react';
import { FaFilter } from 'react-icons/fa';
import api from '../../services/api';
import WrestlerCard from './WrestlerCard';
import WrestlerDetailModal from './WrestlerDetailModal';
import { ERA_OPTIONS, CLASS_FILTER_MAP, STYLE_OPTIONS } from '../../utils/constants';

const RosterList = ({ roster = [], loading, onUpdate, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOption, setFilterOption] = useState('name-asc');
  const [eraFilter, setEraFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [styleFilter, setStyleFilter] = useState('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [error, setError] = useState('');

  const [selectedWrestlerId, setSelectedWrestlerId] = useState(null);

  // Memoize selectedWrestler to prevent unnecessary re-renders
  const selectedWrestler = useMemo(() => {
    return selectedWrestlerId
      ? roster.find(w => w._id === selectedWrestlerId)
      : null;
  }, [selectedWrestlerId, roster]);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [pendingDeleteName, setPendingDeleteName] = useState('');

  const handleUpdate = async (id, updates) => {
    setError('');

    // instant UI update
    onUpdate?.(id, updates);

    try {
      const response = await api.put(`/roster/${id}`, updates);

      // keep latest edited values even if backend sends defaults
      const saved = response.data?.rosterEntry || {};
      const merged = {
        ...saved,
        ...updates,
      };

      onUpdate?.(id, merged);
    } catch (err) {
      console.error('Roster update failed:', err);
      setError('Failed to save changes.');
    }
  };

  const handleLevelSave = async (id, level, equippedMoves, moveLevels, strap, hypeLevel, hypePoints, starKey) => {
    const updates = { level };

    if (Array.isArray(equippedMoves)) {
      updates.equippedMoves = equippedMoves;
    }

    if (moveLevels && typeof moveLevels === 'object') {
      updates.moveLevels = { ...moveLevels };
    }

    if (strap) {
      updates.strap = strap;
    }
    
    if (hypeLevel !== undefined) {
      updates.hypeLevel = hypeLevel;
    }
    
    if (hypePoints !== undefined) {
      updates.hypePoints = hypePoints;
    }

    if (starKey !== undefined) {
      updates.starKey = starKey;
    }

    await handleUpdate(id, updates);
  };

  const requestDelete = (id, name) => {
    setPendingDeleteId(id);
    setPendingDeleteName(name);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/roster/${pendingDeleteId}`);
      onDelete?.(pendingDeleteId);
    } catch (err) {
      console.error(err);
      setError('Failed to remove wrestler.');
    } finally {
      setShowConfirmModal(false);
      setPendingDeleteId(null);
      setPendingDeleteName('');
    }
  };

  const filteredRoster = useMemo(() => {
    const list = roster.filter(w => {
      const matchesSearch = (w.wrestlerName || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      
      const wrestlerEra = w.wrestlerData?.era;
      const matchesEra = eraFilter === 'all' || wrestlerEra === eraFilter;

      const wrestlerClass = w.wrestlerData?.class ?? w.wrestlerData?.Class ?? w.wrestlerData?.color;
      const matchesClass = 
        classFilter === 'all' || 
        wrestlerClass === CLASS_FILTER_MAP[classFilter];

      const matchesStyle = styleFilter === 'all' || w.style === styleFilter;

      return matchesSearch && matchesEra && matchesClass && matchesStyle;
    });

    const sorted = [...list];

    const activeFilter = filterOption || 'name-asc';

    if (activeFilter === 'name-asc') {
      sorted.sort((a, b) =>
        (a.wrestlerName || '').localeCompare(b.wrestlerName || '')
      );
    } else if (activeFilter === 'name-desc') {
      sorted.sort((a, b) =>
        (b.wrestlerName || '').localeCompare(a.wrestlerName || '')
      );
    } else if (activeFilter === 'shards-asc') {
      sorted.sort((a, b) => (a.shards || 0) - (b.shards || 0));
    } else if (activeFilter === 'shards-desc') {
      sorted.sort((a, b) => (b.shards || 0) - (a.shards || 0));
    } else if (activeFilter === 'rarity-asc') {
      sorted.sort((a, b) =>
        (a.rarity || '').localeCompare(b.rarity || '')
      );
    } else if (activeFilter === 'rarity-desc') {
      sorted.sort((a, b) =>
        (b.rarity || '').localeCompare(a.rarity || '')
      );
    }

    return sorted;
  }, [roster, searchTerm, filterOption, eraFilter, classFilter, styleFilter]);

  // Close modal if selected wrestler is deleted
  useEffect(() => {
    if (selectedWrestlerId && !roster.find(w => w._id === selectedWrestlerId)) {
      setSelectedWrestlerId(null);
    }
  }, [roster, selectedWrestlerId]);

  const handleFilterSelect = (option) => {
    setFilterOption(option);
    setShowFilterMenu(false);
  };

  if (loading) return <div className="loading">Loading roster...</div>;

  return (
    <div className="roster-wrapper">
      <div className="roster-search-section">
        <h2>My Roster ({roster.length})</h2>

        <div className="roster-search-controls">
          <select value={eraFilter} onChange={e => setEraFilter(e.target.value)}>
            {ERA_OPTIONS.map(era => (
              <option key={era.value} value={era.value}>
                {era.label}
              </option>
            ))}
          </select>

          <select value={classFilter} onChange={e => setClassFilter(e.target.value)}>
            <option value="all">All Classes</option>
            {Object.keys(CLASS_FILTER_MAP).map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select value={styleFilter} onChange={e => setStyleFilter(e.target.value)}>
            <option value="all">All Styles</option>
            {STYLE_OPTIONS.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />

          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            title="Sort"
            className="filter-toggle-btn"
          >
            <FaFilter />
          </button>

          {showFilterMenu && (
            <div className="filter-menu">
              <div onClick={() => handleFilterSelect('name-asc')}>
                Name A-Z
              </div>
              <div onClick={() => handleFilterSelect('name-desc')}>
                Name Z-A
              </div>
              <div onClick={() => handleFilterSelect('shards-asc')}>
                Shards ↑
              </div>
              <div onClick={() => handleFilterSelect('shards-desc')}>
                Shards ↓
              </div>
              <div onClick={() => handleFilterSelect('rarity-asc')}>
                Rarity A-Z
              </div>
              <div onClick={() => handleFilterSelect('rarity-desc')}>
                Rarity Z-A
              </div>
            </div>
          )}
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {filteredRoster.length === 0 ? (
        <div className="roster-empty">
          {searchTerm
            ? 'No wrestlers found.'
            : 'Your roster is empty. Add some wrestlers!'}
        </div>
      ) : (
        <div className="wrestlers-grid">
          {filteredRoster.map(w => (
            <WrestlerCard
              key={w._id}
              wrestler={w}
              onUpdate={handleUpdate}
              onDelete={() => requestDelete(w._id, w.wrestlerName)}
              isRosterItem={true}
              onViewDetails={(wrestler) =>
                setSelectedWrestlerId(wrestler._id)
              }
            />
          ))}
        </div>
      )}

      {selectedWrestler && (
        <WrestlerDetailModal
          wrestler={selectedWrestler}
          onClose={() => setSelectedWrestlerId(null)}
          onLevelSave={handleLevelSave}
        />
      )}

      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Confirm Removal</h3>
            <p>
              Remove <strong>{pendingDeleteName}</strong> from roster?
            </p>
            <div className="modal-buttons">
              <button
                onClick={confirmDelete}
                className="modal-btn danger"
              >
                Yes, Remove
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="modal-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RosterList;