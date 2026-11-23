(function (global) {
  const feedbackSvgs = {
    success: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="m8 12 2.5 2.5L16.5 9"></path></svg>',
    error: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v5"></path><path d="M12 16.5h.01"></path></svg>',
    info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 11v5"></path><path d="M12 8h.01"></path></svg>'
  };
  const feedbackTitles = { success: "All set", error: "Please check this", info: "NESTORA update" };

  global.renderSiteMessage = function (target, message, kind) {
    if (!target) return;
    const text = String(message || "");
    const type = ["success", "error", "info"].includes(kind) ? kind : "success";
    target.hidden = !text;
    target.className = "site-feedback site-feedback--" + type;
    target.setAttribute("role", type === "error" ? "alert" : "status");
    target.setAttribute("aria-live", type === "error" ? "assertive" : "polite");
    if (!text) { target.replaceChildren(); return; }
    const icon = document.createElement("span");
    icon.className = "site-feedback-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = feedbackSvgs[type];
    const copy = document.createElement("span");
    copy.className = "site-feedback-copy";
    copy.textContent = text;
    target.replaceChildren(icon, copy);
  };

  global.showSiteToast = function (message, kind) {
    const text = String(message || "");
    if (!text) return;
    const type = ["success", "error", "info"].includes(kind) ? kind : "info";
    let region = document.getElementById("siteToastRegion");
    if (!region) {
      region = document.createElement("div");
      region.id = "siteToastRegion";
      region.className = "site-toast-region";
      region.setAttribute("aria-label", "Notifications");
      document.body.append(region);
    }
    while (region.children.length >= 4) region.firstElementChild.remove();
    const toast = document.createElement("section");
    toast.className = "site-toast site-toast--" + type;
    toast.setAttribute("role", type === "error" ? "alert" : "status");
    toast.setAttribute("aria-live", type === "error" ? "assertive" : "polite");
    const icon = document.createElement("span");
    icon.className = "site-toast-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = feedbackSvgs[type];
    const copy = document.createElement("div");
    copy.className = "site-toast-copy";
    const title = document.createElement("strong");
    title.textContent = feedbackTitles[type];
    const body = document.createElement("p");
    body.textContent = text;
    copy.append(title, body);
    const close = document.createElement("button");
    close.className = "site-toast-close";
    close.type = "button";
    close.setAttribute("aria-label", "Dismiss notification");
    close.textContent = "×";
    toast.append(icon, copy, close);
    region.append(toast);
    const remove = () => {
      toast.classList.add("site-toast--leaving");
      window.setTimeout(() => toast.remove(), 220);
    };
    close.addEventListener("click", remove);
    window.setTimeout(remove, type === "error" ? 8500 : 6000);
  };

  global.bindImagePicker = function (input) {
    if (!input || input.dataset.imagePickerReady) return;
    const label = input.closest("label");
    if (!label) return;
    input.dataset.imagePickerReady = "true";
    let preview = label.querySelector("[data-image-preview]");
    if (!preview) {
      preview = document.createElement("div");
      preview.className = "image-preview-grid";
      preview.dataset.imagePreview = "";
      preview.hidden = true;
      label.append(preview);
    }
    let feedback = label.querySelector("[data-image-feedback]");
    if (!feedback) {
      feedback = document.createElement("div");
      feedback.className = "site-feedback image-upload-feedback";
      feedback.dataset.imageFeedback = "";
      feedback.hidden = true;
      label.append(feedback);
    }
    let objectUrls = [];
    input.addEventListener("change", function () {
      objectUrls.forEach(url => URL.revokeObjectURL(url));
      objectUrls = [];
      const files = Array.from(input.files || []);
      const invalidCount = files.length > 6;
      const oversized = files.some(file => file.size > 5 * 1024 * 1024);
      const wrongType = files.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name));
      const error = invalidCount ? "Choose up to 6 photos." : oversized ? "Each photo must be 5 MB or smaller." : wrongType ? "Use JPG, PNG, or WebP photos." : "";
      input.setCustomValidity(error);
      preview.replaceChildren();
      if (error) {
        preview.hidden = true;
        global.renderSiteMessage(feedback, error, "error");
        return;
      }
      if (!files.length) {
        preview.hidden = true;
        global.renderSiteMessage(feedback, "", "info");
        return;
      }
      files.forEach(file => {
        const card = document.createElement("figure");
        card.className = "image-preview-card";
        const image = document.createElement("img");
        image.alt = file.name;
        const url = URL.createObjectURL(file);
        objectUrls.push(url);
        image.src = url;
        const caption = document.createElement("figcaption");
        caption.textContent = file.name + " · " + (file.size / (1024 * 1024)).toFixed(1) + " MB";
        card.append(image, caption);
        preview.append(card);
      });
      preview.hidden = false;
      global.renderSiteMessage(feedback, files.length + (files.length === 1 ? " photo is" : " photos are") + " ready. Submit the listing to upload.", "success");
    });
  };
  async function request(path, options = {}) {
    const method = (options.method || "GET").toUpperCase();
    const headers = new Headers(options.headers || {});
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      const csrfResponse = await fetch("/api/auth/csrf", { credentials: "same-origin" });
      const csrfData = await csrfResponse.json().catch(() => ({}));
      if (!csrfResponse.ok) throw new Error(csrfData.message || "Could not initialize request protection");
      headers.set("X-CSRF-Token", csrfData.csrfToken);
    }
    if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
    const response = await fetch(path, { ...options, method, headers, credentials: "same-origin" });
    const data = response.status === 204 ? {} : await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Request failed (" + response.status + ")");
    return data;
  }

  const json = (method, body) => ({ method, body: JSON.stringify(body) });
  const query = (path, params) => {
    const value = new URLSearchParams(params || {}).toString();
    return path + (value ? "?" + value : "");
  };

  global.NestoraAPI = {
    request,
    auth: {
      register: body => request("/api/auth/register", json("POST", body)),
      login: body => request("/api/auth/login", json("POST", body)),
      logout: () => request("/api/auth/logout", json("POST", {})),
      me: () => request("/api/auth/me"),
      verifyEmail: body => request("/api/auth/verify-email", json("POST", body)),
      profile: body => request("/api/auth/profile", json("PATCH", body)),
      changePassword: body => request("/api/auth/change-password", json("POST", body)),
      forgot: body => request("/api/auth/forgot-password", json("POST", body)),
      reset: body => request("/api/auth/reset-password", json("POST", body))
    },
    properties: {
      list: params => request(query("/api/properties", params)),
      get: id => request("/api/properties/" + encodeURIComponent(id)),
      mine: params => request(query("/api/broker/properties", params)),
      create: body => request("/api/broker/properties", json("POST", body)),
      update: (id, body) => request("/api/broker/properties/" + encodeURIComponent(id), json("PATCH", body)),
      remove: id => request("/api/broker/properties/" + encodeURIComponent(id), { method: "DELETE" }),
      upload: (id, files) => {
        const form = new FormData();
        Array.from(files).forEach(file => form.append("images", file));
        return request("/api/broker/properties/" + encodeURIComponent(id) + "/images", { method: "POST", body: form });
      }
    },
    favorites: {
      list: params => request(query("/api/favorites", params)),
      add: id => request("/api/favorites/" + encodeURIComponent(id), json("POST", {})),
      remove: id => request("/api/favorites/" + encodeURIComponent(id), { method: "DELETE" })
    },
    enquiries: {
      list: params => request(query("/api/inquiries/mine", params)),
      create: body => request("/api/inquiries", json("POST", body)),
      status: (id, status) => request("/api/inquiries/" + encodeURIComponent(id) + "/status", json("PATCH", { status }))
    },
    visits: {
      list: params => request(query("/api/visits/mine", params)),
      create: body => request("/api/visits", json("POST", body)),
      update: (id, body) => request("/api/visits/" + encodeURIComponent(id), json("PATCH", body))
    },
    broker: {
      profile: () => request("/api/broker/profile"),
      save: body => request("/api/broker/profile", json("PUT", body)),
      stats: () => request("/api/broker/statistics")
    },
    admin: {
      dashboard: () => request("/api/admin/dashboard"),
      users: params => request(query("/api/admin/users", params)),
      userDetail: id => request("/api/admin/users/" + encodeURIComponent(id)),
      user: (id, body) => request("/api/admin/users/" + encodeURIComponent(id), json("PATCH", body)),
      brokers: params => request(query("/api/admin/brokers", params)),
      verify: (id, body) => request("/api/admin/brokers/" + encodeURIComponent(id) + "/verification", json("PATCH", body)),
      properties: params => request(query("/api/admin/properties", params)),
      moderate: (id, body) => request("/api/admin/properties/" + encodeURIComponent(id) + "/status", json("PATCH", body)),
      enquiries: params => request(query("/api/admin/inquiries", params)),
      visits: params => request(query("/api/admin/visits", params)),
      audit: params => request(query("/api/admin/audit-logs", params)),
      contacts: params => request(query("/api/admin/contact-messages", params)),
      updateContact: (id, status) => request("/api/admin/contact-messages/" + encodeURIComponent(id), json("PATCH", { status }))
    }
  };
})(window);
