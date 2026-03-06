// ══════════════════════════════════════════════════════════════
// PATCH: Redireciona login/signup para minha-area.html
// Inclua este script APÓS o script principal do index.html
// ══════════════════════════════════════════════════════════════

// Override: ao fazer login, redireciona em vez de abrir dashboard inline
(function() {
  // Intercept login form
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    // Remove existing listeners by cloning
    const newForm = loginForm.cloneNode(true);
    loginForm.parentNode.replaceChild(newForm, loginForm);
    
    newForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("login-id").value.trim();
      const pass = document.getElementById("login-password").value;
      const errEl = document.getElementById("client-login-error");
      errEl.textContent = "";
      if (!email || !pass) { errEl.textContent = "Preencha e-mail e senha."; return; }
      try {
        const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        window.location.href = "minha-area.html";
      } catch (err) {
        errEl.textContent = "Credenciais inválidas. Tente novamente.";
      }
    });
  }

  // Intercept signup form  
  const signupForm = document.getElementById("client-signup-form");
  if (signupForm) {
    const newSignup = signupForm.cloneNode(true);
    signupForm.parentNode.replaceChild(newSignup, signupForm);
    
    newSignup.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name  = document.getElementById("client-signup-name").value.trim();
      const cpf   = document.getElementById("client-signup-cpf").value.trim();
      const phone = document.getElementById("client-signup-phone").value.trim();
      const email = document.getElementById("client-signup-email").value.trim();
      const pass  = document.getElementById("client-signup-password").value;
      const errEl = document.getElementById("client-signup-error");
      errEl.textContent = "";
      if (!name || !cpf || !phone || !email || !pass) { errEl.textContent = "Preencha todos os campos."; return; }
      if (pass.length < 6) { errEl.textContent = "A senha deve ter ao menos 6 caracteres."; return; }

      const urlParams = new URLSearchParams(window.location.search);
      const paramRef = urlParams.get("ref");

      const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      function genChars(n) { let r = ""; for (let i = 0; i < n; i++) r += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]; return r; }
      function buildCode(ref) {
        if (!ref) return genChars(4);
        if (ref.length === 2) return ref + genChars(2);
        if (ref.length === 4) return ref + genChars(2);
        if (ref.length === 6) return ref.substring(0, 4) + genChars(2);
        return genChars(4);
      }
      function getRoleFromCode(code) {
        if (!code) return "avulso";
        if (code.length === 4) return "indiquer";
        if (code.length === 6) return "indicado";
        return "avulso";
      }

      const newCode = buildCode(paramRef || null);
      const role = getRoleFromCode(newCode);
      const modCode = newCode.length >= 2 ? newCode.substring(0, 2) : null;

      try {
        const { data: authData, error: authErr } = await sb.auth.signUp({ email, password: pass, options: { data: { name } } });
        if (authErr) throw authErr;
        if (!authData.user) throw new Error("Erro ao criar conta.");

        let moderatorId = null;
        if (modCode) {
          const { data: modRow } = await sb.from("moderators").select("id").eq("code", modCode).maybeSingle();
          if (modRow) moderatorId = modRow.id;
        }

        let parentReferrerId = null;
        if (paramRef) {
          const { data: parentRow } = await sb.from("referrers").select("id").eq("code", paramRef).maybeSingle();
          if (parentRow) parentReferrerId = parentRow.id;
        }

        await sb.from("referrers").insert({
          user_id: authData.user.id, name, cpf, phone, email,
          code: newCode, role, moderator_id: moderatorId,
          parent_referrer_id: parentReferrerId, ref_origin: paramRef || null
        });

        await sb.auth.signInWithPassword({ email, password: pass });
        window.location.href = "minha-area.html";
      } catch (err) {
        console.error("Signup error:", err);
        errEl.textContent = err.message || "Erro ao criar conta.";
      }
    });
  }

  // Auto-login check: if already logged in, redirect to dashboard
  // (delay slightly to not conflict with the original auto-login)
  setTimeout(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const paramRef = urlParams.get("ref");
    if (paramRef) return; // Don't redirect if user came from referral link
    
    const { data } = await sb.auth.getSession();
    const user = data?.session?.user;
    if (user) {
      // Hide any dashboard overlay that might have appeared
      const dashOverlay = document.getElementById("dashboard-overlay");
      if (dashOverlay) dashOverlay.style.display = "none";
      window.location.href = "minha-area.html";
    }
  }, 100);
})();