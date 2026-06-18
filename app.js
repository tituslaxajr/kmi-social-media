/* ============================================================
   Content Studio — Kapatid Ministry
   Vanilla-JS implementation of the Claude Design component
   "Content Studio.dc.html". Faithfully ports the DCLogic
   state machine, the 7 post templates, the editor panel,
   caption tools, dark mode and PNG export.
   ============================================================ */
(function () {
  'use strict';

  // ---- Team credentials -----------------------------------------------
  // Add or remove team members here. Passwords are case-sensitive.
  const TEAM = {
    'titus':   'kmi-admin',
    'team':    'kmi-team'
  };

  const SESSION_KEY = 'kmi_auth';

  function isAuthed() {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  }

  function renderLogin(errorMsg) {
    document.body.style.background = 'var(--kapatid-blue)';
    document.getElementById('root').innerHTML = `
      <div class="login-wrap">
        <div class="login-card">
          <img src="assets/logo-transparent.png" class="login-logo" alt="Kapatid Ministry">
          <h1 class="login-title">Content Studio</h1>
          <p class="login-sub">Team access only</p>
          ${errorMsg ? `<p class="login-error">${errorMsg}</p>` : ''}
          <form id="loginForm" class="login-form">
            <input id="loginUser" type="text" placeholder="Username" autocomplete="username" required>
            <input id="loginPass" type="password" placeholder="Password" autocomplete="current-password" required>
            <button type="submit">Sign in</button>
          </form>
        </div>
      </div>
    `;
    document.getElementById('loginForm').addEventListener('submit', function (e) {
      e.preventDefault();
      const user = document.getElementById('loginUser').value.trim().toLowerCase();
      const pass = document.getElementById('loginPass').value;
      if (TEAM[user] && TEAM[user] === pass) {
        sessionStorage.setItem(SESSION_KEY, '1');
        document.body.style.background = '';
        startApp();
      } else {
        renderLogin('Incorrect username or password.');
      }
    });
  }

  // ---- Static config (ported from the design) -------------------------
  const TEMPLATES = [
    { id: 'verse',    name: 'Scripture verse',  desc: 'Brush-field verse card',     dot: '#df983f' },
    { id: 'birthday', name: 'Birthday greeting', desc: 'Celebrant photo + blessing', dot: '#c82f4d' },
    { id: 'prayer',   name: 'Prayer focus',     desc: 'Weekly prayer request',      dot: '#3846b2' },
    { id: 'event',    name: 'Event / campaign', desc: 'Invitation with details',    dot: '#c94d45' },
    { id: 'stat',     name: 'Impact stat',      desc: 'A number that matters',      dot: '#283891' },
    { id: 'story',    name: 'Story highlight',  desc: 'Photo + testimony',          dot: '#0b3a5c' },
    { id: 'testimony',name: 'Testimony',        desc: 'A member’s words of faith',  dot: '#7e6c61' },
    { id: 'feeding',  name: 'Feeding Ministry', desc: 'Feeding site title card',    dot: '#1f8a5b' }
  ];

  const BG_KEYS = ['blue', 'red', 'gold', 'coral', 'navy', 'cream'];
  const BG = { blue: 'var(--surface-blue)', red: 'var(--surface-red)', gold: 'var(--surface-gold)', coral: 'var(--kapatid-coral)', navy: 'var(--kapatid-navy)', cream: 'var(--paper)' };
  const BG_SWATCH = { blue: '#3846b2', red: '#c82f4d', gold: '#df983f', coral: '#c94d45', navy: '#0b3a5c', cream: '#f8f3e9' };
  const BG_RGB = { blue: '56,70,178', red: '200,47,77', gold: '223,152,63', coral: '201,77,69', navy: '11,58,92', cream: '248,243,233' };
  const SIZES = [{ label: 'S', v: 0.85 }, { label: 'M', v: 1 }, { label: 'L', v: 1.15 }, { label: 'XL', v: 1.32 }];

  const PHOTOS = [
    { src: 'assets/photo-youth-camp.svg', label: 'Youth camp' },
    { src: 'assets/photo-childrens-ministry.svg', label: 'Children' },
    { src: 'assets/photo-feeding-program.svg', label: 'Feeding' },
    { src: 'assets/photo-prayer-discipleship.svg', label: 'Prayer' },
    { src: 'assets/photo-team-fellowship.svg', label: 'Fellowship' },
    { src: 'assets/photo-outreach-distribution.svg', label: 'Outreach' },
    { src: 'assets/photo-youth-camp-huddle.svg', label: 'Huddle' }
  ];

  // ---- State -----------------------------------------------------------
  const state = {
    active: 'verse',
    format: 'square',
    copied: false,
    exporting: false,
    dark: false,
    uploads: [],
    data: {
      verse: {
        bg: 'gold', fontScale: 1,
        headline: 'But grow in grace,',
        body: 'and in the knowledge of our Lord and Saviour Jesus Christ. To Him be glory both now and forever. Amen.',
        reference: '2 Peter 3:18',
        caption: '"But grow in grace, and in the knowledge of our Lord and Saviour Jesus Christ." — 2 Peter 3:18\n\nMay we never stop growing in Him, Kapatid. 🌱\n\n#KapatidMinistry #FaithInChrist #GrowInGrace #VerseOfTheDay'
      },
      birthday: {
        bg: 'red', fontScale: 1, style: 'classic',
        name: 'Carlo Enriquez',
        photo: 'assets/photo-youth-camp.svg',
        verse: 'May He give you the desire of your heart and make all your plans succeed.',
        reference: 'Psalm 20:4',
        caption: 'Happy birthday, Carlo! 🎉\n\nFrom your Kapatid Ministry family — we thank God for your life and pray His blessing over this new year.\n\n"May He give you the desire of your heart and make all your plans succeed." — Psalm 20:4\n\n#KapatidMinistry #HappyBirthday #Blessed'
      },
      prayer: {
        bg: 'blue', fontScale: 1,
        tag: 'Feeding Program',
        request: 'Pray for the families in our weekly feeding program — for daily provision, good health, and hearts open to the Gospel.',
        photo: '',
        caption: 'Will you pray with us this week, Kapatid?\n\nWe lift up the families in our feeding program — for provision, health, and open hearts.\n\n"Pray without ceasing." — 1 Thessalonians 5:17\n\n#KapatidMinistry #PrayerFocus #PrayWithUs'
      },
      event: {
        bg: 'coral', fontScale: 1,
        title: 'Rooted & Built Up',
        subtitle: 'Community Youth Camp',
        date: 'Sat, July 19, 2026',
        time: '8:00 AM',
        location: 'Covenant Church, Caloocan City',
        cta: 'Register at kapatidministry.org',
        caption: 'You’re invited! 🌿 Join us for Rooted & Built Up — our Community Youth Camp.\n\n🗓 Sat, July 19 · 8:00 AM\n📍 Covenant Church, Caloocan City\n\nRegister at kapatidministry.org\n\n#KapatidMinistry #RootedAndBuiltUp #YouthCamp'
      },
      stat: {
        bg: 'cream', fontScale: 1,
        value: '384',
        label: 'children fed every week through our community feeding program',
        context: 'Statistics for year 2024',
        photo: '',
        caption: 'By God’s grace, 384 children were fed every week in 2024. 🙏\n\nThank you for partnering with us to nourish bodies and share the hope of Christ.\n\n#KapatidMinistry #TransformingCommunities #OneFamilyAtATime'
      },
      story: {
        bg: 'navy', fontScale: 1,
        photo: 'assets/photo-childrens-ministry.svg',
        name: 'Abegail',
        quote: 'Sponsored for 9 years — today she helps lead the very children’s ministry that first welcomed her.',
        caption: 'From sponsored child to servant leader. ✨\n\nAbegail was sponsored for 9 years. Today she helps lead the children’s ministry that first welcomed her — faith, made fruitful.\n\n#KapatidMinistry #Stories #FruitfulThroughChrist'
      },
      testimony: {
        bg: 'blue', fontScale: 1,
        photo: 'assets/photo-team-fellowship.svg',
        name: 'Marites Bautista',
        role: 'Feeding program parent',
        quote: 'I first came only for a meal for my children. I stayed because, for the first time, I felt the love of Christ through people who knew my name.',
        reference: '2 Corinthians 5:17',
        caption: '“I first came only for a meal. I stayed because I felt the love of Christ through people who knew my name.” — Marites\n\nEvery week, God writes new stories of hope through this family. 🩷\n\n“If anyone is in Christ, the new creation has come.” — 2 Corinthians 5:17\n\n#KapatidMinistry #Testimony #FaithfulAndFruitful'
      },
      feeding: {
        bg: 'navy', fontScale: 1,
        photo: 'assets/photo-feeding-program.svg',
        area: 'Bagong Silang Feeding Site',
        location: 'Bagong Silang, Caloocan City',
        date: 'June 17, 2026',
        count: '48 children',
        caption: 'Feeding Ministry — Bagong Silang\n\nEvery week, we gather to share a meal and the Word of God with the families of Bagong Silang.\n\n“He gives food to every creature. His love endures forever.” — Psalm 136:25\n\nSwipe to see the faces behind these numbers. 🩷\n\n#KapatidMinistry #FeedingMinistry #BagongSilang #TransformingCommunities'
      }
    }
  };

  let uploadKey = null;
  let copyTimer = null;

  // ---- Helpers ---------------------------------------------------------
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function attr(s) { return esc(s); }

  function setState(patch) { Object.assign(state, patch); render(); }
  function setField(key, val) {
    const a = state.active;
    state.data[a] = Object.assign({}, state.data[a], { [key]: val });
    render();
  }
  function selectTemplate(id) { state.active = id; state.copied = false; render(); }
  function setFormat(fmt) { state.format = fmt; render(); }
  function toggleDark() { state.dark = !state.dark; render(); }
  function isLight() { return state.data[state.active].bg === 'cream'; }

  function copyCaption() {
    const cap = state.data[state.active].caption || '';
    try { navigator.clipboard && navigator.clipboard.writeText(cap); } catch (e) {}
    state.copied = true; render();
    clearTimeout(copyTimer);
    copyTimer = setTimeout(function () { state.copied = false; render(); }, 1800);
  }

  function openUpload(key) {
    uploadKey = key;
    const inp = document.getElementById('fileInput');
    if (inp) inp.click();
  }
  function onUploadFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      const url = reader.result;
      state.uploads = state.uploads.concat([{ src: url, label: 'Uploaded' }]);
      setField(uploadKey, url);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function download() {
    const node = document.getElementById('card');
    if (!node || !window.htmlToImage) return;
    state.exporting = true; render();
    const ratio = 1080 / (state.format === 'square' ? 460 : 432);
    try {
      const url = await window.htmlToImage.toPng(node, { pixelRatio: ratio, cacheBust: true });
      const a = document.createElement('a');
      a.href = url;
      a.download = 'kapatid-' + state.active + '-' + state.format + '.png';
      a.click();
    } catch (err) { console.error('export failed', err); }
    state.exporting = false; render();
  }

  // ---- Computed values (renderVals) -----------------------------------
  function vals() {
    const a = state.active;
    const d = state.data[a];
    const fmt = state.format;
    const light = d.bg === 'cream';
    const ink = light ? 'var(--ink-900)' : 'var(--white)';
    const rgb = BG_RGB[d.bg] || BG_RGB.navy;
    const storyOverlay = 'linear-gradient(to top, rgba(' + rgb + ',.96) 16%, rgba(' + rgb + ',.55) 48%, rgba(' + rgb + ',.12) 78%)';
    return {
      a: a, d: d, fmt: fmt, light: light, ink: ink,
      storyOverlay: storyOverlay,
      bgColor: BG[d.bg] || BG.blue,
      logoFilter: light ? 'none' : 'brightness(0) invert(1)',
      ctaBg: light ? 'var(--ink-900)' : 'var(--white)',
      ctaText: light ? 'var(--white)' : 'var(--ink-900)',
      statNumber: light ? 'var(--kapatid-blue)' : 'var(--white)'
    };
  }

  function getCrop(d, key) {
    const c = d[key + '_crop'];
    return c || { x: 50, y: 50, zoom: 1 };
  }

  function photoHTML(photo, crop) {
    const x = crop.x, y = crop.y, z = crop.zoom || 1;
    const inner = 'position:absolute; inset:0; ' +
      'background-image:' + (photo ? 'url(\'' + attr(photo) + '\')' : 'none') + '; ' +
      'background-size:cover; background-position:' + x + '% ' + y + '%; ' +
      'transform-origin:' + x + '% ' + y + '%; transform:scale(' + z + ');';
    return '<div style="position:absolute; inset:0; overflow:hidden;"><div style="' + inner + '"></div></div>';
  }

  // ---- Template cards --------------------------------------------------
  function cardVerse(v) {
    const d = v.d;
    return '' +
    '<div style="position:absolute; inset:0; background:' + v.bgColor + '; color:' + v.ink + '; display:flex; flex-direction:column; justify-content:center; padding:9cqw;">' +
      '<div style="position:absolute; inset:0; background:repeating-linear-gradient(115deg, rgba(255,255,255,.05) 0 6px, rgba(0,0,0,.04) 6px 13px); mix-blend-mode:soft-light; pointer-events:none;"></div>' +
      '<div style="position:relative;">' +
        '<div style="font-size:14px; letter-spacing:0.28em; text-transform:uppercase; font-weight:700; opacity:.8; margin-bottom:5cqw;">Verse of the day</div>' +
        '<h2 style="margin:0; font-family:var(--font-display); font-weight:800; font-size:calc(10.5cqw * var(--fs)); line-height:1.02; letter-spacing:-0.01em;">' + esc(d.headline) + '</h2>' +
        '<p style="margin:4cqw 0 0; font-weight:300; font-size:calc(4.6cqw * var(--fs)); line-height:1.32; max-width:28ch;">' + esc(d.body) + '</p>' +
        '<div style="margin-top:6cqw; font-weight:700; font-size:calc(3.4cqw * var(--fs)); letter-spacing:0.2em; text-transform:uppercase; opacity:.92;">' + esc(d.reference) + '</div>' +
      '</div>' +
      logoImg('right:6cqw; bottom:6cqw; width:12cqw;', v.logoFilter, '.92') +
    '</div>';
  }

  function cardBirthday(v) {
    const d = v.d;
    const bCrop = getCrop(d, 'photo');
    if (d.style === 'festive') {
      return '' +
      '<div style="position:absolute; inset:0; background:' + v.bgColor + '; color:' + v.ink + '; overflow:hidden;">' +
        '<div style="position:absolute; inset:0; pointer-events:none;">' +
          conf('left:7%; top:11%; width:3.4cqw; height:3.4cqw; background:var(--kapatid-gold); border-radius:2px; transform:rotate(24deg);') +
          conf('left:15%; top:27%; width:2.8cqw; height:2.8cqw; background:var(--white); border-radius:50%;') +
          conf('left:9%; top:55%; width:3.2cqw; height:1.4cqw; background:var(--coral-bright); border-radius:2px; transform:rotate(-18deg);') +
          conf('left:17%; top:78%; width:2.6cqw; height:2.6cqw; background:var(--kapatid-gold); border-radius:50%;') +
          conf('left:33%; top:91%; width:3.4cqw; height:1.5cqw; background:var(--white); border-radius:2px; transform:rotate(12deg);') +
          conf('left:46%; top:5%; width:3cqw; height:1.4cqw; background:var(--kapatid-gold); border-radius:2px; transform:rotate(18deg);') +
          conf('right:8%; top:13%; width:3cqw; height:3cqw; background:var(--coral-bright); border-radius:50%;') +
          conf('right:14%; top:30%; width:3.4cqw; height:1.5cqw; background:var(--kapatid-gold); border-radius:2px; transform:rotate(-22deg);') +
          conf('right:8%; top:56%; width:3.2cqw; height:1.5cqw; background:var(--white); border-radius:2px; transform:rotate(14deg);') +
          conf('right:16%; top:77%; width:2.6cqw; height:2.6cqw; background:var(--kapatid-gold); border-radius:50%;') +
          conf('right:31%; top:91%; width:3.2cqw; height:1.5cqw; background:var(--coral-bright); border-radius:2px; transform:rotate(-8deg);') +
          conf('right:40%; top:7%; width:2.6cqw; height:2.6cqw; background:var(--white); border-radius:50%;') +
          '<span style="position:absolute; left:5%; top:6%; font-size:5cqw; line-height:1; color:var(--kapatid-gold); font-weight:800; opacity:.85;">✳</span>' +
          '<span style="position:absolute; right:5%; top:9%; font-size:4cqw; line-height:1; color:rgba(255,255,255,.65); font-weight:800;">✳</span>' +
        '</div>' +
        '<div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:6cqw 8cqw; text-align:center; gap:2.4cqw;">' +
          '<div style="width:32cqw; height:32cqw; border-radius:50%; border:1.2cqw solid var(--white); box-shadow:0 0 0 0.8cqw var(--kapatid-gold), 0 10px 24px -8px rgba(0,0,0,.45); flex:0 0 auto; overflow:hidden; position:relative;">' +
            '<div style="position:absolute; inset:0; background-image:url(\'' + attr(d.photo) + '\'); background-size:cover; background-position:' + bCrop.x + '% ' + bCrop.y + '%; transform-origin:' + bCrop.x + '% ' + bCrop.y + '%; transform:scale(' + (bCrop.zoom || 1) + ');"></div>' +
          '</div>' +
          '<div style="font-family:var(--font-display); font-weight:800; font-size:calc(8.5cqw * var(--fs)); line-height:.92; letter-spacing:-0.01em; transform:rotate(-1.5deg);">HAPPY <span style="color:var(--kapatid-gold);">BIRTHDAY!</span></div>' +
          '<div style="display:inline-block; transform:rotate(-2deg); background:var(--kapatid-gold); color:var(--ink-900); font-family:var(--font-display); font-weight:800; font-size:calc(4.4cqw * var(--fs)); padding:1.8cqw 4.5cqw; border-radius:8px; box-shadow:0 6px 16px -6px rgba(0,0,0,.4); max-width:80cqw; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + esc(d.name) + '</div>' +
          '<div style="max-width:30ch;">' +
            '<p style="margin:0; font-style:italic; font-weight:300; font-size:calc(3.2cqw * var(--fs)); line-height:1.35; opacity:.92;">"' + esc(d.verse) + '"</p>' +
            '<div style="margin-top:1.5cqw; font-weight:700; font-size:calc(2.6cqw * var(--fs)); letter-spacing:0.18em; text-transform:uppercase; color:var(--kapatid-gold);">' + esc(d.reference) + '</div>' +
          '</div>' +
        '</div>' +
        logoImg('right:5cqw; bottom:5cqw; width:11cqw;', v.logoFilter, '.92') +
      '</div>';
    }
    if (d.style === 'celebratory') {
      return '' +
      '<div style="position:absolute; inset:0; background:' + v.bgColor + '; color:' + v.ink + '; overflow:hidden;">' +
        '<div style="position:absolute; inset:-20%; background:repeating-conic-gradient(from 0deg at 50% 40%, rgba(255,255,255,.10) 0deg 5deg, transparent 5deg 13deg); pointer-events:none;"></div>' +
        '<div style="position:absolute; inset:0; background:radial-gradient(circle at 50% 40%, rgba(252,176,64,.40), transparent 56%); pointer-events:none;"></div>' +
        '<span style="position:absolute; left:8%; top:9%; width:8.5cqw; height:11cqw; background:var(--kapatid-gold); border-radius:50%; box-shadow:0 8px 16px -8px rgba(0,0,0,.45);"></span>' +
        '<span style="position:absolute; left:12.5%; top:7.5%; width:6.5cqw; height:8.5cqw; background:var(--coral-bright); border-radius:50%; opacity:.92;"></span>' +
        '<span style="position:absolute; right:9%; top:10%; width:7.5cqw; height:9.5cqw; background:var(--white); border-radius:50%; opacity:.85;"></span>' +
        '<div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:7cqw 8cqw; gap:2.6cqw;">' +
          '<div style="font-family:var(--font-script); font-size:calc(8cqw * var(--fs)); line-height:.9; color:var(--kapatid-gold);">Hip hip hooray!</div>' +
          '<div style="width:34cqw; height:34cqw; border-radius:50%; border:1.4cqw solid var(--white); box-shadow:0 0 0 1cqw var(--kapatid-gold), 0 14px 30px -10px rgba(0,0,0,.5); overflow:hidden; position:relative;">' +
            '<div style="position:absolute; inset:0; background-image:url(\'' + attr(d.photo) + '\'); background-size:cover; background-position:' + bCrop.x + '% ' + bCrop.y + '%; transform-origin:' + bCrop.x + '% ' + bCrop.y + '%; transform:scale(' + (bCrop.zoom || 1) + ');"></div>' +
          '</div>' +
          '<div style="font-family:var(--font-display); font-weight:800; font-size:calc(10cqw * var(--fs)); line-height:.9; letter-spacing:-0.02em;">HAPPY BIRTHDAY</div>' +
          '<div style="display:inline-block; background:var(--white); color:var(--kapatid-red); font-family:var(--font-display); font-weight:800; font-size:calc(5cqw * var(--fs)); padding:1.6cqw 5cqw; border-radius:999px; box-shadow:0 8px 18px -8px rgba(0,0,0,.45); max-width:80cqw; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + esc(d.name) + '</div>' +
          '<div style="max-width:30ch; margin-top:1cqw;">' +
            '<p style="margin:0; font-style:italic; font-weight:300; font-size:calc(3.2cqw * var(--fs)); line-height:1.35; opacity:.95;">"' + esc(d.verse) + '"</p>' +
            '<div style="margin-top:1.4cqw; font-weight:700; font-size:calc(2.6cqw * var(--fs)); letter-spacing:0.18em; text-transform:uppercase; color:var(--kapatid-gold);">' + esc(d.reference) + '</div>' +
          '</div>' +
        '</div>' +
        logoImg('right:5cqw; bottom:5cqw; width:11cqw;', v.logoFilter, '.92') +
      '</div>';
    }
    if (d.style === 'cinematic') {
      return '' +
      '<div style="position:absolute; inset:0; background:#000; overflow:hidden;">' +
        '<div style="position:absolute; inset:0; background-image:url(\'' + attr(d.photo) + '\'); background-size:cover; background-position:' + bCrop.x + '% ' + bCrop.y + '%; transform-origin:' + bCrop.x + '% ' + bCrop.y + '%; transform:scale(' + (bCrop.zoom || 1) + ');"></div>' +
        '<div style="position:absolute; inset:0; background:linear-gradient(to top, rgba(0,0,0,.88) 8%, rgba(0,0,0,.12) 46%, rgba(0,0,0,.58) 100%);"></div>' +
        '<div style="position:absolute; inset:0; box-shadow:inset 0 0 26cqw rgba(0,0,0,.6); pointer-events:none;"></div>' +
        '<div style="position:absolute; left:0; right:0; top:0; height:9%; background:#000;"></div>' +
        '<div style="position:absolute; left:0; right:0; bottom:0; height:9%; background:#000;"></div>' +
        '<div style="position:absolute; left:8cqw; right:8cqw; bottom:17cqw; color:var(--white); text-align:center;">' +
          '<div style="font-size:calc(3cqw * var(--fs)); letter-spacing:0.42em; text-transform:uppercase; font-weight:600; opacity:.85;">Happy Birthday</div>' +
          '<div style="margin:2.5cqw 0; font-family:var(--font-display); font-weight:800; font-size:calc(11cqw * var(--fs)); line-height:.95; letter-spacing:-0.01em; text-shadow:0 2px 18px rgba(0,0,0,.55);">' + esc(d.name) + '</div>' +
          '<div style="width:14cqw; height:2px; background:var(--kapatid-gold); margin:0 auto 3cqw;"></div>' +
          '<p style="margin:0 auto; max-width:30ch; font-style:italic; font-weight:300; font-size:calc(3.4cqw * var(--fs)); line-height:1.4; opacity:.92;">"' + esc(d.verse) + '"</p>' +
          '<div style="margin-top:1.6cqw; font-weight:700; font-size:calc(2.6cqw * var(--fs)); letter-spacing:0.2em; text-transform:uppercase; color:var(--kapatid-gold);">' + esc(d.reference) + '</div>' +
        '</div>' +
        logoImg('right:6cqw; bottom:11.5%; width:10cqw;', 'brightness(0) invert(1)', '.9') +
      '</div>';
    }
    if (d.style === 'vintage') {
      return '' +
      '<div style="position:absolute; inset:0; background:var(--paper); color:var(--taupe-800); overflow:hidden;">' +
        '<div style="position:absolute; inset:0; background:radial-gradient(circle at 50% 30%, rgba(255,255,255,.45), transparent 62%), repeating-linear-gradient(0deg, rgba(123,108,97,.035) 0 2px, transparent 2px 4px); pointer-events:none;"></div>' +
        '<div style="position:absolute; inset:4cqw; border:2px solid var(--taupe-500);"></div>' +
        '<div style="position:absolute; inset:5.4cqw; border:1px solid var(--taupe-400);"></div>' +
        '<div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:11cqw 10cqw; gap:2.4cqw;">' +
          '<div style="font-size:5cqw; color:var(--taupe-500); line-height:1;">❦</div>' +
          ornRule() +
          '<div style="font-family:var(--font-script); font-size:calc(9cqw * var(--fs)); line-height:.9; color:var(--kapatid-red);">Happy Birthday</div>' +
          '<div style="width:30cqw; height:30cqw; border-radius:50%; overflow:hidden; position:relative; box-shadow:0 0 0 0.7cqw var(--paper), 0 0 0 1.1cqw var(--taupe-500);">' +
            '<div style="position:absolute; inset:0; background-image:url(\'' + attr(d.photo) + '\'); background-size:cover; background-position:' + bCrop.x + '% ' + bCrop.y + '%; transform-origin:' + bCrop.x + '% ' + bCrop.y + '%; transform:scale(' + (bCrop.zoom || 1) + '); filter:sepia(.5) contrast(.95) brightness(1.02);"></div>' +
          '</div>' +
          '<div style="font-family:var(--font-display); font-weight:800; font-size:calc(7.5cqw * var(--fs)); line-height:1; letter-spacing:0.02em; text-transform:uppercase; color:var(--taupe-800); max-width:80cqw; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + esc(d.name) + '</div>' +
          ornRule() +
          '<p style="margin:0; font-style:italic; font-weight:400; font-size:calc(3.2cqw * var(--fs)); line-height:1.4; max-width:28ch; color:var(--taupe-700);">"' + esc(d.verse) + '"</p>' +
          '<div style="font-weight:700; font-size:calc(2.6cqw * var(--fs)); letter-spacing:0.2em; text-transform:uppercase; color:var(--kapatid-red);">' + esc(d.reference) + '</div>' +
        '</div>' +
        logoImg('right:6.5cqw; bottom:6.5cqw; width:10cqw;', 'none', '.85') +
      '</div>';
    }
    // classic
    return '' +
    '<div style="position:absolute; inset:0; overflow:hidden; display:flex; flex-direction:column;">' +
      '<div style="flex:0 0 52%; position:relative; overflow:hidden;">' +
        '<div style="position:absolute; inset:0; background-image:url(\'' + attr(d.photo) + '\'); background-size:cover; background-position:' + bCrop.x + '% ' + bCrop.y + '%; transform-origin:' + bCrop.x + '% ' + bCrop.y + '%; transform:scale(' + (bCrop.zoom || 1) + ');"></div>' +
      '</div>' +
      '<div style="height:1.2cqw; background:var(--kapatid-gold); flex:0 0 auto;"></div>' +
      '<div style="flex:1 1 auto; min-height:0; background:' + v.bgColor + '; color:' + v.ink + '; display:flex; flex-direction:column; justify-content:center; padding:5cqw 7cqw 7cqw; overflow:hidden;">' +
        '<div style="font-family:var(--font-script); font-size:calc(7.5cqw * var(--fs)); line-height:1.1; color:var(--kapatid-gold);">Happy Birthday</div>' +
        '<div style="font-family:var(--font-display); font-weight:800; font-size:calc(9cqw * var(--fs)); line-height:.92; letter-spacing:-0.01em; margin-top:1.5cqw; padding-right:14cqw;">' + esc(d.name) + '</div>' +
        '<div style="margin-top:3cqw; width:10cqw; height:2px; background:var(--kapatid-gold);"></div>' +
        '<p style="margin:2.5cqw 0 0; font-style:italic; font-weight:300; font-size:calc(3.4cqw * var(--fs)); line-height:1.4; max-width:28ch; opacity:.9;">"' + esc(d.verse) + '"</p>' +
        '<div style="margin-top:1.5cqw; font-weight:700; font-size:calc(2.8cqw * var(--fs)); letter-spacing:0.2em; text-transform:uppercase; color:var(--kapatid-gold);">' + esc(d.reference) + '</div>' +
      '</div>' +
      logoImg('right:5cqw; bottom:5cqw; width:11cqw;', v.logoFilter, '.95') +
    '</div>';
  }

  function cardPrayer(v) {
    const d = v.d;
    let inner;
    if (!d.photo) {
      inner =
        '<div style="position:absolute; inset:0; color:' + v.ink + '; display:flex; flex-direction:column; justify-content:center; padding:9cqw;">' +
          '<div style="position:absolute; inset:0; background:repeating-linear-gradient(115deg, rgba(255,255,255,.05) 0 6px, rgba(0,0,0,.04) 6px 13px); mix-blend-mode:soft-light; pointer-events:none;"></div>' +
          '<div style="position:absolute; right:7cqw; top:6cqw; font-size:18cqw; line-height:1; color:rgba(255,255,255,.14); font-weight:800;">✳</div>' +
          '<div style="position:relative; padding-right:14cqw;">' +
            '<div style="font-size:16px; letter-spacing:0.26em; text-transform:uppercase; font-weight:700; opacity:.82;">pray with us</div>' +
            '<h2 style="margin:3cqw 0 5cqw; font-family:var(--font-display); font-weight:800; font-size:calc(11cqw * var(--fs)); line-height:1.0; letter-spacing:-0.01em;">Prayer Focus</h2>' +
            '<div style="display:inline-flex; align-items:center; background:var(--kapatid-gold); color:var(--ink-900); padding:2cqw 4.4cqw; border-radius:999px; font-weight:700; font-size:calc(3.4cqw * var(--fs)); letter-spacing:0.06em; margin-bottom:5cqw;">' + esc(d.tag) + '</div>' +
            '<p style="margin:0; font-weight:300; font-size:calc(5cqw * var(--fs)); line-height:1.4; max-width:24ch;">' + esc(d.request) + '</p>' +
          '</div>' +
        '</div>';
    } else {
      inner =
        photoHTML(d.photo, getCrop(d, 'photo')) +
        '<div style="position:absolute; inset:0; background:' + v.storyOverlay + ';"></div>' +
        '<div style="position:absolute; left:8cqw; right:8cqw; top:8cqw; z-index:2;">' +
          '<div style="display:inline-flex; align-items:center; background:var(--kapatid-gold); color:var(--ink-900); padding:1.8cqw 4cqw; border-radius:999px; font-weight:700; font-size:calc(3.2cqw * var(--fs)); letter-spacing:0.06em;">' + esc(d.tag) + '</div>' +
        '</div>' +
        '<div style="position:absolute; left:8cqw; right:20cqw; bottom:8cqw; color:' + v.ink + '; z-index:2;">' +
          '<div style="font-size:calc(3.4cqw * var(--fs)); letter-spacing:0.26em; text-transform:uppercase; font-weight:700; color:var(--kapatid-gold);">Let us pray together</div>' +
          '<div style="font-family:var(--font-display); font-weight:800; font-size:calc(9cqw * var(--fs)); line-height:1; margin:2cqw 0 3cqw;">Prayer Focus</div>' +
          '<p style="margin:0; font-weight:300; font-size:calc(4.2cqw * var(--fs)); line-height:1.4; max-width:30ch;">' + esc(d.request) + '</p>' +
        '</div>';
    }
    return '<div style="position:absolute; inset:0; background:' + v.bgColor + '; overflow:hidden;">' + inner +
      logoImg('right:7cqw; bottom:6cqw; width:12cqw;', v.logoFilter, '.92') + '</div>';
  }

  function cardEvent(v) {
    const d = v.d;
    return '' +
    '<div style="position:absolute; inset:0; background:' + v.bgColor + '; color:' + v.ink + '; display:flex; flex-direction:column; justify-content:space-between; padding:9cqw;">' +
      '<div style="position:absolute; left:6cqw; top:7cqw; font-size:7cqw; color:rgba(255,255,255,.5); font-weight:800;">✳</div>' +
      '<div style="position:absolute; right:8cqw; bottom:24cqw; font-size:5cqw; color:rgba(255,255,255,.45); font-weight:800;">✳</div>' +
      '<div style="position:relative;">' +
        '<div style="font-size:17px; letter-spacing:0.28em; text-transform:uppercase; font-weight:700; opacity:.85; margin-top:3cqw;">You’re invited</div>' +
        '<h2 style="margin:4cqw 0 2cqw; font-family:var(--font-display); font-weight:800; font-size:calc(11cqw * var(--fs)); line-height:1.0; letter-spacing:-0.015em;">' + esc(d.title) + '</h2>' +
        '<div style="font-family:var(--font-script); font-size:calc(7cqw * var(--fs)); line-height:1; color:var(--kapatid-gold);">' + esc(d.subtitle) + '</div>' +
      '</div>' +
      '<div style="position:relative; display:flex; flex-direction:column; gap:3.4cqw; padding-right:16cqw;">' +
        '<div style="height:2px; background:rgba(125,125,125,.4);"></div>' +
        '<div style="display:flex; gap:6cqw;">' +
          eventField('Date', d.date) + eventField('Time', d.time) +
        '</div>' +
        eventField('Place', d.location) +
        '<div style="display:inline-flex; align-self:flex-start; align-items:center; background:' + v.ctaBg + '; color:' + v.ctaText + '; padding:3cqw 5.5cqw; border-radius:999px; font-weight:700; font-size:calc(3.6cqw * var(--fs)); margin-top:1cqw;">' + esc(d.cta) + '</div>' +
      '</div>' +
      logoImg('right:6cqw; bottom:6cqw; width:12cqw;', v.logoFilter, '.92') +
    '</div>';
  }
  function eventField(label, value) {
    return '<div>' +
      '<div style="font-size:calc(2.9cqw * var(--fs)); letter-spacing:0.2em; text-transform:uppercase; opacity:.7; font-weight:700;">' + esc(label) + '</div>' +
      '<div style="font-weight:700; font-size:calc(4cqw * var(--fs)); margin-top:1cqw;">' + esc(value) + '</div>' +
    '</div>';
  }

  function cardStat(v) {
    const d = v.d;
    let inner;
    if (!d.photo) {
      inner =
        '<div style="position:absolute; inset:0; color:' + v.ink + '; display:flex; flex-direction:column; justify-content:center; padding:9cqw;">' +
          '<div style="position:absolute; left:9cqw; top:8cqw; right:9cqw;">' +
            '<span style="font-size:calc(3.6cqw * var(--fs)); letter-spacing:0.24em; text-transform:uppercase; font-weight:700; opacity:.7;">Our impact</span>' +
          '</div>' +
          '<div style="font-size:9cqw; color:var(--kapatid-gold); line-height:1; font-weight:800;">✳</div>' +
          '<div style="font-family:var(--font-display); font-weight:800; font-size:calc(34cqw * var(--fs)); line-height:.88; letter-spacing:-0.02em; color:' + v.statNumber + ';">' + esc(d.value) + '</div>' +
          '<p style="margin:3cqw 0 0; font-weight:500; font-size:calc(5cqw * var(--fs)); line-height:1.25; max-width:18ch; opacity:.92;">' + esc(d.label) + '</p>' +
          '<div style="position:absolute; left:9cqw; bottom:8cqw; display:flex; align-items:center; gap:3cqw;">' +
            '<span style="width:8cqw; height:3px; background:var(--kapatid-gold);"></span>' +
            '<span style="font-size:calc(3.2cqw * var(--fs)); letter-spacing:0.1em; text-transform:uppercase; font-weight:700; opacity:.7;">' + esc(d.context) + '</span>' +
          '</div>' +
        '</div>';
    } else {
      inner =
        photoHTML(d.photo, getCrop(d, 'photo')) +
        '<div style="position:absolute; inset:0; background:' + v.storyOverlay + ';"></div>' +
        '<div style="position:absolute; left:8cqw; right:8cqw; top:8cqw; z-index:2;">' +
          '<span style="font-size:calc(3.4cqw * var(--fs)); letter-spacing:0.24em; text-transform:uppercase; font-weight:700; color:var(--kapatid-gold);">Our impact</span>' +
        '</div>' +
        '<div style="position:absolute; left:8cqw; right:20cqw; bottom:8cqw; color:' + v.ink + '; z-index:2;">' +
          '<div style="display:flex; align-items:baseline; gap:3cqw;">' +
            '<div style="font-family:var(--font-display); font-weight:800; font-size:calc(24cqw * var(--fs)); line-height:.85; letter-spacing:-0.02em;">' + esc(d.value) + '</div>' +
          '</div>' +
          '<p style="margin:2cqw 0 0; font-weight:500; font-size:calc(4.2cqw * var(--fs)); line-height:1.25; max-width:24ch;">' + esc(d.label) + '</p>' +
          '<div style="margin-top:3cqw; display:flex; align-items:center; gap:3cqw;">' +
            '<span style="width:8cqw; height:3px; background:var(--kapatid-gold);"></span>' +
            '<span style="font-size:calc(3cqw * var(--fs)); letter-spacing:0.1em; text-transform:uppercase; font-weight:700; opacity:.85;">' + esc(d.context) + '</span>' +
          '</div>' +
        '</div>';
    }
    return '<div style="position:absolute; inset:0; background:' + v.bgColor + '; overflow:hidden;">' + inner +
      logoImg('right:9cqw; bottom:8cqw; width:12cqw;', v.logoFilter, '.92') + '</div>';
  }

  function cardStory(v) {
    const d = v.d;
    return '' +
    '<div style="position:absolute; inset:0; background:' + v.bgColor + ';">' +
      photoHTML(d.photo, getCrop(d, 'photo')) +
      '<div style="position:absolute; inset:0; background:' + v.storyOverlay + ';"></div>' +
      logoImg('right:6cqw; bottom:6cqw; width:11cqw;', v.logoFilter, '1') +
      '<div style="position:absolute; left:8cqw; right:20cqw; bottom:8cqw; color:' + v.ink + '; z-index:2;">' +
        '<div style="font-size:calc(3.6cqw * var(--fs)); letter-spacing:0.26em; text-transform:uppercase; font-weight:700; color:var(--kapatid-gold);">Stories</div>' +
        '<div style="font-family:var(--font-display); font-weight:800; font-size:calc(11cqw * var(--fs)); line-height:1; margin:3cqw 0 3cqw;">' + esc(d.name) + '</div>' +
        '<p style="margin:0; font-weight:300; font-size:calc(4.6cqw * var(--fs)); line-height:1.4; max-width:30ch;">' + esc(d.quote) + '</p>' +
      '</div>' +
    '</div>';
  }

  function cardTestimony(v) {
    const d = v.d;
    const rgb = BG_RGB[d.bg] || BG_RGB.navy;
    const leftGrad = 'linear-gradient(to right, rgba(' + rgb + ',.97) 30%, rgba(' + rgb + ',.86) 45%, rgba(' + rgb + ',.45) 65%, rgba(' + rgb + ',0) 90%)';
    const layer = d.photo
      ? photoHTML(d.photo, getCrop(d, 'photo')) +
        '<div style="position:absolute; inset:0; background:' + leftGrad + ';"></div>'
      : '<div style="position:absolute; inset:0; background:repeating-linear-gradient(115deg, rgba(255,255,255,.05) 0 6px, rgba(0,0,0,.04) 6px 13px); mix-blend-mode:soft-light; pointer-events:none;"></div>';
    const textW = d.photo ? '60%' : '78%';
    const content =
      '<div style="max-width:' + textW + ';">' +
        '<div style="font-size:calc(3.4cqw * var(--fs)); letter-spacing:0.26em; text-transform:uppercase; font-weight:700; color:var(--kapatid-gold); margin-bottom:1.5cqw;">Testimony</div>' +
        '<div style="font-family:var(--font-display); font-weight:800; font-size:22cqw; line-height:.72; color:var(--kapatid-gold); opacity:.5; height:10cqw; overflow:visible;">“</div>' +
        '<p style="margin:1cqw 0 0; font-family:var(--font-display); font-weight:700; font-size:calc(5.2cqw * var(--fs)); line-height:1.22; letter-spacing:-0.01em;">' + esc(d.quote) + '</p>' +
        (d.reference ? '<div style="margin-top:3.5cqw; font-weight:700; font-size:calc(2.8cqw * var(--fs)); letter-spacing:0.2em; text-transform:uppercase; opacity:.85;">' + esc(d.reference) + '</div>' : '') +
        '<div style="margin-top:5cqw;">' +
          '<div style="width:9cqw; height:2px; background:var(--kapatid-gold); margin-bottom:2.5cqw;"></div>' +
          '<div style="font-family:var(--font-display); font-weight:800; font-size:calc(4.6cqw * var(--fs)); line-height:1.05;">' + esc(d.name) + '</div>' +
          (d.role ? '<div style="font-weight:500; font-size:calc(3.2cqw * var(--fs)); opacity:.8; margin-top:0.6cqw;">' + esc(d.role) + '</div>' : '') +
        '</div>' +
      '</div>';
    return '' +
    '<div style="position:absolute; inset:0; background:' + v.bgColor + '; color:' + v.ink + '; overflow:hidden;">' +
      layer +
      '<div style="position:absolute; inset:0; display:flex; flex-direction:column; justify-content:center; padding:9cqw; z-index:2;">' + content + '</div>' +
      logoImg('right:6cqw; bottom:6cqw; width:12cqw;', d.photo ? 'brightness(0) invert(1)' : v.logoFilter, '.92') +
    '</div>';
  }

  function cardFeeding(v) {
    const d = v.d;
    return '' +
    '<div style="position:absolute; inset:0; background:' + v.bgColor + ';">' +
      photoHTML(d.photo, getCrop(d, 'photo')) +
      '<div style="position:absolute; inset:0; background:' + v.storyOverlay + ';"></div>' +
      '<div style="position:absolute; left:8cqw; top:8cqw; z-index:3;">' +
        '<div style="display:inline-flex; align-items:center; gap:2cqw; background:var(--kapatid-gold); color:var(--ink-900); padding:1.8cqw 4cqw; border-radius:999px; font-weight:700; font-size:calc(3cqw * var(--fs)); letter-spacing:0.08em; text-transform:uppercase;">' +
          '<span style="font-size:calc(3.4cqw * var(--fs)); line-height:1;">✳</span>Feeding Ministry' +
        '</div>' +
      '</div>' +
      '<div style="position:absolute; left:8cqw; right:20cqw; bottom:8cqw; color:var(--white); z-index:2;">' +
        '<div style="font-family:var(--font-display); font-weight:800; font-size:calc(10cqw * var(--fs)); line-height:.95; letter-spacing:-0.01em; margin-bottom:3.5cqw;">' + esc(d.area) + '</div>' +
        '<div style="display:flex; align-items:center; gap:2cqw; margin-bottom:3cqw;">' +
          '<span style="width:2.2cqw; height:2.2cqw; border-radius:50%; background:var(--kapatid-gold); flex:0 0 auto;"></span>' +
          '<span style="font-weight:500; font-size:calc(3.8cqw * var(--fs)); opacity:.92;">' + esc(d.location) + '</span>' +
        '</div>' +
        '<div style="height:1px; background:rgba(255,255,255,.28); margin-bottom:3cqw;"></div>' +
        '<div style="display:flex; gap:7cqw;">' +
          feedField('Date', d.date, false) +
          feedField('Served', d.count, true) +
        '</div>' +
      '</div>' +
      logoImg('right:6cqw; bottom:6cqw; width:11cqw;', 'brightness(0) invert(1)', '.92') +
    '</div>';
  }
  function feedField(label, value, gold) {
    return '<div>' +
      '<div style="font-size:calc(2.6cqw * var(--fs)); letter-spacing:0.18em; text-transform:uppercase; font-weight:700; opacity:.65; margin-bottom:1cqw;">' + esc(label) + '</div>' +
      '<div style="font-weight:700; font-size:calc(3.4cqw * var(--fs));' + (gold ? ' color:var(--kapatid-gold);' : '') + '">' + esc(value) + '</div>' +
    '</div>';
  }

  function conf(s) { return '<span style="position:absolute; ' + s + '"></span>'; }
  function ornRule() {
    return '<div style="display:flex; align-items:center; gap:2cqw; width:40cqw;">' +
      '<span style="flex:1; height:1px; background:var(--taupe-400);"></span>' +
      '<span style="font-size:2.4cqw; color:var(--kapatid-gold); transform:rotate(45deg);">◆</span>' +
      '<span style="flex:1; height:1px; background:var(--taupe-400);"></span>' +
    '</div>';
  }
  function logoImg(pos, filter, opacity) {
    return '<img src="assets/logo-transparent.png" alt="" style="position:absolute; ' + pos +
      ' height:auto; filter:' + filter + '; opacity:' + opacity + '; z-index:5;">';
  }

  function renderCard(v) {
    switch (v.a) {
      case 'verse': return cardVerse(v);
      case 'birthday': return cardBirthday(v);
      case 'prayer': return cardPrayer(v);
      case 'event': return cardEvent(v);
      case 'stat': return cardStat(v);
      case 'story': return cardStory(v);
      case 'testimony': return cardTestimony(v);
      case 'feeding': return cardFeeding(v);
      default: return '';
    }
  }

  // ---- Editor field definitions ---------------------------------------
  function buildFields() {
    const a = state.active, d = state.data[a];
    const txt = (key, label) => ({ key, label, type: 'text', value: d[key] });
    const area = (key, label) => ({ key, label, type: 'area', value: d[key] });
    const bg = () => ({ key: 'bg', label: 'Background color', type: 'color', value: d.bg });
    const size = () => ({ key: 'fontScale', label: 'Text size', type: 'size', value: d.fontScale });
    const choice = (key, label, opts) => ({ key, label, type: 'choice', value: d[key], choices: opts });
    const photo = (key, label, allowNone) => ({ key, label, type: 'photo', value: d[key], allowNone });
    const map = {
      verse: [bg(), size(), txt('headline', 'Headline phrase'), area('body', 'Verse text'), txt('reference', 'Reference')],
      birthday: [choice('style', 'Layout style', [{ label: 'Classic', v: 'classic' }, { label: 'Festive', v: 'festive' }, { label: 'Celebratory', v: 'celebratory' }, { label: 'Cinematic', v: 'cinematic' }, { label: 'Vintage', v: 'vintage' }]), bg(), size(), txt('name', 'Celebrant name'), photo('photo', 'Photo', false), area('verse', 'Blessing verse'), txt('reference', 'Reference')],
      prayer: [bg(), size(), txt('tag', 'Category tag'), area('request', 'Prayer request'), photo('photo', 'Photo (optional)', true)],
      event: [bg(), size(), txt('title', 'Event title'), txt('subtitle', 'Subtitle'), txt('date', 'Date'), txt('time', 'Time'), txt('location', 'Location'), txt('cta', 'Call to action')],
      stat: [bg(), size(), txt('value', 'The number'), area('label', 'What it counts'), txt('context', 'Footnote'), photo('photo', 'Photo (optional)', true)],
      story: [bg(), size(), photo('photo', 'Photo', false), txt('name', 'Name'), area('quote', 'Their story')],
      testimony: [bg(), size(), photo('photo', 'Photo (optional)', true), area('quote', 'Testimony quote'), txt('name', 'Name'), txt('role', 'Role / context'), txt('reference', 'Verse reference (optional)')],
      feeding: [bg(), size(), photo('photo', 'Background photo', false), txt('area', 'Feeding area name'), txt('location', 'Location'), txt('date', 'Date'), txt('count', 'Children served')]
    };
    return map[a];
  }

  function renderField(f) {
    const fk = 'field:' + f.key;
    let control = '';
    if (f.type === 'text') {
      control = '<input data-action="field" data-key="' + f.key + '" data-focuskey="' + fk + '" value="' + attr(f.value) + '" ' +
        'style="width:100%; height:44px; padding:0 14px; border:2px solid var(--app-border); border-radius:10px; font-size:14px; color:var(--app-text); background:var(--app-input);">';
    } else if (f.type === 'area') {
      control = '<textarea data-action="field" data-key="' + f.key + '" data-focuskey="' + fk + '" rows="4" ' +
        'style="width:100%; padding:11px 14px; border:2px solid var(--app-border); border-radius:10px; font-size:14px; line-height:1.5; color:var(--app-text); resize:vertical; background:var(--app-input);">' + esc(f.value) + '</textarea>';
    } else if (f.type === 'color') {
      const swatches = BG_KEYS.map(c => {
        const sel = f.value === c;
        const border = sel ? '3px solid var(--app-text)' : '2px solid var(--app-border)';
        const inset = sel ? 'box-shadow:0 0 0 2px var(--app-panel) inset;' : '';
        return '<button data-action="setField" data-key="bg" data-val="' + c + '" title="' + c + '" ' +
          'style="width:34px; height:34px; border-radius:9px; cursor:pointer; flex:0 0 auto; background:' + BG_SWATCH[c] + '; border:' + border + '; ' + inset + '"></button>';
      }).join('');
      control = '<div style="display:flex; gap:10px; flex-wrap:wrap;">' + swatches + '</div>';
    } else if (f.type === 'size') {
      const opts = SIZES.map(o => pill('fontScale', o.v, o.label, (f.value || 1) === o.v)).join('');
      control = '<div style="display:inline-flex; background:var(--app-sunken); border:1px solid var(--app-border); border-radius:999px; padding:4px; gap:3px;">' + opts + '</div>';
    } else if (f.type === 'choice') {
      const opts = f.choices.map(o => pill(f.key, o.v, o.label, f.value === o.v, true)).join('');
      control = '<div style="display:flex; flex-wrap:wrap; background:var(--app-sunken); border:1px solid var(--app-border); border-radius:18px; padding:4px; gap:3px;">' + opts + '</div>';
    } else if (f.type === 'photo') {
      control = renderPhotoField(f);
    }
    return '<div style="margin-bottom:18px;">' +
      '<label style="display:block; font-size:13px; font-weight:700; color:var(--app-text); margin-bottom:7px;">' + esc(f.label) + '</label>' +
      control + '</div>';
  }

  function pill(key, val, label, selected, wide) {
    const pad = wide ? '0 16px' : '0 14px';
    const bg = selected ? 'var(--kapatid-blue)' : 'transparent';
    const col = selected ? 'var(--white)' : 'var(--app-text2)';
    return '<button data-action="setField" data-key="' + key + '" data-val="' + attr(val) + '" ' +
      'style="height:30px; padding:' + pad + '; border:none; border-radius:999px; cursor:pointer; font-weight:700; font-size:13px; background:' + bg + '; color:' + col + ';">' + esc(label) + '</button>';
  }

  function renderPhotoField(f) {
    const all = PHOTOS.concat(state.uploads);
    const tiles = [];
    if (f.allowNone) {
      const sel = !f.value;
      tiles.push('<button data-action="setField" data-key="' + f.key + '" data-val="" title="No photo" ' +
        'style="width:60px; height:60px; border-radius:10px; cursor:pointer; flex:0 0 auto; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; color:var(--app-muted); background:var(--app-input); border:' + (sel ? '3px solid var(--kapatid-blue)' : '2px solid var(--app-border)') + ';">None</button>');
    }
    all.forEach(p => {
      const sel = f.value === p.src;
      tiles.push('<div data-action="setField" data-key="' + f.key + '" data-val="' + attr(p.src) + '" title="' + attr(p.label) + '" ' +
        'style="width:60px; height:60px; border-radius:10px; cursor:pointer; flex:0 0 auto; background-image:url(\'' + attr(p.src) + '\'); background-size:cover; background-position:center; border:' + (sel ? '3px solid var(--kapatid-blue)' : '2px solid var(--app-border)') + ';"></div>');
    });
    tiles.push('<button data-action="openUpload" data-key="' + f.key + '" title="Upload your own photo" ' +
      'style="width:60px; height:60px; border-radius:10px; cursor:pointer; flex:0 0 auto; display:flex; align-items:center; justify-content:center; font-size:26px; font-weight:400; line-height:1; color:var(--app-muted); background:var(--app-input); border:2px dashed var(--app-border);">+</button>');
    let adjustBtn = '';
    if (f.value) {
      adjustBtn = '<div style="margin-top:8px;">' +
        '<button data-action="openCrop" data-key="' + f.key + '" ' +
        'style="height:30px; padding:0 13px; border:1.5px solid var(--app-border); border-radius:8px; cursor:pointer; font-size:12px; font-weight:700; color:var(--app-text2); background:var(--app-input);">✎ Adjust photo</button>' +
        '</div>';
    }
    return '<div style="display:flex; gap:8px; flex-wrap:wrap;">' + tiles.join('') + '</div>' + adjustBtn;
  }

  // ---- Full render -----------------------------------------------------
  function render() {
    // capture focus to restore after innerHTML swap
    const ae = document.activeElement;
    const focusKey = ae && ae.dataset ? ae.dataset.focuskey : null;
    const selStart = ae ? ae.selectionStart : null;
    const selEnd = ae ? ae.selectionEnd : null;

    const v = vals();
    const d = v.d;
    const fmt = state.format;
    const tpl = TEMPLATES.find(t => t.id === v.a);
    const cap = d.caption || '';

    const stageW = fmt === 'square' ? 460 : 432;
    const stageH = fmt === 'square' ? 460 : 768;
    const stageStyle = 'position:relative; overflow:hidden; flex:0 0 auto; width:' + stageW + 'px; height:' + stageH + 'px; ' +
      'border-radius:6px; box-shadow:0 24px 60px -20px rgba(42,35,31,.45), 0 6px 16px -8px rgba(42,35,31,.3); ' +
      'container-type:size; font-family:var(--font-sans); --fs:' + (d.fontScale || 1) + ';';

    const dimsLabel = fmt === 'square' ? '1080 × 1080 px · 1:1' : '1080 × 1920 px · 9:16';
    const copyLabel = state.copied ? 'Copied ✓' : 'Copy caption';
    const downloadLabel = state.exporting ? 'Exporting…' : 'Download PNG';
    const darkIcon = state.dark ? '☀' : '☾';

    const templatesHtml = TEMPLATES.map(t => {
      const on = t.id === v.a;
      const style = 'display:flex; align-items:center; gap:12px; width:100%; text-align:left; padding:12px 14px; border-radius:12px; cursor:pointer; margin-bottom:6px; ' +
        'border:' + (on ? '2px solid var(--kapatid-blue)' : '2px solid transparent') + '; background:' + (on ? 'var(--app-accent-soft)' : 'transparent') + '; transition:background .15s ease;';
      return '<button class="tpl-btn" data-action="selectTemplate" data-id="' + t.id + '" style="' + style + '">' +
        '<span style="width:28px; height:28px; border-radius:8px; flex:0 0 auto; background:' + t.dot + ';"></span>' +
        '<span style="display:flex; flex-direction:column; gap:2px; min-width:0;">' +
          '<span style="font-weight:700; font-size:14px; color:var(--app-text);">' + esc(t.name) + '</span>' +
          '<span style="font-size:12px; color:var(--app-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + esc(t.desc) + '</span>' +
        '</span>' +
      '</button>';
    }).join('');

    const fieldsHtml = buildFields().map(renderField).join('');

    const sqStyle = pillTabStyle(fmt === 'square');
    const storyStyle = pillTabStyle(fmt === 'story');

    const html =
    '<div class="app-shell ' + (state.dark ? 'dark-app' : '') + '" style="display:flex; flex-direction:column; height:100vh; min-height:0; background:var(--app-bg); color:var(--app-text2); font-family:var(--font-sans);">' +

      // Top bar
      '<header style="display:flex; align-items:center; justify-content:space-between; gap:16px; height:64px; flex:0 0 auto; padding:0 20px; background:var(--app-panel); border-bottom:1px solid var(--app-border); z-index:5;">' +
        '<div style="display:flex; align-items:center; gap:12px;">' +
          '<img src="assets/logo.png" alt="Kapatid Ministry" style="height:38px; width:auto; display:block;">' +
          '<div style="display:flex; flex-direction:column; line-height:1;">' +
            '<span style="font-family:var(--font-display); font-weight:800; font-size:17px; color:var(--app-text); letter-spacing:-0.01em;">Content Studio</span>' +
            '<span style="font-size:11px; letter-spacing:0.14em; text-transform:uppercase; color:var(--app-muted); margin-top:3px;">Kapatid Ministry</span>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex; align-items:center; gap:10px;">' +
          '<button data-action="logout" title="Sign out" style="display:inline-flex; align-items:center; justify-content:center; width:42px; height:42px; border-radius:999px; border:2px solid var(--app-border); background:var(--app-panel); color:var(--app-muted); font-size:16px; cursor:pointer;">⎋</button>' +
          '<button data-action="toggleDark" title="Toggle dark mode" style="display:inline-flex; align-items:center; justify-content:center; width:42px; height:42px; border-radius:999px; border:2px solid var(--app-border); background:var(--app-panel); color:var(--app-text); font-size:18px; cursor:pointer;">' + darkIcon + '</button>' +
          '<button data-action="copyCaption" style="display:inline-flex; align-items:center; gap:8px; height:42px; padding:0 18px; border-radius:999px; border:2px solid var(--kapatid-blue); background:var(--app-panel); color:var(--kapatid-blue); font-weight:700; font-size:14px; cursor:pointer;">' + esc(copyLabel) + '</button>' +
          '<button data-action="download" style="display:inline-flex; align-items:center; gap:8px; height:42px; padding:0 20px; border-radius:999px; border:2px solid var(--kapatid-coral); background:var(--kapatid-coral); color:var(--white); font-weight:700; font-size:14px; cursor:pointer;">' + esc(downloadLabel) + '</button>' +
        '</div>' +
      '</header>' +

      '<div style="display:flex; flex:1 1 auto; min-height:0;">' +

        // Left rail
        '<aside class="ksb" style="width:264px; flex:0 0 auto; background:var(--app-panel); border-right:1px solid var(--app-border); padding:18px 14px; overflow-y:auto;">' +
          '<div style="font-size:11px; letter-spacing:0.14em; text-transform:uppercase; color:var(--app-muted); font-weight:700; padding:4px 8px 12px;">Templates</div>' +
          templatesHtml +
          '<div style="margin-top:18px; padding:14px; border-radius:12px; background:var(--app-accent-soft); border:1px solid var(--app-accent-soft-bd);">' +
            '<div style="font-family:var(--font-script); font-size:22px; color:var(--app-accent-text); line-height:1;">Faith. Faithful. Fruitful.</div>' +
            '<div style="font-size:12px; color:var(--app-muted); margin-top:6px; line-height:1.5;">Every post carries the heart of Kapatid — warm, hopeful, and rooted in Christ.</div>' +
          '</div>' +
        '</aside>' +

        // Center stage
        '<main class="ksb" style="flex:1 1 auto; min-width:0; display:flex; flex-direction:column; align-items:center; overflow-y:auto; padding:22px;">' +
          '<div style="display:flex; align-items:center; justify-content:space-between; width:100%; max-width:640px; margin-bottom:18px;">' +
            '<div style="display:flex; flex-direction:column; gap:3px;">' +
              '<span style="font-family:var(--font-display); font-weight:800; font-size:18px; color:var(--app-text);">' + esc(tpl.name) + '</span>' +
              '<span style="font-size:12px; color:var(--app-muted);">' + dimsLabel + '</span>' +
            '</div>' +
            '<div style="display:inline-flex; background:var(--app-panel); border:1px solid var(--app-border); border-radius:999px; padding:4px;">' +
              '<button data-action="setFormat" data-fmt="square" style="' + sqStyle + '">Square</button>' +
              '<button data-action="setFormat" data-fmt="story" style="' + storyStyle + '">Story</button>' +
            '</div>' +
          '</div>' +
          '<div style="display:flex; flex:1 1 auto; align-items:center; justify-content:center; padding:8px 0 28px;">' +
            '<div id="card" style="' + stageStyle + '">' + renderCard(v) + '</div>' +
          '</div>' +
        '</main>' +

        // Right panel
        '<aside class="ksb" style="width:392px; flex:0 0 auto; background:var(--app-panel); border-left:1px solid var(--app-border); overflow-y:auto;">' +
          '<div style="padding:20px 22px;">' +
            '<div style="font-size:11px; letter-spacing:0.14em; text-transform:uppercase; color:var(--app-muted); font-weight:700; margin-bottom:16px;">Edit content</div>' +
            fieldsHtml +
            '<input type="file" accept="image/*" id="fileInput" style="display:none;">' +
          '</div>' +
          '<div style="height:1px; background:var(--app-border);"></div>' +
          '<div style="padding:20px 22px;">' +
            '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">' +
              '<div style="font-size:11px; letter-spacing:0.14em; text-transform:uppercase; color:var(--app-muted); font-weight:700;">Caption</div>' +
              '<button data-action="copyCaption" style="display:inline-flex; align-items:center; gap:6px; height:32px; padding:0 14px; border-radius:999px; border:2px solid var(--kapatid-blue); background:var(--app-panel); color:var(--kapatid-blue); font-weight:700; font-size:12px; cursor:pointer;">' + esc(copyLabel) + '</button>' +
            '</div>' +
            '<textarea data-action="caption" data-focuskey="caption" rows="9" style="width:100%; padding:13px 14px; border:2px solid var(--app-border); border-radius:12px; font-size:14px; line-height:1.6; color:var(--app-text); resize:vertical; background:var(--app-sunken);">' + esc(cap) + '</textarea>' +
            '<div style="margin-top:8px; font-size:12px; color:var(--app-muted);">' + cap.length + ' / 2,200 characters</div>' +
          '</div>' +
        '</aside>' +

      '</div>' +
    '</div>';

    document.getElementById('root').innerHTML = html;

    // restore focus + caret
    if (focusKey) {
      const target = document.querySelector('[data-focuskey="' + focusKey + '"]');
      if (target) {
        target.focus();
        try { if (selStart != null) target.setSelectionRange(selStart, selEnd); } catch (e) {}
      }
    }
  }

  function pillTabStyle(on) {
    return 'height:34px; padding:0 18px; border:none; border-radius:999px; cursor:pointer; font-weight:700; font-size:13px; ' +
      'background:' + (on ? 'var(--kapatid-blue)' : 'transparent') + '; color:' + (on ? 'var(--white)' : 'var(--app-text2)') + ';';
  }

  // ---- Crop modal -------------------------------------------------------
  function openCropModal(key) {
    const a = state.active;
    const d = state.data[a];
    const src = d[key];
    if (!src) return;
    const saved = getCrop(d, key);
    let cx = saved.x, cy = saved.y, cz = saved.zoom || 1;
    let isDragging = false, dragSX, dragSY, dragX0, dragY0;

    const existing = document.getElementById('cropOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'cropOverlay';
    if (state.dark) overlay.className = 'dark-app';
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.78); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px;';

    const PW = 320;
    overlay.innerHTML =
      '<div style="background:var(--app-panel); border-radius:20px; padding:24px; width:368px; max-width:100%; box-shadow:0 24px 60px rgba(0,0,0,.5);">' +
        '<div style="font-weight:700; font-size:16px; margin-bottom:16px; color:var(--app-text);">Adjust Photo</div>' +
        '<div id="cWrap" style="width:' + PW + 'px; height:' + PW + 'px; border-radius:12px; overflow:hidden; cursor:grab; position:relative; user-select:none; touch-action:none; margin:0 auto 10px;">' +
          '<div id="cBg" style="position:absolute; inset:0; background-image:url(\'' + src.replace(/'/g, "\\'") + '\'); background-size:cover; background-position:' + cx + '% ' + cy + '%; transform-origin:' + cx + '% ' + cy + '%; transform:scale(' + cz + ');"></div>' +
        '</div>' +
        '<p style="font-size:11px; color:var(--app-muted); text-align:center; margin:0 0 14px;">Drag to reposition</p>' +
        '<div style="margin-bottom:20px;">' +
          '<label style="display:flex; justify-content:space-between; align-items:center; font-size:13px; font-weight:700; color:var(--app-text); margin-bottom:8px;">' +
            '<span>Zoom</span><span id="cZoomLbl">' + cz.toFixed(1) + '×</span>' +
          '</label>' +
          '<input id="cZoom" type="range" min="100" max="300" step="5" value="' + Math.round(cz * 100) + '" style="width:100%; accent-color:var(--kapatid-blue); cursor:pointer;">' +
        '</div>' +
        '<div style="display:flex; gap:10px; justify-content:flex-end;">' +
          '<button id="cReset" style="height:36px; padding:0 16px; border:2px solid var(--app-border); border-radius:8px; font-size:13px; font-weight:700; cursor:pointer; background:var(--app-input); color:var(--app-text2);">Reset</button>' +
          '<button id="cCancel" style="height:36px; padding:0 16px; border:2px solid var(--app-border); border-radius:8px; font-size:13px; font-weight:700; cursor:pointer; background:var(--app-input); color:var(--app-text2);">Cancel</button>' +
          '<button id="cDone" style="height:36px; padding:0 20px; border:none; border-radius:8px; font-size:13px; font-weight:700; cursor:pointer; background:var(--kapatid-blue); color:var(--white);">Done</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    const wrap = document.getElementById('cWrap');
    const bg   = document.getElementById('cBg');
    const zSlider = document.getElementById('cZoom');
    const zLbl = document.getElementById('cZoomLbl');

    function applyPreview() {
      bg.style.backgroundPosition = cx + '% ' + cy + '%';
      bg.style.transformOrigin = cx + '% ' + cy + '%';
      bg.style.transform = 'scale(' + cz + ')';
      zLbl.textContent = cz.toFixed(1) + '×';
    }

    function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

    function onDown(ex, ey) {
      isDragging = true; dragSX = ex; dragSY = ey; dragX0 = cx; dragY0 = cy;
      wrap.style.cursor = 'grabbing';
    }
    function onMove(ex, ey) {
      if (!isDragging) return;
      cx = clamp(dragX0 - (ex - dragSX) / PW * 100, 0, 100);
      cy = clamp(dragY0 - (ey - dragSY) / PW * 100, 0, 100);
      applyPreview();
    }
    function onUp() { if (isDragging) { isDragging = false; wrap.style.cursor = 'grab'; } }

    function onMouseMove(e) { onMove(e.clientX, e.clientY); }
    function onMouseUp() { onUp(); }

    wrap.addEventListener('mousedown', function(e) { onDown(e.clientX, e.clientY); e.preventDefault(); });
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    wrap.addEventListener('touchstart', function(e) {
      if (e.touches.length === 1) onDown(e.touches[0].clientX, e.touches[0].clientY);
      e.preventDefault();
    }, { passive: false });
    wrap.addEventListener('touchmove', function(e) {
      if (e.touches.length === 1) onMove(e.touches[0].clientX, e.touches[0].clientY);
      e.preventDefault();
    }, { passive: false });
    wrap.addEventListener('touchend', onUp);

    zSlider.addEventListener('input', function() {
      cz = parseInt(this.value) / 100;
      applyPreview();
    });

    function closeCrop(save) {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      overlay.remove();
      if (save) {
        setField(key + '_crop', { x: parseFloat(cx.toFixed(1)), y: parseFloat(cy.toFixed(1)), zoom: parseFloat(cz.toFixed(2)) });
      }
    }

    document.getElementById('cReset').addEventListener('click', function() {
      cx = 50; cy = 50; cz = 1; zSlider.value = 100; applyPreview();
    });
    document.getElementById('cCancel').addEventListener('click', function() { closeCrop(false); });
    document.getElementById('cDone').addEventListener('click', function() { closeCrop(true); });
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeCrop(false); });
  }

  // ---- Event delegation ------------------------------------------------
  function init() {
    const root = document.getElementById('root');

    root.addEventListener('click', function (e) {
      const t = e.target.closest('[data-action]');
      if (!t) return;
      const action = t.dataset.action;
      if (action === 'selectTemplate') selectTemplate(t.dataset.id);
      else if (action === 'setFormat') setFormat(t.dataset.fmt);
      else if (action === 'toggleDark') toggleDark();
      else if (action === 'copyCaption') copyCaption();
      else if (action === 'logout') { sessionStorage.removeItem(SESSION_KEY); renderLogin(); }
      else if (action === 'download') download();
      else if (action === 'openUpload') openUpload(t.dataset.key);
      else if (action === 'openCrop') openCropModal(t.dataset.key);
      else if (action === 'setField') {
        let val = t.dataset.val;
        if (t.dataset.key === 'fontScale') val = parseFloat(val);
        setField(t.dataset.key, val);
      }
    });

    root.addEventListener('input', function (e) {
      const t = e.target.closest('[data-action]');
      if (!t) return;
      if (t.dataset.action === 'field') setField(t.dataset.key, t.value);
      else if (t.dataset.action === 'caption') setField('caption', t.value);
    });

    // file input lives inside #root and is re-created each render — delegate change
    root.addEventListener('change', function (e) {
      if (e.target && e.target.id === 'fileInput') onUploadFile(e);
    });

    render();
  }

  function startApp() {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }

  function boot() {
    if (isAuthed()) startApp();
    else renderLogin();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
