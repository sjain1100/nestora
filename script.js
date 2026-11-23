document.addEventListener("error", event => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || image.dataset.nestoraFallback === "true") return;
    image.dataset.nestoraFallback = "true";
    image.src = "/assets/property-fallback.svg";
}, true);

async function apiRequest(url, options = {}) {
    if (!window.NestoraAPI) throw new Error("The NESTORA API client is unavailable");
    return window.NestoraAPI.request(url, options);
}

function toggleMenu() {
    const menu = document.getElementById("mobileMenu") || document.getElementById("navLinks");
    menu?.classList.toggle("open");
}

function setFavoriteAppearance(button, liked) {
    button.classList.toggle("liked", liked);
    const icon = button.querySelector("i");
    if (icon) {
        icon.classList.toggle("fa-solid", liked);
        icon.classList.toggle("fa-regular", !liked);
    }
}

async function toggleFavorite(button) {
    const propertyId = button.dataset.propertyId;
    if (propertyId) {
        try {
            const liked = button.classList.contains("liked");
            await apiRequest(`/api/favorites/${encodeURIComponent(propertyId)}`, { method: liked ? "DELETE" : "POST" });
            setFavoriteAppearance(button, !liked);
        } catch (error) {
            window.showSiteToast(error.message, "error");
        }
        return;
    }
    setFavoriteAppearance(button, !button.classList.contains("liked"));
}

function formatPrice(value) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function makePropertyCard(property, home = false) {
    const card = makeElement(home ? "div" : "article", home ? "property-card" : "listing-card");
    const imageBox = makeElement("div", home ? "property-image" : "listing-image");
    const image = makeElement("img");
    image.src = property.mainImage || property.image || "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=80";
    image.alt = property.title;
    image.loading = "lazy";
    imageBox.append(image);
    if (property.demoListing) imageBox.append(makeElement("span", (home ? "property-tag" : "listing-tag") + " demo-listing-badge", "SAMPLE LISTING"));
    else if (property.featured) imageBox.append(makeElement("span", home ? "property-tag" : "listing-tag", "FEATURED"));
    const heart = makeElement("button", "heart-btn");
    heart.type = "button";
    heart.dataset.propertyId = property.id || property._id;
    heart.setAttribute("aria-label", "Toggle favorite");
    heart.append(makeElement("i", "fa-regular fa-heart"));
    heart.addEventListener("click", () => toggleFavorite(heart));
    imageBox.append(heart);
    const info = makeElement("div", home ? "property-info" : "listing-info");
    info.append(makeElement("p", home ? "property-location" : "listing-location", `${property.city}, ${property.state}`));
    info.append(makeElement("h3", "", property.title));
    info.append(makeElement("p", home ? "property-details" : "listing-specs",
        `${property.bedrooms} Beds • ${property.bathrooms} Baths • ${Number(property.areaSqFt || property.area || 0).toLocaleString("en-IN")} sq.ft`));
    const bottom = makeElement("div", home ? "property-bottom" : "listing-bottom");
    bottom.append(makeElement("strong", "", formatPrice(property.price)));
    const details = makeElement("a", "", home ? "View Details →" : "Details →");
    details.href = `property-details.html?id=${encodeURIComponent(property.id || property._id)}`;
    bottom.append(details);
    info.append(bottom);
    card.append(imageBox, info);
    return card;
}

function renderPropertyGrid(grid, items, home) {
    grid.replaceChildren();
    if (!items.length) {
        const empty = makeElement("p", "empty-state", "No approved properties are available yet. Please check back soon.");
        grid.append(empty);
        return;
    }
    items.forEach(item => grid.append(makePropertyCard(item, home)));
}

function propertySearchMessage(title, message, actionLabel, action, isError = false) {
    const panel = makeElement("div", `property-result-state${isError ? " property-result-state--error" : ""}`);
    const icon = makeElement("div", "property-result-icon");
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = isError ? '<i class="fa-solid fa-triangle-exclamation"></i>' : '<i class="fa-solid fa-house-circle-check"></i>';
    const copy = makeElement("div", "property-result-copy");
    copy.append(makeElement("h3", "", title), makeElement("p", "", message));
    panel.append(icon, copy);
    if (actionLabel && action) {
        const button = makeElement("button", "property-result-action", actionLabel);
        button.type = "button";
        button.addEventListener("click", action);
        panel.append(button);
    }
    return panel;
}

async function loadProperties(params = new URLSearchParams(), options = {}) {
    const grid = document.getElementById("propertiesGrid");
    if (!grid) return;
    const count = document.getElementById("propertyCount");
    const query = new URLSearchParams(params);
    if (!query.has("limit")) query.set("limit", "50");
    grid.setAttribute("aria-busy", "true");
    grid.replaceChildren(makeElement("div", "property-loading-state", "Finding homes that fit your search…"));
    if (count) count.textContent = "Searching properties…";
    try {
        const data = await apiRequest(`/api/properties?${query.toString()}`);
        const items = Array.isArray(data.items) ? data.items : [];
        grid.classList.toggle("properties-grid--single", items.length === 1);
        if (items.length) renderPropertyGrid(grid, items, false);
        else {
            const hasFilters = ["city", "location", "propertyType", "minPrice", "maxPrice", "search"].some(key => query.has(key));
            grid.replaceChildren(propertySearchMessage(
                hasFilters ? "No properties match these filters" : "No properties published yet",
                hasFilters
                    ? "Try another city, property type, or price range. You can adjust the filters above."
                    : "Approved listings will appear here after a seller or broker submits a property and it passes review.",
                hasFilters ? "Clear filters" : "Create an account",
                hasFilters
                    ? () => {
                        ["filterLocation", "filterType", "filterPrice"].forEach(id => {
                            const control = document.getElementById(id);
                            if (control) control.value = "all";
                        });
                        filterProperties();
                    }
                    : () => { window.location.href = "register.html"; }
            ));
        }
        const total = Number(data.pagination?.total ?? items.length);
        if (count) count.textContent = total === 1 ? "1 property found" : `${total} properties found`;
        if (options.scrollToResults) {
            document.getElementById("propertiesResults")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    } catch (error) {
        grid.replaceChildren(propertySearchMessage(
            "We couldn't load the listings",
            `${error.message || "The property service is temporarily unavailable."} Check the connection and try again.`,
            "Try again",
            () => loadProperties(params, options),
            true
        ));
        if (count) count.textContent = "Listings temporarily unavailable";
        if (options.scrollToResults) {
            document.getElementById("propertiesResults")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    } finally {
        grid.removeAttribute("aria-busy");
    }
}

function searchProperties() {
    const params = new URLSearchParams();
    const location = document.getElementById("location")?.value;
    const typeControl = document.getElementById("propertyType");
    const type = typeControl?.value;
    const budget = document.getElementById("budget")?.value;
    if (location) params.set("city", location);
    if (type) {
        const option = Array.from(typeControl.options).find(item => item.value.toLowerCase() === type.toLowerCase());
        params.set("propertyType", option?.textContent.trim() || type);
    }
    if (budget === "50") params.set("maxPrice", "5000000");
    if (budget === "100") { params.set("minPrice", "5000000"); params.set("maxPrice", "10000000"); }
    if (budget === "200") { params.set("minPrice", "10000000"); params.set("maxPrice", "20000000"); }
    if (budget === "500") params.set("minPrice", "20000000");
    window.location.href = `properties.html?${params.toString()}`;
}

function filterProperties() {
    const params = new URLSearchParams();
    const location = document.getElementById("filterLocation")?.value;
    const type = document.getElementById("filterType")?.value;
    const price = document.getElementById("filterPrice")?.value;
    if (location && location !== "all") params.set("city", location);
    if (type && type !== "all") params.set("propertyType", type);
    if (price === "under50") params.set("maxPrice", "5000000");
    if (price === "50to100") { params.set("minPrice", "5000000"); params.set("maxPrice", "10000000"); }
    if (price === "2") { params.set("minPrice", "10000000"); params.set("maxPrice", "20000000"); }
    if (price === "3") params.set("minPrice", "20000000");
    const nextUrl = new URL(window.location.href);
    nextUrl.search = params.toString();
    window.history.replaceState(null, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
    return loadProperties(params, { scrollToResults: true });
}

function applyQueryFilters() {
    const params = new URLSearchParams(window.location.search);
    const location = params.get("city") || params.get("location") || "";
    const type = params.get("propertyType") || "";
    const minPrice = params.get("minPrice");
    const maxPrice = params.get("maxPrice");
    const locationControl = document.getElementById("filterLocation");
    const typeControl = document.getElementById("filterType");
    const priceControl = document.getElementById("filterPrice");
    if (locationControl && location) locationControl.value = location.toLowerCase();
    if (typeControl && type) {
        const option = Array.from(typeControl.options).find(item => item.value.toLowerCase() === type.toLowerCase());
        if (option) {
            typeControl.value = option.value;
            params.set("propertyType", option.value);
        }
    }
    if (priceControl) {
        const min = Number(minPrice) || 0;
        const max = Number(maxPrice) || 0;
        if (!min && max === 5000000) priceControl.value = "under50";
        else if (min === 5000000 && max === 10000000) priceControl.value = "50to100";
        else if (min === 10000000 && max === 20000000) priceControl.value = "2";
        else if (min === 20000000 && !max) priceControl.value = "3";
    }
    const hasFilters = ["city", "location", "propertyType", "minPrice", "maxPrice", "search"].some(key => params.has(key));
    loadProperties(params, { scrollToResults: hasFilters });
}

function openVisitModal() {
    const modal = document.getElementById("visitModal");
    if (!new URLSearchParams(window.location.search).get("id")) {
        window.showSiteToast("Open a property from the approved listings to request a visit.", "info");
        return;
    }
    modal?.classList.add("active");
}

function closeVisitModal() {
    document.getElementById("visitModal")?.classList.remove("active");
}

async function submitVisit(event) {
    event.preventDefault();
    const form = event.target;
    const inputs = form.querySelectorAll("input");
    const property = new URLSearchParams(window.location.search).get("id");
    if (!property) return window.showSiteToast("Open a property from the approved listings to request a visit.", "info");
    try {
        await apiRequest("/api/visits", {
            method: "POST",
            body: JSON.stringify({
                customerName: inputs[0]?.value,
                email: inputs[1]?.value,
                phone: inputs[2]?.value,
                visitDate: form.elements.visitDate.value,
                visitTime: form.elements.visitTime.value,
                property
            })
        });
        window.showSiteToast("Visit request submitted. Sign in to view its status.", "success");
        closeVisitModal();
        form.reset();
    } catch (error) {
        window.showSiteToast(error.message, "error");
    }
}

async function submitContactForm(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const inputs = form.querySelectorAll("input");
    const button = form.querySelector('button[type="submit"]');
    let feedback = form.querySelector("#contactFormFeedback");
    if (!feedback) {
        feedback = document.createElement("p");
        feedback.id = "contactFormFeedback";
        feedback.className = "account-message";
        feedback.setAttribute("role", "status");
        feedback.setAttribute("aria-live", "polite");
        form.append(feedback);
    }
    window.renderSiteMessage(feedback, "", "success");
    
    if (button) button.disabled = true;
    try {
        const result = await apiRequest("/api/contact", {
            method: "POST",
            body: JSON.stringify({
                name: inputs[0]?.value,
                email: inputs[1]?.value,
                phone: inputs[2]?.value,
                inquiryType: form.querySelector("select")?.value,
                message: form.querySelector("textarea")?.value
            })
        });
        window.renderSiteMessage(feedback, result.message || "Your message has been received.", "success");
        form.reset();
    } catch (error) {
        window.renderSiteMessage(feedback, error.message, "error");
        
    } finally {
        if (button) button.disabled = false;
    }
}

function accountMessage(text, error = false) {
    const target = document.getElementById("accountMessage");
    window.renderSiteMessage(target, text, error ? "error" : "success");
}

function renderRows(container, items, columns) {
    container.replaceChildren();
    if (!items.length) {
        container.append(makeElement("p", "empty-state", "Nothing to show yet."));
        return;
    }
    const table = makeElement("table", "data-table");
    const head = makeElement("tr");
    columns.forEach(column => head.append(makeElement("th", "", column.label)));
    table.append(head);
    items.forEach(item => {
        const row = makeElement("tr");
        columns.forEach(column => {
            const cell = makeElement("td");
            if (column.render) cell.append(column.render(item));
            else cell.textContent = String(item[column.key] ?? "");
            row.append(cell);
        });
        table.append(row);
    });
    container.append(table);
}

function actionButton(label, action) {
    const button = makeElement("button", "account-action", label);
    button.type = "button";
    button.addEventListener("click", async () => {
        try { await action(); }
        catch (error) { accountMessage(error.message, true); }
    });
    return button;
}

function actionGroup(...buttons) {
    const group = makeElement("span");
    buttons.forEach(button => group.append(button));
    return group;
}

async function loadAccountLists(user) {
    const favoritesBox = document.getElementById("favoritesList");
    const inquiriesBox = document.getElementById("inquiriesList");
    const visitsBox = document.getElementById("visitsList");
    if (user.role === "buyer" && favoritesBox) {
        const data = await apiRequest("/api/favorites");
        renderRows(favoritesBox, data.items, [
            { key: "title", label: "Property" }, { key: "city", label: "City" },
            { key: "price", label: "Price", render: item => makeElement("span", "", formatPrice(item.price)) },
            { key: "id", label: "Action", render: item => actionButton("Remove", async () => {
                await apiRequest(`/api/favorites/${item.id}`, { method: "DELETE" });
                await loadAccountLists(user);
            }) }
        ]);
    }
    if (inquiriesBox) {
        const data = await apiRequest("/api/inquiries/mine");
        renderRows(inquiriesBox, data.items, [
            { key: "propertyTitle", label: "Property" }, { key: "inquiryType", label: "Type" },
            { key: "status", label: "Status" }, { key: "createdAt", label: "Submitted" },
            { key: "id", label: "Action", render: item => ["broker", "seller", "admin"].includes(user.role) && item.status !== "Closed"
                ? actionButton("Mark contacted", async () => {
                    await apiRequest(`/api/inquiries/${item.id}/status`, { method: "PATCH", body: JSON.stringify({ status: "Contacted" }) });
                    await loadAccountLists(user);
                })
                : makeElement("span", "", "") }
        ]);
    }
    if (visitsBox) {
        const data = await apiRequest("/api/visits/mine");
        renderRows(visitsBox, data.items, [
            { key: "propertyTitle", label: "Property" }, { key: "visitDate", label: "Date" },
            { key: "visitTime", label: "Time" },             { key: "status", label: "Status" },
            { key: "id", label: "Action", render: item => {
                if (user.role === "buyer" && item.status === "Requested") return actionButton("Cancel", async () => {
                    await apiRequest(`/api/visits/${item.id}`, { method: "PATCH", body: JSON.stringify({ status: "Cancelled" }) });
                    await loadAccountLists(user);
                });
                if (["broker", "seller", "admin"].includes(user.role) && item.status === "Requested") return actionButton("Confirm", async () => {
                    await apiRequest(`/api/visits/${item.id}`, { method: "PATCH", body: JSON.stringify({ status: "Confirmed" }) });
                    await loadAccountLists(user);
                });
                if (["broker", "seller", "admin"].includes(user.role) && ["Requested", "Confirmed", "Rescheduled"].includes(item.status)) {
                    return actionGroup(
                        actionButton("Reschedule", async () => {
                            const visitDate = window.prompt("New visit date (YYYY-MM-DD)", item.visitDate);
                            if (!visitDate) return;
                            const visitTime = window.prompt("New visit time (HH:MM)", item.visitTime);
                            if (!visitTime) return;
                            await apiRequest(`/api/visits/${item.id}`, { method: "PATCH", body: JSON.stringify({ status: "Rescheduled", visitDate, visitTime }) });
                            await loadAccountLists(user);
                        }),
                        actionButton("Complete", async () => {
                            await apiRequest(`/api/visits/${item.id}`, { method: "PATCH", body: JSON.stringify({ status: "Completed" }) });
                            await loadAccountLists(user);
                        })
                    );
                }
                return makeElement("span", "", "");
            } }
        ]);
    }
}

async function loadBrokerDashboard(user) {
    const stats = await apiRequest("/api/broker/statistics");
    const statsBox = document.getElementById("brokerStats");
    statsBox.textContent = `Listings: ${stats.stats.properties} | Pending: ${stats.stats.pending} | Approved: ${stats.stats.approved} | Enquiries: ${stats.stats.inquiries} | Visits: ${stats.stats.visits}`;
    const [profileData, listingsData] = await Promise.all([apiRequest("/api/broker/profile"), apiRequest("/api/broker/properties")]);
    const profile = profileData.profile;
    document.getElementById("brokerFullName").value = profile.fullName || user.name;
    document.getElementById("brokerAgency").value = profile.agencyName || "";
    document.getElementById("brokerPhone").value = profile.phone;
    document.getElementById("brokerDescription").value = profile.bio || "";
    document.getElementById("brokerPhoto").value = profile.profilePhoto || "";
    document.getElementById("brokerAreas").value = (profile.areasServed || []).join(", ");
    renderRows(document.getElementById("brokerListings"), listingsData.items, [
        { key: "title", label: "Listing" }, { key: "city", label: "City" },
        { key: "approvalStatus", label: "Approval" }, { key: "listingStatus", label: "Status" },
        { key: "id", label: "Actions", render: item => {
            const box = makeElement("span");
            box.append(actionButton("Withdraw", async () => {
                await apiRequest(`/api/broker/properties/${item.id}/withdraw`, { method: "POST", body: "{}" });
                await loadBrokerDashboard(user);
            }));
            return box;
        } }
    ]);
}

async function loadAdminDashboard() {
    const [dashboard, users, brokers, properties, inquiries, visits] = await Promise.all([
        apiRequest("/api/admin/dashboard"), apiRequest("/api/admin/users"),
        apiRequest("/api/admin/brokers"), apiRequest("/api/admin/properties"),
        apiRequest("/api/admin/inquiries"), apiRequest("/api/admin/visits")
    ]);
    const statsBox = document.getElementById("adminStats");
    statsBox.replaceChildren();
    Object.entries(dashboard.stats).forEach(([key, value]) => statsBox.append(makeElement("p", "", `${key.replace(/[A-Z]/g, m => ` ${m}`).trim()}: ${value}`)));
    renderRows(document.getElementById("adminUsers"), users.items, [
        { key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "role", label: "Role" },
        { key: "suspended", label: "State", render: item => makeElement("span", "", item.suspended ? "Suspended" : "Active") },
        { key: "id", label: "Actions", render: item => actionButton(item.suspended ? "Reactivate" : "Suspend", async () => {
            await apiRequest(`/api/admin/users/${item.id}`, { method: "PATCH", body: JSON.stringify({ suspended: !item.suspended }) });
            await loadAdminDashboard();
        }) }
    ]);
    renderRows(document.getElementById("adminBrokers"), brokers.items, [
        { key: "name", label: "Broker" }, { key: "agencyName", label: "Agency" },
        { key: "verificationStatus", label: "Verification" },
        { key: "user_id", label: "Actions", render: item => actionGroup(
            actionButton("Verify", async () => {
                await apiRequest(`/api/admin/brokers/${item.user_id}/verification`, { method: "PATCH", body: JSON.stringify({ verificationStatus: "Verified" }) });
                await loadAdminDashboard();
            }),
            actionButton("Reject", async () => {
                await apiRequest(`/api/admin/brokers/${item.user_id}/verification`, { method: "PATCH", body: JSON.stringify({ verificationStatus: "Rejected" }) });
                await loadAdminDashboard();
            })
        ) }
    ]);
    renderRows(document.getElementById("adminProperties"), properties.items, [
        { key: "title", label: "Property" }, { key: "city", label: "City" },
        { key: "approvalStatus", label: "Approval" },
        { key: "id", label: "Actions", render: item => actionGroup(
            actionButton("Approve", async () => {
                await apiRequest(`/api/admin/properties/${item.id}/status`, { method: "PATCH", body: JSON.stringify({ approvalStatus: "Approved" }) });
                await loadAdminDashboard();
            }),
            actionButton("Reject", async () => {
                const rejectionReason = window.prompt("Reason for rejection");
                if (!rejectionReason) return;
                await apiRequest(`/api/admin/properties/${item.id}/status`, { method: "PATCH", body: JSON.stringify({ approvalStatus: "Rejected", rejectionReason }) });
                await loadAdminDashboard();
            })
        ) }
    ]);
    renderRows(document.getElementById("adminInquiries"), inquiries.items, [
        { key: "name", label: "Name" }, { key: "inquiryType", label: "Type" }, { key: "status", label: "Status" }
    ]);
    renderRows(document.getElementById("adminVisits"), visits.items, [
        { key: "propertyTitle", label: "Property" }, { key: "visitDate", label: "Date" }, { key: "status", label: "Status" }
    ]);
    const audit = await apiRequest("/api/admin/audit-logs");
    renderRows(document.getElementById("adminAuditLogs"), audit.items, [
        { key: "actor_name", label: "Actor" }, { key: "action", label: "Action" },
        { key: "target_type", label: "Target" }, { key: "created_at", label: "Date" }
    ]);
}

async function initAccountPage() {
    const app = document.getElementById("accountApp");
    if (!app) return;
    const loggedOut = document.getElementById("loggedOut");
    const dashboard = document.getElementById("accountDashboard");
    try {
        const data = await apiRequest("/api/auth/me");
        const user = data.user;
        if (user.role === "seller") { window.location.replace(`dashboard.html${window.location.search}`); return; }
        loggedOut.hidden = true;
        dashboard.hidden = false;
        document.getElementById("accountName").textContent = user.name;
        document.getElementById("accountRole").textContent = `${user.role} · ${user.emailVerified ? "Email verified" : "Email not verified"}`;
        document.getElementById("dashboardVerifyForm").hidden = user.emailVerified;
        const verificationToken = new URLSearchParams(window.location.search).get("verificationToken");
        if (verificationToken) document.querySelectorAll('[name="token"]').forEach(input => { input.value = verificationToken; });
        document.getElementById("profileForm").elements.name.value = user.name;
        document.getElementById("profileForm").elements.phone.value = user.phone || "";
        document.getElementById("buyerPanel").hidden = user.role !== "buyer";
        document.getElementById("brokerPanel").hidden = user.role !== "broker";
        document.getElementById("adminPanel").hidden = user.role !== "admin";
        await loadAccountLists(user);
        if (user.role === "broker") await loadBrokerDashboard(user);
        if (user.role === "admin") await loadAdminDashboard();
    } catch {
        dashboard.hidden = true;
        loggedOut.hidden = false;
    }
}

function formValues(form) {
    return Object.fromEntries(new FormData(form).entries());
}

function bindAccountForms() {
    const verificationToken = new URLSearchParams(window.location.search).get("verificationToken");
    if (verificationToken) document.querySelectorAll('[name="token"]').forEach(input => { input.value = verificationToken; });
    const login = document.getElementById("loginForm");
    login?.addEventListener("submit", async event => {
        event.preventDefault();
        try {
            const values = formValues(login);
            if (login.dataset.role) values.role = login.dataset.role;
            await apiRequest("/api/auth/login", { method: "POST", body: JSON.stringify(values) });
            accountMessage("Signed in successfully.");
            if (login.dataset.role) {
                window.location.href = "account.html";
                return;
            }
            await initAccountPage();
        } catch (error) { accountMessage(error.message, true); }
    });

    const register = document.getElementById("registerForm");
    register?.addEventListener("submit", async event => {
        event.preventDefault();
        const values = formValues(register);
        if (values.password !== values.confirmPassword) { accountMessage("Passwords do not match.", true); return; }
        try {
            const result = await apiRequest("/api/auth/register", { method: "POST", body: JSON.stringify(values) });
            if (result.developmentVerificationToken) {
                window.location.href = `account.html?verificationToken=${encodeURIComponent(result.developmentVerificationToken)}`;
                return;
            }
            register.reset();
            document.getElementById("registerRole")?.dispatchEvent(new Event("change"));
            accountMessage("Your account was created. Check your email for the verification link to complete setup.");
        } catch (error) { accountMessage(error.message, true); }
    });

    const roleControl = document.getElementById("registerRole");
    roleControl?.addEventListener("change", () => {
        const brokerFields = document.getElementById("brokerFields"), sellerFields = document.getElementById("sellerFields");
        if (brokerFields) brokerFields.hidden = roleControl.value !== "broker";
        if (sellerFields) sellerFields.hidden = roleControl.value !== "seller";
        register.elements.phone.required = true;
        register.elements.agencyName.required = roleControl.value === "broker";
        register.elements.description.required = roleControl.value === "broker";
        register.elements.areasServed.required = roleControl.value === "broker";
        const orgRow = document.getElementById("organizationNameRow"), sellerType = document.getElementById("sellerType");
        if (orgRow) orgRow.hidden = roleControl.value !== "seller" || sellerType.value !== "company";
        if (register.elements.organizationName) register.elements.organizationName.required = roleControl.value === "seller" && sellerType.value === "company";
    });
    roleControl?.dispatchEvent(new Event("change"));
    document.getElementById("sellerType")?.addEventListener("change", () => roleControl?.dispatchEvent(new Event("change")));

    document.getElementById("logoutButton")?.addEventListener("click", async () => {
        try {
            await apiRequest("/api/auth/logout", { method: "POST", body: "{}" });
            window.location.reload();
        } catch (error) { accountMessage(error.message, true); }
    });

    document.getElementById("profileForm")?.addEventListener("submit", async event => {
        event.preventDefault();
        const form = event.target;
        try {
            await apiRequest("/api/auth/profile", { method: "PATCH", body: JSON.stringify(formValues(form)) });
            accountMessage("Profile saved.");
            await initAccountPage();
        } catch (error) { accountMessage(error.message, true); }
    });

    document.getElementById("changePasswordForm")?.addEventListener("submit", async event => {
        event.preventDefault();
        try {
            await apiRequest("/api/auth/change-password", { method: "POST", body: JSON.stringify(formValues(event.target)) });
            event.target.reset();
            accountMessage("Password changed.");
        } catch (error) { accountMessage(error.message, true); }
    });

    document.getElementById("verifyForm")?.addEventListener("submit", async event => {
        event.preventDefault();
        try {
            await apiRequest("/api/auth/verify-email", { method: "POST", body: JSON.stringify(formValues(event.target)) });
            accountMessage("Email verified.");
            await initAccountPage();
        } catch (error) { accountMessage(error.message, true); }
    });
    document.getElementById("dashboardVerifyForm")?.addEventListener("submit", async event => {
        event.preventDefault();
        try {
            await apiRequest("/api/auth/verify-email", { method: "POST", body: JSON.stringify(formValues(event.target)) });
            accountMessage("Email verified.");
            await initAccountPage();
        } catch (error) { accountMessage(error.message, true); }
    });

    document.getElementById("forgotForm")?.addEventListener("submit", async event => {
        event.preventDefault();
        try {
            const result = await apiRequest("/api/auth/forgot-password", { method: "POST", body: JSON.stringify(formValues(event.target)) });
            accountMessage(result.message);
        } catch (error) { accountMessage(error.message, true); }
    });

    document.getElementById("resetForm")?.addEventListener("submit", async event => {
        event.preventDefault();
        try {
            const result = await apiRequest("/api/auth/reset-password", { method: "POST", body: JSON.stringify(formValues(event.target)) });
            accountMessage(result.message);
        } catch (error) { accountMessage(error.message, true); }
    });

    document.getElementById("brokerProfileForm")?.addEventListener("submit", async event => {
        event.preventDefault();
        try {
            const values = formValues(event.target);
            const areasServed = values.areasServed ? values.areasServed.split(",").map(value => value.trim()).filter(Boolean) : [];
            await apiRequest("/api/broker/profile", { method: "PUT", body: JSON.stringify({ agencyName: values.agencyName, bio: values.description, location: "", profilePhoto: values.profilePhoto, areasServed }) });
            await apiRequest("/api/auth/profile", { method: "PATCH", body: JSON.stringify({ name: values.fullName, phone: values.phone }) });
            accountMessage("Broker profile saved.");
        } catch (error) { accountMessage(error.message, true); }
    });

    document.getElementById("propertyForm")?.addEventListener("submit", async event => {
        event.preventDefault();
        const form = event.target;
        const values = formValues(form);
        const imageFiles = form.elements.images.files;
        delete values.images;
        values.price = Number(values.price);
        values.bedrooms = Number(values.bedrooms);
        values.bathrooms = Number(values.bathrooms);
        values.areaSqFt = Number(values.areaSqFt);
        values.amenities = values.amenities ? values.amenities.split(",").map(value => value.trim()).filter(Boolean) : [];
        try {
            const result = await apiRequest("/api/broker/properties", { method: "POST", body: JSON.stringify(values) });
            if (imageFiles.length) {
                const imageForm = new FormData();
                Array.from(imageFiles).forEach(file => imageForm.append("images", file));
                await apiRequest(`/api/broker/properties/${result.property.id}/images`, { method: "POST", body: imageForm });
            }
            accountMessage("Property submitted for administrator approval" + (imageFiles.length ? " with " + imageFiles.length + (imageFiles.length === 1 ? " photo." : " photos.") : "."));
            form.reset();
            form.elements.images.dispatchEvent(new Event("change"));
            const user = (await apiRequest("/api/auth/me")).user;
            await loadBrokerDashboard(user);
        } catch (error) { accountMessage(error.message, true); }
    });
}

async function loadHomeFeatured() {
    const grid = document.querySelector(".featured .property-grid");
    if (!grid) return;
    try {
        const data = await apiRequest("/api/properties/featured");
        grid.replaceChildren();
        if (!data.items.length) {
            grid.append(makeElement("p", "empty-state", "No featured approved properties yet."));
            return;
        }
        data.items.forEach(item => grid.append(makePropertyCard(item, true)));
    } catch (error) {
        grid.replaceChildren(makeElement("p", "empty-state", `Featured properties unavailable: ${error.message}`));
    }
}

function focusPropertyEnquiry() {
    const form = document.getElementById("propertyEnquiryForm");
    if (!form) {
        window.showSiteToast("Property enquiry is not available yet. Please try again shortly.", "info");
        return;
    }
    form.scrollIntoView({ behavior: "smooth", block: "center" });
    form.querySelector("textarea")?.focus({ preventScroll: true });
}

function showPropertyDetailState(title, message) {
    const hero = document.querySelector(".detail-hero");
    if (hero) hero.hidden = true;
    const section = document.querySelector(".detail-section");
    const content = section?.querySelector(".detail-content");
    if (!content) return;
    const state = makeElement("div", "detail-load-state");
    const icon = makeElement("div", "detail-load-icon");
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = '<i class="fa-solid fa-house-circle-exclamation"></i>';
    const heading = makeElement("h1", "", title);
    const copy = makeElement("p", "", message);
    const link = makeElement("a", "detail-return-link", "Browse available properties");
    link.href = "properties.html";
    state.setAttribute("role", "status");
    state.append(icon, heading, copy, link);
    content.replaceChildren(state);
}

async function loadPropertyDetail() {
    const propertyId = new URLSearchParams(window.location.search).get("id");
    if (!propertyId) {
        showPropertyDetailState("Choose a property to view", "Open a listing from the properties page to see its current details.");
        return;
    }

    const detailContent = document.querySelector(".detail-content");
    detailContent?.setAttribute("aria-busy", "true");
    try {
        const { property } = await apiRequest(`/api/properties/${encodeURIComponent(propertyId)}`);
        if (!property) throw new Error("This listing is no longer available.");
        const area = Number(property.areaSqFt || property.area || 0);
        const areaText = area ? `${area.toLocaleString("en-IN")} sq.ft` : "Area not provided";
        const bedrooms = Number(property.bedrooms || 0);
        const bathrooms = Number(property.bathrooms || 0);
        const hero = document.querySelector(".detail-main-image img");
        if (hero) {
            if (property.mainImage) hero.src = property.mainImage;
            hero.alt = property.title || "Property photo";
        }
        document.title = `${property.title || "Property details"} | NESTORA`;
        const heading = document.querySelector(".detail-heading h1");
        if (heading) heading.textContent = property.title || "Property details";
        const cityState = [property.city, property.state].filter(Boolean).join(", ");
        const label = document.querySelector(".detail-heading .section-label");
        if (label) label.textContent = cityState.toUpperCase();
        const address = document.querySelector(".detail-address");
        if (address) address.replaceChildren(document.createTextNode([property.location, property.city, property.state].filter(Boolean).join(", ")));

        const detailTag = document.querySelector(".detail-tag");
        if (detailTag) {
            detailTag.textContent = property.demoListing ? "SAMPLE LISTING" : (property.featured ? "FEATURED PROPERTY" : property.listingType || "PROPERTY").toUpperCase();
            detailTag.classList.toggle("demo-listing-badge", Boolean(property.demoListing));
        }
        if (property.demoListing && !document.getElementById("demoListingNotice")) {
            const notice = makeElement("div", "demo-listing-notice", "Illustrative demo listing for preview purposes only. It is not a live property offer.");
            notice.id = "demoListingNotice";
            document.querySelector(".detail-heading")?.append(notice);
        }

        const stats = document.querySelectorAll(".property-stats strong");
        if (stats[0]) stats[0].textContent = String(bedrooms);
        if (stats[1]) stats[1].textContent = String(bathrooms);
        if (stats[2]) stats[2].textContent = area ? area.toLocaleString("en-IN") : "—";
        if (stats[3]) stats[3].textContent = property.parking || "—";
        const detailPrice = document.getElementById("detailPrice");
        if (detailPrice) detailPrice.textContent = formatPrice(property.price);
        const priceLabel = document.getElementById("detailListingPriceLabel");
        if (priceLabel) priceLabel.textContent = property.listingType === "Rent" ? "Rental price" : "Asking price";
        const perArea = document.getElementById("detailPricePerArea");
        if (perArea) {
            perArea.hidden = property.listingType !== "Sale" || !area;
            perArea.textContent = area ? `Approx. ${formatPrice(Number(property.price) / area)} / sq.ft` : "";
        }
        const detailHeart = document.querySelector(".detail-heart");
        if (detailHeart) detailHeart.dataset.propertyId = property.id || property._id;

        const gallery = document.querySelector(".detail-thumbnails");
        if (gallery) {
            gallery.replaceChildren();
            (Array.isArray(property.additionalImages) ? property.additionalImages : []).forEach((url, index) => {
                const image = makeElement("img");
                image.src = url;
                image.alt = `${property.title || "Property"} photo ${index + 2}`;
                image.loading = "lazy";
                gallery.append(image);
            });
            gallery.hidden = !gallery.childElementCount;
        }

        const description = document.getElementById("detailDescription");
        if (description) description.textContent = property.description || "The seller has not added a description yet.";
        const amenityBox = document.querySelector(".amenities");
        if (amenityBox) {
            amenityBox.replaceChildren();
            const amenities = Array.isArray(property.amenities) ? property.amenities : [];
            if (amenities.length) amenities.forEach(text => amenityBox.append(makeElement("div", "amenity", text)));
            else amenityBox.append(makeElement("p", "detail-muted", "No amenities have been listed."));
        }

        const values = {
            detailPropertyType: property.propertyType || "Not provided",
            detailListingType: property.listingType || "Not provided",
            detailArea: areaText,
            detailFurnishing: property.furnishing || "Not provided",
            detailRoomCount: `${bedrooms} bed · ${bathrooms} bath`,
            detailParkingValue: property.parking || "Not provided",
            detailFloor: property.floor === 0 ? "Ground floor" : `${property.floor || "—"}${property.totalFloors ? ` of ${property.totalFloors} floors` : ""}`,
            detailLocation: [property.location, property.city, property.state].filter(Boolean).join(", ") || "Location not provided"
        };
        Object.entries(values).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });

        const brokerCard = document.querySelector(".agent-card");
        if (brokerCard) {
            const broker = property.broker;
            brokerCard.hidden = !broker;
            if (broker) {
                const brokerName = broker.agencyName || "Property broker";
                const name = document.getElementById("detailBrokerName");
                const avatar = document.getElementById("detailBrokerAvatar");
                const meta = document.getElementById("detailBrokerMeta");
                const bio = document.getElementById("detailBrokerBio");
                if (name) name.textContent = brokerName;
                if (avatar) avatar.textContent = brokerName.trim().charAt(0).toUpperCase() || "B";
                if (meta) meta.textContent = broker.verificationStatus || "Broker profile";
                if (bio) bio.textContent = broker.bio || "Contact NESTORA for help with this listing.";
            }
        }

        const priceCard = document.querySelector(".price-card");
        if (priceCard && !document.getElementById("propertyEnquiryForm")) {
            const enquiry = document.createElement("form");
            enquiry.id = "propertyEnquiryForm";
            enquiry.className = "account-form";
            enquiry.innerHTML = '<h3>Ask about this property</h3><label>Message<textarea name="message" minlength="8" maxlength="3000" required placeholder="Tell us what you would like to know"></textarea></label><button class="form-submit" type="submit">Send enquiry</button><p id="propertyEnquiryNotice" role="status" aria-live="polite"></p>';
            priceCard.append(enquiry);
            enquiry.addEventListener("submit", async event => {
                event.preventDefault();
                const notice = enquiry.querySelector("#propertyEnquiryNotice");
                const button = enquiry.querySelector("button[type=submit]");
                button.disabled = true;
                try {
                    await apiRequest("/api/inquiries", { method: "POST", body: JSON.stringify({ propertyId: property.id || property._id, inquiryType: "Property enquiry", message: enquiry.elements.message.value }) });
                    window.renderSiteMessage(notice, "Your enquiry has been sent. You can follow it from your buyer dashboard.", "success");
                    enquiry.reset();
                } catch (error) {
                    window.renderSiteMessage(notice, error.message, "error");
                } finally {
                    button.disabled = false;
                }
            });
        }
    } catch (error) {
        showPropertyDetailState("This property could not be loaded", `${error.message || "The listing may be unavailable."} Browse approved listings and choose another property.`);
    } finally {
        detailContent?.removeAttribute("aria-busy");
    }
}
document.addEventListener("DOMContentLoaded", () => {
    bindAccountForms();
    if (document.getElementById("propertiesGrid")) applyQueryFilters();
    loadHomeFeatured();
    loadPropertyDetail();
    initAccountPage();
    document.querySelectorAll('input[type="file"][name="images"]').forEach(input => window.bindImagePicker(input));
    const outsideModal = document.getElementById("visitModal");
    document.addEventListener("click", event => {
        if (outsideModal && event.target === outsideModal) closeVisitModal();
    });
});
