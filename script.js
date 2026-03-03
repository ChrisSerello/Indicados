document.addEventListener("DOMContentLoaded", () => {
  const supabase = window.supabaseClient || null;

  // ─── Captura parâmetro ?mod= da URL ──────────────────────────
  // Quando um moderador compartilha seu link (ex: site.com?mod=ABC123),
  // o código é salvo na sessão para ser vinculado à indicação.
  const urlParams = new URLSearchParams(window.location.search);
  const modCodeFromURL = urlParams.get("mod");
  if (modCodeFromURL) {
    sessionStorage.setItem("modCode", modCodeFromURL.toUpperCase().trim());
  }

  // Ano atual no footer
  const yearSpan = document.getElementById("year");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  // ─── Máscaras ─────────────────────────────────────────────
  function formatCPF(value) {
    return value.replace(/\D/g, "")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1");
  }
  function formatPhone(value) {
    return value.replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .replace(/(-\d{4})\d+?$/, "$1");
  }

  document.querySelectorAll("#referrer-doc, #indicated-doc, #signup-cpf").forEach(input => {
    input.addEventListener("input", e => { e.target.value = formatCPF(e.target.value); });
  });
  document.querySelectorAll("#referrer-phone, #indicated-phone, #signup-phone").forEach(input => {
    input.addEventListener("input", e => { e.target.value = formatPhone(e.target.value); });
  });

  // ─── MODAIS LOGIN / SIGNUP ────────────────────────────────
  const loginOverlay  = document.getElementById("login-overlay");
  const signupOverlay = document.getElementById("signup-overlay");

  function openLogin()   { loginOverlay?.classList.add("active"); }
  function closeLogin()  { loginOverlay?.classList.remove("active"); }
  function openSignup()  { signupOverlay?.classList.add("active"); }
  function closeSignup() { signupOverlay?.classList.remove("active"); }

  document.getElementById("btn-open-login")?.addEventListener("click", openLogin);
  document.getElementById("btn-open-login-2")?.addEventListener("click", openLogin);
  document.getElementById("btn-close-login")?.addEventListener("click", closeLogin);
  document.getElementById("btn-close-signup")?.addEventListener("click", closeSignup);

  document.getElementById("open-signup")?.addEventListener("click", (e) => {
    e.preventDefault();
    closeLogin();
    openSignup();
  });

  loginOverlay?.addEventListener("click",  (e) => { if (e.target === loginOverlay)  closeLogin(); });
  signupOverlay?.addEventListener("click", (e) => { if (e.target === signupOverlay) closeSignup(); });

  // ─── MOSTRAR / OCULTAR SENHA ──────────────────────────────
  const togglePassword = document.getElementById("toggle-password");
  const passwordInput  = document.getElementById("login-password");
  if (togglePassword && passwordInput) {
    togglePassword.addEventListener("click", () => {
      const isPass = passwordInput.type === "password";
      passwordInput.type = isPass ? "text" : "password";
      togglePassword.textContent = isPass ? "Ocultar" : "Mostrar";
    });
  }

  // ─── LOGIN ────────────────────────────────────────────────
  document.getElementById("login-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!supabase) { alert("Supabase não configurado."); return; }

    const email = document.getElementById("login-id").value.trim();
    const pass  = document.getElementById("login-password").value;
    if (!email || !pass) { alert("Preencha e-mail e senha."); return; }

    const btn = e.target.querySelector("button[type=submit]");
    const orig = btn.textContent;
    btn.textContent = "Entrando…"; btn.disabled = true;

    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    btn.textContent = orig; btn.disabled = false;

    if (error) { alert("Credenciais inválidas. Verifique e-mail e senha."); return; }
    window.location.href = "dashboard.html";
  });

  // ─── CADASTRO ─────────────────────────────────────────────
  document.getElementById("signup-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!supabase) { alert("Supabase não configurado."); return; }

    const name  = document.getElementById("signup-name").value.trim();
    const cpf   = document.getElementById("signup-cpf").value.replace(/\D/g, "");
    const phone = document.getElementById("signup-phone").value.replace(/\D/g, "");
    const email = document.getElementById("signup-email").value.trim();
    const pass  = document.getElementById("signup-password").value;

    if (!name || !cpf || !phone || !email || !pass) {
      alert("Preencha todos os campos para criar sua conta.");
      return;
    }

    const btn = e.target.querySelector("button[type=submit]");
    const orig = btn.textContent;
    btn.textContent = "Criando conta…"; btn.disabled = true;

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: pass,
        options: { data: { name, cpf, phone } }
      });

      if (signUpError) throw new Error("Erro ao criar conta: " + signUpError.message);
      const user = signUpData?.user;
      if (!user) throw new Error("Não foi possível criar o usuário.");

      const { data: existingRows, error: searchErr } = await supabase
        .from("referrers")
        .select("id")
        .eq("cpf", cpf)
        .is("user_id", null);

      if (searchErr) console.warn("Aviso ao buscar indicações anteriores:", searchErr.message);

      const hasPrevious = existingRows && existingRows.length > 0;

      if (hasPrevious) {
        const ids = existingRows.map(r => r.id);
        await supabase
          .from("referrers")
          .update({ user_id: user.id, name, phone, email })
          .in("id", ids);
      } else {
        // Resolve moderator_id (if the user arrived via a moderator link)
        const savedModCode = sessionStorage.getItem("modCode");
        let moderatorId = null;
        if (savedModCode) {
          const { data: modRecord } = await supabase
            .from("moderators")
            .select("id")
            .eq("code", savedModCode)
            .maybeSingle();
          if (modRecord) moderatorId = modRecord.id;
        }

        await supabase
          .from("referrers")
          .insert({ user_id: user.id, name, cpf, phone, email, moderator_id: moderatorId });
      }

      document.getElementById("signup-form").reset();
      closeSignup();

      const qtd = existingRows?.length || 0;
      alert(
        "✅ Conta criada com sucesso!\n\n" +
        (qtd > 0
          ? `${qtd} indicaç${qtd === 1 ? "ão anterior foi vinculada" : "ões anteriores foram vinculadas"} à sua conta.`
          : "Faça login para começar a acompanhar suas indicações.")
      );
      openLogin();

    } catch (err) {
      console.error(err);
      alert(err.message || "Ocorreu um erro inesperado.");
    } finally {
      btn.textContent = orig; btn.disabled = false;
    }
  });

  // ─── TELA DE AGRADECIMENTO ────────────────────────────────
  const thankyouOverlay = document.getElementById("thankyou-overlay");
  const thankyouClose   = document.getElementById("thankyou-close");

  function openThankyou()  { thankyouOverlay?.classList.add("active"); }
  function closeThankyou() {
    thankyouOverlay?.classList.remove("active");
    document.getElementById("referral-form")?.reset();
    scrollToSection("topo");
  }

  thankyouClose?.addEventListener("click", closeThankyou);
  thankyouOverlay?.addEventListener("click", (e) => { if (e.target === thankyouOverlay) closeThankyou(); });

  // ─── FORMULÁRIO DE INDICAÇÃO (não exige login) ────────────
  const referralForm = document.getElementById("referral-form");
  if (referralForm) {
    referralForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!supabase) { alert("Supabase não configurado."); return; }

      const requiredIds = [
        "referrer-name", "referrer-doc", "referrer-phone",
        "indicated-name", "indicated-doc", "indicated-phone", "profile-type"
      ];
      let valid = true;
      requiredIds.forEach(id => {
        const field = document.getElementById(id);
        if (field && !field.value.trim()) {
          field.style.borderColor = "#fb7185";
          valid = false;
        } else if (field) {
          field.style.borderColor = "";
        }
      });

      const lgpd = document.getElementById("lgpd-consent");
      if (!lgpd?.checked) { alert("Confirme a autorização da pessoa indicada (LGPD)."); return; }
      if (!valid) { alert("Preencha todos os campos obrigatórios."); return; }

      const referrerName  = document.getElementById("referrer-name").value.trim();
      const referrerCPF   = document.getElementById("referrer-doc").value.replace(/\D/g, "");
      const referrerPhone = document.getElementById("referrer-phone").value.replace(/\D/g, "");
      const referrerEmail = document.getElementById("referrer-email").value.trim();
      const indicName     = document.getElementById("indicated-name").value.trim();
      const indicCPF      = document.getElementById("indicated-doc").value.replace(/\D/g, "");
      const indicPhone    = document.getElementById("indicated-phone").value.replace(/\D/g, "");
      const profileType   = document.getElementById("profile-type").value;
      const observations  = document.getElementById("indicated-message").value.trim();

      const submitBtn  = referralForm.querySelector("button[type='submit']");
      const origText   = submitBtn?.textContent || "Enviar indicação";
      if (submitBtn) { submitBtn.textContent = "Enviando…"; submitBtn.disabled = true; }

      try {
        let referrerId = null;

        // Resolve moderator via session (set when the user arrived via mod link)
        const savedModCode = sessionStorage.getItem("modCode");
        let moderatorId = null;
        if (savedModCode) {
          const { data: modRecord } = await supabase
            .from("moderators")
            .select("id")
            .eq("code", savedModCode)
            .maybeSingle();
          if (modRecord) moderatorId = modRecord.id;
        }

        // Check for logged-in session
        const { data: userData } = await supabase.auth.getUser();
        const loggedUser = userData?.user;

        if (loggedUser) {
          const { data: byUser } = await supabase
            .from("referrers")
            .select("id")
            .eq("user_id", loggedUser.id)
            .maybeSingle();
          if (byUser) referrerId = byUser.id;
        }

        if (!referrerId) {
          // Try to find by CPF
          const { data: byCPF } = await supabase
            .from("referrers")
            .select("id")
            .eq("cpf", referrerCPF)
            .maybeSingle();

          if (byCPF) {
            referrerId = byCPF.id;
            // If a moderator is in session and this referrer has none, update
            if (moderatorId) {
              await supabase
                .from("referrers")
                .update({ moderator_id: moderatorId })
                .eq("id", referrerId)
                .is("moderator_id", null);
            }
          } else {
            // New referrer
            const { data: newRef, error: newRefErr } = await supabase
              .from("referrers")
              .insert({
                name:         referrerName,
                cpf:          referrerCPF,
                phone:        referrerPhone,
                email:        referrerEmail,
                moderator_id: moderatorId  // ← vínculo com o moderador
              })
              .select("id")
              .single();

            if (newRefErr) throw newRefErr;
            referrerId = newRef.id;
          }
        }

        // Save indicated client
        const { data: indicated, error: indicErr } = await supabase
          .from("indicated_clients")
          .insert({ name: indicName, cpf: indicCPF, phone: indicPhone, profile_type: profileType, observations })
          .select("id")
          .single();

        if (indicErr) throw indicErr;

        // Create referral link
        const { error: refErr } = await supabase
          .from("referrals")
          .insert({ referrer_id: referrerId, indicated_client_id: indicated.id, status: "em_analise" });

        if (refErr) throw refErr;

        openThankyou();

      } catch (err) {
        console.error("Erro ao enviar indicação:", err);
        alert("Erro ao enviar indicação: " + err.message);
      } finally {
        if (submitBtn) { submitBtn.textContent = origText; submitBtn.disabled = false; }
      }
    });
  }

  // ─── ROLAGEM SUAVE ────────────────────────────────────────
  function scrollToSection(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  window.scrollToSection = scrollToSection;
});