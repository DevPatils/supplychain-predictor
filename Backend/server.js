import dotenv from 'dotenv';
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync } from 'fs';
import multer from 'multer';
import passport from './passportConfig.js';
import cors from 'cors';
import connectDB from './dbconfig.js';
import { userRouter } from './routes/User.js';
import marketrouter from './routes/userMarket.js';


const app = express();
const port = 3000;
dotenv.config();
connectDB();

const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

app.use(passport.initialize());

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

/**
 * @desc Google auth routes
 */
app.get("/google", passport.authenticate("google-qr", {
  scope: ["profile", "email"]
}));

app.get('/google/dashboard/callback/qrApp', passport.authenticate('google-qr', {
  session: false,
  failureRedirect: "/login",
}),
  async (req, res) => {
    try {
      console.log(req.user.profile)
      res.redirect(`https//localhost:8081/Index`);
      console.log('logged in');
    } catch (e) {
      console.log(e);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

/**
 * @desc predict image route
 */


app.post('/predictimage', upload.single('image'), async (req, res) => {
  const { file } = req;

  if (!file) {
    return res.status(400).send({ message: 'No image file uploaded.' });
  }

  const image = {
    inlineData: {
      data: Buffer.from(readFileSync(file.path)).toString('base64'),
      mimeType: 'image/jpg',
    },
  };

  const prompt = `Analyze the provided product image and generate a detailed response in JSON. Extract the following information:

Product Details:

Name: The identified product name or category.
Size: Physical dimensions or volume (e.g., "500ml", "30cm x 20cm").
Type: The product's category or function (e.g., "single-use bottle", "smartphone").
Material: The materials used in the product (e.g., "PET plastic", "stainless steel").
Cost: Estimated price in INR based on typical market values in India.
Supply Chain Details:

Raw Materials: Likely materials and their probable sources or origin regions (e.g., petroleum-based plastics from Saudi Arabia, cotton from Gujarat, India).
Manufacturing: Common manufacturing processes and typical hubs in India (e.g., injection molding in Noida, Uttar Pradesh).
Distribution: Typical distribution channels or retail points in India, such as wholesalers, e-commerce platforms, or local markets.
Ensure the response is accurate,  JSON object, and relevant for any product type provided via the image input.`;

  const result = await model.generateContent([prompt, image]);
  const cleanedResponse = result.response.text()
  .replaceAll('```', '')
  .replaceAll('json', '');
  console.log(cleanedResponse);
  // console.log(result.response.text());
  res.json(cleanedResponse);
  
});


app.post('/metricsImage', async (req, res) => {
  const { name, size, type, material } = req.body;

  const prompt = `${name} is a ${size} ${type} made of ${material}. 
  Based on the provided product details, calculate the environmental benefits of recycling this product. Use the following metrics to estimate the impact:
  
  - **Carbon Emissions Saved**: Estimate the reduction in CO₂ emissions (e.g., in kilograms). Use typical values for PVC production and recycling.
  - **Trees Saved**: Approximate the number of trees preserved due to recycling. Consider the general resource consumption of PVC production and recycling.
  - **Water Saved**: Estimate the liters of water conserved by recycling, based on the average water usage in PVC production.
  - **Energy Saved**: Approximate energy savings (e.g., in kilowatt-hours) from recycling, considering energy savings from using recycled material instead of virgin PVC.
  - **Landfill Space Saved**: Estimate the landfill volume saved (e.g., in cubic meters) by recycling this product.
  
  Note: While precise calculations require specific data such as the weight of the PVC pipe, the manufacturing and recycling process details, and the environmental impact of virgin material production, this estimation will be based on average industry values for PVC products. The values provided should be considered rough estimates and not exact calculations.
  
  Provide the response in the following JSON format:
  {
    "product": "${name}",
    "environmental_benefits": {
      "carbon_emissions_saved": {
        "estimate": [estimated value],
        "unit": "kg",
        "explanation": "Rough estimate based on the average carbon footprint of PVC production and recycling."
      },
      "trees_saved": {
        "estimate": [estimated value],
        "unit": "trees",
        "explanation": "Rough estimate based on typical tree usage in PVC production and recycling."
      },
      "water_saved": {
        "estimate": [estimated value],
        "unit": "liters",
        "explanation": "Rough estimate based on average water usage in PVC production and recycling."
      },
      "energy_saved": {
        "estimate": [estimated value],
        "unit": "kWh",
        "explanation": "Rough estimate based on energy savings from recycling PVC instead of producing virgin material."
      },
      "landfill_space_saved": {
        "estimate": [estimated value],
        "unit": "cubic meters",
        "explanation": "Rough estimate based on average volume reduction from recycling PVC products."
      },
      "disclaimer": "These environmental benefits are rough estimates based on average industry values. Accurate estimations require more specific data on the product's composition, weight, and the details of the manufacturing and recycling processes."
    }
  }`
  ;

  try {
    const result = await model.generateContent([prompt]);
    const rawResponse = result.response.text();
    // console.log(rawResponse);
    // Clean and parse the response into JSON
    const cleanedResponse = rawResponse
      .replaceAll('```', '')
      .replaceAll('json', '')
      .trim(); // Remove unwanted characters or extra spaces
    console.log(cleanedResponse);
    const jsonResponse = JSON.parse(cleanedResponse); // Parse into JSON
    res.json(jsonResponse); // Send the structured JSON to the frontend
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Failed to process the request' });
  }
});



app.post('/recyclingMethods', async (req, res) => {
  const { name, size, type, material, cost } = req.body;

  const prompt = `
    Given the following product details, provide creative and practical recycling methods. For each method, include a description and step-by-step instructions. The recycling methods should be unique and tailored to the specific product details. Ensure the response is structured as a detailed JSON object with the following keys:

    - "product_name": The name of the product.
    - "recycling_methods": An array of methods, where each method includes:
      - "method_name": The title of the recycling idea.
      - "description": A brief explanation of what the method achieves.
      - "steps": A step-by-step guide for implementing the recycling method.

    Input product details:
    {
      "name": "${name}",
      "size": "${size}",
      "type": "${type}",
      "material": "${material}",
      "cost": { "estimated_range_INR": "${cost.estimated_range_INR}" }
    }

    Provide the response as a JSON object that is accurate, creative, and detailed.
  `;

  try {
    const result = await model.generateContent([prompt]);

    // Clean and parse the response into JSON
    const cleanedResponse = result.response.text()
      .replaceAll('```', '') // Remove code block syntax
      .replaceAll('json', '') // Remove any 'json' markers if present
      .trim(); // Remove unwanted spaces or newline characters

    // Log cleaned response for debugging
    console.log(cleanedResponse);

    // Attempt to parse the cleaned response into JSON
    const jsonResponse = JSON.parse(cleanedResponse);

    // Send the structured JSON to the frontend
    res.json(jsonResponse);

  } catch (error) {
    console.error('Error generating recycling methods:', error);
    res.status(500).json({ error: 'Failed to generate recycling methods.' });
  }
});






app.use("/user", userRouter);
app.use('/market',marketrouter);




app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
