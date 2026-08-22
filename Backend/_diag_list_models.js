const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

fetch('https://api.groq.com/openai/v1/models', {
  headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
})
  .then((r) => r.json())
  .then((d) => console.log(JSON.stringify(d, null, 2)))
  .catch((err) => console.error('Request failed:', err.message));
