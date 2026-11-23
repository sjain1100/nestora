document.addEventListener("DOMContentLoaded", function () {
  void initializeAdminPanel();

  async function initializeAdminPanel() {
    const api = window.NestoraAPI;
    const root = document.querySelector("#dashboardRoot");
    if (!api || !root) return;

    let currentUser;
    try {
      currentUser = (await api.auth.me()).user;
    } catch (_) {
      return;
    }
    if (!currentUser || currentUser.role !== "admin") return;

    const main = await waitForAdminDashboard(root);
    if (!main) return;

    hideLegacyAdminLists(main);
    const panel = document.createElement("section");
    panel.className = "account-panel demo-admin-panel";
    panel.setAttribute("aria-label", "Administrative controls");
    panel.innerHTML = '<h2>Platform management</h2><div id="adminControlNotice" class="account-message" role="status" aria-live="polite" hidden></div><div id="adminUserDetail" class="demo-detail-panel" hidden></div>';

    addCollection(panel, "users", "Users",
      '<form id="adminUsersFilter" class="demo-filter-row"><input name="search" type="search" maxlength="80" placeholder="Search name or email"><select name="role"><option value="">All roles</option><option>buyer</option><option>broker</option><option>seller</option><option>admin</option></select><select name="suspended"><option value="">All states</option><option value="false">Active</option><option value="true">Suspended</option></select><button class="account-action">Filter users</button></form>');
    addCollection(panel, "brokers", "Broker verification",
      '<form id="adminBrokersFilter" class="demo-filter-row"><select name="verificationStatus"><option value="">All verification statuses</option><option>Unverified</option><option>Pending</option><option>Verified</option><option>Rejected</option><option>Suspended</option></select><button class="account-action">Filter brokers</button></form>');
    addCollection(panel, "properties", "Property moderation",
      '<form id="adminPropertiesFilter" class="demo-filter-row"><input name="search" type="search" maxlength="100" placeholder="Search properties"><select name="approvalStatus"><option value="">All approval statuses</option><option>Pending</option><option>Approved</option><option>Rejected</option></select><button class="account-action">Filter properties</button></form>');
    addCollection(panel, "enquiries", "Enquiries",
      '<form id="adminEnquiriesFilter" class="demo-filter-row"><select name="status"><option value="">All enquiry statuses</option><option>Pending</option><option>Contacted</option><option>Responded</option><option>Closed</option></select><button class="account-action">Filter enquiries</button></form>');
    addCollection(panel, "visits", "Visits",
      '<form id="adminVisitsFilter" class="demo-filter-row"><select name="status"><option value="">All visit statuses</option><option>Requested</option><option>Confirmed</option><option>Rescheduled</option><option>Completed</option><option>Cancelled</option></select><button class="account-action">Filter visits</button></form>');
    addCollection(panel, "audit", "Audit log", "");
    addCollection(panel, "contacts", "Contact messages", '<form id="adminContactsFilter" class="demo-filter-row"><select name="status"><option value="">All message statuses</option><option>New</option><option>In Progress</option><option>Closed</option></select><button class="account-action">Filter messages</button></form>');

    const stats = main.querySelector(".demo-stats");
    if (stats) stats.after(panel);
    else main.insertBefore(panel, main.querySelector("#profile"));

    const pageState = {
      users: { page: 1, filters: {} },
      brokers: { page: 1, filters: {} },
      properties: { page: 1, filters: {} },
      enquiries: { page: 1, filters: {} },
      visits: { page: 1, filters: {} },
      audit: { page: 1, filters: {} },
      contacts: { page: 1, filters: {} }
    };
    const loaders = {
      users: params => api.admin.users(params),
      brokers: params => api.admin.brokers(params),
      properties: params => api.admin.properties(params),
      enquiries: params => api.admin.enquiries(params),
      visits: params => api.admin.visits(params),
      audit: params => api.admin.audit(params),
      contacts: params => api.admin.contacts(params)
    };
    const filterFields = {
      users: ["search", "role", "suspended"],
      brokers: ["verificationStatus"],
      properties: ["search", "approvalStatus"],
      enquiries: ["status"],
      visits: ["status"],
      contacts: ["status"]
    };

    Object.keys(filterFields).forEach(function (key) {
      const form = panel.querySelector("#admin" + capitalize(key) + "Filter");
      if (!form) return;
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(form));
        pageState[key].filters = {};
        filterFields[key].forEach(function (field) {
          const value = String(data[field] || "").trim();
          if (value) pageState[key].filters[field] = value;
        });
        void load(key, 1);
      });
    });

    panel.addEventListener("click", function (event) {
      const button = event.target.closest("[data-page-key]");
      if (!button || button.disabled) return;
      void load(button.dataset.pageKey, Number(button.dataset.pageNumber));
    });

    await Promise.all(Object.keys(loaders).map(key => load(key, 1)));

    async function load(key, page) {
      const container = panel.querySelector("#admin" + capitalize(key) + "Rows");
      if (!container) return;
      try {
        const result = await loaders[key](Object.assign({}, pageState[key].filters, { page }));
        pageState[key].page = page;
        renderCollection(key, container, result.items || [], result.pagination || { page, pages: 1, total: (result.items || []).length });
      } catch (error) {
        const notice = document.createElement("div"); window.renderSiteMessage(notice, error.message, "error"); container.replaceChildren(notice);
        showNotice(error.message, true);
      }
    }

    function renderCollection(key, container, items, pagination) {
      const definitions = columnsFor(key);
      const tableWrap = document.createElement("div");
      tableWrap.className = "demo-table-wrap";
      const table = document.createElement("table");
      table.className = "demo-table";
      const head = document.createElement("thead");
      const headerRow = document.createElement("tr");
      definitions.forEach(column => headerRow.append(makeElement("th", "", column.label)));
      head.append(headerRow);
      table.append(head);
      const body = document.createElement("tbody");

      if (!items.length) {
        const row = document.createElement("tr");
        row.append(makeElement("td", "", "No records found."));
        row.firstElementChild.colSpan = definitions.length;
        body.append(row);
      } else {
        items.forEach(function (item) {
          const row = document.createElement("tr");
          definitions.forEach(function (column) {
            const cell = document.createElement("td");
            if (column.render) cell.append(column.render(item));
            else cell.textContent = displayValue(item[column.key]);
            row.append(cell);
          });
          body.append(row);
        });
      }
      table.append(body);
      tableWrap.append(table);
      container.replaceChildren(tableWrap, makePager(key, pagination));
    }

    function columnsFor(key) {
      if (key === "users") return [
        { label: "Name", key: "name" }, { label: "Email", key: "email" }, { label: "Role", key: "role" },
        { label: "State", render: user => user.suspended ? "Suspended" : "Active" },
        { label: "Actions", render: user => {
          const box = makeElement("span");
          box.append(actionButton("Details", async function () {
            const result = await api.admin.userDetail(user.id);
            showUserDetails(result.user);
          }));
          if (user.role !== "admin") box.append(actionButton(user.suspended ? "Activate" : "Suspend", async function () {
            await api.admin.user(user.id, { suspended: !user.suspended });
            await load("users", pageState.users.page);
            showNotice(user.suspended ? "Account activated." : "Account suspended.");
          }));
          return box;
        } }
      ];
      if (key === "brokers") return [
        { label: "Broker", key: "name" }, { label: "Email", key: "email" }, { label: "Agency", key: "agencyName" },
        { label: "Verification", key: "verificationStatus" },
        { label: "Actions", render: broker => {
          const box = makeElement("span");
          if (broker.verificationStatus !== "Verified") box.append(actionButton("Verify", async function () {
            await api.admin.verify(broker.user_id, { verificationStatus: "Verified", reviewNote: "" });
            await load("brokers", pageState.brokers.page);
            showNotice("Broker verified.");
          }));
          if (broker.verificationStatus !== "Rejected") box.append(actionButton("Reject", async function () {
            const reviewNote = window.prompt("Optional review note:");
            if (reviewNote === null) return;
            await api.admin.verify(broker.user_id, { verificationStatus: "Rejected", reviewNote: reviewNote.trim() });
            await load("brokers", pageState.brokers.page);
            showNotice("Broker review saved.");
          }));
          return box;
        } }
      ];
      if (key === "properties") return [
        { label: "Property", key: "title" },
        { label: "City", key: "city" },
        { label: "Owner", render: property => property.owner && property.owner.name ? property.owner.name : property.ownerRole },
        { label: "Approval", render: property => property.approvalStatus },
        { label: "Listing", render: property => property.listingStatus },
        { label: "Actions", render: property => propertyControls(property) }
      ];
      if (key === "enquiries") return [
        { label: "Buyer", key: "buyer" }, { label: "Property", key: "propertyTitle" },
        { label: "Date", key: "createdAt" }, { label: "Status", key: "status" },
        { label: "Actions", render: enquiry => {
          const box = makeElement("span");
          const select = selectControl(["Pending", "Contacted", "Responded", "Closed"], enquiry.status);
          box.append(select, actionButton("Save", async function () {
            await api.enquiries.status(enquiry.id, select.value);
            await load("enquiries", pageState.enquiries.page);
            showNotice("Enquiry updated.");
          }));
          return box;
        } }
      ];
      if (key === "visits") return [
        { label: "Property", key: "propertyTitle" },
        { label: "Buyer", render: visit => visit.customerName || (visit.buyer && visit.buyer.name) || visit.buyer },
        { label: "Date", key: "visitDate" }, { label: "Time", key: "visitTime" }, { label: "Status", key: "status" },
        { label: "Actions", render: visit => visitControls(visit) }
      ];
      if (key === "contacts") return [
        { label: "Name", key: "name" },
        { label: "Email", key: "email" },
        { label: "Phone", key: "phone" },
        { label: "Interest", key: "inquiryType" },
        { label: "Message", render: item => {
          const details = document.createElement("details");
          const summary = document.createElement("summary");
          const message = document.createElement("p");
          summary.textContent = "Read";
          message.textContent = item.message || "";
          details.append(summary, message);
          return details;
        } },
        { label: "Status", key: "status" },
        { label: "Actions", render: item => {
          const box = makeElement("span");
          const select = selectControl(["New", "In Progress", "Closed"], item.status);
          box.append(select, actionButton("Save", async function () {
            await api.admin.updateContact(item.id, select.value);
            await load("contacts", pageState.contacts.page);
            showNotice("Contact message updated.");
          }));
          return box;
        } }
      ];
      return [
        { label: "Actor", key: "actor_name" }, { label: "Email", key: "actor_email" },
        { label: "Action", key: "action" }, { label: "Target", key: "target_type" }, { label: "Date", key: "created_at" }
      ];
    }

    function propertyControls(property) {
      const box = document.createElement("div");
      box.className = "demo-admin-actions";
      if (property.approvalStatus !== "Approved") {
        box.append(actionButton("Approve", async function () {
          await api.admin.moderate(property.id, { approvalStatus: "Approved" });
          await load("properties", pageState.properties.page);
          showNotice("Property approved.");
        }));
      }
      if (property.approvalStatus !== "Rejected") {
        box.append(actionButton("Reject", async function () {
          const reason = window.prompt("Reason for rejecting this property:");
          if (reason === null) return;
          if (reason.trim().length < 3) throw new Error("Enter a rejection reason of at least 3 characters.");
          await api.admin.moderate(property.id, { approvalStatus: "Rejected", rejectionReason: reason.trim() });
          await load("properties", pageState.properties.page);
          showNotice("Property rejected.");
        }));
      }
      if (property.approvalStatus === "Approved") {
        const statusSelect = selectControl(["Active", "Inactive", "Sold", "Rented"], property.listingStatus);
        const saveStatus = actionButton("Save status", async function () {
          await api.admin.moderate(property.id, { listingStatus: statusSelect.value });
          await load("properties", pageState.properties.page);
          showNotice("Listing status updated.");
        });
        box.append(statusSelect, saveStatus);
      }
      const feature = document.createElement("label");
      feature.className = "check-line";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = Boolean(property.featured);
      feature.append(checkbox, document.createTextNode(" Featured"));
      box.append(feature, actionButton("Save featured", async function () {
        await api.admin.moderate(property.id, { featured: checkbox.checked });
        await load("properties", pageState.properties.page);
        showNotice("Featured setting updated.");
      }));
      return box;
    }

    function visitControls(visit) {
      const box = document.createElement("span");
      if (visit.status === "Requested") box.append(actionButton("Confirm", async function () {
        await api.visits.update(visit.id, { status: "Confirmed" });
        await load("visits", pageState.visits.page);
      }));
      if (["Requested", "Confirmed", "Rescheduled"].includes(visit.status)) {
        box.append(actionButton("Reschedule", async function () {
          const date = window.prompt("New visit date (YYYY-MM-DD)", visit.visitDate);
          if (!date) return;
          const time = window.prompt("New visit time (HH:MM)", visit.visitTime);
          if (!time) return;
          await api.visits.update(visit.id, { status: "Rescheduled", visitDate: date, visitTime: time });
          await load("visits", pageState.visits.page);
          showNotice("Visit rescheduled.");
        }));
        box.append(actionButton("Complete", async function () {
          await api.visits.update(visit.id, { status: "Completed" });
          await load("visits", pageState.visits.page);
          showNotice("Visit completed.");
        }));
        box.append(actionButton("Cancel", async function () {
          await api.visits.update(visit.id, { status: "Cancelled" });
          await load("visits", pageState.visits.page);
          showNotice("Visit cancelled.");
        }));
      }
      return box;
    }

    function showUserDetails(user) {
      const detail = panel.querySelector("#adminUserDetail");
      detail.replaceChildren();
      detail.hidden = false;
      detail.append(actionButton("Close", function () { detail.hidden = true; }));
      detail.append(makeElement("h3", "", user.name));
      detail.append(makeElement("p", "", user.email + " · " + (user.phone || "No phone")));
      detail.append(makeElement("p", "", "Role: " + user.role + " · " + (user.suspended ? "Suspended" : "Active") + " · " + (user.emailVerified ? "Email verified" : "Email not verified")));
      if (user.sellerDetails) detail.append(makeElement("p", "", "Seller: " + user.sellerDetails.sellerType + " " + (user.sellerDetails.organizationName || "")));
      if (user.brokerProfile) {
        const broker = user.brokerProfile;
        detail.append(makeElement("p", "", "Agency: " + (broker.agencyName || "Not provided") + " · " + broker.verificationStatus));
        detail.append(makeElement("p", "", "License: " + (broker.licenseNumber || "Not provided") + " · Experience: " + (Number(broker.experience) || 0) + " years"));
        detail.append(makeElement("p", "", broker.bio || ""));
      }
      detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    function makePager(key, pagination) {
      const nav = document.createElement("nav");
      nav.className = "demo-pager";
      nav.setAttribute("aria-label", key + " pages");
      const page = Number(pagination.page) || 1;
      const pages = Math.max(1, Number(pagination.pages) || 1);
      const previous = makeElement("button", "account-action", "Previous");
      previous.type = "button";
      previous.disabled = page <= 1;
      previous.addEventListener("click", function () { void load(key, page - 1); });
      const label = makeElement("span", "", "Page " + page + " of " + pages + " · " + (Number(pagination.total) || 0) + " total");
      const next = makeElement("button", "account-action", "Next");
      next.type = "button";
      next.disabled = page >= pages;
      next.addEventListener("click", function () { void load(key, page + 1); });
      nav.append(previous, label, next);
      return nav;
    }

    function addCollection(target, key, title, filterHtml) {
      const section = document.createElement("section");
      section.className = "demo-admin-section";
      section.append(makeElement("h3", "", title));
      if (filterHtml) {
        const form = document.createElement("form");
        form.innerHTML = filterHtml;
        section.append(form);
      }
      const rows = document.createElement("div");
      rows.id = "admin" + capitalize(key) + "Rows";
      section.append(rows);
      target.append(section);
    }

    function actionButton(label, callback) {
      const button = makeElement("button", "account-action", label);
      button.type = "button";
      button.addEventListener("click", async function () {
        button.disabled = true;
        try { await callback(); }
        catch (error) { showNotice(error.message, true); }
        finally { button.disabled = false; }
      });
      return button;
    }

    function selectControl(values, selected) {
      const select = document.createElement("select");
      values.forEach(function (value) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        option.selected = value === selected;
        select.append(option);
      });
      return select;
    }

    function makeElement(tag, className, text) {
      const element = document.createElement(tag);
      if (className) element.className = className;
      if (text !== undefined) element.textContent = String(text == null ? "" : text);
      return element;
    }

    function displayValue(value) {
      if (value == null || value === "") return "—";
      if (typeof value === "object") return value.name || value.email || "—";
      return String(value);
    }

    function showNotice(text, isError) {
      const notice = panel.querySelector("#adminControlNotice");
      window.renderSiteMessage(notice, text, isError ? "error" : "success");
    }
  }

  async function waitForAdminDashboard(root) {
    for (let attempt = 0; attempt < 150; attempt += 1) {
      const main = root.querySelector(".demo-main");
      if (main && main.querySelector("#propertyRows")) return main;
      if (root.querySelector(".account-page") && !main) return null;
      await new Promise(resolve => window.setTimeout(resolve, 100));
    }
    return null;
  }

  function hideLegacyAdminLists(main) {
    const titles = new Set(["Property review", "Broker verification", "User management", "Enquiries", "Visits"]);
    Array.from(main.querySelectorAll("h2")).forEach(function (heading) {
      if (!titles.has(heading.textContent.trim())) return;
      heading.hidden = true;
      let sibling = heading.nextElementSibling;
      while (sibling && sibling.tagName !== "H2") {
        sibling.hidden = true;
        sibling = sibling.nextElementSibling;
      }
    });
  }

  function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
});
