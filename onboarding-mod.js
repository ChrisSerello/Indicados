/* ══════════════════════════════════════════════════════════
   ONBOARDING MODERADOR v4
   
   INTEGRAÇÃO:
   1. No <head> do moderador.html:
      <link rel="stylesheet" href="onboarding.css" />

   2. Antes do </body> do moderador.html (após o último </script>):
      <script src="onboarding-mod.js"></script>

   3. No moderador.html, dentro da função loadData(),
      adicione esta linha NO FINAL da função (antes do último "}"):

      window.dispatchEvent(new CustomEvent("mod-ready"));

   4. Imagem: logos/assistente.png
   ══════════════════════════════════════════════════════════ */
;(function () {
  "use strict";

  var IMG = "logos/assistente.png";
  var KEY = "ig2_onboarding_mod_v4";
  var N   = 8;

  var STEPS = [
    /* 0 — Welcome */
    { kind:"full", title:"",
      html:'Sou a assistente do <strong>Indique &amp; Ganhe 2.0</strong>. Vou te mostrar como usar o <span class="hl-g">Painel do Moderador</span> para gerenciar seus indiquers, acompanhar indicações e <span class="hl-p">controlar tudo</span> de forma simples.',
      chips:["🔗 Link","🤝 Indiquers","📨 Indicações","📥 Exportar"], btn:"Vamos lá! 🚀" },

    /* 1 — Link de recrutamento */
    { kind:"spot", sel:".share-card", n:1, lb:"RECRUTAMENTO",
      title:"Seu link de recrutamento 🔗",
      html:'Este é o seu <strong>link exclusivo</strong> de moderador. Quem criar conta por ele entra como <span class="hl-g">Indiquer</span> vinculado à sua rede. Compartilhe com sua equipe e acompanhe os resultados!' },

    /* 2 — Cadeia de rastreio */
    { kind:"spot", sel:".chain-info", n:2, lb:"RASTREIO",
      title:"Cadeia de rastreio 🔗",
      html:'O sistema usa códigos para rastrear toda a cadeia: seu código tem <span class="hl-p">2 dígitos</span>, indiquers recebem <span class="hl-p">4 dígitos</span> e indicados <span class="hl-p">6 dígitos</span>. Assim você sabe exatamente <strong>quem trouxe quem</strong>.' },

    /* 3 — KPIs */
    { kind:"spot", sel:".kpi-row", n:3, lb:"INDICADORES",
      title:"Painel de números 📊",
      html:'Aqui você vê de uma vez: total de <span class="hl-g">Indiquers</span> e <span class="hl-p">Indicados</span> na sua rede, <strong>total de indicações</strong>, quantas foram <span class="hl-g">aprovadas</span> e o <span class="hl-g">Smashcard total</span> gerado.' },

    /* 4 — Abas de visualização */
    { kind:"spot", sel:".view-tabs", n:4, lb:"VISUALIZAÇÃO",
      title:"Abas de visualização 👁️",
      html:'Alterne entre <strong>Indiquers</strong> (sua equipe), <strong>Indicados</strong> (vinculados pelos indiquers) e <strong>Todas as Indicações</strong> para ter a visão completa. Cada aba mostra dados diferentes!' },

    /* 5 — Barra de ferramentas */
    { kind:"spot", sel:".filter-bar", n:5, lb:"FERRAMENTAS",
      title:"Busca, cadastro e exportação 🛠️",
      html:'Use a <strong>busca</strong> para encontrar qualquer pessoa por nome, telefone ou código. O botão <span class="hl-g">Cadastrar Indiquer</span> permite criar indiquers com login e importar indicações em massa. E os botões <span class="hl-p">Excel/CSV</span> exportam todos os dados.' },

    /* 6 — Cards expandíveis */
    { kind:"spot", sel:"#content-area", n:6, lb:"GESTÃO",
      title:"Cards de gestão 📋",
      html:'Cada pessoa aparece como um <strong>card expandível</strong>. Clique para abrir e ver as indicações, alterar <span class="hl-y">status</span>, definir <span class="hl-g">valores</span>, adicionar <strong>notas internas</strong> e ver os indicados vinculados. Tudo em um só lugar!' },

    /* 7 — Final */
    { kind:"full", title:"Tudo pronto! 🎉",
      html:'Agora você domina o painel. Recrute <span class="hl-g">indiquers</span> pelo seu link, acompanhe as <span class="hl-p">indicações</span>, atualize status e exporte relatórios. Bom trabalho!',
      btn:"Começar a gerenciar ✨", final:true }
  ];

  var cur = 0;
  var $ov, $bk, $sp, $as, $fs;

  function isDone()  { try { return !!localStorage.getItem(KEY); } catch(e){return false;} }
  function setDone() { try { localStorage.setItem(KEY,"1"); } catch(e){} }

  function mk(tag,cls) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  function avatar() {
    return '<div class="onb-avatar-box"><div class="onb-avatar-pulse"></div>' +
           '<img src="'+IMG+'" alt="Assistente" onerror="this.style.display=\'none\'"/></div>';
  }

  function dots() {
    var h = '<div class="onb-dots">';
    for (var i=0;i<N;i++) h += '<div class="onb-dot '+(i<cur?"done":i===cur?"on":"")+'"></div>';
    return h+'</div>';
  }

  /* ── BOOT ──────────────────────────────────────────────── */
  function boot() {
    if (isDone()) return;
    window.addEventListener("mod-ready", function h() {
      window.removeEventListener("mod-ready", h);
      setTimeout(start, 900);
    });
    setTimeout(function(){ if(!$ov) start(); }, 6000);
  }

  function start() {
    if ($ov) return;
    // Só inicia se o app do moderador estiver visível
    var app = document.getElementById("mod-app");
    if (!app || !app.classList.contains("active")) return;
    buildDOM();
    go(0);
  }

  /* ── BUILD DOM ─────────────────────────────────────────── */
  function buildDOM() {
    $ov = mk("div","onb-overlay");
    $bk = mk("div","onb-backdrop");
    $sp = mk("div","onb-spotlight");
    $as = mk("div","onb-assistant");
    $fs = mk("div","onb-fs");

    $ov.appendChild($bk);
    $ov.appendChild($sp);
    $ov.appendChild($as);
    $ov.appendChild($fs);
    document.body.appendChild($ov);

    // Event delegation — um único listener para todos os botões
    $ov.addEventListener("click", function(e) {
      var btn = e.target.closest("[data-onb]");
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      var action = btn.getAttribute("data-onb");
      if (action === "next" || action === "start") go(cur + 1);
      else if (action === "prev") go(cur - 1);
      else if (action === "skip") finish();
      else if (action === "go") { finish(); confetti(); }
    });
  }

  /* ── GO TO STEP ────────────────────────────────────────── */
  function go(idx) {
    if (idx < 0 || idx >= N) { finish(); return; }
    cur = idx;
    $as.classList.remove("show");
    $sp.classList.remove("visible");
    $fs.classList.remove("show");
    $ov.classList.add("active");

    var s = STEPS[idx];
    setTimeout(function() {
      if (s.kind === "full") renderFull(s);
      else                   renderSpot(s);
    }, 300);
  }

  /* ── FULLSCREEN ────────────────────────────────────────── */
  function renderFull(s) {
    if (cur === 0 && !s.title) {
        var lbl = document.getElementById("mod-user-label");
        s.title = (lbl ? lbl.textContent : "Olá, Moderador") + "! 👋";
    }
    $bk.classList.add("dim");
    $sp.classList.remove("visible");
    $as.classList.remove("show");
    $as.innerHTML = "";

    var chips = "";
    if (s.chips) {
      chips = '<div class="onb-chips">';
      for (var i=0; i<s.chips.length; i++) chips += '<div class="onb-chip">'+s.chips[i]+'</div>';
      chips += '</div>';
    }

    var btnAttr = s.final ? 'data-onb="go"' : 'data-onb="start"';

    $fs.innerHTML =
      avatar() +
      '<h2 class="onb-title">' + s.title + '</h2>' +
      '<p class="onb-text">' + s.html + '</p>' +
      chips +
      dots() +
      '<div class="onb-btns" style="justify-content:center">' +
        '<button '+btnAttr+'>' + (s.btn||"Avançar") + '</button>' +
      '</div>';

    requestAnimationFrame(function(){ $fs.classList.add("show"); });
  }

  /* ── SPOTLIGHT ─────────────────────────────────────────── */
  function renderSpot(s) {
    $fs.classList.remove("show");
    $fs.innerHTML = "";
    $bk.classList.remove("dim");

    setTimeout(function() {
      var el = document.querySelector(s.sel);
      if (el) {
        scrollTo(el);
        setTimeout(function() {
          spotOn(el);
          bubble(el, s);
        }, 350);
      } else {
        $bk.classList.add("dim");
        bubbleCenter(s);
      }
    }, 200);
  }

  /* ── Scroll into view (página do moderador usa scroll normal) */
  function scrollTo(el) {
    var r = el.getBoundingClientRect();
    var vh = window.innerHeight;
    // Se já está visível, não scrolla
    if (r.top >= 60 && r.bottom <= vh - 40) return;
    var target = window.scrollY + r.top - 80;
    if (target < 0) target = 0;
    window.scrollTo({ top: target, behavior: "smooth" });
  }

  /* ── Spotlight position ────────────────────────────────── */
  function spotOn(el) {
    var r = el.getBoundingClientRect();
    var p = 10;
    $sp.style.left   = (r.left-p)+"px";
    $sp.style.top    = (r.top-p)+"px";
    $sp.style.width  = (r.width+p*2)+"px";
    $sp.style.height = (r.height+p*2)+"px";
    $sp.classList.add("visible");
  }

  /* ── Bubble position (clamped ao viewport) ─────────────── */
  function bubble(el, s) {
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    if (vw <= 900) {
      $as.style.cssText = "top:auto!important;bottom:12px!important;left:12px!important;right:12px!important;";
      fillBubble(s);
      requestAnimationFrame(function(){ $as.classList.add("show"); });
      return;
    }

    var r = el.getBoundingClientRect();
    var bW = 500, bH = 260;

    var top  = r.bottom + 16;
    var left = r.left;

    if (left + bW > vw - 20) left = vw - bW - 20;
    if (left < 20) left = 20;
    if (top + bH > vh - 20) top = r.top - bH - 16;
    if (top < 20) top = 20;

    $as.style.cssText = "top:"+top+"px!important;left:"+left+"px!important;bottom:auto!important;right:auto!important;";

    fillBubble(s);
    requestAnimationFrame(function(){ $as.classList.add("show"); });
  }

  function bubbleCenter(s) {
    $as.style.cssText = "top:50%!important;left:50%!important;transform:translate(-50%,-50%)!important;";
    fillBubble(s);
    requestAnimationFrame(function(){ $as.classList.add("show"); });
  }

  /* ── Fill bubble content ───────────────────────────────── */
  function fillBubble(s) {
    var prevBtn = cur > 1
      ? '<button data-onb="prev">\u2190 Voltar</button>'
      : '';
    var nextLbl = cur >= N-2 ? "Finalizar \u2192" : "Próximo \u2192";

    $as.innerHTML =
      avatar() +
      '<div class="onb-bubble">' +
        '<div class="onb-step-counter">' +
          '<span class="onb-step-num">'+s.n+'</span>' +
          '<span class="onb-step-label">'+s.lb+'</span>' +
        '</div>' +
        '<h3 class="onb-title">'+s.title+'</h3>' +
        '<p class="onb-text">'+s.html+'</p>' +
        dots() +
        '<div class="onb-btns">' +
          prevBtn +
          '<button data-onb="next">'+nextLbl+'</button>' +
          '<button data-onb="skip">Pular tour</button>' +
        '</div>' +
      '</div>';
  }

  /* ── FINISH ────────────────────────────────────────────── */
  function finish() {
    setDone();
    $as.classList.remove("show");
    $sp.classList.remove("visible");
    $fs.classList.remove("show");
    $bk.classList.remove("dim");
    setTimeout(function() {
      $ov.classList.remove("active");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 400);
  }

  /* ── CONFETTI ──────────────────────────────────────────── */
  function confetti() {
    var c = document.createElement("canvas");
    c.className = "onb-confetti";
    c.width = window.innerWidth; c.height = window.innerHeight;
    document.body.appendChild(c);
    var ctx = c.getContext("2d");
    var cols = ["#10b981","#34d399","#4ade80","#facc15","#60a5fa","#a855f7"];
    var ps = [];
    for(var i=0;i<100;i++) ps.push({
      x:Math.random()*c.width, y:Math.random()*c.height-c.height,
      w:Math.random()*7+3, h:Math.random()*5+2,
      co:cols[~~(Math.random()*cols.length)],
      vx:(Math.random()-.5)*3, vy:Math.random()*3.5+1.5,
      r:Math.random()*Math.PI*2, vr:(Math.random()-.5)*.12, op:1
    });
    var f=0;
    (function draw(){
      f++; ctx.clearRect(0,0,c.width,c.height);
      for(var j=0;j<ps.length;j++){
        var p=ps[j]; p.x+=p.vx; p.y+=p.vy; p.r+=p.vr; p.vy+=.035;
        if(f>50)p.op-=.014;
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.r);
        ctx.globalAlpha=Math.max(0,p.op); ctx.fillStyle=p.co;
        ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore();
      }
      if(f<160)requestAnimationFrame(draw); else c.remove();
    })();
  }

  /* ── KEYBOARD ──────────────────────────────────────────── */
  document.addEventListener("keydown",function(e){
    if(!$ov||!$ov.classList.contains("active"))return;
    if(e.key==="ArrowRight"||e.key==="Enter"){e.preventDefault();go(cur+1);}
    else if(e.key==="ArrowLeft"){e.preventDefault();if(cur>0)go(cur-1);}
    else if(e.key==="Escape"){e.preventDefault();finish();}
  });

  /* ── RESIZE ────────────────────────────────────────────── */
  var rzt;
  window.addEventListener("resize",function(){
    clearTimeout(rzt);
    rzt=setTimeout(function(){
      if(!$ov||!$ov.classList.contains("active"))return;
      var s=STEPS[cur];
      if(s&&s.kind==="spot"){
        var el=document.querySelector(s.sel);
        if(el)spotOn(el);
      }
    },200);
  });

  /* ── PUBLIC ────────────────────────────────────────────── */
  window.restartOnboardingMod = function(){
    try{localStorage.removeItem(KEY);}catch(e){}
    if($ov)$ov.remove();
    $ov=$bk=$sp=$as=$fs=null;
    cur=0;
    buildDOM();
    go(0);
  };

  /* ── START ─────────────────────────────────────────────── */
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot);
  else boot();

})();