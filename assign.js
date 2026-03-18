// ═══════════════════════════════════════════════════════════════════════
//  MÓDULO DE ATRIBUIÇÃO — Indique & Ganhe 2.0
//  Funciona em admin.html e moderador.html
//  • Atribuir Indiquer → outro Moderador
//  • Atribuir Indicado → outro Indiquer / Moderador
// ═══════════════════════════════════════════════════════════════════════

(function () {
  "use strict";

  /* ── estado interno ───────────────────────────────────────────── */
  let _assignId   = null;   // id do referrer a reatribuir
  let _assignType = null;   // "indiquer" | "indicado"
  let _allMods    = [];     // cache de moderadores (carregado lazy)

  /* ── detecta o painel atual ───────────────────────────────────── */
  const IS_ADMIN = !!document.getElementById("adm-app");

  /* ── helper: supabase client já instanciado no HTML ─────────── */
  const $sb = () => window.sb;

  /* ── helper: lista de moderadores ───────────────────────────── */
  async function getMods() {
    if (_allMods.length) return _allMods;
    const { data } = await $sb()
      .from("moderators")
      .select("id,name,code")
      .order("name");
    _allMods = data || [];
    return _allMods;
  }

  /* ── helper: lista de indiquers de um moderador ──────────────── */
  async function getInqs(modId) {
    if (IS_ADMIN) {
      // no admin os dados já estão na memória
      return (window.allInq || []).filter((i) => i.moderator_id === modId);
    }
    // no moderador faz query direta
    const { data } = await $sb()
      .from("referrers")
      .select("id,name,code,moderator_id")
      .eq("moderator_id", modId)
      .eq("role", "indiquer")
      .order("name");
    return data || [];
  }

  /* ── helper: encontra referrer na memória ─────────────────────── */
  function findRef(id) {
    const pool = [
      ...(window.allInq || []),
      ...(window.allInd || []),
    ];
    return pool.find((r) => r.id === id) || null;
  }

  /* ── helper: moderador do indicado ──────────────────────────── */
  function modOfInd(ref) {
    if (ref.moderator_id) return ref.moderator_id;
    const inq = (window.allInq || []).find((i) => i.code === ref.ref_origin);
    return inq?.moderator_id || null;
  }

  /* ══════════════════════════════════════════════════════════════
     openAssign(id, type)
     Chamado pelos botões 🔀 nos cards de Indiquer / Indicado
  ══════════════════════════════════════════════════════════════ */
  window.openAssign = async function (id, type) {
    _assignId   = id;
    _assignType = type;

    const ref = findRef(id);
    if (!ref) { window.toast && window.toast("Registro não encontrado.", false); return; }

    const typeLbl = type === "indiquer" ? "Indiquer" : "Indicado";
    const sub = document.getElementById("assign-subtitle");
    if (sub) sub.textContent = "Reatribuindo: " + (ref.name || "—") + " (" + typeLbl + ")";

    const fb = document.getElementById("assign-fb");
    if (fb) fb.textContent = "";

    /* popular dropdown de moderadores */
    const mods    = await getMods();
    const curModId = type === "indiquer" ? ref.moderator_id : modOfInd(ref);
    const modSel  = document.getElementById("assign-mod-sel");
    modSel.innerHTML =
      '<option value="">— Selecione o moderador —</option>' +
      mods
        .map(
          (m) =>
            `<option value="${m.id}" data-code="${m.code}"` +
            (m.id === curModId ? " selected" : "") +
            `>${m.name} [${m.code}]` +
            (m.id === curModId ? " ✔ atual" : "") +
            `</option>`
        )
        .join("");

    /* esconder campo de indiquer até mod ser selecionado */
    const inqField = document.getElementById("assign-inq-field");
    if (inqField) inqField.style.display = "none";

    const inqSel = document.getElementById("assign-inq-sel");
    if (inqSel) inqSel.innerHTML = '<option value="">— Selecione o indiquer —</option>';

    document.getElementById("assign-popup").style.display = "flex";
  };

  /* ══════════════════════════════════════════════════════════════
     closeAssign()
  ══════════════════════════════════════════════════════════════ */
  window.closeAssign = function () {
    const popup = document.getElementById("assign-popup");
    if (popup) popup.style.display = "none";
    _assignId   = null;
    _assignType = null;
  };

  /* ══════════════════════════════════════════════════════════════
     onAssignModChange()
     Ao trocar o moderador de destino, carrega os indiquers dele
     (só relevante quando estamos atribuindo um Indicado)
  ══════════════════════════════════════════════════════════════ */
  window.onAssignModChange = async function () {
    if (_assignType !== "indicado") return;

    const modSel  = document.getElementById("assign-mod-sel");
    const modId   = modSel.value;
    const inqField = document.getElementById("assign-inq-field");
    const inqSel  = document.getElementById("assign-inq-sel");

    if (!modId) {
      if (inqField) inqField.style.display = "none";
      return;
    }

    if (inqSel) inqSel.innerHTML = '<option value="">Carregando…</option>';
    if (inqField) inqField.style.display = "block";

    const inqs = await getInqs(modId);
    if (!inqs.length) {
      if (inqSel)
        inqSel.innerHTML =
          '<option value="">Nenhum indiquer cadastrado neste moderador</option>';
      return;
    }
    if (inqSel)
      inqSel.innerHTML =
        '<option value="">— Selecione o indiquer —</option>' +
        inqs
          .map(
            (i) =>
              `<option value="${i.code}" data-modid="${i.moderator_id}">` +
              `${i.name || "—"} [${i.code}]</option>`
          )
          .join("");
  };

  /* ══════════════════════════════════════════════════════════════
     saveAssign()
     Persiste a reatribuição no Supabase
  ══════════════════════════════════════════════════════════════ */
  window.saveAssign = async function () {
    if (!_assignId || !_assignType) return;

    const fb     = document.getElementById("assign-fb");
    const btn    = document.getElementById("btn-assign-save");
    const modSel = document.getElementById("assign-mod-sel");
    const modId  = modSel.value;
    const modCode =
      modSel.options[modSel.selectedIndex]?.dataset?.code || "";

    if (fb) fb.textContent = "";

    if (!modId) {
      if (fb) fb.textContent = "Selecione um moderador de destino.";
      return;
    }

    if (btn) { btn.textContent = "Salvando…"; btn.disabled = true; }

    try {
      if (_assignType === "indiquer") {
        /* ── Indiquer → novo Moderador ───────────────────────── */
        const { error } = await $sb()
          .from("referrers")
          .update({ moderator_id: modId, ref_origin: modCode })
          .eq("id", _assignId);
        if (error) throw error;
        window.toast && window.toast("✅ Indiquer reatribuído com sucesso!");

      } else {
        /* ── Indicado → novo Indiquer / Moderador ────────────── */
        const inqSel  = document.getElementById("assign-inq-sel");
        const inqCode = inqSel ? inqSel.value : "";
        if (!inqCode) {
          if (fb) fb.textContent = "Selecione um indiquer de destino.";
          if (btn) { btn.textContent = "🔀 Confirmar Atribuição"; btn.disabled = false; }
          return;
        }
        /* recupera moderator_id do indiquer alvo */
        const { data: inqRow } = await $sb()
          .from("referrers")
          .select("moderator_id")
          .eq("code", inqCode)
          .maybeSingle();

        const { error } = await $sb()
          .from("referrers")
          .update({
            ref_origin:   inqCode,
            moderator_id: inqRow?.moderator_id || modId,
          })
          .eq("id", _assignId);
        if (error) throw error;
        window.toast && window.toast("✅ Indicado reatribuído com sucesso!");
      }

      closeAssign();
      window.loadData && window.loadData(); // recarrega a tela
    } catch (err) {
      if (fb) fb.textContent = "Erro: " + (err.message || "Tente novamente.");
    } finally {
      if (btn) { btn.textContent = "🔀 Confirmar Atribuição"; btn.disabled = false; }
    }
  };

  /* ── fechar ao clicar no overlay ─────────────────────────────── */
  document.addEventListener("DOMContentLoaded", () => {
    const popup = document.getElementById("assign-popup");
    if (popup)
      popup.addEventListener("click", (e) => {
        if (e.target === popup) closeAssign();
      });
  });
})();