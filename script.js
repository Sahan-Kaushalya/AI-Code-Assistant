/* ═══════════════════════════════════════════════════════════
   CODEMESH — AI Code Assistant · script.js
   OpenRouter API · Inline Edit · Live Preview · v2.0
═══════════════════════════════════════════════════════════ */

'use strict';

/* ─── OpenRouter API ─── */
const OR_API = 'https://openrouter.ai/api/v1/chat/completions';

/* ─── Models ─── */
const MODELS = [
  { id:'openai/gpt-oss-120b:free',   name:'GPT OSS 120B',  short:'GPT-OSS',  color:'#34d399', provider:'OpenAI',   desc:'Large open-source model'       },
  { id:'minimax/minimax-m2.5:free',  name:'MiniMax M2.5',  short:'MiniMax',  color:'#60a5fa', provider:'MiniMax',  desc:'Efficient & capable model'      },
  { id:'z-ai/glm-4.5-air:free',      name:'GLM 4.5 Air',   short:'GLM-Air',  color:'#fbbf24', provider:'Z-AI',     desc:'Lightweight fast inference'     },
  { id:'poolside/laguna-m.1:free',   name:'Laguna M.1',    short:'Laguna',   color:'#f472b6', provider:'Poolside', desc:'Code-specialized model'         },
];

/* ─── Language colours for code block header dot ─── */
const LANG_COLORS = {
  javascript:'#f7df1e', js:'#f7df1e', typescript:'#3178c6', ts:'#3178c6',
  python:'#3572A5', py:'#3572A5', html:'#e34c26', css:'#264de4',
  json:'#40bf77', bash:'#89e051', sh:'#89e051', shell:'#89e051',
  java:'#b07219', cpp:'#f34b7d', c:'#555555', rust:'#dea584',
  go:'#00ADD8', php:'#4F5D95', ruby:'#701516', sql:'#e38c00',
  plaintext:'#8891b8', text:'#8891b8', default:'#8891b8',
};

/* ─── CodeMirror mode map ─── */
const CM_MODES = {
  javascript:'javascript', js:'javascript', typescript:'javascript', ts:'javascript',
  python:'python', py:'python',
  html:'htmlmixed', css:'css', xml:'xml',
  java:'text/x-java', cpp:'text/x-c++src', c:'text/x-csrc',
  bash:'shell', sh:'shell', shell:'shell',
  json:'application/json',
};

/* ─── Preview-able languages (render in iframe) ─── */
const PREVIEWABLE = new Set(['html','css','javascript','js','svg']);

/* ─── System prompt ─── */
const SYSTEM = `You are CODEMESH, an elite AI coding assistant Developed by Sahan Kaushalya. Help with:
- Writing clean, efficient, production-ready code
- Debugging and fixing errors with clear explanations
- Code reviews, best practices, design patterns
- Architecture guidance and system design
- Unit tests, documentation, optimisation

CODE FORMAT RULES:
- ALWAYS wrap code in triple-backtick fences with the language name e.g. \`\`\`python
- Add a brief explanation before code and key notes after
- Highlight potential issues or improvements
- For HTML/CSS/JS UI tasks, write complete self-contained code that can be previewed in an iframe

Use markdown for all responses. Be concise, precise and professional.`;

/* ─── App State ─── */
const S = {
  apiKey:      localStorage.getItem('codemesh_key') || '',
  model:       MODELS[0],
  messages:    [],
  history:     [],
  sessionId:   Date.now(),
  loading:     false,
  previewCode: '',
  previewLang: 'html',
};

/* ─── DOM ─── */
const $ = id => document.getElementById(id);
const D = {
  sidebar:       $('sidebar'),
  sidebarToggle: $('sidebarToggle'),
  newChatBtn:    $('newChatBtn'),
  clearHist:     $('clearHistoryBtn'),
  chatHistory:   $('chatHistory'),
  searchInput:   $('searchInput'),
  welcome:       $('welcomeScreen'),
  msgs:          $('messagesArea'),
  chatScroll:    $('chatScroll'),
  msgInput:      $('messageInput'),
  sendBtn:       $('sendBtn'),
  voiceBtn:      $('voiceBtn'),
  modelBtn:      $('modelSelectorBtn'),
  modelDd:       $('modelDropdown'),
  modelArrow:    $('modelArrow'),
  modelList:     $('modelList'),
  modelLabel:    $('selectedModelLabel'),
  modelDot:      $('modelDot'),
  apiKeyBtn:     $('apiKeyBtn'),
  apiKeyStatus:  $('apiKeyStatus'),
  apiModal:      $('apiKeyModal'),
  apiInput:      $('apiKeyInput'),
  saveKey:       $('saveApiKey'),
  cancelKey:     $('cancelApiKey'),
  closeApiModal: $('closeApiModal'),
  toggleKeyVis:  $('toggleApiKeyVis'),
  previewModal:  $('previewModal'),
  previewFrame:  $('previewFrame'),
  previewFBx:    $('previewFrameBox'),
  previewLangBadge: $('previewLangBadge'),
  closePreview:  $('closePreview'),
  refreshPreview:$('refreshPreview'),
  openInTab:     $('openInTab'),
  toast:         $('toast'),
};

/* ════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
function init() {
  buildModelDropdown();
  setModel(S.model, false);
  loadHistory();
  updateApiStatus();
  if (S.apiKey) D.apiInput.value = S.apiKey;
  bindEvents();
  autoResize();
}

/* ════════════════════════════════════════
   MODEL DROPDOWN
══════════════════════════════════════════ */
function buildModelDropdown() {
  D.modelList.innerHTML = '';
  MODELS.forEach(m => {
    const div = document.createElement('div');
    div.className = 'model-option' + (m.id === S.model.id ? ' sel' : '');
    div.innerHTML = `
      <div style="width:8px;height:8px;border-radius:50%;background:${m.color};box-shadow:0 0 6px ${m.color}66;flex-shrink:0"></div>
      <div style="flex:1;min-width:0">
        <div class="mo-name">${m.name}</div>
        <div class="mo-sub">${m.provider} · ${m.desc}</div>
      </div>
      <div style="font-family:JetBrains Mono,monospace;font-size:9px;color:#3d4468">${m.id.split('/')[1]?.split(':')[0] || ''}</div>
    `;
    div.addEventListener('click', () => { setModel(m); closeDd(); });
    D.modelList.appendChild(div);
  });
}

function setModel(m, notify = true) {
  S.model = m;
  D.modelLabel.textContent = m.name;
  D.modelDot.style.background = m.color;
  D.modelDot.style.boxShadow = `0 0 7px ${m.color}88`;
  updateQuickChips();
  buildModelDropdown();
  if (notify) toast(`Switched to ${m.name}`, 'info');
}

function toggleDd() { D.modelDd.classList.contains('hidden') ? openDd() : closeDd(); }
function openDd()  { D.modelDd.classList.remove('hidden'); D.modelArrow.style.transform='rotate(180deg)'; }
function closeDd() { D.modelDd.classList.add('hidden');    D.modelArrow.style.transform=''; }

function updateQuickChips() {
  document.querySelectorAll('.quick-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.model === S.model.id);
  });
}

/* ════════════════════════════════════════
   EVENT BINDING
══════════════════════════════════════════ */
function bindEvents() {
  D.sidebarToggle.addEventListener('click', () => D.sidebar.classList.toggle('collapsed'));
  D.newChatBtn.addEventListener('click', newChat);
  D.clearHist.addEventListener('click', clearHistory);
  D.sendBtn.addEventListener('click', handleSend);
  D.msgInput.addEventListener('input', autoResize);
  D.msgInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  });
  D.modelBtn.addEventListener('click', e => { e.stopPropagation(); toggleDd(); });
  document.addEventListener('click', e => {
    if (!D.modelBtn.contains(e.target) && !D.modelDd.contains(e.target)) closeDd();
  });
  document.querySelectorAll('.quick-chip').forEach(c => {
    c.addEventListener('click', () => {
      const m = MODELS.find(x => x.id === c.dataset.model);
      if (m) setModel(m);
    });
  });
  document.querySelectorAll('.suggestion-chip').forEach(c => {
    c.addEventListener('click', () => {
      D.msgInput.value = c.dataset.text;
      autoResize();
      D.msgInput.focus();
    });
  });
  D.apiKeyBtn.addEventListener('click', openApiModal);
  D.closeApiModal.addEventListener('click', closeApiModal);
  D.cancelKey.addEventListener('click', closeApiModal);
  D.saveKey.addEventListener('click', saveApiKey);
  D.toggleKeyVis.addEventListener('click', toggleKeyVis);
  D.apiModal.addEventListener('click', e => { if (e.target === D.apiModal) closeApiModal(); });
  D.closePreview.addEventListener('click', closePreviewModal);
  D.refreshPreview.addEventListener('click', () => setPreviewContent(S.previewCode, S.previewLang));
  D.openInTab.addEventListener('click', openPreviewInTab);
  document.querySelectorAll('.viewport-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.viewport-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      D.previewFBx.style.width = btn.dataset.w;
    });
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!D.previewModal.classList.contains('hidden')) closePreviewModal();
      if (!D.apiModal.classList.contains('hidden')) closeApiModal();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); D.msgInput.focus(); }
  });
  D.voiceBtn.addEventListener('click', handleVoice);
  D.searchInput?.addEventListener('input', e => filterHistory(e.target.value));

  // Persist current session if user closes tab or switches away.
  window.addEventListener('beforeunload', persistActiveSession);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') persistActiveSession();
  });
}

/* ════════════════════════════════════════
   TEXTAREA AUTO-RESIZE
══════════════════════════════════════════ */
function autoResize() {
  const ta = D.msgInput;
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
}

/* ════════════════════════════════════════
   SEND / API
══════════════════════════════════════════ */
async function handleSend() {
  const text = D.msgInput.value.trim();
  if (!text || S.loading) return;
  if (!S.apiKey) { openApiModal(); toast('Enter your OpenRouter API key first', 'error'); return; }

  showChatArea();
  S.messages.push({ role:'user', content:text });
  renderMsg({ role:'user', content:text });
  D.msgInput.value = '';
  D.msgInput.style.height = 'auto';

  const typer = showTyping();
  S.loading = true;
  D.sendBtn.disabled = true;

  try {
    const reply = await callOR(S.messages);
    typer.remove();
    const aiMsg = { role:'assistant', content:reply };
    S.messages.push(aiMsg);
    renderMsg(aiMsg);
    saveSession();
  } catch(err) {
    typer.remove();
    renderError(err.message || 'Request failed. Check your API key and try again.');
  } finally {
    S.loading = false;
    D.sendBtn.disabled = false;
    scrollBottom();
  }
}

async function callOR(msgs) {
  const res = await fetch(OR_API, {
    method: 'POST',
    headers: {
      'Content-Type':'application/json',
      'Authorization':`Bearer ${S.apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title':'CODEMESH AI Assistant',
    },
    body: JSON.stringify({
      model: S.model.id,
      messages: [ { role:'system', content:SYSTEM }, ...msgs ],
      max_tokens: 4096,
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || `API Error ${res.status}`);
  }
  const d = await res.json();
  const c = d?.choices?.[0]?.message?.content;
  if (!c) throw new Error('Empty response from model.');
  return c;
}

/* ════════════════════════════════════════
   RENDER MESSAGES
══════════════════════════════════════════ */
function showChatArea() {
  D.welcome.classList.add('hidden');
  D.msgs.classList.remove('hidden');
}

function renderMsg(msg) {
  if (msg.role === 'user') {
    const w = document.createElement('div');
    w.className = 'msg-user';
    w.innerHTML = `<div class="bubble">${escHtml(msg.content).replace(/\n/g,'<br>')}</div>`;
    D.msgs.appendChild(w);
  } else {
    const w = document.createElement('div');
    w.className = 'msg-ai';
    const m = S.model;
    const htmlContent = parseMarkdown(msg.content);

    w.innerHTML = `
      <div class="ai-avatar">
       <image src="ui/logo.png" alt="CODEMESH Logo" class="w-6 h-6">
      </div>
      <div class="ai-content">
        <div class="model-tag"><span style="color:${m.color}">${m.name}</span></div>
        <div class="prose">${htmlContent}</div>
        <div class="msg-actions">
          <button class="msg-act-btn act-copy">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy
          </button>
          <button class="msg-act-btn act-regen">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg> Regenerate
          </button>
        </div>
      </div>
    `;

    /* Syntax highlight all code blocks */
    w.querySelectorAll('pre code').forEach(b => hljs.highlightElement(b));

    /* Attach code block interactivity */
    w.querySelectorAll('.code-block').forEach(cb => initCodeBlock(cb));

    /* Copy full response */
    w.querySelector('.act-copy')?.addEventListener('click', btn => {
      copyText(msg.content);
      const el = btn.currentTarget;
      el.textContent = '✓ Copied!';
      setTimeout(() => { el.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`; }, 1800);
    });

    /* Regenerate */
    w.querySelector('.act-regen')?.addEventListener('click', async () => {
      S.messages.pop();
      w.remove();
      const typer = showTyping();
      S.loading = true; D.sendBtn.disabled = true;
      try {
        const reply = await callOR(S.messages);
        typer.remove();
        const newMsg = { role:'assistant', content:reply };
        S.messages.push(newMsg);
        renderMsg(newMsg);
      } catch(e) { typer.remove(); renderError(e.message); }
      finally { S.loading = false; D.sendBtn.disabled = false; scrollBottom(); }
    });

    D.msgs.appendChild(w);
  }
  scrollBottom();
}

/* ════════════════════════════════════════
   CODE BLOCK — INIT INTERACTIVITY
   (Copy · Edit · Preview Design)
══════════════════════════════════════════ */
function initCodeBlock(cb) {
  const lang   = (cb.dataset.lang || 'plaintext').toLowerCase();
  const rawCode = cb.dataset.raw || '';
  const canPreview = PREVIEWABLE.has(lang);

  /* --- Copy btn --- */
  cb.querySelector('.cb-copy')?.addEventListener('click', function() {
    const code = cb.querySelector('.cb-editor-wrap')?.style.display !== 'none'
      ? (cb._cmEditor ? cb._cmEditor.getValue() : rawCode)
      : rawCode;
    copyText(code);
    this.textContent = '✓ Copied!';
    this.classList.add('copy-done');
    setTimeout(() => {
      this.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`;
      this.classList.remove('copy-done');
    }, 2000);
  });

  /* --- Edit btn --- */
  cb.querySelector('.cb-edit')?.addEventListener('click', function() {
    const codeView   = cb.querySelector('.cb-code-view');
    const editorWrap = cb.querySelector('.cb-editor-wrap');
    const editFooter = cb.querySelector('.cb-edit-footer');
    const isEditing  = editorWrap.style.display !== 'none';

    if (!isEditing) {
      /* ENTER EDIT MODE */
      codeView.style.display = 'none';
      editorWrap.style.display = 'block';
      editFooter.classList.add('visible');
      this.classList.add('edit-active');
      this.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg> Close Editor`;

      if (!cb._cmEditor) {
        const cmMode = CM_MODES[lang] || 'plaintext';
        cb._cmEditor = CodeMirror(editorWrap, {
          value: rawCode,
          mode: cmMode,
          theme: 'dracula',
          lineNumbers: true,
          tabSize: 2,
          indentWithTabs: false,
          lineWrapping: false,
          autofocus: true,
        });
        cb._cmEditor.setSize('100%', null);
      }
    } else {
      /* EXIT EDIT MODE — update view with edited code */
      const newCode = cb._cmEditor ? cb._cmEditor.getValue() : rawCode;
      codeView.style.display = 'block';
      editorWrap.style.display = 'none';
      editFooter.classList.remove('visible');
      this.classList.remove('edit-active');
      this.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit`;

      /* Re-render highlight with updated code */
      const codeEl = codeView.querySelector('code');
      if (codeEl) {
        codeEl.textContent = newCode;
        hljs.highlightElement(codeEl);
      }
      /* Update raw data */
      cb.dataset.raw = newCode;
    }
  });

  /* --- Apply button (inside edit footer) --- */
  cb.querySelector('.cb-apply')?.addEventListener('click', () => {
    const editBtn = cb.querySelector('.cb-edit');
    if (editBtn) editBtn.click(); // re-use exit logic
    toast('Code updated!', 'success');
  });

  /* --- Preview Design btn --- */
  if (canPreview) {
    cb.querySelector('.cb-preview')?.addEventListener('click', () => {
      const code = cb._cmEditor ? cb._cmEditor.getValue() : rawCode;
      S.previewCode = code;
      S.previewLang = lang;
      openPreviewModal(code, lang);
    });
  }
}

/* ════════════════════════════════════════
   MARKDOWN → HTML (custom renderer)
══════════════════════════════════════════ */
function parseMarkdown(text) {
  marked.setOptions({ breaks: true, gfm: true });

  const renderer = new marked.Renderer();
  let blockIdx = 0;

  renderer.code = function(codeObj) {
    const raw  = typeof codeObj === 'object' ? (codeObj.text || '') : codeObj;
    const lang = ((typeof codeObj === 'object' ? codeObj.lang : null) || 'plaintext').toLowerCase();
    const idx  = blockIdx++;
    const canPreview = PREVIEWABLE.has(lang);
    const dotColor   = LANG_COLORS[lang] || LANG_COLORS.default;
    const displayLang = lang.toUpperCase();
    const escaped = escHtml(raw);
    const lineCount = raw.split('\n').length;

    return `
      <div class="code-block" id="cb-${idx}" data-lang="${escHtml(lang)}" data-raw="${escaped.replace(/"/g,'&quot;')}">
        <div class="cb-header">
          <div class="cb-header-left">
            <div class="cb-lang-tab">
              <span class="lang-dot" style="background:${dotColor};box-shadow:0 0 5px ${dotColor}66"></span>
              ${displayLang}
              <span class="cb-num-badge">${lineCount} lines</span>
            </div>
          </div>
          <div class="cb-actions">
            ${canPreview ? `
            <button class="cb-btn cb-btn-preview cb-preview">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              Preview Design
            </button>` : ''}
            <button class="cb-btn cb-edit">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit
            </button>
            <button class="cb-btn cb-copy">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy
            </button>
          </div>
        </div>

        <!-- Read-only highlight view -->
        <div class="cb-code-view">
          <pre><code class="language-${escHtml(lang)}">${escaped}</code></pre>
        </div>

        <!-- CodeMirror edit view (lazy init) -->
        <div class="cb-editor-wrap" style="display:none"></div>

        <!-- Edit footer -->
        <div class="cb-edit-footer">
          <span style="font-family:JetBrains Mono,monospace;font-size:10px;color:#3d4468">
            ✎ Editing ${displayLang}
          </span>
          <div style="display:flex;gap:6px">
            <button class="cb-btn cb-edit" style="color:#f87171">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              Cancel
            </button>
            <button class="cb-btn cb-apply" style="color:#34d399;border-color:rgba(52,211,153,.25)">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              Apply
            </button>
          </div>
        </div>
      </div>
    `;
  };

  return marked.parse(text, { renderer });
}

/* ════════════════════════════════════════
   TYPING INDICATOR
══════════════════════════════════════════ */
function showTyping() {
  const m = S.model;
  const d = document.createElement('div');
  d.className = 'typing-wrap'; d.id = 'typing';
  d.innerHTML = `
    <div class="ai-avatar">
      <image src="ui/logo.png" alt="CODEMESH Logo" class="w-6 h-6">
    </div>
    <div class="ai-content">
      <div class="model-tag"><span style="color:${m.color}">${m.name}</span></div>
      <div class="typing-dots"><span></span><span></span><span></span></div>
    </div>`;
  D.msgs.appendChild(d);
  scrollBottom();
  return d;
}

/* ════════════════════════════════════════
   PREVIEW MODAL
══════════════════════════════════════════ */
function openPreviewModal(code, lang) {
  D.previewModal.classList.remove('hidden');
  D.previewLangBadge.textContent = lang.toUpperCase();
  setPreviewContent(code, lang);
  document.querySelectorAll('.viewport-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.viewport-btn[data-w="100%"]')?.classList.add('active');
  D.previewFBx.style.width = '100%';
}

function setPreviewContent(code, lang) {
  let html = '';
  if (lang === 'html') {
    html = code;
  } else if (lang === 'css') {
    html = `<!DOCTYPE html><html><head><style>${code}</style></head><body><p style="padding:20px;color:#444;font-family:system-ui">CSS preview — add HTML to see styled elements</p></body></html>`;
  } else if (lang === 'javascript' || lang === 'js') {
    html = `<!DOCTYPE html><html><head><style>body{font-family:system-ui;padding:20px;background:#f8fafc;color:#1e293b}</style></head><body><pre id="out" style="background:#1e293b;color:#94d68b;padding:16px;border-radius:8px;font-size:13px;overflow:auto"></pre><script>
      const _log=console.log;const _err=console.error;const _warn=console.warn;
      const pre=document.getElementById('out');
      function fmt(args){return args.map(a=>typeof a==='object'?JSON.stringify(a,null,2):String(a)).join(' ')}
      console.log=(...a)=>{pre.textContent+=fmt(a)+'\\n';_log(...a)};
      console.error=(...a)=>{pre.textContent+='[ERR] '+fmt(a)+'\\n';_err(...a)};
      console.warn=(...a)=>{pre.textContent+='[WARN] '+fmt(a)+'\\n';_warn(...a)};
      try{${code}}catch(e){pre.textContent+='[EXCEPTION] '+e.message}</script></body></html>`;
  } else if (lang === 'svg') {
    html = `<!DOCTYPE html><html><head><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8fafc}</style></head><body>${code}</body></html>`;
  }
  D.previewFrame.srcdoc = html;
}

function closePreviewModal() {
  D.previewModal.classList.add('hidden');
  D.previewFrame.srcdoc = '';
}

function openPreviewInTab() {
  const blob = new Blob([D.previewFrame.srcdoc], { type:'text/html' });
  const url  = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/* ════════════════════════════════════════
   ERROR RENDER
══════════════════════════════════════════ */
function renderError(msg) {
  const d = document.createElement('div');
  d.className = 'error-bubble';
  d.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>${escHtml(msg)}</span>`;
  D.msgs.appendChild(d);
  scrollBottom();
}

/* ════════════════════════════════════════
   CHAT HISTORY
══════════════════════════════════════════ */
function newChat() {
  if (S.messages.length) saveSession();
  S.messages = [];
  S.sessionId = Date.now();
  D.msgs.innerHTML = '';
  D.msgs.classList.add('hidden');
  D.welcome.classList.remove('hidden');
}

function saveSession() {
  persistActiveSession();
  renderHistory(S.history);
}

function persistActiveSession() {
  if (!S.messages.length) return;
  const title = S.messages[0]?.content?.slice(0, 42) || 'Chat';
  const sess  = { id:S.sessionId, title, messages:[...S.messages], model:S.model.id, ts:Date.now() };
  const idx   = S.history.findIndex(s => s.id === S.sessionId);
  if (idx >= 0) S.history[idx] = sess; else S.history.unshift(sess);
  S.history = S.history.slice(0, 30);
  try {
    localStorage.setItem('codemesh_hist', JSON.stringify(S.history));
  } catch(e) {
    // Ignore storage quota/private mode failures and keep app usable.
  }
}

function loadHistory() {
  try {
    const d = localStorage.getItem('codemesh_hist');
    if (d) { S.history = JSON.parse(d); renderHistory(S.history); }
  } catch(e) {}
}

function renderHistory(list) {
  D.chatHistory.innerHTML = '';
  list.forEach(sess => {
    const div = document.createElement('div');
    div.className = 'history-item' + (sess.id === S.sessionId ? ' active' : '');
    div.innerHTML = `
      <span class="text-xs truncate flex-1" style="color:var(--txt1)">${escHtml(sess.title)}</span>
      <button class="del-sess opacity-0 group-hover:opacity-100 ml-1 p-0.5 hover:text-red-400 transition-all" data-id="${sess.id}" style="flex-shrink:0">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>`;
    div.addEventListener('mouseenter', () => div.querySelector('.del-sess')?.style.setProperty('opacity','1'));
    div.addEventListener('mouseleave', () => div.querySelector('.del-sess')?.style.setProperty('opacity','0'));
    div.addEventListener('click', e => { if (!e.target.closest('.del-sess')) loadSession(sess); });
    div.querySelector('.del-sess')?.addEventListener('click', e => { e.stopPropagation(); deleteSess(sess.id); });
    D.chatHistory.appendChild(div);
  });
}

function filterHistory(q) {
  const filtered = q ? S.history.filter(s => s.title.toLowerCase().includes(q.toLowerCase())) : S.history;
  renderHistory(filtered);
}

function loadSession(sess) {
  S.messages  = [...sess.messages];
  S.sessionId = sess.id;
  const m     = MODELS.find(x => x.id === sess.model) || MODELS[0];
  setModel(m, false);
  D.msgs.innerHTML = '';
  showChatArea();
  sess.messages.forEach(m => renderMsg(m));
  renderHistory(S.history);
}

function deleteSess(id) {
  S.history = S.history.filter(s => s.id !== id);
  localStorage.setItem('codemesh_hist', JSON.stringify(S.history));
  renderHistory(S.history);
  if (S.sessionId === id) newChat();
}

function clearHistory() {
  if (!confirm('Delete all chat history?')) return;
  S.history = [];
  localStorage.removeItem('codemesh_hist');
  renderHistory([]);
  newChat();
  toast('History cleared', 'success');
}

/* ════════════════════════════════════════
   API KEY MODAL
══════════════════════════════════════════ */
function updateApiStatus() {
  const connected = !!S.apiKey;
  D.apiKeyStatus.style.background = connected ? '#34d399' : '#f87171';
  D.apiKeyStatus.title = connected ? 'API key set' : 'No API key';
}
function openApiModal()  { D.apiModal.classList.remove('hidden'); D.apiInput.focus(); }
function closeApiModal() { D.apiModal.classList.add('hidden'); }
function saveApiKey() {
  const k = D.apiInput.value.trim();
  if (!k) { toast('Enter a valid API key', 'error'); return; }
  S.apiKey = k;
  localStorage.setItem('codemesh_key', k);
  updateApiStatus();
  closeApiModal();
  toast('API key saved ✓', 'success');
}
function toggleKeyVis() {
  const i = D.apiInput;
  i.type = i.type === 'password' ? 'text' : 'password';
}

/* ════════════════════════════════════════
   VOICE INPUT
══════════════════════════════════════════ */
function handleVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { toast('Voice not supported in this browser', 'error'); return; }
  const r = new SR();
  r.lang = 'en-US'; r.interimResults = false;
  D.voiceBtn.style.color = '#06b6d4';
  toast('Listening… speak now', 'info');
  r.start();
  r.onresult = e => { D.msgInput.value = e.results[0][0].transcript; autoResize(); D.voiceBtn.style.color = ''; };
  r.onerror  = ()  => { D.voiceBtn.style.color = ''; toast('Voice input failed', 'error'); };
  r.onend    = ()  => { D.voiceBtn.style.color = ''; };
}

/* ════════════════════════════════════════
   UTILITIES
══════════════════════════════════════════ */
function scrollBottom() {
  requestAnimationFrame(() => { D.chatScroll.scrollTop = D.chatScroll.scrollHeight; });
}

function escHtml(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function copyText(t) {
  navigator.clipboard?.writeText(t).catch(() => {
    const a = document.createElement('textarea');
    a.value = t; a.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove();
  });
}

/* ── Toast ── */
let _toastT;
function toast(msg, type='default') {
  const icons = {
    success:`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:  `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    info:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
    default:`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8891b8" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
  };
  D.toast.innerHTML = (icons[type]||icons.default) + escHtml(msg);
  D.toast.className = `toast ${type}`;
  clearTimeout(_toastT);
  requestAnimationFrame(() => {
    D.toast.classList.add('show');
    _toastT = setTimeout(() => D.toast.classList.remove('show'), 3200);
  });
}

/* ════════════════════════════════════════
   BOOT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', init);