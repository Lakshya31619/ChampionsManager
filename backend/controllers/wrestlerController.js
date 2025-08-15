const axios = require('axios');

const getAllWrestlers = async (req, res) => {
  try {
    const response = await axios.get(process.env.WWE_API_URL);

    if (!response.data || !Array.isArray(response.data.data)) {
      throw new Error('Invalid API response structure');
    }

    const wrestlersData = response.data.data.map(w => ({
      ...w,
      // Normalize ID fields for frontend compatibility
      id: w.id || w.ID || w.wrestlerId || w._id || null,
      name: w.name || `${w.firstName || ''} ${w.lastName || ''}`.trim(),
    }));

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

    const wrestler = {
      ...response.data,
      id: response.data.id || response.data.ID || response.data.wrestlerId || response.data._id || null,
      name: response.data.name || `${response.data.firstName || ''} ${response.data.lastName || ''}`.trim(),
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

module.exports = { getAllWrestlers, getWrestlerById };
