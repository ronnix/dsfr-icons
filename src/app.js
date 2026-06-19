// Explorateur d'icônes & pictogrammes DSFR — vanilla JS, aucune dépendance.
(function () {
  "use strict";

  var MANIFEST = window.DSFR_MANIFEST || { version: "?", counts: {} };

  // ---------------- Helpers ----------------
  // Nombres formatés selon la locale française (séparateur de milliers : 1 036).
  var NF = new Intl.NumberFormat("fr-FR");
  function fmt(n) {
    return NF.format(n);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
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

  var toast = document.getElementById("toast");
  var toastTimer = null;
  function showToast(html) {
    toast.innerHTML = html;
    toast.hidden = false;
    requestAnimationFrame(function () {
      toast.classList.add("show");
    });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove("show");
    }, 1800);
  }

  // ---------------- Thème ----------------
  var themeToggle = document.getElementById("theme-toggle");
  var SUN =
    '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12Zm0-2a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM11 1h2v3h-2V1Zm0 19h2v3h-2v-3ZM3.515 4.929l1.414-1.414L7.05 5.636 5.636 7.05 3.515 4.93ZM16.95 18.364l1.414-1.414 2.121 2.121-1.414 1.414-2.121-2.121Zm2.121-14.85 1.414 1.415-2.121 2.121-1.414-1.414 2.121-2.121ZM5.636 16.95l1.414 1.414-2.121 2.121-1.414-1.414 2.121-2.121ZM23 11v2h-3v-2h3ZM4 11v2H1v-2h3Z"/></svg>';
  var MOON =
    '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M10 7a7 7 0 0 0 12 4.9v.1c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2h.1A6.979 6.979 0 0 0 10 7Zm-6 5a8 8 0 0 0 15.062 3.762A9 9 0 0 1 8.238 4.938 7.999 7.999 0 0 0 4 12Z"/></svg>';
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    themeToggle.innerHTML = t === "dark" ? SUN : MOON;
  }
  var storedTheme = null;
  try {
    storedTheme = localStorage.getItem("dsfr-icons-theme");
  } catch (e) {}
  applyTheme(
    storedTheme ||
      (window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"),
  );
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

  // ---------------- Configs par type ----------------
  function iconConfig() {
    var d = window.DSFR_ICONS;
    return {
      kind: "icons",
      noun: "icône",
      nounPlural: "icônes",
      allLabel: "Toutes",
      items: d.icons,
      categories: d.categories,
      hasVariant: true,
      formats: [
        { v: "class", label: "Classe fr-icon-*" },
        { v: "name", label: "Nom de l'icône" },
        { v: "html", label: "HTML <span>" },
        { v: "svg", label: "SVG inline" },
      ],
      defaultFormat: "class",
      display: function (i) {
        return i.n;
      },
      title: function (i, lbl) {
        return "fr-icon-" + i.n + "\n(" + lbl + ")";
      },
      haystack: function (i, lbl) {
        return (i.n + " " + i.n.replace(/-/g, " ") + " " + lbl).toLowerCase();
      },
      payload: function (i, fmt) {
        if (fmt === "name") return i.n;
        if (fmt === "html")
          return '<span class="fr-icon-' + i.n + '" aria-hidden="true"></span>';
        if (fmt === "svg") return i.s;
        return "fr-icon-" + i.n;
      },
      toast: function (i, fmt, payload) {
        if (fmt === "svg") return "SVG de <code>" + escapeHtml(i.n) + "</code>";
        if (fmt === "html")
          return "HTML de <code>fr-icon-" + escapeHtml(i.n) + "</code>";
        return "Copié : <code>" + escapeHtml(payload) + "</code>";
      },
    };
  }

  function pictoConfig() {
    var d = window.DSFR_PICTOS;
    return {
      kind: "pictos",
      noun: "pictogramme",
      nounPlural: "pictogrammes",
      allLabel: "Tous",
      items: d.pictos,
      categories: d.categories,
      hasVariant: false,
      cardClass: "card-picto",
      formats: [
        { v: "svg", label: "SVG inline" },
        { v: "name", label: "Nom du fichier" },
        { v: "use", label: "Markup DSFR <use>" },
      ],
      defaultFormat: "svg",
      display: function (p) {
        return p.n.split("/")[1] || p.n;
      },
      title: function (p, lbl) {
        return p.n + "\n(" + lbl + ")";
      },
      haystack: function (p, lbl) {
        return (
          p.n + " " + p.n.replace(/[/-]/g, " ") + " " + lbl
        ).toLowerCase();
      },
      payload: function (p, fmt) {
        if (fmt === "name") return p.n;
        if (fmt === "use") return useMarkup(p);
        return p.s;
      },
      toast: function (p, fmt) {
        var nm = escapeHtml(p.n);
        if (fmt === "svg") return "SVG de <code>" + nm + "</code>";
        if (fmt === "use") return "Markup &lt;use&gt; de <code>" + nm + "</code>";
        return "Copié : <code>" + nm + "</code>";
      },
    };
  }

  // Markup officiel DSFR : <use> vers les calques réellement présents du picto.
  // Le chemin est relatif à votre installation DSFR (dossier artwork/).
  function useMarkup(p) {
    var uses = p.l
      .map(function (layer) {
        return (
          '  <use class="fr-artwork-' +
          layer +
          '" href="artwork/pictograms/' +
          p.n +
          ".svg#artwork-" +
          layer +
          '" />'
        );
      })
      .join("\n");
    return (
      '<svg aria-hidden="true" class="fr-artwork" viewBox="0 0 80 80" width="80" height="80">\n' +
      uses +
      "\n</svg>"
    );
  }

  // ---------------- Fabrique de collection ----------------
  function createCollection(cfg, onChange) {
    var root = document.getElementById("panel-" + cfg.kind);
    var searchInput = root.querySelector(".search");
    var clearBtn = root.querySelector(".clear-btn");
    var catGroup = root.querySelector(".cat-group");
    var variantFilter = root.querySelector(".variant-filter");
    var formatSelect = root.querySelector(".copy-format-select");
    var grid = root.querySelector(".grid");
    var emptyMsg = root.querySelector(".empty");
    var countEl = root.querySelector(".count");

    var catLabel = {};
    cfg.categories.forEach(function (c) {
      catLabel[c.id] = c.label;
    });

    var state = { q: "", cat: "all", variant: "all" };
    var total = cfg.items.length;

    // Format de copie (mémorisé par type)
    cfg.formats.forEach(function (f) {
      var o = document.createElement("option");
      o.value = f.v;
      o.textContent = f.label;
      formatSelect.appendChild(o);
    });
    formatSelect.value = cfg.defaultFormat;
    try {
      var savedFmt = localStorage.getItem("dsfr-fmt-" + cfg.kind);
      if (savedFmt) formatSelect.value = savedFmt;
    } catch (e) {}
    formatSelect.addEventListener("change", function () {
      try {
        localStorage.setItem("dsfr-fmt-" + cfg.kind, formatSelect.value);
      } catch (e) {}
    });

    // Rendu des cartes (une fois)
    var entries = [];
    var frag = document.createDocumentFragment();
    cfg.items.forEach(function (item) {
      var lbl = catLabel[item.c] || item.c;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "card" + (cfg.cardClass ? " " + cfg.cardClass : "");
      btn.title = cfg.title(item, lbl);
      btn.innerHTML =
        item.s + '<span class="name">' + escapeHtml(cfg.display(item)) + "</span>";
      btn.addEventListener("click", function () {
        copyItem(item, btn);
      });
      frag.appendChild(btn);
      entries.push({ item: item, el: btn, hay: cfg.haystack(item, lbl) });
    });
    grid.appendChild(frag);

    // Chips catégorie
    function makeChip(id, label, count) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.dataset.cat = id;
      b.innerHTML =
        escapeHtml(label) + ' <span class="chip-count">' + fmt(count) + "</span>";
      b.addEventListener("click", function () {
        setCat(id);
        if (onChange) onChange();
      });
      return b;
    }
    catGroup.appendChild(makeChip("all", cfg.allLabel || "Toutes", total));
    cfg.categories.forEach(function (c) {
      catGroup.appendChild(makeChip(c.id, c.label, c.count));
    });

    function setCat(id) {
      state.cat = id;
      catGroup.querySelectorAll(".chip").forEach(function (c) {
        c.classList.toggle("active", c.dataset.cat === id);
      });
      filter();
    }

    // Filtre style (icônes uniquement)
    if (variantFilter) {
      variantFilter.querySelectorAll("button").forEach(function (b) {
        b.addEventListener("click", function () {
          state.variant = b.dataset.variant;
          variantFilter.querySelectorAll("button").forEach(function (x) {
            x.classList.toggle("active", x === b);
          });
          filter();
          if (onChange) onChange();
        });
      });
    }

    // Recherche
    var scheduled = false;
    searchInput.addEventListener("input", function () {
      state.q = searchInput.value.trim();
      clearBtn.hidden = state.q === "";
      if (onChange) onChange();
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(function () {
          scheduled = false;
          filter();
        });
      }
    });
    clearBtn.addEventListener("click", function () {
      searchInput.value = "";
      state.q = "";
      clearBtn.hidden = true;
      searchInput.focus();
      filter();
      if (onChange) onChange();
    });

    function filter() {
      var tokens = state.q.toLowerCase().split(/\s+/).filter(Boolean);
      var visible = 0;
      for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        var ok = true;
        if (state.cat !== "all" && e.item.c !== state.cat) ok = false;
        if (ok && cfg.hasVariant && state.variant !== "all" && e.item.v !== state.variant)
          ok = false;
        if (ok && tokens.length) {
          for (var t = 0; t < tokens.length; t++) {
            if (e.hay.indexOf(tokens[t]) === -1) {
              ok = false;
              break;
            }
          }
        }
        e.el.hidden = !ok;
        if (ok) visible++;
      }
      emptyMsg.hidden = visible !== 0;
      countEl.textContent =
        (visible === total ? fmt(total) : fmt(visible) + " / " + fmt(total)) +
        " " +
        cfg.nounPlural;
    }

    function copyItem(item, el) {
      var fmt = formatSelect.value;
      var payload = cfg.payload(item, fmt);
      copyText(payload).then(function (ok) {
        if (!ok) {
          showToast("Copie impossible (presse-papiers indisponible)");
          return;
        }
        el.classList.add("copied");
        setTimeout(function () {
          el.classList.remove("copied");
        }, 650);
        showToast(cfg.toast(item, fmt, payload));
      });
    }

    function applyState(s) {
      if (s.q) {
        state.q = s.q;
        searchInput.value = s.q;
        clearBtn.hidden = false;
      }
      if (s.cat) setCat(s.cat);
      if (cfg.hasVariant && s.variant && variantFilter) {
        state.variant = s.variant;
        variantFilter.querySelectorAll("button").forEach(function (b) {
          b.classList.toggle("active", b.dataset.variant === s.variant);
        });
      }
      filter();
    }

    filter();

    return {
      kind: cfg.kind,
      focusSearch: function () {
        searchInput.focus();
        searchInput.select();
      },
      clearSearch: function () {
        searchInput.value = "";
        state.q = "";
        clearBtn.hidden = true;
        filter();
        if (onChange) onChange();
      },
      getState: function () {
        return { q: state.q, cat: state.cat, variant: state.variant };
      },
      applyState: applyState,
    };
  }

  // ---------------- Contrôleur (onglets, URL, lazy) ----------------
  var cols = {};
  var active = "icons";
  var pendingState = null; // état URL à appliquer après chargement lazy

  // compteurs d'onglets + version
  document.querySelectorAll(".tab-count").forEach(function (el) {
    var c = MANIFEST.counts[el.dataset.count];
    if (c != null) el.textContent = fmt(c);
  });
  var verEl = document.getElementById("dsfr-version");
  if (verEl) verEl.textContent = "@gouvfr/dsfr@" + MANIFEST.version;

  function syncUrl() {
    var st = cols[active] ? cols[active].getState() : { q: "", cat: "all" };
    var parts = ["t=" + active];
    if (st.q) parts.push("q=" + encodeURIComponent(st.q));
    if (st.cat && st.cat !== "all") parts.push("cat=" + st.cat);
    if (st.variant && st.variant !== "all") parts.push("v=" + st.variant);
    history.replaceState(
      null,
      "",
      location.pathname + location.search + "#" + parts.join("&"),
    );
  }

  function readUrl() {
    var out = {};
    location.hash
      .replace(/^#/, "")
      .split("&")
      .forEach(function (pair) {
        if (!pair) return;
        var i = pair.indexOf("=");
        var k = i === -1 ? pair : pair.slice(0, i);
        var v = i === -1 ? "" : decodeURIComponent(pair.slice(i + 1));
        out[k] = v;
      });
    return out;
  }

  function showPanel(name) {
    document.querySelectorAll(".panel").forEach(function (p) {
      p.hidden = p.dataset.kind !== name;
    });
    document.querySelectorAll(".tab").forEach(function (t) {
      var on = t.dataset.tab === name;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
  }

  function ensurePictos(cb) {
    if (cols.pictos) return cb();
    if (window.DSFR_PICTOS) {
      cols.pictos = createCollection(pictoConfig(), syncUrl);
      return cb();
    }
    var loadingEl = document.querySelector("#panel-pictos .loading");
    if (loadingEl) loadingEl.hidden = false;
    var s = document.createElement("script");
    s.src = "./pictograms-data.js";
    s.onload = function () {
      if (loadingEl) loadingEl.hidden = true;
      cols.pictos = createCollection(pictoConfig(), syncUrl);
      cb();
    };
    s.onerror = function () {
      if (loadingEl)
        loadingEl.textContent = "Échec du chargement des pictogrammes.";
    };
    document.head.appendChild(s);
  }

  function activate(name) {
    active = name;
    showPanel(name);
    if (name === "pictos") {
      ensurePictos(function () {
        if (pendingState) {
          cols.pictos.applyState(pendingState);
          pendingState = null;
        }
        syncUrl();
      });
    } else {
      syncUrl();
    }
  }

  document.querySelectorAll(".tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      if (active !== tab.dataset.tab) activate(tab.dataset.tab);
    });
  });

  // Raccourcis clavier
  document.addEventListener("keydown", function (e) {
    var col = cols[active];
    if (!col) return;
    var inSearch =
      document.activeElement &&
      document.activeElement.classList.contains("search");
    if (e.key === "/" && !inSearch) {
      e.preventDefault();
      col.focusSearch();
    } else if (e.key === "Escape" && inSearch) {
      col.clearSearch();
    }
  });

  // Sur pointeur tactile (sans clavier physique), le raccourci « / » n'a pas de
  // sens : on retire le hint du placeholder.
  if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) {
    var searches = document.querySelectorAll(".search");
    for (var si = 0; si < searches.length; si++) {
      searches[si].placeholder = searches[si].placeholder.replace(
        /\s+appuyez sur \/$/,
        "",
      );
    }
  }

  // Hauteur du header → décalage de la toolbar collante
  var header = document.querySelector(".site-header");
  function setHeaderH() {
    document.documentElement.style.setProperty(
      "--header-h",
      header.offsetHeight + "px",
    );
  }
  setHeaderH();
  window.addEventListener("resize", setHeaderH);

  // ---------------- Bootstrap ----------------
  cols.icons = createCollection(iconConfig(), syncUrl);
  var url = readUrl();
  if (url.t === "pictos") {
    pendingState = { q: url.q, cat: url.cat };
    activate("pictos");
  } else {
    cols.icons.applyState({ q: url.q, cat: url.cat, variant: url.v });
    activate("icons");
  }
})();
