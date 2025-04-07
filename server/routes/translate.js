import express from 'express';
import { translateToSpanish } from '../services/translator.js';

const router = express.Router();

// POST endpoint for text translation
router.post('/', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    console.log('Translation request received:', text);
    const translated = await translateToSpanish(text);
    console.log('Translation result:', translated);
    
    return res.json({ translated });
  } catch (error) {
    console.error('Translation route error:', error);
    return res.status(500).json({ error: 'Translation failed' });
  }
});

export default router; 