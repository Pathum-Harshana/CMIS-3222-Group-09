(() => {
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

  const path = window.location.pathname;
  const basePath = path.endsWith("/")
    ? path
    : (path.includes(".") ? path.replace(/\/[^/]*$/, "/") : `${path}/`);
  const API = `${window.location.origin}${basePath}api`;

  const form = document.getElementById("adminLoginForm");
  const panel = document.getElementById("adminPanel");
  const msg = document.getElementById("adminMsg");
  const statsCards = document.getElementById("adminStatsCards");
  const postsBox = document.getElementById("adminPosts");
  const commentsBox = document.getElementById("adminComments");
  const resourceBox = document.getElementById("adminResourceRequests");
  const usersBox = document.getElementById("adminUsers");
  const availabilityBox = document.getElementById("adminAvailability");

  const PAGE_SIZE = 5;

  const state = {
    users: { rows: [], page: 1 },
    availability: { rows: [], page: 1 },
    resources: { rows: [], page: 1 },
    posts: { rows: [], page: 1 },
    comments: { rows: [], page: 1 }
  };

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

  const showDashboard = async () => {
    form.classList.remove("active");
    form.classList.add("hidden");
    panel.classList.remove("hidden");
    await loadDash();
  };

  const esc = (s) => String(s ?? "")
    .replaceAll("&", "&")
    .replaceAll("<", "<")
    .replaceAll(">", ">");

  const wrapTable = (html) => `<div class="table-wrap">${html}</div>`;

  const getTotalPages = (section) => {
    const total = state[section].rows.length;
    return Math.max(1, Math.ceil(total / PAGE_SIZE));
  };

  const clampPage = (section) => {
    const totalPages = getTotalPages(section);
    if (state[section].page > totalPages) state[section].page = totalPages;
    if (state[section].page < 1) state[section].page = 1;
  };

  const getPagedRows = (section) => {
    const current = state[section];
    clampPage(section);
    const start = (current.page - 1) * PAGE_SIZE;
    return current.rows.slice(start, start + PAGE_SIZE);
  };

  const renderPager = (section) => {
    const current = state[section];
    const totalPages = getTotalPages(section);
    const total = current.rows.length;
    const start = total === 0 ? 0 : ((current.page - 1) * PAGE_SIZE) + 1;
    const end = total === 0 ? 0 : Math.min(current.page * PAGE_SIZE, total);

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

  function statusBadge(status) {
    const s = String(status || "pending").toLowerCase();
    return `<span class="status-badge ${s}">${s}</span>`;
  }

  function actionLabel(status) {
    const s = String(status || "pending").toLowerCase();
    if (s === "completed") return "Undo";
    if (s === "pending") return "Mark as completed";
    return "Mark as completed";
  }

  function actionNextStatus(status) {
    const s = String(status || "pending").toLowerCase();
    if (s === "completed") return "pending";
    if (s === "pending") return "completed";
    return "completed";
  }

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
    return `<select class="role-select" data-role-user="${u.id}">
      ${["student", "lecturer", "admin"].map(role => `<option value="${role}" ${u.role === role ? "selected" : ""}>${role}</option>`).join("")}
    </select>`;
  }

  function renderUsers(rows) {
    if (!usersBox) return;
    if (!rows.length) {
      usersBox.innerHTML = wrapTable(`<table><tr><th>Status</th></tr><tr><td>No users found</td></tr></table>`) + renderPager("users");
      return;
    }
    usersBox.innerHTML = wrapTable(`
      <table>
        <tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Created</th></tr>
        ${rows.map(u => `
          <tr>
            <td>${u.id}</td>
            <td>${esc(u.full_name)}</td>
            <td>${esc(u.email)}</td>
            <td>${roleSelect(u)}</td>
            <td>${esc(u.created_at)}</td>
          </tr>
        `).join("")}
      </table>
    `) + renderPager("users");
  }

  function renderAvailability(rows) {
    if (!availabilityBox) return;
    if (!rows.length) {
      availabilityBox.innerHTML = wrapTable(`<table><tr><th>Status</th></tr><tr><td>No mentor availability yet</td></tr></table>`) + renderPager("availability");
      return;
    }
    availabilityBox.innerHTML = wrapTable(`
      <table>
        <tr><th>ID</th><th>Lecturer</th><th>Email</th><th>Date</th><th>Time</th><th>Note</th><th>Action</th></tr>
        ${rows.map(a => `
          <tr>
            <td>${a.id}</td>
            <td>${esc(a.lecturer_name)}</td>
            <td>${esc(a.lecturer_email)}</td>
            <td>${esc(a.available_date)}</td>
            <td>${esc(String(a.start_time).slice(0, 5))} - ${esc(String(a.end_time).slice(0, 5))}</td>
            <td>${esc(a.note || "")}</td>
            <td class="row-actions"><button data-del-availability="${a.id}">Remove</button></td>
          </tr>
        `).join("")}
      </table>
    `) + renderPager("availability");
  }

  function renderResourceRequests(rows) {
    if (!resourceBox) return;
    if (!rows.length) {
      resourceBox.innerHTML = wrapTable(`<table><tr><th>Status</th></tr><tr><td>No resource requests yet</td></tr></table>`) + renderPager("resources");
      return;
    }

    resourceBox.innerHTML = wrapTable(`
      <table>
        <tr>
          <th>ID</th>
          <th>Type</th>
          <th>Email</th>
          <th>Student</th>
          <th>Status</th>
          <th>Created</th>
          <th>Action</th>
        </tr>
        ${rows.map(r => `
          <tr>
            <td>${r.id}</td>
            <td>${esc(r.request_type)}</td>
            <td>${esc(r.requester_email)}</td>
            <td>${esc(r.full_name)}</td>
            <td>${statusBadge(r.status)}</td>
            <td>${esc(r.created_at)}</td>
            <td class="row-actions">
              <button class="status-btn" data-rr-id="${r.id}" data-rr-next="${actionNextStatus(r.status)}">
                ${actionLabel(r.status)}
              </button>
            </td>
          </tr>
        `).join("")}
      </table>
    `) + renderPager("resources");
  }

  function renderPosts(rows) {
    if (!postsBox) return;
    if (!rows.length) {
      postsBox.innerHTML = wrapTable(`<table><tr><th>Status</th></tr><tr><td>No posts yet</td></tr></table>`) + renderPager("posts");
      return;
    }

    postsBox.innerHTML = wrapTable(`
      <table>
        <tr><th>ID</th><th>Content</th><th>User</th><th>Action</th></tr>
        ${rows.map(p => `
          <tr>
            <td>${p.id}</td>
            <td>${esc(p.content)}</td>
            <td>${esc(p.full_name)}</td>
            <td class="row-actions"><button data-del-post="${p.id}">Delete</button></td>
          </tr>
        `).join("")}
      </table>
    `) + renderPager("posts");
  }

  function renderComments(rows) {
    if (!commentsBox) return;
    if (!rows.length) {
      commentsBox.innerHTML = wrapTable(`<table><tr><th>Status</th></tr><tr><td>No comments yet</td></tr></table>`) + renderPager("comments");
      return;
    }

    commentsBox.innerHTML = wrapTable(`
      <table>
        <tr><th>ID</th><th>Comment</th><th>User</th><th>Action</th></tr>
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
    renderResourceRequests(getPagedRows("resources"));
    renderPosts(getPagedRows("posts"));
    renderComments(getPagedRows("comments"));
  }

  async function loadDash() {
    const [st, posts, comments, resources, users, availability] = await Promise.all([
      get(`${API}/admin/stats.php`),
      get(`${API}/admin/posts.php`),
      get(`${API}/admin/comments.php`),
      get(`${API}/admin/resource_requests.php`),
      get(`${API}/admin/users.php`),
      get(`${API}/availability/list.php?all=1`)
    ]);

    state.posts.rows = Array.isArray(posts) ? posts : [];
    state.comments.rows = Array.isArray(comments) ? comments : [];
    state.resources.rows = Array.isArray(resources) ? resources : [];
    state.users.rows = Array.isArray(users) ? users : [];
    state.availability.rows = Array.isArray(availability) ? availability : [];

    state.posts.page = 1;
    state.comments.page = 1;
    state.resources.page = 1;
    state.users.page = 1;
    state.availability.page = 1;

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
      if (u.role !== "admin") throw new Error("Admin only");
      await showDashboard();
    } catch (err) {
      console.error("Admin login error:", err);
      msg.textContent = err.message;
    }
  });

  document.addEventListener("click", async (e) => {
    const pageBtn = e.target.closest("[data-page-section]");
    const p = e.target.closest("[data-del-post]");
    const c = e.target.closest("[data-del-comment]");
    const rr = e.target.closest("[data-rr-id]");
    const av = e.target.closest("[data-del-availability]");

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

      if (p) {
        await req(`${API}/posts/delete.php`, { id: Number(p.dataset.delPost) });
        await loadDash();
      }
      if (c) {
        await req(`${API}/comments/delete.php`, { id: Number(c.dataset.delComment) });
        await loadDash();
      }
      if (rr) {
        await req(`${API}/admin/update_resource_request_status.php`, {
          id: Number(rr.dataset.rrId),
          status: rr.dataset.rrNext
        });
        await loadDash();
      }
      if (av) {
        await req(`${API}/availability/delete.php`, { id: Number(av.dataset.delAvailability) });
        await loadDash();
      }
    } catch (err) {
      msg.textContent = err.message;
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
    }
  });

  document.getElementById("adminLogoutBtn")?.addEventListener("click", async () => {
    await fetch(`${API}/auth/logout.php`, { method: "POST" });
    location.href = "index.html";
  });

  get(`${API}/auth/me.php`)
    .then(u => {
      if (u.role === "admin") return showDashboard();
    })
    .catch(() => {});
})();
