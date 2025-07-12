const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config();

const RAW_XML_DIR = path.join(__dirname, '../raw_xml_files');
const OUTPUT_DIR = path.join(__dirname, '../extracted_json_files');
const PROMPT_PATH = path.join(__dirname, '../prompts/ai_breakfast_prompt.txt');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const PROMPT = fs.readFileSync(PROMPT_PATH, 'utf-8');

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

async function extractJsonFromXml(xmlContent) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: PROMPT },
      { role: 'user', content: xmlContent },
    ],
    temperature: 0,
    max_tokens: 4096,
  });
  // Only return the content (should be JSON)
  return completion.choices[0].message.content;
}

async function processFiles() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);
  const files = fs.readdirSync(RAW_XML_DIR).filter(f => f.startsWith('aibreakfast_') && f.endsWith('.xml'));
  for (const file of files) {
    const xmlPath = path.join(RAW_XML_DIR, file);
    const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
    try {
      const jsonString = await extractJsonFromXml(xmlContent);
      console.log('Raw OpenAI response for', file, ':\n', jsonString); // Log raw output
      // Remove code block markers if present
      const cleaned = jsonString.replace(/```json|```/g, '').trim();
      const json = JSON.parse(cleaned);
      const outPath = path.join(OUTPUT_DIR, file.replace('.xml', '.json'));
      fs.writeFileSync(outPath, JSON.stringify(json, null, 2), 'utf-8');
      console.log(`Extracted: ${outPath}`);
    } catch (e) {
      console.error(`Failed to process ${file}:`, e.message);
    }
  }
}

processFiles(); 