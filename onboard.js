/* ══════════════════════════════════════════════════════════
   ONBOARDING — Assistente Virtual "Indique & Ganhe 2.0"
   Arquivo: onboarding.js
   Depende de: onboarding.css
   ══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  // ── Configuração ────────────────────────────────────────
  const STORAGE_KEY = "ig2_onboarding_done";
  const ASSISTANT_IMG = "logos/assistente.png"; // ajuste o caminho conforme necessário

  // ── Steps (cada passo do onboarding) ────────────────────
  const STEPS = [
    {
      type: "fullscreen",
      title: "Olá! Eu sou a Isa 👋",
      text: `Sou a assistente virtual do <strong>Indique &amp; Ganhe 2.0</strong>. 
             Vou te mostrar tudo o que você precisa saber para <span class="highlight-green">acompanhar suas indicações</span> 
             e <span class="highlight-purple">ganhar Smashcard</span>. É rapidinho, prometo!`,
      features: [
        { icon: "📊", label: "Resumo" },
        { icon: "👥", label: "Indicações" },
        { icon: "🎯", label: "Níveis" },
        { icon: "💳", label: "Smashcard" },
      ],
      btnText: "Vamos começar! 🚀",
    },
    {
      type: "spotlight",
      tab: "overview-tab",
      navBtn: 0,
      target: ".kpi-grid",
      position: "below",
      stepNum: 1,
      stepLabel: "Seus números",
      title: "Painel de indicadores 📊",
      text: `Aqui você acompanha tudo de uma vez: <strong>total de indicações</strong> enviadas, 
             quantas foram <span class="highlight-green">aprovadas</span>, quantas estão 
             <span class="highlight-yellow">em análise</span> e quanto você já tem de 
             <span class="highlight-green">Smashcard liberado</span>.`,
    },
    {
      type: "spotlight",
      tab: "overview-tab",
      navBtn: 0,
      target: "#share-card-client",
      fallbackTarget: ".kpi-grid",
      position: "below",
      stepNum: 2,
      stepLabel: "Seu link exclusivo",
      title: "Link de indicação 🔗",
      text: `Este é o seu <strong>link exclusivo</strong>. Compartilhe com amigos e família! 
             Quem criar conta por ele já fica <span class="highlight-purple">vinculado a você</span>. 
             Cada contrato fechado por essa pessoa gera <span class="highlight-green">Smashcard pra você</span>.`,
    },
    {
      type: "spotlight",
      tab: "overview-tab",
      navBtn: 0,
      target: "#nivel-section-wrap",
      position: "above",
      stepNum: 3,
      stepLabel: "Sistema de níveis",
      title: "Suba de nível e ganhe mais! 🏆",
      text: `Quanto mais indicações aprovadas, <strong>maior o valor</strong> do seu Smashcard por indicação! 
             Começa em <span class="highlight-purple">R$ 50</span> no Indiquer Plus e pode chegar a 
             <span class="highlight-purple">R$ 200</span> no nível Platinum. Acompanhe seu progresso aqui.`,
    },
    {
      type: "spotlight",
      tab: "referrals-tab",
      navBtn: 1,
      target: "#referrals-tab .nivel-section",
      position: "below",
      stepNum: 4,
      stepLabel: "Suas indicações",
      title: "Minhas indicações 👥",
      text: `Nesta aba você vê a <strong>lista completa</strong> de todas as pessoas que indicou, 
             com o <span class="highlight-yellow">status de cada uma</span> (em análise, aprovada, etc.) 
             e o <span class="highlight-green">valor do Smashcard</span> correspondente.`,
    },
    {
      type: "spotlight",
      tab: "new-referral-tab",
      navBtn: 2,
      target: "#dash-referral-form",
      position: "below",
      stepNum: 5,
      stepLabel: "Nova indicação",
      title: "Indicar é rápido e fácil ➕",
      text: `Para indicar alguém, basta preencher o <strong>nome, CPF, WhatsApp</strong> e o 
             <strong>perfil</strong> da pessoa. Em menos de 1 minuto! 
             Nossa equipe entra em contato com ela <span class="highlight-green">sem compromisso</span>.`,
    },
    {
      type: "fullscreen",
      title: "Tudo pronto! 🎉",
      text: `Agora você sabe usar todo o painel. Compartilhe seu <span class="highlight-green">link de indicação</span>, 
             acompanhe seus <span class="highlight-purple">resultados</span> e suba de nível para 
             ganhar ainda mais. Boas indicações!`,
      btnText: "Começar a usar ✨",
      isFinal: true,
    },
  ];

  let currentStep = 0;
  let elements = {};

  // ══════════════════════════════════════════════════════════
  //  CHECK: deve mostrar onboarding?
  // ══════════════════════════════════════════════════════════
  function shouldShow() {
    try { return !localStorage.getItem(STORAGE_KEY); }
    catch { return true; }
  }

  function markDone() {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
  }

  // ══════════════════════════════════════════════════════════
  //  INIT
  // ══════════════════════════════════════════════════════════
  function init() {
    if (!shouldShow()) return;

    // Espera o dashboard carregar
    setTimeout(() => {
      buildDOM();
      showStep(0);
    }, 1200);
  }

  // ══════════════════════════════════════════════════════════
  //  BUILD DOM
  // ══════════════════════════════════════════════════════════
  function buildDOM() {
    // Container principal
    const overlay = document.createElement("div");
    overlay.className = "onb-overlay";
    overlay.id = "onb-overlay";

    // Spotlight element
    const spot = document.createElement("div");
    spot.className = "onb-spotlight";
    spot.id = "onb-spotlight";

    // Assistant container (para steps com spotlight)
    const assistant = document.createElement("div");
    assistant.className = "onb-assistant";
    assistant.id = "onb-assistant";

    // Fullscreen container
    const fullscreen = document.createElement("div");
    fullscreen.className = "onb-fullscreen";
    fullscreen.id = "onb-fullscreen";

    // Backdrop
    const backdrop = document.createElement("div");
    backdrop.className = "onb-backdrop";
    backdrop.id = "onb-backdrop";

    overlay.appendChild(backdrop);
    overlay.appendChild(spot);
    overlay.appendChild(assistant);
    overlay.appendChild(fullscreen);
    document.body.appendChild(overlay);

    elements = { overlay, spot, assistant, fullscreen, backdrop };
  }

  // ══════════════════════════════════════════════════════════
  //  AVATAR HTML
  // ══════════════════════════════════════════════════════════
  function avatarHTML(size) {
    return `
      <div class="onb-avatar-wrap">
        <div class="onb-avatar-pulse"></div>
        <img src="${ASSISTANT_IMG}" alt="Isa — Assistente Virtual" />
        <div class="onb-sparkle"></div>
        <div class="onb-sparkle"></div>
        <div class="onb-sparkle"></div>
      </div>
    `;
  }

  // ══════════════════════════════════════════════════════════
  //  PROGRESS DOTS
  // ══════════════════════════════════════════════════════════
  function dotsHTML() {
    return `<div class="onb-progress">
      ${STEPS.map((_, i) => {
        const cls = i < currentStep ? "done" : i === currentStep ? "active" : "";
        return `<div class="onb-dot ${cls}"></div>`;
      }).join("")}
    </div>`;
  }

  // ══════════════════════════════════════════════════════════
  //  SHOW STEP
  // ══════════════════════════════════════════════════════════
  function showStep(idx) {
    currentStep = idx;
    const step = STEPS[idx];
    if (!step) { closeOnboarding(); return; }

    elements.overlay.classList.add("active");

    if (step.type === "fullscreen") {
      showFullscreen(step);
    } else {
      showSpotlight(step);
    }
  }

  // ══════════════════════════════════════════════════════════
  //  FULLSCREEN STEP
  // ══════════════════════════════════════════════════════════
  function showFullscreen(step) {
    elements.spot.classList.remove("visible");
    elements.assistant.classList.remove("show");
    elements.backdrop.classList.add("dim");

    const featuresHTML = step.features
      ? `<div class="onb-features">
           ${step.features.map(f => `<div class="onb-feature-chip"><span>${f.icon}</span><span>${f.label}</span></div>`).join("")}
         </div>`
      : "";

    const btnClass = step.isFinal ? "onb-btn onb-btn-start" : "onb-btn onb-btn-next";

    elements.fullscreen.innerHTML = `
      ${avatarHTML()}
      <h2 class="onb-title">${step.title}</h2>
      <p class="onb-text">${step.text}</p>
      ${featuresHTML}
      ${dotsHTML()}
      <div class="onb-actions" style="justify-content:center;">
        <button class="onb-btn ${btnClass}" id="onb-fullscreen-btn">${step.btnText || "Avançar"}</button>
      </div>
    `;

    // Show with slight delay for animation
    requestAnimationFrame(() => {
      elements.fullscreen.classList.add("show");
    });

    document.getElementById("onb-fullscreen-btn").addEventListener("click", () => {
      if (step.isFinal) {
        closeOnboarding();
        launchConfetti();
      } else {
        elements.fullscreen.classList.remove("show");
        setTimeout(() => goNext(), 300);
      }
    });
  }

  // ══════════════════════════════════════════════════════════
  //  SPOTLIGHT STEP
  // ══════════════════════════════════════════════════════════
  function showSpotlight(step) {
    elements.fullscreen.classList.remove("show");
    elements.fullscreen.innerHTML = "";
    elements.backdrop.classList.remove("dim");

    // Navigate to the correct tab
    if (step.tab) {
      const navBtns = document.querySelectorAll(".dash-nav-item");
      if (navBtns[step.navBtn]) {
        navBtns[step.navBtn].click();
      }
    }

    // Small delay so DOM settles after tab switch
    setTimeout(() => {
      let targetEl = document.querySelector(step.target);
      if (!targetEl && step.fallbackTarget) {
        targetEl = document.querySelector(step.fallbackTarget);
      }

      if (targetEl) {
        positionSpotlight(targetEl);
        positionAssistant(targetEl, step);
      } else {
        // Fallback: show as quasi-fullscreen
        elements.spot.classList.remove("visible");
        positionAssistantCenter(step);
      }
    }, 350);
  }

  // ── Position spotlight ring ────────────────────────────────
  function positionSpotlight(el) {
    const rect = el.getBoundingClientRect();
    const pad = 12;
    elements.spot.style.left   = (rect.left - pad) + "px";
    elements.spot.style.top    = (rect.top - pad) + "px";
    elements.spot.style.width  = (rect.width + pad * 2) + "px";
    elements.spot.style.height = (rect.height + pad * 2) + "px";
    elements.spot.classList.add("visible");
  }

  // ── Position assistant bubble ─────────────────────────────
  function positionAssistant(targetEl, step) {
    const rect = targetEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Decide position: below or above target
    let top, left;

    if (step.position === "above") {
      // Place above the target element
      top = Math.max(16, rect.top - 200);
      left = Math.min(vw - 540, Math.max(16, rect.left));
    } else {
      // Place below the target element
      top = Math.min(vh - 220, rect.bottom + 20);
      left = Math.min(vw - 540, Math.max(16, rect.left));
    }

    // Mobile override
    if (vw <= 768) {
      elements.assistant.style.top = "";
      elements.assistant.style.left = "";
      elements.assistant.style.right = "";
      elements.assistant.style.bottom = "";
    } else {
      elements.assistant.style.top = top + "px";
      elements.assistant.style.left = left + "px";
      elements.assistant.style.right = "";
      elements.assistant.style.bottom = "";
    }

    renderBubbleContent(step);

    requestAnimationFrame(() => {
      elements.assistant.classList.add("show");
    });
  }

  function positionAssistantCenter(step) {
    const vw = window.innerWidth;
    elements.backdrop.classList.add("dim");

    if (vw <= 768) {
      elements.assistant.style.top = "";
      elements.assistant.style.left = "";
    } else {
      elements.assistant.style.top = "50%";
      elements.assistant.style.left = "50%";
      elements.assistant.style.transform = "translate(-50%, -50%)";
    }

    renderBubbleContent(step);
    requestAnimationFrame(() => {
      elements.assistant.classList.add("show");
    });
  }

  function renderBubbleContent(step) {
    const isFirst = currentStep === 0;
    const isLast = currentStep === STEPS.length - 1;

    elements.assistant.innerHTML = `
      ${avatarHTML()}
      <div class="onb-bubble">
        <div class="onb-step-counter">
          <span class="onb-step-num">${step.stepNum}</span>
          <span class="onb-step-label">${step.stepLabel}</span>
        </div>
        <h3 class="onb-title">${step.title}</h3>
        <p class="onb-text">${step.text}</p>
        ${dotsHTML()}
        <div class="onb-actions">
          ${currentStep > 1 ? '<button class="onb-btn onb-btn-prev" id="onb-prev">← Voltar</button>' : ""}
          <button class="onb-btn onb-btn-next" id="onb-next">${currentStep === STEPS.length - 2 ? "Finalizar →" : "Próximo →"}</button>
          <button class="onb-btn onb-btn-skip" id="onb-skip">Pular tour</button>
        </div>
      </div>
    `;

    // Bind buttons
    document.getElementById("onb-next")?.addEventListener("click", goNext);
    document.getElementById("onb-prev")?.addEventListener("click", goPrev);
    document.getElementById("onb-skip")?.addEventListener("click", () => {
      closeOnboarding();
    });
  }

  // ══════════════════════════════════════════════════════════
  //  NAVIGATION
  // ══════════════════════════════════════════════════════════
  function goNext() {
    hideCurrentStep(() => showStep(currentStep + 1));
  }

  function goPrev() {
    hideCurrentStep(() => showStep(currentStep - 1));
  }

  function hideCurrentStep(cb) {
    elements.assistant.classList.remove("show");
    elements.spot.classList.remove("visible");
    elements.fullscreen.classList.remove("show");
    setTimeout(cb, 300);
  }

  // ══════════════════════════════════════════════════════════
  //  CLOSE
  // ══════════════════════════════════════════════════════════
  function closeOnboarding() {
    markDone();
    elements.assistant.classList.remove("show");
    elements.spot.classList.remove("visible");
    elements.fullscreen.classList.remove("show");
    elements.backdrop.classList.remove("dim");

    setTimeout(() => {
      elements.overlay.classList.remove("active");

      // Navigate back to overview
      const navBtns = document.querySelectorAll(".dash-nav-item");
      if (navBtns[0]) navBtns[0].click();
    }, 400);
  }

  // ══════════════════════════════════════════════════════════
  //  CONFETTI (final step celebration)
  // ══════════════════════════════════════════════════════════
  function launchConfetti() {
    const canvas = document.createElement("canvas");
    canvas.className = "onb-confetti-canvas";
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    const particles = [];
    const colors = ["#a855f7", "#ec4899", "#4ade80", "#facc15", "#38bdf8", "#f472b6", "#34d399"];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        w: Math.random() * 8 + 4,
        h: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - .5) * 3,
        vy: Math.random() * 4 + 2,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - .5) * .15,
        opacity: 1,
      });
    }

    let frame = 0;
    function animate() {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.vy += 0.04;
        if (frame > 60) p.opacity -= .012;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      if (frame < 180) {
        requestAnimationFrame(animate);
      } else {
        canvas.remove();
      }
    }
    animate();
  }

  // ══════════════════════════════════════════════════════════
  //  Keyboard support
  // ══════════════════════════════════════════════════════════
  document.addEventListener("keydown", (e) => {
    if (!elements.overlay || !elements.overlay.classList.contains("active")) return;

    if (e.key === "ArrowRight" || e.key === "Enter") {
      e.preventDefault();
      goNext();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (currentStep > 1) goPrev();
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeOnboarding();
    }
  });

  // ══════════════════════════════════════════════════════════
  //  Resize handler — reposition spotlight
  // ══════════════════════════════════════════════════════════
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!elements.overlay || !elements.overlay.classList.contains("active")) return;
      const step = STEPS[currentStep];
      if (step?.type === "spotlight") {
        const targetEl = document.querySelector(step.target) ||
                         (step.fallbackTarget && document.querySelector(step.fallbackTarget));
        if (targetEl) positionSpotlight(targetEl);
      }
    }, 200);
  });

  // ══════════════════════════════════════════════════════════
  //  PUBLIC: permite reiniciar o onboarding manualmente
  // ══════════════════════════════════════════════════════════
  window.restartOnboarding = function () {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    if (elements.overlay) elements.overlay.remove();
    elements = {};
    currentStep = 0;
    buildDOM();
    showStep(0);
  };

  // ══════════════════════════════════════════════════════════
  //  START
  // ══════════════════════════════════════════════════════════
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();