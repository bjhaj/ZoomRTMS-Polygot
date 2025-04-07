import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

let openai;

// Initialize OpenAI with API key from environment variables if available
try {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    openai = new OpenAI({ apiKey });
    console.log('OpenAI client initialized successfully');
  } else {
    console.warn('OPENAI_API_KEY not found in environment variables. Translation will use a mock service.');
  }
} catch (error) {
  console.error('Error initializing OpenAI client:', error);
}

/**
 * Translates text to the specified language using OpenAI
 * @param {string} text - Text to translate
 * @param {string} targetLanguage - Language code to translate to (default: 'es')
 * @returns {Promise<string>} - Translated text
 */
export async function translateText(text, targetLanguage = 'es') {
  try {
    if (!text || text.trim() === '') {
      return '';
    }
    
    // Get the full language name for the prompt
    const languageName = getLanguageName(targetLanguage);
    
    // If OpenAI is not available, use a mock translator
    if (!openai) {
      return mockTranslation(text, targetLanguage);
    }
    
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a translator. Translate the following text to ${languageName}. Return only the translated text without any additional comments or explanations.`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3,
        max_tokens: 300
      });
      
      return response.choices[0].message.content.trim();
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError);
      return mockTranslation(text, targetLanguage);
    }
  } catch (error) {
    console.error('Translation error:', error);
    return mockTranslation(text, targetLanguage);
  }
}

/**
 * Get full language name from language code
 * @param {string} langCode - Two-letter language code
 * @returns {string} - Full language name
 */
function getLanguageName(langCode) {
  const languages = {
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ko': 'Korean',
    'ru': 'Russian',
    'ar': 'Arabic'
  };
  
  return languages[langCode] || 'Spanish';
}

/**
 * Simple mock translation service for when OpenAI is not available
 * This is a very basic implementation for testing purposes only
 * @param {string} text - Text to translate
 * @param {string} targetLanguage - Language code to translate to
 * @returns {string} - Mock translated text
 */
function mockTranslation(text, targetLanguage = 'es') {
  console.log(`Using mock translation service for ${targetLanguage}`);
  
  // If not Spanish, just prefix with language indicator
  if (targetLanguage !== 'es') {
    return `[${targetLanguage}] ${text}`;
  }
  
  // Very basic word mapping for common English words to Spanish
  const dictionary = {
    // Basic greetings
    'hello': 'hola',
    'hi': 'hola',
    'hey': 'oye',
    'goodbye': 'adiós',
    'bye': 'adiós',
    'welcome': 'bienvenido',
    
    // Common phrases
    'thank you': 'gracias',
    'thanks': 'gracias',
    'please': 'por favor',
    'excuse me': 'disculpe',
    'sorry': 'lo siento',
    'good morning': 'buenos días',
    'good afternoon': 'buenas tardes',
    'good evening': 'buenas noches',
    'good night': 'buenas noches',
    
    // Question words
    'what': 'qué',
    'where': 'dónde',
    'when': 'cuándo',
    'why': 'por qué',
    'how': 'cómo',
    'who': 'quién',
    'which': 'cuál',
    
    // Common verbs
    'is': 'es',
    'am': 'soy',
    'are': 'eres',
    'was': 'era',
    'were': 'eran',
    'have': 'tener',
    'has': 'tiene',
    'had': 'tenía',
    'do': 'hacer',
    'does': 'hace',
    'did': 'hizo',
    'can': 'puede',
    'could': 'podría',
    'will': 'será',
    'would': 'sería',
    'should': 'debería',
    'may': 'puede',
    'might': 'podría',
    'must': 'debe',
    'want': 'querer',
    'wants': 'quiere',
    'need': 'necesitar',
    'needs': 'necesita',
    'like': 'gustar',
    'likes': 'gusta',
    'love': 'amar',
    'loves': 'ama',
    'hate': 'odiar',
    'hates': 'odia',
    'speak': 'hablar',
    'speaks': 'habla',
    'talking': 'hablando',
    'saying': 'diciendo',
    'said': 'dijo',
    
    // Pronouns
    'i': 'yo',
    'you': 'tú',
    'he': 'él',
    'she': 'ella',
    'it': 'eso',
    'we': 'nosotros',
    'they': 'ellos',
    'me': 'yo',
    'my': 'mi',
    'mine': 'mío',
    'your': 'tu',
    'yours': 'tuyo',
    'his': 'suyo',
    'her': 'su',
    'hers': 'suya',
    'its': 'su',
    'our': 'nuestro',
    'ours': 'nuestro',
    'their': 'su',
    'theirs': 'suyo',
    
    // Articles and prepositions
    'the': 'el',
    'a': 'un',
    'an': 'un',
    'of': 'de',
    'to': 'a',
    'in': 'en',
    'on': 'en',
    'at': 'en',
    'by': 'por',
    'with': 'con',
    'without': 'sin',
    'from': 'de',
    'for': 'para',
    
    // Common nouns
    'person': 'persona',
    'people': 'personas',
    'thing': 'cosa',
    'things': 'cosas',
    'time': 'tiempo',
    'day': 'día',
    'days': 'días',
    'week': 'semana',
    'month': 'mes',
    'year': 'año',
    'hour': 'hora',
    'minute': 'minuto',
    'second': 'segundo',
    'place': 'lugar',
    'way': 'manera',
    'man': 'hombre',
    'woman': 'mujer',
    'child': 'niño',
    'children': 'niños',
    'world': 'mundo',
    'country': 'país',
    'city': 'ciudad',
    'home': 'casa',
    'house': 'casa',
    'room': 'habitación',
    'office': 'oficina',
    'school': 'escuela',
    'work': 'trabajo',
    'job': 'trabajo',
    'car': 'coche',
    'book': 'libro',
    'movie': 'película',
    'food': 'comida',
    'water': 'agua',
    'friend': 'amigo',
    'family': 'familia',
    'mother': 'madre',
    'father': 'padre',
    'sister': 'hermana',
    'brother': 'hermano',
    'son': 'hijo',
    'daughter': 'hija',
    
    // Common adjectives
    'good': 'bueno',
    'bad': 'malo',
    'big': 'grande',
    'small': 'pequeño',
    'new': 'nuevo',
    'old': 'viejo',
    'happy': 'feliz',
    'sad': 'triste',
    'beautiful': 'hermoso',
    'handsome': 'guapo',
    'ugly': 'feo',
    'easy': 'fácil',
    'difficult': 'difícil',
    'important': 'importante',
    'expensive': 'caro',
    'cheap': 'barato',
    'hot': 'caliente',
    'cold': 'frío',
    'warm': 'cálido',
    'cool': 'fresco',
    
    // Time words
    'today': 'hoy',
    'tomorrow': 'mañana',
    'yesterday': 'ayer',
    'now': 'ahora',
    'later': 'más tarde',
    'soon': 'pronto',
    'always': 'siempre',
    'never': 'nunca',
    'sometimes': 'a veces',
    'morning': 'mañana',
    'afternoon': 'tarde',
    'evening': 'noche',
    'night': 'noche',
    
    // Numbers
    'one': 'uno',
    'two': 'dos',
    'three': 'tres',
    'four': 'cuatro',
    'five': 'cinco',
    'six': 'seis',
    'seven': 'siete',
    'eight': 'ocho',
    'nine': 'nueve',
    'ten': 'diez',
    
    // Testing words
    'test': 'prueba',
    'testing': 'probando'
  };
  
  // Replace known words with Spanish equivalents
  let translated = text.toLowerCase();
  
  // First try to translate multi-word phrases
  const phrases = Object.keys(dictionary).filter(word => word.includes(' '));
  phrases.forEach(phrase => {
    const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
    translated = translated.replace(regex, dictionary[phrase]);
  });
  
  // Then translate single words
  const words = Object.keys(dictionary).filter(word => !word.includes(' '));
  words.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    translated = translated.replace(regex, dictionary[word]);
  });
  
  return translated;
}

// Legacy function for backward compatibility
export async function translateToSpanish(text) {
  return translateText(text, 'es');
}

export default {
  translateText
}; 