const axios = require('axios');
const { fetchStyleMap } = require('../utils/superstarStyleSync');

const getAllWrestlers = async (req, res) => {
  try {
    const response = await axios.get(process.env.WWE_API_URL);

    if (!response.data || !Array.isArray(response.data.data)) {
      throw new Error('Invalid API response structure');
    }

    const styleMap = await fetchStyleMap();
    const wrestlersData = response.data.data.map(w => {
      const id = w.id || w.ID || w.wrestlerId || w._id || null;
      return {
        ...w,
        id,
        name: w.name || `${w.firstName || ''} ${w.lastName || ''}`.trim(),
        style: styleMap[id] || w.playStyle || 'Focused'
      };
    });

    res.json({
      success: true,
      wrestlers: wrestlersData
    });
  } catch (error) {
    console.error('WWE API Error [getAllWrestlers]:', error.message);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch wrestlers from WWE API',
      error: error.message 
    });
  }
};

const getWrestlerById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing wrestler ID'
      });
    }

    const response = await axios.get(`${process.env.WWE_API_URL}/${id}`);

    if (!response.data) {
      throw new Error('Invalid API response structure');
    }

    const styleMap = await fetchStyleMap();
    const wrestlerIdInternal = response.data.id || response.data.ID || response.data.wrestlerId || response.data._id || null;
    const wrestler = {
      ...response.data,
      id: wrestlerIdInternal,
      name: response.data.name || `${response.data.firstName || ''} ${response.data.lastName || ''}`.trim(),
      style: styleMap[wrestlerIdInternal] || response.data.playStyle || 'Focused'
    };

    res.json({
      success: true,
      wrestler
    });
  } catch (error) {
    console.error('WWE API Error [getWrestlerById]:', error.message);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch wrestler from WWE API',
      error: error.message 
    });
  }
};


// Proxy for the superstar-guide individual endpoint — avoids CORS from frontend
const getSuperstarGuide = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'Missing superstar ID' });

    const url = `https://prod-api-new.wwechampions.com/superstar-guide/superstars/${id}`;
    const response = await axios.get(url);

    res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    if (status !== 404) {
      console.error('WWE Superstar Guide Error:', error.message);
    }
    res.status(status).json({ success: false, message: 'Failed to fetch superstar data', error: error.message });
  }
};

module.exports = { getAllWrestlers, getWrestlerById, getSuperstarGuide };