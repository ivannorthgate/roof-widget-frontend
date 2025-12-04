(function () {
  // ========= EDIT THESE 2 LINES =========
  const API_BASE = "https://roof-widget-backend.onrender.com";
  const GHL_WEBHOOK =
    "https://services.leadconnectorhq.com/hooks/w06FI2oCDolhpxHVnjJn/webhook-trigger/24c72f4d-dbca-4326-a3ab-30c6e4486541";
  // =====================================

  // ========= DEFAULT MAP VIEW (ANN ARBOR) =========
  const DEFAULT_CENTER = [42.2808, -83.7430]; // Ann Arbor
  const DEFAULT_ZOOM = 12;
  // ===============================================

  // ========= PRICING TIERS =========
  const TIERS = [
    {
      key: "basic",
      name: "Basic",
      product: "IKO Cambridge Architectural Shingles",
      price_per_sq: 660,
      bullets: [
        "Class 3 impact resistance rating",
        "Built-in algae protection",
        "True Square Advantage Sizing"
      ]
    },
    {
      key: "premium",
      name: "Premium",
      product: "IKO Dynasty Performance Shingles",
      price_per_sq: 740,
      bullets: [
        "Class 3 Impact Resistance rating",
        "Reinforced with ArmourZone",
        "True Square Advantage Sizing"
      ]
    },
    {
      key: "deluxe",
      name: "Deluxe",
      product: "IKO Nordic Performance Shingles",
      price_per_sq: 960,
      bullets: [
        "Class 4 impact resistance",
        "Ultra-dimensional profile"
      ]
    }
  ];
  // ===============================

  function el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "class") e.className = v;
      else if (k === "style") e.setAttribute("style", v);
      else e.setAttribute(k, v);
    });
    children.forEach(c => e.appendChild(c));
    return e;
  }
  function text(t) { return document.createTextNode(t); }

  function injectStyles() {
    if (document.getElementById("roof-widget-styles")) return;

    const css = `
      :root{
        --rw-bg: #0b0b0d;
        --rw-card: #121216;
        --rw-card-2: #17171d;
        --rw-border: rgba(255,255,255,0.08);
        --rw-text: #f5f5f7;
        --rw-muted: #a0a0ad;

        --rw-red: #b10f17;
        --rw-red-2: #8f0c12;
        --rw-red-soft: rgba(177,15,23,0.25);

        --rw-green: #16a34a;
        --rw-radius: 14px;
        --rw-shadow: 0 10px 30px rgba(0,0,0,0.45);
      }

      .rw-wrap{
        font-family: system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
        color: var(--rw-text);
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        margin: 0 auto;
        text-align: left;
      }
      .rw-card{
        width: 100%;
        max-width: 560px;
        background: linear-gradient(180deg, var(--rw-card), var(--rw-card-2));
        border: 1px solid var(--rw-border);
        border-radius: var(--rw-radius);
        box-shadow: var(--rw-shadow);
        padding: 18px;
        margin: 0 auto;
      }
      .rw-header{
        display:flex;
        gap:12px;
        align-items:center;
        margin-bottom:14px;
      }
      .rw-logo{
        width:42px;height:42px;border-radius:10px;
        background: radial-gradient(80% 80% at 30% 20%, var(--rw-red), var(--rw-red-2));
        display:grid;place-items:center;font-weight:800;color:white;
        letter-spacing:.5px;
        box-shadow: 0 6px 14px rgba(177,15,23,0.25);
      }
      .rw-title{ font-size:20px;font-weight:800;line-height:1.1; }
      .rw-sub{ color:var(--rw-muted);font-size:13px;margin-top:2px; }

      .rw-section-title{
        margin:14px 0 8px;
        font-weight:700;font-size:14px;letter-spacing:.2px;color:#fff;
      }

      .rw-input{
        width:100%; padding:12px 12px; background:#0e0e12;
        border:1px solid var(--rw-border); border-radius:12px;
        color:var(--rw-text); font-size:15px; outline:none;
        transition: border .15s ease, box-shadow .15s ease;
      }
      .rw-input:focus{
        border-color: var(--rw-red);
        box-shadow: 0 0 0 3px var(--rw-red-soft);
      }

      .rw-sugg{
        margin-top:6px; background:#0e0e12;
        border:1px solid var(--rw-border); border-radius:12px; overflow:hidden;
      }
      .rw-sugg-item{
        padding:10px 12px; cursor:pointer; font-size:14px;
        border-bottom:1px solid var(--rw-border);
      }
      .rw-sugg-item:last-child{border-bottom:none;}
      .rw-sugg-item:hover{background:#15151b;}

      .rw-loading{
        padding:10px 12px;font-size:13px;color:#bbb;cursor:default;
      }

      .rw-note{
        font-size:13px;color:var(--rw-muted);margin-top:8px;line-height:1.4;
      }
      .rw-status{ font-size:14px;margin-top:10px;color:#fff; }

      .rw-map-wrap{
        margin-top:10px;border:1px solid var(--rw-border);
        background:#0e0e12;border-radius:14px;overflow:hidden;
      }
      .rw-map{ height:260px;width:100%; }

      .rw-btn{
        margin-top:12px;width:100%;padding:13px 14px;font-weight:800;
        letter-spacing:.3px;font-size:15px;color:white;
        background: linear-gradient(180deg, var(--rw-red), var(--rw-red-2));
        border:none;border-radius:12px;cursor:pointer;
        transition: opacity .15s ease, filter .15s ease; box-shadow: none;
      }
      .rw-btn:hover{ filter: brightness(1.05); }
      .rw-btn:disabled{ opacity:.6;cursor:not-allowed;filter:none; }

      .rw-estimate{
        margin-top:12px;display:none;padding:14px;background:#0e0e12;
        border:1px dashed rgba(255,255,255,0.15);border-radius:12px;
      }
      .rw-est-grid{ display:grid; grid-template-columns:1fr 1fr; gap:10px; }
      .rw-stat{
        background:#14141a;border:1px solid var(--rw-border);
        border-radius:12px;padding:12px;
      }
      .rw-stat-label{ font-size:12px;color:var(--rw-muted);margin-bottom:4px; }
      .rw-stat-value{ font-size:20px;font-weight:800; }
      .rw-est-foot{ margin-top:8px;font-size:12px;color:var(--rw-muted); }

      .rw-form{
        margin-top:12px;display:none;background:#0e0e12;border:1px solid var(--rw-border);
        border-radius:12px;padding:12px;
      }
      .rw-form-grid{ display:grid; grid-template-columns:1fr 1fr; gap:10px; }
      .rw-field{ display:flex;flex-direction:column;gap:6px; }
      .rw-label{ font-size:12px;color:var(--rw-muted); }
      .rw-label b{ color:#fff;font-weight:700; }
      .rw-required{ color:var(--rw-red);margin-left:3px; }

      .rw-error{
        display:none;color:#ffd2d5;background:rgba(177,15,23,0.12);
        border:1px solid rgba(177,15,23,0.45);
        padding:8px 10px;border-radius:10px;font-size:13px;margin-bottom:8px;
      }
      .rw-submit{
        margin-top:10px;background: linear-gradient(180deg, #1fbf63, var(--rw-green));
        box-shadow:none;
      }
      .rw-success{
        margin-top:10px;background: rgba(22,163,74,0.12);
        border:1px solid rgba(22,163,74,0.5);
        color:#d9ffe8;padding:10px;border-radius:10px;font-size:14px;display:none;
      }

      .rw-step2{ display:none; margin-top:12px; }
      .rw-step2-title{ font-weight:800;font-size:16px;margin-bottom:8px; }
      .rw-tier-grid{ display:grid; grid-template-columns:1fr; gap:10px; }
      .rw-tier{
        background:#0e0e12;border:1px solid var(--rw-border);
        border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px;
      }
      .rw-tier-top{ display:flex;justify-content:space-between;align-items:center; }
      .rw-tier-name{ font-size:16px;font-weight:800; }
      .rw-tier-badge{
        font-size:11px;font-weight:700;letter-spacing:.3px;color:#fff;
        background:rgba(255,255,255,0.06);border:1px solid var(--rw-border);
        padding:4px 8px;border-radius:999px;
      }
      .rw-tier-product{ color:var(--rw-muted);font-size:13px; }
      .rw-tier-price{ font-size:20px;font-weight:900; }
      .rw-tier-per{ font-size:12px;color:var(--rw-muted); }
      .rw-tier-bullets{
        margin:0;padding-left:18px;font-size:13px;color:#e8e8ee;line-height:1.5;
      }
      .rw-tier-select{
        margin-top:6px;width:100%;padding:12px;font-weight:800;font-size:14px;color:#fff;
        background:#1a1a21;border:1px solid var(--rw-border);border-radius:10px;cursor:pointer;
      }
      .rw-tier-select:hover{ filter:brightness(1.05); }
      .rw-tier.featured{
        border-color: rgba(177,15,23,0.8);
        background: linear-gradient(180deg, #121219, #0e0e12);
      }
      .rw-tier.featured .rw-tier-select{
        background: linear-gradient(180deg, var(--rw-red), var(--rw-red-2));
        border:none;
      }
      .rw-helper{
        font-size:12px;color:var(--rw-muted);
        margin-top:8px;text-align:center;
      }

      @media (max-width: 520px){
        .rw-form-grid{grid-template-columns:1fr;}
        .rw-est-grid{grid-template-columns:1fr;}
        .rw-map{height:220px;}
      }
    `;
    const styleTag = document.createElement("style");
    styleTag.id = "roof-widget-styles";
    styleTag.textContent = css;
    document.head.appendChild(styleTag);
  }

  // ---------- faster suggestion system ----------
  const suggestCache = new Map();
  let suggestAbort = null;
  const PHOTON_URL = q =>
    `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8`;
  const NOMINATIM_URL = q =>
    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8&q=${encodeURIComponent(q)}`;

  async function addressSuggest(q) {
    const key = q.toLowerCase();
    if (suggestCache.has(key)) return suggestCache.get(key);

    if (suggestAbort) suggestAbort.abort();
    suggestAbort = new AbortController();

    try {
      const r = await fetch(PHOTON_URL(q), { signal: suggestAbort.signal });
      const d = await r.json();

      const photonResults = (d.features || [])
        .map(f => {
          const p = f.properties || {};
          const housenumber = p.housenumber || "";
          const street = p.street || p.name || "";
          const city = p.city || p.locality || "";
          const state = p.state || "";
          const postcode = p.postcode || "";
          return {
            label: `${housenumber} ${street}, ${city}, ${state} ${postcode}`.trim(),
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
            street: `${housenumber} ${street}`.trim(),
            city,
            state,
            postal_code: postcode,
            country: p.country || "US"
          };
        })
        .filter(x => x.label.length > 3);

      if (photonResults.length) {
        suggestCache.set(key, photonResults);
        return photonResults;
      }
    } catch (e) {
      if (e.name === "AbortError") return [];
    }

    try {
      const nr = await fetch(NOMINATIM_URL(q), {
        signal: suggestAbort.signal,
        headers: {
          "User-Agent": "RoofWidget/1.0 (contact: youremail@yourdomain.com)"
        }
      });
      const nd = await nr.json();

      const results = (nd || []).map(x => {
        const a = x.address || {};
        const house = a.house_number || "";
        const road = a.road || a.neighbourhood || "";
        const city = a.city || a.town || a.village || a.county || "";
        const state = a.state || "";
        const postcode = a.postcode || "";
        const country = a.country_code
          ? a.country_code.toUpperCase()
          : "US";
        return {
          label: x.display_name,
          lat: parseFloat(x.lat),
          lng: parseFloat(x.lon),
          street: `${house} ${road}`.trim(),
          city,
          state,
          postal_code: postcode,
          country
        };
      });

      suggestCache.set(key, results);
      return results;
    } catch (e) {
      if (e.name === "AbortError") return [];
      return [];
    }
  }

  async function resolveAddressDetails(addressText) {
    const nr = await fetch(NOMINATIM_URL(addressText), {
      headers: {
        "User-Agent": "RoofWidget/1.0 (contact: youremail@yourdomain.com)"
      }
    });
    const nd = await nr.json();
    if (!nd || !nd.length) return null;

    const x = nd[0];
    const a = x.address || {};
    const house = a.house_number || "";
    const road = a.road || a.neighbourhood || "";
    const city = a.city || a.town || a.village || a.county || "";
    const state = a.state || "";
    const postcode = a.postcode || "";
    const country = a.country_code ? a.country_code.toUpperCase() : "US";

    return {
      lat: parseFloat(x.lat),
      lng: parseFloat(x.lon),
      street: `${house} ${road}`.trim(),
      city,
      state,
      postal_code: postcode,
      country
    };
  }

  async function measureRoof(lat, lng, address) {
    const r = await fetch(`${API_BASE}/measure-roof`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng, address })
    });
    return r.json();
  }

  async function sendLead(data) {
    const r = await fetch(`${API_BASE}/create-lead`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, ghl_webhook_url: GHL_WEBHOOK })
    });
    return r.json();
  }

  function init(containerId = "roof-widget") {
    injectStyles();

    const root = document.getElementById(containerId);
    if (!root) return;
    root.innerHTML = "";
    root.className = "rw-wrap";

    const card = el("div", { class: "rw-card" });

    const header = el("div", { class: "rw-header" }, [
      el("div", { class: "rw-logo" }, [text("NG")]),
      el("div", {}, [
        el("div", { class: "rw-title" }, [text("Instant Roof Estimate")]),
        el("div", { class: "rw-sub" }, [
          text("Fast, free estimate — confirmed on inspection.")
        ])
      ])
    ]);

    const addrTitle = el("div", { class: "rw-section-title" }, [
      text("Property Address")
    ]);

    const input = el("input", {
      class: "rw-input",
      type: "text",
      placeholder: "e.g. 325 Depot St, Ann Arbor, MI 48104",
      required: "true",
      autocomplete: "off"
    });

    const suggBox = el("div", {
      class: "rw-sugg",
      style: "display:none;"
    });

    const note = el("div", { class: "rw-note" }, [
      text(
        "Tip: include ZIP for best results. If no suggestions appear, you can still continue."
      )
    ]);

    // ---- Map container ----
    const mapWrap = el("div", { class: "rw-map-wrap" });
    const mapDiv = el("div", {
      id: `${containerId}-map`,
      class: "rw-map"
    });
    mapWrap.appendChild(mapDiv);

    const status = el("div", { class: "rw-status" });

    const btn = el("button", { class: "rw-btn" }, [
      text("Measure My Roof")
    ]);

    const estimateBox = el("div", { class: "rw-estimate" });
    estimateBox.innerHTML = `
      <div class="rw-est-grid">
        <div class="rw-stat">
          <div class="rw-stat-label">Estimated Roof Size</div>
          <div class="rw-stat-value" id="${containerId}-sq">—</div>
        </div>
        <div class="rw-stat">
          <div class="rw-stat-label">Estimated Pitch</div>
          <div class="rw-stat-value" id="${containerId}-pitch">—</div>
        </div>
      </div>
      <div class="rw-est-foot">Final measurements confirmed during on-site inspection.</div>
    `;

    const formBox = el("div", { class: "rw-form" });
    const errorBox = el("div", { class: "rw-error" });
    const successBox = el("div", { class: "rw-success" });
    const step2Box = el("div", { class: "rw-step2" });

    let selected = null;
    let lastAddressDetails = null;
    let lastEstimate = null;
    let lastLeadPayload = null;

    // ---- Leaflet map init (Ann Arbor default) ----
    let map = null;
    let marker = null;

    function waitForLeafletAndInit(tries = 0) {
      if (window.L) {
        initDefaultMap();
        return;
      }
      if (tries > 40) {
        console.warn("Leaflet not found. Map will not render.");
        return;
      }
      setTimeout(() => waitForLeafletAndInit(tries + 1), 150);
    }

    function initDefaultMap() {
      if (!window.L || map) return;

      map = L.map(mapDiv, {
        zoomControl: true,
        attributionControl: true
      }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 20,
          attribution: "© Esri"
        }
      ).addTo(map);

      // force tiles to recalc after GHL layout settles
      setTimeout(() => map.invalidateSize(), 300);
      setTimeout(() => map.invalidateSize(), 1200);
    }

    function ensureMap(lat, lng) {
      if (!window.L) return;
      if (!map) initDefaultMap();

      map.setView([lat, lng], 19);

      if (marker) marker.remove();
      marker = L.marker([lat, lng]).addTo(map);

      // refresh tiles after zoom snap
      setTimeout(() => map.invalidateSize(), 250);
    }

    // show default map on load
    waitForLeafletAndInit();

    // ---- Suggestion input ----
    let debounceTimer = null;
    let suggestSeq = 0;

    input.addEventListener("input", () => {
      const q = input.value.trim();
      selected = null;
      lastAddressDetails = null;
      status.textContent = "";
      suggBox.innerHTML = "";
      suggBox.style.display = "none";

      if (debounceTimer) clearTimeout(debounceTimer);

      debounceTimer = setTimeout(async () => {
        const mySeq = ++suggestSeq;
        if (q.length < 3) return;

        suggBox.style.display = "block";
        suggBox.innerHTML = "";
        suggBox.appendChild(
          el("div", { class: "rw-loading" }, [text("Searching…")])
        );

        const suggestions = await addressSuggest(q);
        if (mySeq !== suggestSeq) return;

        suggBox.innerHTML = "";

        if (!suggestions.length) {
          suggBox.appendChild(
            el(
              "div",
              {
                class: "rw-sugg-item",
                style: "cursor:default;color:#bbb;"
              },
              [text("No suggestions found. You can still click “Measure My Roof.”")]
            )
          );
          return;
        }

        suggestions.forEach(s => {
          const item = el("div", { class: "rw-sugg-item" }, [text(s.label)]);
          item.onclick = () => {
            selected = s;
            lastAddressDetails = {
              street: s.street || "",
              city: s.city || "",
              state: s.state || "",
              postal_code: s.postal_code || "",
              country: s.country || "US",
              lat: s.lat,
              lng: s.lng
            };
            input.value = s.label;
            suggBox.innerHTML = "";
            suggBox.style.display = "none";
            ensureMap(s.lat, s.lng);
          };
          suggBox.appendChild(item);
        });
      }, 150);
    });

    // ---- Measure button ----
    btn.onclick = async () => {
      estimateBox.style.display = "none";
      formBox.style.display = "none";
      step2Box.style.display = "none";
      successBox.style.display = "none";
      errorBox.style.display = "none";

      const typed = input.value.trim();
      if (!typed) {
        status.textContent = "Please enter a property address.";
        return;
      }

      status.textContent = "Measuring roof… please wait.";

      if (!selected) {
        lastAddressDetails = await resolveAddressDetails(typed);
        if (lastAddressDetails?.lat && lastAddressDetails?.lng) {
          selected = {
            label: typed,
            lat: lastAddressDetails.lat,
            lng: lastAddressDetails.lng
          };
          ensureMap(lastAddressDetails.lat, lastAddressDetails.lng);
        } else {
          selected = { label: typed, lat: null, lng: null };
        }
      }

      let data;
      try {
        data = await measureRoof(selected.lat, selected.lng, typed);
      } catch (e) {
        status.textContent = "Measurement server error. Please try again.";
        return;
      }

      if (data.error === "no_footprint") {
        status.textContent =
          "We couldn't auto-measure this roof (no map footprint). We'll confirm during inspection.";
        showLeadForm("unknown", "unknown");
        return;
      }

      if (data.error) {
        status.textContent =
          "We couldn't measure that address. We'll confirm during inspection.";
        showLeadForm("unknown", "unknown");
        return;
      }

      lastEstimate = data;
      status.textContent = "";

      estimateBox.style.display = "block";
      card.querySelector(
        `#${containerId}-sq`
      ).textContent = `~${data.squares} squares`;
      card.querySelector(
        `#${containerId}-pitch`
      ).textContent = data.pitch_class;

      showLeadForm(data.squares, data.pitch_class);
    };

    // ---- Lead form ----
    function showLeadForm(squares, pitchClass) {
      formBox.innerHTML = "";
      formBox.style.display = "block";

      const field = (label, placeholder, value = "") => {
        const wrap = el("div", { class: "rw-field" });
        const lab = el("div", { class: "rw-label" }, [
          el("b", {}, [text(label)]),
          el("span", { class: "rw-required" }, [text("*")])
        ]);
        const inp = el("input", {
          class: "rw-input",
          placeholder,
          required: "true",
          value
        });
        wrap.append(lab, inp);
        return { wrap, inp };
      };

      const fFirst = field("First Name", "John");
      const fLast = field("Last Name", "Doe");
      const fPhone = field("Phone", "###-###-####");
      const fEmail = field("Email", "you@example.com");

      const fStreet = field(
        "Street Address",
        "325 Depot St",
        lastAddressDetails?.street || ""
      );
      const fCity = field(
        "City",
        "Ann Arbor",
        lastAddressDetails?.city || ""
      );
      const fState = field(
        "State",
        "Michigan",
        lastAddressDetails?.state || ""
      );
      const fZip = field(
        "Postal Code",
        "48104",
        lastAddressDetails?.postal_code || ""
      );

      const grid = el("div", { class: "rw-form-grid" }, [
        fFirst.wrap,
        fLast.wrap,
        fPhone.wrap,
        fEmail.wrap
      ]);

      const gridAddr = el(
        "div",
        { class: "rw-form-grid", style: "margin-top:6px;" },
        [fStreet.wrap, fCity.wrap, fState.wrap, fZip.wrap]
      );

      const submit = el("button", { class: "rw-btn rw-submit" }, [
        text("Continue to Pricing")
      ]);

      function showError(msg) {
        errorBox.textContent = msg;
        errorBox.style.display = "block";
      }
      function hideError() {
        errorBox.style.display = "none";
      }

      submit.onclick = async () => {
        hideError();
        successBox.style.display = "none";

        const req = [
          ["First Name", fFirst.inp.value],
          ["Last Name", fLast.inp.value],
          ["Phone", fPhone.inp.value],
          ["Email", fEmail.inp.value],
          ["Street Address", fStreet.inp.value],
          ["City", fCity.inp.value],
          ["State", fState.inp.value],
          ["Postal Code", fZip.inp.value]
        ];

        for (const [name, val] of req) {
          if (!val.trim()) return showError(`${name} is required.`);
        }

        submit.disabled = true;
        submit.textContent = "Saving…";

        const fullName = `${fFirst.inp.value.trim()} ${fLast.inp.value.trim()}`.trim();

        lastLeadPayload = {
          first_name: fFirst.inp.value.trim(),
          last_name: fLast.inp.value.trim(),
          name: fullName,
          phone: fPhone.inp.value.trim(),
          email: fEmail.inp.value.trim(),
          address: input.value.trim(),

          street: fStreet.inp.value.trim(),
          city: fCity.inp.value.trim(),
          state: fState.inp.value.trim(),
          postal_code: fZip.inp.value.trim(),
          country: lastAddressDetails?.country || "US",

          squares: parseFloat(squares) || 0,
          pitch_class: pitchClass
        };

        try {
          await sendLead({
            ...lastLeadPayload,
            selected_package: "",
            estimated_package_price: 0
          });
        } catch (e) {
          submit.disabled = false;
          submit.textContent = "Continue to Pricing";
          return showError("Send failed. Please try again.");
        }

        submit.disabled = false;
        submit.textContent = "Continue to Pricing";

        formBox.style.display = "none";
        showPricingStep();
      };

      formBox.append(
        errorBox,
        el("div", { class: "rw-section-title" }, [text("Your Contact Info")]),
        grid,
        el("div", { class: "rw-section-title" }, [
          text("Confirm Property Address")
        ]),
        gridAddr,
        submit,
        successBox
      );
    }

    // ---- Pricing step ----
    function showPricingStep() {
      if (!lastEstimate || !lastLeadPayload) return;

      const sq = parseFloat(lastEstimate.squares) || 0;
      const sqLabel = sq ? `~${sq} squares` : "Estimate unavailable";

      step2Box.innerHTML = "";
      step2Box.style.display = "block";

      const title = el("div", { class: "rw-step2-title" }, [
        text("Choose Your Roof Package")
      ]);

      const sub = el("div", { class: "rw-note" }, [
        text(
          `Based on your estimated roof size (${sqLabel}). Final price confirmed on inspection.`
        )
      ]);

      const grid = el("div", { class: "rw-tier-grid" });

      TIERS.forEach(tier => {
        const estTotal = sq ? Math.round(sq * tier.price_per_sq) : null;

        const cardTier = el("div", {
          class: "rw-tier" + (tier.key === "premium" ? " featured" : "")
        });

        const top = el("div", { class: "rw-tier-top" }, [
          el("div", { class: "rw-tier-name" }, [text(tier.name)]),
          el(
            "div",
            { class: "rw-tier-badge" },
            [text(tier.key === "premium" ? "Most Popular" : "")]
          )
        ]);

        const product = el("div", { class: "rw-tier-product" }, [
          text(tier.product)
        ]);

        const priceLine = el("div", {}, [
          el("div", { class: "rw-tier-price" }, [
            text(estTotal ? `$${estTotal.toLocaleString()}` : "Contact for price")
          ]),
          el("div", { class: "rw-tier-per" }, [
            text(`$${tier.price_per_sq}/sq`)
          ])
        ]);

        const ul = el(
          "ul",
          { class: "rw-tier-bullets" },
          tier.bullets.map(b => el("li", {}, [text(b)]))
        );

        const selectBtn = el("button", { class: "rw-tier-select" }, [
          text(`Select ${tier.name}`)
        ]);

        selectBtn.onclick = async () => {
          selectBtn.disabled = true;
          selectBtn.textContent = "Saving…";

          const finalPayload = {
            ...lastLeadPayload,
            selected_package: tier.name,
            selected_product: tier.product,
            price_per_sq: tier.price_per_sq,
            estimated_package_price: estTotal || 0
          };

          try {
            await sendLead(finalPayload);
          } catch (e) {
            selectBtn.disabled = false;
            selectBtn.textContent = `Select ${tier.name}`;
            return;
          }

          step2Box.innerHTML = "";
          step2Box.append(
            el("div", { class: "rw-success", style: "display:block;" }, [
              text(
                `✅ Great choice! We recorded your ${tier.name} package and will confirm details during inspection.`
              )
            ])
          );
        };

        cardTier.append(top, product, priceLine, ul, selectBtn);
        grid.append(cardTier);
      });

      const unsureBtn = el(
        "button",
        {
          class: "rw-tier-select",
          style: "margin-top:10px;background:#14141a;"
        },
        [text("Not sure yet?")]
      );

      unsureBtn.onclick = async () => {
        unsureBtn.disabled = true;
        unsureBtn.textContent = "Saving…";

        const finalPayload = {
          ...lastLeadPayload,
          selected_package: "Not sure yet",
          selected_product: "",
          price_per_sq: 0,
          estimated_package_price: 0
        };

        try {
          await sendLead(finalPayload);
        } catch (e) {
          unsureBtn.disabled = false;
          unsureBtn.textContent = "Not sure yet?";
          return;
        }

        step2Box.innerHTML = "";
        step2Box.append(
          el("div", { class: "rw-success", style: "display:block;" }, [
            text("✅ No problem. We’ll help you choose during inspection.")
          ])
        );
      };

      const helper = el("div", { class: "rw-helper" }, [
        text("Unsure? Most homeowners pick Premium for best value.")
      ]);

      step2Box.append(title, sub, grid, unsureBtn, helper);
    }

    card.append(
      header,
      addrTitle,
      input,
      suggBox,
      note,
      mapWrap,
      btn,
      status,
      estimateBox,
      formBox,
      step2Box
    );
    root.appendChild(card);
  }

  window.RoofWidget = { init };
})();
