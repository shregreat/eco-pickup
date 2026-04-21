const tabButtons = document.querySelectorAll(".tab-button");
const forms = document.querySelectorAll(".auth-form");
const statusMessage = document.getElementById("status-message");
const roleButtons = document.querySelectorAll(".role-button");
const loginRoleInput = document.getElementById("login-role");
const loginTitle = document.getElementById("login-title");
const loginCopy = document.getElementById("login-copy");
const signupTitle = document.getElementById("signup-title");
const signupCopy = document.getElementById("signup-copy");
const API_BASE_URL = "https://waste-managment-39g8.onrender.com";
const dashboardRoutes = {
  user: "/dashboard/user/",
  worker: "/dashboard/worker/",
  admin: "/dashboard/admin/"
};

const roleContent = {
  user: {
    loginTitle: "User login",
    loginCopy: "Use your registered email to continue.",
    signupTitle: "Create user account",
    signupCopy: "Register once to start submitting pickup requests."
  },
  worker: {
    loginTitle: "Worker login",
    loginCopy: "Sign in to manage assigned pickups and update field status.",
  },
  admin: {
    loginTitle: "Admin login",
    loginCopy: "Sign in to supervise requests, workers, and cleanup operations.",
  }
};

let activeRole = "user";
const pathnameParts = window.location.pathname.split("/").filter(Boolean);
const roleFromPath =
  pathnameParts[0] === "login" || pathnameParts[0] === "register"
    ? pathnameParts[1]
    : "";
let activeTab = "login";

const storeAuthSession = (token, user) => {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
};

const setStatus = (message, type) => {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
};

const syncHistory = () => {
  const url = new URL(window.location.href);
  url.pathname = activeTab === "signup" ? "/register/user" : `/login/${activeRole}`;
  url.search = "";
  url.hash = activeTab === "signup" ? "#signup-form" : "";
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
};

const activateTab = (targetTab) => {
  activeTab = targetTab;
  tabButtons.forEach((item) => item.classList.remove("active"));
  forms.forEach((form) => form.classList.remove("active"));

  document.querySelector(`[data-tab="${targetTab}"]`).classList.add("active");
  document.getElementById(`${targetTab}-form`).classList.add("active");
  syncHistory();
  setStatus("", "");
};

const syncRoleUI = (role) => {
  const normalizedRole = role === "customer" ? "user" : role;
  const selectedRole = roleContent[normalizedRole] ? normalizedRole : "user";
  activeRole = selectedRole;

  roleButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.role === selectedRole);
  });

  if (loginRoleInput) {
    loginRoleInput.value = selectedRole;
  }

  if (loginTitle) {
    loginTitle.textContent = roleContent[selectedRole].loginTitle;
  }

  if (loginCopy) {
    loginCopy.textContent = roleContent[selectedRole].loginCopy;
  }

  if (signupTitle) {
    signupTitle.textContent = roleContent.user.signupTitle;
  }

  if (signupCopy) {
    signupCopy.textContent = roleContent.user.signupCopy;
  }

  syncHistory();
  setStatus("", "");
};

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activateTab(button.dataset.tab);
  });
});

roleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    syncRoleUI(button.dataset.role);
  });
});

const roleFromUrl = new URLSearchParams(window.location.search).get("role");
syncRoleUI(roleFromPath || roleFromUrl || activeRole);

if (window.location.hash === "#signup-form" || pathnameParts[0] === "register") {
  activateTab("signup");
}

document.getElementById("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  try {
    setStatus("Logging you in...", "");

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.msg || "Login failed");
    }

    storeAuthSession(data.token, data.user);
    setStatus(`Welcome back, ${data.user.name}. You are logged in as ${data.user.role}.`, "success");
    form.reset();
    syncRoleUI(activeRole);
    window.setTimeout(() => {
      window.location.replace(dashboardRoutes[data.user.role] || dashboardRoutes.user);
    }, 500);
  } catch (error) {
    setStatus(error.message, "error");
  }
});

document.getElementById("signup-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  try {
    setStatus("Creating your account...", "");

    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.msg || "Signup failed");
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setStatus("User account created successfully. You can log in now.", "success");
    form.reset();
    syncRoleUI("user");
    activateTab("login");
  } catch (error) {
    setStatus(error.message, "error");
  }
});
