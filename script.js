document.addEventListener("DOMContentLoaded", () => {
  const supabase = window.supabaseClient || null;

  // ─── Código de rastreio ─────────────────────────────────────
  // Caracteres permitidos (sem confusão visual: I/1/O/0 removidos)
  const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  function genRandomCode(len) {
    let c = "";
    for (let i = 0; i < len; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return c;
  }

  // ─── Captura parâmetro ?ref= da URL ─────────────────────────
  // Moderador: 2 dígitos → quem chega vira indiquer (4 dígitos)
  // Indiquer:  4 dígitos → quem chega vira indicado (6 dígitos)
  const urlParams = new URLSearchParams(window.location.search);
  const refCodeFromURL = (urlParams.get("ref") || "").toUpperCase().trim();

  if (refCodeFromURL) {
    sessionStorage.setItem("refCode", refCodeFromURL);
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

  // ─── HELPER: Resolve ref code → moderator_id, role, code, ref_origin ──
  // Retorna um objeto com os campos extras para o referrer
  async function resolveRefChain() {
    const savedRefCode = sessionStorage.getItem("refCode") || "";
    if (!savedRefCode) return { moderator_id: null, code: null, role: null, ref_origin: null };

    const codeLen = savedRefCode.length;

    if (codeLen === 2) {
      // Veio de um moderador → novo referrer é INDIQUER
      const { data: modRecord } = await supabase
        .from("moderators").select("id").eq("code", savedRefCode).maybeSingle();

      const newCode = savedRefCode + genRandomCode(2); // 4 dígitos
      return {
        moderator_id: modRecord?.id || null,
        code: newCode,
        role: "indiquer",
        ref_origin: savedRefCode
      };
    }

    if (codeLen === 4) {
      // Veio de um indiquer → novo referrer é INDICADO
      const modPrefix = savedRefCode.substring(0, 2);
      const { data: modRecord } = await supabase
        .from("moderators").select("id").eq("code", modPrefix).maybeSingle();

      // Tenta achar o indiquer pai
      const { data: parentIndiquer } = await supabase
        .from("referrers").select("id").eq("code", savedRefCode).maybeSingle();

      const newCode = savedRefCode + genRandomCode(2); // 6 dígitos
      return {
        moderator_id: modRecord?.id || null,
        code: newCode,
        role: "indicado",
        ref_origin: savedRefCode,
        parent_referrer_id: parentIndiquer?.id || null
      };
    }

    // Código de tamanho inesperado — ignora
    return { moderator_id: null, code: null, role: null, ref_origin: null };
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

      // Busca registros anteriores (indicações sem conta)
      const { data: existingRows, error: searchErr } = await supabase
        .from("referrers")
        .select("id, code, role, moderator_id")
        .eq("cpf", cpf)
        .is("user_id", null);

      if (searchErr) console.warn("Aviso ao buscar indicações anteriores:", searchErr.message);

      const hasPrevious = existingRows && existingRows.length > 0;

      if (hasPrevious) {
        // Vincula registros existentes ao novo user
        const ids = existingRows.map(r => r.id);
        const updateData = { user_id: user.id, name, phone, email };

        // Se o registro anterior não tem code/role mas temos ref info, preenche
        const firstRow = existingRows[0];
        if (!firstRow.code || !firstRow.role) {
          const chain = await resolveRefChain();
          if (chain.code) updateData.code = chain.code;
          if (chain.role) updateData.role = chain.role;
          if (chain.ref_origin) updateData.ref_origin = chain.ref_origin;
          if (chain.moderator_id && !firstRow.moderator_id) updateData.moderator_id = chain.moderator_id;
          if (chain.parent_referrer_id) updateData.parent_referrer_id = chain.parent_referrer_id;
        }

        await supabase.from("referrers").update(updateData).in("id", ids);
      } else {
        // Novo referrer — resolve cadeia de rastreio
        const chain = await resolveRefChain();

        await supabase.from("referrers").insert({
          user_id: user.id,
          name,
          cpf,
          phone,
          email,
          code: chain.code,
          role: chain.role,
          ref_origin: chain.ref_origin,
          moderator_id: chain.moderator_id,
          parent_referrer_id: chain.parent_referrer_id || null
        });
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

        // Resolve a cadeia de rastreio a partir do ?ref= salvo
        const chain = await resolveRefChain();

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
            .select("id, moderator_id, code, role")
            .eq("cpf", referrerCPF)
            .maybeSingle();

          if (byCPF) {
            referrerId = byCPF.id;
            // Se tem cadeia e o referrer ainda não tem, atualiza
            const updates = {};
            if (chain.moderator_id && !byCPF.moderator_id) updates.moderator_id = chain.moderator_id;
            if (chain.code && !byCPF.code) updates.code = chain.code;
            if (chain.role && !byCPF.role) updates.role = chain.role;
            if (Object.keys(updates).length > 0) {
              if (chain.ref_origin) updates.ref_origin = chain.ref_origin;
              if (chain.parent_referrer_id) updates.parent_referrer_id = chain.parent_referrer_id;
              await supabase.from("referrers").update(updates).eq("id", referrerId);
            }
          } else {
            // New referrer
            const { data: newRef, error: newRefErr } = await supabase
              .from("referrers")
              .insert({
                name: referrerName,
                cpf: referrerCPF,
                phone: referrerPhone,
                email: referrerEmail,
                moderator_id: chain.moderator_id,
                code: chain.code,
                role: chain.role,
                ref_origin: chain.ref_origin,
                parent_referrer_id: chain.parent_referrer_id || null
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