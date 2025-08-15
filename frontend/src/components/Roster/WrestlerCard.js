import React, { useState, useEffect } from 'react';
import { FaTrash } from 'react-icons/fa';
import { RARITIES, RARITY_COLORS, RARITY_STAR_COLORS } from '../../utils/constants';

const getWrestlerId = (wrestler) =>
  wrestler?.wrestlerId || wrestler?.ID || wrestler?.id || wrestler?._id || null;

const WrestlerCard = ({ wrestler, onUpdate, onDelete, onAdd, isRosterItem = false }) => {
  const [rarity, setRarity] = useState(wrestler.rarity || '1★ Bronze');
  const [shards, setShards] = useState(wrestler.shards || 0);
  const [level, setLevel] = useState(wrestler.level || 1);
  const [imageError, setImageError] = useState(false);

  const wrestlerInfo = isRosterItem ? (wrestler.wrestlerData || wrestler) : wrestler;
  const style = wrestlerInfo.style || wrestler.style || 'None';
  const recruitShards = wrestler.recruit_shards ?? wrestlerInfo.recruit_shards ?? '—';

  const getRarityColor = (rarity) => {
    if (RARITY_STAR_COLORS && RARITY_STAR_COLORS[rarity]) {
      return RARITY_STAR_COLORS[rarity];
    }
    if (rarity.includes('Bronze')) return RARITY_COLORS?.Bronze || '#a97142';
    if (rarity.includes('Silver')) return RARITY_COLORS?.Silver || '#c0c0c0';
    if (rarity.includes('Gold')) return RARITY_COLORS?.Gold || '#ffd700';
    return '#666';
  };

  const getRarityIcon = (rarity) => {
    const stars = rarity.match(/(\d+)★/)?.[1] || '1';
    if (rarity.includes('Bronze')) return `bronze_${stars}.png`;
    if (rarity.includes('Silver')) return `silver_${stars}.png`;
    if (rarity.includes('Gold')) return `gold_${stars}.png`;
    return null;
  };

  useEffect(() => {
    if (!isRosterItem) return;
    const timeout = setTimeout(() => {
      onUpdate(wrestler._id, {
        rarity,
        shards: parseInt(shards) || 0,
        level: parseInt(level) || 1,
      });
    }, 500);
    return () => clearTimeout(timeout);
  }, [rarity, shards, level]);

  const handleAdd = () => {
    if (isRosterItem) return;
    onAdd({
      ...wrestler,
      wrestlerId: getWrestlerId(wrestler),
      superstarId: wrestler.superstarId,
      rarity,
      shards: parseInt(shards) || 0,
      style,
    });
  };

  const handleImageError = () => setImageError(true);

  const wrestlerName =
    wrestler.wrestlerName ||
    wrestlerInfo.name ||
    wrestlerInfo.title ||
    `${wrestlerInfo.firstName || ''} ${wrestlerInfo.lastName || ''}`.trim() ||
    'Unknown Wrestler';

  const getImageUrl = () => {
    if (imageError) return '/placeholder_wrestler.png';
    return wrestlerInfo.image || wrestlerInfo.imagePNG || wrestlerInfo.imageUrl || '/placeholder_wrestler.png';
  };

  const imageUrl = getImageUrl();
  const rarityIcon = getRarityIcon(rarity);
  const rarityIconUrl = rarityIcon ? `/${rarityIcon}?v=${encodeURIComponent(rarity)}` : null;

  return (
    <div className="wrestler-card" style={{ position: 'relative' }}>
      <div className="wrestler-image-container" style={{ position: 'relative' }}>
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

        {rarityIconUrl && (
          <img
            src={rarityIconUrl}
            alt={rarity}
            className="rarity-icon"
            style={{
              position: 'absolute',
              bottom: '8px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '80px',
              height: 'auto',
              zIndex: 2,
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
            }}
            onError={(e) => {
              console.log('Rarity icon failed to load:', rarityIconUrl);
              e.target.src = '/placeholder_star.png'; // fallback image
            }}
          />
        )}
      </div>

      <div className="wrestler-name">{wrestlerName}</div>

      <div className="wrestler-details">
        <div className="shard-bar">
          <div className="shard-icon" />
          <span className="shard-count">
            {isRosterItem ? (
              <span className="shard-current">{shards}</span>
            ) : (
              <>
                <span className="shard-current">{shards}</span> / {recruitShards}
              </>
            )}
          </span>
        </div>

        {isRosterItem && <span className="detail-item">Level: {level}</span>}
        <span className="detail-item">Style: {style}</span>
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
          style={{
            cursor: 'pointer',
            position: 'absolute',
            top: '8px',
            right: '8px',
            color: '#dc3545',
            fontSize: '1.2rem'
          }}
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
