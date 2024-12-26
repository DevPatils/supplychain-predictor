require('dotenv').config();  // Load environment variables from .env file
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');  // Correct import
const app = express();
const port = 3000;
const fs = require('fs');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
// app.use(bodyParser.json());


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

app.post('/predictimage', upload.single('image'), async (req, res) => {
  const { file } = req;

  if (!file) {
    return res.status(400).send({ message: 'No image file uploaded.' });
  }

  const image = {
    inlineData: {
      data: Buffer.from(fs.readFileSync(file.path)).toString('base64'),
      mimeType: 'image/jpg',
    },
  };

  const prompt = `Given the image below, predict the supply chain process for this product. Provide:
  1. A reasonable estimated range of carbon emissions (in kg CO₂e) for the production and transportation of the product.
  2. Key assumptions and factors influencing the estimate (e.g., manufacturing, transportation, energy usage).
  3. Any recommendations to reduce the carbon footprint for this type of product.`;

  const result = await model.generateContent([prompt, image]);
  const fullResponse = result.response.text();

  const keyPoints = {
    supplyChainProcess: fullResponse.match(/1\..+?(?=\d\.)/s)?.[0].trim(),
    carbonEmissionsEstimate: fullResponse.match(/2\..+?(?=\d\.)/s)?.[0].trim(),
    recommendations: fullResponse.match(/3\..+/s)?.[0].trim(),
  };
  console.log(keyPoints);
  res.json(keyPoints);

});


// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
