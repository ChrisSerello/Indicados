// assign.js — Reatribuição de Indiquer / Indicado
// Compatível com admin.html e moderador.html

let _assignId   = null;   // ID do referrer (indiquer ou indicado)
let _assignType = null;   // 'indiquer' | 'indicado'

/* ─── Abre o modal de atribuição ─────────────────────────── */
async function openAssign(id, type) {
  _assignId   = id;
  _assignType = type;

  // Busca o registro nas arrays globais (declaradas nos scripts inline)
  const allPeople = [
    ...(typeof allInq !== 'undefined' ? allInq : []),
    ...(typeof allInd !== 'undefined' ? allInd : [])
  ];
  const record = allPeople.find(r => r.id === id);

  if (!record) {
    // Fallback: tenta buscar direto no Supabase
    const { data, error } = await sb.from('referrers')
      .select('id,name,role')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      toast('Registro não encontrado.', false);
      return;
    }
    // usa o registro vindo do banco
    _openAssignModal(data.name, type, data.role);
  } else {
    _openAssignModal(record.name, type, record.role);
  }
}

async function _openAssignModal(name, type, role) {
  // Subtítulo
  const subtitle = document.getElementById('assign-subtitle');
  if (subtitle) {
    subtitle.textContent =
      `Reatribuindo: ${name || '—'} (${role === 'indiquer' ? 'Indiquer' : 'Indicado'})`;
  }

  // Limpa feedback
  const fb = document.getElementById('assign-fb');
  if (fb) { fb.textContent = ''; }

  // Esconde campo de indiquer até selecionar moderador
  const inqField = document.getElementById('assign-inq-field');
  if (inqField) inqField.style.display = 'none';

  // Preenche select de moderadores
  const modSel = document.getElementById('assign-mod-sel');
  if (modSel) {
    modSel.innerHTML = '<option value="">— Selecione o moderador —</option>';

    // Tenta usar array global; se não existir, busca no banco
    let mods = (typeof allMods !== 'undefined' && allMods.length)
      ? allMods
      : await _fetchMods();

    mods.forEach(m => {
      const opt = document.createElement('option');
      opt.value        = m.id;
      opt.textContent  = `${m.name} [${m.code}]`;
      opt.dataset.code = m.code;
      modSel.appendChild(opt);
    });
  }

  document.getElementById('assign-popup').style.display = 'flex';
}

/* ─── Busca moderadores via Supabase (fallback) ─────────── */
async function _fetchMods() {
  const { data } = await sb.from('moderators')
    .select('id,name,code')
    .order('name');
  return data || [];
}

/* ─── Fecha o modal ──────────────────────────────────────── */
function closeAssign() {
  document.getElementById('assign-popup').style.display = 'none';
  _assignId   = null;
  _assignType = null;
}

/* ─── Ao trocar moderador: carrega indiquers (para indicado) */
async function onAssignModChange() {
  const modId    = document.getElementById('assign-mod-sel')?.value;
  const inqField = document.getElementById('assign-inq-field');
  const inqSel   = document.getElementById('assign-inq-sel');

  if (_assignType === 'indicado' && modId) {
    if (inqField) inqField.style.display = 'block';
    if (inqSel)   inqSel.innerHTML = '<option value="">— Selecione o indiquer —</option>';

    // Tenta array global primeiro
    let inqs = (typeof allInq !== 'undefined')
      ? allInq.filter(i => i.moderator_id === modId)
      : [];

    // Fallback Supabase
    if (!inqs.length) {
      const { data } = await sb.from('referrers')
        .select('id,name,code')
        .eq('moderator_id', modId)
        .eq('role', 'indiquer')
        .order('name');
      inqs = data || [];
    }

    inqs.forEach(i => {
      const opt        = document.createElement('option');
      opt.value        = i.id;
      opt.textContent  = `${i.name || '—'} [${i.code}]`;
      opt.dataset.code = i.code;
      inqSel.appendChild(opt);
    });
  } else {
    if (inqField) inqField.style.display = 'none';
  }
}

/* ─── Salva a reatribuição ───────────────────────────────── */
async function saveAssign() {
  if (!_assignId) return;

  const modSel = document.getElementById('assign-mod-sel');
  const inqSel = document.getElementById('assign-inq-sel');
  const fb     = document.getElementById('assign-fb');
  const btn    = document.getElementById('btn-assign-save');

  const modId = modSel?.value;
  if (!modId) {
    if (fb) { fb.style.color = '#fb7185'; fb.textContent = 'Selecione o moderador de destino.'; }
    return;
  }

  // Código do moderador (dataset ou busca no banco)
  let modCode = modSel.options[modSel.selectedIndex]?.dataset?.code;
  if (!modCode) {
    const mods = typeof allMods !== 'undefined' ? allMods : await _fetchMods();
    modCode = mods.find(m => m.id === modId)?.code;
  }
  if (!modCode) {
    const { data } = await sb.from('moderators').select('code').eq('id', modId).single();
    modCode = data?.code;
  }
  if (!modCode) {
    if (fb) { fb.style.color = '#fb7185'; fb.textContent = 'Erro: código do moderador não encontrado.'; }
    return;
  }

  if (btn) { btn.textContent = 'Salvando…'; btn.disabled = true; }
  if (fb)  { fb.textContent = ''; }

  try {
    if (_assignType === 'indiquer') {
      /* ── Reatribui indiquer: troca moderator_id e ref_origin ── */
      const { error } = await sb.from('referrers')
        .update({ moderator_id: modId, ref_origin: modCode })
        .eq('id', _assignId);

      if (error) throw error;

      /* ── Cascata: move os indicados vinculados junto ─────────── */
      // Busca o código do indiquer para encontrar os indicados pelo ref_origin
      const allPeople = [
        ...(typeof allInq !== 'undefined' ? allInq : []),
        ...(typeof allInd !== 'undefined' ? allInd : [])
      ];
      let inqCode = allPeople.find(r => r.id === _assignId)?.code;

      // Fallback: busca no banco se não encontrou na array
      if (!inqCode) {
        const { data: inqData } = await sb.from('referrers')
          .select('code')
          .eq('id', _assignId)
          .single();
        inqCode = inqData?.code;
      }

      if (inqCode) {
        const { data: subInds } = await sb.from('referrers')
          .select('id')
          .eq('ref_origin', inqCode)
          .eq('role', 'indicado');

        if (subInds?.length) {
          const { error: subErr } = await sb.from('referrers')
            .update({ moderator_id: modId })
            .in('id', subInds.map(i => i.id));

          if (subErr) throw subErr;
        }
      }

      toast('✅ Indiquer e indicados reatribuídos com sucesso!');

    } else {
      /* ── Reatribui indicado: precisa de um indiquer de destino ── */
      const inqId = inqSel?.value;
      if (!inqId) {
        if (fb) { fb.style.color = '#fb7185'; fb.textContent = 'Selecione o indiquer de destino.'; }
        if (btn) { btn.textContent = '🔀 Confirmar Atribuição'; btn.disabled = false; }
        return;
      }

      // Código do indiquer de destino
      let inqCode = inqSel.options[inqSel.selectedIndex]?.dataset?.code;
      if (!inqCode) {
        const { data } = await sb.from('referrers').select('code').eq('id', inqId).single();
        inqCode = data?.code;
      }
      if (!inqCode) throw new Error('Código do indiquer não encontrado.');

      const { error } = await sb.from('referrers')
        .update({ moderator_id: modId, ref_origin: inqCode })
        .eq('id', _assignId);

      if (error) throw error;
      toast('✅ Indicado reatribuído com sucesso!');
    }

    closeAssign();
    if (typeof loadData === 'function') loadData();

  } catch (err) {
    if (fb) {
      fb.style.color  = '#fb7185';
      fb.textContent  = 'Erro: ' + (err.message || 'Tente novamente.');
    }
  } finally {
    if (btn) { btn.textContent = '🔀 Confirmar Atribuição'; btn.disabled = false; }
  }
}