import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FaSearch, FaChevronDown } from 'react-icons/fa';

const WrestlerGridPicker = ({ wrestlers, selectedId, onSelect, placeholder = "Select a Wrestler" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Extract necessary fields uniformly
  const extractedList = useMemo(() => {
    return wrestlers.map(w => {
      const id = String(w.wrestlerId ?? w.ID ?? w.superstarId ?? w.groupId ?? w._id ?? w.id ?? '');
      const name = w.name || w.wrestlerName || w.title || w.wrestlerData?.name || `${w.firstName || ''} ${w.lastName || ''}`.trim() || 'Unknown Wrestler';
      const image = w.image || w.wrestlerData?.image || null;
      const wClass = w.class || w.Class || w.color || w.wrestlerData?.class || 'Unknown';
      const rarity = w.rarity || '1★ Bronze';
      const level = w.level || 1;
      return { id, name, image, wClass, rarity, level, raw: w };
    });
  }, [wrestlers]);

  // Find currently selected item details
  const selectedItem = useMemo(() => {
    if (!selectedId) return null;
    return extractedList.find(w => w.id === selectedId) || null;
  }, [extractedList, selectedId]);

  // Filter based on search
  const filteredList = useMemo(() => {
    if (!search.trim()) return extractedList;
    const lowerSearch = search.toLowerCase();
    return extractedList.filter(w => w.name.toLowerCase().includes(lowerSearch));
  }, [extractedList, search]);

  const handleSelect = (id) => {
    onSelect(id);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="wrestler-grid-picker" ref={dropdownRef}>
      {/* Trigger Button */}
      <button 
        className={`picker-trigger ${isOpen ? 'open' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        {selectedItem ? (
          <div className="trigger-selected-info">
            {selectedItem.image && <img src={selectedItem.image} alt={selectedItem.name} className="trigger-portrait" />}
            <span className="trigger-name">{selectedItem.name}</span>
          </div>
        ) : (
          <span className="trigger-placeholder">{placeholder}</span>
        )}
        <FaChevronDown className="trigger-icon" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="picker-dropdown-menu">
          <div className="picker-search-bar">
            <FaSearch className="search-icon" />
            <input 
              type="text" 
              placeholder="Search wrestlers..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          <div className="picker-grid-container">
            {filteredList.length > 0 ? (
              <div className="picker-grid">
                {filteredList.map(w => (
                  <div 
                    key={w.id} 
                    className={`picker-card ${w.id === selectedId ? 'selected' : ''}`}
                    onClick={() => handleSelect(w.id)}
                  >
                    <div className="card-image-wrap">
                      {w.image ? (
                        <img src={w.image} alt={w.name} />
                      ) : (
                        <div className="no-image">No Image</div>
                      )}
                      {w.raw.level && <div className="card-level-badge">Lv {w.raw.level}</div>}
                    </div>
                    <div className="card-meta">
                      <div className="card-class-strip" data-class={w.wClass}></div>
                      <div className="card-name" title={w.name}>{w.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="picker-empty-state">No wrestlers found matching "{search}"</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WrestlerGridPicker;
