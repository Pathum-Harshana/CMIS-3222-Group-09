(() => {
  const API = `${window.location.origin}/Aurahub/api`;
  const PAGE = document.body.dataset.page || "";
  const POST_FLAG = "aurahub_local_post_flags";
  const COMMENT_FLAG = "aurahub_local_comment_flags";
  const MOOD_KEY = "aurahub_selected_mood";

  const $ = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
  const jget = (k)=>{ try { return JSON.parse(localStorage.getItem(k)||"{}"); } catch { return {}; } };
  const jset = (k,v)=>localStorage.setItem(k, JSON.stringify(v));
  const toast = (m)=>{ const c=$("#toastContainer"); if(!c) return; const d=document.createElement("div"); d.className="toast"; d.textContent=m; c.appendChild(d); setTimeout(()=>d.remove(),1800); };

  async function fetchJSON(url,opt={}){ const r=await fetch(url,opt); const j=await r.json(); if(!r.ok||!j.success) throw new Error(j.message||"Failed"); return j.data; }
  async function ensureAuth(){ try{ return await fetchJSON(`${API}/auth/me.php`);}catch{ location.href="index.html"; throw new Error("Unauthorized"); } }

  window.AuraHubAuth = {
    logout: async()=>{ await fetch(`${API}/auth/logout.php`,{method:"POST"}); location.href="index.html"; }
  };
  $("#logoutBtn")?.addEventListener("click", ()=>window.AuraHubAuth.logout());

  if(PAGE==="wall"){
    let posts=[], commentsByPost={}, openComments={};
    let selectedMood = localStorage.getItem(MOOD_KEY) || "";
    let showAllPosts = false;
    const feed=$("#feed"), feedEmpty=$("#feedEmpty"), postInput=$("#postInput"), postBtn=$("#postBtn"), char=$("#charCount");
    const search=$("#globalSearch"), clear=$("#clearSearch"), moodChips=$$(".mood-chip");

    const FEED_PREVIEW_LIMIT = 180;
    const FEED_VISIBLE_COUNT = 3;
    const esc=(s)=>String(s||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
    const fmt=(t)=>{ const d=new Date(t); return isNaN(d.getTime())?t:d.toLocaleString(); };
    const postFlagged=(id)=>!!jget(POST_FLAG)[String(id)];
    const togglePost=(id)=>{ const m=jget(POST_FLAG); const k=String(id); m[k]=!m[k]; jset(POST_FLAG,m); return m[k]; };
    const commentFlagged=(id)=>!!jget(COMMENT_FLAG)[String(id)];
    const toggleComment=(id)=>{ const m=jget(COMMENT_FLAG); const k=String(id); m[k]=!m[k]; jset(COMMENT_FLAG,m); return m[k]; };

    const feedWrap = feed?.closest(".feed-wrap");
    const feedMoreBtn = document.createElement("button");
    feedMoreBtn.type = "button";
    feedMoreBtn.className = "feed-more-btn hidden";
    feedMoreBtn.textContent = "Read more";

    const moodValueOf = (el) => (el?.dataset?.mood || el?.getAttribute("data-mood") || "").trim().toLowerCase();

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

    feedMoreBtn.addEventListener("click", ()=>{
      showAllPosts = true;
      render(posts);
    });

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
      const flagged = commentFlagged(c.id);
      return `<div class="comment-item" data-comment-id="${c.id}">
        <div class="comment-meta">Anonymous • ${fmt(c.created_at)}</div>
        <div class="comment-text">${esc(c.content)}</div>
        <div class="comment-actions">
          <button class="comment-action-btn ${flagged?"active":""}" data-action="comment-report-toggle"><i class="fa-solid fa-flag"></i> ${flagged?"Undo Report":"Report"}</button>
          <button class="comment-action-btn delete" data-action="comment-delete"><i class="fa-solid fa-trash"></i> Delete</button>
        </div>
      </div>`;
    }

    function render(list=posts){
      feed.innerHTML = "";
      const activeSearch = (search?.value || "").trim();
      const visibleList = (!showAllPosts && !activeSearch)
        ? list.slice(0, FEED_VISIBLE_COUNT)
        : list;
      visibleList.forEach(p=>{
        const flagged = postFlagged(p.id);
        const cmts = commentsByPost[p.id] || [];
        const open = !!openComments[p.id];
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
          ${flagged?`<span class="report-badge"><i class="fa-solid fa-flag"></i></span>`:""}
          <div class="feed-head"><strong>Anonymous Peer</strong><small>${fmt(p.created_at)}</small></div>
          ${bodyHtml}
          <div class="feed-actions">
            <button class="feed-btn" data-action="copy">Copy</button>
            <button class="feed-btn ${flagged?"reported":""}" data-action="report-toggle"><i class="fa-solid fa-flag"></i> ${flagged?"Undo Report":"Report"}</button>
            <button class="feed-btn" data-action="delete"><i class="fa-solid fa-trash"></i> Delete</button>
            <button class="feed-btn ${open?"active":""}" data-action="comment-toggle">Comments (${cmts.length})</button>
          </div>
          <div class="comments-wrap ${open?"":"hidden"}">
            <div class="comments-list">${cmts.length?cmts.map(renderComment).join(""):`<div class="comment-meta">No comments yet.</div>`}</div>
            <div class="comment-form"><input class="comment-input" maxlength="300" placeholder="Write anonymous comment..." /><button class="comment-btn" data-action="comment-submit">Send</button></div>
          </div>`;
        feed.appendChild(n);
      });

      const shouldShowMore = !showAllPosts && !activeSearch && list.length > FEED_VISIBLE_COUNT;
      if (feedWrap && !feedMoreBtn.isConnected) {
        feedWrap.appendChild(feedMoreBtn);
      }
      feedMoreBtn.classList.toggle("hidden", !shouldShowMore);
      feedEmpty?.classList.toggle("hidden", list.length>0);
    }

    async function load() {
      posts = await api.posts();
      posts = posts.sort((a,b)=> new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      showAllPosts = false;
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

    search?.addEventListener("input", ()=>{ const q=(search.value||"").trim().toLowerCase(); if(!q) return render(posts); render(posts.filter(p=>(p.content||"").toLowerCase().includes(q))); });
    clear?.addEventListener("click", ()=>{ search.value=""; showAllPosts = false; render(posts); });

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
      if(btn.dataset.action==="report-toggle"){ const f=togglePost(pid); render(posts); return toast(f?"Post reported":"Post report removed"); }
      if(btn.dataset.action==="delete"){ await api.deletePost(pid); await load(); return toast("Post deleted permanently"); }
      if(btn.dataset.action==="comment-toggle"){ openComments[pid]=!openComments[pid]; if(openComments[pid]) commentsByPost[pid]=await api.comments(pid).catch(()=>[]); return render(posts); }
      if(btn.dataset.action==="comment-submit"){
        const input = card.querySelector(".comment-input");
        const content = (input?.value||"").trim();
        if(!content) return toast("Write a comment first");
        await api.createComment(pid, content);
        commentsByPost[pid]=await api.comments(pid); openComments[pid]=true; render(posts); return toast("Comment added");
      }
      if(btn.dataset.action==="comment-report-toggle"){
        const cid = Number(btn.closest(".comment-item")?.dataset.commentId||0);
        if(!cid) return;
        const f = toggleComment(cid); render(posts); return toast(f?"Comment reported":"Comment report removed");
      }
      if(btn.dataset.action==="comment-delete"){
        const cid = Number(btn.closest(".comment-item")?.dataset.commentId||0);
        if(!cid) return;
        await api.deleteComment(cid);
        commentsByPost[pid]=await api.comments(pid); openComments[pid]=true; render(posts); return toast("Comment deleted permanently");
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
          ${own ? `<button class="delete" data-action="talent-delete">Delete</button>` : ""}
        </div>
      </article>`;
    }

    async function loadTalent(){
      const q = encodeURIComponent((searchInput?.value || "").trim());
      const c = encodeURIComponent((categoryFilter?.value || "").trim());
      const list = await fetchJSON(`${API}/talent/list.php?q=${q}&category=${c}`);
      cards.innerHTML = list.map(cardHTML).join("");
      empty.classList.toggle("hidden", list.length > 0);
    }

    searchBtn?.addEventListener("click", loadTalent);
    categoryFilter?.addEventListener("change", loadTalent);
    createBtn?.addEventListener("click", async ()=>{
      const payload = {
        skill_name:(skillName.value||"").trim(),
        description:(description.value||"").trim(),
        skill_category:(skillCategory.value||"").trim(),
        contact_email:(contactEmail.value||"").trim()
      };
      await fetchJSON(`${API}/talent/create.php`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload) });
      skillName.value=""; description.value=""; skillCategory.value="";
      await loadTalent(); toast("Talent card created");
    });

    cards?.addEventListener("click", async (e)=>{
      const btn = e.target.closest('[data-action="talent-delete"]'); if(!btn) return;
      const card = btn.closest("[data-id]"); const id = Number(card?.dataset.id || 0); if(!id) return;
      await fetchJSON(`${API}/talent/delete.php`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ id }) });
      await loadTalent(); toast("Talent card deleted");
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
          modalMessage.textContent = "We will proceed your medical appointment immidiately";
        } else {
          modalTitle.textContent = "Counselling Session Request";
          modalMessage.textContent = "We will inform your session details";
        }
        modalEmail.value = u?.email || "";
        modal.classList.remove("hidden");
        modal.setAttribute("aria-hidden", "false");
      };

      const closeModal = () => {
        modal.classList.add("hidden");
        modal.setAttribute("aria-hidden", "true");
      };

      $("#bookCounsellingBtn")?.addEventListener("click", ()=>openModal("counselling"));
      $("#medicalSupportBtn")?.addEventListener("click", ()=>openModal("medical"));
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
})();