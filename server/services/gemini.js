// Gemini enrichment: notes -> structured, sanitized JSON. Falls back to a heuristic when no API key is set.
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { HttpError } = require('../utils');

const ALLOWED_TAGS = new Set(['p', 'ul', 'ol', 'li', 'strong', 'em', 'br', 'h3']);

function sanitizeHtml(html = '') {
  return String(html)
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<(\/?)([a-z0-9]+)[^>]*>/gi, (_, slash, tag) =>
      ALLOWED_TAGS.has(tag.toLowerCase()) ? `<${slash}${tag.toLowerCase()}>` : '');
}

const SYSTEM_PROMPT = `You are a senior e-commerce copywriter and product data specialist.
Turn raw product notes into WooCommerce-ready catalog content.
Rules:
- Use ONLY facts present in the notes. Never invent specifications, certifications or claims.
- description_html: benefit-led, 1 short intro <p>, then a <ul> of 4-6 <li> features, then a closing <p>. Allowed tags: p, ul, li, strong, em.
- short_description: one plain-text sentence, max 160 characters.
- categories: 1-3 shop categories, most specific first. tags: 3-8 lowercase search phrases.
- attributes: from Color, Material, Dimensions, Weight (only those the notes support), each with an options array.
- images: one entry per image, in order, with alt (SEO-friendly, 80-125 chars, describes the image, no "image of") and caption (max 60 chars).
Return ONLY a JSON object: {"description_html":"","short_description":"","categories":[],"tags":[],"attributes":[{"name":"","options":[]}],"images":[{"alt":"","caption":""}]}`;

const buildPrompt = (p) => `Product title: ${p.title}
SKU: ${p.sku}
Price: ${p.price}
Current category: ${p.category || 'none'}
Image count: ${p.images.length}
Raw notes:
${p.notes || '(none provided)'}`;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cap = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());
const uniq = (arr) => [...new Set(arr.map((s) => s.trim()).filter(Boolean))];

function heuristicEnrich(p) {
  const text = p.notes || '';
  let bullets = text.split(/[\n;•]+/).map((s) => s.replace(/^[\s\-*]+/, '').trim()).filter(Boolean);
  if (bullets.length < 2) bullets = text.split(',').map((s) => s.trim()).filter(Boolean);
  const find = (re) => uniq((text.match(re) || []).map((m) => cap(m.toLowerCase())));
  const attributes = [];
  const color = find(/\b(black|white|grey|gray|navy|red|blue|green|olive|beige|brown|silver|charcoal|tan|cream)\b/gi);
  const material = find(/\b(nylon|cotton|merino wool|wool|ceramic|stainless steel|aluminium|aluminum|leather|polyester|silicone|bamboo|glass|plastic|rubber|cork|neoprene)\b/gi);
  const dims = text.match(/\b\d+(\.\d+)?\s?[x×]\s?\d+(\.\d+)?(\s?[x×]\s?\d+(\.\d+)?)?\s?(cm|mm|in)\b/i);
  const weight = text.match(/\b\d+(\.\d+)?\s?(kg|g|lbs?|oz)\b/i);
  if (color.length) attributes.push({ name: 'Color', options: color });
  if (material.length) attributes.push({ name: 'Material', options: material });
  if (dims) attributes.push({ name: 'Dimensions', options: [dims[0]] });
  if (weight) attributes.push({ name: 'Weight', options: [weight[0]] });
  const items = bullets.slice(0, 6).map((b) => `<li>${esc(b.charAt(0).toUpperCase() + b.slice(1))}</li>`).join('');
  return {
    ai: {
      description_html: `<p>Meet the <strong>${esc(p.title)}</strong>, built for everyday use.</p>${items ? `<ul>${items}</ul>` : ''}<p>Order yours today.</p>`,
      short_description: `${p.title}: ${bullets.slice(0, 3).join(', ')}.`.slice(0, 160),
      categories: uniq([p.category, 'Featured']).slice(0, 3),
      tags: uniq([p.title.toLowerCase(), (p.category || '').toLowerCase(), ...material.map((m) => m.toLowerCase())]).slice(0, 8),
      attributes,
      source: 'fallback',
    },
    imageMeta: p.images.map((_, i) => ({ alt: `${p.title} - view ${i + 1}`, caption: p.title })),
  };
}

function normalize(raw, p) {
  const arr = (v) => (Array.isArray(v) ? v.map(String).map((s) => s.trim()).filter(Boolean) : []);
  return {
    ai: {
      description_html: sanitizeHtml(raw.description_html),
      short_description: String(raw.short_description || '').replace(/<[^>]*>/g, '').slice(0, 300),
      categories: arr(raw.categories).slice(0, 3),
      tags: arr(raw.tags).slice(0, 10),
      attributes: (Array.isArray(raw.attributes) ? raw.attributes : [])
        .map((a) => ({ name: String(a?.name || '').trim(), options: arr(a?.options) }))
        .filter((a) => a.name && a.options.length).slice(0, 8),
      source: 'gemini',
    },
    imageMeta: p.images.map((_, i) => ({
      alt: String(raw.images?.[i]?.alt || '').slice(0, 200),
      caption: String(raw.images?.[i]?.caption || '').slice(0, 120),
    })),
  };
}

const parseJson = (text) => JSON.parse(String(text).replace(/^```(?:json)?|```$/gim, '').trim());

async function callGemini(p) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
  });
  const result = await model.generateContent(buildPrompt(p));
  return parseJson(result.response.text());
}

async function enrichProduct(p) {
  if (!process.env.GEMINI_API_KEY) return heuristicEnrich(p);
  let lastErr;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const out = normalize(await callGemini(p), p);
      if (!out.ai.description_html) throw new Error('Model returned an empty description');
      return out;
    } catch (err) {
      lastErr = err;
    }
  }
  throw new HttpError(502, `Gemini enrichment failed: ${lastErr.message}`);
}

module.exports = { enrichProduct, sanitizeHtml, buildPrompt, heuristicEnrich };
