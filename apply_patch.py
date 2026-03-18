#!/usr/bin/env python3
"""
apply_patch.py — Módulo de Atribuição • Indique & Ganhe 2.0

Uso:
    python3 apply_patch.py                      # busca admin.html e moderador.html no diretório atual
    python3 apply_patch.py admin.html mod.html  # caminhos personalizados

O script cria versões modificadas: admin_patched.html e moderador_patched.html.
O arquivo assign.js deve estar na mesma pasta que os HTMLs.
"""

import os, sys, re, shutil

# ──────────────────────────────────────────────────────────────────
#  Fragmentos de código a injetar
# ──────────────────────────────────────────────────────────────────

CSS_ASSIGN = """
    /* ── Botão Atribuir 🔀 ─────────────────────────────── */
    .btn-assign{padding:3px 9px;border-radius:7px;border:1px solid rgba(250,204,21,.4);background:rgba(250,204,21,.1);color:#facc15;font-size:10px;font-weight:600;cursor:pointer;font-family:inherit;margin-left:6px;white-space:nowrap;transition:background .2s;}
    .btn-assign:hover{background:rgba(250,204,21,.22);}"""

# ── modal admin (roxo) ──────────────────────────────────────────
MODAL_ADMIN = """
<!-- ASSIGN MODAL -->
<div class="edit-popup" id="assign-popup" style="display:none;" onclick="if(event.target===this)closeAssign()">
  <div class="edit-modal">
    <h3>🔀 Atribuição</h3>
    <p class="edit-sub" id="assign-subtitle">Reatribuir para outro moderador.</p>
    <div class="edit-field">
      <label>Moderador de destino *</label>
      <select id="assign-mod-sel" style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(168,85,247,.4);background:rgba(10,2,20,.9);color:var(--text);font-family:inherit;font-size:13px;outline:none;" onchange="onAssignModChange()">
        <option value="">— Selecione o moderador —</option>
      </select>
    </div>
    <div class="edit-field" id="assign-inq-field" style="display:none;">
      <label>Indiquer de destino *</label>
      <select id="assign-inq-sel" style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(168,85,247,.4);background:rgba(10,2,20,.9);color:var(--text);font-family:inherit;font-size:13px;outline:none;">
        <option value="">— Selecione o indiquer —</option>
      </select>
    </div>
    <p id="assign-fb" style="color:#fb7185;font-size:12px;min-height:16px;margin-top:8px;"></p>
    <div class="edit-actions">
      <button class="btn-edit-cancel" onclick="closeAssign()">Cancelar</button>
      <button class="btn-edit-save" id="btn-assign-save" onclick="saveAssign()">🔀 Confirmar Atribuição</button>
    </div>
  </div>
</div>
<script src="assign.js"></script>"""

# ── modal moderador (verde) ─────────────────────────────────────
MODAL_MOD = """
<!-- ASSIGN MODAL -->
<div class="edit-popup" id="assign-popup" style="display:none;" onclick="if(event.target===this)closeAssign()">
  <div class="edit-modal">
    <h3>🔀 Atribuição</h3>
    <p id="assign-subtitle" style="font-size:12px;color:var(--muted);margin-bottom:14px;">Reatribuir para outro moderador.</p>
    <div class="edit-field">
      <label>Moderador de destino *</label>
      <select id="assign-mod-sel" style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(16,185,129,.4);background:rgba(4,16,10,.9);color:var(--text);font-family:inherit;font-size:13px;outline:none;" onchange="onAssignModChange()">
        <option value="">— Selecione o moderador —</option>
      </select>
    </div>
    <div class="edit-field" id="assign-inq-field" style="display:none;">
      <label>Indiquer de destino *</label>
      <select id="assign-inq-sel" style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(16,185,129,.4);background:rgba(4,16,10,.9);color:var(--text);font-family:inherit;font-size:13px;outline:none;">
        <option value="">— Selecione o indiquer —</option>
      </select>
    </div>
    <p id="assign-fb" style="color:#fb7185;font-size:12px;min-height:16px;margin-top:8px;"></p>
    <div class="note-actions">
      <button class="btn-note-cancel" onclick="closeAssign()">Cancelar</button>
      <button class="btn-note-save" id="btn-assign-save" onclick="saveAssign()">🔀 Confirmar Atribuição</button>
    </div>
  </div>
</div>
<script src="assign.js"></script>"""

# ──────────────────────────────────────────────────────────────────
#  Mapeamento de substituições nos templates JS dentro dos HTMLs
#  Cada entrada: (buscar, substituir_por, max_trocas)
# ──────────────────────────────────────────────────────────────────

BUTTON_PATCHES = [
    # 1. Indiquer — botão ✏️ + 🔀
    (
        'role-tag role-indiquer">Indiquer</span> '
        '<button class="btn-edit-indiquer" onclick="event.stopPropagation();'
        "openEditReferrer('${c.id}')\">✏️</button>",
        #  ↓ substitui por:
        'role-tag role-indiquer">Indiquer</span> '
        '<button class="btn-edit-indiquer" onclick="event.stopPropagation();'
        "openEditReferrer('${c.id}')\">✏️</button>"
        '<button class="btn-assign" onclick="event.stopPropagation();'
        "openAssign('${c.id}','indiquer')\">🔀 Atribuir</button>",
        1,
    ),
    # 2. Sub-card Indicado (dentro do indiquer expandido) — sub.id
    (
        'role-tag role-indicado" style="font-size:9px;">Indicado</span> '
        '<button class="btn-edit-indiquer" onclick="event.stopPropagation();'
        "openEditReferrer('${sub.id}')\">✏️</button>",
        #  ↓
        'role-tag role-indicado" style="font-size:9px;">Indicado</span> '
        '<button class="btn-edit-indiquer" onclick="event.stopPropagation();'
        "openEditReferrer('${sub.id}')\">✏️</button>"
        '<button class="btn-assign" style="font-size:9px;padding:2px 6px;" '
        'onclick="event.stopPropagation();'
        "openAssign('${sub.id}','indicado')\">🔀</button>",
        1,
    ),
    # 3. Indicado card principal (renderInd) — c.id, sem style
    (
        'role-tag role-indicado">Indicado</span> '
        '<button class="btn-edit-indiquer" onclick="event.stopPropagation();'
        "openEditReferrer('${c.id}')\">✏️</button>",
        #  ↓
        'role-tag role-indicado">Indicado</span> '
        '<button class="btn-edit-indiquer" onclick="event.stopPropagation();'
        "openEditReferrer('${c.id}')\">✏️</button>"
        '<button class="btn-assign" onclick="event.stopPropagation();'
        "openAssign('${c.id}','indicado')\">🔀 Atribuir</button>",
        1,
    ),
]

# ──────────────────────────────────────────────────────────────────
#  Funções de patch
# ──────────────────────────────────────────────────────────────────

def inject_css(html):
    """Insere CSS do botão antes do fechamento </style>."""
    idx = html.rfind("</style>")
    if idx == -1:
        print("  ⚠  </style> não encontrado — CSS não injetado.")
        return html
    return html[:idx] + CSS_ASSIGN + "\n  " + html[idx:]


def inject_modal(html, is_admin):
    """Insere modal + <script src> antes de </body>."""
    modal = MODAL_ADMIN if is_admin else MODAL_MOD
    idx = html.rfind("</body>")
    if idx == -1:
        print("  ⚠  </body> não encontrado — modal não injetado.")
        return html
    return html[:idx] + modal + "\n" + html[idx:]


def inject_buttons(html):
    """Insere botões 🔀 ao lado dos botões ✏️ nos templates JS."""
    results = []
    for old, new, max_rep in BUTTON_PATCHES:
        count = html.count(old)
        if count == 0:
            results.append(f"  ⚠  Não encontrado: '{old[:60]}…'")
        else:
            html = html.replace(old, new, max_rep)
            results.append(f"  ✓  Botão 🔀 adicionado ({count} ocorrência(s) → {max_rep} substituída(s))")
    for r in results:
        print(r)
    return html


def patch_file(src_path, dst_path, is_admin):
    label = "admin.html" if is_admin else "moderador.html"
    print(f"\n{'═'*55}")
    print(f"  Aplicando patch em: {src_path}")
    print(f"{'═'*55}")

    if not os.path.exists(src_path):
        print(f"  ❌  Arquivo não encontrado: {src_path}")
        return False

    with open(src_path, "r", encoding="utf-8") as f:
        html = f.read()

    html = inject_css(html)
    html = inject_modal(html, is_admin)
    html = inject_buttons(html)

    with open(dst_path, "w", encoding="utf-8") as f:
        f.write(html)

    # ── verificações rápidas ──
    checks = {
        "CSS .btn-assign":    ".btn-assign" in html,
        "Modal assign-popup": "assign-popup" in html,
        "assign.js incluído": "assign.js" in html,
        "openAssign()":       "openAssign(" in html,
        "Botão Indiquer 🔀":  "openAssign('${c.id}','indiquer')" in html,
        "Botão Indicado 🔀":  "openAssign('${c.id}','indicado')" in html,
    }
    all_ok = all(checks.values())
    print()
    for k, v in checks.items():
        print(f"  {'✅' if v else '❌'}  {k}")
    print()
    if all_ok:
        print(f"  ✅  {dst_path} gerado com sucesso!")
    else:
        print(f"  ⚠   {dst_path} gerado com avisos — verifique acima.")
    return all_ok


# ──────────────────────────────────────────────────────────────────
#  Main
# ──────────────────────────────────────────────────────────────────

def main():
    args = sys.argv[1:]
    admin_src = args[0] if len(args) > 0 else "admin.html"
    mod_src   = args[1] if len(args) > 1 else "moderador.html"

    admin_dst = admin_src.replace(".html", "_patched.html")
    mod_dst   = mod_src.replace(".html", "_patched.html")

    ok1 = patch_file(admin_src,   admin_dst,   is_admin=True)
    ok2 = patch_file(mod_src,     mod_dst,     is_admin=False)

    print(f"\n{'═'*55}")
    if ok1 and ok2:
        print("  🎉  Patch concluído! Arquivos gerados:")
        print(f"       {admin_dst}")
        print(f"       {mod_dst}")
        print()
        print("  📋  Próximos passos:")
        print("       1. Copie assign.js para a mesma pasta que seus HTMLs.")
        print("       2. Substitua os HTMLs originais pelos _patched.html.")
        print("       3. Teste: abra um painel, expanda um indiquer e")
        print("          clique em 🔀 Atribuir.")
    else:
        print("  ⚠   Patch concluído com avisos. Revise os itens ❌ acima.")
    print(f"{'═'*55}\n")


if __name__ == "__main__":
    main()