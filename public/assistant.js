import { categories, stateTerms } from './data/categories.js';
import { schemes, schemeById } from './data/schemes.js';

export const normalize = value => value.normalize('NFKC').toLowerCase()
  .replace(/[\u200c\u200d]/gu, '').replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim();
export const hasTelugu = value => /[\u0c00-\u0c7f]/u.test(value);
const has = (query, term) => (' ' + query + ' ').includes(' ' + normalize(term) + ' ');

const intents = {
  documents: ['document', 'documents', 'paperwork', 'papers', 'proof', 'certificate', 'aadhaar', 'పత్రాలు', 'పత్రం', 'డాక్యుమెంట్లు', 'ధ్రువపత్రాలు', 'ఆధార్', 'కాగితాలు'],
  eligibility: ['eligible', 'eligibility', 'qualify', 'who can', 'can i get', 'criteria', 'అర్హత', 'అర్హతలు', 'అర్హులు', 'ఎవరికి', 'వర్తిస్తుందా'],
  benefits: ['benefits', 'benefit', 'amount', 'how much', 'coverage', 'ప్రయోజనాలు', 'ప్రయోజనం', 'ఎంత', 'సహాయం ఎంత', 'లాభాలు', 'డబ్బు ఎంత'],
  steps: ['apply', 'application', 'enroll', 'register', 'registration', 'website', 'portal', 'link', 'దరఖాస్తు', 'అప్లై', 'నమోదు', 'ఎలా పొందాలి', 'లింక్', 'వెబ్‌సైట్'],
  timing: ['deadline', 'last date', 'closing date', 'applications open', 'is it open', 'when can i apply', 'గడువు', 'చివరి తేదీ', 'ఎప్పుడు', 'తెరిచి ఉందా'],
  tracking: ['application status', 'track application', 'check my status', 'beneficiary status', 'దరఖాస్తు స్థితి', 'లబ్ధిదారు స్థితి'],
};
const explicit = schemes.flatMap(scheme => [...new Set([scheme.id, ...Object.values(scheme.name), ...scheme.aliases])]
  .map(alias => ({ id: scheme.id, alias: normalize(alias) })));
const pmay = ['pmay', 'awas yojana', 'ఆవాస్ యోజన'];
const topic = ['schemes', 'scheme', 'show me', 'recommend', 'what are available', 'పథకం', 'పథకాలు', 'పథకాలను', 'పథకానికి'];
const greeting = ['hi', 'hey', 'hello', 'namaste', 'నమస్కారం', 'హలో'];
const followup = ['it', 'this', 'that', 'same', 'previous', 'దీనికి', 'దీని', 'దీంతో', 'దానికి', 'దాని', 'ఈ పథకం', 'ఆ పథకం'];

function typoDistance(left, right) {
  if (Math.abs(left.length - right.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (left.length >= right.length) i++;
    if (right.length >= left.length) j++;
  }
  return edits + left.length - i + right.length - j <= 1;
}

function namedSchemes(query) {
  const direct = explicit.filter(({ alias }) => has(query, alias));
  if (direct.length) {
    return [...new Set(direct.filter(hit => !direct.some(other => other.id !== hit.id &&
      other.alias.length > hit.alias.length && has(other.alias, hit.alias))).map(hit => hit.id))];
  }
  if (pmay.some(term => has(query, term))) return ['pmay-g', 'pmay-u'];
  const tokens = query.split(' ');
  const close = explicit.filter(({ alias }) => /^[a-z]{6,18}$/u.test(alias) &&
    tokens.some(token => /^[a-z]{5,19}$/u.test(token) && typoDistance(token, alias)));
  return [...new Set(close.map(hit => hit.id))];
}

export function hasPrivateNumber(value) {
  const western = value.normalize('NFKC').replace(/[౦-౯]/gu, digit => String(digit.charCodeAt(0) - 0x0c66));
  return /(?:\d[ -]?){6,}/u.test(western) || /(?:\botp\b|ఓటీపీ|ఓటిపి)\D{0,18}\d{4,}/iu.test(western);
}

export function searchSchemes(query, category = '', region = '') {
  const term = normalize(query);
  const direct = term ? namedSchemes(term) : [];
  return schemes.filter(scheme => {
    if (category && !scheme.categories.includes(category)) return false;
    if (region === 'andhra' && scheme.location.en !== 'Andhra Pradesh') return false;
    if (region === 'central' && scheme.jurisdiction !== 'central') return false;
    if (!term || direct.includes(scheme.id)) return true;
    return [scheme.name.en, scheme.name.te, ...scheme.aliases,
      ...scheme.categories.flatMap(id => {
        const item = categories.find(value => value.id === id);
        return [item.en, item.te, ...item.terms];
      }),
    ].some(value => normalize(value).includes(term));
  });
}

export function getReply(message, context) {
  const query = normalize(message);
  const matchedIntents = Object.entries(intents).filter(([, terms]) => terms.some(term => has(query, term)));
  const intentIds = matchedIntents.map(([id]) => id);
  const sections = intentIds.includes('tracking') ? ['tracking'] : intentIds.includes('timing')
    ? [...intentIds.filter(id => id !== 'steps' && id !== 'timing'), 'timing'] : intentIds;
  const state = stateTerms.some(term => has(query, term));
  const referring = followup.some(term => has(query, term));
  const hasOtherTarget = /\b(?:for|of|about)\s+(?!(?:it|this|that|the same|the scheme|me|myself)\b)[\p{L}\p{M}]/u.test(query);
  const ids = namedSchemes(query);
  const categoryScores = categories.map(category => ({
    id: category.id, score: category.terms.filter(term => has(query, term)).length,
  })).filter(item => item.score > 0).sort((a, b) => b.score - a.score);

  if (ids.length === 1) {
    context.schemeId = ids[0];
    context.options = [];
    return { type: 'detail', ids, sections };
  }
  if (ids.length > 1) {
    context.schemeId = '';
    context.options = ids;
    return { type: 'clarify', ids };
  }
  if (context.schemeId && !hasOtherTarget && (referring || (!categoryScores.length && sections.length && !state))) {
    return { type: 'detail', ids: [context.schemeId], sections };
  }
  if (hasOtherTarget && !categoryScores.length && !state) return { type: 'noMatch', ids: [] };
  if (categoryScores.length || state) {
    const high = categoryScores[0]?.score;
    const idsForCategories = categoryScores.filter(item => item.score === high).map(item => item.id);
    const matches = schemes.filter(scheme => (!state || scheme.location.en === 'Andhra Pradesh') &&
      (!idsForCategories.length || idsForCategories.some(id => scheme.categories.includes(id))));
    context.schemeId = matches.length === 1 ? matches[0].id : '';
    context.options = matches.map(scheme => scheme.id);
    if (matches.length === 1 && sections.length) return { type: 'detail', ids: context.options, sections };
    return { type: matches.length ? (sections.length && !topic.some(term => has(query, term)) ? 'clarify' : 'recommend') : 'noMatch', ids: context.options };
  }
  if ((sections.length || referring) && context.options.length) return { type: 'clarify', ids: context.options };
  if (sections.length || referring) return { type: 'askName', ids: [] };
  if (greeting.includes(query)) return { type: 'welcome', ids: [] };
  if (topic.includes(query)) return { type: 'askCategory', ids: [] };
  return { type: 'noMatch', ids: [] };
}

export function setContextScheme(context, id) {
  if (!Object.hasOwn(schemeById, id)) return;
  context.schemeId = id;
  context.options = [];
}
