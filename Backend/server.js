require('dotenv').config();  // Load environment variables from .env file
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');  // Correct import
const app = express();
const port = 3000;

// Middleware to parse incoming JSON requests
app.use(express.json());

// Initialize Google Generative AI client with your API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Get the generative model using the correct method
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Define the API route
app.post('/predict-supply-chain', async (req, res) => {
  const { productName } = req.body;

  if (!productName) {
    return res.status(400).json({ error: 'Product name is required' });
  }

  try {
    // Prepare the prompt for the Generative AI model
    const prompt = `Given the product name '${productName}', predict the supply chain process for this product .`;

    // Call the `generateContent()` method with the prompt
    const result = await model.generateContent([prompt]);

    // Extract and send the result back
    res.json({
      supplyChainPrediction: result.response.text() || 'No prediction returned',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error predicting the supply chain' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
