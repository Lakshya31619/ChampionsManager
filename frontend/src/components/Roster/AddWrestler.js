import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import WrestlerCard from './WrestlerCard';

const AddWrestler = () => {
  const [wrestlers, setWrestlers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [addedWrestlers, setAddedWrestlers] = useState(new Set());
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingWrestler, setPendingWrestler] = useState(null);
  const [pendingWrestlerName, setPendingWrestlerName] = useState('');

  useEffect(() => {
    fetchWrestlers();
  }, []);

  const fetchWrestlers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/wrestlers');
      const wrestlerData = response.data?.wrestlers || [];

      if (!Array.isArray(wrestlerData)) {
        console.warn("Wrestler data is not an array!", wrestlerData);
        setWrestlers([]);
      } else {
        setWrestlers(wrestlerData);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setError('Failed to load wrestlers. Please try again.');
      setWrestlers([]);
    } finally {
      setLoading(false);
    }
  };

  const requestAddWrestler = (wrestlerData) => {
    const wrestlerName = wrestlerData.name || `${wrestlerData.firstName || ''} ${wrestlerData.lastName || ''}`.trim();
    setPendingWrestler(wrestlerData);
    setPendingWrestlerName(wrestlerName);
    setShowConfirmModal(true);
  };

  const confirmAddWrestler = async () => {
    const wrestlerId = pendingWrestler.wrestlerId || pendingWrestler.ID || pendingWrestler.id || pendingWrestler._id;

    setAddedWrestlers(prev => new Set([...prev, wrestlerId]));

    setShowConfirmModal(false);
    setPendingWrestler(null);
    setPendingWrestlerName('');

    try {
      await api.post('/roster', pendingWrestler);
      setError('');

      window.dispatchEvent(new Event("roster-updated"));
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to add wrestler';
      setAddedWrestlers(prev => {
        const copy = new Set([...prev]);
        copy.delete(wrestlerId);
        return copy;
      });
      setError(message);
      console.error('Add wrestler failed:', error);
    }
  };

  const filteredWrestlers = wrestlers.filter(wrestler => {
    const name = wrestler.name || `${wrestler.firstName || ''} ${wrestler.lastName || ''}`.trim();
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) return <div className="loading">Loading wrestlers...</div>;

  return (
    <div>
      <div className="search-section">
        <h2>Add Wrestlers to Your Roster</h2>
        <input
          type="text"
          className="search-input"
          placeholder="Search wrestlers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {error && <div className="error">{error}</div>}

        {addedWrestlers.size > 0 && (
          <div style={{ 
            color: '#4CAF50', 
            fontSize: '16px', 
            marginTop: '10px',
            textAlign: 'center'
          }}>
            ✅ {addedWrestlers.size} wrestler{addedWrestlers.size !== 1 ? 's' : ''} added to roster
          </div>
        )}
      </div>

      {filteredWrestlers.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'white', fontSize: '18px', marginTop: '50px' }}>
          {searchTerm ? 'No wrestlers found matching your search.' : 'No wrestlers available.'}
        </div>
      ) : (
        <div className="wrestlers-grid">
          {filteredWrestlers.map(wrestler => {
            const wrestlerId = wrestler.ID || wrestler.id || wrestler._id;
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
                  }}>
                    Added ✓
                  </div>
                )}
                <WrestlerCard
                  wrestler={wrestler}
                  onAdd={requestAddWrestler}
                  isRosterItem={false}
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