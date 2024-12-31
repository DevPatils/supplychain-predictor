import express from 'express';
import userModel from '../Models/userModel.js';
import jwt from 'jsonwebtoken';

const userRouter = express.Router();

userRouter.get('/', (req, res) => {
    res.send('Hello World from user');
});

userRouter.post('/signUp', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }

        const user = await userModel.create({ name, email, password });
        const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(201).json({ message: 'User created', user, token });
    } catch (error) {
        res.status(500).json({ message: 'Error creating user', error });
    }
});

userRouter.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await userModel.findOne({ email });
        if (!user) {
            res.status(400).json({ message: 'User does not exist' });
            return;
        }

        if (user.password !== password) {
            res.status(400).json({ message: 'Invalid credentials' });
            return;
        }

        const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in', error });
    }
});

// Middleware to verify JWT
 const authenticate = (req, res, next) => {
    const token = req.headers.authorization; // Expected format: "Bearer <token>"
    if (!token) {
        res.status(401).json({ message: 'Authorization token missing' });
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Add user info to the request object
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};

userRouter.get('/protected', authenticate, (req, res) => {
    res.status(200).json({ message: 'This is a protected route', user: req.user });
});

// module.exports = {userRouter, authenticate};
export { userRouter, authenticate };