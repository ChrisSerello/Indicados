/* ══════════════════════════════════════════════════════════
   ONBOARDING v4 — Assistente Virtual
   
   INTEGRAÇÃO:
   1. <link rel="stylesheet" href="onboarding.css" /> no <head>
   2. <script src="onboarding.js"></script> antes de </body>
   3. No final de loadDashboard() no dashboard.js:
      window.dispatchEvent(new CustomEvent("dashboard-ready"));
   4. Imagem: logos/assistente.png
   ══════════════════════════════════════════════════════════ */
;(function () {
  "use strict";

  var IMG = "logos/assistente.png";
  var KEY = "ig2_onboarding_v4";
  var N   = 7; // total de steps

  var STEPS = [
    { kind:"full", title:"Olá! Eu sou a Stella \ud83d\udc4b",
      html:'Sou a assistente virtual do <strong>Indique &amp; Ganhe 2.0</strong>. Vou te mostrar tudo o que você precisa saber para <span class="hl-g">acompanhar suas indicações</span> e <span class="hl-p">ganhar Smashcard</span>. É rapidinho!',
      chips:["📊 Resumo","👥 Indicações","🎯 Níveis","💳 Smashcard"], btn:"Vamos começar! 🚀" },

    { kind:"spot", tab:0, sel:".kpi-grid", n:1, lb:"SEUS NÚMEROS",
      title:"Painel de indicadores 📊",
      html:'Aqui você acompanha tudo: <strong>total de indicações</strong>, quantas foram <span class="hl-g">aprovadas</span>, as que estão <span class="hl-y">em análise</span> e quanto já tem de <span class="hl-g">Smashcard liberado</span>.' },

    { kind:"spot", tab:0, sel:"#share-card-client", fb:".kpi-grid", n:2, lb:"SEU LINK",
      title:"Link de indicação 🔗",
      html:'Este é o seu <strong>link exclusivo</strong>. Compartilhe com amigos e família! Quem criar conta por ele fica <span class="hl-p">vinculado a você</span>. Cada contrato fechado gera <span class="hl-g">Smashcard pra você</span>.' },

    { kind:"spot", tab:0, sel:"#nivel-section-wrap", n:3, lb:"NÍVEIS",
      title:"Suba de nível e ganhe mais! 🏆",
      html:'Quanto mais indicações aprovadas, <strong>maior o valor</strong> do Smashcard! Começa em <span class="hl-p">R$ 50</span> no Indiquer Plus e pode chegar a <span class="hl-p">R$ 200</span> no Platinum.' },

    { kind:"spot", tab:1, sel:"#referrals-tab .nivel-section", n:4, lb:"INDICAÇÕES",
      title:"Minhas indicações 👥",
      html:'Nesta aba você vê a <strong>lista completa</strong> de todas as pessoas que indicou, com o <span class="hl-y">status</span> de cada uma e o <span class="hl-g">valor do Smashcard</span> correspondente.' },

    { kind:"spot", tab:2, sel:"#dash-referral-form", n:5, lb:"NOVA INDICAÇÃO",
      title:"Indicar é rápido e fácil ➕",
      html:'Preencha <strong>nome, CPF, WhatsApp</strong> e o <strong>perfil</strong> da pessoa. Leva menos de 1 minuto! Nossa equipe entra em contato <span class="hl-g">sem compromisso</span>.' },

    { kind:"full", title:"Tudo pronto! 🎉",
      html:'Agora você sabe usar o painel. Compartilhe seu <span class="hl-g">link</span>, acompanhe os <span class="hl-p">resultados</span> e suba de nível para ganhar ainda mais!',
      btn:"Começar a usar ✨", final:true }
  ];

  var cur = 0;
  var $ov, $bk, $sp, $as, $fs;

  // ── Helpers ─────────────────────────────────────────────
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

  // ══════════════════════════════════════════════════════════
  //  BOOT
  // ══════════════════════════════════════════════════════════
  function boot() {
    if (isDone()) return;

    // Espera o dashboard carregar
    window.addEventListener("dashboard-ready", function h() {
      window.removeEventListener("dashboard-ready", h);
      setTimeout(start, 900);
    });

    // Fallback 5s
    setTimeout(function(){ if(!$ov) start(); }, 5000);
  }

  function start() {
    if ($ov) return; // já iniciou
    buildDOM();
    go(0);
  }

  // ══════════════════════════════════════════════════════════
  //  BUILD DOM
  // ══════════════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════════
    //  EVENT DELEGATION — um único listener para TODOS os botões
    //  Isso garante que funciona independente de quando o HTML
    //  dos botões é inserido no DOM.
    // ═══════════════════════════════════════════════════════
    $ov.addEventListener("click", function(e) {
      // Procura o botão mais próximo com data-onb
      var btn = e.target.closest("[data-onb]");
      if (!btn) return;

      e.preventDefault();
      e.stopPropagation();

      var action = btn.getAttribute("data-onb");

      if (action === "next" || action === "start") {
        go(cur + 1);
      }
      else if (action === "prev") {
        go(cur - 1);
      }
      else if (action === "skip") {
        finish();
      }
      else if (action === "go") {
        finish();
        confetti();
      }
    });
  }

  // ══════════════════════════════════════════════════════════
  //  GO TO STEP
  // ══════════════════════════════════════════════════════════
  function go(idx) {
    if (idx < 0 || idx >= N) { finish(); return; }
    cur = idx;

    // Esconde tudo
    $as.classList.remove("show");
    $sp.classList.remove("visible");
    $fs.classList.remove("show");

    $ov.classList.add("active");

    var s = STEPS[idx];
    // Delay para a animação de saída completar
    setTimeout(function() {
      if (s.kind === "full") renderFull(s);
      else                   renderSpot(s);
    }, 300);
  }

  // ══════════════════════════════════════════════════════════
  //  FULLSCREEN (welcome / final)
  // ══════════════════════════════════════════════════════════
  function renderFull(s) {
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

    // Botão: "go" no final, "start" no welcome
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

  // ══════════════════════════════════════════════════════════
  //  SPOTLIGHT
  // ══════════════════════════════════════════════════════════
  function renderSpot(s) {
    $fs.classList.remove("show");
    $fs.innerHTML = "";
    $bk.classList.remove("dim");

    // Trocar aba
    var tabs = document.querySelectorAll(".dash-nav-item");
    if (tabs[s.tab]) tabs[s.tab].click();

    setTimeout(function() {
      var el = document.querySelector(s.sel);
      if (!el && s.fb) el = document.querySelector(s.fb);

      if (el) {
        scrollTo(el);
        setTimeout(function() {
          spotOn(el);
          bubble(el, s);
        }, 350);
      } else {
        // Fallback sem target
        $bk.classList.add("dim");
        bubbleCenter(s);
      }
    }, 250);
  }

  // ── Scroll target into view ───────────────────────────────
  function scrollTo(el) {
    var main = document.querySelector(".dash-main");
    if (!main) { el.scrollIntoView({behavior:"smooth",block:"center"}); return; }
    var mR = main.getBoundingClientRect();
    var eR = el.getBoundingClientRect();
    var t = eR.top - mR.top + main.scrollTop - 60;
    if (t < 0) t = 0;
    main.scrollTo({top:t, behavior:"smooth"});
  }

  // ── Spotlight position ────────────────────────────────────
  function spotOn(el) {
    var r = el.getBoundingClientRect();
    var p = 10;
    $sp.style.left   = (r.left-p)+"px";
    $sp.style.top    = (r.top-p)+"px";
    $sp.style.width  = (r.width+p*2)+"px";
    $sp.style.height = (r.height+p*2)+"px";
    $sp.classList.add("visible");
  }

  // ── Bubble position (clamped) ─────────────────────────────
  function bubble(el, s) {
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    // Mobile → fixo no bottom
    if (vw <= 900) {
      $as.style.cssText = "top:auto!important;bottom:12px!important;left:12px!important;right:12px!important;";
      fillBubble(s);
      requestAnimationFrame(function(){ $as.classList.add("show"); });
      return;
    }

    // Desktop
    var r = el.getBoundingClientRect();
    var bW = 500, bH = 260;

    var top  = r.bottom + 16;
    var left = r.left;

    // Clamp horizontal
    if (left + bW > vw - 20) left = vw - bW - 20;
    if (left < 20) left = 20;

    // Se não cabe embaixo, coloca em cima
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

  // ── Fill bubble content ───────────────────────────────────
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

  // ══════════════════════════════════════════════════════════
  //  FINISH
  // ══════════════════════════════════════════════════════════
  function finish() {
    setDone();
    $as.classList.remove("show");
    $sp.classList.remove("visible");
    $fs.classList.remove("show");
    $bk.classList.remove("dim");
    setTimeout(function() {
      $ov.classList.remove("active");
      var tabs = document.querySelectorAll(".dash-nav-item");
      if (tabs[0]) tabs[0].click();
      window.dispatchEvent(new CustomEvent("onboarding-done"))
    }, 400);
  }

  // ══════════════════════════════════════════════════════════
  //  CONFETTI
  // ══════════════════════════════════════════════════════════
  function confetti() {
    var c = document.createElement("canvas");
    c.className = "onb-confetti";
    c.width = window.innerWidth; c.height = window.innerHeight;
    document.body.appendChild(c);
    var ctx = c.getContext("2d");
    var cols = ["#a855f7","#ec4899","#4ade80","#facc15","#38bdf8","#f472b6"];
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

  // ══════════════════════════════════════════════════════════
  //  KEYBOARD
  // ══════════════════════════════════════════════════════════
  document.addEventListener("keydown",function(e){
    if(!$ov||!$ov.classList.contains("active"))return;
    if(e.key==="ArrowRight"||e.key==="Enter"){e.preventDefault();go(cur+1);}
    else if(e.key==="ArrowLeft"){e.preventDefault();if(cur>0)go(cur-1);}
    else if(e.key==="Escape"){e.preventDefault();finish();}
  });

  // ══════════════════════════════════════════════════════════
  //  RESIZE
  // ══════════════════════════════════════════════════════════
  var rzt;
  window.addEventListener("resize",function(){
    clearTimeout(rzt);
    rzt=setTimeout(function(){
      if(!$ov||!$ov.classList.contains("active"))return;
      var s=STEPS[cur];
      if(s&&s.kind==="spot"){
        var el=document.querySelector(s.sel)||(s.fb&&document.querySelector(s.fb));
        if(el)spotOn(el);
      }
    },200);
  });

  // ══════════════════════════════════════════════════════════
  //  PUBLIC
  // ══════════════════════════════════════════════════════════
  window.restartOnboarding = function(){
    try{localStorage.removeItem(KEY);}catch(e){}
    if($ov)$ov.remove();
    $ov=$bk=$sp=$as=$fs=null;
    cur=0;
    buildDOM();
    go(0);
  };

  // ══════════════════════════════════════════════════════════
  //  START
  // ══════════════════════════════════════════════════════════
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot);
  else boot();

})();