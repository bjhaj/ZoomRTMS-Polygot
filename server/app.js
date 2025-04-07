import { translateText } from './services/translator.js';

// Translation API endpoint
app.post('/api/translate', async (req, res) => {
  try {
    const text = req.body.text;
    const targetLanguage = req.body.targetLanguage || 'es'; // Default to Spanish if not specified
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required for translation' });
    }
    
    // Get translated text
    const translatedText = await translateText(text, targetLanguage);
    res.json({ translated: translatedText });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Failed to translate text', details: error.message });
  }
}); 