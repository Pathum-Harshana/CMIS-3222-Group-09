(() => {
  const API = `${window.location.origin}/Aurahub/api`;
  const PAGE = document.body.dataset.page || "";
  const POST_FLAG = "aurahub_local_post_flags";
  const COMMENT_FLAG = "aurahub_local_comment_flags";
  const MOOD_KEY = "aurahub_selected_mood";

  const $ = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
  const esc = (s)=>String(s ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
  const jget = (k)=>{ try { return JSON.parse(localStorage.getItem(k)||"{}"); } catch { return {}; } };
  const jset = (k,v)=>localStorage.setItem(k, JSON.stringify(v));
  const toast = (m)=>{ const c=$("#toastContainer"); if(!c) return; const d=document.createElement("div"); d.className="toast"; d.textContent=m; c.appendChild(d); setTimeout(()=>d.remove(),1800); };

  const setRoleVisibility = async () => {
    try {
      const me = await fetchJSON(`${API}/auth/me.php`);
      const isLecturer = me?.role === "lecturer";
      $$('[data-role="lecturer"]').forEach(el => {
        el.classList.toggle("hidden", !isLecturer);
      });
    } catch {
      $$('[data-role="lecturer"]').forEach(el => {
        el.classList.add("hidden");
      });
    }
  };

  setRoleVisibility();

  async function fetchJSON(url,opt={}){ const merged={ credentials:"include", ...opt }; const r=await fetch(url,merged); const j=await r.json(); if(!r.ok||!j.success) throw new Error(j.message||"Failed"); return j.data; }
  async function ensureAuth(){ try{ return await fetchJSON(`${API}/auth/me.php`);}catch{ location.href="index.html"; throw new Error("Unauthorized"); } }

  window.AuraHubAuth = {
    logout: async()=>{ await fetch(`${API}/auth/logout.php`,{method:"POST"}); location.href="index.html"; }
  };
  $$("[data-logout]").forEach(btn => {
    btn.addEventListener("click", () => window.AuraHubAuth.logout());
  });

  function renderBookingCalendar(grid, title, selectedDate, onSelect) {
    if (!grid) return;
    const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const firstDay = monthStart.getDay();
    const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
    const headers = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    if (title) {
      title.textContent = selectedDate.toLocaleDateString(undefined, { month:"short", day:"numeric", year:"numeric" });
    }
    grid.innerHTML = headers.map(day => `<span class="calendar-weekday">${day}</span>`).join("");
    for (let i = 0; i < firstDay; i++) {
      grid.insertAdjacentHTML("beforeend", `<span class="calendar-empty"></span>`);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const active = day === selectedDate.getDate();
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = active ? "active" : "";
      btn.textContent = String(day);
      btn.addEventListener("click", () => {
        onSelect(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day));
      });
      grid.appendChild(btn);
    }
  }

  const fmtDate = (value) => {
    const d = new Date(`${value}T00:00:00`);
    return isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, { month:"short", day:"numeric", year:"numeric" });
  };
  const fmtTime = (value) => String(value || "").slice(0, 5);
  const slotLabel = (slot) => `${fmtTime(slot.start_time)} - ${fmtTime(slot.end_time)}`;

  if(PAGE==="wall"){
    let posts=[], commentsByPost={}, openComments={}, openAllComments={};
    let selectedMood = localStorage.getItem(MOOD_KEY) || "";
    let visiblePosts = null;
    const feed=$("#feed"), feedEmpty=$("#feedEmpty"), postInput=$("#postInput"), postBtn=$("#postBtn"), char=$("#charCount");
    const search=$("#globalSearch"), clear=$("#clearSearch"), moodChips=$$(".mood-chip");
    const feedPrevBtn = $("#feedPrevBtn");
    const feedNextBtn = $("#feedNextBtn");
    const feedPageInfo = $("#feedPageInfo");
    const wallSection = $("#wallSection");
    const lecturerSection = $("#lecturerSection");
    const wallNavButtons = $$('[data-view]');

    const FEED_PREVIEW_LIMIT = 180;
    const FEED_PAGE_SIZE = 2;
    let currentPage = 1;
    const esc=(s)=>String(s||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
    const fmt=(t)=>{ const d=new Date(t); return isNaN(d.getTime())?t:d.toLocaleString(); };

    const togglePost=(id)=>{ const m=jget(POST_FLAG); const k=String(id); m[k]=!m[k]; jset(POST_FLAG,m); return m[k]; };



    const moodValueOf = (el) => (el?.dataset?.mood || el?.getAttribute("data-mood") || "").trim().toLowerCase();

    const setWallView = (view) => {
      if (!wallSection || !lecturerSection) return;
      const showLecturer = view === "lecturer";
      wallSection.classList.toggle("hidden", showLecturer);
      lecturerSection.classList.toggle("hidden", !showLecturer);
      wallNavButtons.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.view === view);
      });
    };

    const syncWallView = () => {
      if (!lecturerSection) return;
      const view = location.hash === "#lecturer" ? "lecturer" : "wall";
      setWallView(view);
    };

    if (lecturerSection) {
      window.addEventListener("hashchange", syncWallView);
      syncWallView();
    }

    const paintMood=()=>moodChips.forEach(ch=>{
      ch.classList.toggle("active", moodValueOf(ch) === selectedMood);
    });

    const truncateText = (text, limit) => {
      const raw = String(text || "");
      if (raw.length <= limit) return { short: raw, trimmed: false };
      const slice = raw.slice(0, limit);
      const safeSlice = slice.replace(/\s+\S*$/, "").trimEnd();
      const short = (safeSlice || slice).trimEnd();
      return { short: `${short}…`, trimmed: true };
    };

    moodChips.forEach(ch=>ch.addEventListener("click",(e)=>{
      const mood = moodValueOf(e.currentTarget);
      if(!mood) return toast("Mood option not recognized");
      selectedMood = mood;
      localStorage.setItem(MOOD_KEY, selectedMood);
      paintMood();
      toast(`Mood selected: ${selectedMood}`);
    }));

    paintMood();

    const api = {
      posts: ()=>fetchJSON(`${API}/posts/list.php`),
      createPost: (content,mood)=>fetchJSON(`${API}/posts/create.php`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({content,mood})}),
      deletePost: (id)=>fetchJSON(`${API}/posts/delete.php`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})}),
      comments: (post_id)=>fetchJSON(`${API}/comments/list.php?post_id=${post_id}`),
      createComment: (post_id,content)=>fetchJSON(`${API}/comments/create.php`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({post_id,content})}),
      deleteComment: (id)=>fetchJSON(`${API}/comments/delete.php`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})})
    };

    function renderComment(c){
      return `<div class="comment-item" data-comment-id="${c.id}">
        <div class="comment-meta">Anonymous • ${fmt(c.created_at)}</div>
        <div class="comment-text">${esc(c.content)}</div>
          <div class="comment-actions">
          <button class="comment-action-btn delete" data-action="comment-delete"><i class="fa-solid fa-trash"></i> Delete</button>
        </div>
      </div>`;
    }

    function render(list=visiblePosts || posts){
      visiblePosts = list;
      feed.innerHTML = "";

      // FIX: postFlagged was referenced but never defined.
      // Use the existing togglePost() logic (backed by localStorage) as the flag state.
      const postFlagged = (postId) => !!jget(POST_FLAG)[String(postId)] || false;

      const totalPages = Math.max(1, Math.ceil(list.length / FEED_PAGE_SIZE));
      currentPage = Math.min(currentPage, totalPages);
      const start = (currentPage - 1) * FEED_PAGE_SIZE;
      const visibleList = list.slice(start, start + FEED_PAGE_SIZE);
      visibleList.forEach(p=>{
        // const flagged = togglePost(p.id); // not used for rendering; avoid side-effects
        const flagged = postFlagged(p.id);
        const cmts = (commentsByPost[p.id] || [])
          .slice()
          .sort((a,b)=> new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const open = !!openComments[p.id];
        const showAll = !!openAllComments[p.id];
        const hasHidden = cmts.length > 1;
        const visibleComments = showAll ? cmts : cmts.slice(0, 1);
        const n=document.createElement("article");
        const rawContent = String(p.content || "");
        const { short, trimmed } = truncateText(rawContent, FEED_PREVIEW_LIMIT);
        const shortSafe = esc(short);
        const fullSafe = esc(rawContent);
        const bodyHtml = trimmed
          ? `<p class="feed-body">
              <span class="feed-text feed-text-short">${shortSafe}</span>
              <span class="feed-text feed-text-full hidden">${fullSafe}</span>
            </p>
            <button class="feed-link" data-action="feed-toggle">Read more</button>`
          : `<p class="feed-body">${fullSafe}</p>`;
        n.className="feed-item"; n.dataset.id=p.id;
        n.innerHTML = `

          <div class="feed-head"><strong>Anonymous Peer</strong><small>${fmt(p.created_at)}</small></div>
          ${bodyHtml}
          <div class="feed-actions">
            <button class="feed-btn" data-action="copy">Copy</button>
            <button class="feed-btn" data-action="delete"><i class="fa-solid fa-trash"></i> Delete</button>
            <button class="feed-btn ${open?"active":""}" data-action="comment-toggle">Comments (${cmts.length})</button>
          </div>
          <div class="comments-wrap ${open?"":"hidden"}">
            <div class="comments-list">${cmts.length?visibleComments.map(renderComment).join(""):`<div class="comment-meta">No comments yet.</div>`}</div>
            ${hasHidden ? `<button class="feed-link" data-action="comment-expand">${showAll ? "Hide older comments" : "Show all comments"}</button>` : ""}
            <div class="comment-form"><input class="comment-input" maxlength="300" placeholder="Write anonymous comment..." /><button class="comment-btn" data-action="comment-submit">Send</button></div>
          </div>`;
        feed.appendChild(n);
      });

      if (feedPageInfo) {
        feedPageInfo.textContent = `Page ${currentPage} of ${Math.max(1, Math.ceil(list.length / FEED_PAGE_SIZE))}`;
      }
      feedPrevBtn?.toggleAttribute("disabled", currentPage <= 1);
      feedNextBtn?.toggleAttribute("disabled", currentPage >= Math.max(1, Math.ceil(list.length / FEED_PAGE_SIZE)));
      feedEmpty?.classList.toggle("hidden", list.length>0);
    }

    async function load() {
      posts = await api.posts();
      posts = posts.sort((a,b)=> new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      visiblePosts = posts;
      currentPage = 1;
      const all = await Promise.all(posts.map(async p=>[p.id, await api.comments(p.id).catch(()=>[])]));
      commentsByPost = Object.fromEntries(all);
      render(posts);
    }

    postInput?.addEventListener("input", ()=>char.textContent=`${postInput.value.length}/600`);
    postBtn?.addEventListener("click", async()=>{
      const content = (postInput.value||"").trim();
      if(!content) return toast("Please write something first.");
      await api.createPost(content, selectedMood || null);
      postInput.value=""; char.textContent="0/600";
      await load(); toast("Posted");
    });

    search?.addEventListener("input", ()=>{
      const q=(search.value||"").trim().toLowerCase();
      currentPage = 1;
      visiblePosts = q ? posts.filter(p=>(p.content||"").toLowerCase().includes(q)) : posts;
      render(visiblePosts);
    });
    clear?.addEventListener("click", ()=>{ search.value=""; currentPage = 1; visiblePosts = posts; render(visiblePosts); });
    feedPrevBtn?.addEventListener("click", ()=>{ if(currentPage > 1){ currentPage -= 1; render(visiblePosts); } });
    feedNextBtn?.addEventListener("click", ()=>{ currentPage += 1; render(visiblePosts); });

    feed?.addEventListener("click", async (e)=>{
      const btn = e.target.closest("[data-action]"); if(!btn) return;
      const card = btn.closest(".feed-item"); const pid = Number(card?.dataset.id||0); if(!pid) return;

      if(btn.dataset.action==="copy"){ navigator.clipboard.writeText(card.querySelector(".feed-body")?.textContent||""); return toast("Copied"); }
      if(btn.dataset.action==="feed-toggle"){
        const shortText = card.querySelector(".feed-text-short");
        const fullText = card.querySelector(".feed-text-full");
        if (!shortText || !fullText) return;
        const expanded = !fullText.classList.contains("hidden");
        fullText.classList.toggle("hidden", expanded);
        shortText.classList.toggle("hidden", !expanded);
        btn.textContent = expanded ? "Read more" : "Read less";
        return;
      }

      if(btn.dataset.action==="delete"){ await api.deletePost(pid); await load(); return toast("Post deleted permanently"); }
      if(btn.dataset.action==="comment-toggle"){ openComments[pid]=!openComments[pid]; if(openComments[pid]) commentsByPost[pid]=await api.comments(pid).catch(()=>[]); return render(visiblePosts || posts); }
      if(btn.dataset.action==="comment-expand"){ openAllComments[pid]=!openAllComments[pid]; return render(visiblePosts || posts); }
      if(btn.dataset.action==="comment-submit"){
        const input = card.querySelector(".comment-input");
        const content = (input?.value||"").trim();
        if(!content) return toast("Write a comment first");
        await api.createComment(pid, content);
        commentsByPost[pid]=await api.comments(pid); openComments[pid]=true; render(visiblePosts || posts); return toast("Comment added");
      }

      if(btn.dataset.action==="comment-delete"){
        const cid = Number(btn.closest(".comment-item")?.dataset.commentId||0);
        if(!cid) return;
        await api.deleteComment(cid);
        commentsByPost[pid]=await api.comments(pid); openComments[pid]=true; render(visiblePosts || posts); return toast("Comment deleted permanently");
      }
    });

    ensureAuth().then(load).catch(err=>toast(err.message));
  }

  if(PAGE==="mood"){
    ensureAuth().then(async()=>{
      const posts = await fetchJSON(`${API}/posts/list.php`);
      const moodPosts = posts
        .filter(p => p.mood && p.created_at)
        .map(p => ({ mood:String(p.mood).toLowerCase(), created_at:new Date(p.created_at) }))
        .filter(p => !isNaN(p.created_at.getTime()));

      const moodScore = {happy:5, calm:4, neutral:3, anxious:2, stressed:1};
      const moodLabel = {happy:"Happy", calm:"Calm", neutral:"Neutral", anxious:"Anxious", stressed:"Stressed"};
      const moodColor = {happy:"#22c55e", calm:"#2dd4bf", neutral:"#f59e0b", anxious:"#fb7185", stressed:"#ef4444"};
      const toDayKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

      const overallMoodScore = $("#overallMoodScore");
      const overallMoodScoreText = $("#overallMoodScoreText");
      const consistency7 = $("#consistency7");
      const consistency7Text = $("#consistency7Text");
      const moodStreak = $("#moodStreak");
      const moodStreakText = $("#moodStreakText");
      const riskIndicator = $("#riskIndicator");
      const riskIndicatorText = $("#riskIndicatorText");
      const trendSummary = $("#trendSummary");
      const recoverySignal = $("#recoverySignal");
      const supportRecommendation = $("#supportRecommendation");
      const nextActions = $("#nextActions");

      const freqBars = $("#freqBars");
      const riskMeterFill = $("#riskMeterFill");
      const riskMeterValue = $("#riskMeterValue");
      const riskMeterLabel = $("#riskMeterLabel");
      const checkinHeatStrip = $("#checkinHeatStrip");

      const now = new Date(); now.setHours(0,0,0,0);

      if (!moodPosts.length) {
        overallMoodScore.textContent = "0/100";
        overallMoodScoreText.textContent = "No mood logs yet. Start logging to unlock insights.";
        consistency7.textContent = "0%";
        consistency7Text.textContent = "No daily check-ins in the last 7 days.";
        moodStreak.textContent = "0 Days";
        moodStreakText.textContent = "Begin a check-in streak today.";
        riskIndicator.textContent = "Unknown";
        riskIndicatorText.textContent = "Need more data to estimate emotional risk.";
        trendSummary.textContent = "No data available yet. Add mood-tagged posts to see your emotional direction.";
        recoverySignal.textContent = "We’ll detect recovery when we have a sequence of daily entries.";
        supportRecommendation.textContent = "If you feel overwhelmed now, use Resource Hub to request counselling.";
        nextActions.innerHTML = `<li>Log at least one mood entry today.</li><li>Continue for 7 days to unlock meaningful trend insights.</li>`;

        freqBars.innerHTML = Object.keys(moodLabel).map(k=>`
          <div class="freq-row">
            <span class="freq-label">${moodLabel[k]}</span>
            <div class="freq-track"><div class="freq-fill" style="width:0%;background:${moodColor[k]}"></div></div>
            <span class="freq-value">0</span>
          </div>
        `).join("");

        riskMeterFill.style.width = "0%";
        riskMeterFill.style.background = "#64748b";
        riskMeterValue.textContent = "0%";
        riskMeterLabel.textContent = "No data";

        const days = [];
        for(let i=13;i>=0;i--){ const d=new Date(now); d.setDate(now.getDate()-i); days.push(d); }
        checkinHeatStrip.innerHTML = days.map(()=>`<span class="heat-cell none"></span>`).join("");
        return;
      }

      const latest30 = [...moodPosts].sort((a,b)=>b.created_at-a.created_at).slice(0,30);
      const avgScoreRaw = latest30.reduce((s,p)=>s+(moodScore[p.mood]||3),0) / latest30.length;
      const avgScore100 = Math.round((avgScoreRaw/5)*100);
      overallMoodScore.textContent = `${avgScore100}/100`;
      overallMoodScoreText.textContent = avgScore100 >= 75
        ? "Strong positive emotional direction in recent entries."
        : avgScore100 >= 55
          ? "Moderate emotional balance with room for improvement."
          : "Low emotional balance detected. Please consider supportive action.";

      const last7Days = [];
      for(let i=6;i>=0;i--){ const d=new Date(now); d.setDate(now.getDate()-i); last7Days.push(d); }
      const daySet = new Set(moodPosts.map(p=>toDayKey(p.created_at)));
      const checkedDays = last7Days.filter(d=>daySet.has(toDayKey(d))).length;
      const consistencyPct = Math.round((checkedDays/7)*100);
      consistency7.textContent = `${consistencyPct}%`;
      consistency7Text.textContent = `${checkedDays}/7 days logged in the last week.`;

      let streak = 0; let cursor = new Date(now);
      while (daySet.has(toDayKey(cursor))) { streak++; cursor.setDate(cursor.getDate()-1); }
      moodStreak.textContent = `${streak} Days`;
      moodStreakText.textContent = streak >= 5 ? "Great consistency. Keep this momentum." : "Try daily check-ins to build stronger insights.";

      const latest14 = [...moodPosts].sort((a,b)=>b.created_at-a.created_at).slice(0,14);
      const riskCount = latest14.filter(p=>p.mood==="anxious" || p.mood==="stressed").length;
      const riskPct = latest14.length ? Math.round((riskCount/latest14.length)*100) : 0;
      let risk = "Low";
      if (riskPct >= 60) risk = "High"; else if (riskPct >= 35) risk = "Medium";
      riskIndicator.textContent = risk;
      riskIndicatorText.textContent = risk === "High"
        ? "Frequent anxious/stressed moods in recent entries."
        : risk === "Medium"
          ? "Some elevated stress patterns detected."
          : "Current pattern looks emotionally manageable.";

      const counts = {happy:0, calm:0, neutral:0, anxious:0, stressed:0};
      latest30.forEach(p=>{ if (counts[p.mood] !== undefined) counts[p.mood]++; });

      freqBars.innerHTML = Object.keys(moodLabel).map(k=>{
        const v = counts[k] || 0;
        const pct = latest30.length ? Math.round((v/latest30.length)*100) : 0;
        return `<div class="freq-row">
          <span class="freq-label">${moodLabel[k]}</span>
          <div class="freq-track"><div class="freq-fill" style="width:${pct}%;background:${moodColor[k]}"></div></div>
          <span class="freq-value">${v}</span>
        </div>`;
      }).join("");

      riskMeterFill.style.width = `${riskPct}%`;
      riskMeterFill.style.background = risk === "High" ? "#ef4444" : risk === "Medium" ? "#f59e0b" : "#22c55e";
      riskMeterValue.textContent = `${riskPct}%`;
      riskMeterLabel.textContent = risk === "High" ? "High emotional risk zone" : risk === "Medium" ? "Moderate emotional risk zone" : "Low emotional risk zone";

      const days14 = [];
      for(let i=13;i>=0;i--){ const d=new Date(now); d.setDate(now.getDate()-i); days14.push(d); }
      checkinHeatStrip.innerHTML = days14.map(d=>{
        const key = toDayKey(d);
        const items = moodPosts.filter(p=>toDayKey(p.created_at)===key);
        if (!items.length) return `<span class="heat-cell none" title="${key}: no log"></span>`;
        const avg = items.reduce((s,p)=>s+(moodScore[p.mood]||3),0)/items.length;
        const lvl = avg >= 4.2 ? "good" : avg >= 3 ? "mid" : "low";
        return `<span class="heat-cell ${lvl}" title="${key}: avg ${avg.toFixed(2)}"></span>`;
      }).join("");

      const weekly = last7Days.map(d=>{
        const key = toDayKey(d);
        const items = moodPosts.filter(p=>toDayKey(p.created_at)===key);
        const avg = items.length ? items.reduce((s,p)=>s+(moodScore[p.mood]||3),0)/items.length : 0;
        return {avg,count:items.length};
      });
      const vals = weekly.filter(w=>w.count).map(w=>w.avg);
      const half = Math.floor(vals.length/2);
      const first = vals.slice(0,half), second = vals.slice(half);
      const avg = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
      const direction = avg(second)-avg(first);

      trendSummary.textContent = direction > 0.35
        ? "Mood direction is improving this week."
        : direction < -0.35
          ? "Mood direction declined this week. Consider rest and support."
          : "Mood direction is relatively stable this week.";

      const last6 = [...moodPosts].sort((a,b)=>b.created_at-a.created_at).slice(0,6).map(p=>moodScore[p.mood]||3);
      const recovering = last6.length >= 4 && last6[0] >= last6[last6.length-1];
      recoverySignal.textContent = recovering
        ? "Positive recovery signal: latest entries are better than earlier ones."
        : "Recovery signal is weak right now. Gentle routines can help improve it.";

      if (risk === "High") {
        supportRecommendation.textContent = "High risk pattern: please book counselling in Resource Hub as early support.";
      } else if (risk === "Medium") {
        supportRecommendation.textContent = "Moderate risk: monitor daily and consider a counselling session if stress continues.";
      } else {
        supportRecommendation.textContent = "Low risk pattern: continue consistent check-ins and maintain healthy routines.";
      }

      const actions = [];
      if (consistencyPct < 60) actions.push("Log one mood entry every day for the next 7 days.");
      if (risk !== "Low") actions.push("Use Resource Hub to request counselling support.");
      if (avgScore100 < 60) actions.push("Prioritize sleep, hydration, and short daily breaks.");
      actions.push("Review weekly what improved your calm/happy days.");
      nextActions.innerHTML = actions.map(a=>`<li>${a}</li>`).join("");
    }).catch(err=>toast(err.message));
  }

  if(PAGE==="talent"){
    let me = null;
    const cards = $("#talentCards");
    const empty = $("#talentEmpty");
    const searchInput = $("#talentSearchInput");
    const categoryFilter = $("#talentCategoryFilter");
    const searchBtn = $("#talentSearchBtn");
    const skillName = $("#talentSkillName");
    const skillCategory = $("#talentSkillCategory");
    const contactEmail = $("#talentContactEmail");
    const description = $("#talentDescription");
    const createBtn = $("#talentCreateBtn");
    const prevBtn = $("#talentPrevBtn");
    const nextBtn = $("#talentNextBtn");
    const pageInfo = $("#talentPageInfo");
    const PAGE_SIZE = 2;
    let currentPage = 1;
    const esc=(s)=>String(s||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
    const fmt=(t)=>{ const d=new Date(t); return isNaN(d.getTime())?t:d.toLocaleDateString(); };

    function cardHTML(p){
      const own = me && (Number(me.id) === Number(p.user_id) || me.role === "admin");
      return `<article class="ui-card talent-card" data-id="${p.id}">
        <h3>${esc(p.student_name)}</h3>
        <div class="talent-meta"><span class="tag">${esc(p.skill_name)}</span><span class="tag">${esc(p.skill_category)}</span><span class="tag">${fmt(p.created_at)}</span></div>
        <p>${esc(p.description)}</p>
        <div class="talent-actions">
          <a href="mailto:${encodeURIComponent(p.contact_email)}?subject=${encodeURIComponent("AuraHub help request: "+p.skill_name)}">Contact</a>
          ${own ? `<button class="delete" data-action="talent-delete">Delete</button><button class="edit" data-action="talent-edit">Edit</button>` : ""}
        </div>
      </article>`;
    }

    async function loadTalent(){
      const q = encodeURIComponent((searchInput?.value || "").trim());
      const c = encodeURIComponent((categoryFilter?.value || "").trim());
      const list = await fetchJSON(`${API}/talent/list.php?q=${q}&category=${c}`);
      const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
      currentPage = Math.min(currentPage, totalPages);
      const start = (currentPage - 1) * PAGE_SIZE;
      const pageItems = list.slice(start, start + PAGE_SIZE);

      cards.innerHTML = pageItems.map(cardHTML).join("");
      empty.classList.toggle("hidden", list.length > 0);

      if (pageInfo) {
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
      }
      prevBtn?.toggleAttribute("disabled", currentPage <= 1);
      nextBtn?.toggleAttribute("disabled", currentPage >= totalPages);
    }

    searchBtn?.addEventListener("click", ()=>{ currentPage = 1; loadTalent(); });
    categoryFilter?.addEventListener("change", ()=>{ currentPage = 1; loadTalent(); });
    prevBtn?.addEventListener("click", ()=>{ if (currentPage > 1) { currentPage -= 1; loadTalent(); } });
    nextBtn?.addEventListener("click", ()=>{ currentPage += 1; loadTalent(); });
    createBtn?.addEventListener("click", async ()=>{
      const payload = {
        skill_name:(skillName?.value||"").trim(),
        description:(description?.value||"").trim(),
        skill_category:(skillCategory?.value||"").trim(),
        contact_email:(contactEmail?.value||"").trim()
      };
      console.log('[DEBUG] talent/create payload', payload);
      console.log('[DEBUG] talent inputs existence', {
        skillName: !!skillName,
        skillCategory: !!skillCategory,
        description: !!description,
        contactEmail: !!contactEmail
      });

      // Client-side validation to prevent 422 from missing fields
      if (!payload.skill_name) return toast("Skill name is required");
      if (!payload.skill_category) return toast("Skill category is required");
      if (!payload.description) return toast("Description is required");
      if (!payload.contact_email) return toast("Contact email is required");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.contact_email)) return toast("Enter a valid contact email");

      try {
        const created = await fetchJSON(`${API}/talent/create.php`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload) });
        console.log('[DEBUG] talent/create response', created);

        skillName.value=""; description.value=""; skillCategory.value=""; contactEmail.value="";
        await loadTalent(); toast("Talent card created");
      } catch (err) {
        console.error('[DEBUG] talent/create failed', err);
        toast(err?.message || "Failed to create talent profile");
      }
    });

    cards?.addEventListener("click", async (e)=>{
      const delBtn = e.target.closest('[data-action="talent-delete"]');
      if(delBtn){
        const card = delBtn.closest("[data-id]"); const id = Number(card?.dataset.id || 0); if(!id) return;
        await fetchJSON(`${API}/talent/delete.php`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ id }) });
        await loadTalent(); toast("Talent card deleted");
        return;
      }

      const editBtn = e.target.closest('[data-action="talent-edit"]');
      if(editBtn){
        const card = editBtn.closest("[data-id]"); const id = Number(card?.dataset.id || 0); if(!id) return;
        const existing = me; // owner-only edit

        // Simple prompt-based editor (no extra modal markup needed)
        const currentSkill = card.querySelector('h3')?.textContent?.trim() || "";
        const currentCategory = card.querySelector('.talent-meta .tag:nth-child(2)')?.textContent?.trim() || "";
        const currentDesc = card.querySelector('p')?.textContent?.trim() || "";
        const currentEmail = contactEmail?.value || '';

        const skill = window.prompt("Skill name", currentSkill) || "";
        if(!skill.trim()) return toast("Skill name required");

        const category = window.prompt("Skill category", currentCategory) || "";
        if(!category.trim()) return toast("Skill category required");

        const description = window.prompt("Description", currentDesc) || "";
        if(!description.trim()) return toast("Description required");

        const email = window.prompt("Contact email", currentEmail) || "";
        if(!email.trim()) return toast("Contact email required");

        await fetchJSON(`${API}/talent/update.php`, {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            id,
            skill_name: skill.trim(),
            skill_category: category.trim(),
            description: description.trim(),
            contact_email: email.trim()
          })
        });

        await loadTalent();
        toast("Talent profile updated");
        return;
      }
    });

    ensureAuth().then(async (u)=>{ me = u; contactEmail.value = u.email || ""; await loadTalent(); }).catch(err=>toast(err.message));
  }

  if(PAGE==="resource"){
    ensureAuth().then((u)=>{
      const modal = $("#resourceModal");
      const modalTitle = $("#resourceModalTitle");
      const modalMessage = $("#resourceModalMessage");
      const modalEmail = $("#resourceModalEmail");
      const modalSubmit = $("#resourceModalSubmit");
      const modalClose = $("#resourceModalClose");
      let modalType = "";

      const openModal = (type) => {
        modalType = type;
        if (type === "medical") {
          modalTitle.textContent = "Medical Support Request";
            modalMessage.textContent = "We will proceed with your medical appointment immediately.";
        } else {
          modalTitle.textContent = "Counselling Session Request";
          modalMessage.textContent = "We will share your session details soon.";
        }
        modalEmail.value = u?.email || "";
        modal.classList.remove("hidden");
        modal.setAttribute("aria-hidden", "false");
      };

      const closeModal = () => {
        modal.classList.add("hidden");
        modal.setAttribute("aria-hidden", "true");
      };

        const medicalTrigger = $("#medicalSupportBtn");
      modalClose?.addEventListener("click", closeModal);
      $$("[data-close-modal='1']").forEach(el=>el.addEventListener("click", closeModal));

      modalSubmit?.addEventListener("click", async ()=>{
        const email = (modalEmail.value || "").trim();
        if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
          toast("Please enter a valid email");
          return;
        }

        await fetchJSON(`${API}/resource/create_request.php`, {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            request_type: modalType,
            requester_email: email
          })
        });

        toast(modalType === "medical" ? "Medical support request saved" : "Counselling request saved");
        closeModal();
      });
    }).catch(err=>toast(err.message));
  }

  // --- BOOK SESSION PAGE LOGIC ---
  // This block runs only on the Book a Session page.
  if(PAGE==="book-session"){
    ensureAuth().then((u)=>{
      // --- DOM ELEMENTS ---
      const mentorList = $(".support-list"); // Where mentor cards are rendered
      let mentorItems = $$('[data-mentor-card]');
      let slotButtons = $$('[data-slot]');
      const calendarTitle = $(".calendar-head span");
      const calendarGrid = $(".calendar-grid");
      const calendarPrev = $("[data-calendar-prev]");
      const calendarNext = $("[data-calendar-next]");
      const summary = $("[data-session-summary]");
      const confirmBtn = $("[data-confirm-booking]");
      const chatWindow = $("[data-chat-window]");
      const chatInput = $("[data-chat-input]");
      const chatSend = $("[data-chat-send]");
      // --- STATE VARIABLES ---
      let selectedDate = new Date(2026, 9, 15); // Default selected date
      let confirmed = false;
      let requestSaved = false;
      let mentors = [];
      let selectedLecturerId = null;
      let selectedSlots = [];
      let selectedSlotId = null;

      // --- UTILITY FUNCTIONS ---
      // Get the text of the currently active item in a list
      const activeText = (items, fallback) => {
        const active = items.find(item => item.classList.contains("active"));
        return active?.querySelector("h4")?.textContent?.trim() || active?.textContent?.trim() || fallback;
      };
      // Format a date for display
      const formatDate = (d) => d instanceof Date ? d.toLocaleDateString(undefined, { month:"short", day:"numeric", year:"numeric" }) : d;

      // --- RENDER SLOTS FOR SELECTED MENTOR ---
      const renderSlots = () => {
        const slotList = $(".slot-list");
        const noSlotsMsg = $(".no-slots-message");
        if (!slotList) return;
        if (selectedSlots.length) {
          // Render each available slot as a button
          slotList.innerHTML = selectedSlots.map((slot, idx) => `<button class="slot-btn ${idx === 0 ? "active" : ""}" type="button" data-slot data-slot-id="${slot.id}" data-slot-date="${slot.available_date}">${fmtDate(slot.available_date)} | ${slotLabel(slot)}</button>`).join("");
          if (noSlotsMsg) noSlotsMsg.style.display = "none";
        } else {
          // Show message if no slots
          slotList.innerHTML = "";
          if (noSlotsMsg) noSlotsMsg.style.display = "block";
        }
        slotButtons = $$("[data-slot]");
        const activeSlot = slotButtons.find(btn => btn.classList.contains("active"));
        selectedSlotId = activeSlot?.dataset.slotId || null;
        if (activeSlot?.dataset.slotDate) selectedDate = new Date(`${activeSlot.dataset.slotDate}T00:00:00`);
        // Add click listeners to slot buttons
        slotButtons.forEach(btn => btn.addEventListener("click", () => {
          slotButtons.forEach(x => x.classList.remove("active"));
          btn.classList.add("active");
          selectedSlotId = btn.dataset.slotId || null;
          if (btn.dataset.slotDate) selectedDate = new Date(`${btn.dataset.slotDate}T00:00:00`);
          updateSummary();
        }));
      };

      // --- RENDER MENTOR CARDS ---
      const renderMentors = (rows) => {
        mentors = rows;
        const noMentorsMsg = $(".no-mentors-message");
        if (mentorList) {
          if (mentors.length) {
            // Render each mentor as a card
            mentorList.innerHTML = mentors.map((mentor, idx) => `
              <article class="support-item ${idx === 0 ? "active" : ""}" role="button" tabindex="0" data-mentor-card data-lecturer-id="${mentor.lecturer_id}">
                <div class="mentor-avatar"></div>
                <div>
                  <h4>${esc(mentor.lecturer_name)}</h4>
                  <small>${esc(mentor.lecturer_email)}</small>
                  <div class="mentor-slots-preview">${mentor.slots && mentor.slots.length ? `${mentor.slots.length} available slot${mentor.slots.length === 1 ? '' : 's'}` : '<span style="color:#c00">No slots available</span>'}</div>
                </div>
                ${idx === 0 ? `<span class="badge-check"><i class="fa-solid fa-check"></i></span>` : ""}
              </article>
            `).join("");
            if (noMentorsMsg) noMentorsMsg.style.display = "none";
            mentorItems = $$("[data-mentor-card]");
            selectedLecturerId = mentorItems[0]?.dataset.lecturerId || null;
            selectedSlots = mentors[0]?.slots || [];
            bindMentors();
            renderSlots();
          } else {
            mentorList.innerHTML = '<div style="color:#c00;padding:10px;">No mentors found.</div>';
            if (noMentorsMsg) noMentorsMsg.style.display = "block";
            selectedLecturerId = null;
            selectedSlots = [];
            renderSlots();
          }
        }
      };

      // --- UPDATE SUMMARY PANEL ---
      const updateSummary = () => {
        if (!summary) return;
        const mentor = activeText(mentorItems, "Selected mentor");
        const activeSlot = slotButtons.find(btn => btn.classList.contains("active"));
        summary.innerHTML = `
          <p><strong>Mentor:</strong> ${mentor}</p>
          <p><strong>Date:</strong> ${formatDate(selectedDate)}</p>
          <p><strong>Time:</strong> ${activeSlot?.textContent?.replace(/^.*\|\s*/, "").trim() || activeText(slotButtons, "Selected time")}</p>
          <p><strong>Email:</strong> ${u.email || "Your account email"}</p>
        `;
        // Update the calendar UI
        renderBookingCalendar(calendarGrid, calendarTitle, selectedDate, (date) => {
          selectedDate = date;
          updateSummary();
        });
        // Show chat prompt if not confirmed
        if (!confirmed && chatWindow) {
          chatWindow.textContent = `Book your session to start chatting with ${mentor.split(" ").slice(-1)[0] || "your mentor"}.`;
        }
      };

      // --- SAVE COUNSELLING REQUEST (BOOKING) ---
      const saveCounsellingRequest = async () => {
        await fetchJSON(`${API}/resource/create_request.php`, {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            request_type: "counselling",
            requester_email: u.email || ""
          })
        });
        toast("Counselling request saved");
      };

      // --- BIND MENTOR CARD EVENTS ---
      function bindMentors(){
        mentorItems.forEach((item, idx) => item.addEventListener("click", () => {
          // Set clicked mentor as active
          mentorItems.forEach(x => {
            x.classList.remove("active");
            x.querySelector(".badge-check")?.remove();
          });
          item.classList.add("active");
          item.insertAdjacentHTML("beforeend", `<span class="badge-check"><i class="fa-solid fa-check"></i></span>`);
          selectedLecturerId = item.dataset.lecturerId || null;
          // Update slots for selected mentor
          const mentor = mentors.find(m => String(m.lecturer_id) === String(selectedLecturerId));
          selectedSlots = mentor && Array.isArray(mentor.slots) ? mentor.slots : [];
          renderSlots();
          updateSummary();
        }));
        // Allow keyboard selection
        mentorItems.forEach(item => item.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            item.click();
          }
        }));
      }
      bindMentors();

      // --- BIND SLOT BUTTON EVENTS ---
      slotButtons.forEach(btn => btn.addEventListener("click", () => {
        slotButtons.forEach(x => x.classList.remove("active"));
        btn.classList.add("active");
        updateSummary();
      }));

      // --- CALENDAR NAVIGATION ---
      calendarPrev?.addEventListener("click", () => {
        selectedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, Math.min(selectedDate.getDate(), 28));
        updateSummary();
      });
      calendarNext?.addEventListener("click", () => {
        selectedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, Math.min(selectedDate.getDate(), 28));
        updateSummary();
      });

      // --- CONFIRM BOOKING BUTTON ---
      confirmBtn?.addEventListener("click", async () => {
        if (requestSaved) return toast("Booking already confirmed");
        confirmed = true;
        requestSaved = true;
        confirmBtn.disabled = true;
        confirmBtn.textContent = "Booking Confirmed";
        if (chatInput) chatInput.disabled = false;
        if (chatWindow) chatWindow.textContent = "Booking confirmed. You can now send a message to your mentor.";
        try {
          await saveCounsellingRequest();
        } catch (err) {
          requestSaved = false;
          confirmBtn.disabled = false;
          confirmBtn.textContent = "Confirm Booking";
          toast(err.message);
        }
      });

      // --- CHAT EVENTS ---
      chatSend?.addEventListener("click", () => {
        if (!confirmed) return toast("Confirm your booking first");
        const text = (chatInput?.value || "").trim();
        if (!text) return toast("Type a message first");
        if (chatWindow) {
          const line = document.createElement("div");
          line.className = "chat-message";
          line.textContent = `You: ${text}`;
          if (!chatWindow.querySelector(".chat-message")) chatWindow.textContent = "";
          chatWindow.appendChild(line);
        }
        chatInput.value = "";
        toast("Message added");
      });
      chatInput?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") chatSend?.click();
      });

      // --- INITIAL RENDER ---
      updateSummary();
      // Fetch mentors and their availability from the backend
      fetchJSON(`${API}/availability/mentors_with_availability.php`)
        .then(rows => {
          // Debug log for backend response
          console.log('[DEBUG] mentors_with_availability.php response:', rows);
          if (Array.isArray(rows) && rows.length) {
            renderMentors(rows);
            updateSummary();
          } else {
            console.warn('[DEBUG] No mentors found in API response:', rows);
          }
        })
        .catch((err)=>{
          console.error('[DEBUG] Error fetching mentors_with_availability.php:', err);
        });
    }).catch(err=>toast(err.message));
  }

  if(PAGE==="medical-support"){
    ensureAuth().then((u)=>{
      const appointmentItems = $$("[data-appointment-card]");
      const slotButtons = $$("[data-slot]");
      const calendarTitle = $(".calendar-head span");
      const calendarGrid = $(".calendar-grid");
      const calendarPrev = $("[data-calendar-prev]");
      const calendarNext = $("[data-calendar-next]");
      const summary = $("[data-medical-summary]");
      const bookBtn = $("[data-review-medical]");
      const confirmBtn = $("[data-confirm-medical]");
      let selectedDate = new Date(2026, 9, 15);
      let requestSaved = false;

      const activeText = (items, fallback) => {
        const active = items.find(item => item.classList.contains("active"));
        return active?.querySelector("h4")?.textContent?.trim() || active?.textContent?.trim() || fallback;
      };
      const formatDate = (d) => d.toLocaleDateString(undefined, { month:"short", day:"numeric", year:"numeric" });
      const updateSummary = () => {
        if (!summary) return;
        summary.innerHTML = `
          <p><strong>Location:</strong> University Medical Center (Building D)</p>
          <p><strong>Date:</strong> ${formatDate(selectedDate)}</p>
          <p><strong>Time:</strong> ${activeText(slotButtons, "Selected time")}</p>
          <p><strong>Type:</strong> ${activeText(appointmentItems, "Selected appointment")}</p>
          <p><strong>Email:</strong> ${u.email || "Your account email"}</p>
        `;
        renderBookingCalendar(calendarGrid, calendarTitle, selectedDate, (date) => {
          selectedDate = date;
          updateSummary();
        });
      };
      const saveMedicalRequest = async () => {
        await fetchJSON(`${API}/resource/create_request.php`, {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            request_type: "medical",
            requester_email: u.email || ""
          })
        });
        toast("Medical support request saved");
      };

      appointmentItems.forEach(item => item.addEventListener("click", () => {
        appointmentItems.forEach(x => x.classList.remove("active"));
        item.classList.add("active");
        updateSummary();
      }));
      appointmentItems.forEach(item => item.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          item.click();
        }
      }));
      slotButtons.forEach(btn => btn.addEventListener("click", () => {
        slotButtons.forEach(x => x.classList.remove("active"));
        btn.classList.add("active");
        updateSummary();
      }));
      calendarPrev?.addEventListener("click", () => {
        selectedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, Math.min(selectedDate.getDate(), 28));
        updateSummary();
      });
      calendarNext?.addEventListener("click", () => {
        selectedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, Math.min(selectedDate.getDate(), 28));
        updateSummary();
      });
      bookBtn?.addEventListener("click", () => {
        summary?.scrollIntoView({ behavior:"smooth", block:"center" });
        toast("Review your medical slot");
      });
      confirmBtn?.addEventListener("click", async () => {
        if (requestSaved) return toast("Medical slot already confirmed");
        requestSaved = true;
        confirmBtn.disabled = true;
        confirmBtn.textContent = "Medical Slot Confirmed";
        try {
          await saveMedicalRequest();
        } catch (err) {
          requestSaved = false;
          confirmBtn.disabled = false;
          confirmBtn.textContent = "Confirm Medical Slot";
          toast(err.message);
        }
      });
      updateSummary();
    }).catch(err=>toast(err.message));
  }

  if(PAGE==="lecturer" || (PAGE === "wall" && document.querySelector("#lecturerSection"))){
    (async ()=>{
      const dateInput = $("#availabilityDate");
      const startInput = $("#availabilityStart");
      const endInput = $("#availabilityEnd");
      const noteInput = $("#availabilityNote");
      const saveBtn = $("#availabilitySaveBtn");
      const list = $("#availabilityList");
      const empty = $("#availabilityEmpty");
      const status = $("#availabilityStatus");

      const setStatus = (message, kind = "info") => {
        if (!status) return;
        status.textContent = message || "";
        status.dataset.kind = kind;
        status.classList.toggle("hidden", !message);
      };

      const disableForm = (message) => {
        [dateInput, startInput, endInput, noteInput].forEach(el => {
          if (el) el.disabled = true;
        });
        if (saveBtn) {
          saveBtn.disabled = true;
          if (message) saveBtn.textContent = message;
        }
        if (empty && message) {
          empty.textContent = message;
          empty.classList.remove("hidden");
        }
        if (message) setStatus(message, "error");
      };

      let me = null;
      try {
        me = await fetchJSON(`${API}/auth/me.php`);
      } catch {
        disableForm("Please sign in as a lecturer to manage availability.");
        return;
      }

      if (!["lecturer", "admin"].includes(me.role)) {
        disableForm("Access restricted to lecturers and admins.");
        return;
      }

      const today = new Date();
      if (dateInput) dateInput.value = today.toISOString().slice(0, 10);
      if (startInput) startInput.value = "09:00";
      if (endInput) endInput.value = "10:00";

      const render = (rows=[]) => {
        if (!list) return;
        list.innerHTML = rows.map(row => `
          <article class="availability-card" data-availability-id="${row.id}">
            <div>
              <strong>${fmtDate(row.available_date)}</strong>
              <span>${slotLabel(row)}</span>
              ${row.note ? `<small>${esc(row.note)}</small>` : ""}
            </div>
            <button class="page-nav-btn" type="button" data-delete-availability="${row.id}">
              <i class="fa-solid fa-trash"></i>
            </button>
          </article>
        `).join("");
        empty?.classList.toggle("hidden", rows.length > 0);
      };

      const load = async () => {
        try {
          const rows = await fetchJSON(`${API}/availability/list.php?mine=1`);
          render(Array.isArray(rows) ? rows : []);
        } catch (err) {
          setStatus(err.message || "Failed to load availability", "error");
        }
      };

      saveBtn?.addEventListener("click", async () => {
        if (!dateInput?.value || !startInput?.value || !endInput?.value) {
          setStatus("Please complete date and time fields", "error");
          toast("Please complete date and time fields");
          return;
        }
        if (startInput.value >= endInput.value) {
          setStatus("End time must be later than start time", "error");
          toast("End time must be later than start time");
          return;
        }

        const originalLabel = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";
        try {
          await fetchJSON(`${API}/availability/save.php`, {
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body: JSON.stringify({
              available_date: dateInput.value,
              start_time: startInput.value,
              end_time: endInput.value,
              note: noteInput.value.trim()
            })
          });
          noteInput.value = "";
          await load();
          setStatus("Availability saved", "success");
          toast("Availability saved");
        } catch (err) {
          setStatus(err.message || "Failed to save slot", "error");
          toast(err.message || "Failed to save slot");
        } finally {
          saveBtn.disabled = false;
          saveBtn.textContent = originalLabel;
        }
      });

      list?.addEventListener("click", async (e) => {
        const btn = e.target.closest("[data-delete-availability]");
        if (!btn) return;
        const confirmed = window.confirm("Delete this availability slot?");
        if (!confirmed) return;

        btn.disabled = true;
        try {
          await fetchJSON(`${API}/availability/delete.php`, {
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body: JSON.stringify({ id: Number(btn.dataset.deleteAvailability) })
          });
          await load();
          setStatus("Availability removed", "success");
          toast("Availability removed");
        } catch (err) {
          setStatus(err.message || "Failed to delete slot", "error");
          toast(err.message || "Failed to delete slot");
        } finally {
          btn.disabled = false;
        }
      });

      document.querySelectorAll(".lecturer-alerts .post-btn").forEach(btn => {
        btn.addEventListener("click", () => toast("Alerts queue coming soon"));
      });

      document.querySelectorAll(".action-card").forEach(btn => {
        btn.addEventListener("click", () => toast("Action queued"));
      });

      await load();
    })().catch(err=>toast(err.message));
  }
})();
