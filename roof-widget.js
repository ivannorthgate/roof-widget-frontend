(function () {
  // ========= EDIT THESE 2 LINES =========
  const API_BASE = "https://roof-widget-backend.onrender.com";
  const GHL_WEBHOOK = "https://services.leadconnectorhq.com/hooks/w06FI2oCDolhpxHVnjJn/webhook-trigger/24c72f4d-dbca-4326-a3ab-30c6e4486541";
  // =====================================

  function el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    children.forEach(c => e.appendChild(c));
    return e;
  }
  function text(t) { return document.createTextNode(t); }

  // ---------- Autocomplete helpers ----------
  async function addressSuggest(q) {
    // 1) Photon first (fast)
    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8`;
      const r = await fetch(url);
      const d = await r.json();

      const photonResults = (d.features || []).map(f => {
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
      }).filter(x => x.label.length > 3);

      if (photonResults.length) return photonResults;
    } catch (e) {
      console.warn("Photon failed, trying Nominatim...");
    }

    // 2) Nominatim fallback (better coverage, still free)
    const nUrl =
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8&q=${encodeURIComponent(q)}`;

    const nr = await fetch(nUrl, {
      headers: {
        "User-Agent": "RoofWidget/1.0 (contact: youremail@yourdomain.com)"
      }
    });
    const nd = await nr.json();

    return (nd || []).map(x => {
      const a = x.address || {};
      const house = a.house_number || "";
      const road = a.road || a.neighbourhood || "";
      const city = a.city || a.town || a.village || a.county || "";
      const state = a.state || "";
      const postcode = a.postcode || "";
      const country = a.country_code ? a.country_code.toUpperCase() : "US";

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
  }

  async function resolveAddressDetails(addressText) {
    const nUrl =
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${encodeURIComponent(addressText)}`;

    const nr = await fetch(nUrl, {
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

  // ---------- API calls ----------
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

  // ---------- Widget ----------
  function init(containerId = "roof-widget") {
    const root = document.getElementById(containerId);
    if (!root) return;

    root.innerHTML = "";
    root.style.fontFamily = "Arial, sans-serif";
    root.style.maxWidth = "520px";

    const title = el("h3", {}, [text("Instant Roof Estimate")]);

    const input = el("input", {
      type: "text",
      placeholder: "Type your address...",
      style:
        "width:100%;padding:12px;font-size:16px;border:1px solid #ccc;border-radius:8px;"
    });

    const suggBox = el("div", {
      style:
        "border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px;"
    });

    const status = el("div", {
      style: "margin-top:10px;color:#555;font-size:14px;"
    });

    const resultBox = el("div", {
      style:
        "margin-top:12px;padding:12px;border:1px solid #ddd;border-radius:8px;display:none;"
    });

    const formBox = el("div", {
      style: "margin-top:12px;display:none;"
    });

    let selected = null;
    let lastEstimate = null;

    // ✅ Debounce + “latest request only” guard
    let debounceTimer = null;
    let suggestSeq = 0;

    input.addEventListener("input", () => {
      const q = input.value.trim();

      // reset
      suggBox.innerHTML = "";
      selected = null;
      status.textContent = "";

      if (debounceTimer) clearTimeout(debounceTimer);

      debounceTimer = setTimeout(async () => {
        const mySeq = ++suggestSeq;

        if (q.length < 3) return;

        try {
          const suggestions = await addressSuggest(q);

          // If another request started after this one, ignore this result
          if (mySeq !== suggestSeq) return;

          suggBox.innerHTML = "";

          if (!suggestions.length) {
            const noRes = el(
              "div",
              { style: "padding:10px;color:#888;font-size:14px;" },
              [text("No suggestions found. You can still click “Measure My Roof.”")]
            );
            suggBox.appendChild(noRes);
            return;
          }

          suggestions.forEach(s => {
            const item = el(
              "div",
              {
                style:
                  "padding:10px;cursor:pointer;border-bottom:1px solid #f3f3f3;"
              },
              [text(s.label)]
            );

            item.onclick = () => {
              selected = s;
              input.value = s.label;
              suggBox.innerHTML = "";
            };

            suggBox.appendChild(item);
          });
        } catch (e) {
          if (mySeq !== suggestSeq) return;
          console.error(e);
          suggBox.innerHTML = "";
          const noRes = el(
            "div",
            { style: "padding:10px;color:#888;font-size:14px;" },
            [text("No suggestions found. You can still click “Measure My Roof.”")]
          );
          suggBox.appendChild(noRes);
        }
      }, 300);
    });

    const btn = el(
      "button",
      {
        style:
          "margin-top:10px;width:100%;padding:12px;font-size:16px;background:#111;color:#fff;border:none;border-radius:8px;cursor:pointer;"
      },
      [text("Measure My Roof")]
    );

    btn.onclick = async () => {
      resultBox.style.display = "none";
      formBox.style.display = "none";

      if (!selected) {
        const typed = input.value.trim();
        if (!typed) {
          status.textContent = "Please type an address.";
          return;
        }
        selected = { label: typed, lat: null, lng: null };
      }

      status.textContent = "Measuring roof...";

      let data;
      try {
        data = await measureRoof(selected.lat, selected.lng, input.value);
      } catch (e) {
        console.error(e);
        status.textContent =
          "Could not contact measurement server. Please try again.";
        return;
      }

      if (data.error === "no_footprint") {
        status.textContent =
          "We couldn't auto-measure this roof. We'll confirm during inspection.";
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

      resultBox.style.display = "block";
      resultBox.innerHTML = `
        <div><b>Estimated Roof Size:</b> ~${data.squares} squares</div>
        <div><b>Estimated Pitch:</b> ${data.pitch_class}</div>
        <div style="margin-top:8px;font-size:13px;color:#666;">
          Final measurements confirmed during on-site inspection.
        </div>
      `;

      showLeadForm(data.squares, data.pitch_class);
    };

    async function showLeadForm(squares, pitchClass) {
      formBox.style.display = "block";
      formBox.innerHTML = "";

      const firstName = el("input", {
        placeholder: "First Name",
        style:
          "width:100%;padding:10px;margin:6px 0;border:1px solid #ccc;border-radius:6px;"
      });

      const lastName = el("input", {
        placeholder: "Last Name",
        style:
          "width:100%;padding:10px;margin:6px 0;border:1px solid #ccc;border-radius:6px;"
      });

      const phone = el("input", {
        placeholder: "Phone",
        style:
          "width:100%;padding:10px;margin:6px 0;border:1px solid #ccc;border-radius:6px;"
      });

      const email = el("input", {
        placeholder: "Email",
        style:
          "width:100%;padding:10px;margin:6px 0;border:1px solid #ccc;border-radius:6px;"
      });

      const submit = el(
        "button",
        {
          style:
            "width:100%;padding:12px;margin-top:8px;background:green;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer;"
        },
        [text("Get My Exact Quote")]
      );

      submit.onclick = async () => {
        submit.disabled = true;
        submit.textContent = "Sending...";

        const fullName = `${firstName.value} ${lastName.value}`.trim();

        let details = null;
        if (selected && selected.street) {
          details = {
            street: selected.street,
            city: selected.city,
            state: selected.state,
            postal_code: selected.postal_code,
            country: selected.country
          };
        } else {
          details = await resolveAddressDetails(input.value);
        }

        try {
          await sendLead({
            first_name: firstName.value.trim(),
            last_name: lastName.value.trim(),
            name: fullName,
            phone: phone.value.trim(),
            email: email.value.trim(),
            address: input.value,

            street: details?.street || "",
            city: details?.city || "",
            state: details?.state || "",
            postal_code: details?.postal_code || "",
            country: details?.country || "US",

            squares: parseFloat(squares) || 0,
            pitch_class: pitchClass
          });

          submit.textContent = "Sent! We'll contact you shortly.";
        } catch (e) {
          console.error(e);
          submit.disabled = false;
          submit.textContent = "Send Failed — Try Again";
        }
      };

      formBox.append(firstName, lastName, phone, email, submit);
    }

    root.append(title, input, suggBox, btn, status, resultBox, formBox);
  }

  window.RoofWidget = { init };
})();
