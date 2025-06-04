import React, { useState, useEffect } from 'react';
import { FaTrash } from 'react-icons/fa';
import { RARITIES, RARITY_COLORS, RARITY_STAR_COLORS } from '../../utils/constants';

const WrestlerCard = ({ wrestler, onUpdate, onDelete, onAdd, isRosterItem = false }) => {
  const [rarity, setRarity] = useState(wrestler.rarity || '1★ Bronze');
  const [shards, setShards] = useState(wrestler.shards || 0);
  const [level, setLevel] = useState(wrestler.level || 1);
  const [imageError, setImageError] = useState(false);

  const getRarityColor = (rarity) => {
    if (RARITY_STAR_COLORS && RARITY_STAR_COLORS[rarity]) {
      return RARITY_STAR_COLORS[rarity];
    }
    if (rarity.includes('Bronze')) return RARITY_COLORS.Bronze;
    if (rarity.includes('Silver')) return RARITY_COLORS.Silver;
    if (rarity.includes('Gold')) return RARITY_COLORS.Gold;
    return '#666';
  };

  useEffect(() => {
    if (!isRosterItem) return;
    const timeout = setTimeout(() => {
      onUpdate(wrestler._id, {
        rarity,
        shards: parseInt(shards),
        level: parseInt(level),
      });
    }, 500);
    return () => clearTimeout(timeout);
  }, [rarity, shards, level]);

  const handleAdd = async () => {
    if (isRosterItem) return;
    try {
      const result = await onAdd({
        wrestlerId: wrestler.ID || wrestler.id || wrestler._id,
        rarity,
        shards: parseInt(shards)
      });

      if (result.success) {
        alert('Wrestler added to roster!');
        setRarity('1★ Bronze');
        setShards(0);
      } else {
        alert(result.message || 'Failed to add wrestler');
      }
    } catch (error) {
      console.error('Add error:', error);
      alert('Failed to add wrestler');
    }
  };

  const handleImageError = () => setImageError(true);

  const wrestlerInfo = isRosterItem ? (wrestler.wrestlerData || wrestler) : wrestler;

  const wrestlerName =
    wrestler.wrestlerName ||
    wrestlerInfo.name ||
    wrestlerInfo.title ||
    `${wrestlerInfo.firstName || ''} ${wrestlerInfo.lastName || ''}`.trim() ||
    'Unknown Wrestler';

  const getImageUrl = () => {
    if (imageError) return null;
    return wrestlerInfo.image || wrestlerInfo.imagePNG || wrestlerInfo.imageUrl;
  };

  const imageUrl = getImageUrl();

  return (
    <div className="wrestler-card" style={{ position: 'relative' }}>
      {/* Image */}
      <div className="wrestler-image-container">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={wrestlerName}
            className="wrestler-image"
            onError={handleImageError}
            loading="lazy"
          />
        ) : (
          <div className="wrestler-image-placeholder">
            <span>No Image</span>
          </div>
        )}
      </div>

      <div className="wrestler-name">{wrestlerName}</div>

      <div className="wrestler-details">
        <span className="detail-item rarity-star" style={{ backgroundColor: getRarityColor(rarity), color: '#fff' }}>
          {rarity}
        </span>
        <span className="detail-item">Shards: {shards}</span>
        {isRosterItem && <span className="detail-item">Level: {level}</span>}
        {wrestlerInfo.tier && (
          <span className={`detail-item tier-${wrestlerInfo.tier.toLowerCase()}`}>
            Tier: {wrestlerInfo.tier}
          </span>
        )}
      </div>

      <div className="controls">
        <select className="select-input" value={rarity} onChange={(e) => setRarity(e.target.value)}>
          {RARITIES.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <input
          type="number"
          className="number-input"
          value={shards}
          onChange={(e) => setShards(e.target.value)}
          min="0"
          placeholder="Shards"
        />

        {isRosterItem && (
          <input
            type="number"
            className="number-input"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            min="1"
            placeholder="Level"
          />
        )}
      </div>

      {isRosterItem ? (
        <FaTrash
          className="icon-button top-right"
          onClick={() => onDelete(wrestler._id)}
          title="Remove"
          style={{ cursor: 'pointer', position: 'absolute', top: '8px', right: '8px', color: '#dc3545', fontSize: '1.2rem' }}
        />
      ) : (
        <div className="controls" style={{ marginTop: '10px' }}>
          <button className="btn" onClick={handleAdd}>
            Add to Roster
          </button>
        </div>
      )}
    </div>
  );
};

export default WrestlerCard;