window.__authLoaded = true;

document.addEventListener("DOMContentLoaded", function() {
  /*
   * Authentication page controller
   * ------------------------------------------------------------
   * Handles login/sign-up tab switching, account creation, and
   * redirecting users to the correct dashboard after login.
   */

  const safeSetMsg = (m) => {
    const el = document.getElementById("authMsg");
    if (el) el.textContent = m;
  };
  window.addEventListener("error", (e) => {
    safeSetMsg(e?.message || "Unexpected script error");
  });
  window.addEventListener("unhandledrejection", (e) => {
    const reason = e?.reason;
    safeSetMsg(reason?.message || "Request failed");
  });
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

  // Form element references are stored once so the handlers stay simple.
  const tabLogin = document.getElementById("tabLogin");
  const tabSignup = document.getElementById("tabSignup");
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  // Hard reset: show an error if elements are missing (would prevent button working)
  if (!tabLogin || !tabSignup || !loginForm || !signupForm) {
    const el = document.getElementById("authMsg");
    if (el) el.textContent = "Auth UI not initialized (missing elements).";
  }

  const authMsg = document.getElementById("authMsg");
  // Shows a loading state on submit buttons and prevents duplicate requests.
  const setBusy = (form, busy, label) => {
    const btn = form?.querySelector('button[type="submit"]');
    if (!btn) return;
    if (busy) {
      btn.dataset.originalText = btn.innerHTML;
      btn.disabled = true;
      btn.classList.add("is-busy");
      btn.innerHTML = label;
    } else {
      btn.disabled = false;
      btn.classList.remove("is-busy");
      if (btn.dataset.originalText) btn.innerHTML = btn.dataset.originalText;
    }
  };
  // Admin dashboard is accessible after normal login (based on role)
  // (Removed separate Admin Login button/page from UI)
  const gotoAdmin = document.getElementById("gotoAdmin");
  gotoAdmin && (gotoAdmin.onclick = null);



  // Switch between the Login and Sign Up forms.
  const show = (t)=>{
    tabLogin.classList.toggle("active", t==="login");
    tabSignup.classList.toggle("active", t==="signup");
    loginForm.classList.toggle("active", t==="login");
    signupForm.classList.toggle("active", t==="signup");
    authMsg.textContent = "";
  };

  // Small POST helper for auth endpoints.
  const req = async (url, body)=>{
    const r = await fetch(url, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      credentials:"include",
      body:JSON.stringify(body)
    });
    let j;
    try {
      j = await r.json();
    } catch (err) {
      throw new Error("Unexpected response from server");
    }
    if(!r.ok || !j.success) throw new Error(j.message || "Failed");
    return j.data;
  };

  tabLogin.onclick = ()=>show("login");
  tabSignup.onclick = ()=>show("signup");
  // If user lands on index.html with ?mode=signup, show sign up form

  const params = new URLSearchParams(location.search);
  if (params.get("mode") === "signup") {
    show("signup");
  } else {
    show("login");
  }


  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    authMsg.textContent = "";
    setBusy(loginForm, true, '<i class="fa-solid fa-circle-notch fa-spin"></i> Signing in...');
    try{
      const data = await req(`${API}/auth/login.php`, {
        email: document.getElementById("loginEmail").value.trim(),
        password: document.getElementById("loginPassword").value
      });
      location.href = (data.role === "admin" || data.role === "super_admin") ? "admin.html" : data.role === "doctor" ? "doctor-availability.html" : "wall.html";

    }catch(err){ 
      authMsg.textContent = err.message; 
      setBusy(loginForm, false);
    }
  });

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    authMsg.textContent = "";
    setBusy(signupForm, true, '<i class="fa-solid fa-circle-notch fa-spin"></i> Creating account...');
    try{
      const roleEl = document.getElementById("signupRole");
      const role = (roleEl && roleEl.value) ? roleEl.value : "student";



      await req(`${API}/auth/signup.php`, {
        full_name: document.getElementById("signupName").value.trim(),
        email: document.getElementById("signupEmail").value.trim(),
        password: document.getElementById("signupPassword").value,
        guardian_name: document.getElementById("guardianName").value.trim(),
        guardian_phone: document.getElementById("guardianPhone").value.trim(),
        role
      });
      location.replace("index.html?mode=login");
    }catch(err){ 
      authMsg.textContent = err.message; 
      setBusy(signupForm, false);
    }
  });
});
