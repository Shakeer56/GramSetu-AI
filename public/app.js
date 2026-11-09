import { words, suggestions } from './i18n.js';
import { icon } from './icons.js';
import { categories, categoryById } from './data/categories.js';
import { schemes, schemeById } from './data/schemes.js';
import { getReply, hasPrivateNumber, hasTelugu, searchSchemes, setContextScheme } from './assistant.js';
import { createVoice } from './voice.js';

const $ = selector => document.querySelector(selector);
const escape = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));
const main = $('#main');
const dialog = $('#dialog');
const navItems = ['chat', 'explore', 'categories', 'saved', 'about'];
const detailSections = ['benefits', 'eligibility', 'documents', 'steps'];
const officialDirectory = 'https://www.myscheme.gov.in/';
const initialReply = () => ({ type: 'welcome', ids: [], id: 0 });

function readSetting(key, fallback) {
  try { return JSON.parse(localStorage.getItem('gramsetu.' + key)) ?? fallback; }
  catch { return fallback; }
}
function writeSetting(key, value) {
  try { localStorage.setItem('gramsetu.' + key, JSON.stringify(value)); }
  catch { /* The session continues if storage is disabled. */ }
}

let language = readSetting('language', 'en') === 'te' ? 'te' : 'en';
let detailLanguage = language;
let page = 'chat';
let currentRoute = '';
let activeDetail = '';
let detailTrigger;
let messages = [initialReply()];
let nextMessage = 1;
let draft = '';
let voiceStatus = '';
let speechId = null;
const context = { schemeId: '', options: [] };
const storedSaves = readSetting('saved', []);
const saved = new Set(Array.isArray(storedSaves) ? storedSaves.filter(id => Object.hasOwn(schemeById, id)) : []);
const filters = { query: '', category: '', region: '' };
const tr = (key, lang = language) => words[lang][key];
const ext = (url, label, className = '') => '<a class="' + className + '" href="' + escape(url) + '" target="_blank" rel="noopener noreferrer">' + escape(label) + ' ' + icon('external') + '</a>';
const list = (values, ordered = false) => {
  const tag = ordered ? 'ol' : 'ul';
  return '<' + tag + '>' + values.map(value => '<li>' + escape(value) + '</li>').join('') + '</' + tag + '>';
};

const voice = createVoice({
  onState(key) {
    voiceStatus = key;
    updateVoiceUI();
  },
  onTranscript(text) {
    if (hasPrivateNumber(text)) {
      voiceStatus = 'privacyBlocked';
      updateVoiceUI();
      return false;
    }
    draft = text.slice(0, 500);
    const input = $('#chat-input');
    if (input) { input.value = draft; input.focus(); }
    return true;
  },
  onSpeech(id) { speechId = id; updateVoiceUI(); },
});

function iconButton(action, label, glyph, options = '') {
  return '<button type="button" class="icon-button" data-action="' + action + '" aria-label="' + escape(label) +
    '" title="' + escape(label) + '" ' + options + '>' + icon(glyph) + '</button>';
}

function languageControl(action, selected, label) {
  return '<div class="language-group" role="group" aria-label="' + escape(label) + '">' +
    [['en', 'English'], ['te', 'తెలుగు']].map(([code, title]) =>
      '<button type="button" class="language-option" lang="' + code + '" data-action="' + action + '" data-value="' + code +
      '" aria-pressed="' + (selected === code) + '">' + title + '</button>').join('') + '</div>';
}

function chrome() {
  document.documentElement.lang = language;
  $('.skip-link').textContent = tr('skip');
  $('.brand').href = '#chat';
  $('.brand small').textContent = tr('brand');
  $('.brand').setAttribute('aria-label', 'GramSetu AI · ' + tr('chat'));
  $('.brand-mark').innerHTML = icon('bridge');
  $('#nav').setAttribute('aria-label', tr('navigation'));
  $('#nav').innerHTML = navItems.map(key => '<a href="#' + key + '"' + (page === key ? ' aria-current="page"' : '') + '>' + tr(key) + '</a>').join('');
  const current = $('#language');
  if (current) current.outerHTML = '<div id="language">' + languageControl('language', language, tr('language')) + '</div>';
  $('#footer').innerHTML = '<div><strong>GramSetu AI</strong><small>' + tr('footer') + '</small></div>' +
    ext(officialDirectory, 'myScheme') + '<a href="#about">' + tr('about') + '</a>';
}

function saveButton(scheme, lang) {
  const on = saved.has(scheme.id);
  return iconButton('save', tr(on ? 'unsave' : 'save', lang), 'save',
    'data-id="' + scheme.id + '" data-lang="' + lang + '" aria-pressed="' + on + '"');
}

function card(scheme, lang = language) {
  const category = categoryById[scheme.categories[0]];
  return '<article class="scheme-card" lang="' + lang + '"><div class="card-top"><span class="category-label">' +
    icon(category.icon) + escape(category[lang]) + '</span>' + saveButton(scheme, lang) +
    '</div><h3><a href="#scheme/' + scheme.id + '">' + escape(scheme.name[lang]) + '</a></h3><p>' +
    escape(scheme.overview[lang]) + '</p><div class="card-bottom"><span>' + tr(scheme.jurisdiction, lang) +
    '</span><a class="arrow-link" href="#scheme/' + scheme.id + '" aria-label="' + escape(tr('details', lang) + ' · ' + scheme.name[lang]) +
    '">' + tr('details', lang) + icon('arrow') + '</a></div></article>';
}

const cards = (items, lang = language) => '<div class="scheme-grid">' + items.map(item => card(item, lang)).join('') + '</div>';
const detailLink = (id, lang) => '<a class="arrow-link" href="#scheme/' + id + '">' + tr('details', lang) + icon('arrow') + '</a>';
const applicationLink = (scheme, lang) => scheme.application
  ? ext(scheme.application, tr(scheme.access === 'status' ? 'checkStatus' : 'apply', lang), 'official-action')
  : '';

function botContent(message, lang) {
  const scheme = schemeById[message.ids[0]];
  if (message.type === 'detail' && scheme) {
    const sections = message.sections.length ? message.sections : ['overview'];
    return '<p class="answer-title">' + escape(scheme.name[lang]) + '</p>' + sections.map(section => {
      if (section === 'timing') return '<strong>' + tr('timing', lang) + '</strong><p>' + tr('timings', lang) + '</p>';
      if (section === 'tracking') return '<strong>' + tr('trackingTitle', lang) + '</strong><p>' + tr('tracking', lang) + '</p>';
      if (section === 'overview') return '<p>' + escape(scheme.overview[lang]) + '</p>';
      return '<strong>' + tr(section, lang) + '</strong>' + list(scheme[section][lang], section === 'steps') +
        (section === 'eligibility' ? '<p class="qualification">' + tr('decision', lang) + '</p>' : '');
    }).join('') + '<div class="answer-actions">' + detailLink(scheme.id, lang) +
      (sections.includes('tracking') ? ext(scheme.application && scheme.access === 'status' ? scheme.application : scheme.information, tr('official', lang))
        : sections.includes('steps') ? applicationLink(scheme, lang) : sections.includes('timing') ? ext(scheme.information, tr('official', lang)) : '') +
      '</div>';
  }
  const key = message.type === 'recommend' ? 'recommendations' : message.type;
  return '<p>' + tr(key, lang) + '</p>' + (message.type === 'noMatch' ? ext(officialDirectory, 'myScheme') : '');
}

function messageView(message) {
  if (message.type === 'user') return '<article class="chat-line user"><div lang="' + (hasTelugu(message.text) ? 'te' : 'en') +
    '" class="message user-bubble">' + escape(message.text) + '</div></article>';
  const lang = message.lang || language;
  return '<article class="chat-line bot" lang="' + lang + '"><span class="assistant-avatar">' + icon('bridge') +
    '</span><div class="chat-content"><div class="message bot-bubble"><div class="message-text" id="speech-' +
    message.id + '">' + botContent(message, lang) + '</div>' +
    iconButton('speak', tr('read', lang), 'speaker', 'data-id="' + message.id + '" data-lang="' + lang + '" aria-pressed="false"') +
    '</div>' + (['recommend', 'clarify'].includes(message.type) && message.ids.length
      ? cards(message.ids.map(id => schemeById[id]), lang) : '') + '</div></article>';
}

function topicLink(category, compact = false) {
  const link = '<a class="' + (compact ? 'topic-link' : 'category-item') + '" href="#explore?category=' + category.id + '">' +
    '<span class="topic-icon">' + icon(category.icon) + '</span><span>' + escape(category[language]) + '</span>' + icon('arrow') + '</a>';
  return link;
}

function chatView() {
  const topicIds = ['farmers', 'education', 'health', 'housing'];
  return '<section class="chat-page"><div class="chat-intro"><p class="eyebrow">' + tr('chatBadge') + '</p><h1>' +
    tr('title') + '</h1><p>' + tr('intro') + '</p></div><div class="chat-layout"><div class="chat-panel">' +
    '<div class="panel-top"><span class="assistant-avatar">' + icon('chat') + '</span><div><h2>' + tr('assistant') +
    '</h2><small>' + tr('live') + '</small></div><button class="clear-button" type="button" data-action="clear">' +
    icon('clear') + '<span>' + tr('clear') + '</span></button></div>' +
    '<div class="transcript" id="transcript" role="log" aria-label="' + tr('chat') + '" tabindex="0">' + messages.map(messageView).join('') + '</div>' +
    '<div class="composer"><p class="suggestion-label">' + tr('suggestions') + '</p><div class="suggestions">' +
    suggestions.map((item, index) => '<button type="button" class="chip" data-action="suggest" data-id="' + index + '">' +
      escape(item[language]) + '</button>').join('') + '</div><form id="chat-form"><label class="sr-only" for="chat-input">' + tr('input') + '</label>' +
    '<input id="chat-input" name="question" type="text" maxlength="500" required autocomplete="off" placeholder="' +
    escape(tr('placeholder')) + '" value="' + escape(draft) + '">' + iconButton('mic', tr('listen'), 'mic') +
    '<button type="submit" class="send-button">' + icon('send') + '<span>' + tr('send') + '</span></button></form>' +
    '<p class="voice-state" id="voice-state" role="status"></p><p class="privacy-note">' + icon('shield') + tr('privacy') + '</p></div></div>' +
    '<aside class="chat-sidebar"><div class="topic-panel"><p class="eyebrow">' + tr('quickTopics') + '</p><h2>' + tr('exploreTopics') +
    '</h2>' + topicIds.map(id => topicLink(categoryById[id], true)).join('') +
    '<a class="arrow-link" href="#categories">' + tr('categories') + icon('arrow') + '</a></div>' +
    '<div class="trust-panel"><span class="topic-icon">' + icon('shield') + '</span><h2>' + tr('trusted') +
    '</h2><p>' + tr('trustedBody') + '</p><a class="arrow-link" href="#explore?region=andhra">' +
    tr('apBrowse') + icon('arrow') + '</a></div></aside></div></section>';
}

function option(value, title, selected) {
  return '<option value="' + value + '"' + (selected === value ? ' selected' : '') + '>' + escape(title) + '</option>';
}

function pageHeading(title, description) {
  return '<header class="page-heading"><h1>' + tr(title) + '</h1><p>' + tr(description) + '</p></header>';
}

function exploreView() {
  return '<section>' + pageHeading('explore', 'exploreIntro') + '<div class="filters">' +
    '<label>' + tr('search') + '<input id="scheme-query" type="search" maxlength="100" value="' + escape(filters.query) +
    '" placeholder="' + escape(tr('searchPlaceholder')) + '"></label><label>' + tr('filterCategory') +
    '<select id="scheme-category">' + option('', tr('allCategories'), filters.category) +
    categories.map(category => option(category.id, category[language], filters.category)).join('') +
    '</select></label><label>' + tr('filterRegion') + '<select id="scheme-region">' +
    option('', tr('allRegions'), filters.region) + option('central', tr('central'), filters.region) +
    option('andhra', tr('andhra'), filters.region) + '</select></label><button class="clear-button" type="button" data-action="reset">' +
    tr('reset') + '</button></div><p id="result-count" class="result-count" role="status"></p><div id="results"></div></section>';
}

function updateResults() {
  const results = searchSchemes(filters.query, filters.category, filters.region);
  $('#result-count').textContent = new Intl.NumberFormat(language).format(results.length) + ' ' + tr('results');
  $('#results').innerHTML = results.length ? cards(results) : '<p class="empty">' + tr('noResults') + '</p>';
}

function pageView() {
  if (page === 'chat') return chatView();
  if (page === 'explore') return exploreView();
  if (page === 'categories') return '<section>' + pageHeading('categories', 'categoriesIntro') +
    '<div class="category-grid">' + categories.map(category => topicLink(category)).join('') +
    '</div><a class="button" href="#explore?region=andhra">' + tr('apBrowse') + icon('arrow') + '</a></section>';
  if (page === 'saved') return '<section>' + pageHeading('saved', 'savedIntro') +
    (saved.size ? cards(schemes.filter(scheme => saved.has(scheme.id))) : '<div class="empty"><p>' + tr('emptySaved') +
    '</p><a class="button" href="#explore">' + tr('browse') + icon('arrow') + '</a></div>') + '</section>';
  return '<section>' + pageHeading('aboutTitle', 'aboutIntro') + '<div class="about-panel"><p>' + tr('aboutMethod') +
    '</p><p>' + tr('aboutData') + '</p><p>' + tr('aboutVoice') + '</p><p>' + tr('decision') + '</p>' +
    ext(officialDirectory, 'myScheme', 'official-action') + '</div></section>';
}

function displayDate(value, lang) {
  return new Intl.DateTimeFormat(lang === 'te' ? 'te-IN' : 'en-IN', {
    dateStyle: 'medium', timeZone: 'UTC',
  }).format(new Date(value + 'T00:00:00Z'));
}

function detailView(id) {
  const scheme = Object.hasOwn(schemeById, id) ? schemeById[id] : null;
  const lang = detailLanguage;
  const t = key => tr(key, lang);
  const body = scheme ? '<div class="detail-heading"><span class="category-label">' + t(scheme.jurisdiction) +
    ' · ' + escape(scheme.location[lang]) + '</span><h2 id="dialog-title">' + escape(scheme.name[lang]) +
    '</h2><span class="status">' + t(scheme.status) + '</span></div>' +
    '<div class="detail-meta"><div><span>' + t('department') + '</span><strong>' + escape(scheme.department[lang]) +
    '</strong></div><div><span>' + t('reviewed') + '</span><strong>' + displayDate(scheme.verifiedAt, lang) + '</strong></div></div>' +
    '<section class="detail-section"><h3>' + t('overview') + '</h3><p>' + escape(scheme.overview[lang]) + '</p></section>' +
    detailSections.map(section => '<section class="detail-section"><h3>' + t(section) + '</h3>' +
      list(scheme[section][lang], section === 'steps') + '</section>').join('') +
    '<div class="detail-actions">' + applicationLink(scheme, lang) + ext(scheme.information, t('official'), 'secondary-action') +
    saveButton(scheme, lang) + '</div>' + (scheme.access === 'office' ? '<p class="qualification">' + t('office') + '</p>' : '') +
    '<details class="sources"><summary>' + t('sources') + '</summary><ul>' +
    scheme.references.map((url, index) => '<li>' + ext(url, (index + 1) + '. ' + new URL(url).hostname) + '</li>').join('') +
    '</ul></details>' : '<h2 id="dialog-title">' + t('missing') + '</h2>';
  const y = dialog.scrollTop;
  dialog.lang = lang;
  $('#dialog-content').innerHTML = '<div class="detail-tools">' + languageControl('detail-language', lang, t('detailLanguage')) +
    iconButton('close-detail', t('close'), 'close') + '</div>' + body;
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = y;
}

function render() {
  chrome();
  main.innerHTML = pageView();
  if (page === 'explore') updateResults();
  if (page === 'chat') {
    updateVoiceUI();
    scrollChat();
  }
}

function scrollChat() {
  const transcript = $('#transcript');
  const last = transcript?.lastElementChild;
  if (!last) return;
  const top = last.getBoundingClientRect().top - transcript.getBoundingClientRect().top + transcript.scrollTop;
  transcript.scrollTop = Math.min(top - 10, transcript.scrollHeight - transcript.clientHeight);
}

function updateVoiceUI() {
  const status = $('#voice-state');
  if (status) status.textContent = voiceStatus ? tr(voiceStatus) : '';
  const mic = $('[data-action="mic"]');
  if (mic) {
    const active = voice.isRecording();
    const label = tr(active ? 'stopVoice' : 'listen');
    mic.setAttribute('aria-pressed', active);
    mic.setAttribute('aria-label', label);
    mic.title = label;
    mic.innerHTML = icon(active ? 'stop' : 'mic');
  }
  document.querySelectorAll('[data-action="speak"]').forEach(button => {
    const active = speechId === Number(button.dataset.id);
    const label = tr(active ? 'stopRead' : 'read', button.dataset.lang);
    button.setAttribute('aria-pressed', active);
    button.setAttribute('aria-label', label);
    button.title = label;
    button.innerHTML = icon(active ? 'stop' : 'speaker');
  });
}

function route() {
  const requestedHash = location.hash.slice(1);
  const hash = requestedHash && requestedHash !== 'main' ? requestedHash : 'chat';
  if (hash.startsWith('scheme/')) {
    if (!main.hasChildNodes()) render();
    if (!dialog.open) detailTrigger = document.activeElement;
    const id = hash.slice(7);
    if (id !== activeDetail) {
      activeDetail = id;
      detailLanguage = language;
      setContextScheme(context, id);
    }
    detailView(id);
    return;
  }
  const returningFromDetail = Boolean(activeDetail);
  if (dialog.open) dialog.close();
  activeDetail = '';
  if (hash === currentRoute && main.hasChildNodes()) {
    if (returningFromDetail && detailTrigger?.isConnected) detailTrigger.focus();
    return;
  }
  voice.stop(true);
  voice.stopSpeech();
  voiceStatus = '';
  const [requested, query = ''] = hash.split('?');
  const nextPage = navItems.includes(requested) ? requested : 'chat';
  if (nextPage === 'explore') {
    const params = new URLSearchParams(query);
    filters.query = params.get('q')?.slice(0, 100) || '';
    filters.category = params.get('category') || '';
    filters.region = params.get('region') || '';
    if (!Object.hasOwn(categoryById, filters.category)) filters.category = '';
    if (!['andhra', 'central'].includes(filters.region)) filters.region = '';
  }
  const hadContent = main.hasChildNodes();
  page = nextPage;
  currentRoute = hash;
  render();
  if (hadContent) {
    main.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
}

function closeDetail() {
  if (!activeDetail) return;
  if (detailTrigger?.isConnected && history.state?.gramsetuDetail) history.back();
  else location.replace('#' + (currentRoute || 'chat'));
}

function setFiltersInUrl() {
  const params = new URLSearchParams();
  if (filters.query && !hasPrivateNumber(filters.query)) params.set('q', filters.query);
  if (filters.category) params.set('category', filters.category);
  if (filters.region) params.set('region', filters.region);
  currentRoute = 'explore' + (params.size ? '?' + params.toString() : '');
  history.replaceState(null, '', '#' + currentRoute);
  updateResults();
}

function appendMessage(message) {
  messages.push(message);
  $('#transcript').insertAdjacentHTML('beforeend', messageView(message));
}

function submitQuestion(value) {
  const text = value.trim().slice(0, 500);
  if (!text) return;
  voice.stop(true);
  voice.stopSpeech();
  voiceStatus = '';
  draft = '';
  $('#chat-input').value = '';
  const lang = hasTelugu(text) ? 'te' : language;
  if (hasPrivateNumber(text)) {
    appendMessage({ type: 'privacyBlocked', ids: [], id: nextMessage++, lang });
  } else {
    appendMessage({ type: 'user', text });
    appendMessage({ ...getReply(text, context), id: nextMessage++, lang });
  }
  updateVoiceUI();
  scrollChat();
  $('#chat-input').focus({ preventScroll: true });
}

function toggleSave(id) {
  if (!Object.hasOwn(schemeById, id)) return;
  if (saved.has(id)) saved.delete(id);
  else saved.add(id);
  writeSetting('saved', [...saved]);
  document.querySelectorAll('[data-action="save"][data-id="' + id + '"]').forEach(button => {
    const on = saved.has(id);
    const label = tr(on ? 'unsave' : 'save', button.dataset.lang);
    button.setAttribute('aria-pressed', on);
    button.setAttribute('aria-label', label);
    button.title = label;
  });
  if (page === 'saved' && !saved.has(id)) {
    main.innerHTML = pageView();
    if (!dialog.open) main.focus({ preventScroll: true });
  }
}

document.addEventListener('submit', event => {
  if (event.target.id !== 'chat-form') return;
  event.preventDefault();
  submitQuestion($('#chat-input').value);
});

document.addEventListener('input', event => {
  if (event.target.id === 'chat-input') draft = event.target.value;
  if (event.target.id === 'scheme-query') {
    filters.query = event.target.value;
    setFiltersInUrl();
  }
});

document.addEventListener('change', event => {
  if (event.target.id === 'scheme-category') filters.category = event.target.value;
  else if (event.target.id === 'scheme-region') filters.region = event.target.value;
  else return;
  setFiltersInUrl();
});

document.addEventListener('click', event => {
  const schemeLink = event.target.closest('a[href^="#scheme/"]');
  if (schemeLink && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) {
    event.preventDefault();
    history.pushState({ gramsetuDetail: true }, '', schemeLink.getAttribute('href'));
    route();
    return;
  }
  if (event.target.closest('.skip-link')) {
    event.preventDefault();
    main.focus();
    return;
  }
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, id, value, lang } = button.dataset;
  if (action === 'language') {
    if (language === value) return;
    voice.stop(true);
    voice.stopSpeech();
    voiceStatus = '';
    language = value;
    writeSetting('language', value);
    render();
    $('[data-action="language"][data-value="' + value + '"]').focus();
  } else if (action === 'detail-language') {
    detailLanguage = value;
    detailView(activeDetail);
    dialog.querySelector('[data-value="' + value + '"]').focus();
  } else if (action === 'close-detail') closeDetail();
  else if (action === 'save') toggleSave(id);
  else if (action === 'suggest') submitQuestion(suggestions[Number(id)][language]);
  else if (action === 'clear') {
    voice.stop(true);
    voice.stopSpeech();
    context.schemeId = '';
    context.options = [];
    messages = [initialReply()];
    draft = '';
    voiceStatus = '';
    $('#chat-input').value = '';
    $('#transcript').innerHTML = messageView(messages[0]);
    updateVoiceUI();
    $('#chat-input').focus();
  } else if (action === 'mic') {
    if (voice.isRecording()) voice.stop();
    else { voice.stopSpeech(); voice.start(language); }
  } else if (action === 'speak') {
    if (speechId === Number(id)) voice.stopSpeech();
    else {
      voice.stop(true);
      voiceStatus = '';
      updateVoiceUI();
      voice.speak(Number(id), $('#speech-' + id).innerText, lang);
    }
  } else if (action === 'reset') {
    Object.assign(filters, { query: '', category: '', region: '' });
    $('#scheme-query').value = $('#scheme-category').value = $('#scheme-region').value = '';
    setFiltersInUrl();
    $('#scheme-query').focus();
  }
});

dialog.addEventListener('cancel', event => { event.preventDefault(); closeDetail(); });
dialog.addEventListener('click', event => { if (event.target === dialog) closeDetail(); });
window.addEventListener('hashchange', route);
window.addEventListener('pagehide', () => { voice.stop(true); voice.stopSpeech(); });
route();
