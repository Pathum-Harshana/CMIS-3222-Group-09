(() => {
  const API = `${window.location.origin}/Aurahub/api`;
  const form = document.getElementById("adminLoginForm");
  const panel = document.getElementById("adminPanel");
  const msg = document.getElementById("adminMsg");
  const statsCards = document.getElementById("adminStatsCards");
  const postsBox = document.getElementById("adminPosts");
  const commentsBox = document.getElementById("adminComments");
  const resourceBox = document.getElementById("adminResourceRequests");

  const req = async (u,b)=>{
    const r = await fetch(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b||{})});
    const j = await r.json();
    if(!r.ok || !j.success) throw new Error(j.message || "Failed");
    return j.data;
  };
  const get = async (u)=>{
    const r = await fetch(u);
    const j = await r.json();
    if(!r.ok || !j.success) throw new Error(j.message || "Failed");
    return j.data;
  };

  const esc = (s)=>String(s ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
  const wrapTable = (html)=>`<div class="table-wrap">${html}</div>`;

  function statusBadge(status){
    const s = String(status || "pending").toLowerCase();
    return `<span class="status-badge ${s}">${s}</span>`;
  }

  function actionLabel(status){
    const s = String(status || "pending").toLowerCase();
    if (s === "completed") return "Undo";
    if (s === "pending") return "Mark as completed";
    return "Mark as completed";
  }

  function actionNextStatus(status){
    const s = String(status || "pending").toLowerCase();
    if (s === "completed") return "pending";
    if (s === "pending") return "completed";
    return "completed";
  }

  function renderStatsCards(st){
    statsCards.innerHTML = `
      <article class="stat-card"><h5>TOTAL USERS</h5><h2>${st.users ?? 0}</h2></article>
      <article class="stat-card"><h5>TOTAL POSTS</h5><h2>${st.posts ?? 0}</h2></article>
      <article class="stat-card"><h5>TOTAL COMMENTS</h5><h2>${st.comments ?? 0}</h2></article>
      <article class="stat-card"><h5>TALENT PROFILES</h5><h2>${st.talent_profiles ?? 0}</h2></article>
      <article class="stat-card"><h5>RESOURCE REQUESTS</h5><h2>${st.resource_requests ?? 0}</h2></article>
    `;
  }

  function renderResourceRequests(rows){
    if(!rows.length){
      resourceBox.innerHTML = wrapTable(`<table><tr><th>Status</th></tr><tr><td>No resource requests yet</td></tr></table>`);
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
        ${rows.map(r=>`
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
    `);
  }

  function renderPosts(rows){
    postsBox.innerHTML = wrapTable(`
      <table>
        <tr><th>ID</th><th>Content</th><th>User</th><th>Action</th></tr>
        ${rows.map(p=>`
          <tr>
            <td>${p.id}</td>
            <td>${esc(p.content)}</td>
            <td>${esc(p.full_name)}</td>
            <td class="row-actions"><button data-del-post="${p.id}">Delete</button></td>
          </tr>
        `).join("")}
      </table>
    `);
  }

  function renderComments(rows){
    commentsBox.innerHTML = wrapTable(`
      <table>
        <tr><th>ID</th><th>Comment</th><th>User</th><th>Action</th></tr>
        ${rows.map(c=>`
          <tr>
            <td>${c.id}</td>
            <td>${esc(c.content)}</td>
            <td>${esc(c.full_name)}</td>
            <td class="row-actions"><button data-del-comment="${c.id}">Delete</button></td>
          </tr>
        `).join("")}
      </table>
    `);
  }

  async function loadDash() {
    const [st, posts, comments, resources] = await Promise.all([
      get(`${API}/admin/stats.php`),
      get(`${API}/admin/posts.php`),
      get(`${API}/admin/comments.php`),
      get(`${API}/admin/resource_requests.php`)
    ]);

    renderStatsCards(st);
    renderResourceRequests(Array.isArray(resources) ? resources : []);
    renderPosts(Array.isArray(posts) ? posts : []);
    renderComments(Array.isArray(comments) ? comments : []);
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
      form.classList.remove("active");
      form.classList.add("hidden");
      panel.classList.remove("hidden");
      await loadDash();
    } catch (err) {
      msg.textContent = err.message;
    }
  });

  document.addEventListener("click", async (e) => {
    const p = e.target.closest("[data-del-post]");
    const c = e.target.closest("[data-del-comment]");
    const rr = e.target.closest("[data-rr-id]");

    try {
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
    } catch (err) {
      msg.textContent = err.message;
    }
  });

  document.getElementById("adminLogoutBtn")?.addEventListener("click", async () => {
    await fetch(`${API}/auth/logout.php`, { method:"POST" });
    location.href = "index.html";
  });
})();