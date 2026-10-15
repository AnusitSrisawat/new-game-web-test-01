// Studio: dev tool for editing game data. Talks to /api/studio/* (needs the studio token).
(() => {
  const $ = (id) => document.getElementById(id);
  let token = sessionStorage.getItem('studio_token') || '';
  let state = null;     // payload from the server: schema, defaults, current, overrides, spawns...
  let ov = {};          // working copy of overrides (what will be saved)
  let spawns = [];      // working copy of the spawn table
  let tab = 'maps';
  let search = '';
  let dirty = false;

  // ---- tiny DOM helper (no innerHTML: names/descriptions are user-editable text) ----
  function h(tag, attrs = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) {
      if (kid === null || kid === undefined || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }

  function toast(msg, bad = false) {
    const t = $('toast');
    t.textContent = msg;
    t.className = 'toast' + (bad ? ' bad' : '');
    t.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { t.hidden = true; }, 3200);
  }

  async function api(method, path, body) {
    const res = await fetch(path, {
      method,
      headers: { 'x-studio-token': token, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || res.statusText), { status: res.status });
    return data;
  }

  function setDirty(v) {
    dirty = v;
    $('dirty').hidden = !v;
    $('btn-save').disabled = !v;
  }

  // A picture cropped out of a sprite sheet (or the emoji when there is none)
  function pic(sprite, emoji, px) {
    if (!sprite) return h('span', { class: 'pic noimg', style: `width:${px}px;height:${px}px;font-size:${Math.round(px * 0.6)}px` }, emoji || '❔');
    const k = px / sprite.sw;
    return h('span', { class: 'pic', style: `width:${px}px;height:${Math.round(sprite.sh * k)}px;background-image:url(/${sprite.src});` +
      `background-size:${Math.round(sprite.iw * k)}px ${Math.round(sprite.ih * k)}px;background-position:-${Math.round(sprite.sx * k)}px -${Math.round(sprite.sy * k)}px` });
  }
  const monsterPic = (id, px = 56) => pic(state.monsters[id]?.sprite, state.monsters[id]?.emoji, px);

  // ---- value helpers ----
  const defaultOf = (col, id, key) => state.defaults[col]?.[id]?.[key];
  const valueOf = (col, id, key) => ov[col]?.[id]?.[key] ?? defaultOf(col, id, key);
  const isChanged = (col, id, key) => defaultOf(col, id, key) !== undefined && ov[col]?.[id]?.[key] !== undefined && ov[col][id][key] !== defaultOf(col, id, key);

  function setValue(col, id, key, value) {
    const def = defaultOf(col, id, key);
    if (def !== undefined && value === def) {
      if (ov[col]?.[id]) {
        delete ov[col][id][key];
        if (!Object.keys(ov[col][id]).length) delete ov[col][id];
        if (!Object.keys(ov[col]).length) delete ov[col];
      }
    } else {
      ov[col] ||= {};
      ov[col][id] ||= {};
      ov[col][id][key] = value;
    }
    setDirty(true);
  }

  // One editable field
  function field(col, id, key, opts = {}) {
    const spec = state.schema[col].fields[key];
    const def = defaultOf(col, id, key);
    if (!state.schema[col].freeForm && def === undefined) {
      // this row has no such property (e.g. a weapon has no "heal")
      return null;
    }
    const cur = valueOf(col, id, key);
    const input = spec.type === 'select'
      ? h('select', { class: isChanged(col, id, key) ? 'changed' : '' },
          ...spec.options.map(o => h('option', { value: o.value, selected: o.value === cur }, o.label)))
      : h('input', {
          type: spec.type === 'number' ? 'number' : spec.type === 'color' ? 'color' : 'text',
          value: cur ?? '',
          min: spec.min, max: spec.max, step: spec.step, maxlength: spec.max && spec.type === 'text' ? spec.max : undefined,
          class: isChanged(col, id, key) ? 'changed' : ''
        });
    const resetBtn = h('button', { class: 'reset', title: `คืนค่าเดิม (${def})`, hidden: !isChanged(col, id, key), type: 'button' }, '↺');
    const refresh = () => {
      const changed = isChanged(col, id, key);
      input.classList.toggle('changed', changed);
      resetBtn.hidden = !changed;
    };
    input.addEventListener('change', () => {
      let v = input.value;
      if (spec.type === 'number') {
        v = Number(v);
        if (!Number.isFinite(v)) { input.value = valueOf(col, id, key); return; }
        v = Math.min(spec.max, Math.max(spec.min, v));
        input.value = v;
      } else if (spec.type === 'text') {
        v = v.trim();
      }
      setValue(col, id, key, v);
      refresh();
      if (col === 'skills' && (key === 'kind' || key === 'effect')) renderList(); // the shown fields depend on these
    });
    resetBtn.addEventListener('click', () => {
      setValue(col, id, key, def);
      input.value = def;
      refresh();
    });
    return h('div', { class: 'field' + (opts.wide || spec.type === 'text' && spec.max > 100 ? ' wide' : '') },
      h('label', {}, h('span', {}, spec.label), resetBtn),
      h('div', { class: 'row' }, input));
  }

  const fieldsFor = (col, id, keys) => keys.map(k => field(col, id, k)).filter(Boolean);

  // ---- tabs ----
  const TABS = [
    { id: 'maps', icon: '🗺️', label: 'แมพ', sub: 'ชื่อ ขนาด สี texture' },
    { id: 'objects', icon: '🌳', label: 'วางออบเจกต์', sub: 'ต้นไม้ บ้าน หิน ในแมพ' },
    { id: 'ui', icon: '🖥️', label: 'หน้าจอ UI', sub: 'สีธีม + ซ่อน/แสดงแผง' },
    { id: 'monsters', icon: '👾', label: 'มอนสเตอร์', sub: 'ค่าพลัง + พฤติกรรม' },
    { id: 'spawns', icon: '🌱', label: 'การเกิดของมอนสเตอร์', sub: 'จำนวน + เวลาเกิดใหม่' },
    { id: 'items', icon: '🎒', label: 'ไอเทม', sub: 'อาวุธ เกราะ ยา' },
    { id: 'quests', icon: '📜', label: 'เควสต์', sub: 'ชื่อ เป้าหมาย รางวัล' },
    { id: 'skills', icon: '✨', label: 'สกิล', sub: 'Active/Passive + สมุด/กาชา (ข้อมูลล่วงหน้า)' }
  ];

  function renderTabs() {
    const nav = $('tabs');
    nav.replaceChildren(...TABS.map(t => h('button', {
      class: 'tab' + (t.id === tab ? ' active' : ''),
      onclick: () => { tab = t.id; search = ''; render(); }
    }, `${t.icon} ${t.label}`, h('small', {}, t.sub))));
  }

  function searchBar(placeholder) {
    return h('div', { class: 'toolbar' }, h('input', {
      type: 'search', placeholder, value: search,
      oninput: (e) => { search = e.target.value.toLowerCase(); renderList(); }
    }));
  }

  let listHost = null;
  let listBuilder = null;
  function renderList() {
    if (!listHost || !listBuilder) return;
    const kids = listBuilder(search);
    listHost.replaceChildren(...(kids.length ? kids : [h('div', { class: 'empty' }, 'ไม่พบรายการ')]));
  }

  const matches = (q, ...vals) => !q || vals.some(v => String(v ?? '').toLowerCase().includes(q));

  function panelMaps() {
    return [
      h('h2', {}, 'แมพ'),
      h('p', { class: 'hint' }, 'แก้ชื่อ คำอธิบาย ขนาด (จัตุรัส) พื้นผิวพื้น (texture) และสีของแต่ละแมพ — ผู้เล่นเกิดกลางแมพเสมอ ถ้าเปลี่ยนขนาด ตำแหน่งมอนสเตอร์จะจัดใหม่ตามขนาด'),
      (listHost = h('div'))
    ];
  }
  function buildMaps() {
    return state.mapIds.map(id => h('div', { class: 'card' },
      h('h3', {}, state.zoneNames[id] || id, h('small', {}, id)),
      h('div', { class: 'fields' }, ...fieldsFor('zones', id, ['name', 'desc']), ...fieldsFor('maps', id, ['size', 'texture', 'floor', 'wall']))
    ));
  }

  // chips: "map name × count" for every map this monster spawns in
  function mapsOf(id) {
    const rows = spawns.filter(sp => sp.templateId === id && sp.count > 0);
    return rows.length
      ? rows.map(sp => h('span', { class: 'chip' }, `${state.zoneNames[sp.map] || sp.map} × ${sp.count}`))
      : [h('span', { class: 'chip none' }, 'ยังไม่ได้ใส่ในแมพไหน — ไปที่แท็บ "การเกิดของมอนสเตอร์"')];
  }

  // ---- drop table editor (per monster): item + chance %, add / remove / reset ----
  const MAX_DROPS = 12;
  const currentDrops = (id) => ov.drops?.[id] ?? state.defaults.drops?.[id] ?? [];
  const sameDrops = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function setDrops(id, list) {
    if (sameDrops(list, state.defaults.drops?.[id] ?? [])) {
      if (ov.drops) { delete ov.drops[id]; if (!Object.keys(ov.drops).length) delete ov.drops; }
    } else {
      ov.drops ||= {};
      ov.drops[id] = list;
    }
    setDirty(true);
  }

  function dropsEditor(id) {
    const host = h('div', { class: 'dropedit' });
    const itemIds = Object.keys(state.itemsInfo).sort((a, b) => state.itemsInfo[a].name.localeCompare(state.itemsInfo[b].name));
    const draw = () => {
      const list = currentDrops(id).map(d => ({ ...d }));
      const rows = list.map((d, i) => {
        const info = state.itemsInfo[d.itemId] || { name: d.itemId };
        const holder = h('span', { class: 'pichold' }, pic(info.sprite, info.icon, 34));
        const sel = h('select', { onchange: (e) => {
          if (list.some((x, j) => j !== i && x.itemId === e.target.value)) { toast('ไอเทมนี้อยู่ในรายการดรอปแล้ว', true); e.target.value = d.itemId; return; }
          list[i].itemId = e.target.value; setDrops(id, list); draw();
        } }, ...itemIds.map(iid => h('option', { value: iid, selected: iid === d.itemId }, state.itemsInfo[iid].name)));
        const pct = h('input', { type: 'number', min: 0.1, max: 100, step: 0.1, value: Math.round(d.chance * 1000) / 10, onchange: (e) => {
          const v = Math.min(100, Math.max(0.1, Number(e.target.value) || 0.1));
          e.target.value = v; list[i].chance = Math.round(v * 10) / 1000; setDrops(id, list);
        } });
        return h('div', { class: 'droprow' }, holder, sel, h('span', { class: 'pct' }, pct, '%'),
          h('button', { class: 'btn small danger', title: 'ลบออกจากรายการ', onclick: () => { list.splice(i, 1); setDrops(id, list); draw(); } }, '✕'));
      });
      const isOv = ov.drops?.[id] !== undefined;
      host.replaceChildren(
        ...(rows.length ? rows : [h('div', { class: 'empty small' }, 'ไม่มีไอเทมดรอป')]),
        h('div', { class: 'dropbtns' },
          h('button', { class: 'btn small', disabled: list.length >= MAX_DROPS, onclick: () => {
            const used = new Set(list.map(x => x.itemId));
            const next = itemIds.find(iid => !used.has(iid));
            if (!next) return;
            list.push({ itemId: next, chance: 0.1 }); setDrops(id, list); draw();
          } }, '+ เพิ่มไอเทมดรอป'),
          isOv ? h('button', { class: 'btn small', onclick: () => { setDrops(id, state.defaults.drops?.[id] ?? []); draw(); } }, '↺ คืนค่าเดิม') : null));
    };
    draw();
    return host;
  }

  function panelMonsters() {
    return [
      h('h2', {}, 'มอนสเตอร์'),
      h('p', { class: 'hint' }, 'ค่าพลัง พฤติกรรม และไอเทมที่ดรอป (พร้อม % ) ของมอนสเตอร์แต่ละชนิด — มีผลกับทุกตัวของชนิดนั้นในทุกแมพ'),
      searchBar('ค้นหามอนสเตอร์...'),
      monsterFilterBar(),
      (listHost = h('div'))
    ];
  }
  // monster list view options: sort (level / map) + map filter
  let monSort = 'default';
  let monMap = 'all';
  const firstMapIdx = (id) => {
    const idx = spawns.filter(sp => sp.templateId === id && sp.count > 0).map(sp => state.mapIds.indexOf(sp.map));
    return idx.length ? Math.min(...idx) : 999;
  };
  function monsterFilterBar() {
    const sortSel = h('select', { onchange: (e) => { monSort = e.target.value; renderList(); } },
      ...[['default', 'เรียง: ค่าเริ่มต้น'], ['lvAsc', 'เลเวล: น้อย → มาก'], ['lvDesc', 'เลเวล: มาก → น้อย'], ['map', 'เรียงตามแมพ']]
        .map(([v, t]) => h('option', { value: v, selected: v === monSort }, t)));
    const mapSel = h('select', { onchange: (e) => { monMap = e.target.value; renderList(); } },
      h('option', { value: 'all', selected: monMap === 'all' }, 'ทุกแมพ'),
      ...state.mapIds.map(m => h('option', { value: m, selected: m === monMap }, state.zoneNames[m] || m)));
    return h('div', { class: 'toolbar' }, sortSel, mapSel);
  }
  function buildMonsters(q) {
    const lv = (id) => Number(valueOf('monsters', id, 'level')) || 0;
    let ids = Object.keys(state.monsters).filter(id => matches(q, id, valueOf('monsters', id, 'name')));
    if (monMap !== 'all') ids = ids.filter(id => spawns.some(sp => sp.templateId === id && sp.map === monMap && sp.count > 0));
    if (monSort === 'lvAsc') ids.sort((a, b) => lv(a) - lv(b));
    else if (monSort === 'lvDesc') ids.sort((a, b) => lv(b) - lv(a));
    else if (monSort === 'map') ids.sort((a, b) => firstMapIdx(a) - firstMapIdx(b) || lv(a) - lv(b));
    return ids.map(id => h('div', { class: 'card' },
      h('h3', {}, monsterPic(id, 56), valueOf('monsters', id, 'name'), h('small', {}, id),
        h('small', {}, state.monsters[id].sprite ? '🖼️ มีรูป' : 'ไม่มีรูป (ใช้ emoji)')),
      h('div', { class: 'group-title' }, 'แมพที่เกิด'),
      h('div', { class: 'chips' }, ...mapsOf(id)),
      h('div', { class: 'group-title' }, 'ไอเทมที่ดรอป (ตั้ง % ได้ เพิ่ม/ลบได้)'),
      dropsEditor(id),
      h('div', { class: 'group-title' }, 'ค่าพลัง'),
      h('div', { class: 'fields' }, ...fieldsFor('monsters', id, ['name', 'level', 'hp', 'atk', 'def', 'exp', 'size', 'facing'])),
      h('div', { class: 'group-title' }, 'พฤติกรรม'),
      h('div', { class: 'fields' }, ...fieldsFor('ai', id, ['speed', 'aggro', 'attackRange', 'attackCooldown', 'leash', 'wanderRadius']))
    ));
  }

  function panelSpawns() {
    return [
      h('h2', {}, 'การเกิดของมอนสเตอร์'),
      h('p', { class: 'hint' }, `🖼️ = มอนสเตอร์ที่มีรูปแล้ว • กำหนดว่าแต่ละแมพมีมอนสเตอร์ชนิดไหนกี่ตัว และเกิดใหม่ทุกกี่วินาทีหลังถูกฆ่า (จำนวน ${state.spawnLimits.count.join('-')} • เวลา ${state.spawnLimits.respawn.join('-')} วินาที) ตำแหน่งจัดเป็นก้นหอยรอบกลางแมพอัตโนมัติ`),
      (listHost = h('div'))
    ];
  }
  function buildSpawns() {
    return state.mapIds.map(mapId => {
      const rows = spawns.map((s, i) => ({ s, i })).filter(r => r.s.map === mapId);
      const tbody = h('tbody', {}, ...rows.map(({ s, i }) => h('tr', {},
        h('td', {}, (() => {
          const holder = h('span', { class: 'pichold' }, monsterPic(s.templateId, 44));
          const sel = h('select', { onchange: (e) => { s.templateId = e.target.value; holder.replaceChildren(monsterPic(s.templateId, 44)); setDirty(true); } },
          ...Object.keys(state.monsters).map(mid => h('option', { value: mid, selected: mid === s.templateId }, `${state.monsters[mid].sprite ? '🖼️' : '▫️'} ${valueOf('monsters', mid, 'name')} (Lv.${valueOf('monsters', mid, 'level')})`)));
          return h('div', { class: 'selrow' }, holder, sel);
        })()),
        h('td', {}, h('input', { type: 'number', min: state.spawnLimits.count[0], max: state.spawnLimits.count[1], value: s.count, onchange: (e) => { s.count = clampNum(e.target.value, state.spawnLimits.count); e.target.value = s.count; setDirty(true); } })),
        h('td', {}, h('input', { type: 'number', min: state.spawnLimits.respawn[0], max: state.spawnLimits.respawn[1], value: s.respawn, onchange: (e) => { s.respawn = clampNum(e.target.value, state.spawnLimits.respawn); e.target.value = s.respawn; setDirty(true); } })),
        h('td', {}, h('button', { class: 'btn small danger', onclick: () => { spawns.splice(i, 1); setDirty(true); renderList(); } }, 'ลบ'))
      )));
      return h('div', { class: 'card' },
        h('h3', {}, state.zoneNames[mapId] || mapId, h('small', {}, `${rows.reduce((n, r) => n + r.s.count, 0)} ตัว`)),
        rows.length
          ? h('table', { class: 'spawns' }, h('thead', {}, h('tr', {}, h('th', {}, 'ชนิดมอนสเตอร์'), h('th', {}, 'จำนวน'), h('th', {}, 'เกิดใหม่ (วินาที)'), h('th', {}))), tbody)
          : h('div', { class: 'empty' }, 'ยังไม่มีมอนสเตอร์ในแมพนี้'),
        h('button', { class: 'btn small', onclick: () => {
          spawns.push({ map: mapId, templateId: Object.keys(state.monsters)[0], count: 1, respawn: 8 });
          setDirty(true); renderList();
        } }, '+ เพิ่มแถว'));
    });
  }
  const clampNum = (v, [lo, hi]) => Math.min(hi, Math.max(lo, Math.round(Number(v)) || lo));


  // ---- map objects editor (canvas): click to place, drag to move ----
  let objMap = null;
  let objSel = -1;
  let objTool = { type: 'tree', scale: 1, solid: true, snap: true };
  let texMod = null;
  const defObjects = (mapId) => state.defaults.objects?.[mapId] ?? [];
  const currentObjects = (mapId) => ov.objects?.[mapId] ?? defObjects(mapId);
  function setObjects(mapId, list) {
    if (JSON.stringify(list) === JSON.stringify(defObjects(mapId))) {
      if (ov.objects) { delete ov.objects[mapId]; if (!Object.keys(ov.objects).length) delete ov.objects; }
    } else {
      ov.objects ||= {};
      ov.objects[mapId] = list;
    }
    setDirty(true);
  }

  function panelObjects() {
    objMap = objMap && state.mapIds.includes(objMap) ? objMap : state.mapIds[0];
    objSel = -1;
    import('/src/textures.js').then(m => { texMod = m; drawObjCanvas && drawObjCanvas(); }).catch(() => {});
    return [
      h('h2', {}, 'วางออบเจกต์ในแมพ'),
      h('p', { class: 'hint' }, 'เลือกชนิด แล้วคลิกบนแมพเพื่อวาง • คลิกที่ออบเจกต์เพื่อเลือก แล้วลากย้ายได้ • ติ๊ก "ชนได้" เพื่อให้ผู้เล่นเดินผ่านไม่ได้ (มอนสเตอร์ยังเดินผ่านได้) • จุดสีฟ้า = จุดเกิดผู้เล่น'),
      (listHost = h('div'))
    ];
  }

  let drawObjCanvas = null;
  function buildObjects() {
    const mapId = objMap;
    const size = valueOf('maps', mapId, 'size');
    const CSZ = 720;
    const k = CSZ / size;
    const canvas = h('canvas', { width: CSZ, height: CSZ, class: 'objcanvas' });
    const g = canvas.getContext('2d');
    const info = h('div', { class: 'objinfo' });
    const list = () => currentObjects(mapId).map(o => ({ ...o }));

    drawObjCanvas = () => {
      const floor = valueOf('maps', mapId, 'floor');
      const tex = valueOf('maps', mapId, 'texture');
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, CSZ, CSZ);
      g.scale(k, k);
      g.fillStyle = floor; g.fillRect(0, 0, size, size);
      if (texMod) {
        const pat = texMod.getFloorPattern(g, tex, floor);
        if (pat) { g.fillStyle = pat; g.fillRect(0, 0, size, size); }
      }
      g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 1 / k;
      for (let v = 0; v <= size; v += 32 * 5) { g.beginPath(); g.moveTo(v, 0); g.lineTo(v, size); g.moveTo(0, v); g.lineTo(size, v); g.stroke(); }
      g.fillStyle = valueOf('maps', mapId, 'wall');
      g.fillRect(0, 0, size, 32); g.fillRect(0, size - 32, size, 32); g.fillRect(0, 0, 32, size); g.fillRect(size - 32, 0, 32, size);
      g.fillStyle = '#38bdf8'; g.beginPath(); g.arc(size / 2, size / 2, 14 / k, 0, 7); g.fill();
      const objs = list();
      objs.map((o, i) => ({ o, i })).sort((a, b) => a.o.y - b.o.y).forEach(({ o, i }) => {
        const t = state.objectTypes[o.type];
        if (texMod) {
          g.save(); g.translate(o.x, o.y); texMod.drawObjectShape(g, o.type, t.size * o.scale); g.restore();
        } else { g.fillStyle = '#ef4444'; g.fillRect(o.x - 10, o.y - 20, 20, 20); }
        if (o.solid && t.r > 0) { g.strokeStyle = 'rgba(239,68,68,0.7)'; g.lineWidth = 2 / k; g.beginPath(); g.arc(o.x, o.y, t.r * o.scale, 0, 7); g.stroke(); }
        if (i === objSel) {
          g.strokeStyle = '#fbbf24'; g.lineWidth = 3 / k;
          const w = t.size * o.scale;
          g.strokeRect(o.x - w / 2, o.y - w, w, w);
        }
      });
      info.textContent = `${objs.length} / ${state.maxObjects} ชิ้นในแมพนี้`;
    };

    const hit = (x, y) => {
      const objs = list();
      for (let i = objs.length - 1; i >= 0; i--) {
        const o = objs[i], t = state.objectTypes[o.type], w = t.size * o.scale;
        if (x >= o.x - w / 2 && x <= o.x + w / 2 && y >= o.y - w && y <= o.y + 10) return i;
      }
      return -1;
    };
    const toWorld = (e) => {
      const r = canvas.getBoundingClientRect();
      let x = (e.clientX - r.left) / r.width * size, y = (e.clientY - r.top) / r.height * size;
      if (objTool.snap) { x = Math.round(x / 16) * 16; y = Math.round(y / 16) * 16; }
      return { x: Math.min(size - 32, Math.max(32, Math.round(x))), y: Math.min(size - 32, Math.max(32, Math.round(y))) };
    };
    let dragging = false;
    canvas.addEventListener('pointerdown', (e) => {
      const raw = toWorld({ clientX: e.clientX, clientY: e.clientY });
      const r = canvas.getBoundingClientRect();
      const wx = (e.clientX - r.left) / r.width * size, wy = (e.clientY - r.top) / r.height * size;
      const idx = hit(wx, wy);
      if (idx >= 0) {
        objSel = idx; dragging = true; canvas.setPointerCapture(e.pointerId);
      } else {
        const objs = list();
        if (objs.length >= state.maxObjects) { toast('ออบเจกต์เต็มแล้ว', true); return; }
        objs.push({ type: objTool.type, x: raw.x, y: raw.y, scale: objTool.scale, solid: objTool.solid });
        setObjects(mapId, objs);
        objSel = objs.length - 1;
      }
      drawObjCanvas(); drawSel();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!dragging || objSel < 0) return;
      const objs = list();
      const p = toWorld(e);
      objs[objSel].x = p.x; objs[objSel].y = p.y;
      setObjects(mapId, objs);
      drawObjCanvas();
    });
    canvas.addEventListener('pointerup', () => { dragging = false; });

    const selBox = h('div', { class: 'objsel' });
    function drawSel() {
      const objs = list();
      const o = objs[objSel];
      if (!o) { selBox.replaceChildren(h('div', { class: 'empty small' }, 'ยังไม่ได้เลือกออบเจกต์')); return; }
      const apply = (patch) => { objs[objSel] = { ...o, ...patch }; setObjects(mapId, objs); drawObjCanvas(); };
      selBox.replaceChildren(
        h('div', { class: 'group-title' }, 'ออบเจกต์ที่เลือก'),
        h('div', { class: 'fields' },
          h('div', { class: 'field' }, h('label', {}, h('span', {}, 'ชนิด')),
            h('select', { onchange: (e) => { apply({ type: e.target.value }); } },
              ...Object.entries(state.objectTypes).map(([id, t]) => h('option', { value: id, selected: id === o.type }, t.label)))),
          h('div', { class: 'field' }, h('label', {}, h('span', {}, 'X')), h('input', { type: 'number', value: o.x, onchange: (e) => apply({ x: Number(e.target.value) || 0 }) })),
          h('div', { class: 'field' }, h('label', {}, h('span', {}, 'Y')), h('input', { type: 'number', value: o.y, onchange: (e) => apply({ y: Number(e.target.value) || 0 }) })),
          h('div', { class: 'field' }, h('label', {}, h('span', {}, 'ขนาด (x)')), h('input', { type: 'number', min: 0.3, max: 3, step: 0.1, value: o.scale, onchange: (e) => apply({ scale: Math.min(3, Math.max(0.3, Number(e.target.value) || 1)) }) })),
          h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: o.solid, onchange: (e) => apply({ solid: e.target.checked }) }), ' ชนได้')),
        h('button', { class: 'btn small danger', onclick: () => { objs.splice(objSel, 1); setObjects(mapId, objs); objSel = -1; drawObjCanvas(); drawSel(); } }, '🗑️ ลบออบเจกต์นี้'));
    }

    const mapSel = h('select', { onchange: (e) => { objMap = e.target.value; objSel = -1; renderList(); } },
      ...state.mapIds.map(m => h('option', { value: m, selected: m === mapId }, state.zoneNames[m] || m)));
    const typeSel = h('select', { onchange: (e) => { objTool.type = e.target.value; } },
      ...Object.entries(state.objectTypes).map(([id, t]) => h('option', { value: id, selected: id === objTool.type }, t.label)));
    const tools = h('div', { class: 'toolbar' },
      mapSel, h('span', {}, 'วาง:'), typeSel,
      h('span', {}, 'ขนาด'), h('input', { type: 'number', min: 0.3, max: 3, step: 0.1, value: objTool.scale, style: 'width:70px', onchange: (e) => { objTool.scale = Math.min(3, Math.max(0.3, Number(e.target.value) || 1)); } }),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: objTool.solid, onchange: (e) => { objTool.solid = e.target.checked; } }), ' ชนได้'),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: objTool.snap, onchange: (e) => { objTool.snap = e.target.checked; } }), ' สแนปกริด'),
      h('button', { class: 'btn small', onclick: () => { if (confirm('ลบออบเจกต์ทั้งหมดในแมพนี้?')) { setObjects(mapId, []); objSel = -1; drawObjCanvas(); drawSel(); } } }, 'ล้างทั้งแมพ'),
      h('button', { class: 'btn small', disabled: ov.objects?.[mapId] === undefined, onclick: () => { setObjects(mapId, defObjects(mapId).map(o => ({ ...o }))); objSel = -1; renderList(); } }, '↺ คืนค่าเดิม'));
    drawObjCanvas();
    drawSel();
    return [h('div', { class: 'card' }, tools, h('div', { class: 'objwrap' }, canvas, selBox), info)];
  }

  // ---- UI theme tab ----
  function panelUi() {
    return [
      h('h2', {}, 'หน้าจอ UI'),
      h('p', { class: 'hint' }, 'ปรับสีธีมของ HUD/หน้าต่างในเกม และซ่อน/แสดงแผงต่างๆ — ตัวอย่างด้านล่างอัปเดตสดก่อนบันทึก • การย้ายตำแหน่งแผงยังไม่รองรับ'),
      (listHost = h('div'))
    ];
  }
  function buildUi() {
    const keys = Object.keys(state.schema.ui.fields);
    const preview = h('div', { class: 'uiprev' });
    const refresh = () => {
      const u = { ...state.defaults.ui.main, ...(ov.ui?.main || {}) };
      const n = parseInt(u.hudBg.slice(1), 16);
      const bg = `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${u.hudOpacity / 100})`;
      const bar = (c, w) => h('div', { class: 'pbar' }, h('i', { style: `width:${w}%;background:${c}` }));
      preview.replaceChildren(h('div', { class: 'pbox', style: `background:${bg};border:2px solid ${u.goldBorder};color:${u.textMain}` },
        h('b', { style: `color:${u.goldAccent}` }, 'ตัวอย่างหน้าต่าง'),
        h('div', { style: `color:${u.textDim};font-size:12px` }, 'ข้อความรอง • Lv.12'),
        bar(u.hpRed, 70), bar(u.spBlue, 50), bar(u.expYellow, 30),
        h('span', { class: 'pbtn', style: `background:${u.goldAccent};color:#111` }, 'ปุ่ม')));
    };
    const fields = h('div', { class: 'fields' }, ...keys.map(k => {
      const f = field('ui', 'main', k);
      f?.addEventListener('change', refresh);
      f?.addEventListener('click', () => setTimeout(refresh, 0));
      return f;
    }));
    refresh();
    return [h('div', { class: 'card' }, h('h3', {}, 'ธีมและแผง HUD'), preview, fields)];
  }

  function panelItems() {
    return [
      h('h2', {}, 'ไอเทม'),
      h('p', { class: 'hint' }, 'แก้ชื่อ ราคา ค่าพลัง และเลเวลที่ต้องการ (ช่องที่ไอเทมนั้นไม่มีจะไม่แสดง)'),
      searchBar('ค้นหาไอเทม...'),
      (listHost = h('div'))
    ];
  }
  function buildItems(q) {
    return Object.keys(state.defaults.items).filter(id => matches(q, id, valueOf('items', id, 'name'))).map(id => h('div', { class: 'card' },
      h('h3', {}, valueOf('items', id, 'name'), h('small', {}, id)),
      h('div', { class: 'fields' }, ...fieldsFor('items', id, ['name', 'price', 'atk', 'def', 'hp', 'heal', 'reqLevel', 'desc']))
    ));
  }

  function panelQuests() {
    return [
      h('h2', {}, 'เควสต์'),
      h('p', { class: 'hint' }, 'แก้ชื่อ คำอธิบาย จำนวนที่ต้องกำจัด และรางวัลของเควสต์'),
      (listHost = h('div'))
    ];
  }
  function buildQuests() {
    return Object.keys(state.defaults.quests).map(id => h('div', { class: 'card' },
      h('h3', {}, valueOf('quests', id, 'title'), h('small', {}, id)),
      h('div', { class: 'fields' }, ...fieldsFor('quests', id, ['title', 'desc', 'requiredCount', 'rewardGold', 'rewardExp', 'rewardTokens']))
    ));
  }

  // ---- skills (data only for now: see docs/SKILLS.md) ----
  const SKILL_TEMPLATE = {
    kind: 'active', rarity: 'common', weapon: 'any', target: 'enemy', effect: 'damage', power: 100, hits: 1, scalesWith: 'none',
    statCoef: 0, radius: 0, range: 0, spCost: 10, cooldown: 5, duration: 0, slowPct: 0, stunSec: 0, bookSellPrice: 100, gachaWeight: 30
  };
  const RARITY_COLOR = { common: '#94a3b8', uncommon: '#34d399', rare: '#60a5fa', epic: '#c084fc' };
  const skillIds = () => [...new Set([...Object.keys(state.defaults.skills || {}), ...Object.keys(ov.skills || {})])];
  const skillVal = (id, key) => valueOf('skills', id, key);

  function panelSkills() {
    const newId = h('input', { placeholder: 'id เช่น poison_arrow', pattern: '[a-z0-9_]+', maxlength: 40 });
    return [
      h('h2', {}, 'สกิล'),
      h('p', { class: 'hint' }, 'ข้อมูลสกิล Active/Passive — ได้มาจาก "สมุดสกิล" ที่สุ่มจากตู้กาชา (ใช้เรียนได้ถ้ายังไม่เคยเรียน ขายสมุดได้) ตอนนี้ยังเป็นข้อมูลล่วงหน้า เกมยังไม่ได้ใช้ รายละเอียดกติกาดู docs/SKILLS.md'),
      h('div', { class: 'toolbar' }, newId, h('button', { class: 'btn', onclick: () => {
        const id = newId.value.trim();
        if (!/^[a-z0-9_]{1,40}$/.test(id)) { toast('id ใช้ได้เฉพาะ a-z 0-9 _', true); return; }
        if (skillIds().includes(id)) { toast('มี id นี้แล้ว', true); return; }
        setValue('skills', id, 'name', id);
        for (const [k, v] of Object.entries(SKILL_TEMPLATE)) setValue('skills', id, k, v);
        newId.value = '';
        renderList();
      } }, '+ เพิ่มสกิล')),
      (listHost = h('div'))
    ];
  }

  function buildSkills() {
    const ids = skillIds();
    const totalW = ids.reduce((n, id) => n + (Number(skillVal(id, 'gachaWeight')) || 0), 0);
    const active = ids.filter(id => skillVal(id, 'kind') !== 'passive').length;
    const summary = h('div', { class: 'card' },
      h('h3', {}, `ทั้งหมด ${ids.length} สกิล`, h('small', {}, `Active ${active} • Passive ${ids.length - active} • น้ำหนักกาชารวม ${totalW}`)));
    const cards = ids.map(id => {
      const isActive = skillVal(id, 'kind') !== 'passive';
      const effect = skillVal(id, 'effect');
      const isDefault = state.defaults.skills?.[id] !== undefined;
      const rar = skillVal(id, 'rarity');
      const chance = totalW > 0 ? (Number(skillVal(id, 'gachaWeight')) || 0) / totalW * 100 : 0;
      const F = (keys) => h('div', { class: 'fields' }, ...keys.map(k => field('skills', id, k)).filter(Boolean));
      const bonuses = ['bonusAtkPct', 'bonusDefPct', 'bonusHpPct', 'bonusAspdPct', 'bonusCritPct', 'bonusSpPct', 'bonusMovePct'];
      const body = [
        h('div', { class: 'group-title' }, 'ทั่วไป'), F(['name', 'desc', 'kind', 'rarity', 'weapon'])
      ];
      if (isActive) {
        body.push(h('div', { class: 'group-title' }, 'การใช้'), F(['target', 'effect', 'spCost', 'cooldown', 'range', 'radius']));
        if (effect === 'damage' || effect === 'heal' || effect === 'debuff') {
          body.push(h('div', { class: 'group-title' }, effect === 'heal' ? 'การฟื้น HP' : 'ดาเมจ / ผลต่อศัตรู'),
            F(['power', 'hits', 'scalesWith', 'statCoef', 'slowPct', 'stunSec', 'duration']));
        }
        if (effect === 'buff') body.push(h('div', { class: 'group-title' }, 'บัฟ (ระหว่างที่ออกฤทธิ์)'), F(['duration', ...bonuses]));
      } else {
        body.push(h('div', { class: 'group-title' }, 'โบนัสถาวรเมื่อเรียนแล้ว'), F(bonuses));
      }
      body.push(h('div', { class: 'group-title' }, 'สมุดสกิล / กาชา'), F(['bookSellPrice', 'gachaWeight']));
      return h('div', { class: 'card' },
        h('h3', {}, skillVal(id, 'name') || id, h('small', {}, id),
          h('small', { style: `color:${RARITY_COLOR[rar] || '#94a3b8'};font-weight:700` }, `${rar} • ${isActive ? 'Active' : 'Passive'}`),
          h('small', {}, `กาชาออก ~${chance.toFixed(1)}%`),
          isDefault ? null : h('button', { class: 'btn small danger', onclick: () => {
            delete ov.skills[id]; if (!Object.keys(ov.skills).length) delete ov.skills; setDirty(true); renderList();
          } }, 'ลบ')),
        ...body);
    });
    return [summary, ...cards];
  }

  const PANELS = {
    maps: [panelMaps, buildMaps],
    objects: [panelObjects, buildObjects],
    ui: [panelUi, buildUi],
    monsters: [panelMonsters, buildMonsters],
    spawns: [panelSpawns, buildSpawns],
    items: [panelItems, buildItems],
    quests: [panelQuests, buildQuests],
    skills: [panelSkills, buildSkills]
  };

  function render() {
    renderTabs();
    const [panelFn, builder] = PANELS[tab];
    listBuilder = builder;
    $('panel').replaceChildren(...panelFn());
    renderList();
  }

  // ---- load / save / login ----
  function loadState(payload) {
    state = payload;
    // An older server (started before this version) doesn't send the item list for drop tables
    if (!state.itemsInfo) {
      state.itemsInfo = {};
      toast('server เป็นเวอร์ชันเก่า — รีสตาร์ท server (npm start) เพื่อใช้ตั้งค่าดรอป', true);
    }
    state.defaults.drops ||= {};
    ov = JSON.parse(JSON.stringify(payload.overrides || {}));
    spawns = JSON.parse(JSON.stringify(payload.spawns || []));
    setDirty(false);
  }

  async function enter() {
    try {
      loadState(await api('GET', '/api/studio/data'));
      sessionStorage.setItem('studio_token', token);
      $('login').hidden = true;
      $('app').hidden = false;
      $('btn-logout').hidden = false;
      render();
    } catch (e) {
      sessionStorage.removeItem('studio_token');
      $('login').hidden = false;
      $('app').hidden = true;
      $('login-error').textContent = e.status === 401 ? 'token ไม่ถูกต้อง' : `เชื่อมต่อไม่ได้: ${e.message}`;
    }
  }

  $('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    token = $('token').value.trim();
    enter();
  });
  $('btn-logout').addEventListener('click', () => {
    sessionStorage.removeItem('studio_token');
    location.reload();
  });
  $('btn-save').addEventListener('click', async () => {
    $('btn-save').disabled = true;
    try {
      loadState(await api('PUT', '/api/studio/save', { overrides: ov, spawns }));
      render();
      toast('บันทึกแล้ว — ผู้เล่นที่ออนไลน์จะโหลดเกมใหม่อัตโนมัติ');
    } catch (e) {
      toast(`บันทึกไม่สำเร็จ: ${e.message}`, true);
      $('btn-save').disabled = false;
    }
  });
  window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  if (token) enter();
})();
