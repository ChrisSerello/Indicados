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

  function getTierInfo(ap) {
    return TIERS.find(t => ap >= t.min && ap <= t.max)
        || { level:"Indiquer Plus", reward:50, cls:"nivel-plus", color:"#e879f9", main:false };
  }

  function rewardByPosition(pos) {
    return (TIERS.find(t => pos >= t.min && pos <= t.max) || TIERS[0]).reward;
  }

  function calcSmashcardTotal(totalAprovadas) {
    let total = 0;
    for (let pos = 1; pos <= totalAprovadas; pos++) {
      total += rewardByPosition(pos);
    }
    return total;
  }

  // ── Gerador de código ──────────────────────────────────────
  function genChars(n) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let r = "";
    for (let i = 0; i < n; i++) r += chars[Math.floor(Math.random() * chars.length)];
    return r;
  }

  async function ensureCode(referrerId, currentCode, refOrigin) {
    if (currentCode && currentCode.length >= 4) return currentCode;

    let newCode;
    if (refOrigin && refOrigin.length === 2) {
      newCode = refOrigin + genChars(2);
    } else if (refOrigin && refOrigin.length === 4) {
      newCode = refOrigin + genChars(2);
    } else {
      newCode = genChars(4);
    }

    const role = newCode.length === 4 ? "indiquer" : "indicado";

    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: existing } = await supabase
        .from("referrers").select("id").eq("code", newCode).maybeSingle();
      if (!existing) break;
      newCode = (role === "indiquer") ? genChars(4) : (refOrigin.substring(0,4) + genChars(2));
    }

    await supabase.from("referrers")
      .update({ code: newCode, role })
      .eq("id", referrerId);

    return newCode;
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
    via_link:  {label:"Via link",    cls:"status-contact" },
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

  // ══════════════════════════════════════════════════════════
  //  CARD DE LINK DE COMPARTILHAMENTO
  // ══════════════════════════════════════════════════════════
  function renderShareCard(code, role) {
    if (!code || code.length < 4) return;

    const baseUrl  = `${window.location.origin}/index.html`;
    const shareUrl = `${baseUrl}?ref=${code}`;

    const isIndiquer = role === "indiquer" || code.length === 4;
    const label      = isIndiquer
      ? "Compartilhe com quem você quer indicar"
      : "Você também pode indicar outras pessoas";
    const desc       = isIndiquer
      ? "Quem criar conta pelo seu link entra como <strong>Indicado</strong> vinculado a você. Cada contrato fechado gera Smashcard pra você!"
      : "Envie seu link para outras pessoas. Contratos fechados por eles também contam para você!";
    const highlight  = isIndiquer
      ? { color: "#34d399", bg: "rgba(16,185,129,.12)", border: "rgba(16,185,129,.3)", icon: "🔗" }
      : { color: "#c084fc", bg: "rgba(168,85,247,.12)", border: "rgba(168,85,247,.3)", icon: "🔗" };

    const cardHTML = `
      <div id="share-card-client" style="
        background: linear-gradient(135deg, ${highlight.bg}, rgba(255,255,255,.02));
        border: 1px solid ${highlight.border};
        border-radius: 18px;
        padding: 20px 22px;
        margin-bottom: 24px;
      ">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;">
          <div style="flex:1;min-width:200px;">
            <p style="font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:${highlight.color};font-weight:700;margin-bottom:6px;">
              ${highlight.icon} Seu link exclusivo de indicação
            </p>
            <p style="font-size:14px;font-weight:600;color:#f9fafb;margin-bottom:4px;">${label}</p>
            <p style="font-size:12px;color:rgba(255,255,255,.5);line-height:1.6;margin-bottom:14px;">${desc}</p>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <input
                id="client-share-link-input"
                type="text"
                readonly
                value="${shareUrl}"
                style="
                  flex:1;min-width:180px;padding:9px 12px;border-radius:9px;
                  border:1px solid ${highlight.border};
                  background:rgba(4,16,10,.85);
                  color:${highlight.color};
                  font-size:12px;font-family:inherit;outline:none;cursor:text;
                "
              />
              <button
                id="btn-copy-client-link"
                onclick="copyClientShareLink()"
                style="
                  padding:9px 16px;border-radius:9px;border:none;cursor:pointer;
                  background:linear-gradient(135deg,#34d399,#059669);
                  color:#fff;font-size:13px;font-weight:600;font-family:inherit;
                  white-space:nowrap;transition:filter .2s;
                "
              >
                📋 Copiar link
              </button>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0;">
            <div style="
              padding:6px 14px;border-radius:999px;font-size:13px;font-weight:700;
              letter-spacing:.08em;background:${highlight.bg};
              border:1px solid ${highlight.border};color:${highlight.color};
            ">
              Código: <strong>${code}</strong>
            </div>
            <div style="
              padding:4px 12px;border-radius:999px;font-size:11px;font-weight:600;
              background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);
              color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.04em;
            ">
              ${role || "indiquer"}
            </div>
          </div>
        </div>
      </div>
    `;

    const overviewTab = document.getElementById("overview-tab");
    const kpiGrid     = overviewTab?.querySelector(".kpi-grid");
    if (overviewTab && kpiGrid) {
      kpiGrid.insertAdjacentHTML("beforebegin", cardHTML);
    }

    renderShareCardCompact(shareUrl, code, highlight, label);
  }

  function renderShareCardCompact(shareUrl, code, highlight, label) {
    const newReferralTab = document.getElementById("new-referral-tab");
    const dashHeader     = newReferralTab?.querySelector(".dash-header");
    if (!newReferralTab || !dashHeader) return;

    const compactHTML = `
      <div id="share-card-compact" style="
        background: ${highlight.bg};
        border: 1px solid ${highlight.border};
        border-radius: 14px;
        padding: 14px 18px;
        margin-bottom: 20px;
        display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;
      ">
        <div style="display:flex;flex-direction:column;gap:3px;flex:1;min-width:200px;">
          <p style="font-size:11px;font-weight:700;color:${highlight.color};text-transform:uppercase;letter-spacing:.5px;">
            🔗 Seu link de indicação · Código: <strong>${code}</strong>
          </p>
          <p style="font-size:12px;color:rgba(255,255,255,.5);">${label}</p>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
          <input
            id="client-share-link-compact"
            type="text"
            readonly
            value="${shareUrl}"
            style="
              width:220px;padding:7px 10px;border-radius:8px;
              border:1px solid ${highlight.border};
              background:rgba(4,16,10,.85);
              color:${highlight.color};font-size:11px;font-family:inherit;outline:none;
            "
          />
          <button
            onclick="copyClientShareLinkCompact()"
            id="btn-copy-client-compact"
            style="
              padding:7px 14px;border-radius:8px;border:none;cursor:pointer;
              background:linear-gradient(135deg,#34d399,#059669);
              color:#fff;font-size:12px;font-weight:600;font-family:inherit;
              white-space:nowrap;
            "
          >
            📋 Copiar
          </button>
        </div>
      </div>
    `;

    dashHeader.insertAdjacentHTML("afterend", compactHTML);
  }

  window.copyClientShareLink = function() {
    const inp = document.getElementById("client-share-link-input");
    const btn = document.getElementById("btn-copy-client-link");
    if (!inp || !btn) return;
    navigator.clipboard.writeText(inp.value).then(() => {
      btn.textContent = "✅ Copiado!";
      btn.style.background = "linear-gradient(135deg,#4ade80,#22c55e)";
      setTimeout(() => {
        btn.textContent = "📋 Copiar link";
        btn.style.background = "linear-gradient(135deg,#34d399,#059669)";
      }, 2000);
    });
  };

  window.copyClientShareLinkCompact = function() {
    const inp = document.getElementById("client-share-link-compact");
    const btn = document.getElementById("btn-copy-client-compact");
    if (!inp || !btn) return;
    navigator.clipboard.writeText(inp.value).then(() => {
      btn.textContent = "✅ Copiado!";
      setTimeout(() => { btn.textContent = "📋 Copiar"; }, 2000);
    });
  };

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
  function renderReferrals(referrals, subReferrers, allSubReferrals) {
    subReferrers   = subReferrers   || [];
    allSubReferrals = allSubReferrals || [];
    const empty   = document.getElementById("referrals-empty");
    const wrapper = document.getElementById("referrals-table-wrapper");
    const tbody   = document.getElementById("referrals-tbody");
    const thead   = document.getElementById("referrals-thead-row");
    if (!tbody) return;

    tbody.innerHTML = "";
    if (thead) thead.innerHTML = `
      <th style="padding:8px 10px;">Nome</th>
      <th style="padding:8px 10px;">WhatsApp</th>
      <th style="padding:8px 10px;">Perfil / Papel</th>
      <th style="padding:8px 10px;">Status</th>
      <th style="padding:8px 10px;">Smashcard</th>
      <th style="padding:8px 10px;">Data</th>
    `;

    const hasAnything = referrals.length > 0 || subReferrers.length > 0;
    if (!hasAnything) {
      if (empty)   empty.style.display   = "block";
      if (wrapper) wrapper.style.display = "none";
      return;
    }
    if (empty)   empty.style.display   = "none";
    if (wrapper) wrapper.style.display = "block";

    // Mapa de recompensa por posição — soma diretas + sub-referrer aprovadas
    const allForReward = [...referrals, ...allSubReferrals]
      .filter(r => isApproved(r.status))
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const rewardMap = {};
    allForReward.forEach((ref, idx) => { rewardMap[ref.id] = rewardByPosition(idx + 1); });

    function addRow(name, phone, profileOrRole, status, reward, isApprov, date, highlight) {
      const tierColor = isApprov
        ? (reward <= 50 ? "#e879f9" : reward <= 75 ? "#f59e0b" : reward <= 100 ? "#9ca3af" : reward <= 150 ? "#facc15" : "#a855f7")
        : "rgba(255,255,255,.3)";
      const waNum = (phone||"").replace(/\D/g,"");
      const waLink = waNum ? `<a href="https://wa.me/${waNum.startsWith("55")?waNum:"55"+waNum}" target="_blank" style="color:#25d366;text-decoration:none;font-size:12px;">📱 ${phone}</a>` : (phone || "—");
      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid rgba(255,255,255,.06)";
      if (highlight) tr.style.background = "rgba(168,85,247,.04)";
      tr.innerHTML = `
        <td style="padding:9px 10px;font-weight:600;">${name||"—"}</td>
        <td style="padding:9px 10px;">${waLink}</td>
        <td style="padding:9px 10px;color:rgba(255,255,255,.5);font-size:12px;">${profileOrRole||"—"}</td>
        <td style="padding:9px 10px;">${statusBadge(status)}</td>
        <td style="padding:9px 10px;color:${tierColor};font-weight:${isApprov?"700":"400"};">${isApprov?fmtCurrency(reward):"—"}</td>
        <td style="padding:9px 10px;color:rgba(255,255,255,.45);font-size:12px;">${fmtDate(date)}</td>
      `;
      tbody.appendChild(tr);
    }

    // ── Indicações diretas (via formulário) ─────────────
    referrals.forEach(ref => {
      const cl = ref.indicated_clients || {};
      const isApprov = isApproved(ref.status);
      addRow(cl.name, cl.phone, cl.profile_type, ref.status, rewardMap[ref.id]||0, isApprov, ref.created_at, false);
    });

    // ── Sub-referrers (vieram pelo link) ─────────────────
    if (subReferrers.length > 0) {
      const sep = document.createElement("tr");
      sep.innerHTML = `<td colspan="6" style="padding:8px 10px;font-size:11px;font-weight:700;color:#c084fc;text-transform:uppercase;letter-spacing:.5px;border-top:1px solid rgba(168,85,247,.2);background:rgba(168,85,247,.04);">👥 Vinculados pelo link (${subReferrers.length})</td>`;
      tbody.appendChild(sep);

      // Agrupa referrals por sub-referrer para exibir corretamente
      const subRefsByReferrer = {};
      allSubReferrals.forEach(r => {
        if (!subRefsByReferrer[r.referrer_id]) subRefsByReferrer[r.referrer_id] = [];
        subRefsByReferrer[r.referrer_id].push(r);
      });

      subReferrers.forEach(sr => {
        const srRefs = subRefsByReferrer[sr.id] || [];
        if (srRefs.length > 0) {
          // Sub-referrer tem indicações → mostra cada uma com badge
          srRefs.forEach((ref, i) => {
            const cl = ref.indicated_clients || {};
            const isApprov = isApproved(ref.status);
            const displayName  = cl.name  || sr.name  || "—";
            const displayPhone = cl.phone || sr.phone || null;
            const waNum = (displayPhone||"").replace(/\D/g,"");
            const waLink = waNum ? `<a href="https://wa.me/${waNum.startsWith("55")?waNum:"55"+waNum}" target="_blank" style="color:#25d366;text-decoration:none;font-size:12px;">📱 ${displayPhone}</a>` : (displayPhone || "—");
            const tierColor = isApprov
              ? (rewardMap[ref.id] <= 50 ? "#e879f9" : rewardMap[ref.id] <= 75 ? "#f59e0b" : rewardMap[ref.id] <= 100 ? "#9ca3af" : rewardMap[ref.id] <= 150 ? "#facc15" : "#a855f7")
              : "rgba(255,255,255,.3)";
            const firstName = sr.name ? sr.name.split(" ")[0] : "—";
            const badge = i === 0
              ? `<span style="display:inline-flex;align-items:center;gap:3px;padding:1px 7px;border-radius:999px;font-size:9px;font-weight:700;background:rgba(168,85,247,.15);border:1px solid rgba(168,85,247,.3);color:#c084fc;margin-bottom:2px;text-transform:uppercase;">👤 via ${firstName}</span><br>`
              : "";
            const tr2 = document.createElement("tr");
            tr2.style.cssText = "border-bottom:1px solid rgba(255,255,255,.06);background:rgba(168,85,247,.04);";
            tr2.innerHTML = `
              <td style="padding:9px 10px;font-weight:600;">${badge}${displayName}</td>
              <td style="padding:9px 10px;">${waLink}</td>
              <td style="padding:9px 10px;color:rgba(255,255,255,.5);font-size:12px;">${cl.profile_type || sr.role || "—"}</td>
              <td style="padding:9px 10px;">${statusBadge(ref.status)}</td>
              <td style="padding:9px 10px;color:${tierColor};font-weight:${isApprov?"700":"400"};">${isApprov?fmtCurrency(rewardMap[ref.id]||0):"—"}</td>
              <td style="padding:9px 10px;color:rgba(255,255,255,.45);font-size:12px;">${fmtDate(ref.created_at)}</td>
            `;
            tbody.appendChild(tr2);
          });
        } else {
          // Sub-referrer sem indicações: linha informativa simples
          addRow(sr.name, sr.phone, sr.role||"indicado", "via_link", 0, false, sr.created_at, true);
        }
      });
    }
  }

  // ── Toast notification ─────────────────────────────────────
  function showToast(msg, ok = true) {
    // Remove existing toast se houver
    const existing = document.getElementById("dash-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "dash-toast";
    toast.textContent = msg;
    Object.assign(toast.style, {
      position: "fixed",
      bottom: "24px",
      right: "24px",
      zIndex: "999",
      padding: "12px 18px",
      borderRadius: "10px",
      fontSize: "13px",
      fontWeight: "500",
      fontFamily: "inherit",
      boxShadow: "0 8px 24px rgba(0,0,0,.5)",
      border: `1px solid ${ok ? "rgba(74,222,128,.4)" : "rgba(251,113,133,.4)"}`,
      background: ok ? "rgba(74,222,128,.15)" : "rgba(251,113,133,.15)",
      color: ok ? "#4ade80" : "#fb7185",
      opacity: "0",
      transition: "opacity .3s",
    });
    document.body.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = "1"; });
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
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
  let currentReferrerId   = null;
  let currentReferrerIds  = [];
  let currentReferrerCode = null;
  let realtimeChannel     = null;

  // ══════════════════════════════════════════════════════════
  //  updateKPIsOnly — atualiza KPIs sem re-renderizar tudo
  //  Chamado pela subscription em tempo real
  // ══════════════════════════════════════════════════════════
  async function updateKPIsOnly() {
    if (!currentReferrerIds.length) return;

    // Indicações diretas
    const { data: referrals } = await supabase
      .from("referrals")
      .select("id, status, amount, created_at, referrer_id, indicated_clients(name, phone, profile_type)")
      .in("referrer_id", currentReferrerIds)
      .order("created_at", { ascending: false });

    if (!referrals) return;

    // Busca sub-referrers e suas referrals (indicados que vieram pelo link)
    let subReferrers = [];
    let allSubReferrals = [];
    if (currentReferrerCode) {
      const { data: subs } = await supabase
        .from("referrers")
        .select("id, name, phone, email, code, role, created_at")
        .eq("ref_origin", currentReferrerCode);
      subReferrers = subs || [];

      if (subReferrers.length > 0) {
        const subIds = subReferrers.map(s => s.id);
        const { data: subRefs } = await supabase
          .from("referrals")
          .select("id, status, amount, referrer_id, created_at, indicated_clients(name, phone, profile_type)")
          .in("referrer_id", subIds)
          .order("created_at", { ascending: false });
        allSubReferrals = subRefs || [];
      }
    }

    const allReferralsForKpi = [...referrals, ...allSubReferrals];
    const aprovadas = allReferralsForKpi.filter(r => isApproved(r.status)).length;
    const pendentes = allReferralsForKpi.filter(r => isPending(r.status)).length;
    const smashcard = calcSmashcardTotal(aprovadas);

    const el = id => document.getElementById(id);
    if (el("kpi-total-indicacoes")) el("kpi-total-indicacoes").textContent = referrals.length + subReferrers.length;
    if (el("kpi-aprovadas"))        el("kpi-aprovadas").textContent        = aprovadas;
    if (el("kpi-pendentes"))        el("kpi-pendentes").textContent        = pendentes;
    if (el("kpi-ganhos"))           el("kpi-ganhos").textContent           = fmtCurrency(smashcard);

    renderNivelSection(aprovadas);
    renderReferrals(referrals, subReferrers, allSubReferrals);
  }

  // ══════════════════════════════════════════════════════════
  //  setupRealtimeSubscription — ouve mudanças em referrals
  //  para atualizar smashcard automaticamente quando admin
  //  ou moderador aprovar uma indicação
  // ══════════════════════════════════════════════════════════
  function setupRealtimeSubscription(referrerIds) {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }

    if (!referrerIds || referrerIds.length === 0) return;

    realtimeChannel = supabase
      .channel(`referrals-dashboard-${referrerIds[0]}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'referrals',
        },
        async (payload) => {
          const changedReferrerId = payload.new?.referrer_id;
          // Dispara atualização tanto para referrals diretas quanto para
          // referrals dos sub-referrers (indicados que vieram pelo link)
          const shouldUpdate = referrerIds.includes(changedReferrerId)
            || (currentReferrerCode && await isSubReferrer(changedReferrerId));

          if (shouldUpdate) {
            await updateKPIsOnly();
            const oldStatus = payload.old?.status;
            const newStatus = payload.new?.status;
            if (!isApproved(oldStatus) && isApproved(newStatus)) {
              showToast("🎉 Uma indicação foi aprovada! Seu Smashcard foi atualizado.", true);
            }
          }
        }
      )
      .subscribe();
  }

  // Verifica se o referrerId pertence a um sub-referrer do usuário logado
  async function isSubReferrer(referrerId) {
    if (!currentReferrerCode || !referrerId) return false;
    const { data } = await supabase
      .from("referrers")
      .select("id")
      .eq("id", referrerId)
      .eq("ref_origin", currentReferrerCode)
      .maybeSingle();
    return !!data;
  }

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
      .from("referrers").select("id,code,role,ref_origin").eq("user_id", user.id);
    if (byUserId) referrerIds.push(...byUserId.map(r=>r.id));

    // Busca por CPF e vincula órfãos
    if (cpf) {
      const { data: byCPF } = await supabase
        .from("referrers").select("id,code,role,ref_origin").eq("cpf", cpf);
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
        .select("id,code,role").single();
      if (newRef) referrerIds = [newRef.id];
    }

    currentReferrerId  = referrerIds[0] || null;
    currentReferrerIds = referrerIds;

    // ── Configura subscription em tempo real ─────────────────
    setupRealtimeSubscription(referrerIds);

    // ── Busca dados completos do referrer principal ──────────
    let referrerCode = null;
    let referrerRole = null;
    if (currentReferrerId) {
      const { data: refData } = await supabase
        .from("referrers")
        .select("code,role,ref_origin")
        .eq("id", currentReferrerId)
        .maybeSingle();
      if (refData) {
        referrerCode = await ensureCode(currentReferrerId, refData.code, refData.ref_origin);
        referrerRole = refData.role || (referrerCode?.length === 4 ? "indiquer" : "indicado");
        currentReferrerCode = referrerCode;
      }
    }

    // ── Renderiza card de link de compartilhamento ───────────
    document.getElementById("share-card-client")?.remove();
    document.getElementById("share-card-compact")?.remove();

    if (referrerCode) {
      renderShareCard(referrerCode, referrerRole);
    }

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
      .select("*, amount, indicated_clients(name, phone, profile_type)")
      .in("referrer_id", referrerIds)
      .order("created_at", { ascending: false });

    if (refErr) { console.error(refErr); return; }

    // ── Sub-referrers: vieram pelo link do indiquer ───────
    let subReferrers = [];
    let allSubReferrals = [];
    if (referrerCode) {
      const { data: subs } = await supabase
        .from("referrers")
        .select("id, name, phone, email, code, role, created_at")
        .eq("ref_origin", referrerCode)
        .order("created_at", { ascending: false });
      subReferrers = subs || [];
    }

    // ── Busca as referrals dos sub-referrers (indicados) ──
    // Quando o admin aprova um indicado que veio pelo link, o referral
    // é salvo com referrer_id = id do indicado. Precisamos somar essas
    // aprovações ao smashcard do indiquer (Christian).
    if (subReferrers.length > 0) {
      const subIds = subReferrers.map(s => s.id);
      const { data: subRefs } = await supabase
        .from("referrals")
        .select("id, status, amount, referrer_id, created_at, indicated_clients(name, phone, profile_type)")
        .in("referrer_id", subIds)
        .order("created_at", { ascending: false });
      allSubReferrals = subRefs || [];
    }

    // ── KPIs unificados: diretos + dos sub-referrers ──────
    const allReferralsForKpi   = [...referrals, ...allSubReferrals];
    const totalKpi  = referrals.length + subReferrers.length;
    const aprovadas = allReferralsForKpi.filter(r => isApproved(r.status)).length;
    const pendentes = allReferralsForKpi.filter(r => isPending(r.status)).length;
    const smashcard = calcSmashcardTotal(aprovadas);

    if (el("kpi-total-indicacoes")) el("kpi-total-indicacoes").textContent = totalKpi;
    if (el("kpi-aprovadas"))        el("kpi-aprovadas").textContent        = aprovadas;
    if (el("kpi-pendentes"))        el("kpi-pendentes").textContent        = pendentes;
    if (el("kpi-ganhos"))           el("kpi-ganhos").textContent           = fmtCurrency(smashcard);

    renderNivelSection(aprovadas);
    renderReferrals(referrals, subReferrers, allSubReferrals);
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

    if (!indicName||!indicPhone||!profileType) {
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
        .insert({ name:indicName, cpf:indicCPF||null, phone:indicPhone, profile_type:profileType, observations:obs||null })
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
    if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    if (supabase) await supabase.auth.signOut();
    window.location.href="index.html";
  }
  document.getElementById("btn-logout")?.addEventListener("click", handleLogout);
  document.getElementById("btn-logout-mobile")?.addEventListener("click", handleLogout);

  // ── Mobile sidebar toggle ──────────────────────────────────
  document.getElementById("btn-mobile-menu")?.addEventListener("click", () => {
    document.querySelector(".dash-sidebar")?.classList.toggle("open");
  });

  // ── Tabs ───────────────────────────────────────────────────
  document.querySelectorAll(".dash-nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-tab");
      if (!targetId) return;
      document.querySelectorAll(".dash-nav-item").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".dash-tab").forEach(t=>t.classList.remove("active"));
      document.getElementById(targetId)?.classList.add("active");
      document.querySelector(".dash-sidebar")?.classList.remove("open");
    });
  });

  loadDashboard();
});