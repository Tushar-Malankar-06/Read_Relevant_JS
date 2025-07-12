const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config();

const RAW_XML_DIR = path.join(__dirname, '../raw_xml_files');
const OUTPUT_DIR = path.join(__dirname, '../extracted_json_files');
const PROMPT_PATH = path.join(__dirname, '../prompts/alphasignal.txt');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const PROMPT = fs.readFileSync(PROMPT_PATH, 'utf-8');

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

function getLatestFile(prefix) {
  const files = fs.readdirSync(RAW_XML_DIR)
    .filter(f => f.startsWith(prefix + '_') && f.endsWith('.xml'));
  if (files.length === 0) throw new Error('No XML files found for ' + prefix);
  files.sort();
  return files[files.length - 1];
}

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
  return completion.choices[0].message.content;
}

async function processLatestFile() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);
  const latestFile = getLatestFile('alphasignal');
  const xmlPath = path.join(RAW_XML_DIR, latestFile);
  const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
  try {
    const jsonString = await extractJsonFromXml(xmlContent);
    const cleaned = jsonString.replace(/```json|```/g, '').trim();
    const json = JSON.parse(cleaned);
    const dateMatch = latestFile.match(/alphasignal_(\d{8})/);
    const dateStr = dateMatch ? dateMatch[1] : 'latest';
    const outPath = path.join(OUTPUT_DIR, `alphasignal_${dateStr}.json`);
    fs.writeFileSync(outPath, JSON.stringify(json, null, 2), 'utf-8');
    console.log(`Extracted: ${outPath}`);
  } catch (e) {
    console.error(`Failed to process ${latestFile}:`, e.message);
  }
}

processLatestFile(); 