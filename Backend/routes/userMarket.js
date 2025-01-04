import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import fs from 'fs';

const router = express.Router();

// Define the User schema
const userSchema = new mongoose.Schema({
    userSellerID: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
    },
    walletAddress: {
        type: String,
        required: true,
    },
    products: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
        },
    ],
});

export const User = mongoose.model('MarketUser', userSchema);

// Define the Product schema
const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        images: [
            {
                type: String,
                required: true,
            },
        ],
        supply: {
            type: Number,
            required: true,
        },
        price: {
            type: Number,
            required: true,
        },
        seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MarketUser', // Reference to the User schema
            required: true,
        },
    },
    { timestamps: true }
);

export const Product = mongoose.model('Product', productSchema);



// Onboard route (generate userSellerID)
router.post('/onboard', async (req, res) => {
    try {
        const { name, walletAddress } = req.body;

        if (!name || !walletAddress) {
            return res.status(400).json({ message: 'Name and wallet address are required' });
        }

        const existingUser = await User.findOne({ walletAddress });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this wallet address already exists' });
        }

        // Generate a unique userSellerID
        const userSellerID = `SELLER_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        const newUser = new User({
            name,
            walletAddress,
            userSellerID,
        });

        await newUser.save();

        const token = jwt.sign({ userId: newUser._id }, 'your_secret_key');

        res.status(201).json({
            message: 'User onboarded successfully',
            user: newUser,
            token: token,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error onboarding user', error: err.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { walletAddress } = req.body;

        if (!walletAddress) {
            return res.status(400).json({ message: 'Wallet address is required' });
        }

        const user = await User.findOne({ walletAddress });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const token = jwt.sign({ userId: user._id }, 'your_secret_key');

        res.json({
            message: 'User logged in successfully',
            user,
            token,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error logging in', error: err.message });
    }
});

// Product creation route (use userSellerID)
router.post('/product', async (req, res) => {
    try {
        const { name, description, images, supply, price, walletAddress } = req.body;

        // Find the user by walletAddress
        const seller = await User.findOne({ walletAddress });
        if (!seller) {
            return res.status(404).json({ message: 'Seller not found' });
        }

        // Convert image paths to Base64 strings
        const imagesBase64 = await Promise.all(
            images.map(async (imagePath) => {
                try {
                    const imageBuffer = fs.readFileSync(imagePath); // Read the file
                    return `data:image/${imagePath.split('.').pop()};base64,${imageBuffer.toString('base64')}`;
                } catch (error) {
                    console.error(`Error reading image file: ${imagePath}`, error);
                    throw new Error(`Could not process image: ${imagePath}`);
                }
            })
        );

        // Create a new product
        const newProduct = new Product({
            name,
            description,
            images: imagesBase64,
            supply,
            price,
            seller: seller._id,
        });

        await newProduct.save();

        // Add the product to the user's product list
        seller.products.push(newProduct._id);
        await seller.save();

        res.status(201).json({
            message: 'Product added successfully',
            product: newProduct,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error adding product', error: err.message });
    }
});



router.get('/all-products', async (req, res) => {
    try {
        const products = await Product.find().populate('seller');
        res.json({
            products,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching products', error: err.message });
    }
});
router.get('/companies', async (req, res) => {
    try {
        const companies = await User.find();
        res.json({
            companies,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching companies', error: err.message });
    }
});


// Add predefined local Indian companies
const predefinedCompanies = [
    {
        userSellerID: 'SELLER_1234567890_001',
        name: 'RYM Energy',
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
    },
    {
        userSellerID: 'SELLER_1234567890_002',
        name: 'Kalp Studio',
        walletAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
    },
    {
        userSellerID: 'SELLER_1234567890_003',
        name: 'GKM Energy Pvt. Ltd',
        walletAddress: '0x7890abcdef1234567890abcdef1234567890abcd',
    },
];

predefinedCompanies.forEach(async (company) => {
    try {
        const existingCompany = await User.findOne({ userSellerID: company.userSellerID });
        if (!existingCompany) {
            const newCompany = new User(company);
            await newCompany.save();
            console.log(`Company ${company.name} added successfully`);
        }
    } catch (err) {
        console.error(`Error adding company ${company.name}`, err);
    }
});

router.get('/user-products/:walletAddress', async (req, res) => {
    try {
        const { walletAddress } = req.params; 
        const user = await User.findOne({ walletAddress }).populate('products');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            products: user.products,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching products', error: err.message });
    }
});


export default router;
