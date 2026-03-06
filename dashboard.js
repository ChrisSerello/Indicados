// Proteção de rota — redireciona para home se não estiver logado
(async () => {
  const { data } = await window.supabaseClient.auth.getSession();
  if (!data?.session?.user) {
    window.location.href = 'index.html';
  }
})();

document.addEventListener("DOMContentLoaded", () => {
  const supabase = window.supabaseClient || null;

  // ── Tabela de tiers por posição ────────────────────────────
  // Posição 1–3   → R$50  (Indiquer Plus)
  // Posição 4–6   → R$75  (Bronze)
  // Posição 7–10  → R$100 (Prata)
  // Posição 11–14 → R$150 (Ouro)
  // Posição 15+   → R$200 (Platinum)
  const TIERS = [
    { level:"Indiquer Plus", min:1,  max:3,   reward:50,  cls:"nivel-plus",     color:"#e879f9", main:false },
    { level:"Bronze",        min:4,  max:6,   reward:75,  cls:"nivel-bronze",   color:"#f59e0b", main:true  },
    { level:"Prata",         min:7,  max:10,  reward:100, cls:"nivel-prata",    color:"#9ca3af", main:true  },
    { level:"Ouro",          min:11, max:14,  reward:150, cls:"nivel-ouro",     color:"#facc15", main:true  },
    { level:"Platinum",      min:15, max:9999,reward:200, cls:"nivel-platinum", color:"#a855f7", main:true  },
  ];

  const ALL_TIERS_SIDEBAR = [
    { label:"Indiquer",      range:"1–3",   val:"R$ 50",  c:"#e879f9" },
    { label:"Bronze",        range:"4–6",   val:"R$ 75",  c:"#f59e0b" },
    { label:"Prata",         range:"7–10",  val:"R$ 100", c:"#9ca3af" },
    { label:"Ouro",          range:"11–14", val:"R$ 150", c:"#facc15" },
    { label:"Platinum",      range:"15+",   val:"R$ 200", c:"#a855f7" },
  ];

  // Retorna o tier pelo total de aprovadas (para o nível atual)
  function getTierInfo(ap) {
    return TIERS.find(t => ap >= t.min && ap <= t.max)
        || { level:"Indiquer Plus", reward:50, cls:"nivel-plus", color:"#e879f9", main:false };
  }

  // Retorna o reward pela POSIÇÃO cronológica da indicação aprovada
  // pos = 1, 2, 3... (começa em 1)
  function rewardByPosition(pos) {
    return (TIERS.find(t => pos >= t.min && pos <= t.max) || TIERS[0]).reward;
  }

  // Calcula o Smashcard total somando cada aprovação pelo seu reward individual
  function calcSmashcardTotal(totalAprovadas) {
    let total = 0;
    for (let pos = 1; pos <= totalAprovadas; pos++) {
      total += rewardByPosition(pos);
    }
    return total;
  }

  // ── Utils ──────────────────────────────────────────────────
  const fmtCurrency = v => Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL",minimumFractionDigits:2});
  const fmtDate     = s => { if(!s) return "-"; const d=new Date(s); return isNaN(d)?"-":d.toLocaleDateString("pt-BR"); };
  const initials    = n => { if(!n) return "US"; const p=n.trim().split(" "); return ((p[0]?.[0]||"")+(p.length>1?p[p.length-1][0]:"")).toUpperCase(); };
  const isApproved  = s => s==="aprovado"||s==="approved";
  const isPending   = s => ["em_analise","em_contato","pending","contact"].includes(s);

  function formatCPF(v)   { return v.replace(/\D/g,"").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d{1,2})/,"$1-$2").replace(/(-\d{2})\d+?$/,"$1"); }
  function formatPhone(v) { return v.replace(/\D/g,"").replace(/(\d{2})(\d)/,"($1) $2").replace(/(\d{5})(\d)/,"$1-$2").replace(/(-\d{4})\d+?$/,"$1"); }

  const statusMap = {
    em_analise:{label:"Em análise", cls:"status-pending" },
    em_contato:{label:"Em contato", cls:"status-contact" },
    aprovado:  {label:"Aprovado",   cls:"status-approved"},
    reprovado: {label:"Reprovado",  cls:"status-reprovado"},
    pending:   {label:"Em análise", cls:"status-pending" },
    contact:   {label:"Em contato", cls:"status-contact" },
    approved:  {label:"Aprovado",   cls:"status-approved"},
  };
  function statusBadge(s){ const x=statusMap[s]||{label:s||"-",cls:""}; return `<span class="mini-status ${x.cls}">${x.label}</span>`; }

  // ── Máscaras ───────────────────────────────────────────────
  document.getElementById("d-indicated-doc")?.addEventListener("input",  e=>{ e.target.value=formatCPF(e.target.value); });
  document.getElementById("d-indicated-phone")?.addEventListener("input", e=>{ e.target.value=formatPhone(e.target.value); });

  // ── Sidebar tiers ──────────────────────────────────────────
  const tierSidebar = document.getElementById("tier-sidebar");
  if (tierSidebar) {
    tierSidebar.innerHTML = ALL_TIERS_SIDEBAR.map(t=>`
      <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;border-radius:8px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);">
        <span style="font-size:12px;font-weight:600;color:${t.c};">${t.label}</span>
        <span style="font-size:11px;color:rgba(255,255,255,.4);">${t.range} indicações</span>
        <span style="font-size:13px;font-weight:700;color:#4ade80;">${t.val}</span>
      </div>
    `).join("");
  }

  // ── Nível section ──────────────────────────────────────────
  function renderNivelSection(ap) {
    const wrap = document.getElementById("nivel-section-wrap");
    if (!wrap) return;
    const tier = getTierInfo(ap);

    if (!tier.main) {
      const pct    = ap === 0 ? 0 : Math.round((ap/3)*100);
      const faltam = 4 - ap;
      wrap.innerHTML = `
        <div class="section-title-row">
          <h2 class="section-title">Seu nível na campanha</h2>
          <span class="dash-period-badge" style="background:linear-gradient(135deg,rgba(168,85,247,.3),rgba(236,72,153,.2));border-color:rgba(168,85,247,.5);color:#e879f9;">Indiquer Plus</span>
        </div>
        <div class="nivel-display" style="margin-bottom:20px;">
          <div style="padding:10px 22px;border-radius:999px;font-size:15px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;flex-shrink:0;background:linear-gradient(135deg,#a855f7,#ec4899);color:#fff;box-shadow:0 0 18px rgba(168,85,247,.5);">Indiquer Plus</div>
          <div class="nivel-details">
            <p class="nivel-desc" style="color:rgba(255,255,255,.75);">
              ${ap===0
                ? "Faça sua primeira indicação e já entre no Indiquer Plus!"
                : `${ap} de 3 indicaç${ap===1?"ão aprovada":"ões aprovadas"} — falt${faltam===1?"a":"am"} só <strong>${faltam}</strong> para desbloquear o Bronze!`}
            </p>
            <p class="nivel-reward" style="color:#4ade80;font-weight:700;font-size:15px;">R$ 50,00 por indicação aprovada</p>
          </div>
        </div>
        <div style="margin-bottom:20px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="font-size:12px;color:rgba(255,255,255,.5);">Progresso até o Bronze</span>
            <span style="font-size:12px;font-weight:600;color:#e879f9;">${ap}/3 indicações</span>
          </div>
          <div style="width:100%;height:10px;background:rgba(255,255,255,.08);border-radius:5px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;border-radius:5px;background:linear-gradient(90deg,#a855f7,#ec4899);transition:width .6s ease;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:6px;">
            <span style="font-size:11px;color:rgba(255,255,255,.35);">Indiquer Plus</span>
            <span style="font-size:11px;color:rgba(255,255,255,.35);">🥉 Bronze (4 indicações)</span>
          </div>
        </div>
        <div style="border-radius:14px;padding:18px 20px;background:linear-gradient(135deg,rgba(168,85,247,.12),rgba(236,72,153,.08));border:1px solid rgba(168,85,247,.3);">
          <p style="font-size:14px;font-weight:600;color:#e879f9;margin-bottom:8px;">🚀 O que é o Indiquer Plus?</p>
          <p style="font-size:13px;color:rgba(255,255,255,.7);line-height:1.6;margin-bottom:10px;">
            Você já está dentro do programa! A cada indicação aprovada no Indiquer Plus, você recebe
            <strong style="color:#fff;">R$ 50,00 em Smashcard</strong> — créditos para usar nas maiores marcas do mercado.
          </p>
          <p style="font-size:13px;color:rgba(255,255,255,.7);line-height:1.6;margin-bottom:14px;">
            Mas o melhor está por vir: indicando mais <strong style="color:#e879f9;">${faltam===0?"algumas":faltam} pessoa${faltam===1?"":"s"}</strong>,
            você sobe para o nível <strong style="color:#f59e0b;">🥉 Bronze</strong> e passa a ganhar
            <strong style="color:#fff;">R$ 75,00 por indicação</strong>. Chegando a até
            <strong style="color:#a855f7;">R$ 200,00 por indicação</strong> no nível Platinum!
          </p>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
            ${[{l:"Bronze",r:"4–6",v:"R$75",c:"#f59e0b"},{l:"Prata",r:"7–10",v:"R$100",c:"#9ca3af"},{l:"Ouro",r:"11–14",v:"R$150",c:"#facc15"},{l:"Platinum",r:"15+",v:"R$200",c:"#a855f7"}].map(t=>`
              <div style="text-align:center;padding:10px 6px;border-radius:10px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);">
                <div style="font-size:11px;font-weight:700;color:${t.c};text-transform:uppercase;margin-bottom:4px;">${t.l}</div>
                <div style="font-size:10px;color:rgba(255,255,255,.4);margin-bottom:4px;">${t.r} indicações</div>
                <div style="font-size:14px;font-weight:700;color:#4ade80;">${t.v}</div>
              </div>`).join("")}
          </div>
        </div>
      `;
    } else {
      const isBronze=tier.level==="Bronze", isPrata=tier.level==="Prata", isOuro=tier.level==="Ouro", isPlat=tier.level==="Platinum";
      let desc;
      if      (ap<7)  desc=`Nível Bronze atingido! Mais ${7-ap}  indicaç${7-ap===1?"ão aprovada":"ões aprovadas"} para a Prata.`;
      else if (ap<11) desc=`Nível Prata atingido!  Mais ${11-ap} indicaç${11-ap===1?"ão aprovada":"ões aprovadas"} para o Ouro.`;
      else if (ap<15) desc=`Nível Ouro atingido!   Mais ${15-ap} indicaç${15-ap===1?"ão aprovada":"ões aprovadas"} para o Platinum.`;
      else            desc="Incrível! Você está no nível Platinum — o máximo de benefícios é seu!";

      wrap.innerHTML = `
        <div class="section-title-row">
          <h2 class="section-title">Seu nível na campanha</h2>
          <span class="dash-period-badge">${tier.level}</span>
        </div>
        <div class="nivel-display">
          <div class="nivel-badge-big ${tier.cls}">${tier.level}</div>
          <div class="nivel-details">
            <p class="nivel-desc">${desc}</p>
            <p class="nivel-reward" style="color:#4ade80;font-weight:700;">R$ ${tier.reward},00 por indicação aprovada</p>
          </div>
        </div>
        <div class="nivel-tiers-track">
          <div class="tier-track-item ${isBronze?"current":(isPrata||isOuro||isPlat?"reached":"")}">
            <div class="tier-track-dot"></div><span>Bronze</span><small>4 a 6</small>
          </div>
          <div class="tier-track-line"></div>
          <div class="tier-track-item ${isPrata?"current":(isOuro||isPlat?"reached":"")}">
            <div class="tier-track-dot"></div><span>Prata</span><small>7 a 10</small>
          </div>
          <div class="tier-track-line"></div>
          <div class="tier-track-item ${isOuro?"current":(isPlat?"reached":"")}">
            <div class="tier-track-dot"></div><span>Ouro</span><small>11 a 14</small>
          </div>
          <div class="tier-track-line"></div>
          <div class="tier-track-item ${isPlat?"current":""}">
            <div class="tier-track-dot"></div><span>Platinum</span><small>15+</small>
          </div>
        </div>
      `;
    }
  }

  // ── Render tabela de indicações ────────────────────────────
  // Cada linha aprovada recebe o valor pelo sua posição cronológica
  function renderReferrals(referrals) {
    const empty   = document.getElementById("referrals-empty");
    const wrapper = document.getElementById("referrals-table-wrapper");
    const tbody   = document.getElementById("referrals-tbody");
    const thead   = document.getElementById("referrals-thead-row");
    if (!tbody) return;

    tbody.innerHTML = "";
    if (thead) thead.innerHTML = `
      <th style="padding:8px 10px;">Nome indicado</th>
      <th style="padding:8px 10px;">Perfil</th>
      <th style="padding:8px 10px;">Status</th>
      <th style="padding:8px 10px;">Smashcard</th>
      <th style="padding:8px 10px;">Data</th>
    `;

    if (!referrals || referrals.length === 0) {
      if (empty)   empty.style.display   = "block";
      if (wrapper) wrapper.style.display = "none";
      return;
    }
    if (empty)   empty.style.display   = "none";
    if (wrapper) wrapper.style.display = "block";

    // Monta mapa: referral.id → reward pela posição cronológica
    // Ordenamos as aprovadas por created_at asc para atribuir posição correta
    const approved = referrals
      .filter(r => isApproved(r.status))
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    const rewardMap = {}; // id → reward
    approved.forEach((ref, idx) => {
      rewardMap[ref.id] = rewardByPosition(idx + 1); // posição começa em 1
    });

    // Renderiza todas as linhas na ordem original (mais recente primeiro)
    referrals.forEach(ref => {
      const cl = ref.indicated_clients || {};
      const isApprov = isApproved(ref.status);
      const valorDisplay = isApprov ? fmtCurrency(rewardMap[ref.id] || 0) : "—";
      const tierColor = isApprov
        ? (rewardMap[ref.id] === 50 ? "#e879f9"
         : rewardMap[ref.id] === 75 ? "#f59e0b"
         : rewardMap[ref.id] === 100 ? "#9ca3af"
         : rewardMap[ref.id] === 150 ? "#facc15"
         : "#a855f7")
        : "#4ade80";

      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid rgba(255,255,255,.06)";
      tr.innerHTML = `
        <td style="padding:9px 10px;font-weight:600;">${cl.name||"—"}</td>
        <td style="padding:9px 10px;color:rgba(255,255,255,.5);font-size:12px;">${cl.profile_type||"—"}</td>
        <td style="padding:9px 10px;">${statusBadge(ref.status)}</td>
        <td style="padding:9px 10px;color:${isApprov?tierColor:"rgba(255,255,255,.3)"};font-weight:${isApprov?"700":"400"};">${valorDisplay}</td>
        <td style="padding:9px 10px;color:rgba(255,255,255,.45);font-size:12px;">${fmtDate(ref.created_at)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ── Feedback inline ────────────────────────────────────────
  function showFeedback(msg, ok=true) {
    const el = document.getElementById("dash-form-feedback");
    if (!el) return;
    el.textContent = msg;
    el.style.display     = "block";
    el.style.background  = ok ? "rgba(74,222,128,.12)"  : "rgba(251,113,133,.12)";
    el.style.border      = `1px solid ${ok?"rgba(74,222,128,.4)":"rgba(251,113,133,.4)"}`;
    el.style.color       = ok ? "#4ade80" : "#fb7185";
    if (ok) setTimeout(() => { el.style.display="none"; }, 4000);
  }

  // ── Estado do referrer logado ──────────────────────────────
  let currentReferrerId = null;

  // ── Carregar dashboard ─────────────────────────────────────
  async function loadDashboard() {
    if (!supabase) { window.location.href="index.html"; return; }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) { window.location.href="index.html"; return; }

    const user  = userData.user;
    const email = user.email || "";
    const name  = user.user_metadata?.name || "Cliente";
    const cpf   = (user.user_metadata?.cpf  || "").replace(/\D/g,"");

    const el = id => document.getElementById(id);
    if (el("overview-name"))       el("overview-name").textContent       = name.split(" ")[0];
    if (el("dash-user-name"))      el("dash-user-name").textContent      = name;
    if (el("dash-user-email"))     el("dash-user-email").textContent     = email;
    if (el("dash-avatar-initials"))el("dash-avatar-initials").textContent = initials(name);

    // Busca por user_id
    let referrerIds = [];
    const { data: byUserId } = await supabase
      .from("referrers").select("id").eq("user_id", user.id);
    if (byUserId) referrerIds.push(...byUserId.map(r=>r.id));

    // Busca por CPF e vincula órfãos
    if (cpf) {
      const { data: byCPF } = await supabase
        .from("referrers").select("id").eq("cpf", cpf);
      if (byCPF) {
        const orphanIds = byCPF
          .filter(r => !referrerIds.includes(r.id))
          .map(r => r.id);
        if (orphanIds.length > 0) {
          await supabase.from("referrers")
            .update({ user_id: user.id })
            .in("id", orphanIds);
          referrerIds.push(...orphanIds);
        }
      }
    }

    // Cria referrer base se não existe nenhum
    if (referrerIds.length === 0) {
      const { data: newRef } = await supabase
        .from("referrers")
        .insert({ user_id: user.id, name, cpf: cpf||null, email })
        .select("id").single();
      if (newRef) referrerIds = [newRef.id];
    }

    currentReferrerId = referrerIds[0] || null;

    if (referrerIds.length === 0) {
      ["kpi-total-indicacoes","kpi-aprovadas","kpi-pendentes"].forEach(id=>{ if(el(id)) el(id).textContent="0"; });
      if (el("kpi-ganhos")) el("kpi-ganhos").textContent = fmtCurrency(0);
      renderNivelSection(0);
      renderReferrals([]);
      return;
    }

    // Busca indicações
    const { data: referrals, error: refErr } = await supabase
      .from("referrals")
      .select("*, indicated_clients(name, phone, profile_type)")
      .in("referrer_id", referrerIds)
      .order("created_at", { ascending: false });

    if (refErr) { console.error(refErr); return; }

    const total     = referrals.length;
    const aprovadas = referrals.filter(r=>isApproved(r.status)).length;
    const pendentes = referrals.filter(r=>isPending(r.status)).length;

    // Smashcard = soma individual por posição cronológica
    const smashcard = calcSmashcardTotal(aprovadas);

    if (el("kpi-total-indicacoes")) el("kpi-total-indicacoes").textContent = total;
    if (el("kpi-aprovadas"))        el("kpi-aprovadas").textContent        = aprovadas;
    if (el("kpi-pendentes"))        el("kpi-pendentes").textContent        = pendentes;
    if (el("kpi-ganhos"))           el("kpi-ganhos").textContent           = fmtCurrency(smashcard);

    renderNivelSection(aprovadas);
    renderReferrals(referrals);
  }

  // ── Formulário interno (Indicar agora) ────────────────────
  document.getElementById("dash-referral-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!supabase) return;

    const indicName   = document.getElementById("d-indicated-name")?.value.trim();
    const indicCPF    = document.getElementById("d-indicated-doc")?.value.replace(/\D/g,"");
    const indicPhone  = document.getElementById("d-indicated-phone")?.value.replace(/\D/g,"");
    const profileType = document.getElementById("d-profile-type")?.value;
    const obs         = document.getElementById("d-observations")?.value.trim();
    const lgpd        = document.getElementById("d-lgpd-consent")?.checked;

    if (!indicName||!indicCPF||!indicPhone||!profileType) {
      showFeedback("Preencha todos os campos obrigatórios.", false); return;
    }
    if (!lgpd) { showFeedback("Confirme a autorização da pessoa indicada (LGPD).", false); return; }

    const btn = document.getElementById("dash-submit-btn");
    btn.textContent="Enviando…"; btn.disabled=true;

    try {
      if (!currentReferrerId) {
        const { data: ud } = await supabase.auth.getUser();
        const u = ud?.user;
        if (!u) throw new Error("Sessão expirada. Faça login novamente.");
        const { data: ex } = await supabase.from("referrers").select("id").eq("user_id",u.id).limit(1).maybeSingle();
        if (ex) {
          currentReferrerId = ex.id;
        } else {
          const nm  = u.user_metadata?.name||"Cliente";
          const cpf = (u.user_metadata?.cpf||"").replace(/\D/g,"");
          const { data: nr, error: nErr } = await supabase
            .from("referrers").insert({user_id:u.id,name:nm,cpf:cpf||null,email:u.email}).select("id").single();
          if (nErr) throw nErr;
          currentReferrerId = nr.id;
        }
      }

      const { data: indicated, error: indErr } = await supabase
        .from("indicated_clients")
        .insert({ name:indicName, cpf:indicCPF, phone:indicPhone, profile_type:profileType, observations:obs })
        .select("id").single();
      if (indErr) throw indErr;

      const { error: refErr } = await supabase
        .from("referrals")
        .insert({ referrer_id:currentReferrerId, indicated_client_id:indicated.id, status:"em_analise" });
      if (refErr) throw refErr;

      document.getElementById("dash-referral-form").reset();
      showFeedback("✅ Indicação enviada! Acompanhe na aba Minhas indicações.", true);
      await loadDashboard();

      setTimeout(() => {
        document.querySelectorAll(".dash-nav-item").forEach(b=>b.classList.remove("active"));
        document.querySelectorAll(".dash-tab").forEach(t=>t.classList.remove("active"));
        document.querySelector("[data-tab='overview-tab']")?.classList.add("active");
        document.getElementById("overview-tab")?.classList.add("active");
      }, 2000);

    } catch (err) {
      console.error(err);
      showFeedback("Erro ao enviar: "+err.message, false);
    } finally {
      btn.textContent="Enviar indicação"; btn.disabled=false;
    }
  });

  // ── Logout ─────────────────────────────────────────────────
  async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
    window.location.href="index.html";
  }
  document.getElementById("btn-logout")?.addEventListener("click", handleLogout);
  document.getElementById("btn-logout-mobile")?.addEventListener("click", handleLogout);

  // ── Tabs ───────────────────────────────────────────────────
  document.querySelectorAll(".dash-nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-tab");
      if (!targetId) return;
      document.querySelectorAll(".dash-nav-item").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".dash-tab").forEach(t=>t.classList.remove("active"));
      document.getElementById(targetId)?.classList.add("active");
    });
  });

  loadDashboard();
});