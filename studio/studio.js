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
  // Picture of an item: its sprite crop, else the mount / paper-doll part image, else the emoji
  function itemPic(id, px = 56) {
    const info = state.itemsInfo?.[id] || {};
    if (info.sprite) return pic(info.sprite, info.icon, px);
    const src = info.type === 'mount' ? `/assets/sprites/mounts/${id}.png` : info.part ? `/assets/sprites/player/parts/${info.part}.png` : null;
    if (!src) return pic(null, info.icon, px);
    const holder = h('span', { class: 'pic', style: `width:${px}px;height:${px}px;display:inline-flex;align-items:center;justify-content:center` });
    const img = h('img', { src, style: `max-width:${px}px;max-height:${px}px;object-fit:contain` });
    img.onerror = () => holder.replaceChildren(pic(null, info.icon, px));
    holder.append(img);
    return holder;
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
    if (!state.schema[col].freeForm && def === undefined && !opts.force) {
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
    { id: 'ui', icon: '🖥️', label: 'หน้าจอ UI', sub: 'สีธีม + ขนาดตัวละคร + ซ่อน/แสดงแผง' },
    { id: 'monsters', icon: '👾', label: 'มอนสเตอร์', sub: 'ค่าพลัง + พฤติกรรม' },
    { id: 'spawns', icon: '🌱', label: 'การเกิดของมอนสเตอร์', sub: 'จำนวน + เวลาเกิดใหม่' },
    { id: 'items', icon: '🎒', label: 'ไอเทม', sub: 'อาวุธ เกราะ ยา' },
    { id: 'relics', icon: '💎', label: 'Relic', sub: 'ชื่อ ไอคอน โบนัสถาวรของ Relic แต่ละตัว' },
    { id: 'quests', icon: '📜', label: 'เควสต์', sub: 'ชื่อ เป้าหมาย รางวัล' },
    { id: 'sounds', icon: '🔊', label: 'เสียง', sub: 'ฟันมอนตาย โดนตี สกิล ฯลฯ + ลองฟัง' },
    { id: 'exp', icon: '📈', label: 'กราฟ EXP', sub: 'EXP ต่อเลเวล (ดูอย่างเดียว)' },
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
      h('div', { class: 'fields' }, ...fieldsFor('zones', id, ['name', 'desc']), ...fieldsFor('maps', id, ['size', 'texture', 'floorImage', 'floor', 'wall']))
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
          const others = list.reduce((a, x, j) => a + (j === i ? 0 : x.chance), 0);
          const room = Math.max(0.1, Math.round((1 - others) * 1000) / 10);
          let v = Math.min(100, Math.max(0.1, Number(e.target.value) || 0.1));
          if (v > room) { v = room; toast(`รวมต้องไม่เกิน 100% — ใส่ได้สูงสุด ${room}%`, true); }
          e.target.value = v; list[i].chance = Math.round(v * 10) / 1000; setDrops(id, list); draw();
        } });
        return h('div', { class: 'droprow' }, holder, sel, h('span', { class: 'pct' }, pct, '%'),
          h('button', { class: 'btn small danger', title: 'ลบออกจากรายการ', onclick: () => { list.splice(i, 1); setDrops(id, list); draw(); } }, '✕'));
      });
      const isOv = ov.drops?.[id] !== undefined;
      const total = Math.round(list.reduce((a, x) => a + x.chance, 0) * 1000) / 10;
      const nothing = Math.max(0, Math.round((100 - total) * 10) / 10);
      const sepRow = (key, label) => {
        const inp = h('input', { type: 'number', min: 0, max: 100, step: 0.01, value: Math.round(Number(valueOf('monsters', id, key) ?? 0) * 10000) / 100, onchange: (e) => {
          const v = Math.min(100, Math.max(0, Number(e.target.value) || 0));
          e.target.value = v; setValue('monsters', id, key, Math.round(v * 100) / 10000);
        } });
        return h('div', { class: 'droprow' }, h('span', { class: 'pichold' }, label.split(' ')[0]), h('span', {}, label.slice(label.indexOf(' ') + 1)), h('span', { class: 'pct' }, inp, '%'));
      };
      host.replaceChildren(
        h('div', { class: 'group-title' }, 'ไอเทมปกติ (สุ่มครั้งเดียว รวมกันเต็ม 100%)'),
        ...(rows.length ? rows : [h('div', { class: 'empty small' }, 'ไม่มีไอเทมดรอป')]),
        h('div', { class: 'droprow' }, h('span', { class: 'pichold' }, '🚫'), h('span', {}, 'ไม่ดรอปอะไร (ส่วนที่เหลือ)'), h('span', { class: 'pct' }, `${nothing}%`)),
        h('div', { class: 'hint' }, `รวมไอเทม ${total}% + ไม่ดรอป ${nothing}% = 100%`),
        h('div', { class: 'group-title' }, 'สุ่มแยก (สุ่มเพิ่มอีกครั้งต่างหาก ไม่เกี่ยวกับตารางด้านบน)'),
        sepRow('petChance', '🐾 Pet หน้าตาเหมือนมอนสเตอร์'),
        sepRow('relicChance', '💎 Relic พิเศษประจำมอนสเตอร์'),
        h('div', { class: 'dropbtns' },
          h('button', { class: 'btn small', disabled: list.length >= MAX_DROPS || nothing < 0.1, onclick: () => {
            const used = new Set(list.map(x => x.itemId));
            const next = itemIds.find(iid => !used.has(iid));
            if (!next) return;
            list.push({ itemId: next, chance: Math.min(0.1, Math.round(nothing * 10) / 1000) }); setDrops(id, list); draw();
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
        const pat = texMod.getFloorPattern(g, tex, floor, valueOf('maps', mapId, 'floorImage'), () => drawObjCanvas && drawObjCanvas());
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
      itemFilterBar(),
      (listHost = h('div'))
    ];
  }
  // filter: all / normal items / wearable (paper-doll) items, wearable split by slot
  const WEAR_TYPES = [['hat', '🎩 หมวก'], ['head', '🙂 หัว'], ['outfit', '👕 ชุด'], ['back', '🪽 ปีก/ผ้าคลุม'], ['shield', '🛡️ โล่'], ['mount', '🐎 สัตว์ขี่']];
  let itemGroup = 'all', itemWear = 'all';
  function itemFilterBar() {
    const bar = h('div', { class: 'dropbtns' });
    const draw = () => {
      const btn = (label, on, fn) => h('button', { class: 'btn small' + (on ? ' primary' : ''), onclick: fn }, label);
      const kids = [['all', 'ทั้งหมด'], ['normal', 'ไอเทมธรรมดา'], ['wear', 'สวมใส่']].map(([g, l]) => btn(l, itemGroup === g, () => { itemGroup = g; itemWear = 'all'; draw(); renderList(); }));
      if (itemGroup === 'wear') kids.push(h('span', {}, ' | '), btn('ทุกชิ้น', itemWear === 'all', () => { itemWear = 'all'; draw(); renderList(); }),
        ...WEAR_TYPES.map(([t, l]) => btn(l, itemWear === t, () => { itemWear = t; draw(); renderList(); })));
      bar.replaceChildren(...kids);
    };
    draw();
    return bar;
  }
  const itemPassesFilter = (id) => {
    const t = state.itemsInfo?.[id]?.type, wear = WEAR_TYPES.some(([x]) => x === t);
    if (itemGroup === 'normal') return !wear;
    if (itemGroup === 'wear') return itemWear === 'all' ? wear : t === itemWear;
    return true;
  };
  // Live preview of a player-gear item (outfit / shield / mount) with the values being edited
  const IMG_CACHE = {};
  let previewZoom = 1.6; // preview magnification (kept across cards)
  const loadImg = (src) => IMG_CACHE[src] || (IMG_CACHE[src] = Object.assign(new Image(), { src }));
  // Extra picture layers of a player piece (clone + crop, see src/player_look.js)
  const currentLayers = (id) => ov.layers?.[id] ?? state.defaults.layers?.[id] ?? [];
  function setLayers(id, list) {
    if (JSON.stringify(list) === JSON.stringify(state.defaults.layers?.[id] ?? [])) {
      if (ov.layers) { delete ov.layers[id]; if (!Object.keys(ov.layers).length) delete ov.layers; }
    } else { ov.layers ||= {}; ov.layers[id] = list; }
    setDirty(true);
  }
  function layersEditor(id, onChange) {
    const host = h('div', { class: 'layers' });
    Promise.all([import('/src/player_sprites.js'), import('/src/player_look.js')]).then(([{ PLAYER_SPRITES: PS }, LK]) => {
      const partIds = Object.keys(PS.parts).filter(p => p !== 'body_nohead');
      const draw = () => {
        const list = currentLayers(id).map(l => ({ ...l }));
        const save = () => { setLayers(id, list); onChange(); };
        const num = (l, k, w = 62, step = 1) => h('input', { type: 'number', step, style: `width:${w}px`, value: l[k], onchange: (e) => { l[k] = Number(e.target.value) || 0; save(); draw(); } });
        const sel = (l, k, opts) => h('select', { onchange: (e) => { l[k] = e.target.value; save(); draw(); } }, ...opts.map(([v, lab]) => h('option', { value: v, selected: v === l[k] }, lab)));
        const lab = (txt, el) => h('label', { class: 'minifield' }, h('span', {}, txt), el);
        const rows = list.map((l, i) => {
          const P = PS.parts[l.src] || { w: 1, h: 1 };
          // drawing board: the source picture; drag the mouse around the part to keep (the outline closes on release)
          const BOX = 280, S = Math.min(BOX / P.w, BOX / P.h), cw = Math.round(P.w * S), chh = Math.round(P.h * S);
          const mini = h('canvas', { width: cw, height: chh, class: 'gearprev', style: 'cursor:crosshair;touch-action:none' });
          const im = new Image(); im.src = `/assets/sprites/player/parts/${l.src}.png`;
          const paint = (live) => {
            const c = mini.getContext('2d'); c.clearRect(0, 0, cw, chh);
            c.fillStyle = '#7fb069'; c.fillRect(0, 0, cw, chh);
            if (im.complete) c.drawImage(im, 0, 0, cw, chh);
            const pts = live || l.poly;
            c.lineWidth = 2; c.strokeStyle = '#ef4444'; c.fillStyle = 'rgba(239,68,68,0.15)';
            if (pts && pts.length > 1) { c.beginPath(); pts.forEach(([x, y], k) => (k ? c.lineTo(x * S, y * S) : c.moveTo(x * S, y * S))); if (!live) c.closePath(); c.stroke(); if (!live) c.fill(); }
            else c.strokeRect(l.sx * S, l.sy * S, l.sw * S, l.sh * S);
          };
          im.onload = () => paint();
          let stroke = null;
          const pos = (e) => { const r = mini.getBoundingClientRect(); return [Math.min(P.w, Math.max(0, (e.clientX - r.left) / r.width * P.w)), Math.min(P.h, Math.max(0, (e.clientY - r.top) / r.height * P.h))]; };
          mini.addEventListener('pointerdown', (e) => { mini.setPointerCapture(e.pointerId); stroke = [pos(e)]; paint(stroke); e.preventDefault(); });
          mini.addEventListener('pointermove', (e) => {
            if (!stroke) return;
            const p = pos(e), q = stroke[stroke.length - 1];
            if (Math.hypot(p[0] - q[0], p[1] - q[1]) >= 2) { stroke.push(p); paint(stroke); }
          });
          mini.addEventListener('pointerup', () => {
            const pts = stroke; stroke = null;
            if (!pts || pts.length < 3) { paint(); return; }
            const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
            const nx = Math.floor(Math.min(...xs)), ny = Math.floor(Math.min(...ys)), nw = Math.max(1, Math.ceil(Math.max(...xs)) - nx), nh = Math.max(1, Math.ceil(Math.max(...ys)) - ny);
            const scale = (l.partW || l.sw) / l.sw;                       // keep the same size on the model, and the same spot
            l.partX = Math.round((l.partX + ((nx + nw / 2) - (l.sx + l.sw / 2)) * scale) * 10) / 10;
            l.partY = Math.round((l.partY + ((ny + nh / 2) - (l.sy + l.sh / 2)) * scale) * 10) / 10;
            l.partW = Math.max(5, Math.round(nw * scale * 10) / 10);
            l.sx = nx; l.sy = ny; l.sw = nw; l.sh = nh;
            let slim = pts; if (slim.length > 300) { const step = Math.ceil(slim.length / 300); slim = slim.filter((_, k) => k % step === 0); }
            l.poly = slim.map(p => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]);
            save(); draw();
          });
          return h('div', { class: 'card', style: 'padding:8px;margin:6px 0;display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap' },
            mini,
            h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;flex:1;align-items:flex-end' },
              lab('รูปต้นฉบับ', sel(l, 'src', partIds.map(p => [p, p]))),
              lab('ตัดจาก x', num(l, 'sx')), lab('y', num(l, 'sy')), lab('กว้าง', num(l, 'sw')), lab('สูง', num(l, 'sh')),
              lab('วางกว้าง', num(l, 'partW')), lab('เลื่อน x', num(l, 'partX')), lab('ระดับ y (กึ่งกลาง)', num(l, 'partY')),
              lab('กลับด้าน', sel(l, 'flip', [['no', 'ปกติ'], ['yes', 'กลับด้าน']])),
              lab('ชั้น', sel(l, 'z', LK.LAYER_ZS.map(z => [z, LK.LAYER_Z_LABEL[z]]))),
              h('button', { class: 'btn small', title: 'ใช้ทั้งรูป (ล้างเส้นที่วาด)', onclick: () => { const k = (l.partW || l.sw) / l.sw; l.partX = Math.round((l.partX + (P.w / 2 - (l.sx + l.sw / 2)) * k) * 10) / 10; l.partY = Math.round((l.partY + (P.h / 2 - (l.sy + l.sh / 2)) * k) * 10) / 10; l.partW = Math.round(P.w * k * 10) / 10; l.sx = 0; l.sy = 0; l.sw = P.w; l.sh = P.h; delete l.poly; save(); draw(); } }, '↺ ใช้ทั้งรูป'),
              h('button', { class: 'btn small', title: 'clone เลเยอร์นี้', onclick: () => { if (list.length < LK.MAX_EXTRA_LAYERS) { list.splice(i + 1, 0, { ...l, partX: l.partX + 12 }); save(); draw(); } } }, '⧉ clone'),
              h('button', { class: 'btn small', onclick: () => { if (i > 0) { [list[i - 1], list[i]] = [list[i], list[i - 1]]; save(); draw(); } } }, '↑'),
              h('button', { class: 'btn small', onclick: () => { if (i < list.length - 1) { [list[i + 1], list[i]] = [list[i], list[i + 1]]; save(); draw(); } } }, '↓'),
              h('button', { class: 'btn small danger', onclick: () => { list.splice(i, 1); save(); draw(); } }, '✕')));
        });
        host.replaceChildren(
          h('div', { class: 'group-title' }, 'เลเยอร์เพิ่ม — clone รูปมาแปะเฉพาะส่วน แล้วเลือกว่าอยู่ชั้นไหนของโมเดล'),
          h('div', { class: 'hint' }, '✏️ ลากเมาส์วาดเส้นรอบส่วนที่ต้องการบนรูปต้นฉบับ (ปล่อยเมาส์ = ปิดรูปร่างอัตโนมัติ) — วาดใหม่ได้เรื่อยๆ ส่วนนอกเส้นจะไม่ถูกแสดง'),
          ...rows,
          h('button', { class: 'btn small', disabled: list.length >= LK.MAX_EXTRA_LAYERS, onclick: () => {
            // start from a copy of the main picture (placed where the main piece is); then crop / move it
            const part = state.itemsInfo[id].part, P = PS.parts[part];
            const num0 = (k, d) => { const x = Number(valueOf('items', id, k)); return Number.isFinite(x) ? x : d; };
            const w = num0('partW', P.w), hgt = P.h * w / P.w, y = num0('partY', 301);
            const type = state.itemsInfo[id].type;
            list.push({ src: part, sx: 0, sy: 0, sw: P.w, sh: P.h, partW: w, partX: num0('partX', 0), partY: Math.round(type === 'back' ? y : y - hgt / 2),
              flip: valueOf('items', id, 'flip') === 'yes' ? 'yes' : 'no', z: 'over_outfit' });
            save(); draw();
          } }, '+ clone เลเยอร์จากรูปหลัก'));
      };
      draw();
    });
    return host;
  }

  function gearPreview(id) {
    const info = state.itemsInfo?.[id];
    const type = info?.type;
    if (!['hat', 'head', 'outfit', 'back', 'shield', 'mount'].includes(type)) return null;
    const isPiece = ['hat', 'head', 'outfit', 'back'].includes(type);
    const BW = isPiece ? 300 : type === 'mount' ? 320 : 260, BH = isPiece ? 400 : type === 'mount' ? 280 : 190;
    const cv = h('canvas', { width: Math.round(BW * previewZoom), height: Math.round(BH * previewZoom), class: 'gearprev' });
    const v = (k, d) => { const x = Number(valueOf('items', id, k)); return Number.isFinite(x) ? x : d; };
    // this item with the values being edited (not saved yet) + its fixed part ids from the server
    const live = (iid) => {
      const base = state.itemsInfo[iid] || {};
      const o = { ...base };
      for (const k of ['scale', 'offX', 'offY', 'seatX', 'seatY', 'seatDrop', 'seatClip', 'partW', 'partX', 'partY']) { const x = Number(valueOf('items', iid, k)); if (Number.isFinite(x)) o[k] = x; }
      for (const k of ['flip', 'layer']) { const x = valueOf('items', iid, k); if (x) o[k] = x; }
      o.layers = currentLayers(iid);
      return o;
    };
    const draw = async () => {
      const PS = (await import('/src/player_sprites.js')).PLAYER_SPRITES;
      const { drawLook } = await import('/src/player_look.js');
      const ctx = cv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = '#7fb069'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.scale(previewZoom, previewZoom);
      if (isPiece) {
        // base model + this piece, with a ruler in base-model pixels (y = 0 is the top of the head, 301 = the feet)
        const S = 0.95, cx = 150, feetY = 385, yOf = (by) => feetY + (by - 301) * S;
        ctx.font = '10px sans-serif'; ctx.textBaseline = 'middle';
        for (let by = -100; by <= 300; by += 50) {
          ctx.strokeStyle = by === 0 || by === 134 || by === 301 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.28)';
          ctx.beginPath(); ctx.moveTo(26, yOf(by)); ctx.lineTo(BW, yOf(by)); ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.fillText(String(by), 2, yOf(by));
        }
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillText('คาง=134', 215, yOf(134) - 7); ctx.fillText('เท้า=301', 215, yOf(301) - 7);
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, BH); ctx.stroke(); ctx.setLineDash([]);
        const me = live(id);
        const look = { back: type === 'back' ? me : null, outfit: type === 'outfit' ? me : null, head: type === 'head' ? me : null, hat: type === 'hat' ? me : null };
        ctx.save(); ctx.translate(cx + 1, feetY - 24 * S); ctx.scale(S, S);
        drawLook(ctx, (src) => { const im = loadImg('/' + src); return im.complete && im.naturalWidth ? im : null; }, look, 1);
        ctx.restore();
        return;
      }
      const U = type === 'mount' ? 1.7 : 2.4, cx = BW / 2, gy = type === 'mount' ? 235 : 150, kb = 58 / 301 * U;     // world unit -> px
      const look = { hat: null, head: null, back: null, outfit: { part: 'outfit_knight', partW: 128, partY: 303 } };
      let rx = cx, ry = gy, drawMountPrev = null;
      if (type === 'mount') {
        const ms = PS.mounts[id], img = loadImg(`/assets/sprites/mounts/${id}.png`);
        const H = { mount_runner: 50, mount_wolf: 40, mount_unicorn: 62, mount_drake: 44 }[id] || 50;
        const k = H * v('scale', 1) * U / ms.h, w = ms.w * k, h2 = ms.h * k, left = valueOf('items', id, 'flip') === 'yes';
        drawMountPrev = () => { ctx.save(); ctx.translate(cx + v('offX', 0) * U, gy + v('offY', 0) * U); if (left) ctx.scale(-1, 1);
          if (img.complete) ctx.drawImage(img, -w / 2, -h2, w, h2); ctx.restore(); };
        if (valueOf('items', id, 'layer') !== 'front') drawMountPrev();
        const sx = v('seatX', 0.5), sy = v('seatY', 0.4);
        rx = cx + v('offX', 0) * U + ((left ? 1 - sx : sx) - 0.5) * w; ry = gy + v('offY', 0) * U - h2 + sy * h2 + v('seatDrop', 6) * U;
      }
      const drawShieldPrev = () => {
        if (type !== 'shield') return;
        const sm = PS.parts[id], simg = loadImg(`/assets/sprites/player/parts/${id}.png`), sw = 20 * v('scale', 1) * U, sh = sw * sm.h / sm.w;
        if (simg.complete) {
          ctx.save(); ctx.translate(cx + (5 + v('offX', 0)) * U, gy + (-21 + v('offY', 0)) * U);
          if (valueOf('items', id, 'flip') === 'yes') ctx.scale(-1, 1);
          ctx.drawImage(simg, -sw / 2, -sh / 2, sw, sh); ctx.restore();
        }
      };
      if (valueOf('items', id, 'layer') === 'behind') drawShieldPrev();
      ctx.save();
      ctx.translate(rx, ry - 24 * U);
      if (type === 'mount' && v('seatClip', 0) > 0) { ctx.beginPath(); ctx.rect(-130, -190, 260, 190 + 24 * U - v('seatClip', 0) * U); ctx.clip(); }
      // drawLook works in world units: scale the context instead of k
      ctx.scale(U, U);
      drawLook(ctx, (src) => { const im = loadImg('/' + src); return im.complete && im.naturalWidth ? im : null; }, look, 58 / 301);
      ctx.restore();
      if (drawMountPrev && valueOf('items', id, 'layer') === 'front') drawMountPrev();
      if (valueOf('items', id, 'layer') !== 'behind') drawShieldPrev();
    };
    const redraw = () => draw().catch(() => {});
    setTimeout(redraw, 50); setTimeout(redraw, 400); setTimeout(redraw, 1200); // images may still be loading
    return { cv, redraw };
  }

  // Normal items (not material / weapon / armor / wearable): editable "use" effect - restore HP / SP, instant EXP. 0 = no effect.
  function useEffectBox(id) {
    const t = state.itemsInfo?.[id]?.type;
    if (['weapon', 'armor', 'material', ...WEAR_TYPES.map(x => x[0]), 'pet'].includes(t)) return null;
    const keys = ['heal', 'sp', 'exp'];
    const clear = h('button', { class: 'btn small', type: 'button', onclick: () => { keys.forEach(k => setValue('items', id, k, 0)); renderList(); } }, '🗑️ เอาเอฟเฟกต์ออกทั้งหมด');
    return h('div', { class: 'card' },
      h('div', { class: 'hint' }, '🧪 เอฟเฟกต์เมื่อใช้ไอเท็ม (บัฟ) — ใส่ค่า > 0 ให้ไอเท็มนี้กดใช้ได้ในกระเป๋า, ใส่ 0 = ไม่มีเอฟเฟกต์'),
      h('div', { class: 'fields' }, ...keys.map(k => field('items', id, k, { force: true }))), clear);
  }
  function buildItems(q) {
    return Object.keys(state.defaults.items).filter(id => itemPassesFilter(id) && matches(q, id, valueOf('items', id, 'name'))).map(id => {
      const prev = gearPreview(id);
      const card = h('div', { class: 'card' },
        h('h3', {}, itemPic(id, 48), ' ', valueOf('items', id, 'name'), h('small', {}, id)),
        prev ? h('div', { class: 'hint' }, 'ตัวอย่างบนตัวละคร (ปรับค่าแล้วภาพขยับตามทันที)') : null,
        prev ? prev.cv : null,
        (prev && ['hat', 'head', 'outfit', 'back'].includes(state.itemsInfo[id].type)) ? layersEditor(id, () => prev.redraw()) : null,
        useEffectBox(id),
        h('div', { class: 'fields' }, ...fieldsFor('items', id, ['name', 'price', 'atk', 'def', 'hp', 'reqLevel', 'lootSpeed', 'speedPct', 'flip', 'layer', 'partW', 'partX', 'partY', 'scale', 'offX', 'offY', 'seatX', 'seatY', 'seatDrop', 'seatClip', 'desc']))
      );
      if (prev) {
        const tog = (key, a, b, label) => h('button', { class: 'btn small', onclick: () => { setValue('items', id, key, valueOf('items', id, key) === a ? b : a); renderList(); } }, label);
        card.insertBefore(h('div', { class: 'dropbtns' },
          tog('flip', 'yes', 'no', '↔ กลับด้านซ้าย-ขวา (flip)'),
          tog('layer', 'behind', 'front', '⇅ สลับ ข้างหน้า / ข้างหลังโมเดล'),
          h('button', { class: 'btn small', onclick: () => { previewZoom = Math.min(4, previewZoom + 0.4); renderList(); } }, '🔍＋ ขยาย'),
          h('button', { class: 'btn small', onclick: () => { previewZoom = Math.max(0.8, previewZoom - 0.4); renderList(); } }, '🔍－ ย่อ')), prev.cv);
      }
      if (prev) { card.addEventListener('input', () => setTimeout(prev.redraw, 0)); card.addEventListener('change', () => setTimeout(prev.redraw, 0)); }
      return card;
    });
  }

  function panelQuests() {
    return [
      h('h2', {}, 'เควสต์'),
      h('p', { class: 'hint' }, 'แก้ชื่อ คำอธิบาย จำนวนที่ต้องกำจัด และรางวัลของเควสต์'),
      (listHost = h('div'))
    ];
  }
  function panelRelics() {
    return [
      h('h2', {}, 'Relic ประจำมอนสเตอร์'),
      h('p', { class: 'hint' }, 'แก้ชื่อ ไอคอน และโบนัสสเตตัสถาวรของ Relic (ใส่ 0 = ไม่มีโบนัสนั้น) • % ที่ดรอปตั้งที่แท็บ "มอนสเตอร์" หัวข้อ "สุ่มแยก"'),
      searchBar('ค้นหา Relic...'),
      (listHost = h('div'))
    ];
  }
  function buildRelics() {
    return Object.keys(state.defaults.relics || {}).filter(id => !search || `${id} ${valueOf('relics', id, 'name')}`.toLowerCase().includes(search)).map(id => h('div', { class: 'card' },
      h('h3', {}, `${valueOf('relics', id, 'icon') || ''} ${valueOf('relics', id, 'name')}`, h('small', {}, id)),
      h('div', { class: 'fields' }, ...fieldsFor('relics', id, ['name', 'icon', 'desc', 'hp', 'atk', 'def', 'aspd', 'critRate']))
    ));
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
      if (isActive) body.push(h('div', { class: 'group-title' }, 'เสียง'), F(['sound']));
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

  // ---- sounds ----
  let engine = null;
  async function previewSound(id) {
    try {
      engine ||= (await import('/src/audio.js')).soundEngine;
      engine.muted = false;
      const p = {};
      for (const k of Object.keys(state.schema.sounds.fields)) p[k] = valueOf('sounds', id, k);
      engine.playParams(p);
    } catch (e) { toast('เล่นเสียงไม่ได้: ' + e.message, true); }
  }

  let soundTab = 'general'; // 'general' | 'skill'
  const SOUND_TABS = [['general', '🔊 เสียงทั่วไป'], ['skill', '✨ เสียงสกิล']];

  function panelSounds() {
    return [
      h('h2', {}, 'เสียง'),
      h('div', { style: 'display:flex;gap:6px;margin:8px 0;' }, ...SOUND_TABS.map(([id, label]) =>
        h('button', { class: 'btn' + (soundTab === id ? ' primary' : ''), onclick: () => { soundTab = id; render(); } }, label))),
      h('p', { class: 'hint' }, 'ปรับเสียงเอฟเฟกต์ของเกม (สังเคราะห์สด ไม่ต้องมีไฟล์) — กด ▶ ลองฟังค่าที่กำลังแก้ได้ทันทีก่อนบันทึก • ทดลองปรับ "ความถี่", "ส่วนเสียงซ่า", "ความยาว" เพื่อได้เสียงใหม่'),
      searchBar('ค้นหาเสียง...'),
      (listHost = h('div'))
    ];
  }

  function buildSounds() {
    const groups = soundTab === 'skill'
      ? [['✨ เสียงสกิล (เลือกใช้กับสกิลได้ที่แท็บ "สกิล")', ['powerStrike', 'whirlwind', 'ironGuard', 'berserk', 'dash', 'warCry', 'falconCry', 'dragonRoar', 'firstAid', 'townPortal']]]
      : [
        ['⚔️ การต่อสู้', ['slash', 'critHit', 'monsterHit', 'monsterDie', 'playerHurt', 'bowShoot', 'arrowHit']],
        ['🎁 อื่นๆ', ['levelUp', 'coin', 'loot', 'potion']]
      ];
    const out = [];
    for (const [title, ids] of groups) {
      const cards = ids.filter(id => state.defaults.sounds?.[id]).map(id => {
        const meta = state.soundMeta?.[id] || { label: id, when: '' };
        if (search && !(`${id} ${meta.label} ${meta.when}`.toLowerCase().includes(search))) return null;
        const fields = h('div', { class: 'fields' }, ...fieldsFor('sounds', id, Object.keys(state.schema.sounds.fields)));
        return h('div', { class: 'card' },
          h('h3', {}, meta.label, h('small', {}, `${id} • ${meta.when}`),
            h('button', { class: 'btn small primary', onclick: () => previewSound(id) }, '▶ ลองฟัง'),
            h('button', { class: 'btn small', onclick: () => {
              if (ov.sounds?.[id]) { delete ov.sounds[id]; if (!Object.keys(ov.sounds).length) delete ov.sounds; setDirty(true); renderList(); }
            } }, '↺ คืนค่าเดิม')),
          fields);
      }).filter(Boolean);
      if (cards.length) out.push(h('h3', { class: 'group-title' }, title), ...cards);
    }
    return out.length ? out : [h('p', { class: 'hint' }, 'ไม่พบเสียง')];
  }

  // Mirrors Player.maxBaseExp in src/player.js (view-only)
  const expForLevel = (L) => Math.floor(60 * Math.pow(L, 1.8) + L * 25);
  const expForLevelOld = (L) => Math.floor(60 * Math.pow(L, 1.5) + L * 25);
  let expMaxLv = 100;

  function panelExp() {
    const W = 860, H = 400, m = { l: 70, r: 20, t: 20, b: 40 };
    const N = expMaxLv;
    const vals = Array.from({ length: N }, (_, i) => expForLevel(i + 1));
    const old = Array.from({ length: N }, (_, i) => expForLevelOld(i + 1));
    const maxV = Math.max(...vals);
    const x = (L) => m.l + (L - 1) / Math.max(1, N - 1) * (W - m.l - m.r);
    const y = (v) => H - m.b - v / maxV * (H - m.t - m.b);
    const path = (arr) => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i + 1).toFixed(1)},${y(v).toFixed(1)}`).join('');
    let grid = '';
    for (let i = 0; i <= 5; i++) {
      const v = maxV * i / 5, yy = y(v);
      grid += `<line x1="${m.l}" x2="${W - m.r}" y1="${yy}" y2="${yy}" stroke="#8884" /><text x="${m.l - 6}" y="${yy + 4}" text-anchor="end" font-size="11" fill="currentColor">${Math.round(v).toLocaleString()}</text>`;
    }
    const step = N <= 20 ? 1 : N <= 60 ? 5 : 10;
    for (let L = 1; L <= N; L++) {
      if (L !== 1 && L % step) continue;
      grid += `<text x="${x(L)}" y="${H - m.b + 16}" text-anchor="middle" font-size="11" fill="currentColor">${L}</text>`;
    }
    const dots = vals.map((v, i) => `<circle cx="${x(i + 1)}" cy="${y(v)}" r="${N <= 60 ? 3 : 1.5}" fill="#e8743b"><title>Lv.${i + 1} → ${i + 2}: ${v.toLocaleString()} EXP (รวมสะสม ${vals.slice(0, i + 1).reduce((a, b) => a + b, 0).toLocaleString()})</title></circle>`).join('');
    const svg = h('div', { style: 'overflow-x:auto' });
    svg.innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;color:inherit" font-family="sans-serif">
      ${grid}
      <path d="${path(old)}" fill="none" stroke="#888" stroke-width="1.5" stroke-dasharray="5 4"/>
      <path d="${path(vals)}" fill="none" stroke="#e8743b" stroke-width="2.5"/>${dots}
      <text x="${W / 2}" y="${H - 4}" text-anchor="middle" font-size="12" fill="currentColor">เลเวล</text>
      <text x="${W - 150}" y="30" font-size="12" fill="#e8743b">━ ปัจจุบัน (L^1.8)</text>
      <text x="${W - 150}" y="48" font-size="12" fill="#888">┅ เดิม (L^1.5)</text></svg>`;
    const slider = h('input', { type: 'range', min: 10, max: 200, step: 5, value: expMaxLv,
      oninput: (e) => { expMaxLv = +e.target.value; render(); } });
    const total = vals.reduce((a, b) => a + b, 0);
    return [
      h('h2', {}, 'กราฟ EXP ต่อเลเวล'),
      h('p', { class: 'hint' }, 'EXP ที่ต้องใช้เลื่อนจากเลเวล L → L+1 = floor(60 × L^1.8 + 25L) — แก้ที่ Player.maxBaseExp ใน src/player.js (หน้านี้ดูอย่างเดียว) • เอาเมาส์วางบนจุดเพื่อดูค่า'),
      h('label', {}, `แสดงถึงเลเวล ${expMaxLv} `, slider),
      svg,
      h('p', { class: 'hint' }, `EXP สะสมรวมจนถึงเลเวล ${N + 1}: ${total.toLocaleString()}`)
    ];
  }

  const PANELS = {
    exp: [panelExp, () => []],
    maps: [panelMaps, buildMaps],
    objects: [panelObjects, buildObjects],
    ui: [panelUi, buildUi],
    monsters: [panelMonsters, buildMonsters],
    spawns: [panelSpawns, buildSpawns],
    items: [panelItems, buildItems],
    relics: [panelRelics, buildRelics],
    quests: [panelQuests, buildQuests],
    sounds: [panelSounds, buildSounds],
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
