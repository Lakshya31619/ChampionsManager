import React, { useState, useEffect, useCallback, useMemo } from 'react';
import RosterList from '../Roster/RosterList';
import UnrecruitedList from '../Roster/UnrecruitedList';
import DamageCalculator from '../Roster/DamageCalculator';
import api from '../../services/api';

const toStrId = (val) => (val != null ? String(val).trim() : '');

const Dashboard = () => {
  const [activeTab, setActiveTab]       = useState('roster');
  const [rosterSubTab, setRosterSubTab] = useState('recruited');

  const [roster,      setRoster]      = useState([]);
  const [unrecruited, setUnrecruited] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(true);

  // ── Fetch recruited + unrecruited from DB ──────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoadingRoster(true);
    try {
      const [rosterRes, unrecruitedRes] = await Promise.all([
        api.get('/roster'),
        api.get('/roster/unrecruited').catch(() => ({ data: { unrecruited: [] } })),
      ]);

      const norm = (arr) =>
        (arr || []).map(item => ({
          ...item,
          wrestlerId: toStrId(item.wrestlerId ?? item.wrestlerData?.superstarId),
        }));

      setRoster(norm(rosterRes.data?.roster));
      setUnrecruited(norm(unrecruitedRes.data?.unrecruited));
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoadingRoster(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Re-fetch on roster update event ONLY for unrecruited tab (not recruited)
  // This prevents modal flashing on recruited tab
  useEffect(() => {
    const handleRosterUpdated = () => {
      if (rosterSubTab === 'unrecruited') {
        fetchAll();
      }
    };
    window.addEventListener('roster-updated', handleRosterUpdated);
    return () => window.removeEventListener('roster-updated', handleRosterUpdated);
  }, [rosterSubTab]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleRosterUpdate = useCallback((id, updates) => {
    setRoster(prev => prev.map(item => item._id === id ? { ...item, ...updates } : item));
  }, []);

  const handleRosterDelete = useCallback((id) => {
    setRoster(prev => prev.filter(item => item._id !== id));
  }, []);

  // Called when an unrecruited wrestler's stat card is saved
  const handleEntryUpdated = useCallback((updated) => {
    if (!updated) return;
    const normalised = {
      ...updated,
      wrestlerId: toStrId(updated.wrestlerId ?? updated.wrestlerData?.superstarId),
    };
    setUnrecruited(prev =>
      prev.map(item => item._id === normalised._id ? normalised : item)
    );
  }, []);

  // Called when "Recruit" is clicked — move from unrecruited → recruited
  const handleRecruited = useCallback((newEntry) => {
    if (!newEntry) return;
    const normalised = {
      ...newEntry,
      wrestlerId: toStrId(newEntry.wrestlerId ?? newEntry.wrestlerData?.superstarId),
    };
    setRoster(prev => [normalised, ...prev.filter(r => r._id !== normalised._id)]);
    setUnrecruited(prev => prev.filter(item => item._id !== normalised._id));
    // Switch to Recruited tab so user sees their new pick
    setRosterSubTab('recruited');
  }, []);

  // ── All wrestlers for Damage Calculator (recruited + unrecruited, flat) ────
  const allWrestlers = [...roster, ...unrecruited];

  return (
    <div className="dashboard-layout">
      {/* Main sidebar tabs */}
      <div className="tabs-vertical">
        <button
          className={`tab ${activeTab === 'roster' ? 'active' : ''}`}
          onClick={() => setActiveTab('roster')}
        >
          My Roster
        </button>
        <button
          className={`tab ${activeTab === 'damageCal' ? 'active' : ''}`}
          onClick={() => setActiveTab('damageCal')}
        >
          Damage Calculator
        </button>
      </div>

      <div className="dashboard-content">
        {/* ── My Roster: Recruited / Unrecruited sub-tabs ── */}
        {activeTab === 'roster' && (
          <div>
            {/* Sub-tab navigation */}
            <div className="roster-subtabs">
              <button
                className={`roster-subtab ${rosterSubTab === 'recruited' ? 'active' : ''}`}
                onClick={() => setRosterSubTab('recruited')}
              >
                Recruited
                <span className="subtab-badge">{roster.length}</span>
              </button>
              <button
                className={`roster-subtab ${rosterSubTab === 'unrecruited' ? 'active' : ''}`}
                onClick={() => setRosterSubTab('unrecruited')}
              >
                Unrecruited
                <span className="subtab-badge">{unrecruited.length}</span>
              </button>
            </div>

            {rosterSubTab === 'recruited' && (
              <RosterList
                roster={roster}
                loading={loadingRoster && roster.length === 0}
                onUpdate={handleRosterUpdate}
                onDelete={handleRosterDelete}
              />
            )}

            {rosterSubTab === 'unrecruited' && (
              <UnrecruitedList
                unrecruited={unrecruited}
                loading={loadingRoster && unrecruited.length === 0}
                onEntryUpdated={handleEntryUpdated}
                onRecruited={handleRecruited}
              />
            )}
          </div>
        )}

        {activeTab === 'damageCal' && (
          <DamageCalculator
            roster={roster}
            unrecruitedWrestlers={allWrestlers}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;