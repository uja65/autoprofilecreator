(function(){
  const profile = (() => {
    try { return JSON.parse(sessionStorage.getItem('latestProfile')||'{}'); }
    catch { return {}; }
  })();

  // helpers
  const $ = (id) => document.getElementById(id);
  const text = (el, v) => el && (el.textContent = v ?? '—');
  const arr = (v) => Array.isArray(v) ? v : (v ? [v] : []);
  const firstStr = (v) => Array.isArray(v) ? v.find(Boolean) : v;

  // top header
  const name = profile?.name || 'Unknown';
  text($('personName'), name);

  // avatar
  let imgUrl = null;
  if (typeof profile?.image === 'string') imgUrl = profile.image;
  else if (profile?.image?.contentUrl) imgUrl = profile.image.contentUrl;
  $('avatar').src = imgUrl || 'https://placehold.co/240x240/0e1117/7d8799?text=No+Photo';

  // roles/jobTitle
  const job = arr(profile?.jobTitle).join(', ');
  text($('roles'), job || (profile?.disambiguatingDescription || ''));

  // links/sameAs
  const linksWrap = $('links');
  const sameAs = arr(profile?.sameAs).slice(0,8);
  linksWrap.innerHTML = sameAs.map(u => `<a class="pill" href="${u}" target="_blank" rel="noreferrer">${u.replace(/^https?:\/\//,'')}</a>`).join('');

  // left meta
  text($('bio'), profile?.description || '');
  const birthDate = profile?.birthDate || (profile?.birth?.birthDate);
  const birthPlace = profile?.birthPlace?.name || [
    profile?.birthPlace?.address?.addressLocality,
    profile?.birthPlace?.address?.addressRegion,
    profile?.birthPlace?.address?.addressCountry
  ].filter(Boolean).join(', ');
  text($('born'), [birthDate, birthPlace].filter(Boolean).join(' · ') || '—');

  const nationality = profile?.nationality?.name || profile?.nationality || '';
  text($('nationality'), nationality || '—');

  const location = profile?.homeLocation?.name || profile?.workLocation?.name || '';
  text($('location'), location || '—');

  // right: tabs
  const tabs = document.querySelectorAll('.tab');
  const panels = {
    credits: $('panel-credits'),
    projects: $('panel-projects'),
    episodes: $('panel-episodes'),
    engagements: $('panel-engagements'),
  };
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    Object.keys(panels).forEach(k => panels[k].style.display = 'none');
    panels[t.dataset.tab].style.display = 'block';
  }));

  // data mapping: today we already have performerIn (movies etc.)
  // future expansion: projects/episodes/engagements/credits arrays (your next step)
  const performerIn = arr(profile?.performerIn).map(x => {
    const type = x?.['@type'] || 'CreativeWork';
    const title = x?.name || '(untitled)';
    const date = x?.datePublished || x?.startDate || '';
    const role = x?.characterName || x?.roleName || '';
    return { type, title, date, role, url: x?.url || null };
  });

  // credits (use performerIn for now)
  renderList(panels.credits, performerIn, {
    empty: 'No credits found.',
    makeRow: (c) => row({
      title: c.title,
      url: c.url,
      meta: [c.type, c.role, c.date].filter(Boolean).join(' · ')
    })
  });

  // placeholder arrays for when you add them in the pipeline
  const projects = arr(profile?.projects);
  const episodes = arr(profile?.episodes);
  const engagements = arr(profile?.engagements);
  const credits = arr(profile?.credits); // distinct from performerIn if you later separate “credit” objects

  renderList(panels.projects, projects, {
    empty: 'No projects yet.',
    makeRow: (p) => row({
      title: p?.name || '(untitled project)',
      url: p?.url,
      meta: [p?.role, p?.status, p?.year].filter(Boolean).join(' · '),
      kicker: p?.description || ''
    })
  });

  renderList(panels.episodes, episodes, {
    empty: 'No episodes yet.',
    makeRow: (e) => row({
      title: e?.name || '(episode)',
      url: e?.url,
      meta: [e?.seriesName, e?.season ? `S${e.season}`:'', e?.episode ? `E${e.episode}`:'', e?.year].filter(Boolean).join(' · ')
    })
  });

  renderList(panels.engagements, engagements, {
    empty: 'No engagements yet.',
    makeRow: (g) => row({
      title: g?.title || g?.name || '(engagement)',
      url: g?.url,
      meta: [g?.type, g?.organization, g?.date].filter(Boolean).join(' · '),
      kicker: g?.summary || ''
    })
  });

  // if you also want a “Credits” array distinct from performerIn:
  if (credits.length){
    const br = document.createElement('div');
    br.style.margin='12px 0';
    br.innerHTML = `<div class="kicker">Other credits</div>`;
    panels.credits.appendChild(br);
    renderList(panels.credits, credits, {
      empty: '',
      makeRow: (c) => row({
        title: c?.title || c?.name || '(credit)',
        url: c?.url,
        meta: [c?.department, c?.role, c?.year].filter(Boolean).join(' · ')
      })
    });
  }

  // utilities
  function renderList(root, list, { empty='—', makeRow }){
    root.innerHTML = '';
    if(!list || !list.length){
      root.innerHTML = `<div class="subtitle">${empty}</div>`;
      return;
    }
    const ul = document.createElement('div');
    ul.className = 'list';
    list.forEach(item => ul.appendChild(makeRow(item)));
    root.appendChild(ul);
  }
  function row({ title, meta, kicker, url }){
    const div = document.createElement('div');
    div.className = 'item';
    const titleHtml = url ? `<a href="${url}" target="_blank" rel="noreferrer"><h4>${title}</h4></a>` : `<h4>${title}</h4>`;
    div.innerHTML = `
      <div style="flex:1;">
        ${titleHtml}
        ${meta ? `<div class="metaRow">${meta}</div>`:''}
        ${kicker ? `<div class="kicker">${kicker}</div>`:''}
      </div>
    `;
    return div;
  }
})();
