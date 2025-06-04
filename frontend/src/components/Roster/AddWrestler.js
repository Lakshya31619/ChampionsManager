import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import WrestlerCard from './WrestlerCard';

const AddWrestler = ({ onWrestlerAdded }) => {
  const [wrestlers, setWrestlers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [addedWrestlers, setAddedWrestlers] = useState(new Set());

  useEffect(() => {
    fetchWrestlers();
  }, []);

  const fetchWrestlers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/wrestlers');

      console.log("API response:", response);
      const wrestlerData = response.data?.wrestlers || [];

      if (!Array.isArray(wrestlerData)) {
        console.warn("Wrestler data is not an array!", wrestlerData);
        setWrestlers([]);
      } else {
        setWrestlers(wrestlerData);
      }
    } catch (error) {
      setError('Failed to fetch wrestlers from WWE API');
      console.error("Fetch error:", error);

      setWrestlers([
        { id: '1', name: 'Roman Reigns', tier: 'C'},
        { id: '2', name: 'John Cena', tier: 'C' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWrestler = async (wrestlerData) => {
    try {
      await api.post('/roster', wrestlerData);
      const wrestlerId = wrestlerData.wrestlerId;
      setAddedWrestlers(prev => new Set([...prev, wrestlerId]));
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to add wrestler';
      return { success: false, message };
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
                  onAdd={handleAddWrestler}
                  isRosterItem={false}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AddWrestler;