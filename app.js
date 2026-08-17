(() => {
  'use strict';

  const dataUrl = '/data/site.json';
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));
  const escape = (value) => String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const homePath = location.pathname.endsWith('kindervale.html') ? location.pathname : '/';
  let activeObserver;
  let lastHomeScroll = Number(sessionStorage.getItem('kindervale:lastHomeScroll') || 0);
  let currentAdmissionSource = 'General Admissions';

  /* ─── Decorative preschool-themed illustration library ─── */
  const kvIcons = {
    book: () => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="presentation"><path d="M50 28 C40 20 22 18 12 22 L12 74 C22 70 40 72 50 80 C60 72 78 70 88 74 L88 22 C78 18 60 20 50 28 Z" fill="#fff" stroke="var(--theme-a)" stroke-width="3"/><path d="M50 28 L50 80" stroke="var(--theme-a)" stroke-width="3"/><path d="M18 30 C26 27 36 28 44 33" stroke="var(--theme-b)" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M18 40 C26 37 36 38 44 43" stroke="var(--theme-b)" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M56 33 C64 28 74 27 82 30" stroke="var(--theme-c)" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M56 43 C64 38 74 37 82 40" stroke="var(--theme-c)" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`,
    butterfly: () => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="presentation"><path d="M50 46 C36 18 8 20 10 42 C12 60 34 58 50 46Z" fill="var(--theme-c)"/><path d="M50 46 C64 18 92 20 90 42 C88 60 66 58 50 46Z" fill="var(--theme-a)"/><path d="M50 50 C38 66 16 68 16 54 C16 44 34 46 50 50Z" fill="var(--theme-b)"/><path d="M50 50 C62 66 84 68 84 54 C84 44 66 46 50 50Z" fill="var(--theme-d)"/><ellipse cx="50" cy="50" rx="3" ry="14" fill="var(--teal-dark)"/><path d="M50 38 C46 32 40 30 38 26" stroke="var(--teal-dark)" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M50 38 C54 32 60 30 62 26" stroke="var(--teal-dark)" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,
    star: () => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="presentation"><path d="M50 6 L61 38 L96 38 L67 58 L78 90 L50 70 L22 90 L33 58 L4 38 L39 38 Z" fill="var(--theme-b)" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>`,
    flower: () => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="presentation"><circle cx="50" cy="30" r="14" fill="var(--theme-c)"/><circle cx="72" cy="50" r="14" fill="var(--theme-a)"/><circle cx="50" cy="70" r="14" fill="var(--theme-b)"/><circle cx="28" cy="50" r="14" fill="var(--theme-d)"/><circle cx="50" cy="50" r="12" fill="#fff"/><circle cx="50" cy="50" r="7" fill="var(--theme-b)"/><rect x="46" y="72" width="8" height="22" rx="4" fill="#7bbf6a"/></svg>`,
    tree: () => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="presentation"><rect x="44" y="60" width="12" height="32" rx="4" fill="#8a5a3c"/><circle cx="50" cy="38" r="26" fill="var(--theme-d)"/><circle cx="30" cy="48" r="18" fill="var(--theme-c)"/><circle cx="70" cy="48" r="18" fill="var(--theme-a)"/></svg>`,
    alphaBlock: (letter = 'A') => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="presentation"><rect x="14" y="14" width="72" height="72" rx="16" fill="var(--theme-b)" stroke="#fff" stroke-width="4"/><text x="50" y="66" font-family="Quincy CF,Georgia,'Times New Roman',serif" font-size="46" font-weight="400" fill="#fff" text-anchor="middle">${letter}</text></svg>`,
    pencil: () => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="presentation"><g transform="rotate(45 50 50)"><rect x="34" y="10" width="32" height="62" rx="4" fill="var(--theme-a)"/><path d="M34 72 L66 72 L50 92 Z" fill="#e8b98a"/><path d="M44 84 L56 84 L50 92 Z" fill="#4a4a4a"/><rect x="34" y="10" width="32" height="12" rx="4" fill="var(--theme-c)"/></g></svg>`,
    puzzle: () => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="presentation"><path d="M20 20 H45 C45 12 55 12 55 20 H80 V45 C88 45 88 55 80 55 V80 H55 C55 88 45 88 45 80 H20 V55 C12 55 12 45 20 45 Z" fill="var(--theme-c)" stroke="#fff" stroke-width="3"/></svg>`,
    toyTrain: () => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="presentation"><rect x="10" y="46" width="36" height="28" rx="6" fill="var(--theme-a)"/><rect x="50" y="34" width="32" height="40" rx="6" fill="var(--theme-b)"/><rect x="58" y="20" width="14" height="18" rx="3" fill="var(--theme-b)"/><circle cx="22" cy="80" r="8" fill="#3a3a3a"/><circle cx="40" cy="80" r="8" fill="#3a3a3a"/><circle cx="62" cy="80" r="8" fill="#3a3a3a"/><circle cx="78" cy="80" r="8" fill="#3a3a3a"/><circle cx="22" cy="80" r="3" fill="#fff"/><circle cx="40" cy="80" r="3" fill="#fff"/><circle cx="62" cy="80" r="3" fill="#fff"/><circle cx="78" cy="80" r="3" fill="#fff"/><circle cx="30" cy="58" r="6" fill="#fff"/></svg>`,
    camera: () => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="presentation"><rect x="12" y="34" width="76" height="52" rx="10" fill="var(--theme-a)"/><rect x="34" y="22" width="24" height="14" rx="4" fill="var(--theme-a)"/><circle cx="50" cy="60" r="18" fill="#fff"/><circle cx="50" cy="60" r="12" fill="var(--theme-b)"/><circle cx="74" cy="44" r="4" fill="#fff"/></svg>`,
    balloon: () => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="presentation"><ellipse cx="50" cy="38" rx="26" ry="32" fill="var(--theme-c)"/><ellipse cx="42" cy="26" rx="8" ry="10" fill="#fff" opacity=".5"/><path d="M50 70 L46 78 L54 78 Z" fill="var(--theme-c)"/><path d="M50 78 C46 86 54 92 50 98" stroke="var(--teal-dark)" stroke-width="2" fill="none"/></svg>`,
    bee: () => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="presentation"><ellipse cx="46" cy="30" rx="16" ry="12" fill="#fff" opacity=".7"/><ellipse cx="60" cy="30" rx="16" ry="12" fill="#fff" opacity=".7"/><ellipse cx="50" cy="55" rx="26" ry="20" fill="#fde047"/><path d="M28 46 H72 M26 55 H74 M30 65 H70" stroke="#2a2a2a" stroke-width="6" stroke-linecap="round"/><circle cx="50" cy="30" r="10" fill="#2a2a2a"/></svg>`,
    childWaving: () => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="presentation"><circle cx="50" cy="30" r="16" fill="#f6c9a0"/><path d="M36 22 C36 10 64 10 64 22 C64 16 36 16 36 22Z" fill="var(--theme-b)"/><rect x="34" y="46" width="32" height="38" rx="14" fill="var(--theme-a)"/><path d="M66 50 C78 44 84 30 80 22" stroke="#f6c9a0" stroke-width="9" stroke-linecap="round" fill="none"/><path d="M34 54 C24 58 20 68 22 78" stroke="#f6c9a0" stroke-width="9" stroke-linecap="round" fill="none"/><rect x="38" y="82" width="10" height="16" rx="5" fill="var(--theme-c)"/><rect x="52" y="82" width="10" height="16" rx="5" fill="var(--theme-c)"/></svg>`,
    childReading: () => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="presentation"><circle cx="42" cy="28" r="14" fill="#f6c9a0"/><path d="M30 22 C30 10 54 10 54 22 C54 16 30 16 30 22Z" fill="var(--theme-a)"/><path d="M24 46 C24 66 60 66 60 46 C60 40 24 40 24 46Z" fill="var(--theme-b)"/><path d="M40 50 L70 46 L70 66 L40 68 Z" fill="#fff" stroke="var(--theme-c)" stroke-width="2"/><path d="M55 47 L55 67" stroke="var(--theme-c)" stroke-width="2"/><path d="M20 70 C20 84 60 84 60 70" fill="none" stroke="var(--theme-a)" stroke-width="10" stroke-linecap="round"/></svg>`,
    apple: () => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="presentation"><path d="M50 34 C30 30 18 46 20 64 C22 82 38 92 50 84 C62 92 78 82 80 64 C82 46 70 30 50 34Z" fill="#ff6b6b"/><ellipse cx="38" cy="52" rx="8" ry="12" fill="#fff" opacity=".35"/><path d="M50 34 C50 26 46 20 42 18" stroke="#7a4a2b" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M50 22 C56 16 64 16 68 22 C62 22 56 24 52 28Z" fill="#7bbf6a"/></svg>`,
    backpack: () => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="presentation"><rect x="24" y="34" width="52" height="54" rx="16" fill="var(--theme-a)"/><rect x="34" y="20" width="32" height="20" rx="10" fill="var(--theme-b)"/><rect x="36" y="50" width="28" height="22" rx="8" fill="#fff" opacity=".85"/><path d="M30 40 C30 30 40 30 40 40" stroke="var(--theme-c)" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M60 40 C60 30 70 30 70 40" stroke="var(--theme-c)" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`,
    bell: () => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="presentation"><path d="M50 18 C34 18 30 34 30 46 C30 60 24 66 20 70 H80 C76 66 70 60 70 46 C70 34 66 18 50 18Z" fill="var(--theme-b)"/><circle cx="50" cy="16" r="6" fill="var(--theme-c)"/><ellipse cx="50" cy="74" rx="10" ry="6" fill="var(--theme-c)"/><circle cx="50" cy="84" r="6" fill="var(--theme-a)"/></svg>`,
    crayon: () => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="presentation"><g transform="rotate(30 50 50)"><rect x="38" y="14" width="24" height="58" rx="6" fill="var(--theme-c)"/><path d="M38 72 L62 72 L50 90 Z" fill="var(--theme-c)"/><rect x="38" y="30" width="24" height="8" fill="#fff" opacity=".55"/></g></svg>`,
    kite: () => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="presentation"><path d="M50 10 L80 40 L50 62 L20 40 Z" fill="var(--theme-a)"/><path d="M50 10 L50 62" stroke="#fff" stroke-width="2"/><path d="M20 40 L80 40" stroke="#fff" stroke-width="2"/><path d="M50 62 C48 70 52 74 50 82 C48 88 52 92 50 98" stroke="var(--teal-dark)" stroke-width="2" fill="none"/><path d="M46 70 L40 74 M50 78 L58 82 M46 88 L40 92" stroke="var(--theme-b)" stroke-width="3" stroke-linecap="round"/></svg>`,
    mailbox: () => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="presentation"><rect x="20" y="70" width="10" height="24" fill="#cfd6e6"/><path d="M14 70 V44 C14 30 30 22 42 22 C54 22 70 30 70 44 V70 Z" fill="#f6b41e"/><rect x="10" y="66" width="66" height="10" rx="4" fill="#e0a00c"/><path d="M46 32 L58 32 L58 46 L52 40 L46 46 Z" fill="#fff"/></svg>`,
    paperPlane: () => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="presentation"><path d="M10 50 L90 20 L58 90 L48 60 Z" fill="#eaf4fb"/><path d="M10 50 L48 60 L58 90 Z" fill="#cfe4f2"/><path d="M48 60 L90 20" stroke="#9db8cc" stroke-width="1.5"/></svg>`
  };

  const kvSectionIcons = {
    about: ['childReading', 'butterfly'],
    'mission-vision': ['star', 'flower'],
    founder: ['book', 'tree'],
    curriculum: ['alphaBlock', 'pencil'],
    levels: ['toyTrain', 'puzzle'],
    gallery: ['camera', 'balloon'],
    facilities: ['tree', 'bee'],
    team: ['childWaving', 'balloon'],
    fees: ['apple', 'pencil'],
    admissions: ['backpack', 'bell'],
    consultancy: ['crayon', 'book'],
    '': ['kite', 'star']
  };

  fetch(dataUrl).then(response => {
    if (!response.ok) throw new Error('Unable to load site content');
    return response.json();
  }).then(async data => {
    try {
      const galleryResponse = await fetch('/api/gallery');
      if (galleryResponse.ok) {
        const gallery = await galleryResponse.json();
        if (Array.isArray(gallery.images) && gallery.images.length) {
          data.images.gallery = gallery.images.map(item => ({
            id: item.id,
            title: item.title,
            category: item.category?.name || item.category || 'Daily Life',
            description: item.description || '',
            src: item.imageUrl || item.src,
            thumbnail: item.thumbnailUrl || item.thumbnail || item.imageUrl || item.src,
            featured: Boolean(item.featured)
          })).filter(item => item.src);
        }
      }
    } catch (error) {
      console.info('Using bundled gallery data.');
    }
    start(data);
  }).catch(error => console.error(error));

  function start(data) {
    const site = $('#site');
    injectStyles();
    const logo = () => `<img class="kv-birds" src="${data.images.logo}" alt="Kindervale Preschool" style="width:100%;height:100%;object-fit:contain" width="48" height="48">`;
    const logoLockup = () => `<a href="${homePath}#home" class="logo" data-scroll-target="home" aria-label="Kindervale Preschool home"><div class="mark">${logo()}</div><div>KINDERVALE<small>PRESCHOOL</small></div></a>`;
    const image = (entry, extra = '') => `<img src="${entry.src}" alt="${escape(entry.title)}" loading="lazy" decoding="async" ${extra}>`;
    const hashLink = (hash, label, className = '') => `<a href="${homePath}${hash}" data-scroll-target="${hash.slice(1)}" class="${className}">${escape(label)}</a>`;
    const navSections = [
      ['about', 'About Us'],
      ['founder', "Our Founder"],
      ['curriculum', 'Curriculum'],
      ['levels', 'Our Levels'],
      ['facilities', 'School Facilities'],
      ['admissions', 'Admissions'],
      ['fees', 'Fee Structure'],
      ['team', 'Our Team'],
      ['consultancy', 'Consultancy']
    ];
    const sectionIds = navSections.map(([id]) => id).filter(id => id !== 'home');
    const pageTitle = path => path === '/' ? 'Kindervale Preschool | DHA-II Islamabad' : `${path.split('/').filter(Boolean).map(part => part.replaceAll('-', ' ')).map(part => part[0].toUpperCase() + part.slice(1)).join(' | ')} | Kindervale Preschool`;

    /* ─── Styles Injection ─── */
    function injectStyles() {
      if ($('#kv-base-styles')) return;
      const s = document.createElement('style');
      s.id = 'kv-base-styles';
      
      // Original Base CSS (Preserving hero, layout, nav exactly)
      s.textContent = `
        .hero{position:relative;overflow:hidden}
.hero-bottom-clouds{position:absolute;left:0;right:0;bottom:0;height:min(46%,260px);pointer-events:none;z-index:2}
.hbc-puff{position:absolute;bottom:-18px;border-radius:999px;background:#dde2e8;filter:drop-shadow(0 -6px 10px rgba(31,66,87,.08))}
.hbc-puff.p1{left:0%;width:520px;height:210px;bottom:-50px;background:#d3d9e0}
.hbc-puff.p2{left:5%;width:670px;height:250px;bottom:-30px;background:#dde2e8}
.hbc-puff.p3{left:10%;width:510px;height:290px;bottom:-20px;background:#e6e9ee}
.hbc-puff.p4{left:28%;width:480px;height:320px;bottom:-10px;background:#dde2e8}
.hbc-puff.p5{left:55%;width:310px;height:290px;bottom:-20px;background:#e6e9ee}
.hbc-puff.p6{left:68%;width:670px;height:250px;bottom:-30px;background:#dde2e8}
.hbc-puff.p7{right:52%;left:auto;width:320px;height:310px;bottom:-40px;background:#d3d9e0}
.hero .hero-cta{position:relative;z-index:3}
.hero-lockup{display:flex;flex-direction:column;align-items:center;text-align:center;color:#fff;padding:0 20px}
.brand-title{font-size:clamp(40px,7vw,76px);letter-spacing:6px;margin-right:-6px;margin-bottom:12px;font-weight:400;margin-top:0;}
.brand-sub{font-family:'Montserrat',Arial,sans-serif;font-size:clamp(14px,2vw,22px);letter-spacing:clamp(18px,3.5vw,46px);margin-right:calc(clamp(18px,3.5vw,36px) * -1);font-weight:400;margin-bottom:34px;text-transform:uppercase}
.brand-tag{display:flex;align-items:center;justify-content:center;gap:10px;font-family:'Montserrat',Arial,sans-serif;font-size:clamp(16px,2vw,22px);font-weight:400;white-space:nowrap}
.brand-tag:empty{display:none}
.brand-tag .ln{display:block;height:1px;width:clamp(80px,12vw,160px);background:#fff}
@media(max-width:767px){.hero-bottom-clouds{height:min(52%,220px)}.hbc-puff{transform:scale(.82)}}
@media(prefers-reduced-motion:reduce){.hbc-puff{transition:none}}
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400&display=swap');
        html,body{max-width:100%;overflow-x:hidden;font-family:'Montserrat',Arial,sans-serif;font-weight:400}h1,h2,h3,h4,h5,h6,.logo,.brand-title,.eyebrow{font-family:'Quincy CF',Georgia,'Times New Roman',serif;font-weight:400}img,svg{max-width:100%}body.modal-open{overflow:hidden}.nav-toggle{display:none}
        .playful-band{position:relative;overflow:hidden;background:#FFFFFF;padding:34px 0 16px}
        .playful-band::before,.playful-band::after{display:none !important;}
        .rolling-gallery{display:flex;width:max-content;gap:22px;animation:rollGallery 36s linear infinite;will-change:transform}
        .rolling-gallery:hover{animation-play-state:paused}
        .rolling-item{flex:0 0 clamp(150px,20vw,245px);aspect-ratio:1;border-radius:999px;padding:6px;background:conic-gradient(from 180deg,var(--yellow),#fff,var(--teal),#fdecf1,var(--yellow));box-shadow:0 12px 28px rgba(46,90,117,.16)}
        .rolling-item img{width:100%;height:100%;border-radius:inherit;object-fit:cover;border:4px solid #fff;display:block}
        #about .container{max-width:1120px}
        #about .sec-head{display:none}
        #about .about-layout{display:grid;grid-template-columns:minmax(340px,.92fr) minmax(360px,1fr);gap:clamp(62px,8vw,110px);align-items:start;min-height:430px}
        #about .about-images{display:grid;grid-template-rows:repeat(2,188px);row-gap:28px;padding-top:8px}
        #about .about-image{width:188px;height:188px;border-radius:50%;overflow:hidden;box-shadow:0 18px 38px rgba(31,66,87,.16);animation:aboutImageIn .76s ease both}
        #about .about-image img{width:100%;height:100%;display:block;object-fit:cover;border-radius:50%}
        #about .about-image:first-child{justify-self:start;margin-left:clamp(24px,5vw,58px)}
        #about .about-image:nth-child(2){justify-self:end;margin-right:clamp(8px,3vw,22px);animation-delay:.12s}
        #about .about-copy{max-width:475px;color:var(--teal-dark)}
        #about .about-copy h2{font-size:clamp(30px,3.1vw,42px);line-height:1.08;color:var(--navy);font-weight:900;text-align:center;margin:0 0 34px;animation:aboutHeadingIn .68s ease both}
        #about .about-copy p{color:var(--teal-dark);font-size:17px;line-height:1.42;margin:0;animation:aboutTextIn .72s ease both}
        #about .about-copy p + p{margin-top:56px;animation-delay:.14s}
        #about .about-copy strong{font-weight:900;color:var(--teal-dark)}
        .gallery-highlights{--circle:165px;--ring:5px;display:flex;gap:24px;overflow-x:auto;overflow-y:hidden;padding:4px 2px 18px;margin-bottom:26px;scrollbar-width:thin;text-align:center;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch}
        .gallery-highlight{appearance:none;background:transparent;border:0;text-align:center;color:var(--navy);font:inherit;font-weight:800;cursor:pointer;min-width:128px;padding:0;display:flex;flex-direction:column;align-items:center;gap:20px;outline:30;transition:transform .22s ease,opacity .22s ease}
        .highlight-cover{width:var(--circle);height:var(--circle);border-radius:999px;padding:var(--ring);background:conic-gradient(from 210deg,var(--yellow),#ffffff,var(--teal));box-shadow:0 10px 30px rgba(31,66,87,.14);margin:0 auto;transition:transform .22s ease,box-shadow .22s ease,filter .22s ease, background .22s ease;scroll-snap-align:start;position:relative}
        .highlight-cover::after{content:"";position:absolute;inset:var(--ring);border-radius:inherit;box-shadow:inset 0 0 0 1px rgba(255,255,255,.55);pointer-events:none}
        .highlight-cover img{width:100%;height:100%;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,.95);display:block;transform:translateZ(0);transition:transform .22s ease,filter .22s ease,opacity .25s ease;opacity:0}
        .highlight-cover img.is-loaded{opacity:1}
        .gallery-highlight:hover .highlight-cover,.gallery-highlight:focus-visible .highlight-cover{transform:translateY(-4px) scale(1.03);box-shadow:0 16px 44px rgba(31,66,87,.22);filter:saturate(1.06)}
        .gallery-highlight:hover .highlight-cover img,.gallery-highlight:focus-visible .highlight-cover img{transform:scale(1.02)}
        .gallery-highlight:active .highlight-cover{transform:translateY(-2px) scale(1.02)}
        .gallery-highlight:focus-visible .highlight-label{text-decoration:underline}
        .highlight-label{display:block;font-size:14px;line-height:1.25;max-width:12ch}
        .gallery-note{text-align:center;color:var(--muted);margin-top:4px}
        .lightbox.gallery-viewer{grid-template-rows:auto 1fr auto;gap:14px}
        .gallery-viewer-title{color:#fff;text-align:center;font-size:18px;font-weight:800}
        .gallery-stage{display:flex;align-items:center;justify-content:center;gap:16px;width:min(1060px,96vw)}
        .gallery-stage img{max-width:min(820px,78vw);max-height:72vh;transition:transform .2s ease,opacity .25s ease;opacity:0}
        .gallery-stage img.is-loaded{opacity:1}
        .gallery-stage img.is-zoomed{transform:scale(1.35);cursor:zoom-out}
        .gallery-nav{width:46px;height:46px;border-radius:50%;border:2px solid rgba(255,255,255,.7);background:rgba(255,255,255,.12);color:#fff;font-size:34px;line-height:1;cursor:pointer;transition:transform .2s ease,background .2s ease,border-color .2s ease}
        .gallery-nav:hover{background:rgba(255,255,255,.18);transform:translateY(-1px)}
        .gallery-counter{color:#fff;font-weight:800;text-align:center}
        .admission-modal{position:fixed;inset:0;z-index:100;background:rgba(31,66,87,.86);display:grid;place-items:center;padding:28px}
        .admission-modal[hidden]{display:none}
        .admission-close{position:absolute;top:18px;right:22px;width:44px;height:44px;border-radius:50%;border:2px solid rgba(255,255,255,.7);background:rgba(255,255,255,.12);color:#fff;font-size:30px;line-height:1;cursor:pointer;transition:transform .2s ease,background .2s ease}
        .admission-close:hover{transform:scale(1.04);background:rgba(255,255,255,.18)}
        .admission-dialog{background:#fff;border-radius:var(--radius);box-shadow:var(--shadow);border:1px solid var(--line);width:min(980px,94vw);max-height:88vh;overflow:auto;padding:24px}
        .admission-form fieldset{border:1px solid var(--line);border-radius:14px;padding:18px;margin:0 0 18px}
        .admission-form legend{color:var(--navy);font-weight:800;padding:0 8px}
        .form-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
        .form-field{display:flex;flex-direction:column;gap:6px}
        .form-field label,.check-field{font-size:13px;font-weight:700;color:var(--navy)}
        .form-field input,.form-field select,.form-field textarea{width:100%;border:1px solid var(--line);border-radius:12px;padding:10px 12px;font:inherit;color:var(--ink);background:#fff;transition:border-color .2s ease,box-shadow .2s ease,transform .2s ease,background .2s ease}
        .form-field input:focus,.form-field select:focus,.form-field textarea:focus{outline:none;border-color:rgba(46,90,117,.5);box-shadow:0 0 0 4px rgba(246,180,30,.16);background:#fff}
        .form-field textarea{min-height:84px;resize:vertical}
        .form-field.has-error input,.form-field.has-error select,.form-field.has-error textarea{animation:fieldShake .22s ease}
        .photo-upload{display:grid;grid-template-columns:140px minmax(0,1fr);gap:16px;align-items:center;border:1px dashed rgba(46,90,117,.35);border-radius:16px;padding:14px;background:#fbfcfd}
        .photo-preview{width:128px;aspect-ratio:1;border-radius:16px;display:grid;place-items:center;background:#eaf4fb;color:var(--muted);font-size:13px;text-align:center;overflow:hidden;border:4px solid #fff;box-shadow:0 8px 20px rgba(46,90,117,.12)}
        .photo-preview img{width:100%;height:100%;object-fit:cover}
        .photo-help{color:var(--muted);font-size:12px;margin-top:4px}
        .check-field{display:flex;gap:8px;align-items:flex-start;margin-top:10px}
        .form-actions{display:flex;gap:12px;flex-wrap:wrap;justify-content:flex-end}
        .form-message{color:var(--teal-dark);font-weight:800;margin:0 0 14px}
        .form-message.is-error{color:#b42318}
        .form-error{color:#b42318;font-size:12px;min-height:16px}
        .form-source{margin-top:4px;color:var(--muted);font-size:13px}
        .nav{position:sticky;top:0;z-index:60;background:rgba(46,90,117,.98);backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,255,255,.12);transition:background-color .25s ease,backdrop-filter .25s ease,box-shadow .25s ease,opacity .25s ease}
        .nav.is-scrolled{background:rgba(46,90,117,1);box-shadow:0 10px 28px rgba(31,66,87,.22)}
        .nav:hover{background:rgba(46,90,117,1)}
        .nav-inner{position:relative;z-index:1}
        .nav-links a{transition:color .2s ease,opacity .2s ease,transform .2s ease}
        .nav-inner, nav{overflow:visible!important}
        .nav-links .nav-cta{display:inline-flex;align-items:center;justify-content:center;padding:10px 24px;border-radius:999px!important;background:linear-gradient(135deg, #FFB74D, #FF8A65)!important;color:#FFF!important;border:none!important;box-shadow:0 8px 20px rgba(255, 138, 101, 0.4)!important;text-decoration:none;transform:translateZ(0);margin-top:0}
        .nav-links .nav-cta:hover{filter:brightness(1.1)!important;transform:translateY(-2px) translateZ(0);box-shadow:0 12px 28px rgba(255, 138, 101, 0.6)!important}
        .btn{border-radius:999px;transition:transform .18s ease,box-shadow .18s ease,background-color .18s ease,filter .18s ease}
        .card,.level,.panel{transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease}
        .card.is-interactive-surface:hover,.level:hover,.panel.is-interactive-surface:hover{transform:translateY(-4px);box-shadow:0 16px 38px rgba(51,65,92,.12)}
        .level img,.card img,.panel img{transition:transform .28s ease,opacity .28s ease}
        .team-card{display:flex;align-items:center;gap:18px;min-height:150px}
        .team-photo{width:80px;height:80px;flex:0 0 80px;border-radius:50%;border:1px solid rgba(46,90,117,.16);background:#f1f3f5;color:#8a94a3;display:grid;place-items:center;overflow:hidden;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.5px}
        .team-photo img{width:100%;height:100%;display:block;object-fit:cover;border-radius:50%}
        .team-info{min-width:0;flex:1}
        .team-card h3,.team-card p{overflow-wrap:anywhere}
        .team-card h3{margin-bottom:8px}
        .lightbox.gallery-viewer{box-sizing:border-box}
        .gallery-stage{display:grid;grid-template-columns:46px minmax(0,1fr) 46px;align-items:center;width:min(1060px,96vw)}
        .gallery-stage img{grid-column:2;justify-self:center;max-width:min(820px,100%)}
        #team .team-more{position:relative;overflow:hidden;max-height:0;opacity:0;display:grid;gap:28px;transition:max-height .45s cubic-bezier(.4,0,.2,1),opacity .4s ease}
#team .team-more.is-open{opacity:1;padding-top:0}
#team .team-more .team-chart-row{opacity:0;transform:translateY(14px);transition:opacity .4s ease,transform .4s ease}
#team .team-more.is-open .team-chart-row{opacity:1;transform:translateY(0)}
#team .team-more.is-open .team-chart-row:nth-child(2){transition-delay:.06s}
#team .team-more.is-open .team-chart-row:nth-child(3){transition-delay:.12s}
#team .team-more.is-open .team-chart-row:nth-child(4){transition-delay:.18s}
#team .team-toggle{display:flex;align-items:center;justify-content:center;gap:8px;margin:32px auto 0;min-height:48px;padding:12px 30px}
#team .team-toggle-icon{display:inline-block;transition:transform .3s ease}
#team .team-toggle[aria-expanded="true"] .team-toggle-icon{transform:rotate(180deg)}
@media(max-width:520px){#team .team-toggle{width:100%;max-width:340px}}
@media(prefers-reduced-motion:reduce){#team .team-more,#team .team-more .team-chart-row,#team .team-toggle-icon{transition:none}}
        @keyframes fieldShake{0%{transform:translateX(0)}30%{transform:translateX(-3px)}60%{transform:translateX(3px)}100%{transform:translateX(0)}}
        @keyframes rollGallery{from{transform:translate3d(0,0,0)}to{transform:translate3d(calc(-50% - 11px),0,0)}}
        @media(max-width:1024px){.nav-inner{gap:12px}.nav-toggle{display:inline-flex;width:46px;height:46px;border:1px solid rgba(255,255,255,.24);border-radius:14px;background:rgba(255,255,255,.1);align-items:center;justify-content:center;flex-direction:column;gap:5px;cursor:pointer;flex:0 0 auto}.nav-toggle span{display:block;width:22px;height:2px;border-radius:2px;background:#fff;transition:transform .22s ease,opacity .22s ease}nav.menu-open .nav-toggle span:nth-child(1){transform:translateY(7px) rotate(45deg)}nav.menu-open .nav-toggle span:nth-child(2){opacity:0}nav.menu-open .nav-toggle span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}.nav-links{position:absolute;top:100%;left:0;right:0;display:flex;flex-direction:column;gap:0;max-height:0;overflow-y:hidden;overflow-x:visible;padding:0px 0px;background:rgba(46,90,117,.98);box-shadow:0 18px 28px rgba(31,66,87,.2);white-space:normal;transition:max-height .28s ease,padding .28s ease}.nav-links a{font-size:15px;text-align:left;padding:8px 4px;border-bottom:1px solid rgba(255,255,255,.12)}.nav-links a.active{color:var(--yellow)}.nav-links .nav-cta{justify-content:center;margin-top:10px;border-bottom:0}nav.menu-open .nav-links{max-height:75vh;overflow-y:auto;padding:10px 22px 18px}}
        @media(max-width:880px){.level img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:14px;border:4px solid rgba(255,255,255,.7);margin-bottom:16px}.form-grid{grid-template-columns:1fr}}
        @media(max-width:980px){#about .about-layout{grid-template-columns:minmax(260px,.8fr) minmax(330px,1fr);gap:42px}#about .about-images{grid-template-rows:repeat(2,160px)}#about .about-image{width:160px;height:160px}#about .about-copy p{font-size:16px}}
        @media(max-width:880px){.team-photo{width:70px;height:70px;flex-basis:70px}}
        @media(max-width:767px){.container{padding:0 16px}.nav-inner{padding:10px 16px}.logo{font-size:14px;letter-spacing:1px;min-width:0}.logo .mark{width:44px;height:44px}.logo small{letter-spacing:4px}.hero{padding:48px 0 105px}.brand-title{font-size:clamp(34px,12vw,44px);letter-spacing:5px;margin-right:-5px;padding-left:0;overflow-wrap:anywhere}.brand-sub{font-size:14px;letter-spacing:18px;margin-right:-18px;padding-left:0}.brand-tag{font-size:16px;gap:12px;margin-bottom:30px;flex-wrap:nowrap}.brand-tag .ln{width:70px}.hero-cta,.form-actions{align-items:stretch;flex-direction:column}.btn{min-height:44px;justify-content:center;padding:12px 20px}.sec-head{margin-bottom:28px}.sec-head h2{font-size:28px;line-height:1.2}section.pad{padding:48px 0}.cards,.levels,.eyfs,.gallery{grid-template-columns:1fr;gap:18px}.card,.level,.panel{padding:22px}.level img{width:calc(100% + 44px);margin:-22px -22px 16px}.team-card{gap:16px;min-height:126px}.team-photo{width:60px;height:60px;flex-basis:60px;font-size:11px}.rolling-gallery{gap:14px;animation-duration:28s}.rolling-item{flex-basis:132px}.photo-upload{grid-template-columns:1fr}.photo-preview{width:min(100%,180px);margin:auto}.gallery-highlights{gap:16px;--circle:92px;--ring:5px}.gallery-highlight{min-width:104px;gap:8px}.highlight-label{font-size:13px}.gallery-stage{grid-template-columns:40px minmax(0,1fr) 40px;gap:0;width:100%}.gallery-stage img{max-width:100%;max-height:68vh}.gallery-nav{width:40px;height:40px;font-size:28px}.gcircle img{width:min(68vw,220px);height:min(68vw,220px)}.strip{margin:0;padding:32px 18px;border-radius:20px}.strip h2{font-size:25px}.foot-grid{gap:20px}.admission-modal{padding:12px;align-items:start;overflow:auto}.admission-dialog{width:100%;max-height:none;margin:58px 0 12px;padding:18px;border-radius:16px}.admission-close{top:10px;right:12px}.admission-form fieldset{padding:14px}}
        main{background:linear-gradient(180deg,#fbfcfd 0%,#f7fbff 34%,#fffaf0 68%,#fbfcfd 100%)}
        main section.pad{position:relative;overflow:hidden;padding:86px 0;background:radial-gradient(circle at 8% 18%,rgba(246,180,30,.12) 0 52px,transparent 53px),radial-gradient(circle at 92% 12%,rgba(46,90,117,.10) 0 64px,transparent 65px),linear-gradient(180deg,rgba(255,255,255,.74),rgba(234,244,251,.62))}
        main section.pad:nth-of-type(even){background:radial-gradient(circle at 12% 80%,rgba(255,158,196,.12) 0 58px,transparent 59px),radial-gradient(circle at 88% 70%,rgba(57,194,180,.12) 0 68px,transparent 69px),linear-gradient(180deg,rgba(255,250,240,.82),rgba(255,255,255,.9))}
        main section.pad::before{content:"";position:absolute;left:0;right:0;top:0;height:22px;background:linear-gradient(135deg,transparent 25%,rgba(46,90,117,.08) 25% 50%,transparent 50% 75%,rgba(246,180,30,.12) 75%);background-size:44px 22px;opacity:.8}
        main section.pad::after{content:"✦";position:absolute;right:clamp(18px,5vw,78px);top:56px;color:rgba(246,180,30,.45);font-size:34px;animation:kvFloat 5.4s ease-in-out infinite;pointer-events:none}
        main section.pad .container{width:min(100% - 48px,1240px);margin-inline:auto}
        main section.pad .sec-head{position:relative;max-width:780px;margin:0 auto 42px;text-align:center}
        main section.pad .sec-head::after{content:"";display:block;width:min(230px,46vw);height:10px;margin:16px auto 0;border-radius:999px;background:linear-gradient(90deg,var(--yellow),#fff3dd,var(--teal),#e2f8f5)}
        main section.pad .eyebrow{display:inline-flex;align-items:center;gap:8px;border-radius:999px;background:rgba(255,255,255,.78);border:1px solid rgba(46,90,117,.12);font-size:30px;box-shadow:0 8px 20px rgba(31,66,87,.08);padding:7px 14px;color:var(--teal-dark)}
        main section.pad .sec-head h2{font-size:clamp(30px,4vw,48px);line-height:1.12;color:var(--navy);margin-top:14px}
        main section.pad .sec-head p{font-size:clamp(16px,1.7vw,19px);line-height:1.75;color:#5f687c;max-width:760px}
        main section.pad .cards,main section.pad .levels,main section.pad .two-col,main section.pad .eyfs,main section.pad .gallery{align-items:stretch;justify-content:center}
        main section.pad .cards{grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:15px}
        main section.pad .two-col{gap:30px}
        main section.pad .card,main section.pad .panel{position:relative;overflow:hidden;border:1px solid rgba(46,90,117,.10);border-radius:28px;background:linear-gradient(145deg,rgba(255,255,255,.96),rgba(255,253,247,.95));box-shadow:0 18px 42px rgba(31,66,87,.11);padding:30px}
        main section.pad .card::before,main section.pad .panel::before{content:"";position:absolute;inset:0 0 auto 0;height:7px;background:linear-gradient(90deg,var(--yellow),#e2f8f5,#fdecf1,var(--teal));opacity:.9}
        main section.pad .card::after,main section.pad .panel::after{content:"";position:absolute;right:18px;bottom:16px;width:46px;height:30px;border-radius:999px;background:rgba(234,244,251,.72);box-shadow:-20px 5px 0 rgba(255,243,221,.8);opacity:.7;pointer-events:none}
        main section.pad .card.is-interactive-surface:hover,main section.pad .panel.is-interactive-surface:hover{transform:translateY(-8px) scale(1.01);box-shadow:0 24px 54px rgba(31,66,87,.16);border-color:rgba(246,180,30,.38)}
        main section.pad .card h3,main section.pad .panel h3{color:var(--teal-dark);font-size:clamp(19px,2vw,24px);line-height:1.2}
        main section.pad .card p,main section.pad .panel p,main section.pad .panel li{color:#606a7d;font-size:16px;line-height:1.72}
        main section.pad .panel img{border-radius:24px!important;border:6px solid rgba(255,255,255,.9);box-shadow:0 18px 36px rgba(31,66,87,.16)}
        #founder .founder-photo{display:block;width:min(100%,220px);aspect-ratio:4/5;margin:0 auto 18px;border-radius:22px!important;object-fit:cover;object-position:center top}
        @media(max-width:767px){#founder .founder-photo{width:min(72vw,190px)}}
        main section.pad .level{position:relative;overflow:hidden;min-height:100%;border-radius:30px;padding:26px 22px 30px;box-shadow:0 20px 44px rgba(31,66,87,.16);transition:transform .24s ease,box-shadow .24s ease,filter .24s ease}
main section.pad .level:hover{transform:translateY(-9px) rotate(-.5deg);box-shadow:0 28px 58px rgba(31,66,87,.22);filter:saturate(1.06)}
main section.pad .level img{display:block;width:calc(100% + 44px);max-width:calc(100% + 44px);margin:-26px -22px 20px;border:0;border-radius:0;box-shadow:none;aspect-ratio:4/3;object-fit:cover;transition:transform .28s ease,opacity .28s ease}
main section.pad .level:hover img{transform:scale(1.035)}
        main section.pad .eyfs div{border-radius:24px;padding:22px 18px;background:linear-gradient(145deg,#fff,#f7fbff);border:1px solid rgba(46,90,117,.10);box-shadow:0 16px 34px rgba(31,66,87,.10);transition:transform .22s ease,box-shadow .22s ease}
        main section.pad .eyfs div:hover{transform:translateY(-6px);box-shadow:0 22px 44px rgba(31,66,87,.15)}
        main section.pad .gcircle{padding:12px 12px 18px;border-radius:24px;background:#fff;box-shadow:0 16px 34px rgba(31,66,87,.12);transform:rotate(-1deg);transition:transform .24s ease,box-shadow .24s ease}
        main section.pad .gcircle:nth-child(even){transform:rotate(1deg)}
        main section.pad .gcircle:hover{transform:translateY(-7px) rotate(0deg);box-shadow:0 24px 48px rgba(31,66,87,.17)}
        main section.pad .gcircle img{border-radius:22px;border:0;width:clamp(150px,20vw,220px);height:clamp(150px,20vw,220px)}
        main section.pad .strip{border-radius:34px;background:linear-gradient(135deg,var(--teal),#3a6a86 52%,#f6b41e);box-shadow:0 22px 54px rgba(31,66,87,.18)}
        .admission-dialog{border-radius:30px;border:1px solid rgba(46,90,117,.12);box-shadow:0 26px 70px rgba(31,66,87,.22)}
        .admission-form fieldset{border-color:rgba(46,90,117,.14);border-radius:22px;background:linear-gradient(145deg,#fff,#fbfcfd)}
        .form-field input,.form-field select,.form-field textarea{border-radius:16px;border-color:rgba(46,90,117,.16)}
        .form-field input:focus,.form-field select:focus,.form-field textarea:focus{transform:translateY(-1px)}
        footer{position:relative;overflow:hidden;background:linear-gradient(145deg,#1f4257,#2e5a75);margin-top:0}
        footer::before{content:"";position:absolute;left:0;right:0;top:0;height:0px;background:linear-gradient(135deg,transparent 25%,rgba(255,255,255,.16) 25% 50%,transparent 50% 75%,rgba(246,180,30,.28) 75%);background-size:44px 18px}
        @keyframes kvFloat{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-12px) rotate(8deg)}}
        @keyframes kvSoftBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes aboutImageIn{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}
        @keyframes aboutHeadingIn{from{opacity:0;transform:translateY(-14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes aboutTextIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @media(max-width:980px){main section.pad{padding:68px 0}main section.pad .two-col{grid-template-columns:1fr}main section.pad .levels{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:767px){main section.pad{padding:56px 0}main section.pad .container{width:min(100% - 32px,1240px);padding:0}main section.pad .cards,main section.pad .levels,main section.pad .eyfs,main section.pad .gallery{grid-template-columns:1fr}main section.pad .card,main section.pad .panel{border-radius:24px;padding:24px}main section.pad .sec-head{margin-bottom:30px}#about .about-layout{display:flex;flex-direction:column;align-items:center;gap:0;text-align:center;min-height:0}#about .about-images{display:contents}#about .about-copy{display:contents;max-width:none}#about .about-copy h2{order:1;margin-bottom:30px;font-size:32px}#about .about-image{width:min(66vw,190px);height:min(66vw,190px);margin:0!important}#about .about-image:first-child{order:2}#about .about-copy p:first-of-type{order:3;margin:26px auto 42px;max-width:34rem;font-size:16px;line-height:1.55}#about .about-image:nth-child(2){order:4}#about .about-copy p:nth-of-type(2){order:5;margin:26px auto 0;max-width:34rem;font-size:16px;line-height:1.55}}
        @media(prefers-reduced-motion:reduce){main section.pad::after{animation:none}#about .about-image,#about .about-copy h2,#about .about-copy p{animation:none}main section.pad .card,main section.pad .panel,main section.pad .level,main section.pad .gcircle,main section.pad .btn,.admission-modal .btn{transition:none}}
        main section.pad{--theme-a:#7dd3fc;--theme-b:#fde68a;--theme-c:#f9a8d4;--theme-d:#99f6e4;font-family:'Montserrat',Arial,sans-serif;padding:94px 0;background:radial-gradient(circle at 8% 18%,color-mix(in srgb,var(--theme-b) 32%,transparent) 0 52px,transparent 53px),radial-gradient(circle at 92% 12%,color-mix(in srgb,var(--theme-a) 26%,transparent) 0 64px,transparent 65px),linear-gradient(180deg,rgba(255,255,255,.82),color-mix(in srgb,var(--theme-a) 18%,#fff))}
        main section.pad.theme-about{--theme-a:#9ddcff;--theme-b:#ffe78a;--theme-c:#ff9ec4;--theme-d:#b9f5d0}
        main section.pad.theme-founder{--theme-a:#d8b4fe;--theme-b:#fde68a;--theme-c:#fecdd3;--theme-d:#a7f3d0}
        main section.pad.theme-mission-vision{--theme-a:#b9e8ff;--theme-b:#fff0a8;--theme-c:#fbcfe8;--theme-d:#a7f3d0}
        main section.pad.theme-curriculum{--theme-a:#c4b5fd;--theme-b:#bbf7d0;--theme-c:#f9a8d4;--theme-d:#fde68a}
        main section.pad.theme-levels{--theme-a:#67e8f9;--theme-b:#fdba74;--theme-c:#fde047;--theme-d:#86efac}
        main section.pad.theme-gallery{--theme-a:#93c5fd;--theme-b:#fde047;--theme-c:#f0abfc;--theme-d:#7dd3fc}
        main section.pad.theme-facilities{--theme-a:#bfdbfe;--theme-b:#bbf7d0;--theme-c:#fde68a;--theme-d:#fecaca}
        main section.pad.theme-team{--theme-a:#ddd6fe;--theme-b:#a7f3d0;--theme-c:#fbcfe8;--theme-d:#fde68a}
        main section.pad.theme-fees{--theme-a:#bae6fd;--theme-b:#fed7aa;--theme-c:#bbf7d0;--theme-d:#fef08a}
        main section.pad.theme-admissions{--theme-a:#bbf7d0;--theme-b:#fef3c7;--theme-c:#fdba74;--theme-d:#bfdbfe}
        main section.pad.theme-consultancy{--theme-a:#a7f3d0;--theme-b:#bfdbfe;--theme-c:#fde68a;--theme-d:#fbcfe8}
        main section.pad::before{height:30px;background:radial-gradient(18px 14px at 18px 2px,#fff 96%,transparent 100%);background-size:36px 30px;opacity:.95;filter:drop-shadow(0 8px 12px rgba(31,66,87,.06))}
        main section.pad::after{content:"";width:58px;height:58px;border-radius:50%;background:radial-gradient(circle at 36% 34%,#fff 0 5px,transparent 6px),linear-gradient(135deg,var(--theme-b),var(--theme-c));box-shadow:0 10px 0 -4px color-mix(in srgb,var(--theme-a) 62%,transparent),-22px 30px 0 -12px var(--theme-d);color:transparent;opacity:.7}
        main section.pad .kv-deco{position:absolute;z-index:0;pointer-events:none;opacity:.72;filter:drop-shadow(0 12px 20px rgba(31,66,87,.08))}
        main section.pad .kv-bg-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;z-index:0;opacity:.13;filter:saturate(1.05) blur(.4px);pointer-events:none;transform:scale(1.02)}
        main section.pad.theme-about .kv-bg-img{opacity:.16;object-position:center 42%}
        main section.pad.theme-levels .kv-bg-img{opacity:.10;object-position:center 54%}
        main section.pad.theme-team .kv-bg-img{opacity:.09;filter:saturate(1.03) blur(1.8px)}
        main section.pad.theme-gallery .kv-bg-img{opacity:.11;filter:saturate(1.12) blur(.8px)}
        main section.pad.theme-admissions .kv-bg-img{opacity:.14;object-position:center 44%}
        main section.pad.theme-consultancy .kv-bg-img,main section.pad.theme-fees .kv-bg-img{opacity:.08}
        main section.pad > .container::before{content:"";position:absolute;inset:-28px;border-radius:38px;background:rgba(255,255,255,.34);backdrop-filter:blur(.2px);z-index:-1;pointer-events:none}
        main section.pad .deco-one{left:clamp(10px,3vw,42px);top:88px;width:86px;height:54px;border-radius:999px;background:#fff;box-shadow:26px -16px 0 -8px #fff,52px 2px 0 -12px #fff;animation:kvDrift 16s ease-in-out infinite}
        main section.pad .deco-two{right:clamp(8px,4vw,52px);bottom:62px;width:72px;height:72px;border-radius:18px;background:linear-gradient(135deg,var(--theme-c),var(--theme-b));transform:rotate(10deg);animation:kvSoftBob 4.8s ease-in-out infinite}
        main section.pad .deco-two::before{content:"";position:absolute;inset:50% 0 auto;height:4px;background:rgba(255,255,255,.68);box-shadow:0 -22px 0 -1px rgba(255,255,255,.4)}
        main section.pad .deco-three{left:8%;bottom:26px;width:120px;height:56px;border-radius:56px 56px 0 0;background:linear-gradient(180deg,var(--theme-d),#6ee7b7);opacity:.5}
        main section.pad .container{position:relative;z-index:1}
        main section.pad .sec-head::after{background:linear-gradient(90deg,var(--theme-b),#fff,var(--theme-d),var(--theme-c),var(--theme-a))}
        main section.pad .eyebrow{color:#25445a;background:rgba(255,255,255,.82)}
        main section.pad .card,main section.pad .panel{border-radius:28px;background:linear-gradient(145deg,rgba(255,255,255,.97),color-mix(in srgb,var(--theme-a) 14%,#fff));border-color:rgba(46,90,117,.10)}
        main section.pad .card:nth-child(3n+2),main section.pad .panel:nth-child(3n+2){background:linear-gradient(145deg,rgba(255,255,255,.98),color-mix(in srgb,var(--theme-b) 18%,#fff))}
        main section.pad .card:nth-child(3n),main section.pad .panel:nth-child(3n){background:linear-gradient(145deg,rgba(255,255,255,.98),color-mix(in srgb,var(--theme-c) 14%,#fff))}
        main section.pad .card::before,main section.pad .panel::before{background:linear-gradient(90deg,var(--theme-b),var(--theme-d),var(--theme-c),var(--theme-a))}
        main section.pad .card-icon{display:none}
        #gallery .highlight-cover{border-radius:24px;background:linear-gradient(135deg,var(--theme-b),#fff,var(--theme-a));transform:rotate(-2deg)}
        #gallery .gallery-highlight:nth-child(even) .highlight-cover{transform:rotate(2deg)}
        #gallery .highlight-cover img{border-radius:18px;border:5px solid #fff}
        #gallery .highlight-cover::before{content:"";position:absolute;left:50%;top:-7px;width:42px;height:16px;border-radius:4px;background:rgba(255,255,255,.72);transform:translateX(-50%) rotate(-3deg);box-shadow:0 2px 6px rgba(31,66,87,.08);z-index:2}
        #team .team-card{background:linear-gradient(145deg,#fff,color-mix(in srgb,var(--theme-c) 16%,#fff));border-color:color-mix(in srgb,var(--theme-a) 38%,#fff)}
        #team .team-photo{border:5px solid #fff;box-shadow:0 10px 24px rgba(31,66,87,.14);background:linear-gradient(135deg,var(--theme-d),#fff)}
        #team .team-chart{display:grid;gap:28px;max-width:1120px;margin-inline:auto}
        #team .team-chart-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:20px;position:relative}
        #team .team-chart-row:not(:first-child)::before{content:"";position:absolute;left:50%;top:-22px;width:2px;height:18px;background:rgba(46,90,117,.22)}
        #team .team-node{min-height:0;text-align:center;padding:24px 20px}
        #team .team-node h3{margin:0 0 10px;color:var(--teal-dark);font-size:clamp(18px,1.8vw,22px);line-height:1.2}
        #team .team-node p{margin:0;color:#606a7d;font-size:16px;line-height:1.55}
        #team .team-node.lead{max-width:340px;margin-inline:auto;background:linear-gradient(145deg,#fff,color-mix(in srgb,var(--theme-c) 22%,#fff))}
        #team .team-node.group{grid-column:1/-1;text-align:left}
        #team .team-node.group ul{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:8px 18px;margin:0;padding-left:20px}
        #team .team-node.group li{color:#606a7d;line-height:1.55}
        @media(max-width:767px){#team .team-chart{gap:20px}#team .team-chart-row{gap:16px}#team .team-chart-row::before{display:none}#team .team-node.group{text-align:center}#team .team-node.group ul{display:block;text-align:left}}
        #admissions .panel{border-style:dashed;border-width:2px}
        #admissions .panel::after{width:52px;height:52px;border-radius:12px;background:linear-gradient(135deg,#fff,var(--theme-b));box-shadow:-18px 20px 0 -10px var(--theme-c)}
        footer{background:radial-gradient(circle at 8% 24%,rgba(246,180,30,.22) 0 72px,transparent 73px),radial-gradient(circle at 88% 72%,rgba(255,158,196,.16) 0 82px,transparent 83px),linear-gradient(145deg,#1f4257,#2e5a75)}
        @keyframes kvDrift{0%,100%{transform:translateX(0)}50%{transform:translateX(18px)}}
        @media(max-width:767px){main section.pad .kv-deco{opacity:.34;transform:scale(.72)}main section.pad .deco-one{left:-24px;top:58px}main section.pad .deco-two{right:-24px;bottom:24px}main section.pad .deco-three{display:none}}
        @media(prefers-reduced-motion:reduce){main section.pad .kv-deco{animation:none}}
        .kv-expand{position:relative;overflow:hidden;max-height:var(--kv-expand-height,none);transition:max-height .36s cubic-bezier(.4,0,.2,1);overflow-wrap:anywhere}
        .kv-expand::after{content:"";position:absolute;left:0;right:0;bottom:0;height:3.6em;background:linear-gradient(to bottom,rgba(255,255,255,0),var(--kv-expand-bg,#fff));opacity:1;pointer-events:none;transition:opacity .22s ease}
        .kv-expand.is-expanded{overflow:visible}
        .kv-expand.is-expanded::after,.kv-expand:not(.is-collapsible)::after{opacity:0}
        .kv-expand > *:first-child{margin-top:0}
        .kv-expand > *:last-child{margin-bottom:0}
        .kv-expand-toggle{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;margin-top:8px;border:0;background:transparent;color:var(--teal-dark);font:inherit;font-weight:800;padding:8px 0 0;cursor:pointer;outline-offset:4px}
        .kv-expand-toggle::after{content:"";width:8px;height:8px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg);transition:transform .22s ease}
        .kv-expand-toggle[aria-expanded="true"]::after{transform:rotate(225deg)}
        .kv-expand-toggle:focus-visible{border-radius:8px;outline:3px solid rgba(246,180,30,.42)}
        .card,.panel,.sec-head{min-width:0}
        .container{width:min(100% - 44px,1150px);margin:0 auto}
        @media(min-width:1366px){.container,.nav-inner{max-width:1160px}}
        main section.pad .kv-illustration,footer .kv-illustration{width:clamp(44px,5.6vw,74px);height:clamp(44px,5.6vw,74px);opacity:.4;transform-origin:50% 50%}
        main section.pad .kv-illustration svg,footer .kv-illustration svg{width:100%;height:100%;display:block;filter:drop-shadow(0 10px 16px rgba(31,66,87,.12))}
        main section.pad .deco-four{right:clamp(10px,4vw,54px);top:74px}
        main section.pad .deco-five{left:clamp(6px,3vw,32px);bottom:72px}
        main section.pad:nth-of-type(even) .deco-four{animation-duration:7.4s;animation-delay:.6s}
        main section.pad:nth-of-type(even) .deco-five{animation-duration:6.3s;animation-delay:.2s}
        main section.pad:nth-of-type(3n) .deco-four{animation-delay:1.15s}
        main section.pad:nth-of-type(3n) .deco-five{animation-delay:.85s}
        @keyframes kvIllFloat{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-11px) rotate(3deg)}}
        @keyframes kvIllSway{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(7deg)}}
        @keyframes kvIllBounce{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-7px) scale(1.05)}}
        .anim-float{animation:kvIllFloat 6.2s ease-in-out infinite}
        .anim-sway{animation:kvIllSway 5.4s ease-in-out infinite}
        .anim-bounce{animation:kvIllBounce 4.6s ease-in-out infinite}
        footer{position:relative}
        footer .container{position:relative;z-index:1}
        footer .kv-illustration{position:absolute;z-index:0;pointer-events:none;opacity:.5}
        footer .kv-illustration svg{filter:drop-shadow(0 8px 14px rgba(0,0,0,.28))}
        footer .mailbox-deco{left:clamp(10px,4vw,40px);bottom:22px}
        footer .paperplane-deco{right:clamp(10px,4vw,50px);top:20px}
        @media(max-width:767px){main section.pad .kv-illustration,footer .kv-illustration{width:clamp(34px,10vw,52px);height:clamp(34px,10vw,52px)}}
        @media(max-width:520px){main section.pad .deco-four,main section.pad .deco-five,footer .kv-illustration{display:none}}
        @media(prefers-reduced-motion:reduce){.anim-float,.anim-sway,.anim-bounce{animation:none}}
        
        /* =========================================================
           ✨ MAGICAL PRESCHOOL REDESIGN (SCOPED FROM ABOUT ONWARD)
           ========================================================= */
           
        /* Scope new playful fonts ONLY to main content and footer */
        main, footer, .admission-modal {
          font-family: 'Montserrat', Arial, sans-serif;
          font-weight: 400;
        }
        main section.pad h2, main section.pad h3, footer h5 {
          font-family: 'Quincy CF', Georgia, 'Times New Roman', serif;
          font-weight: 400;
          letter-spacing: 0.5px;
        }

        /* 🌈 Dynamic Color Themes for Sections */
        main section.pad.theme-about { background: linear-gradient(180deg, #E1F5FE 0%, #FFF9C4 100%); }
        main section.pad.theme-team { background: linear-gradient(180deg, #F3E5F5 0%, #E8F5E9 100%); }
        main section.pad.theme-levels { background: linear-gradient(180deg, #FFF3E0 0%, #E0F7FA 100%); }
        main section.pad.theme-admissions { background: linear-gradient(180deg, #E8F5E9 0%, #FFF3E0 100%); }
        main section.pad.theme-gallery { background: linear-gradient(180deg, #E3F2FD 0%, #F3E5F5 100%); }
        main section.pad.theme-contact { background: linear-gradient(180deg, #E8F5E9 0%, #E1F5FE 100%); }
        
        /* 🌙 Night Sky Footer */
        footer {
          background: #2e5a75 !important;
          color: #FFF !important;
          overflow: hidden;
          border-top: 8px wavy #FFF;
        }
        
        /* 🧸 Playful Cards & Panels */
        main section.pad .card, main section.pad .panel {
          border-radius: 30px !important;
          border: 6px solid rgba(255, 255, 255, 0.9) !important;
          background: rgba(255, 255, 255, 0.85) !important;
          backdrop-filter: blur(10px);
          box-shadow: 0 16px 32px rgba(0, 0, 0, 0.08) !important;
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.4s ease !important;
        }
        main section.pad .card.is-interactive-surface:hover, main section.pad .panel.is-interactive-surface:hover {
          transform: translateY(-12px) scale(1.03) !important;
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.12) !important;
          border-color: #FFD54F !important;
        }

        /* 🖼️ Magical Gallery (Polaroid Effect) */
        .gcircle img {
          border-radius: 8px !important;
          border: 12px solid #FFF !important;
          border-bottom-width: 40px !important; /* Polaroid chin */
          box-shadow: 4px 12px 24px rgba(0,0,0,0.15) !important;
          transform: rotate(-3deg);
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), z-index 0s !important;
        }
        .gcircle:nth-child(even) img { transform: rotate(4deg); }
        .gcircle:nth-child(3n) img { transform: rotate(-5deg); }
        .gcircle:hover img {
          transform: rotate(0deg) scale(1.15);
          z-index: 10;
          box-shadow: 0 20px 40px rgba(0,0,0,0.25) !important;
        }

        /* 🔘 Bouncy Pill Buttons */
        .hero .btn, main section.pad .btn, .admission-modal .btn {
          border-radius: 999px !important;
          background: linear-gradient(135deg, #FFB74D, #FF8A65) !important;
          color: #FFF !important;
          font-family: 'Montserrat', Arial, sans-serif;
          font-weight: 600;
          border: none !important;
          box-shadow: 0 8px 20px rgba(255, 138, 101, 0.4) !important;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
        }
        .hero .btn:hover, main section.pad .btn:hover, .admission-modal .btn:hover {
          transform: translateY(-5px) scale(1.05) !important;
          box-shadow: 0 12px 28px rgba(255, 138, 101, 0.6) !important;
          filter: brightness(1.1);
        }

        /* 🪄 Animated Background Decor & Scenery */
        .magical-scene {
          position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 0;
        }
        .scenery-cloud {
          position: absolute; background: #FFF; border-radius: 999px; opacity: 0.6;
          animation: driftClouds 40s linear infinite; filter: blur(1px);
        }
        .scenery-rainbow { position: absolute; top: -10%; left: -5%; opacity: 0.3; width: 400px; }
        .scenery-star { position: absolute; animation: twinkle 3s ease-in-out infinite alternate; }
        
        @keyframes driftClouds { from { transform: translateX(-150px); } to { transform: translateX(120vw); } }
        @keyframes twinkle { 0% { opacity: 0.3; transform: scale(0.8); } 100% { opacity: 1; transform: scale(1.2); } }

        /* =========================================================
           📖 READ MORE / READ LESS — reusable info-card component
           Used by Our Mission / Our Vision / Our Values, and any
           other short summary card that needs progressive disclosure.
           ========================================================= */
        main section.pad .card.kv-info-card{display:flex;flex-direction:column}
        main section.pad .card.kv-info-card .kv-info-body{position:relative;overflow:hidden;max-height:4.8em;transition:max-height .35s cubic-bezier(.4,0,.2,1)}
        main section.pad .card.kv-info-card .kv-info-body::after{content:"";position:absolute;left:0;right:0;bottom:0;height:1.7em;background:linear-gradient(to bottom,rgba(255,255,255,0),var(--kv-info-bg,#fff));opacity:1;transition:opacity .25s ease;pointer-events:none}
        main section.pad .card.kv-info-card .kv-info-body.is-expanded{overflow:visible}
        main section.pad .card.kv-info-card .kv-info-body.is-expanded::after{opacity:0}
        main section.pad .card.kv-info-card .kv-info-preview,main section.pad .card.kv-info-card .kv-info-full p{margin:0}
        main section.pad .card.kv-info-card .kv-info-full{margin:0}
        main section.pad .card.kv-info-card .kv-info-full ul{margin:0;padding-left:20px;list-style:disc}
        main section.pad .card.kv-info-card .kv-info-full li{margin-bottom:8px}
        main section.pad .card.kv-info-card .kv-info-toggle{display:inline-flex;align-items:center;align-self:flex-start;gap:8px;min-height:44px;margin-top:10px;border:0;background:transparent;color:var(--teal-dark);font:inherit;font-weight:800;padding:8px 0 0;cursor:pointer;outline-offset:4px}
        main section.pad .card.kv-info-card .kv-info-toggle::after{content:"";width:8px;height:8px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg);transition:transform .22s ease}
        main section.pad .card.kv-info-card .kv-info-toggle[aria-expanded="true"]::after{transform:rotate(225deg)}
        main section.pad .card.kv-info-card .kv-info-toggle:focus-visible{border-radius:8px;outline:3px solid rgba(246,180,30,.42)}
        @media(prefers-reduced-motion:reduce){main section.pad .card.kv-info-card .kv-info-body{transition:none}}

        /* =========================================================
           🧸 RESPONSIVE FLOATING DECORATIONS (Overlap Prevention)
           ========================================================= */
        .floating-decor { transition: all 0.3s ease; }
        
        /* Base positioning for desktop */
        .f-bl { bottom: 5%; left: 5%; font-size: 6rem; }
        .f-tr { top: 15%; right: 8%; font-size: 5rem; }
        .f-tl { top: 10%; left: 5%; font-size: 5rem; }
        .f-br { bottom: 10%; right: 8%; font-size: 6rem; }
        .f-ml { top: 40%; left: 8%; font-size: 4rem; }
        .f-mr { top: 40%; right: 8%; font-size: 4rem; }
        
        .footer-teddy { position:absolute; bottom:5%; left:2%; font-size:7rem; filter:drop-shadow(0 10px 15px rgba(0,0,0,0.15)); transform: rotate(-10deg); z-index: 0; pointer-events: none; }

        /* Tablet Adjustments */
        @media (max-width: 1024px) {
           .f-bl, .f-tr, .f-tl, .f-br, .f-ml, .f-mr { font-size: 3.5rem !important; }
           .f-bl { left: 2%; } .f-tr { right: 2%; }
           .f-tl { left: 2%; } .f-br { right: 2%; }
           .f-ml { left: 2%; } .f-mr { right: 2%; }
        }

        /* Mobile Adjustments (Avoid overlapping text) */
        @media (max-width: 767px) {
           .f-bl, .f-tr, .f-tl, .f-br { font-size: 2rem !important; opacity: 0.6; }
           
           /* Force into the 56px section padding space (top/bottom) so they never touch text */
           .f-bl { bottom: 8px !important; left: 10px !important; }
           .f-tr { top: 8px !important; right: 10px !important; }
           .f-tl { top: 8px !important; left: 10px !important; }
           .f-br { bottom: 8px !important; right: 10px !important; }
           
           /* Hide mid-level floaters that would sit right behind text */
           .f-ml, .f-mr { display: none !important; }
           
           .footer-teddy { font-size: 3rem !important; bottom: 10px !important; left: 10px !important; opacity: 0.5; }

           /* Shrink and reposition SVGs to safe zones */
           main section.pad .kv-deco { opacity: 0.15 !important; transform: scale(0.4) !important; }
           main section.pad .deco-one { top: 0px; left: 20px; }
           main section.pad .deco-two { bottom: 0px; right: 20px; }
           main section.pad .deco-three { display: none !important; }
           main section.pad .deco-four { top: 0px; right: 20px; }
           main section.pad .deco-five { bottom: 0px; left: 20px; }
           
           .scenery-cloud { top: 2% !important; opacity: 0.8 !important; height: 30px !important; }
           .scenery-star { opacity: 0.4 !important; font-size: 1.2rem !important; }
        }

        /* Specific iPhone SE / Ultra-narrow viewport (375x667) */
        @media (max-width: 380px) {
           .f-bl, .f-tr, .f-tl, .f-br { font-size: 1.5rem !important; opacity: 0.5; }
           .f-bl { bottom: 4px !important; left: 4px !important; }
           .f-tr { top: 4px !important; right: 4px !important; }
           .f-tl { top: 4px !important; left: 4px !important; }
           .f-br { bottom: 4px !important; right: 4px !important; }
           .footer-teddy { font-size: 2.2rem !important; bottom: 5px !important; left: 5px !important; opacity: 0.3; }
           
           /* Aggressively hide complex shapes to guarantee 100% clean reading */
           main section.pad .kv-deco { display: none !important; } 
           .scenery-cloud, .scenery-star { display: none !important; }
           .mailbox-deco, .paperplane-deco { display: none !important; }
        }

        /* Hero Section - Increase Cloud Visibility */
        .hero .sky-layer .cloud {
          opacity: 0.75 !important;
        }

        /* Footer - Make Clouds Static */
        footer .sky-layer, footer .sky-layer .cloud {
          animation-play-state: paused !important;
        }
      `;
      document.head.appendChild(s);
    }

    function applyExpandableText(root = document) {
      const selector = '[data-expandable-text], .card p, .panel p:not(.desc), .panel ul, .sec-head p';
      const minExpandableCharacters = 520;
      const previewLines = () => {
        const width = window.innerWidth;
        if (width <= 480) return 4.5;
        if (width <= 767) return 5.5;
        if (width <= 1024) return 6.5;
        return 7.5;
      };
      const collapsedHeight = target => {
        const lineHeight = parseFloat(getComputedStyle(target).lineHeight) || 22;
        return Math.round(lineHeight * previewLines());
      };
      const measure = target => {
        const collapsed = collapsedHeight(target);
        const expanded = target.scrollHeight;
        const lineHeight = parseFloat(getComputedStyle(target).lineHeight) || 22;
        return {collapsed, expanded, collapsible: expanded > collapsed + lineHeight};
      };
      const setState = (target, expanded) => {
        const size = measure(target);
        const button = document.getElementById(target.dataset.expandButton);
        target.classList.toggle('is-collapsible', size.collapsible);
        target.classList.toggle('is-expanded', expanded && size.collapsible);
        target.style.setProperty('--kv-expand-height', size.collapsible ? `${expanded ? size.expanded : size.collapsed}px` : 'none');
        if (!button) return;
        button.hidden = !size.collapsible;
        button.textContent = expanded && size.collapsible ? 'Read Less' : 'Read More';
        button.setAttribute('aria-expanded', String(Boolean(expanded && size.collapsible)));
      };

      $$(selector, root).forEach((target, index) => {
        if (target.dataset.expandableReady || target.closest('[data-no-expand]')) return;
        if (!target.hasAttribute('data-expandable-text') && target.closest('[data-expandable-text]')) return;
        if (target.closest('.kv-info-card')) return;
        const plainText = (target.textContent || '').replace(/\s+/g, ' ').trim();
        if (plainText.length < minExpandableCharacters) return;
        const id = target.id || `kv-expand-${Date.now().toString(36)}-${index}`;
        const buttonId = `${id}-toggle`;
        const surface = target.closest('.card,.panel,.sec-head') || target;
        target.id = id;
        target.dataset.expandableReady = 'true';
        target.dataset.expandButton = buttonId;
        target.classList.add('kv-expand');
        target.style.setProperty('--kv-expand-bg', getComputedStyle(surface).backgroundColor || '#fff');
        const button = document.createElement('button');
        button.type = 'button';
        button.id = buttonId;
        button.className = 'kv-expand-toggle';
        button.textContent = 'Read More';
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-controls', id);
        target.after(button);
        requestAnimationFrame(() => setState(target, false));
      });

      if (root.dataset.expandableDelegated) return;
      root.dataset.expandableDelegated = 'true';
      root.addEventListener('click', event => {
        const button = event.target.closest('.kv-expand-toggle');
        if (!button || !root.contains(button)) return;
        const target = document.getElementById(button.getAttribute('aria-controls'));
        if (!target) return;
        const expanded = button.getAttribute('aria-expanded') !== 'true';
        setState(target, expanded);
        if (!expanded) target.closest('.card,.panel,.sec-head')?.scrollIntoView({behavior: 'smooth', block: 'nearest'});
      });

      let resizeFrame = 0;
      window.addEventListener('resize', () => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => {
          $$('.kv-expand', root).forEach(target => setState(target, target.classList.contains('is-expanded')));
        });
      }, {passive: true});
    }

    /* ─────────────────────────────────────────────────────────
       📖 Reusable Read More / Read Less info-card component.
       Renders a short preview by default; expanding swaps in the
       full content (which may be a paragraph or a bullet list)
       and smoothly animates the card's height. Used by Mission,
       Vision and Values today, and safe to reuse for any other
       short-summary card across the site.
       ───────────────────────────────────────────────────────── */
    let kvInfoCardSeq = 0;
    function truncatePreview(text, limit = 100) {
      const clean = String(text).replace(/\s+/g, ' ').trim();
      if (clean.length <= limit) return clean;
      let cut = clean.slice(0, limit);
      const lastSpace = cut.lastIndexOf(' ');
      if (lastSpace > 40) cut = cut.slice(0, lastSpace);
      return `${cut.trim()}…`;
    }
    function infoCard(title, fullContent, {list = false, previewLimit = 100} = {}) {
      const id = `kv-info-${++kvInfoCardSeq}`;
      const previewSource = list ? fullContent.join(' ') : fullContent;
      const previewText = truncatePreview(previewSource, previewLimit);
      const fullMarkup = list
        ? `<ul>${fullContent.map(item => `<li>${escape(item)}</li>`).join('')}</ul>`
        : `<p>${escape(fullContent)}</p>`;
      return `<article class="card kv-info-card"><span class="card-icon" aria-hidden="true"></span><h3>${escape(title)}</h3><div class="kv-info-body" id="${id}"><p class="kv-info-preview">${escape(previewText)}</p><div class="kv-info-full" hidden>${fullMarkup}</div></div><button type="button" class="kv-info-toggle" aria-expanded="false" aria-controls="${id}" data-info-toggle>Read More</button></article>`;
    }
    function wireInfoCards(root = site) {
      if (root.dataset.infoCardsWired) return;
      root.dataset.infoCardsWired = 'true';

      root.addEventListener('click', event => {
        const button = event.target.closest('.kv-info-toggle');
        if (!button || !root.contains(button)) return;
        const body = document.getElementById(button.getAttribute('aria-controls'));
        if (!body) return;
        const preview = $('.kv-info-preview', body);
        const full = $('.kv-info-full', body);
        const card = body.closest('.kv-info-card');
        if (card) body.style.setProperty('--kv-info-bg', getComputedStyle(card).backgroundColor || '#fff');
        const isExpanding = button.getAttribute('aria-expanded') !== 'true';

        if (isExpanding) {
          const collapsedPx = body.getBoundingClientRect().height;
          body.style.maxHeight = `${collapsedPx}px`;
          void body.offsetHeight;
          preview.hidden = true;
          full.hidden = false;
          const targetPx = body.scrollHeight;
          requestAnimationFrame(() => {
            body.style.maxHeight = `${targetPx}px`;
            body.classList.add('is-expanded');
          });
          button.textContent = 'Read Less';
          button.setAttribute('aria-expanded', 'true');
        } else {
          const currentPx = body.scrollHeight;
          body.style.maxHeight = `${currentPx}px`;
          void body.offsetHeight;
          body.classList.remove('is-expanded');
          requestAnimationFrame(() => {
            body.style.maxHeight = '';
          });
          button.textContent = 'Read More';
          button.setAttribute('aria-expanded', 'false');
        }
      });

      root.addEventListener('transitionend', event => {
        if (event.propertyName !== 'max-height') return;
        const body = event.target.closest?.('.kv-info-body');
        if (!body) return;
        if (!body.classList.contains('is-expanded')) {
          const preview = $('.kv-info-preview', body);
          const full = $('.kv-info-full', body);
          if (preview) preview.hidden = false;
          if (full) full.hidden = true;
        }
      });
    }
    function refreshInfoCardHeights(root = site) {
      $$('.kv-info-body.is-expanded', root).forEach(body => {
        body.style.maxHeight = `${body.scrollHeight}px`;
      });
    }

    function header() {
      const links = navSections.map(([id, label]) => hashLink(`#${id}`, label)).join('');
      const portal = `<a href="${data.school.portalUrl}" class="btn btn-primary nav-cta ">Portal</a>`;
      return `<nav aria-label="Primary navigation" style="position:fixed;top:0;right:0;left:0;z-index:60;background:rgba(46,90,117,.98);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 2px 12px rgba(31,66,87,.16);min-height:64px;"><div class="nav-inner" style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:05px 20px;max-width:1400px;margin:0 auto;width:100%;box-sizing:border-box;">${logoLockup()}<button type="button" class="nav-toggle" aria-expanded="false" aria-controls="primary-menu" aria-label="Open navigation"><span></span><span></span><span></span></button><div class="nav-links" id="primary-menu">${links}${portal}</div></div></nav><div aria-hidden="true" style="height:30px"></div>`;}
    
    function hero(title = 'KINDERVALE', subtitle = 'PRESCHOOL', tag = 'Celebrating Childhood', admissionModal = false, admissionSource = 'General Admissions') {
      const admissionCta = admissionModal ? `<button type="button" class="btn btn-primary" data-open-admission data-admission-source="${escape(admissionSource)}">Admissions</button>` : hashLink('#admissions', 'Admissions', 'btn btn-primary');
      const tagContent = tag ? `<span class="ln"></span>${escape(tag)}<span class="ln"></span>` : '';
      return `<header class="hero" id="home" height= 1500px><div class="sky-layer"><div class="cloud c1"></div><div class="cloud c2"></div><div class="cloud c3"></div><div class="cloud c4"></div></div><div class="hero-lockup"><img class="hero-birds" src="${data.images.logo}" alt="" width="120" height="120"><h1 class="brand-title">${escape(title)}</h1><div class="brand-sub">${escape(subtitle)}</div><div class="brand-tag">${tagContent}</div><div class="hero-cta">${admissionCta}</div></div><div class="wave"><img src="/clouds/cloud.png" alt="Decorative clouds" width=100% height=auto></div></header>`;} const sectionDecor = id => {
      const [topIcon, bottomIcon] = kvSectionIcons[id || ''] || kvSectionIcons[''];
      const topSvg = (kvIcons[topIcon] && kvIcons[topIcon]()) || '';
      const bottomSvg = (kvIcons[bottomIcon] && kvIcons[bottomIcon]()) || '';
      return `<span class="kv-deco deco-one" aria-hidden="true"></span><span class="kv-deco deco-two" aria-hidden="true"></span><span class="kv-deco deco-three" aria-hidden="true"></span><span class="kv-deco kv-illustration deco-four anim-float" aria-hidden="true">${topSvg}</span><span class="kv-deco kv-illustration deco-five anim-sway" aria-hidden="true">${bottomSvg}</span>`;
    };
    
    const sectionTheme = id => `theme-${id || 'story'}`;

    /* ─── Magical Preschool Dynamic Decorations Injector ─── */
    const magicalDecor = (id) => {
      let scenery = '';
      let characters = '';

      const createFloat = (emoji, baseClass, extraStyle='') => `<div class="floating-decor ${baseClass}" style="position:absolute; z-index:0; pointer-events:none; filter:drop-shadow(0 10px 15px rgba(0,0,0,0.15)); ${extraStyle}">${emoji}</div>`;

      switch(id) {
        case 'about':
          scenery = `<div class="scenery-cloud" style="width:200px; height:60px; top:5%; left:-10%;"></div>
                     <div class="scenery-cloud" style="width:150px; height:50px; top:85%; animation-duration: 50s;"></div>`;
          characters = `
            ${createFloat('📖', 'f-bl', 'transform: rotate(-10deg);')}
            ${createFloat('🐰', 'f-tr', 'animation: kvIllFloat 6s ease-in-out infinite;')}
            ${createFloat('🧱', 'f-ml', 'transform: rotate(15deg);')}
          `;
          break;
        case 'levels':
          characters = `
            ${createFloat('🧩', 'f-br', 'transform: rotate(10deg);')}
            ${createFloat('🦉', 'f-tl', 'animation: kvIllFloat 6s ease-in-out infinite;')}
            ${createFloat('🚂', 'f-mr', 'transform: rotate(-15deg);')}
          `;
          break;
        case 'team':
          characters = `
            ${createFloat('🎨', 'f-bl')}
            ${createFloat('🐘', 'f-tr', 'animation: kvIllFloat 7.5s ease-in-out infinite;')}
          `;
          break;
        case 'gallery':
          scenery = `<div class="scenery-star" style="top:10%; left:20%; font-size:30px; color:#FFD54F;">✨</div>
                     <div class="scenery-star" style="bottom:10%; right:15%; font-size:40px; color:#CE93D8; animation-delay:1s;">✨</div>`;
          characters = `
            ${createFloat('🎈', 'f-br', 'animation: kvIllFloat 5s ease-in-out infinite;')}
            ${createFloat('🦜', 'f-tl', 'animation: kvIllFloat 6s ease-in-out infinite;')}
          `;
          break;
        case 'admissions':
          characters = `
            ${createFloat('🎒', 'f-bl')}
            ${createFloat('✈️', 'f-ml', 'transform: rotate(25deg);')}
          `;
          break;
        default:
          characters = `${createFloat('⭐', 'f-tr', 'animation: kvIllFloat 6s ease-in-out infinite;')}`;
      }

      return `<div class="magical-scene" aria-hidden="true">${scenery}</div>
              <div class="character-layer" aria-hidden="true">${characters}</div>`;
    };

    /* Magical section wrapper */
    function section(title, eyebrow, body, id = '') { 
  return `<section class="pad ${sectionTheme(id)}" ${id ? `id="${id}"` : ''}>
            ${magicalDecor(id)}
            ${sectionDecor(id)}
            <div class="container" style="position:relative; z-index:10;">
              ${eyebrow ? `<div class="sec-head"><span class="eyebrow">${escape(eyebrow)}</span></div>` : ''}
              ${body}
            </div>
          </section>`; 
}

    function textCard(title, text) { return `<article class="card"><span class="card-icon" aria-hidden="true"></span><h3>${escape(title)}</h3><p>${escape(text)}</p></article>`; }
    function teamNode(member, className = '') {
      const names = member.name.split(',').map(name => name.trim()).filter(Boolean);
      const content = names.length > 1
        ? `<ul>${names.map(name => `<li>${escape(name)}</li>`).join('')}</ul>`
        : `<p>${escape(member.name)}</p>`;
      return `<article class="card team-node ${className}"><span class="card-icon" aria-hidden="true"></span><h3>${escape(member.role)}</h3>${content}</article>`;
    }
    function rollingImages() {
      const items = data.images.gallery.slice(0, 10);
      const repeated = [...items, ...items];
      return `<section class="playful-band" aria-label="Kindervale moments"><div class="rolling-gallery">${repeated.map(entry => `<figure class="rolling-item"><img src="${escape(entry.thumbnail || entry.src)}" alt="${escape(entry.title)}" loading="lazy" decoding="async"></figure>`).join('')}</div></section>`;
    }
    function aboutText(text) {
      return escape(text)
        .replace('Ms. Tazeen Raza', '<strong>Ms. Tazeen Raza</strong>')
        .replace('It is a celebration of childhood.', '<strong>It is a celebration of childhood.</strong>')
        .replace('well-groomed, compassionate and confident members of the community.', '<strong>well-groomed, compassionate and confident members of the community.</strong>');
    }
    function about() {
      const firstImage = data.images.gallery[0] || data.images.gallery[2] || {};
      const secondImage = data.images.gallery[11] || data.images.gallery[10] || data.images.gallery[1] || {};
      return `<section class="pad theme-about" id="about">${magicalDecor('about')}${sectionDecor('about')}<div class="container" style="position:relative; z-index:10;"><div class="about-layout"><div class="about-images"><figure class="about-image"><img src="${escape(firstImage.thumbnail || firstImage.src || data.images.logo)}" alt="${escape(firstImage.title || 'Kindervale classroom activity')}" loading="lazy" decoding="async"></figure><figure class="about-image"><img src="${escape(secondImage.thumbnail || secondImage.src || data.images.logo)}" alt="${escape(secondImage.title || 'Kindervale learning activity')}" loading="lazy" decoding="async"></figure></div><div class="about-copy"><h2>About Us</h2><p>${aboutText(data.about[0])}</p><p>${aboutText(data.about[1])}</p></div></div></div></section>`;
    }
    function missionVision() {
      return section('', 'Mission, Vision & Values', `<div class="cards" data-mobile-collapse>${infoCard('Our Mission', data.mission)}${infoCard('Our Vision', data.vision)}${infoCard('Our Values', data.values, {list: true})}</div>`, 'mission-vision');
    }
    function founder() { return section(' ', "Founder's Message", `<div class="two-col"><div class="panel" data-mobile-collapse><img class="founder-photo" src="${escape(data.images.founder)}" alt="${escape(data.founder.name)}, ${escape(data.founder.title)}" loading="lazy" decoding="async"><h3>${escape(data.founder.name)}</h3><p class="desc">${escape(data.founder.title)}</p><div data-expandable-text>${data.founder.career.map(p => `<p style="margin-top:14px">${escape(p)}</p>`).join('')}</div></div><div class="panel founder-message" data-mobile-collapse><h3>Dear Parents,</h3><div class="founder-message-content" id="founder-message-content" data-expandable-text>${data.founder.message.map(p => `<p style="margin-bottom:14px">${escape(p)}</p>`).join('')}<p><strong>${escape(data.founder.name)}</strong></p></div></div></div>`, 'founder'); }
    function curriculum() { return section('Early Years Foundation Stage', 'Curriculum', `<div class="sec-head" data-mobile-collapse><h3 style="font-size:30px">Early Years Foundation Stage<br></h3><p>${escape(data.curriculum.summary)}</p></div><h2 style="font-size:31px; text-align:center;">Areas of Development</h2><br>${data.curriculum.areas.map((area, index) => `<div style="text-align:center;"><span>${[' ',' ',' ',' ',' ',' ',' '][index]}</span>${escape(area)}</div>`).join('')}`, 'curriculum'); }
    function levels() {
      const colours = ['#ff8a6b,#ffb199','#39c2b4,#6fd8cd','#ffd15c,#ffe08a','#8a7ff0,#afa6ff','#2e5a75,#3a6a86'];
      return section('', 'Our Levels', `<div class="levels">${data.levels.map((level, i) => `<a href="/levels/${level.slug}" data-route class="level" aria-label="Explore ${escape(level.name)}" style="background:linear-gradient(135deg,${colours[i]})"><img src="${level.image}" alt="${escape(level.imageAlt || level.name)}" loading="lazy" decoding="async"><h3>${escape(level.name)}</h3></a>`).join('')}</div>`, 'levels');
    }
    function gallery() {
      const grouped = data.images.gallery.reduce((acc, entry) => {
        const category = entry.category || 'Daily Life';
        acc[category] = acc[category] || [];
        acc[category].push(entry);
        return acc;
      }, {});
      const preferred = ['Campus', 'Classrooms', 'Learning Activities', 'Outdoor Play', 'Events & Celebrations', 'Art & Creativity', 'Sports', 'Daily Life'];
      const categories = [...preferred.filter(category => grouped[category]), ...Object.keys(grouped).filter(category => !preferred.includes(category)).sort()];
      const body = `<div class="gallery-highlights" aria-label="Gallery categories">${categories.map(category => {
        const cover = grouped[category].find(entry => entry.featured) || grouped[category][0];
        return `<button type="button" class="gallery-highlight" data-gallery-category="${escape(category)}" style="text-align=center;"><span class="highlight-cover"><img src="${escape(cover.thumbnail || cover.src)}" alt="" loading="lazy" decoding="async"></span><span class="highlight-label">${escape(category)}</span></button>`;
      }).join('')}</div><p class="gallery-note">Tap a highlight to view the full category.</p>`;
      return section('', 'Gallery', `${body}`, 'gallery');
    }
    function facilities() { return section('', 'School Facilities', `<div class="cards"><article class="card"><span class="card-icon" aria-hidden="true"></span><h3>Our Facilities</h3><ul>${data.facilities.map(item => `<li>${escape(item)}</li>`).join('')}</ul></article></div>`, 'facilities'); }
    function admissions() { return section('', 'Admissions', `<div class="two-col"><article class="panel"><h3>Plan your visit</h3><p>${escape(data.admissions.tour)}</p><p style="margin-top:14px"><strong>Office hours</strong></p>${data.admissions.officeHours.map(item => `<p>${escape(item)}</p>`).join('')}<p style="margin-top:20px"><button type="button" class="btn btn-primary" data-open-admission>Admission Form</button></p></article><article class="panel" data-mobile-collapse><h3>Contact us</h3><p>${escape(data.school.address)}</p><p style="margin-top:12px"><a href="tel:${data.school.phone.replace(/\s/g, '')}">${escape(data.school.phone)}</a></p><p><a href="tel:${data.school.landline.replace(/\s/g, '')}">${escape(data.school.landline)}</a></p><p><a href="mailto:${data.school.email}">${escape(data.school.email)}</a></p></article></div>`, 'admissions'); }
    function fees() { return section('', 'Fee Structure', `<div class="cards">${data.fees.items.map(([label, amount]) => textCard(label, amount)).join('')}</div><div class="panel" style="margin-top:15px"><h3>Notes</h3><ol>${data.fees.notes.map(note => `<li>${escape(note)}</li>`).join('')}</ol></div>`, 'fees'); }
    function team() {
  const byRole = role => data.team.find(member => member.role === role);
  const row = (roles, className = '') => `<div class="team-chart-row">${roles.map(role => teamNode(byRole(role), className)).join('')}</div>`;
  const visibleRows = `${row(['CEO/Principal'], 'lead')}${row(['Admin/HR Head', 'Academic Co-ordinator'])}`;
  const hiddenRows = `${row(['Accounts Manager', 'Operations Head', 'Admissions Officer & Asst. Head', 'Head Teacher'])}${row(['Asst. Accounts Manager', 'Supervisor', 'Cashier', 'Computer Operator'])}${row(['School Teachers', 'Daycare Teachers', 'Asst. Teachers', 'Nannies'], 'group')}${row(['Sports Teacher', 'Driver', 'Office Boy', 'Security Guard'])}`;
  return section('The Kindervale Team', 'Our Team', `<div class="team-chart">${visibleRows}<div class="team-more" id="team-more" inert>${hiddenRows}</div><button type="button" class="btn btn-primary team-toggle" id="team-toggle" aria-expanded="false" aria-controls="team-more">Show More <span class="team-toggle-icon" aria-hidden="true">▼</span></button></div>`, 'team');
}
    function consultancy() { return section('Kindervale Consultancy', 'Consultancy', `<div class="sec-head" data-mobile-collapse><p>${escape(data.consultancy.summary)}</p></div><div class="cards">${data.consultancy.services.map(service => textCard(service[0], service[1])).join('')}</div>`, 'consultancy'); }
    
    function footer() { 
      return `<footer id="contact">
          
                <div class="sky-layer"><div class="cloud c1"></div><div class="cloud c2"></div><div class="cloud c3"></div><div class="cloud c4"></div></div></header>
                <div class="character-layer" aria-hidden="true">
                  <div class="footer-teddy">🧸</div>
                </div>
                <span class="kv-deco kv-illustration mailbox-deco anim-sway" aria-hidden="true">${kvIcons.mailbox()}</span>
                <span class="kv-deco kv-illustration paperplane-deco anim-float" aria-hidden="true">${kvIcons.paperPlane()}</span>
                <div class="container" style="position:relative; z-index:10;">
                  <div class="foot-grid">
                    <div>
                      ${logoLockup()}
                      <p style="margin-top:14px">${escape(data.school.address)}</p>
                    </div>
                    <div>
                      <h5>Contact</h5>
                      <a href="tel:${data.school.phone.replace(/\s/g, '')}">${escape(data.school.phone)}</a>
                      <a href="tel:${data.school.landline.replace(/\s/g, '')}">${escape(data.school.landline)}</a>
                      <a href="mailto:${data.school.email}">${escape(data.school.email)}</a>
                    </div>
                    <div>
                      <h5>Quick Links</h5>
                      ${hashLink('#about', 'About Us')}
                      ${hashLink('#mission-vision', 'Mission & Vision')}
                      ${hashLink('#curriculum', 'Curriculum')}
                      ${hashLink('#levels', 'Our Levels')}
                      ${hashLink('#admissions', 'Admissions')}
                      ${hashLink('#contact', 'Contact')}
                    </div>
                  </div>
                  <div style="text-align:center;opacity:0.5;padding-bottom:20px;padding-top:0px;">© ${new Date().getFullYear()} Kindervale Preschool</div>
               </div>
              </footer>`; 
    }
    
    function home() { return `${hero()}${rollingImages()}${about()}${missionVision()}${founder()}${curriculum()}${levels()}${facilities()}${admissions()}${fees()}${team()}${gallery()}${consultancy()}${footer()}${lightbox()}`; }function lightbox() { return `<div class="lightbox gallery-viewer" role="dialog" aria-modal="true" aria-label="Gallery image viewer" hidden><button type="button" class="lightbox-close" aria-label="Close gallery image">×</button><div class="gallery-viewer-title"></div><div class="gallery-stage"><button type="button" class="gallery-nav gallery-prev" aria-label="Previous image">‹</button><img src="" alt=""><button type="button" class="gallery-nav gallery-next" aria-label="Next image">›</button></div><p></p><div class="gallery-counter" aria-live="polite"></div></div>`; }
    function admissionModal() {
      const field = (id, label, type = 'text', required = false, attrs = '') => `<div class="form-field"><label for="${id}">${label}${required ? ' *' : ''}</label><input id="${id}" name="${id}" type="${type}" ${required ? 'required' : ''} ${attrs}><span class="form-error" data-error-for="${id}"></span></div>`;
      const area = (id, label, required = false) => `<div class="form-field"><label for="${id}">${label}${required ? ' *' : ''}</label><textarea id="${id}" name="${id}" ${required ? 'required' : ''}></textarea><span class="form-error" data-error-for="${id}"></span></div>`;
      const parentFields = (prefix, title) => `<fieldset><legend>${title}</legend><div class="form-grid">${field(`${prefix}-name`, 'Name', 'text', true)}${field(`${prefix}-nic`, 'NIC Number', 'text', true)}${field(`${prefix}-occupation`, 'Occupation')}${area(`${prefix}-postal-address`, 'Postal Address', true)}${field(`${prefix}-contact-number`, 'Contact Number', 'tel', true)}${field(`${prefix}-email-address`, 'Email Address', 'email')}</div></fieldset>`;
      const educationRow = index => `<div class="form-grid">${field(`school-${index}-name`, 'Name of School')}${field(`school-${index}-from`, 'From', 'date')}${field(`school-${index}-to`, 'To', 'date')}${area(`school-${index}-withdrawal`, 'Reason for withdrawal')}</div>`;
      return `<div class="admission-modal" role="dialog" aria-modal="true" aria-labelledby="admission-title" hidden><button type="button" class="admission-close" aria-label="Close admission form">&times;</button><div class="admission-dialog"><form class="admission-form" enctype="multipart/form-data" novalidate><h2 id="admission-title" style="color:var(--navy);margin-bottom:10px">Student Information Form</h2><p class="desc">Kindervale Preschool admission form</p><p class="form-source"></p><p class="form-message" role="status" aria-live="polite"></p><input type="hidden" id="admission-source" name="admission-source" value="General Admissions"><fieldset><legend>Student Information</legend><div class="form-grid">${field('student-name', 'Name', 'text', true)}${field('date-of-birth', 'Date of Birth', 'date', true)}${field('admitted-in', 'Admitted in', 'text', true)}${field('admitted-on', 'Admitted on', 'date')}${field('age-at-admission', 'Age (At the time of Admission)', 'text', true)}</div><div class="form-field" style="margin-top:14px"><label for="student-photo">Recent passport-size photograph</label><div class="photo-upload"><div class="photo-preview" data-photo-preview>No photo selected</div><div><input id="student-photo" name="student-photo" type="file" accept="image/jpeg,image/png,image/webp"><p class="photo-help">Accepted formats: JPG, JPEG, PNG, WEBP. Maximum size: 3 MB.</p><span class="form-error" data-error-for="student-photo"></span></div></div></div></fieldset><fieldset><legend>Education History</legend>${educationRow(1)}${educationRow(2)}</fieldset><fieldset><legend>Medical Information</legend>${area('medical-information', 'Does the child have any physical impairments, allergies or special needs? If so, kindly elaborate.')}</fieldset><div class="two-col">${parentFields('father-guardian', 'Father/Guardian')}${parentFields('mother-guardian', 'Mother/Guardian')}</div><fieldset><legend>Emergency Contact Information</legend><div class="form-grid">${field('emergency-1-name', 'Name', 'text', true)}${field('emergency-1-contact-number', 'Contact Number', 'tel', true)}${field('emergency-2-name', 'Name')}${field('emergency-2-contact-number', 'Contact Number', 'tel')}</div></fieldset><fieldset><legend>Terms and Conditions</legend><ol><li>The admission form must be completed in all respects and returned to the school office along with the required documents listed below.</li><li>The school reserves all rights to review and revise the registration fee, tuition fee and all other fees without prior notice or consent of the parents.</li><li>The security fee will only be refundable upon giving a one month notice of withdrawal in advance.</li><li>Our charges do not include the cost of school events, uniforms, stationery supplies and books.</li><li>The school may shift the premises of any branch of the school to another location for any reason and the consent of parents shall not be necessary in this regard. An advance notice will, however, be given to the parents.</li><li>The school has the absolute discretion to regulate the syllabus, curriculum course books and other teaching materials in order to provide quality education to the student. The consent of the parents is not required to make any changes in the curriculum etc.</li><li>The school reserves the right to accept or refuse registration without assigning any reason.</li><li>Parents are expected to clear all monthly dues by the 10th every month.</li></ol><label class="check-field"><input type="checkbox" name="national-id-copies"> Copies of National ID card of both the parents or guardian (Pakistani Nationals).</label><label class="check-field"><input type="checkbox" name="passport-copies"> Copies of the first two pages of passport of both the parents or guardian (Foreign Nationals).</label><label class="check-field"><input type="checkbox" name="birth-certificate"> Copy of child's birth certificate.</label><label class="check-field"><input type="checkbox" name="last-school-report"> Copies of your child's last school report - if applicable.</label><label class="check-field"><input type="checkbox" name="photographs"> Three passport size photographs of the child.</label><label class="check-field"><input type="checkbox" name="terms-agreement" required> I have carefully read and understood the above instruction / terms and hereby agree to abide by these. I also agree and undertake to give one month notice of withdrawal or one month fee in lieu thereof. *</label><span class="form-error" data-error-for="terms-agreement"></span></fieldset><fieldset><legend>Parent/Guardian Signature</legend><div class="form-grid">${field('signatory-name', 'Name', 'text', true)}${field('digital-signature', 'Signature', 'text', true, 'placeholder="Type full name as digital signature"')}${field('signature-date', 'Date', 'date', true)}</div></fieldset><fieldset><legend>For Office Use Only</legend><div class="form-grid">${field('interview-date', 'Interview Date', 'date')}${field('accepted-rejected', 'Accepted/Rejected')}${area('observations', 'Observations')}${field('registration-receipt', 'Registration Receipt #')}${field('admission-date', 'Admission Date', 'date')}${field('academic-year', 'Academic Year')}${field('interviewer-signature', "Interviewer's Signature")}${field('director-signature', "Director's Signature")}</div></fieldset><div class="form-actions"><button type="reset" class="btn btn-ghost" style="color:var(--teal-dark);border-color:var(--line)">Reset / Clear</button><button type="submit" class="btn btn-primary">Submit</button></div></form></div></div>`;
    }

    function setAdmissionSource(source = 'General Admissions') {
      currentAdmissionSource = source || 'General Admissions';
    }

    function getAdmissionSource() {
      return currentAdmissionSource || 'General Admissions';
    }

    function enhanceMedia(root = document) {
      $$('img', root).forEach(img => {
        if (img.complete) img.classList.add('is-loaded');
        else img.addEventListener('load', () => img.classList.add('is-loaded'), {once: true});
      });
    }

    function applyMobileCollapse() {
      applyExpandableText(site);
    }
    function markInteractiveSurfaces(root = site) {
      $$('.card,.panel', root).forEach(surface => {
        const hasAction = Boolean($('a[href],button,[role="button"],[tabindex]:not([tabindex="-1"])', surface));
        surface.classList.toggle('is-interactive-surface', hasAction);
      });
    }

    function render(path = location.pathname, options = {}) {
      if (activeObserver) activeObserver.disconnect();
      const clean = path === '/kindervale.html' ? '/' : path.replace(/\/$/, '') || '/';
      const level = data.levels.find(item => `/levels/${item.slug}` === clean);
      const content = level ? levelPage(level) : home();
      setAdmissionSource(level ? level.name : 'General Admissions');
      site.innerHTML = `${header()}<main id="main-content" tabindex="-1">${content}</main>${admissionModal()}`;
      document.title = pageTitle(level ? clean : '/');
      updateMeta(level ? clean : '/');
        wireNavigation();
      wireLightbox();
      wireAdmissionModal();
      wireInfoCards(site);
      wireTeamToggle(site);
      enhanceMedia(site);
      applyMobileCollapse();
      applyExpandableText(site);
      markInteractiveSurfaces(site);
      updateNavbarState();
      if (level) {
        window.scrollTo({top: 0, behavior: options.instant ? 'auto' : 'smooth'});
        markActiveNav('');
      } else {
        setupActiveNav();
        requestAnimationFrame(() => {
          if (options.restoreScroll && lastHomeScroll) window.scrollTo({top: lastHomeScroll, behavior: 'auto'});
          else scrollToHash(location.hash || '#home', options.instant);
        });
      }
    }
    function updateMeta(path) {
      const description = `Kindervale Preschool in DHA-II Islamabad - ${data.school.tagline}. Explore programmes, admissions, curriculum and school life.`;
      document.querySelector('meta[name="description"]')?.setAttribute('content', description);
      document.querySelector('meta[property="og:title"]')?.setAttribute('content', document.title);
      document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
      document.querySelector('link[rel="canonical"]')?.setAttribute('href', `${location.origin}${path}${location.hash}`);
    }
    function scrollToHash(hash, instant = false) {
      const id = (hash || '#home').slice(1);
      const target = id === 'contact' ? $('#contact') : document.getElementById(id);
      if (!target) return;
      const navHeight = $('nav')?.offsetHeight || 0;
      const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 12;
      window.scrollTo({top: Math.max(0, top), behavior: instant ? 'auto' : 'smooth'});
      markActiveNav(id);
    }
    function setupActiveNav() {
      activeObserver = new IntersectionObserver(entries => {
        const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const id = visible.target.id;
        markActiveNav(id);
        const hash = `#${id}`;
        if (location.pathname.replace(/\/$/, '') !== '/levels' && location.hash !== hash) history.replaceState(history.state || {}, '', `${homePath}${hash}`);
      }, {rootMargin: '-30% 0px -55% 0px', threshold: [0.05, 0.2, 0.4, 0.7]});
      ['home', ...sectionIds].forEach(id => {
        const node = id === 'contact' ? $('#contact') : document.getElementById(id);
        if (node) activeObserver.observe(node);
      });
    }
    function markActiveNav(id) {
      $$('[data-scroll-target]').forEach(anchor => {
        const active = anchor.dataset.scrollTarget === id;
        anchor.classList.toggle('active', active);
        if (active) anchor.setAttribute('aria-current', 'true');
        else anchor.removeAttribute('aria-current');
      });
    }
    
    function wireLightbox() {
      const box = $('.lightbox');
      if (!box) return;
      const img = $('img', box);
      const caption = $('p', box);
      const title = $('.gallery-viewer-title', box);
      const counter = $('.gallery-counter', box);
      const prev = $('.gallery-prev', box);
      const next = $('.gallery-next', box);
      let items = [];
      let index = 0;
      let touchStart = 0;
      const show = nextIndex => {
        if (!items.length) return;
        index = (nextIndex + items.length) % items.length;
        const item = items[index];
        img.src = item.src;
        img.alt = item.title;
        caption.textContent = item.description || item.title;
        title.textContent = item.category;
        counter.textContent = `${index + 1} / ${items.length}`;
      };
      const open = (category, startIndex = 0) => {
        items = data.images.gallery.filter(entry => (entry.category || 'Daily Life') === category);
        if (!items.length) return;
        box.hidden = false;
        document.body.classList.add('modal-open');
        show(startIndex);
        $('.lightbox-close', box).focus();
      };
      $$('.gallery-highlight').forEach(button => button.addEventListener('click', () => open(button.dataset.galleryCategory)));
      $$('.gallery-open').forEach(button => button.addEventListener('click', () => {
        items = [{src: button.dataset.gallerySrc, title: button.dataset.galleryTitle, category: 'Gallery'}];
        box.hidden = false;
        document.body.classList.add('modal-open');
        show(0);
        $('.lightbox-close', box).focus();
      }));
      const close = () => {
        box.hidden = true;
        document.body.classList.remove('modal-open');
        img.removeAttribute('src');
      };
      prev.addEventListener('click', () => show(index - 1));
      next.addEventListener('click', () => show(index + 1));
      img.addEventListener('click', () => img.classList.toggle('is-zoomed'));
      box.addEventListener('touchstart', event => {
        touchStart = event.changedTouches[0].clientX;
      }, {passive: true});
      box.addEventListener('touchend', event => {
        const delta = event.changedTouches[0].clientX - touchStart;
        if (Math.abs(delta) > 45) show(index + (delta < 0 ? 1 : -1));
      }, {passive: true});
      $('.lightbox-close', box).addEventListener('click', close);
      box.addEventListener('click', event => { if (event.target === box) close(); });
      document.addEventListener('keydown', event => {
        if (box.hidden) return;
        if (event.key === 'Escape') close();
        if (event.key === 'ArrowLeft') show(index - 1);
        if (event.key === 'ArrowRight') show(index + 1);
      });
    }

    function wireTeamToggle(root = site) {
  const button = $('#team-toggle', root);
  const panel = $('#team-more', root);
  if (!button || !panel) return;
  button.addEventListener('click', () => {
    const expanding = button.getAttribute('aria-expanded') !== 'true';
    if (expanding) {
      panel.inert = false;
      panel.classList.add('is-open');
      panel.style.maxHeight = `${panel.scrollHeight}px`;
      button.setAttribute('aria-expanded', 'true');
      button.innerHTML = 'Show Less <span class="team-toggle-icon" aria-hidden="true">▲</span>';
    } else {
      panel.style.maxHeight = `${panel.scrollHeight}px`;
      void panel.offsetHeight;
      panel.classList.remove('is-open');
      panel.style.maxHeight = '0px';
      panel.inert = true;
      button.setAttribute('aria-expanded', 'false');
      button.innerHTML = 'Show More <span class="team-toggle-icon" aria-hidden="true">▼</span>';
      const teamSection = panel.closest('section.pad');
      if (teamSection) {
        const navHeight = $('nav')?.offsetHeight || 0;
        const top = teamSection.getBoundingClientRect().top + window.scrollY - navHeight - 12;
        if (window.scrollY > top) window.scrollTo({top: Math.max(0, top), behavior: 'smooth'});
      }
    }
  });
}

function updateTeamMoreHeight(root = site) {
  const panel = $('#team-more', root);
  if (panel && panel.classList.contains('is-open')) panel.style.maxHeight = `${panel.scrollHeight}px`;
}

    function updateNavbarState() {
      const nav = $('nav');
      if (!nav) return;
      nav.classList.toggle('is-scrolled', window.scrollY > 12);
    }

    function wireNavigation() {
      const nav = $('nav');
      const toggle = $('.nav-toggle');
      const menu = $('#primary-menu');
      if (!nav || !toggle || !menu) return;
      const closeMenu = () => {
        nav.classList.remove('menu-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Open navigation');
      };
      toggle.addEventListener('click', () => {
        const isOpen = nav.classList.toggle('menu-open');
        toggle.setAttribute('aria-expanded', String(isOpen));
        toggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
      });
      menu.addEventListener('click', event => {
        if (event.target.closest('a')) closeMenu();
      });
      nav.addEventListener('mouseenter', updateNavbarState);
      nav.addEventListener('mouseleave', updateNavbarState);
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeMenu();
      });
      updateNavbarState();
    }

    function wireAdmissionModal() {
      const modal = $('.admission-modal');
      if (!modal) return;
      const form = $('.admission-form', modal);
      const closeButton = $('.admission-close', modal);
      const resetButton = $('button[type="reset"]', modal);
      const message = $('.form-message', modal);
      const sourceField = $('#admission-source', modal);
      const sourceDisplay = $('.form-source', modal);
      const admittedInField = $('#admitted-in', modal);
      const photoInput = $('#student-photo', modal);
      const photoPreview = $('[data-photo-preview]', modal);
      const photoError = $('[data-error-for="student-photo"]', modal);
      const allowedPhotoTypes = ['image/jpeg', 'image/png', 'image/webp'];
      const maxPhotoSize = 3 * 1024 * 1024;
      let opener = null;
      let photoPreviewUrl = '';
      const clearPhotoPreview = () => {
        if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
        photoPreviewUrl = '';
        if (photoPreview) photoPreview.textContent = 'No photo selected';
        if (photoError) photoError.textContent = '';
      };
      const validatePhoto = () => {
        const file = photoInput?.files?.[0];
        if (!file) {
          clearPhotoPreview();
          return true;
        }
        if (!allowedPhotoTypes.includes(file.type)) {
          photoInput.value = '';
          if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
          photoPreviewUrl = '';
          if (photoPreview) photoPreview.textContent = 'No photo selected';
          if (photoError) photoError.textContent = 'Please upload a JPG, JPEG, PNG, or WEBP image.';
          return false;
        }
        if (file.size > maxPhotoSize) {
          photoInput.value = '';
          if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
          photoPreviewUrl = '';
          if (photoPreview) photoPreview.textContent = 'No photo selected';
          if (photoError) photoError.textContent = 'Please choose an image smaller than 3 MB.';
          return false;
        }
        if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
        photoPreviewUrl = URL.createObjectURL(file);
        if (photoPreview) photoPreview.innerHTML = `<img src="${photoPreviewUrl}" alt="Selected student photograph preview">`;
        if (photoError) photoError.textContent = '';
        return true;
      };
      const focusable = () => $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', modal).filter(node => !node.disabled && node.offsetParent !== null);
      const close = () => {
        modal.hidden = true;
        document.body.classList.remove('modal-open');
        message.textContent = '';
        opener?.focus();
      };
      const open = trigger => {
        opener = trigger;
        modal.hidden = false;
        document.body.classList.add('modal-open');
        const source = trigger?.dataset?.admissionSource || getAdmissionSource();
        if (sourceField) sourceField.value = source || 'General Admissions';
        if (admittedInField) admittedInField.value = source === 'General Admissions' ? '' : source;
        if (sourceDisplay) sourceDisplay.textContent = `Submitted From: ${source || 'General Admissions'}`;
        requestAnimationFrame(() => $('#student-name', modal)?.focus());
      };
      $$('[data-open-admission]').forEach(button => button.addEventListener('click', () => open(button)));
      photoInput?.addEventListener('change', validatePhoto);
      closeButton.addEventListener('click', close);
      modal.addEventListener('click', event => {
        if (event.target === modal) close();
      });
      modal.addEventListener('keydown', event => {
        if (event.key === 'Escape') close();
        if (event.key !== 'Tab') return;
        const nodes = focusable();
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      });
      form.addEventListener('submit', async event => {
        event.preventDefault();
        const submitButton = $('button[type="submit"]', modal);
        if (submitButton?.disabled) return;
        if (!form.checkValidity()) {
          message.textContent = 'Please complete the required fields before submitting.';
          message.classList.add('is-error');
          form.reportValidity();
          return;
        }
        if (!validatePhoto()) {
          message.textContent = 'Please check the selected student photograph before submitting.';
          message.classList.add('is-error');
          photoInput?.focus();
          return;
        }
        const previousText = submitButton?.textContent || '';
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.setAttribute('aria-busy', 'true');
          submitButton.textContent = 'Submitting...';
        }
        message.classList.remove('is-error');
        message.textContent = 'Submitting your admission form...';
        const payload = new FormData(form);
        payload.set('admissionSource', sourceField?.value || getAdmissionSource());
        try {
          const response = await fetch('/api/admission', {
            method: 'POST',
            body: payload
          });
          let data;
          try { data = await response.json(); } catch (e) {}
          if (!response.ok) throw new Error(data?.message || data?.error || 'Submission failed.');
          message.textContent = 'Thank you. Your admission form has been submitted successfully.';
          const submittedSource = payload.get('admissionSource') || 'General Admissions';
          form.reset();
          clearPhotoPreview();
          if (sourceDisplay) sourceDisplay.textContent = `Submitted From: ${submittedSource}`;
          $('.admission-dialog', modal).scrollTo({top: 0, behavior: 'smooth'});
        } catch (error) {
          message.classList.add('is-error');
          message.textContent = error?.message || 'We could not submit the form online. Please try again or contact the school office.';
        } finally {
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.removeAttribute('aria-busy');
            submitButton.textContent = previousText;
          }
        }
      });
      resetButton.addEventListener('click', () => {
        message.classList.remove('is-error');
        message.textContent = '';
        setTimeout(clearPhotoPreview, 0);
      });
    }

   function levelPage(level) {
  const galleryItems = data.images.gallery.slice(0, 3);
  
  const isSchoolReadiness = level.name === 'School Readiness';

  const overviewPanel = `<article class="panel" data-mobile-collapse${!isSchoolReadiness ? ' style="max-width: 760px; margin: 0 auto;"' : ''}><h3>Overview</h3><p>${escape(level.overview)}</p><h3 style="margin-top:20px">Age group</h3><p>${escape(level.age)}</p><h3 style="margin-top:20px">Timings</h3><p>${escape(level.timings)}</p><p style="text-align:center;color:var(--muted);margin-top:24px">All classes end at 12 noon on Friday.</p></article>`;
  
  const objectivesPanel = `<article class="panel" data-mobile-collapse><h3 style="margin-top:20px">Learning objectives</h3><ol>${level.objectives.map(item => `<li>${escape(item)}</li>`).join('')}</ol></article>`;

  const topContent = isSchoolReadiness 
    ? `<div class="two-col">${overviewPanel}${objectivesPanel}</div>`
    : overviewPanel;

  return `${hero(level.name.toUpperCase(), 'PROGRAMME', '', true, level.name)}${section(level.name, '', `${topContent}<div class="gallery" style="margin-top:34px">${galleryItems.map(entry => `<figure class="gcircle"><figcaption>${escape(entry.title)}</figcaption></figure>`).join('')}</div><div class="strip"><div style="position:relative;z-index:2"><h2>Interested in ${escape(level.name)}?</h2><p>Access the admission form to take the next step.</p><button type="button" class="btn btn-primary" data-open-admission data-admission-source="${escape(level.name)}">Admissions</button></div></div><br><br><div class="panel"><p><a href="${homePath}#levels" data-back-home class="btn btn-primary">Back to homepage</a></p></div>`)}${footer()}`;
}

    document.addEventListener('click', event => {
      const route = event.target.closest('a[data-route]');
      const scroll = event.target.closest('a[data-scroll-target]');
      const back = event.target.closest('a[data-back-home]');
      if (event.ctrlKey || event.metaKey) return;
      if (route) {
        event.preventDefault();
        lastHomeScroll = window.scrollY;
        sessionStorage.setItem('kindervale:lastHomeScroll', String(lastHomeScroll));
        history.pushState({level: true}, '', route.getAttribute('href'));
        render();
        return;
      }
      if (back) {
        event.preventDefault();
        history.pushState({}, '', `${homePath}#levels`);
        render(location.pathname, {restoreScroll: true, instant: true});
        return;
      }
      if (scroll) {
        event.preventDefault();
        const hash = `#${scroll.dataset.scrollTarget}`;
        const clean = location.pathname.replace(/\/$/, '') || '/';
        if (clean !== '/' && clean !== '/kindervale.html') {
          history.pushState({}, '', `${homePath}${hash}`);
          render(homePath, {instant: true});
        } else {
          history.pushState({}, '', `${homePath}${hash}`);
          scrollToHash(hash);
        }
      }
    });
    window.addEventListener('popstate', () => render(location.pathname, {restoreScroll: !location.pathname.startsWith('/levels'), instant: true}));
    window.addEventListener('scroll', updateNavbarState, {passive: true});
    window.addEventListener('resize', () => {
      updateNavbarState();
      applyMobileCollapse();
      refreshInfoCardHeights(site);
      updateTeamMoreHeight(site);
    }, {passive: true});
    window.addEventListener('beforeunload', () => {
      if (!location.pathname.startsWith('/levels')) sessionStorage.setItem('kindervale:lastHomeScroll', String(window.scrollY));
    });
    render(location.pathname, {instant: true});
  }
})();