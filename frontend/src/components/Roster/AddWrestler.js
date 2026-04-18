import React, { useState, useMemo } from 'react';
import api from '../../services/api';
import WrestlerCard from './WrestlerCard';
import WrestlerDetailModal from './WrestlerDetailModal';
import { FaFilter } from 'react-icons/fa';
import { ERA_OPTIONS, CLASS_FILTER_MAP, STYLE_OPTIONS } from '../../utils/constants';

const AddWrestler = ({ wrestlers = [], loading, error: propError, onWrestlerAdded }) => {
  const [addedWrestlers, setAddedWrestlers] = useState(new Set());
  const [localError, setLocalError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingWrestler, setPendingWrestler] = useState(null);
  const [pendingWrestlerName, setPendingWrestlerName] = useState('');
  const [selectedWrestlerId, setSelectedWrestlerId] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterOption, setFilterOption] = useState('name-asc');
  const [eraFilter, setEraFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [styleFilter, setStyleFilter] = useState('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showWishlistOnly, setShowWishlistOnly] = useState(false);

  const error = propError || localError;

  const resolveId = (w) => w.superstarId ?? w.wrestlerId ?? w.ID ?? w.id ?? w._id;
  const resolveName = (w) =>
    w.name || w.title || `${w.firstName || ''} ${w.lastName || ''}`.trim() || 'Unknown Wrestler';

  const selectedWrestler = selectedWrestlerId 
    ? wrestlers.find(w => resolveId(w) === selectedWrestlerId) || null 
    : null;

  const requestAddWrestler = (wrestlerData) => {
    setPendingWrestler(wrestlerData);
    setPendingWrestlerName(resolveName(wrestlerData));
    setShowConfirmModal(true);
  };

  const confirmAddWrestler = async () => {
    if (!pendingWrestler) return;

    const wrestlerId = resolveId(pendingWrestler);
    const wrestlerName = resolveName(pendingWrestler);

    setAddedWrestlers(prev => new Set(prev).add(wrestlerId));
    setShowConfirmModal(false);
    setPendingWrestlerName('');

    try {
      let res;
      if (pendingWrestler._dbId) {
        res = await api.put(`/roster/${pendingWrestler._dbId}`, { isRecruited: true });
      } else {
        const rosterPayload = {
          wrestlerId,
          wrestlerName,
          rarity: pendingWrestler.rarity || '1★ Bronze',
          shards: pendingWrestler.recruit_shards || pendingWrestler.shards || 0,
          style: pendingWrestler.playStyle || pendingWrestler.style || 'Focused',
          hypeLevel: pendingWrestler.hypeLevel || 1,
          hypePoints: pendingWrestler.hypePoints || 0,
          wrestlerData: pendingWrestler,
          isRecruited: true
        };
        res = await api.post('/roster', rosterPayload);
      }

      if (onWrestlerAdded) {
        onWrestlerAdded(res.data?.rosterEntry);
      }

      window.dispatchEvent(new Event('roster-updated'));
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to add wrestler';

      setAddedWrestlers(prev => {
        const copy = new Set(prev);
        copy.delete(wrestlerId);
        return copy;
      });

      setLocalError(message);
      console.error('Add wrestler failed:', err);
    }
  };

  const filteredWrestlers = useMemo(() => {
    const list = wrestlers.filter(wrestler => {
      const name = resolveName(wrestler);
      const matchesName = name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEra = eraFilter === 'all' || wrestler.era === eraFilter;
      const wrestlerClass = wrestler.class ?? wrestler.Class ?? wrestler.color;
      const matchesClass =
        classFilter === 'all' ||
        wrestlerClass === CLASS_FILTER_MAP[classFilter];
      
      const wrestlerStyle = wrestler.playStyle ?? wrestler.style;
      const matchesStyle = styleFilter === 'all' || wrestlerStyle === styleFilter;
      const matchesWishlist = !showWishlistOnly || wrestler.isWishlist;

      return matchesName && matchesEra && matchesClass && matchesStyle && matchesWishlist;
    });

    const sorters = {
      'name-asc': (a, b) => resolveName(a).localeCompare(resolveName(b)),
      'name-desc': (a, b) => resolveName(b).localeCompare(resolveName(a)),
      'shards-asc': (a, b) => (a.recruit_shards ?? 0) - (b.recruit_shards ?? 0),
      'shards-desc': (a, b) => (b.recruit_shards ?? 0) - (a.recruit_shards ?? 0),
      'id-asc': (a, b) => (a.superstarId ?? 0) - (b.superstarId ?? 0),
      'id-desc': (a, b) => (b.superstarId ?? 0) - (a.superstarId ?? 0),
    };

    return list.sort(sorters[filterOption] ?? sorters['name-asc']);
  }, [wrestlers, searchTerm, eraFilter, classFilter, styleFilter, filterOption]);

  if (loading) return <div className="loading">Loading wrestlers...</div>;

  return (
    <div className="roster-wrapper">
      <div className="roster-search-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Unrecruited ({filteredWrestlers.length})</h2>
          <button 
            className={`btn-wishlist-toggle ${showWishlistOnly ? 'active' : ''}`}
            onClick={() => setShowWishlistOnly(!showWishlistOnly)}
            style={{ 
              padding: '8px 16px', background: showWishlistOnly ? '#e80303' : 'rgba(255,255,255,0.1)', 
              color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', cursor: 'pointer',
              fontWeight: 'bold', fontSize: '13px', transition: 'all 0.2s',
              boxShadow: showWishlistOnly ? '0 0 15px rgba(232,3,3,0.5)' : 'none'
            }}
          >
            {showWishlistOnly ? '★ Showing Wishlist' : '☆ Show Wishlist'}
          </button>
        </div>

        <div className="roster-search-controls" style={{ marginTop: '10px' }}>
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
            className="search-input"
            placeholder="Search wrestlers..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />

          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className="filter-toggle-btn"
            title="Sort"
          >
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
            const wrestlerId = resolveId(wrestler);
            const isAdded = addedWrestlers.has(wrestlerId);

            return (
              <div key={wrestlerId} style={{ position: 'relative' }}>
                {isAdded && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: '#16a34a',
                      color: 'white',
                      padding: '4px 10px',
                      borderRadius: '15px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      zIndex: 1,
                    }}
                  >
                    Added ✓
                  </div>
                )}
                <WrestlerCard
                  wrestler={wrestler}
                  onAdd={requestAddWrestler}
                  isRosterItem={false}
                  onViewDetails={(w) => setSelectedWrestlerId(resolveId(w))}
                />
              </div>
            );
          })}
        </div>
      )}

      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Confirm Addition</h3>
            <p>
              Add <strong>{pendingWrestlerName}</strong> to your roster?
            </p>
            <div className="modal-buttons">
              <button onClick={confirmAddWrestler} className="modal-btn success">
                Yes, Add
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

      {selectedWrestler && (
        <WrestlerDetailModal
          wrestler={{
             ...selectedWrestler,
             rarity: selectedWrestler.rarity || '1★ Bronze', 
             level: selectedWrestler.level || 1,
             style: selectedWrestler.style || selectedWrestler.playStyle || 'Focused',
             wrestlerData: selectedWrestler
          }}
          onClose={() => setSelectedWrestlerId(null)}
          onLevelSave={async (updates) => {
            try {
              if (selectedWrestler._dbId) {
                const res = await api.put(`/roster/${selectedWrestler._dbId}`, updates);
                if (onWrestlerAdded) onWrestlerAdded(res.data.rosterEntry);
              } else {
                const payload = {
                  wrestlerId: resolveId(selectedWrestler),
                  wrestlerName: resolveName(selectedWrestler),
                  isRecruited: false,
                  wrestlerData: selectedWrestler,
                  ...updates
                };
                const res = await api.post('/roster', payload);
                if (onWrestlerAdded) onWrestlerAdded(res.data.rosterEntry);
              }
            } catch (err) {
              console.error('Failed to save wishlist data:', err);
            }
          }}
        />
      )}
    </div>
  );
};

export default AddWrestler;