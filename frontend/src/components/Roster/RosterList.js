import React, { useState, useEffect } from 'react';
import { FaFilter } from 'react-icons/fa';
import api from '../../services/api';
import WrestlerCard from './WrestlerCard';

const RosterList = () => {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOption, setFilterOption] = useState('name-asc');
  const [classFilter, setClassFilter] = useState('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [pendingDeleteName, setPendingDeleteName] = useState('');

  useEffect(() => {
    fetchRoster();

    const handleRosterUpdate = () => {
      fetchRoster();
    };

    window.addEventListener("roster-updated", handleRosterUpdate);

    return () => {
      window.removeEventListener("roster-updated", handleRosterUpdate);
    };
  }, []);

  const fetchRoster = async () => {
    try {
      setLoading(true);
      const response = await api.get('/roster');
      setRoster(response.data.roster);
    } catch (error) {
      setError('Failed to fetch roster');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id, updates) => {
    try {
      const response = await api.put(`/roster/${id}`, updates);
      setRoster(roster.map(item =>
        item._id === id ? response.data.rosterEntry : item
      ));
      return { success: true };
    } catch (error) {
      console.error('Update failed:', error);
      return { success: false, message: 'Update failed' };
    }
  };

  const requestDelete = (id, name) => {
    setPendingDeleteId(id);
    setPendingDeleteName(name);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/roster/${pendingDeleteId}`);
      setRoster(roster.filter(item => item._id !== pendingDeleteId));
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setShowConfirmModal(false);
      setPendingDeleteId(null);
      setPendingDeleteName('');
    }
  };

  const handleFilterSelect = (option) => {
    setFilterOption(option);
    setShowFilterMenu(false);
  };

  const classFilterMap = {
    all: 'all',
    Showboat: 'Color_Yellow',
    Striker: 'Color_Black',
    Powerhouse: 'Color_Red',
    Technician: 'Color_Green',
    Trickster: 'Color_Purple',
    Acrobat: 'Color_Blue',
  };

  let filteredRoster = roster.filter(wrestler => {
    const matchesName = (wrestler.wrestlerName || '').toLowerCase().includes(searchTerm.toLowerCase());

    const wrestlerClass = wrestler.wrestlerData?.class;
    const matchesClass =
      classFilter === 'all' ||
      wrestlerClass === classFilterMap[classFilter];

    return matchesName && matchesClass;
  });

  const activeFilter = filterOption || 'name-asc';

  if (activeFilter === 'name-asc') {
    filteredRoster.sort((a, b) => (a.wrestlerName || '').localeCompare(b.wrestlerName || ''));
  } else if (activeFilter === 'name-desc') {
    filteredRoster.sort((a, b) => (b.wrestlerName || '').localeCompare(a.wrestlerName || ''));
  } else if (activeFilter === 'shards-asc') {
    filteredRoster.sort((a, b) => (a.shards || 0) - (b.shards || 0));
  } else if (activeFilter === 'shards-desc') {
    filteredRoster.sort((a, b) => (b.shards || 0) - (a.shards || 0));
  } else if (activeFilter === 'rarity-asc') {
    filteredRoster.sort((a, b) => (a.rarity || '').localeCompare(b.rarity || ''));
  } else if (activeFilter === 'rarity-desc') {
    filteredRoster.sort((a, b) => (b.rarity || '').localeCompare(a.rarity || ''));
  }

  return (
    <div className="roster-wrapper">
      <div className="roster-search-section">
        <h2>My Roster ({filteredRoster.length}
          {classFilter !== 'all'}
        )</h2>
        <div className="roster-search-controls">
          <select
            className="class-filter"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
          >
            <option value="all">All Classes</option>
            <option value="Showboat">Showboat</option>
            <option value="Striker">Striker</option>
            <option value="Powerhouse">Powerhouse</option>
            <option value="Technician">Technician</option>
            <option value="Trickster">Trickster</option>
            <option value="Acrobat">Acrobat</option>
          </select>

          <input
            type="text"
            className="search-input"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className="filter-toggle-btn"
            title="Filter"
          >
            <FaFilter />
          </button>

          {showFilterMenu && (
            <div className="filter-menu">
              <div onClick={() => handleFilterSelect('name-asc')}>Name A-Z</div>
              <div onClick={() => handleFilterSelect('name-desc')}>Name Z-A</div>
              <div onClick={() => handleFilterSelect('shards-asc')}>Shards ↑</div>
              <div onClick={() => handleFilterSelect('shards-desc')}>Shards ↓</div>
              <div onClick={() => handleFilterSelect('rarity-asc')}>Rarity A-Z</div>
              <div onClick={() => handleFilterSelect('rarity-desc')}>Rarity Z-A</div>
            </div>
          )}
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {filteredRoster.length === 0 ? (
        <div className="roster-empty">
          {searchTerm || classFilter !== 'all'
            ? 'No wrestlers match your search or filter.'
            : 'Your roster is empty. Add some wrestlers!'}
        </div>
      ) : (
        <div className="wrestlers-grid">
          {filteredRoster.map(wrestler => (
            <WrestlerCard
              key={wrestler._id}
              wrestler={wrestler}
              onUpdate={handleUpdate}
              onDelete={() => requestDelete(wrestler._id, wrestler.wrestlerName)}
              isRosterItem={true}
            />
          ))}
        </div>
      )}

      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Confirm Removal</h3>
            <p>
              Are you sure you want to remove <strong>{pendingDeleteName}</strong> from your roster?
            </p>
            <div className="modal-buttons">
              <button onClick={confirmDelete} className="modal-btn danger">Yes, Remove</button>
              <button onClick={() => setShowConfirmModal(false)} className="modal-btn">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RosterList;