import React, { useState, useEffect, useRef } from 'react';
import { FaTrash } from 'react-icons/fa';
import { RARITIES } from '../../utils/constants';

const STYLE_OPTIONS = ['Chaotic', 'Aggressive', 'Defensive', 'Focused'];
const HYPE_LEVEL_OPTIONS = [1, 2, 3, 4];

const getWrestlerId = (wrestler) =>
  wrestler?.wrestlerId || wrestler?.ID || wrestler?.id || wrestler?._id || null;

const WrestlerCard = ({
  wrestler,
  onUpdate,
  onDelete,
  onAdd,
  onViewDetails,
  isRosterItem = false,
}) => {
  const [rarity, setRarity] = useState(wrestler.rarity || '1★ Bronze');
  const [shards, setShards] = useState(wrestler.shards || 0);
  const [level, setLevel] = useState(wrestler.level || 1);
  const [style, setStyle] = useState(wrestler.style || 'Focused');
  const [hypeLevel, setHypeLevel] = useState(wrestler.hypeLevel || 1);
  const [hypePoints, setHypePoints] = useState(wrestler.hypePoints || 0);
  const [imageError, setImageError] = useState(false);

  const didMountRef = useRef(false);

  useEffect(() => {
    setRarity(wrestler.rarity || '1★ Bronze');
    setShards(wrestler.shards || 0);
    setLevel(wrestler.level || 1);
    setStyle(wrestler.style || 'Focused');
    setHypeLevel(wrestler.hypeLevel || 1);
    setHypePoints(wrestler.hypePoints || 0);
    didMountRef.current = false;
  }, [wrestler]);

  const wrestlerInfo = isRosterItem
    ? wrestler.wrestlerData || wrestler
    : wrestler;

  useEffect(() => {
    if (!onUpdate) return;
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    const timeout = setTimeout(() => {
      onUpdate?.(wrestler._id, {
        rarity,
        shards: Math.max(0, parseInt(shards) || 0),
        level: Math.max(1, parseInt(level) || 1),
        style,
        hypeLevel: Math.min(4, Math.max(1, parseInt(hypeLevel) || 1)),
        hypePoints: Math.min(210, Math.max(0, parseInt(hypePoints) || 0)),
      });
    }, 400);

    return () => clearTimeout(timeout);
  }, [rarity, shards, level, style, hypeLevel, hypePoints, onUpdate, wrestler._id]);

  const handleAdd = () => {
    if (isRosterItem) return;

    onAdd({
      ...wrestler,
      wrestlerId: getWrestlerId(wrestler),
      style: 'Focused',
      hypeLevel: 1,
      hypePoints: 0,
      rarity,
      shards: parseInt(shards) || 0,
    });
  };

  const wrestlerName =
    wrestler.wrestlerName ||
    wrestlerInfo.name ||
    wrestlerInfo.title ||
    'Unknown Wrestler';

  const getImageUrl = () => {
    if (imageError) return '/placeholder_wrestler.png';
    return (
      wrestlerInfo.image ||
      wrestlerInfo.imagePNG ||
      wrestlerInfo.imageUrl ||
      '/placeholder_wrestler.png'
    );
  };

  return (
    <div
      className="wrestler-card"
      style={{ position: 'relative', cursor: 'pointer' }}
      onClick={(e) => {
        if (['BUTTON', 'SELECT', 'INPUT', 'svg', 'path', 'OPTION'].includes(e.target.tagName)) return;
        onViewDetails?.(wrestler);
      }}
    >
      <div className="wrestler-image-container" style={{ position: 'relative' }}>
        <img
          src={getImageUrl()}
          alt={wrestlerName}
          className="wrestler-image"
          onError={() => setImageError(true)}
          loading="lazy"
        />
        <div className="rarity-label">{rarity}</div>
      </div>

      <div className="wrestler-name">{wrestlerName}</div>

      <div className="wrestler-details">
        {isRosterItem ? (
          <>
            <span className="detail-item">
              Style: <span style={{ fontWeight: 'bold', marginLeft: '4px' }}>{style}</span>
            </span>

            <span className="detail-item">
              Hype:{' '}
              <select
                className="select-input"
                value={hypeLevel}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setHypeLevel(Number(e.target.value))}
                style={{
                  marginLeft: '6px',
                  fontSize: '11px',
                  padding: '2px 6px',
                  width: 'auto',
                  minWidth: '60px',
                }}
              >
                {HYPE_LEVEL_OPTIONS.map(lvl => (
                  <option key={lvl} value={lvl}>
                    L{lvl}
                  </option>
                ))}
              </select>

              <input
                type="number"
                className="number-input"
                value={hypePoints}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  setHypePoints(
                    Math.min(210, Math.max(0, Number(e.target.value)))
                  )
                }
                min="0"
                max="210"
                style={{
                  marginLeft: '6px',
                  width: '70px',
                  fontSize: '11px',
                  padding: '2px 6px',
                }}
              />
            </span>
          </>
        ) : (
          <>
            <span className="detail-item">Style: {style}</span>
            <span className="detail-item">
              Hype: L{hypeLevel} ({hypePoints}/210)
            </span>
          </>
        )}
      </div>

      <div className="controls">
        <label className="input-label">
          <span>Rarity</span>
          <select
            className="select-input"
            value={rarity}
            onChange={(e) => setRarity(e.target.value)}
          >
            {RARITIES.map(r => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        <label className="input-label">
          <span>Shards</span>
          <input
            type="number"
            className="number-input"
            value={shards}
            onChange={(e) => setShards(e.target.value)}
            min="0"
          />
        </label>
      </div>

      {isRosterItem ? (
        <FaTrash
          className="icon-button top-right"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(wrestler._id);
          }}
          title="Remove"
        />
      ) : onAdd ? (
        <div className="controls" style={{ marginTop: '10px' }}>
          <button className="btn" onClick={handleAdd}>
            Add to Roster
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default WrestlerCard;