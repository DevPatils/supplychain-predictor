import dotenv from 'dotenv';
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync } from 'fs'; 
import multer from 'multer';
import passport from './passportConfig.js';
import cors from 'cors';
import connectDB from './dbconfig.js';
import { userRouter } from './routes/User.js';


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

app.use("/user", userRouter);




app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
