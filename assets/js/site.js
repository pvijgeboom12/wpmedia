/* Waterproofmedia — shared behaviour: nav, reveal, contact form, assistant. */
(function () {
  var doc = document.documentElement;
  doc.classList.add('js');
  var LANG = (doc.lang || 'nl').slice(0, 2);
  var T = {
    nl: {
      sending: 'Versturen…', send: 'Verstuur je bericht',
      required: 'Vul je naam, e-mailadres en een korte vraag in.',
      failed: 'Versturen lukte niet. Mail ons direct op info@waterproofmedia.com, dan reageren we net zo snel.',
      agentTitle: 'Growth-assistent', agentSub: 'AI-assistent · antwoordt namens Waterproofmedia',
      hello: 'Hoi! Ik beantwoord vragen over onze diensten, cases en producten. Waar ben je naar op zoek?',
      quick: ['Ik wil een campagne starten', 'Wat kost een traject?', 'Wat is de Growth Scan?', 'Ik wil een gesprek plannen'],
      placeholder: 'Typ je vraag…', typing: 'Aan het typen…',
      agentErr: 'Er ging iets mis. Je kunt ons altijd mailen op info@waterproofmedia.com of direct een gesprek plannen via /nl/contact/.',
      foot: 'AI kan fouten maken. Afspraken maak je altijd met een mens.', open: 'Stel je vraag', close: 'Sluiten'
    },
    en: {
      sending: 'Sending…', send: 'Send your message',
      required: 'Please add your name, email and a short question.',
      failed: 'Sending failed. Email us directly at info@waterproofmedia.com and we will reply just as fast.',
      agentTitle: 'Growth assistant', agentSub: 'AI assistant · answers on behalf of Waterproofmedia',
      hello: 'Hi! I answer questions about our services, cases and products. What are you looking for?',
      quick: ['I want to start a campaign', 'What does a project cost?', 'What is the Growth Scan?', 'I want to book a call'],
      placeholder: 'Type your question…', typing: 'Typing…',
      agentErr: 'Something went wrong. You can always email info@waterproofmedia.com or book a call via /en/contact/.',
      foot: 'AI can make mistakes. Agreements are always made with a human.', open: 'Ask a question', close: 'Close'
    }
  }[LANG] || null;
  var t = T || {};

  function track(name, params) { try { if (window.gtag) gtag('event', name, params || {}); } catch (e) {} }

  /* Nav */
  var nav = document.getElementById('nav');
  if (nav) addEventListener('scroll', function () { nav.classList.toggle('scrolled', scrollY > 12); }, { passive: true });
  var mb = document.getElementById('menuBtn'), mm = document.getElementById('mobileMenu');
  if (mb && mm) {
    mb.addEventListener('click', function () {
      var o = mm.classList.toggle('open');
      mb.setAttribute('aria-expanded', o ? 'true' : 'false');
      mb.innerHTML = o ? '&times;' : '&#9776;';
    });
    mm.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { mm.classList.remove('open'); mb.setAttribute('aria-expanded', 'false'); mb.innerHTML = '&#9776;'; }); });
  }

  /* Reveal (content is visible without JS; this only adds motion) */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: .08, rootMargin: '0px 0px -5% 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
    setTimeout(function () { document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); }); }, 2500);
  } else { document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); }); }

  /* Track primary CTAs */
  document.querySelectorAll('[data-track]').forEach(function (el) {
    el.addEventListener('click', function () { track(el.getAttribute('data-track'), { lang: LANG }); });
  });

  /* Prefill contact form from ?topic= */
  var form = document.getElementById('contactForm');
  if (form) {
    var topic = new URLSearchParams(location.search).get('topic');
    if (topic) { var r = form.querySelector('input[name=topic][value="' + topic + '"]'); if (r) r.checked = true; }
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var msg = document.getElementById('formMsg'), btn = form.querySelector('button[type=submit]');
      var fd = new FormData(form), data = {};
      fd.forEach(function (v, k) { data[k] = v; });
      data.lang = LANG; data.page = location.pathname;
      if (!data.name || !data.email || !data.message) { msg.textContent = t.required; msg.className = 'form-msg err'; return; }
      btn.disabled = true; btn.textContent = t.sending; msg.textContent = '';
      fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok || !res.j.ok) throw new Error('x');
          track('generate_lead', { method: 'contact_form', topic: data.topic || '', lang: LANG });
          form.hidden = true; document.getElementById('formDone').classList.add('show');
          document.getElementById('formDone').focus();
        })
        .catch(function () { msg.textContent = t.failed; msg.className = 'form-msg err'; btn.disabled = false; btn.textContent = t.send; });
    });
  }

  /* Assistant */
  if (!T || document.body.hasAttribute('data-no-agent')) return;
  var history = [], busy = false;
  var fab = document.createElement('button');
  fab.className = 'agent-fab'; fab.type = 'button'; fab.setAttribute('aria-haspopup', 'dialog');
  fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg><span>' + t.open + '</span>';
  fab.setAttribute('aria-label', t.open);
  var box = document.createElement('div');
  box.className = 'agent'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', t.agentTitle);
  box.innerHTML = '<div class="agent-head"><div><b>' + t.agentTitle + '</b><small>' + t.agentSub + '</small></div><button type="button" aria-label="' + t.close + '">&times;</button></div>' +
    '<div class="agent-log" aria-live="polite"></div><div class="agent-quick"></div>' +
    '<form class="agent-form"><input type="text" maxlength="600" autocomplete="off" aria-label="' + t.placeholder + '" placeholder="' + t.placeholder + '"><button type="submit" aria-label="Send">&rarr;</button></form>' +
    '<div class="agent-foot">' + t.foot + '</div>';
  document.body.appendChild(fab); document.body.appendChild(box);
  var log = box.querySelector('.agent-log'), quick = box.querySelector('.agent-quick'), inp = box.querySelector('input');

  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function linkify(s) {
    return esc(s).replace(/(https:\/\/[^\s<)]+|\/(?:nl|en)\/[a-z0-9\-\/#?=]*)/g, function (u) {
      var ext = u.indexOf('http') === 0 && u.indexOf('waterproofmedia.com') < 0;
      return '<a href="' + u + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + u + '</a>';
    });
  }
  function add(role, text) { var d = document.createElement('div'); d.className = 'msg ' + role; d.innerHTML = role === 'bot' ? linkify(text) : esc(text); log.appendChild(d); log.scrollTop = log.scrollHeight; return d; }
  function openBox() {
    box.classList.add('open'); fab.style.display = 'none';
    if (!log.children.length) {
      add('bot', t.hello);
      t.quick.forEach(function (q) { var b = document.createElement('button'); b.type = 'button'; b.textContent = q; b.onclick = function () { ask(q); }; quick.appendChild(b); });
      track('agent_open', { lang: LANG });
    }
    inp.focus();
  }
  function closeBox() { box.classList.remove('open'); fab.style.display = ''; fab.focus(); }
  function ask(q) {
    q = (q || '').trim(); if (!q || busy) return;
    quick.innerHTML = ''; add('me', q); history.push({ role: 'user', content: q }); inp.value = '';
    busy = true; var ty = add('bot typing', t.typing);
    fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history.slice(-12), lang: LANG, page: location.pathname }) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        ty.remove(); if (!j.reply) throw new Error('x');
        add('bot', j.reply); history.push({ role: 'assistant', content: j.reply });
        if (j.lead) track('generate_lead', { method: 'assistant', lang: LANG });
      })
      .catch(function () { ty.remove(); add('bot', t.agentErr); })
      .then(function () { busy = false; });
  }
  fab.addEventListener('click', openBox);
  box.querySelector('.agent-head button').addEventListener('click', closeBox);
  box.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeBox(); });
  box.querySelector('form').addEventListener('submit', function (e) { e.preventDefault(); ask(inp.value); });
  document.querySelectorAll('[data-open-agent]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); openBox(); }); });
})();
