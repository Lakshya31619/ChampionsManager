import React, { useState } from 'react';
import RosterList from '../Roster/RosterList';
import AddWrestler from '../Roster/AddWrestler';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('roster');
  const [refreshRoster, setRefreshRoster] = useState(0);

  const handleWrestlerAdded = () => {
    setRefreshRoster(prev => prev + 1);
    setActiveTab('roster');
  };

  return (
    <div className="dashboard-layout">
      <div className="tabs-vertical">
        <button 
          className={`tab ${activeTab === 'roster' ? 'active' : ''}`}
          onClick={() => setActiveTab('roster')}
        >
          My Roster
        </button>
        <button 
          className={`tab ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => setActiveTab('add')}
        >
          Add Wrestlers
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'roster' && (
          <RosterList key={refreshRoster} />
        )}
        {activeTab === 'add' && (
          <AddWrestler onWrestlerAdded={handleWrestlerAdded} />
        )}
      </div>
    </div>
  );
};

export default Dashboard;