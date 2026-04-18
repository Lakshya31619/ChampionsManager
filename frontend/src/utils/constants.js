const RARITIES = [
  '1★ Bronze', '2★ Bronze', '3★ Bronze', '4★ Bronze', '5★ Bronze', '6★ Bronze',
  '1★ Silver', '2★ Silver', '3★ Silver', '4★ Silver', '5★ Silver', '6★ Silver',
  '1★ Gold', '2★ Gold', '3★ Gold', '4★ Gold', '5★ Gold', '6★ Gold'
];

const RARITY_COLORS = {
  Bronze: '#cd7f32',
  Silver: '#c0c0c0',
  Gold: '#ffd700'
};

const RARITY_STAR_COLORS = {
  '1★ Bronze': '#8B4513', '2★ Bronze': '#cd7f32', '3★ Bronze': '#cd7f32', '4★ Bronze': '#cd7f32', '5★ Bronze': '#cd7f32', '6★ Bronze': '#cd7f32',
  '1★ Silver': '#A8A8A8', '2★ Silver': '#A8A8A8', '3★ Silver': '#A8A8A8', '4★ Silver': '#c0c0c0', '5★ Silver': '#c0c0c0', '6★ Silver': '#c0c0c0',
  '1★ Gold': '#DAA520',   '2★ Gold': '#DAA520',   '3★ Gold': '#DAA520',   '4★ Gold': '#DAA520',   '5★ Gold': '#DAA520',   '6★ Gold': '#ffd700'
};

const ERA_OPTIONS = [
  { label: 'All Eras', value: 'all' },
  { label: 'Legends', value: 'Era_Classic' },
  { label: 'Modern', value: 'Era_Modern' },
  { label: 'Ruthless Aggression', value: 'Era_RuthlessAggression' },
  { label: 'Icons Of Wrestlemania', value: 'Era_IconsOfWrestleMania' },
  { label: 'Reality', value: 'Era_Reality' },
  { label: 'PG', value: 'Era_PG' },
  { label: 'Attitude', value: 'Era_Attitude' },
  { label: 'New Generation', value: 'Era_NewGen' },
  { label: 'Hall Of Fame', value: 'Era_HallofFame' },
];

const CLASS_FILTER_MAP = {
  Showboat: 'Color_Yellow',
  Striker: 'Color_Black',
  Powerhouse: 'Color_Red',
  Technician: 'Color_Green',
  Trickster: 'Color_Purple',
  Acrobat: 'Color_Blue',
};

const STYLE_OPTIONS = ['Chaotic', 'Aggressive', 'Defensive', 'Focused'];

export {
  RARITIES,
  RARITY_COLORS,
  RARITY_STAR_COLORS,
  ERA_OPTIONS,
  CLASS_FILTER_MAP,
  STYLE_OPTIONS
};