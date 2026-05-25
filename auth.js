(() => {
  const API = `${window.location.origin}/Aurahub/api`;
  const tabLogin = document.getElementById("tabLogin");
  const tabSignup = document.getElementById("tabSignup");
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const authMsg = document.getElementById("authMsg");
  const gotoAdmin = document.getElementById("gotoAdmin");

  const show = (t)=>{
    tabLogin.classList.toggle("active", t==="login");
    tabSignup.classList.toggle("active", t==="signup");
    loginForm.classList.toggle("active", t==="login");
    signupForm.classList.toggle("active", t==="signup");
    authMsg.textContent = "";
  };

  const req = async (url, body)=>{
    const r = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(body) });
    const j = await r.json();
    if(!r.ok || !j.success) throw new Error(j.message || "Failed");
    return j.data;
  };

  tabLogin.onclick = ()=>show("login");
  tabSignup.onclick = ()=>show("signup");
  gotoAdmin.onclick = ()=>location.href="admin.html";

  // If user lands on index.html with ?mode=signup, show sign up form
  const params = new URLSearchParams(location.search);
  if (params.get("mode") === "signup") {
    show("signup");
  } else {
    show("login");
  }


  loginForm.onsubmit = async (e)=>{
    e.preventDefault();
    try{
      const data = await req(`${API}/auth/login.php`, {
        email: document.getElementById("loginEmail").value.trim(),
        password: document.getElementById("loginPassword").value
      });
      location.href = data.role === "admin" ? "admin.html" : "wall.html";
    }catch(err){ authMsg.textContent = err.message; }
  };

  signupForm.onsubmit = async (e)=>{
    e.preventDefault();
    try{
      await req(`${API}/auth/signup.php`, {
        full_name: document.getElementById("signupName").value.trim(),
        email: document.getElementById("signupEmail").value.trim(),
        password: document.getElementById("signupPassword").value
      });
      location.replace("index.html?mode=login");
    }catch(err){ authMsg.textContent = err.message; }
  };
})();