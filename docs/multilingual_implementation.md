# Multilingual Implementation

## Overview

EduAvatar supports seamless multilingual teaching, including code-switching between languages (e.g., Hinglish).

---

## Supported Languages

| Language | Code | Voice Options | Status |
|----------|------|---------------|--------|
| English | `en` | Male, Female | ✅ Active |
| Hindi | `hi` | Male, Female | ✅ Active |
| Ukrainian | `uk` | Male, Female | ✅ Active |
| Spanish | `es` | Male, Female | ✅ Active |
| French | `fr` | Male, Female | ✅ Active |
| German | `de` | Male, Female | ✅ Active |

---

## Voice Mapping

```javascript
const VOICE_MAP = {
    'en': {
        male: 'en-US-GuyNeural',
        female: 'en-US-JennyNeural'
    },
    'hi': {
        male: 'hi-IN-MadhurNeural',
        female: 'hi-IN-SwaraNeural'
    },
    'uk': {
        male: 'uk-UA-PavloNeural',
        female: 'uk-UA-PolinaNeural'
    },
    'es': {
        male: 'es-AR-TomasNeural',
        female: 'es-AR-ElenaNeural'
    },
    'fr': {
        male: 'fr-FR-HenriNeural',
        female: 'fr-FR-DeniseNeural'
    },
    'de': {
        male: 'de-DE-ConradNeural',
        female: 'de-DE-KatjaNeural'
    }
};
```

---

## Language Detection & Switching

### User Selection

```javascript
// Dashboard settings
<select id="language-select">
    <option value="English">English</option>
    <option value="Hindi">Hindi (हिन्दी)</option>
    <option value="Ukrainian">Ukrainian (Українська)</option>
    <option value="Spanish">Spanish (Español)</option>
    <option value="French">French (Français)</option>
    <option value="German">German (Deutsch)</option>
</select>
```

### Prompt Injection

```javascript
function getLanguageInstructions(language) {
    const instructions = {
        'English': 'Teach in clear, professional English.',
        'Hindi': 'Teach in Hindi. Use English for technical terms (Hinglish style). Example: "Variables वो containers होते हैं जो data store करते हैं."',
        'Ukrainian': 'Teach in Ukrainian. Keep code and technical terms in English.',
        'Spanish': 'Teach in Spanish. Use formal "usted" form for students.',
        'French': 'Teach in formal French. Use "vous" form.',
        'German': 'Teach in precise German. Use formal "Sie" form.'
    };
    return instructions[language] || instructions['English'];
}
```

---

## Code-Switching Support

### Hinglish Example

```
Student Profile: Hindi, Beginner

AI Teaching:
"Aaj hum Variables के बारे में सीखेंगे।

Variables वो containers होते हैं जो data store करते हैं।
जैसे एक डिब्बे पर label लगा हो, variable भी वैसा ही है।

मान लो आपके पास एक variable है 'age' जिसमें 25 store है:
age = 25

समझ आया? कोई सवाल?"
```

---

## Multilingual Prompt Architecture

### System Prompt Layer

```javascript
// Base prompt (English)
const basePrompt = "You are an expert teacher...";

// Language instruction layer
const languageLayer = getLanguageInstructions(profile.language);

// Combine
const fullPrompt = `${basePrompt}\n\nLanguage: ${languageLayer}`;
```

### Dynamic Language Switching

```javascript
// Mid-lesson language change
app.post('/api/update-profile', async (req, res) => {
    const { student_id, language } = req.body;
    
    await StudentProfile.updateOne(
        { student_id },
        { $set: { language } }
    );
    
    // Future lessons will use new language
    res.json({ success: true, message: `Language updated to ${language}` });
});
```

---

## Translation Quality Assurance

### Validation Rules

```javascript
const translationChecks = {
    'Hindi': {
        mustContain: ['ह', 'क', 'त', 'न'], // Devanagari characters
        technicalTermsKeepEnglish: true
    },
    'Ukrainian': {
        mustContain: ['а', 'б', 'в', 'г'], // Cyrillic characters
        technicalTermsKeepEnglish: true
    },
    'Spanish': {
        mustContain: ['ñ', '¿', '¡'], // Spanish-specific
        formalAddress: true
    }
};
```

### Fallback Strategy

```javascript
function validateTranslation(text, targetLanguage) {
    const checks = translationChecks[targetLanguage];
    
    if (!checks) return true; // No validation for this language
    
    const hasRequiredChars = checks.mustContain.some(
        char => text.includes(char)
    );
    
    if (!hasRequiredChars) {
        console.warn(`Translation may not be in ${targetLanguage}`);
        return false;
    }
    
    return true;
}
```

---

## Multilingual Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Language Detection | 100% | 100% |
| Translation Accuracy | >95% | ~90% |
| Code-Switching Quality | >4.0/5 | ~3.7/5 |
| Voice Naturalness | >4.0/5 | ~3.8/5 |
| Technical Term Handling | 100% | 100% |

---

## Known Limitations

1. **Limited Voice Options**: Only 2 voices per language (male/female)
2. **No Dialect Support**: Standard dialect only (no regional variants)
3. **Code-Switching Inconsistency**: Sometimes switches mid-sentence awkwardly
4. **Limited Languages**: Only 6 languages currently supported
5. **No Real-Time Translation**: Language set at profile level, not per-message
