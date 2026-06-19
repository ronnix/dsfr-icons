// Explorateur d'icônes DSFR — vanilla JS, aucune dépendance.
(function () {
  "use strict";

  var DATA = window.DSFR_ICONS;
  if (!DATA) return;

  var grid = document.getElementById("grid");
  var emptyMsg = document.getElementById("empty");
  var searchInput = document.getElementById("search");
  var clearBtn = document.getElementById("clear-search");
  var catFilters = document.getElementById("category-filters");
  var variantFilter = document.getElementById("variant-filter");
  var copyFormat = document.getElementById("copy-format");
  var metaInfo = document.getElementById("meta-info");
  var dsfrVersion = document.getElementById("dsfr-version");
  var themeToggle = document.getElementById("theme-toggle");
  var toast = document.getElementById("toast");

  var catLabel = {};
  DATA.categories.forEach(function (c) {
    catLabel[c.id] = c.label;
  });

  // État
  var state = { q: "", cat: "all", variant: "all" };

  // -------- Thème --------
  var SUN =
    '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12Zm0-2a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM11 1h2v3h-2V1Zm0 19h2v3h-2v-3ZM3.515 4.929l1.414-1.414L7.05 5.636 5.636 7.05 3.515 4.93ZM16.95 18.364l1.414-1.414 2.121 2.121-1.414 1.414-2.121-2.121Zm2.121-14.85 1.414 1.415-2.121 2.121-1.414-1.414 2.121-2.121ZM5.636 16.95l1.414 1.414-2.121 2.121-1.414-1.414 2.121-2.121ZM23 11v2h-3v-2h3ZM4 11v2H1v-2h3Z"/></svg>';
  var MOON =
    '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M10 7a7 7 0 0 0 12 4.9v.1c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2h.1A6.979 6.979 0 0 0 10 7Zm-6 5a8 8 0 0 0 15.062 3.762A9 9 0 0 1 8.238 4.938 7.999 7.999 0 0 0 4 12Z"/></svg>';

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    themeToggle.innerHTML = theme === "dark" ? SUN : MOON;
  }
  var stored = null;
  try {
    stored = localStorage.getItem("dsfr-icons-theme");
  } catch (e) {}
  var initialTheme =
    stored ||
    (window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light");
  applyTheme(initialTheme);
  themeToggle.addEventListener("click", function () {
    var next =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "light"
        : "dark";
    applyTheme(next);
    try {
      localStorage.setItem("dsfr-icons-theme", next);
    } catch (e) {}
  });

  // -------- Rendu des cartes (une seule fois) --------
  var entries = [];
  var frag = document.createDocumentFragment();
  DATA.icons.forEach(function (icon) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "card";
    btn.title = "fr-icon-" + icon.n + "\n(" + catLabel[icon.c] + ")";
    btn.innerHTML =
      icon.s +
      '<span class="name">' +
      escapeHtml(icon.n) +
      "</span>";
    btn.addEventListener("click", function () {
      copyIcon(icon, btn);
    });
    frag.appendChild(btn);
    // haystack : nom + nom espacé + libellé catégorie
    var haystack = (
      icon.n +
      " " +
      icon.n.replace(/-/g, " ") +
      " " +
      catLabel[icon.c]
    ).toLowerCase();
    entries.push({ icon: icon, el: btn, haystack: haystack });
  });
  grid.appendChild(frag);

  // -------- Filtres catégorie --------
  function makeChip(id, label, count) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "chip" + (id === state.cat ? " active" : "");
    b.dataset.cat = id;
    b.innerHTML =
      escapeHtml(label) +
      ' <span class="chip-count">' +
      count +
      "</span>";
    b.addEventListener("click", function () {
      state.cat = id;
      catFilters.querySelectorAll(".chip").forEach(function (c) {
        c.classList.toggle("active", c.dataset.cat === id);
      });
      syncUrl();
      filter();
    });
    return b;
  }
  catFilters.appendChild(makeChip("all", "Toutes", DATA.count));
  DATA.categories.forEach(function (c) {
    catFilters.appendChild(makeChip(c.id, c.label, c.count));
  });

  // -------- Filtre style (variant) --------
  variantFilter.querySelectorAll("button").forEach(function (b) {
    b.addEventListener("click", function () {
      state.variant = b.dataset.variant;
      variantFilter.querySelectorAll("button").forEach(function (x) {
        x.classList.toggle("active", x === b);
      });
      syncUrl();
      filter();
    });
  });

  // -------- Recherche --------
  searchInput.addEventListener("input", function () {
    state.q = searchInput.value.trim();
    clearBtn.hidden = state.q === "";
    syncUrl();
    scheduleFilter();
  });
  clearBtn.addEventListener("click", function () {
    searchInput.value = "";
    state.q = "";
    clearBtn.hidden = true;
    searchInput.focus();
    syncUrl();
    filter();
  });

  copyFormat.addEventListener("change", function () {
    try {
      localStorage.setItem("dsfr-icons-format", copyFormat.value);
    } catch (e) {}
  });
  try {
    var savedFmt = localStorage.getItem("dsfr-icons-format");
    if (savedFmt) copyFormat.value = savedFmt;
  } catch (e) {}

  // -------- Filtrage --------
  var filterScheduled = false;
  function scheduleFilter() {
    if (filterScheduled) return;
    filterScheduled = true;
    requestAnimationFrame(function () {
      filterScheduled = false;
      filter();
    });
  }

  function filter() {
    var tokens = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    var visible = 0;
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      var ok = true;
      if (state.cat !== "all" && e.icon.c !== state.cat) ok = false;
      if (ok && state.variant !== "all" && e.icon.v !== state.variant)
        ok = false;
      if (ok && tokens.length) {
        for (var t = 0; t < tokens.length; t++) {
          if (e.haystack.indexOf(tokens[t]) === -1) {
            ok = false;
            break;
          }
        }
      }
      e.el.hidden = !ok;
      if (ok) visible++;
    }
    emptyMsg.hidden = visible !== 0;
    updateMeta(visible);
  }

  function updateMeta(visible) {
    var total = DATA.count;
    metaInfo.textContent =
      visible === total
        ? total + " icônes"
        : visible + " / " + total + " icônes";
  }

  // -------- Copie --------
  function buildPayload(icon, fmt) {
    switch (fmt) {
      case "name":
        return icon.n;
      case "html":
        return (
          '<span class="fr-icon-' +
          icon.n +
          '" aria-hidden="true"></span>'
        );
      case "svg":
        return icon.s;
      case "class":
      default:
        return "fr-icon-" + icon.n;
    }
  }

  function copyIcon(icon, el) {
    var fmt = copyFormat.value;
    var payload = buildPayload(icon, fmt);
    copyText(payload).then(function (ok) {
      if (!ok) {
        showToast("Copie impossible (presse-papiers indisponible)");
        return;
      }
      el.classList.add("copied");
      setTimeout(function () {
        el.classList.remove("copied");
      }, 650);
      var label =
        fmt === "svg"
          ? "SVG de " + icon.n
          : fmt === "html"
            ? "HTML de fr-icon-" + icon.n
            : payload;
      showToast("Copié : " + label, fmt !== "svg");
    });
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(
        function () {
          return true;
        },
        function () {
          return fallbackCopy(text);
        },
      );
    }
    return Promise.resolve(fallbackCopy(text));
  }

  function fallbackCopy(text) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      return false;
    }
  }

  var toastTimer = null;
  function showToast(msg, asCode) {
    toast.innerHTML = asCode
      ? msg.replace(/(Copié : )(.*)/, "$1<code>$2</code>")
      : escapeHtml(msg);
    toast.hidden = false;
    requestAnimationFrame(function () {
      toast.classList.add("show");
    });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove("show");
    }, 1800);
  }

  // -------- URL (état partageable) --------
  function syncUrl() {
    var parts = [];
    if (state.q) parts.push("q=" + encodeURIComponent(state.q));
    if (state.cat !== "all") parts.push("cat=" + state.cat);
    if (state.variant !== "all") parts.push("v=" + state.variant);
    var hash = parts.length ? "#" + parts.join("&") : "";
    history.replaceState(null, "", location.pathname + location.search + hash);
  }

  function readUrl() {
    var hash = location.hash.replace(/^#/, "");
    if (!hash) return;
    hash.split("&").forEach(function (pair) {
      var kv = pair.split("=");
      var k = kv[0];
      var val = decodeURIComponent(kv[1] || "");
      if (k === "q") state.q = val;
      else if (k === "cat") state.cat = val;
      else if (k === "v") state.variant = val;
    });
    // refléter dans l'UI
    if (state.q) {
      searchInput.value = state.q;
      clearBtn.hidden = false;
    }
    catFilters.querySelectorAll(".chip").forEach(function (c) {
      c.classList.toggle("active", c.dataset.cat === state.cat);
    });
    variantFilter.querySelectorAll("button").forEach(function (b) {
      b.classList.toggle("active", b.dataset.variant === state.variant);
    });
  }

  // -------- Raccourcis clavier --------
  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    } else if (e.key === "Escape" && document.activeElement === searchInput) {
      searchInput.value = "";
      state.q = "";
      clearBtn.hidden = true;
      syncUrl();
      filter();
    }
  });

  // -------- Helpers --------
  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // -------- Init --------
  if (dsfrVersion) dsfrVersion.textContent = "@gouvfr/dsfr@" + DATA.version;
  readUrl();
  filter();
})();
