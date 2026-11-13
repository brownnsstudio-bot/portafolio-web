// LADO · arma el portafolio con datos/portafolio.js y datos/categorias.js
(function () {
  const D = window.PORTAFOLIO, C = window.CATEGORIAS;
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;

  // Saca el código del archivo de cualquier enlace de Drive y arma el reproductor de Drive
  function enlaceDrive(url) {
    if (!url) return "";
    const m = url.match(/\/d\/([\w-]{10,})/) || url.match(/[?&]id=([\w-]{10,})/);
    return m ? `https://drive.google.com/file/d/${m[1]}/preview` : "";
  }
  const logoBlanco = (m) => m.logos && (m.logos.H_blanco || m.logos.V_blanco);
  // orden de preferencia: blanco diseñado → beige/color (logos a color legibles) → blanco automático → negro → lo que haya
  const pick = (m, ks) => m.logos && ks.map((k) => m.logos[k]).find(Boolean);
  const ORDEN = ["H_blanco", "V_blanco", "H_beige", "V_beige", "H_color", "V_color", "H_blancoauto", "V_blancoauto", "H_negro", "V_negro"];
  const logoCabecera = (m) => pick(m, ORDEN) || (m.logos && Object.values(m.logos)[0]);
  const logoTarjeta = logoCabecera;

  // ---- textos generales ----
  $("[data-frase]").textContent = D.frase || "";
  $("[data-anio]").textContent = new Date().getFullYear();
  const c = D.contacto || {};
  const enlaces = [c.correo && ["Correo", "mailto:" + c.correo], c.instagram && ["Instagram", c.instagram], c.whatsapp && ["WhatsApp", c.whatsapp]].filter(Boolean);
  if (enlaces.length) {
    const caja = $("[data-contacto]");
    enlaces.forEach(([t, h]) => { const a = el("a", "", t); a.href = h; if (!h.startsWith("mailto:")) { a.target = "_blank"; a.rel = "noopener"; } caja.append(a); });
  } else document.querySelectorAll("[data-solo-contacto]").forEach((e) => e.remove());

  // ---- filtros ----
  // valor de los filtros de sector y tipo: "" (todos), "Nombre" (categoría completa) o "Nombre|Sub" (subcategoría)
  const F = { q: "", anio: "", sector: "", tipo: "" };
  const fAnio = $("[data-f-anio]"), fSector = $("[data-f-sector]"), fTipo = $("[data-f-tipo]"), fQ = $("[data-buscar]");

  const opcion = (valor, texto, sangria) => { const o = el("option", "", (sangria ? "   " : "") + texto); o.value = valor; return o; };
  // años
  [...new Set(D.marcas.map((m) => m.anio))].filter((a) => a && a !== "0000").sort().reverse().forEach((a) => fAnio.append(opcion(a, a)));
  // sectores: solo los que tienen clientes, en el orden de categorias.js
  C.sectores.forEach((s) => {
    const ms = D.marcas.filter((m) => m.sector === s.nombre);
    if (!ms.length) return;
    const g = el("optgroup"); g.label = s.nombre;
    g.append(opcion(s.nombre, `Todo ${s.nombre} (${ms.length})`));
    s.sub.forEach((sub) => { const n = ms.filter((m) => m.subsector === sub).length; if (n) g.append(opcion(s.nombre + "|" + sub, `${sub} (${n})`, true)); });
    fSector.append(g);
  });
  // tipos de trabajo: solo los que tienen trabajos
  const todos = D.marcas.flatMap((m) => m.trabajos);
  C.tipos.forEach((t) => {
    const ts = todos.filter((x) => x.tipo === t.nombre);
    const g = el("optgroup"); g.label = t.nombre;
    const o = opcion(t.nombre, `Todo ${t.nombre} (${ts.length})`); o.disabled = !ts.length; g.append(o);
    t.sub.forEach((sub) => { const n = ts.filter((x) => x.sub === sub).length; const os = opcion(t.nombre + "|" + sub, `${sub} (${n})`, true); os.disabled = !n; g.append(os); });
    fTipo.append(g);
  });

  const casa = (valor, cat, sub) => { if (!valor) return true; const [a, b] = valor.split("|"); return cat === a && (!b || sub === b); };
  const trabajosQuePasan = (m) => m.trabajos.filter((t) => casa(F.tipo, t.tipo, t.sub));
  function marcasQuePasan() {
    const q = norm(F.q);
    return D.marcas.filter((m) => (!F.anio || m.anio === F.anio) && casa(F.sector, m.sector, m.subsector) && (!q || norm(m.nombre).includes(q)) && trabajosQuePasan(m).length);
  }

  [[fAnio, "anio"], [fSector, "sector"], [fTipo, "tipo"]].forEach(([s, k]) => s.addEventListener("change", () => { F[k] = s.value; pintarMarcas(); }));
  fQ.addEventListener("input", () => { F.q = fQ.value.trim(); pintarMarcas(); });
  $("[data-limpiar]").addEventListener("click", () => { F.q = F.anio = F.sector = F.tipo = ""; fQ.value = fAnio.value = fSector.value = fTipo.value = ""; pintarMarcas(); });

  // ---- tarjetas de clientes ----
  function pintarMarcas() {
    const lista = $("[data-marcas]"); lista.replaceChildren();
    const marcas = marcasQuePasan();
    const nT = marcas.reduce((s, m) => s + trabajosQuePasan(m).length, 0);
    $("[data-resumen]").textContent = `${plural(marcas.length, "cliente", "clientes")} · ${plural(nT, "trabajo", "trabajos")}`;
    $("[data-limpiar]").hidden = !(F.q || F.anio || F.sector || F.tipo);
    if (!marcas.length) { lista.append(el("li", "vacio", "No hay trabajos con esos filtros.")); return; }
    marcas.forEach((m) => {
      const li = el("li"), b = el("button", "marca");
      const n = trabajosQuePasan(m).length;
      b.type = "button";
      b.setAttribute("aria-label", `${m.nombre}, ${m.sector}, ${m.anio}: ver ${plural(n, "trabajo", "trabajos")}`);
      const logo = el("div", "marca-logo");
      const lb = logoTarjeta(m);
      if (lb) { const i = el("img"); i.src = lb; i.alt = ""; i.loading = "lazy"; logo.append(i); }
      else logo.append(el("span", "marca-sin-logo", m.nombre));
      b.append(logo, el("span", "marca-ver", "Ver " + plural(n, "trabajo", "trabajos")));
      b.addEventListener("click", () => abrir(m));
      li.append(b); lista.append(li);
    });
  }

  // ---- ventana de un cliente ----
  const ventana = $("[data-ventana]");
  const mirar = new IntersectionObserver((ents) => ents.forEach((e) => {
    if (e.isIntersecting && e.target.dataset.src) { e.target.preload = "metadata"; e.target.src = e.target.dataset.src; delete e.target.dataset.src; mirar.unobserve(e.target); }
  }), { root: ventana, rootMargin: "400px 0px" });

  function tarjetaTrabajo(v, cont) {
    const art = el("article", "trabajo");
    const marco = el("div", "video-marco");
    const src = enlaceDrive(v.drive);
    if (v.clase === "video" && src) {
      const f = el("iframe"); f.src = src; f.title = v.titulo; f.loading = "lazy"; f.allow = "autoplay; fullscreen"; f.allowFullscreen = true; marco.append(f);
    } else if (v.clase === "video" && v.local) {
      // video en el disco (prueba local): solo carga una vista previa y arranca al tocar play
      const vid = el("video"); vid.controls = true; vid.preload = "none"; vid.playsInline = true;
      vid.dataset.src = v.local + "#t=0.8"; if (v.portada) vid.poster = v.portada;
      vid.addEventListener("loadedmetadata", () => { if (vid.videoWidth) marco.style.aspectRatio = vid.videoWidth + " / " + vid.videoHeight; });
      vid.addEventListener("play", () => cont.querySelectorAll("video").forEach((o) => o !== vid && o.pause()));
      marco.classList.add("video-local"); marco.append(vid); mirar.observe(vid);
    } else if (v.clase === "galeria" && v.coleccion === "feed-ig") {
      // ---- feed de Instagram: piezas apiladas dentro de un marco de celular, scrolleable ----
      art.className = "trabajo trabajo-ancho trabajo-feedig";
      if (v.titulo) { const h = el("header", "marca-cabeza"); h.append(el("h4", "marca-h", v.titulo)); art.append(h); }
      const tel = el("div", "feedig-telefono");
      const pan = el("div", "feedig-pantalla");
      v.imagenes.forEach((im) => { const i = el("img"); i.src = im.src; i.alt = ""; i.loading = "lazy"; pan.append(i); });
      tel.append(pan); art.append(tel);
      return art;
    } else if (v.clase === "galeria" && v.coleccion === "collage") {
      // ---- collage de fotografías: mosaico, unas más grandes que otras, pegadas, sin orden fijo ----
      art.className = "trabajo trabajo-ancho trabajo-collage";
      if (v.titulo) { const h = el("header", "marca-cabeza"); h.append(el("h4", "marca-h", v.titulo)); art.append(h); }
      const g = el("div", "collage");
      const items = [];
      v.imagenes.forEach((im, idx) => {
        const a = el("a", "collage-item"); a.href = im.src; a.target = "_blank"; a.rel = "noopener";
        const i = el("img"); i.src = im.src; i.alt = ""; i.loading = "lazy";
        i.addEventListener("load", () => { a.dataset.r = (i.naturalWidth / i.naturalHeight) || 1; spans(); });
        a.append(i); g.append(a); items.push({ a, idx });
      });
      // tamaño de cada pieza según forma de la foto, + una destacada de vez en cuando
      const spans = () => items.forEach(({ a, idx }) => {
        const r = parseFloat(a.dataset.r || 1);
        let c = 1, f = 1;
        if (r >= 1.6) { c = 2; f = 1; }         // apaisada: más ancha
        else if (r <= 0.72) { c = 1; f = 2; }   // vertical: más alta
        if (idx % 6 === 2) { c = 2; f = 2; }    // una grande cada tantas, para dar ritmo
        a.style.gridColumnEnd = "span " + c;
        a.style.gridRowEnd = "span " + f;
      });
      // la altura de fila = ancho de columna → celdas base cuadradas (como la referencia)
      const alto = () => {
        const cols = getComputedStyle(g).gridTemplateColumns.split(" ").length;
        if (cols && g.clientWidth) g.style.gridAutoRows = (g.clientWidth / cols) + "px";
      };
      spans(); requestAnimationFrame(alto);
      window.addEventListener("resize", () => requestAnimationFrame(alto));
      art.append(g);
      return art;
    } else if (v.clase === "galeria") {
      // presentación de marca: logo = showcase (hero + versiones) · manual = páginas apiladas
      const esManual = /manual/i.test(v.sub || v.tipo || "");
      const orden = ["color", "principal", "blanco", "negro", "beige", "marron", "marrón", "gris"];
      const peso = (im) => { const n = (im.nombre || "").toLowerCase(); const k = orden.findIndex((o) => n.includes(o)); return k < 0 ? 9 : k; };
      const imgs = [...v.imagenes].sort((a, b) => peso(a) - peso(b));
      const imagen = (im) => { const i = el("img"); i.src = im.src; i.alt = (v.titulo + " " + (im.nombre || "")).trim(); i.loading = "lazy"; return i; };
      const seccion = (kicker, titulo, ...nodos) => {
        const s = el("section", "caso-bloque");
        const h = el("header", "caso-sec");
        if (kicker) h.append(el("p", "marca-eyebrow", kicker));
        if (titulo) h.append(el("h4", "caso-h", titulo));
        s.append(h); nodos.forEach((n) => n && s.append(n)); return s;
      };
      const showcase = () => {
        const sc = el("div", "showcase"), hero = imgs[0];
        const h = el("figure", "showcase-hero fondo-" + (hero.fondo || "oscuro"));
        h.append(imagen(hero)); if (hero.nombre) h.append(el("figcaption", "", hero.nombre)); sc.append(h);
        if (imgs.length > 1) {
          const g = el("div", "showcase-rejilla");
          imgs.slice(1).forEach((im) => { const f = el("figure", "showcase-item fondo-" + (im.fondo || "oscuro")); f.append(imagen(im)); if (im.nombre) f.append(el("figcaption", "", im.nombre)); g.append(f); });
          sc.append(g);
        }
        return sc;
      };
      art.classList.add("trabajo-ancho", esManual ? "trabajo-manual" : "trabajo-marca");

      if (v.caso && v.secuencia && v.secuencia.length) {
        // ---- caso de marca: sucesión de frames 1920x1080 pegados, sin bordes ni títulos ----
        art.className = "caso-stack";
        v.secuencia.forEach((f) => {
          const fig = el("figure", "frame");
          if (f.tipo === "video") {
            const vid = el("video");
            vid.src = f.src; vid.autoplay = true; vid.loop = true; vid.muted = true; vid.playsInline = true; vid.preload = "metadata"; if (f.portada) vid.poster = f.portada;
            fig.append(vid);
          } else {
            const i = el("img"); i.src = f.src; i.alt = f.alt || v.titulo; i.loading = "lazy"; fig.append(i);
          }
          art.append(fig);
        });
        return art;
      }

      const head = el("header", "marca-cabeza");
      head.append(el("p", "marca-eyebrow", esManual ? "Manual de identidad" : "Identidad de marca"));
      head.append(el("h4", "marca-h", v.sub || v.tipo));
      if (v.descripcion) head.append(el("p", "marca-desc", v.descripcion));
      art.append(head);
      if (esManual) {
        const doc = el("div", "manual");
        imgs.forEach((im) => { const f = el("figure", "manual-pagina"); f.append(imagen(im)); if (im.nombre) f.append(el("figcaption", "", im.nombre)); doc.append(f); });
        art.append(doc);
      } else {
        art.append(showcase());
      }
      return art;
    } else if (v.clase === "imagen") {
      const a = el("a", "trabajo-img"); a.href = v.local; a.target = "_blank"; a.rel = "noopener"; a.setAttribute("aria-label", "Ver imagen completa: " + v.titulo);
      const i = el("img"); i.src = v.local; i.alt = v.titulo; i.loading = "lazy";
      i.addEventListener("load", () => { marco.style.aspectRatio = i.naturalWidth + " / " + i.naturalHeight; });
      a.append(i); marco.classList.add("video-local"); marco.append(a);
    } else if (v.clase === "pdf") {
      const a = el("a", "trabajo-pdf", "Abrir PDF"); a.href = v.local; a.target = "_blank"; a.rel = "noopener"; marco.append(a);
    } else {
      const p = el("div", "video-pendiente");
      if (v.portada) { const i = el("img"); i.src = v.portada; i.alt = ""; p.append(i); }
      p.append(el("span", "", "Pendiente de enlace de Drive")); marco.append(p);
    }
    const t = el("div", "video-texto");
    t.append(el("h4", "video-titulo", v.titulo));
    if (v.duracion) t.append(el("span", "video-duracion", v.duracion));
    art.append(marco, t);
    if ((v.sub || v.tipo) !== v.titulo) art.append(el("p", "trabajo-tipo", v.sub || v.tipo));
    if (v.descripcion) art.append(el("p", "video-desc", v.descripcion));
    return art;
  }

  function abrir(m, sinHistorial) {
    $("[data-v-cat]").textContent = [m.sector, m.subsector].filter(Boolean).join(" › ");
    $("[data-v-nombre]").textContent = m.nombreLargo || m.nombre;
    $("[data-v-meta]").textContent = [m.anio !== "0000" && m.anio, m.alianza && "En alianza con " + m.alianza].filter(Boolean).join(" · ");
    const dsc = $("[data-v-desc]"); dsc.textContent = m.descripcion || ""; dsc.hidden = !m.descripcion;
    const lg = $("[data-v-logo]"); lg.replaceChildren();
    const lc = logoCabecera(m); if (lc) { const i = el("img"); i.src = lc; i.alt = m.nombre; lg.append(i); }
    // chips de tipo de trabajo presentes en este cliente
    const chips = $("[data-v-chips]"); chips.replaceChildren();
    const grupos = [];
    m.trabajos.forEach((t) => { const k = t.tipo + "|" + t.sub; if (!grupos.find((g) => g.k === k)) grupos.push({ k, sub: t.sub, n: 0 }); grupos.find((g) => g.k === k).n++; });
    const trabajoCaso = m.trabajos.find((t) => t.caso && t.secuencia);
    const hayCaso = !!trabajoCaso;
    let sel = F.tipo && grupos.some((g) => casa(F.tipo, ...g.k.split("|"))) ? F.tipo : "";
    // si la marca tiene un caso de marca (secuencia), se abre directo en esa vista inmersiva
    if (!sel && hayCaso) sel = trabajoCaso.tipo + "|" + trabajoCaso.sub;
    // el shell inmersivo (ventana-caso) se mantiene estable mientras la marca tenga un caso
    ventana.classList.toggle("ventana-caso", hayCaso);
    const vids = $("[data-videos]");
    function pintar() {
      vids.replaceChildren();
      const lista = m.trabajos.filter((t) => casa(sel, t.tipo, t.sub));
      const esCaso = lista.length === 1 && lista[0].caso && lista[0].secuencia;
      vids.classList.toggle("videos-cuadricula", lista.length > 1);
      vids.classList.toggle("videos-caso", !!esCaso);
      lista.forEach((v) => vids.append(tarjetaTrabajo(v, vids)));
      chips.querySelectorAll(".filtro").forEach((b) => b.setAttribute("aria-pressed", b.dataset.v === sel));
      ventana.scrollTop = 0;
    }
    if (grupos.length > 1) {
      // para un caso de marca mostramos las secciones (sin "Todo", para no mezclar la presentación con los videos)
      (hayCaso ? grupos : [{ k: "", sub: "Todo", n: m.trabajos.length }, ...grupos]).forEach((g) => {
        const b = el("button", "filtro", `${g.sub || g.k.split("|")[0]} (${g.n})`); b.type = "button"; b.dataset.v = g.k;
        b.addEventListener("click", () => { sel = g.k; pintar(); });
        chips.append(b);
      });
    }
    pintar();
    if (!ventana.open) ventana.showModal();
    if (!sinHistorial) history.pushState({ marca: m.id }, "", "#cliente-" + m.id);
  }
  ventana.addEventListener("close", () => {
    $("[data-videos]").replaceChildren();
    if (location.hash.startsWith("#cliente-")) history.pushState(null, "", "#portafolio");
  });
  $("[data-cerrar]").addEventListener("click", () => ventana.close());
  ventana.addEventListener("click", (e) => { if (e.target === ventana) ventana.close(); });

  // enlace directo a un cliente: pagina/#cliente-viggo-burger
  function desdeEnlace() {
    const id = location.hash.startsWith("#cliente-") ? location.hash.slice(9) : "";
    const m = D.marcas.find((x) => x.id === id);
    if (m) abrir(m, true); else if (ventana.open) ventana.close();
  }
  window.addEventListener("popstate", desdeEnlace);

  pintarMarcas();
  desdeEnlace();
})();
