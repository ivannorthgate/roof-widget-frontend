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

  async function addressSuggest(q) {
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

    const nUrl =
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8&q=${encodeURIComponent(q)}`;

    const nr = await fetch(nUrl, {
      headers: { "User-Agent": "RoofWidget/1.0 (contact: youremail@yourdomain.com)" }
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
      headers: { "User-Agent": "RoofWidget/1.0 (contact: youremail@yourdomain.com)" }
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
        "width:100%;padding:12px;font-size:16px;border:1px solid #ccc;border-radius:8px;",
      required: "true"
    });

    const suggBox = el("div", {
      style:
        "border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px;"
    });

    // ✅ SATELLITE PREVIEW BOX
    const mapWrap = el("div", {
      style:
        "margin-top:10px;border:1px solid #ddd;border-radius:8px;overflow:hidden;display:none;"
    });
    const mapDiv = el("div", {
      id: `${containerId}-map`,
      style: "height:260px;width:100%;"
    });
    mapWrap.appendChild(mapDiv);

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
    let lastAddressDetails = null;

    // Leaflet map state
    let map = null;
    let marker = null;
    function ensureMap(lat, lng) {
      if (!window.L) {
        console.warn("Leaflet not loaded on page.");
        return;
      }

      mapWrap.style.display = "block";

      if (!map) {
        map = L.map(mapDiv).setView([lat, lng], 19);

        // Esri World Imagery (satellite-like)
        L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          {
            maxZoom: 20,
            attribution: "Tiles © Esri"
          }
        ).addTo(map);
      } else {
        map.setView([lat, lng], 19);
      }

      if (marker) marker.remove();
      marker = L.marker([lat, lng]).addTo(map);
    }

    let debounceTimer = null;
    let suggestSeq = 0;

    input.addEventListener("input", () => {
      const q = input.value.trim();
      suggBox.innerHTML = "";
      selected = null;
      lastAddressDetails = null;
      status.textContent = "";

      if (debounceTimer) clearTimeout(debounceTimer);

      debounceTimer = setTimeout(async () => {
        const mySeq = ++suggestSeq;
        if (q.length < 3) return;

        try {
          const suggestions = await addressSuggest(q);
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
              lastAddressDetails = {
                street: s.street || "",
                city: s.city || "",
                state: s.state || "",
                postal_code: s.postal_code || "",
                country: s.country || "US"
              };
              input.value = s.label;
              suggBox.innerHTML = "";

              // ✅ show satellite image instantly
              ensureMap(s.lat, s.lng);
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

      const typed = input.value.trim();
      if (!typed) {
        status.textContent = "Please type an address.";
        return;
      }

      if (!selected) {
        selected = { label: typed, lat: null, lng: null };
      }

      status.textContent = "Measuring roof...";

      // Resolve address parts for manual entries
      if (!lastAddressDetails || !lastAddressDetails.street) {
        lastAddressDetails = await resolveAddressDetails(typed);
        if (lastAddressDetails?.lat && lastAddressDetails?.lng) {
          ensureMap(lastAddressDetails.lat, lastAddressDetails.lng);
        }
      }

      let data;
      try {
        data = await measureRoof(selected.lat, selected.lng, typed);
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

    function showLeadForm(squares, pitchClass) {
      formBox.style.display = "block";
      formBox.innerHTML = "";

      const errorBox = el("div", {
        style: "color:#b00020;font-size:14px;margin:6px 0;display:none;"
      });

      const firstName = el("input", {
        placeholder: "First Name *",
        required: "true",
        style:"width:100%;padding:10px;margin:6px 0;border:1px solid #ccc;border-radius:6px;"
      });

      const lastName = el("input", {
        placeholder: "Last Name *",
        required: "true",
        style:"width:100%;padding:10px;margin:6px 0;border:1px solid #ccc;border-radius:6px;"
      });

      const phone = el("input", {
        placeholder: "Phone *",
        required: "true",
        style:"width:100%;padding:10px;margin:6px 0;border:1px solid #ccc;border-radius:6px;"
      });

      const email = el("input", {
        placeholder: "Email *",
        required: "true",
        style:"width:100%;padding:10px;margin:6px 0;border:1px solid #ccc;border-radius:6px;"
      });

      const street = el("input", {
        placeholder: "Street Address *",
        required: "true",
        value: lastAddressDetails?.street || "",
        style:"width:100%;padding:10px;margin:6px 0;border:1px solid #ccc;border-radius:6px;"
      });

      const city = el("input", {
        placeholder: "City *",
        required: "true",
        value: lastAddressDetails?.city || "",
        style:"width:100%;padding:10px;margin:6px 0;border:1px solid #ccc;border-radius:6px;"
      });

      const state = el("input", {
        placeholder: "State *",
        required: "true",
        value: lastAddressDetails?.state || "",
        style:"width:100%;padding:10px;margin:6px 0;border:1px solid #ccc;border-radius:6px;"
      });

      const postal = el("input", {
        placeholder: "Postal Code *",
        required: "true",
        value: lastAddressDetails?.postal_code || "",
        style:"width:100%;padding:10px;margin:6px 0;border:1px solid #ccc;border-radius:6px;"
      });

      const submit = el(
        "button",
        {
          style:
            "width:100%;padding:12px;margin-top:8px;background:green;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer;"
        },
        [text("Get My Exact Quote")]
      );

      function showError(msg) {
        errorBox.textContent = msg;
        errorBox.style.display = "block";
      }
      function hideError() {
        errorBox.style.display = "none";
      }

      submit.onclick = async () => {
        hideError();

        if (!firstName.value.trim()) return showError("First Name is required.");
        if (!lastName.value.trim()) return showError("Last Name is required.");
        if (!phone.value.trim()) return showError("Phone is required.");
        if (!email.value.trim()) return showError("Email is required.");
        if (!street.value.trim()) return showError("Street Address is required.");
        if (!city.value.trim()) return showError("City is required.");
        if (!state.value.trim()) return showError("State is required.");
        if (!postal.value.trim()) return showError("Postal Code is required.");

        submit.disabled = true;
        submit.textContent = "Sending...";

        const fullName = `${firstName.value} ${lastName.value}`.trim();

        try {
          await sendLead({
            first_name: firstName.value.trim(),
            last_name: lastName.value.trim(),
            name: fullName,
            phone: phone.value.trim(),
            email: email.value.trim(),
            address: input.value.trim(),

            street: street.value.trim(),
            city: city.value.trim(),
            state: state.value.trim(),
            postal_code: postal.value.trim(),
            country: lastAddressDetails?.country || "US",

            squares: parseFloat(squares) || 0,
            pitch_class: pitchClass
          });

          submit.textContent = "Sent! We'll contact you shortly.";
        } catch (e) {
          console.error(e);
          submit.disabled = false;
          submit.textContent = "Send Failed — Try Again";
          showError("Send failed. Please try again.");
        }
      };

      formBox.append(
        errorBox,
        firstName, lastName,
        phone, email,
        street, city, state, postal,
        submit
      );
    }

    root.append(title, input, suggBox, mapWrap, btn, status, resultBox, formBox);
  }

  window.RoofWidget = { init };
})();
