(function () {
  const API_BASE = "https://roof-widget-backend.onrender.com"; // <-- change this
  const GHL_WEBHOOK = "https://services.leadconnectorhq.com/hooks/w06FI2oCDolhpxHVnjJn/webhook-trigger/24c72f4d-dbca-4326-a3ab-30c6e4486541"; // <-- change this

  function el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    children.forEach(c => e.appendChild(c));
    return e;
  }

  function text(t) {
    return document.createTextNode(t);
  }

  async function photonSuggest(q) {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5`;
    const r = await fetch(url);
    const d = await r.json();
    return d.features.map(f => ({
      label: f.properties.name + " " + (f.properties.city || "") + " " + (f.properties.state || ""),
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0]
    }));
  }

  async function measureRoof(lat, lng, address) {
    const r = await fetch(`${API_BASE}/measure-roof`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({lat, lng, address})
    });
    return r.json();
  }

  async function sendLead(data) {
    const r = await fetch(`${API_BASE}/create-lead`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({...data, ghl_webhook_url: GHL_WEBHOOK})
    });
    return r.json();
  }

  function init(containerId = "roof-widget") {
    const root = document.getElementById(containerId);
    root.innerHTML = "";
    root.style.fontFamily = "Arial, sans-serif";
    root.style.maxWidth = "520px";

    const title = el("h3", {}, [text("Instant Roof Estimate")]);

    const input = el("input", {
      type: "text",
      placeholder: "Type your address...",
      style: "width:100%;padding:12px;font-size:16px;border:1px solid #ccc;border-radius:8px;"
    });

    const suggBox = el("div", {style: "border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px;"});

    const status = el("div", {style: "margin-top:10px;color:#555;"});

    const resultBox = el("div", {
      style: "margin-top:12px;padding:12px;border:1px solid #ddd;border-radius:8px;display:none;"
    });

    const formBox = el("div", {style: "margin-top:12px;display:none;"});

    let selected = null;
    let lastEstimate = null;

    input.addEventListener("input", async () => {
      const q = input.value.trim();
      suggBox.innerHTML = "";
      selected = null;
      if (q.length < 3) return;

      const suggestions = await photonSuggest(q);
      suggestions.forEach(s => {
        const item = el("div", {
          style: "padding:10px;cursor:pointer;border-bottom:1px solid #f3f3f3;"
        }, [text(s.label)]);
        item.onclick = () => {
          selected = s;
          input.value = s.label;
          suggBox.innerHTML = "";
        };
        suggBox.appendChild(item);
      });
    });

    const btn = el("button", {
      style: "margin-top:10px;width:100%;padding:12px;font-size:16px;background:#111;color:#fff;border:none;border-radius:8px;cursor:pointer;"
    }, [text("Measure My Roof")]);

    btn.onclick = async () => {
      if (!selected) {
        status.textContent = "Please select an address from the list.";
        return;
      }
      status.textContent = "Measuring roof...";

      const data = await measureRoof(selected.lat, selected.lng, input.value);

      if (data.error === "no_footprint") {
        status.textContent = "We couldn't auto-measure this roof. We'll confirm during inspection.";
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

    function showLeadForm(squares, pitchClass) {
      formBox.style.display = "block";
      formBox.innerHTML = "";

      const name = el("input", {placeholder:"Name", style:"width:100%;padding:10px;margin:6px 0;border:1px solid #ccc;border-radius:6px;"});
      const phone = el("input", {placeholder:"Phone", style:"width:100%;padding:10px;margin:6px 0;border:1px solid #ccc;border-radius:6px;"});
      const email = el("input", {placeholder:"Email", style:"width:100%;padding:10px;margin:6px 0;border:1px solid #ccc;border-radius:6px;"});

      const submit = el("button", {
        style:"width:100%;padding:12px;margin-top:8px;background:green;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer;"
      }, [text("Get My Exact Quote")]);

      submit.onclick = async () => {
        submit.disabled = true;
        submit.textContent = "Sending...";
        await sendLead({
          name: name.value,
          phone: phone.value,
          email: email.value,
          address: input.value,
          squares: squares,
          pitch_class: pitchClass
        });
        submit.textContent = "Sent! We'll contact you shortly.";
      };

      formBox.append(name, phone, email, submit);
    }

    root.append(title, input, suggBox, btn, status, resultBox, formBox);
  }

  window.RoofWidget = { init };
})();
