document.addEventListener("DOMContentLoaded", function() {
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
  window.__authLoaded = true;
  const path = window.location.pathname;
  const basePath = path.endsWith("/")
    ? path
    : (path.includes(".") ? path.replace(/\/[^/]*$/, "/") : `${path}/`);
  const API = `${window.location.origin}${basePath}api`;
  const tabLogin = document.getElementById("tabLogin");
  const tabSignup = document.getElementById("tabSignup");
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const authMsg = document.getElementById("authMsg");
  // Admin dashboard is accessible after normal login (based on role)
  // (Removed separate Admin Login button/page from UI)
  const gotoAdmin = document.getElementById("gotoAdmin");
  gotoAdmin && (gotoAdmin.onclick = null);



  const show = (t)=>{
    tabLogin.classList.toggle("active", t==="login");
    tabSignup.classList.toggle("active", t==="signup");
    loginForm.classList.toggle("active", t==="login");
    signupForm.classList.toggle("active", t==="signup");
    authMsg.textContent = "";
  };

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
    try{
      const data = await req(`${API}/auth/login.php`, {
        email: document.getElementById("loginEmail").value.trim(),
        password: document.getElementById("loginPassword").value
      });
      location.href = data.role === "admin" ? "admin.html" : "wall.html";

    }catch(err){ 
      console.error("Login error:", err);
      authMsg.textContent = err.message; 
    }
  });

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    try{
      const role = document.getElementById("signupRole")?.value || "student";
      await req(`${API}/auth/signup.php`, {
        full_name: document.getElementById("signupName").value.trim(),
        email: document.getElementById("signupEmail").value.trim(),
        password: document.getElementById("signupPassword").value,
        role
      });
      location.replace("index.html?mode=login");
    }catch(err){ 
      console.error("Signup error:", err);
      authMsg.textContent = err.message; 
    }
  });
});
