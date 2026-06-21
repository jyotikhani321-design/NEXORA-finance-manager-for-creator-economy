import express from 'express';
import { 
  getUserByEmail, 
  createUser, 
  hashPassword 
} from '../services/db.js';

const router = express.Router();

// 1. Sign Up Endpoint
// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, displayName, niche } = req.body;

    if (!email || !password || !displayName || !niche) {
      return res.status(400).json({ error: 'Missing required signup fields: email, password, displayName, niche' });
    }

    const trimmedEmail = String(email).toLowerCase().trim();
    
    // Check if email already exists
    const existingUser = await getUserByEmail(trimmedEmail);
    if (existingUser) {
      return res.status(400).json({ error: 'This email is already registered.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Insert user into SQLite
    const newUser = await createUser(trimmedEmail, password, displayName, niche);

    res.status(201).json({
      message: 'Creator profile created successfully!',
      user: newUser
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to process registration: ' + error.message });
  }
});

// 2. Login Endpoint
// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    const trimmedEmail = String(email).toLowerCase().trim();

    // Query user by email
    const user = await getUserByEmail(trimmedEmail);
    if (!user) {
      return res.status(400).json({ error: 'Incorrect email or password. Please try again.' });
    }

    // Compare password hashes
    const inputHash = hashPassword(password);
    if (user.password !== inputHash) {
      return res.status(400).json({ error: 'Incorrect email or password. Please try again.' });
    }

    res.json({
      message: 'Login successful!',
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        niche: user.niche
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to process login: ' + error.message });
  }
});

export default router;
