const axios = require('axios');

const getAllWrestlers = async (req, res) => {
  try {
    const response = await axios.get(process.env.WWE_API_URL);
    
    const wrestlersData = response.data?.data || [];
    
    res.json({
      success: true,
      wrestlers: wrestlersData
    });
  } catch (error) {
    console.error('WWE API Error:', error.message);
    res.status(500).json({ 
      message: 'Failed to fetch wrestlers from WWE API',
      error: error.message 
    });
  }
};

const getWrestlerById = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await axios.get(`${process.env.WWE_API_URL}/${id}`);
    res.json({
      success: true,
      wrestler: response.data
    });
  } catch (error) {
    console.error('WWE API Error:', error.message);
    res.status(500).json({ 
      message: 'Failed to fetch wrestler from WWE API',
      error: error.message 
    });
  }
};

module.exports = { getAllWrestlers, getWrestlerById };