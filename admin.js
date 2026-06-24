(() => {
  /*
   * AuraHub admin dashboard controller
   * ------------------------------------------------------------
   * Handles admin login, dashboard statistics, user role management,
   * post/comment moderation, and lecturer/doctor availability tables.
   */

  const safeSetMsg = (m) => {
    const el = document.getElementById("adminMsg");
    if (el) el.textContent = m;
  };

  window.addEventListener("error", (e) => {
    safeSetMsg(e?.message || "Unexpected script error");
  });

  window.addEventListener("unhandledrejection", (e) => {
    const reason = e?.reason;
    safeSetMsg(reason?.message || "Request failed");
  });

  window.__adminLoaded = true;

  // Build API URL: API is always under /<base>/api where <base> is the subdirectory path of the application.
  // We determine <base> by taking the current pathname and, if it ends with a file (like index.html), removing the filename.
  let base = window.location.pathname;
  if (/\.[a-zA-Z0-9]+$/.test(base)) {
    base = base.substring(0, base.lastIndexOf("/"));
  }
  if (base.endsWith("/")) {
    base = base.slice(0, -1);
  }
  const API = `${window.location.origin}${base}/api`;

  const form = document.getElementById("adminLoginForm");
  const createUserForm = document.getElementById("adminCreateUserForm");
  const panel = document.getElementById("adminPanel");
  const card = document.querySelector(".auth-card");
  const msg = document.getElementById("adminMsg");
  const statsCards = document.getElementById("adminStatsCards");
  const postsBox = document.getElementById("adminPosts");
  const commentsBox = document.getElementById("adminComments");
  const usersBox = document.getElementById("adminUsers");
  const availabilityBox = document.getElementById("adminAvailability");
  const doctorAvailabilityBox = document.getElementById("adminDoctorAvailability");

  const PAGE_SIZE = 5;
  const DOCTOR_PAGE_SIZE = 4; // Doctor availability shows 4 items per page


  const state = {
    users: { rows: [], page: 1, query: "", sortKey: "id", sortDir: "desc" },
    availability: { rows: [], page: 1, query: "", sortKey: "name", sortDir: "asc" },
    doctorAvailability: { rows: [], page: 1, query: "", sortKey: "name", sortDir: "asc" },

    posts: { rows: [], page: 1, query: "", sortKey: "id", sortDir: "desc" },
    comments: { rows: [], page: 1, query: "", sortKey: "id", sortDir: "desc" }
  };

  // POST helper for admin actions such as role changes and deletes.
  const req = async (u, b) => {
    const r = await fetch(u, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(b || {})
    });

    let j;
    try {
      j = await r.json();
    } catch (err) {
      throw new Error("Unexpected response from server");
    }

    if (!r.ok || !j.success) throw new Error(j.message || "Failed");
    return j.data;
  };

  // GET helper for dashboard list endpoints.
  const get = async (u) => {
    const r = await fetch(u, { credentials: "include" });

    let j;
    try {
      j = await r.json();
    } catch (err) {
      throw new Error("Unexpected response from server");
    }

    if (!r.ok || !j.success) throw new Error(j.message || "Failed");
    return j.data;
  };

  const showDashboard = async (u) => {
    form.classList.remove("active");
    form.classList.add("hidden");
    // Store logged-in user globally for UI permission checks.
    window.currentUser = u;
    card?.classList.add("dashboard-card");
    panel.classList.remove("hidden");
    await loadDash();
  };

  const esc = (s) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  // Non-super-admins can view data but cannot perform destructive actions.
  function lockUI() {
    if (!window.currentUser || window.currentUser.role !== "super_admin") {
      document.querySelectorAll("button[data-del-user], button[data-del-post], button[data-del-comment], button[data-del-availability], button[data-del-doctor-availability]")
        .forEach(btn => btn.style.display = "none");
      document.querySelectorAll("select.role-select").forEach(sel => sel.disabled = true);
    }
  }

  const wrapTable = (html) => `<div class="table-wrap">${html}</div>`;

  const formatTime = (value) => esc(String(value || "").slice(0, 5));

  const sectionLabels = {
    users: "Search users by name, email, role, or ID",
    availability: "Search lecturers by name, email, slot date, or note",
    doctorAvailability: "Search doctors by name, email, slot date, or note",
    posts: "Search posts by content, user, or ID",
    comments: "Search comments by content, user, or ID"
  };

  const sortAccessors = {
    users: {
      id: row => Number(row.id) || 0,
      name: row => row.full_name || "",
      email: row => row.email || "",
      role: row => row.role || "",
      created: row => row.created_at || ""
    },
    availability: {
      id: row => Number(row.id) || 0,
      name: row => row.name || "",
      email: row => row.email || "",
      slots: row => row.slots.length,
      nextSlot: row => row.slots[0]?.available_date || ""
    },
    doctorAvailability: {
      id: row => Number(row.id) || 0,
      name: row => row.name || "",
      email: row => row.email || "",
      slots: row => row.slots.length,
      nextSlot: row => row.slots[0]?.available_date || ""
    },
    posts: {
      id: row => Number(row.id) || 0,
      content: row => row.content || "",
      user: row => Number(row.is_anonymous) ? "Anonymous" : (row.full_name || "")
    },
    comments: {
      id: row => Number(row.id) || 0,
      comment: row => row.content || "",
      user: row => row.full_name || ""
    }
  };

  const searchableText = (section, row) => {
    if (section === "availability" || section === "doctorAvailability") {
      return [
        row.id,
        row.name,
        row.email,
        row.slots.length ? `${row.slots.length} slots` : "no slots yet",
        ...row.slots.flatMap(slot => [slot.available_date, slot.start_time, slot.end_time, slot.note])
      ].join(" ").toLowerCase();
    }

    if (section === "posts") {
      return [row.id, row.content, Number(row.is_anonymous) ? "Anonymous" : row.full_name].join(" ").toLowerCase();
    }

    return Object.values(row || {}).join(" ").toLowerCase();
  };

  const getFilteredRows = (section) => {
    const current = state[section];
    const query = current.query.trim().toLowerCase();
    const accessors = sortAccessors[section] || {};
    const accessor = accessors[current.sortKey] || (() => "");
    const dir = current.sortDir === "desc" ? -1 : 1;

    return current.rows
      .filter(row => !query || searchableText(section, row).includes(query))
      .slice()
      .sort((a, b) => {
        const av = accessor(a);
        const bv = accessor(b);
        if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
        return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" }) * dir;
      });
  };

  const sortHeader = (section, key, label) => {
    const current = state[section];
    const arrow = current.sortKey === key ? (current.sortDir === "asc" ? " ^" : " v") : "";
    return `<button class="sort-head" type="button" data-sort-section="${section}" data-sort-key="${key}">${label}${arrow}</button>`;
  };

  const renderTableTools = (section) => `
    <div class="table-tools">
      <input type="search" data-table-search="${section}" value="${esc(state[section].query)}" autocomplete="off" maxlength="120" aria-label="${esc(sectionLabels[section])}" placeholder="${esc(sectionLabels[section])}" />
    </div>
  `;

  function providerRows(users, slots, role) {
    const idField = role === "doctor" ? "doctor_id" : "lecturer_id";
    const nameField = role === "doctor" ? "doctor_name" : "lecturer_name";
    const emailField = role === "doctor" ? "doctor_email" : "lecturer_email";
    const byProvider = new Map();

    (slots || []).forEach(slot => {
      const providerId = Number(slot[idField] ?? slot.lecturer_id ?? slot.doctor_id);
      if (!providerId) return;
      if (!byProvider.has(providerId)) byProvider.set(providerId, []);
      byProvider.get(providerId).push(slot);
    });

    return (users || [])
      .filter(user => user.role === role)
      .map(user => ({
        id: Number(user.id),
        name: user.full_name,
        email: user.email,
        role,
        slots: byProvider.get(Number(user.id)) || [],
        nameField,
        emailField
      }));
  }

  // Shared pagination helpers for all dashboard tables.
  const getTotalPages = (section) => {
    const total = getFilteredRows(section).length;
    const pageSize = section === "doctorAvailability" ? DOCTOR_PAGE_SIZE : PAGE_SIZE;
    return Math.max(1, Math.ceil(total / pageSize));
  };

  const clampPage = (section) => {
    const totalPages = getTotalPages(section);
    if (state[section].page > totalPages) state[section].page = totalPages;
    if (state[section].page < 1) state[section].page = 1;
  };

  const getPagedRows = (section) => {
    const current = state[section];
    clampPage(section);
    const pageSize = section === "doctorAvailability" ? DOCTOR_PAGE_SIZE : PAGE_SIZE;
    const start = (current.page - 1) * pageSize;
    return getFilteredRows(section).slice(start, start + pageSize);
  };

  const renderPager = (section) => {
    const current = state[section];
    const totalPages = getTotalPages(section);
    const total = getFilteredRows(section).length;
    const pageSize = section === "doctorAvailability" ? DOCTOR_PAGE_SIZE : PAGE_SIZE;
    const start = total === 0 ? 0 : ((current.page - 1) * pageSize) + 1;
    const end = total === 0 ? 0 : Math.min(current.page * pageSize, total);
    return `
      <div class="pager" data-pager-for="${section}">
        <div class="pager-info">Showing ${start}-${end} of ${total}</div>
        <div class="pager-actions">
          <button type="button" class="pager-btn" data-page-section="${section}" data-page-target="prev" ${current.page <= 1 ? "disabled" : ""}>Prev</button>
          <span class="pager-count">Page ${current.page} / ${totalPages}</span>
          <button type="button" class="pager-btn" data-page-section="${section}" data-page-target="next" ${current.page >= totalPages ? "disabled" : ""}>Next</button>
        </div>
      </div>
    `;
  };

  function renderStatsCards(st) {
    statsCards.innerHTML = `
      <article class="stat-card"><h5>TOTAL USERS</h5><h2>${st.users ?? 0}</h2></article>
      <article class="stat-card"><h5>LECTURERS</h5><h2>${st.lecturers ?? 0}</h2></article>
      <article class="stat-card"><h5>TOTAL POSTS</h5><h2>${st.posts ?? 0}</h2></article>
      <article class="stat-card"><h5>TOTAL COMMENTS</h5><h2>${st.comments ?? 0}</h2></article>
      <article class="stat-card"><h5>RESOURCE REQUESTS</h5><h2>${st.resource_requests ?? 0}</h2></article>
      <article class="stat-card"><h5>OPEN SLOTS</h5><h2>${st.availability ?? 0}</h2></article>
    `;
  }

  function roleSelect(u) {
    return `<select class="role-select" data-role-user="${u.id}" aria-label="Role for ${esc(u.full_name)}">
      ${["student", "lecturer", "doctor", "admin", "super_admin"].map(role => `<option value="${role}" ${u.role === role ? "selected" : ""}>${role}</option>`).join("")}
    </select>`;
  }

  function renderUsers(rows) {
    if (!usersBox) return;
    if (!rows.length) {
      usersBox.innerHTML = renderTableTools("users") + wrapTable(`<table><tr><th>Status</th></tr><tr><td>No users found</td></tr></table>`) + renderPager("users");
      return;
    }
    usersBox.innerHTML = renderTableTools("users") + wrapTable(`
      <table>
        <tr>
          <th>${sortHeader("users", "id", "ID")}</th>
          <th>${sortHeader("users", "name", "Name")}</th>
          <th>${sortHeader("users", "email", "Email")}</th>
          <th>${sortHeader("users", "role", "Role")}</th>
          <th>${sortHeader("users", "created", "Created")}</th>
          <th>Action</th>
        </tr>
        ${rows.map(u => `
          <tr>
            <td>${u.id}</td>
            <td>${esc(u.full_name)}</td>
            <td>${esc(u.email)}</td>
            <td>${roleSelect(u)}</td>
            <td>${esc(u.created_at)}</td>
            <td class="row-actions"><button type="button" data-del-user="${u.id}">Remove</button></td>
          </tr>
        `).join("")}
      </table>
    `) + renderPager("users");
  }

  function renderSlotList(provider, type) {
    if (!provider.slots.length) return `<span class="empty-inline">No slots yet</span>`;
    const deleteAttr = type === "doctor" ? "data-del-doctor-availability" : "data-del-availability";
    return `
      <div class="slot-stack">
        ${provider.slots.map(slot => `
          <div class="slot-pill">
            <span>${esc(slot.available_date)} ${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}</span>
            ${slot.note ? `<small>${esc(slot.note)}</small>` : ""}
            <button type="button" ${deleteAttr}="${slot.id}" title="Remove slot">Remove</button>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderSlotInputs(provider, type) {
    return `
      <div class="slot-add-form" data-slot-form="${type}" data-provider-id="${provider.id}">
        <input type="date" data-slot-date aria-label="Date" required />
        <input type="time" data-slot-start aria-label="Start time" required />
        <input type="time" data-slot-end aria-label="End time" required />
        <input type="text" data-slot-note maxlength="160" autocomplete="off" placeholder="Note" aria-label="Note" />
        <button class="slot-save-btn" type="button" data-add-availability="${type}" data-provider-id="${provider.id}">Add</button>
      </div>
    `;
  }

  function renderAvailability(rows) {
    if (!availabilityBox) return;


    if (!rows.length) {
      availabilityBox.innerHTML = renderTableTools("availability") + wrapTable(`<table><tr><th>Status</th></tr><tr><td>No lecturers found</td></tr></table>`) + renderPager("availability");
      return;
    }
    availabilityBox.innerHTML = renderTableTools("availability") + wrapTable(`
      <table>
        <tr>
          <th>${sortHeader("availability", "id", "ID")}</th>
          <th>${sortHeader("availability", "name", "Lecturer")}</th>
          <th>${sortHeader("availability", "email", "Email")}</th>
          <th>${sortHeader("availability", "slots", "Slots")}</th>
          <th>Add Slot</th>
        </tr>
        ${rows.map(provider => `
          <tr>
            <td>${provider.id}</td>
            <td>${esc(provider.name)}</td>
            <td>${esc(provider.email)}</td>
            <td>${renderSlotList(provider, "lecturer")}</td>
            <td>${renderSlotInputs(provider, "lecturer")}</td>
          </tr>
        `).join("")}
      </table>
    `) + renderPager("availability");
  }





  function renderDoctorAvailability(rows) {
    if (!doctorAvailabilityBox) return;
    if (!rows.length) {
      doctorAvailabilityBox.innerHTML = renderTableTools("doctorAvailability") + wrapTable(`<table><tr><th>Status</th></tr><tr><td>No doctors found</td></tr></table>`) + renderPager("doctorAvailability");
      return;
    }

    doctorAvailabilityBox.innerHTML = renderTableTools("doctorAvailability") + wrapTable(`
      <table>
        <tr>
          <th>${sortHeader("doctorAvailability", "id", "ID")}</th>
          <th>${sortHeader("doctorAvailability", "name", "Doctor")}</th>
          <th>${sortHeader("doctorAvailability", "email", "Email")}</th>
          <th>${sortHeader("doctorAvailability", "slots", "Slots")}</th>
          <th>Add Slot</th>
        </tr>
        ${rows.map(provider => `
          <tr>
            <td>${provider.id}</td>
            <td>${esc(provider.name)}</td>
            <td>${esc(provider.email)}</td>
            <td>${renderSlotList(provider, "doctor")}</td>
            <td>${renderSlotInputs(provider, "doctor")}</td>
          </tr>
        `).join("")}
      </table>
    `) + renderPager("doctorAvailability");
  }

  function renderPosts(rows) {
    if (!postsBox) return;
    if (!rows.length) {
      postsBox.innerHTML = renderTableTools("posts") + wrapTable(`<table><tr><th>Status</th></tr><tr><td>No posts yet</td></tr></table>`) + renderPager("posts");
      return;
    }

    postsBox.innerHTML = renderTableTools("posts") + wrapTable(`
      <table>
        <tr>
          <th>${sortHeader("posts", "id", "ID")}</th>
          <th>${sortHeader("posts", "content", "Content")}</th>
          <th>${sortHeader("posts", "user", "User")}</th>
          <th>Action</th>
        </tr>
        ${rows.map(p => `
          <tr>
            <td>${p.id}</td>
            <td>${esc(p.content)}</td>
            <td>${Number(p.is_anonymous) ? 'Anonymous' : esc(p.full_name)}</td>
            <td class="row-actions"><button data-del-post="${p.id}">Delete</button></td>
          </tr>
        `).join("")}
      </table>
    `) + renderPager("posts");
  }

  function renderComments(rows) {
    if (!commentsBox) return;
    if (!rows.length) {
      commentsBox.innerHTML = renderTableTools("comments") + wrapTable(`<table><tr><th>Status</th></tr><tr><td>No comments yet</td></tr></table>`) + renderPager("comments");
      return;
    }

    commentsBox.innerHTML = renderTableTools("comments") + wrapTable(`
      <table>
        <tr>
          <th>${sortHeader("comments", "id", "ID")}</th>
          <th>${sortHeader("comments", "comment", "Comment")}</th>
          <th>${sortHeader("comments", "user", "User")}</th>
          <th>Action</th>
        </tr>
        ${rows.map(c => `
          <tr>
            <td>${c.id}</td>
            <td>${esc(c.content)}</td>
            <td>${esc(c.full_name)}</td>
            <td class="row-actions"><button data-del-comment="${c.id}">Delete</button></td>
          </tr>
        `).join("")}
      </table>
    `) + renderPager("comments");
  }

  function renderAllSections() {
  renderUsers(getPagedRows("users"));
  renderAvailability(getPagedRows("availability"));
  renderDoctorAvailability(getPagedRows("doctorAvailability"));
  renderPosts(getPagedRows("posts"));
  renderComments(getPagedRows("comments"));
  // Apply UI lock after all sections are rendered
  lockUI();
}


  async function loadDash() {

    const [st, posts, comments, users, availability, doctorAvailability] = await Promise.all([


      get(`${API}/admin/stats.php`),
      get(`${API}/admin/posts.php`),
      get(`${API}/admin/comments.php`),
      get(`${API}/admin/users.php`),
      get(`${API}/availability/list.php?all=1`),
      get(`${API}/availability/doctor_availability/get_all.php?all=1`)

    ]);



    state.posts.rows = Array.isArray(posts) ? posts : [];
    state.comments.rows = Array.isArray(comments) ? comments : [];
    state.users.rows = Array.isArray(users) ? users : [];
    state.availability.rows = providerRows(state.users.rows, Array.isArray(availability) ? availability : [], "lecturer");
    state.doctorAvailability.rows = providerRows(state.users.rows, Array.isArray(doctorAvailability) ? doctorAvailability : [], "doctor");
    state.posts.page = 1;

    state.comments.page = 1;
    state.users.page = 1;
    state.availability.page = 1;
    state.doctorAvailability.page = 1;


    renderStatsCards(st);


    renderAllSections();
  }

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";
    try {
      const u = await req(`${API}/auth/login.php`, {
        email: document.getElementById("adminEmail").value.trim(),
        password: document.getElementById("adminPassword").value
      });
      if (u.role !== "admin" && u.role !== "super_admin") throw new Error("Admin only");
      await showDashboard(u);
    } catch (err) {
      msg.textContent = err.message;
    }
  });

  createUserForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";

    const payload = {
      full_name: document.getElementById("newUserName").value.trim(),
      email: document.getElementById("newUserEmail").value.trim(),
      role: document.getElementById("newUserRole").value,
      password: document.getElementById("newUserPassword").value
    };

    try {
      await req(`${API}/admin/create_user.php`, payload);
      createUserForm.reset();
      document.getElementById("newUserRole").value = "doctor";
      msg.textContent = `${payload.role === "doctor" ? "Doctor" : "Lecturer"} account created`;
      await loadDash();
    } catch (err) {
      msg.textContent = err.message;
    }
  });

  document.addEventListener("click", async (e) => {
    const pageBtn = e.target.closest("[data-page-section]");
    const sortBtn = e.target.closest("[data-sort-section]");
    const userDel = e.target.closest("[data-del-user]");
    const p = e.target.closest("[data-del-post]");
    const c = e.target.closest("[data-del-comment]");
    const av = e.target.closest("[data-del-availability]");
    const dav = e.target.closest("[data-del-doctor-availability]");
    const addAvailability = e.target.closest("[data-add-availability]");


    try {

      if (pageBtn) {
        const section = pageBtn.dataset.pageSection;
        const target = pageBtn.dataset.pageTarget;
        const totalPages = getTotalPages(section);

        if (target === "prev" && state[section].page > 1) state[section].page -= 1;
        if (target === "next" && state[section].page < totalPages) state[section].page += 1;

        renderAllSections();
        return;
      }

      if (sortBtn) {
        const section = sortBtn.dataset.sortSection;
        const key = sortBtn.dataset.sortKey;
        if (!state[section]) return;

        if (state[section].sortKey === key) {
          state[section].sortDir = state[section].sortDir === "asc" ? "desc" : "asc";
        } else {
          state[section].sortKey = key;
          state[section].sortDir = key === "id" || key === "created" || key === "slots" ? "desc" : "asc";
        }
        state[section].page = 1;
        renderAllSections();
        return;
      }

      if (userDel) {
        const userId = Number(userDel.dataset.delUser);
        if (!userId) return;

        const confirmed = window.confirm("Remove this user and all related records?");
        if (!confirmed) return;

        await req(`${API}/admin/delete_user.php`, { id: userId });
        msg.textContent = "User removed";
        await loadDash();
        return;
      }

      if (addAvailability) {
        const type = addAvailability.dataset.addAvailability;
        const providerId = Number(addAvailability.dataset.providerId);
        const slotForm = addAvailability.closest("[data-slot-form]");
        const available_date = slotForm?.querySelector("[data-slot-date]")?.value || "";
        const start_time = slotForm?.querySelector("[data-slot-start]")?.value || "";
        const end_time = slotForm?.querySelector("[data-slot-end]")?.value || "";
        const note = slotForm?.querySelector("[data-slot-note]")?.value.trim() || "";

        if (!providerId || !available_date || !start_time || !end_time) {
          msg.textContent = "Please select date, start time, and end time";
          return;
        }

        await req(`${API}/availability/save.php`, {
          ...(type === "doctor" ? { doctor_id: providerId } : { lecturer_id: providerId }),
          available_date,
          start_time,
          end_time,
          note
        });
        msg.textContent = "Time slot added";
        await loadDash();
        return;
      }

      if (p) {
        await req(`${API}/posts/delete.php`, { id: Number(p.dataset.delPost) });
        await loadDash();
      }
      if (c) {
        await req(`${API}/comments/delete.php`, { id: Number(c.dataset.delComment) });
        await loadDash();
      }
      if (av) {
        await req(`${API}/availability/delete.php`, { id: Number(av.dataset.delAvailability) });
        await loadDash();
      }

      if (dav) {
        await req(`${API}/availability/doctor/delete.php`, { id: Number(dav.dataset.delDoctorAvailability) });
        await loadDash();
      }

    } catch (err) {

      msg.textContent = err.message;
    }
  });

  document.addEventListener("input", (e) => {
    const search = e.target.closest("[data-table-search]");
    if (!search) return;

    const section = search.dataset.tableSearch;
    if (!state[section]) return;

    state[section].query = search.value;
    state[section].page = 1;
    renderAllSections();

    const nextSearch = document.querySelector(`[data-table-search="${section}"]`);
    if (nextSearch) {
      nextSearch.focus();
      nextSearch.setSelectionRange(nextSearch.value.length, nextSearch.value.length);
    }
  });

  document.addEventListener("change", async (e) => {
    const role = e.target.closest("[data-role-user]");
    if (!role) return;
    try {
      await req(`${API}/admin/set_role.php`, {
        id: Number(role.dataset.roleUser),
        role: role.value
      });
      await loadDash();
    } catch (err) {
      msg.textContent = err.message;
      await loadDash();
    }
  });

  document.getElementById("adminLogoutBtn")?.addEventListener("click", async () => {
    await fetch(`${API}/auth/logout.php`, { method: "POST" });
    location.href = "index.html";
  });

  // Check current session and display appropriate view
  get(`${API}/auth/me.php`)
    .then(u => {
      if (u.role === "admin" || u.role === "super_admin") {
        // User is admin or super admin, show dashboard directly
        showDashboard(u);
        // Not admin or no session: keep login form visible (do nothing)
      }
    })
    .catch(() => {
      // On error (e.g., not logged in), keep login form visible (do nothing)
    });
})();
