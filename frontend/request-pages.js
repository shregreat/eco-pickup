const storedUser = localStorage.getItem("user");
const pageUser = storedUser ? JSON.parse(storedUser) : null;
const pageRole = document.body.dataset.role;
const pageType = document.body.dataset.page;
const pageDateLabel = document.getElementById("dashboard-date");
const pageUserNameLabel = document.getElementById("dashboard-user-name");
const pageUserRoleLabel = document.getElementById("dashboard-user-role");
const pageLogoutButton = document.getElementById("dashboard-logout");
const pageStatusMessage = document.getElementById("page-status-message");
const newRequestForm = document.getElementById("new-request-form");
const userRequestsTableBody = document.getElementById("user-requests-table-body");
const adminRequestsTableBody = document.getElementById("admin-requests-table-body");
const API_BASE_URL = window.location.hostname === "localhost" ? "http://localhost:5000" : "https://waste-managment-39g8.onrender.com";

let socket = null;
if (typeof io !== "undefined") {
  socket = io(API_BASE_URL);
  socket.on("notification", (data) => {
    if (pageUser && data.userId === pageUser.id) {
      alert("🔔 " + data.message);
      if (pageType === "my-requests") loadMyRequestsPage();
      if (pageType === "admin-requests") loadAdminRequestsPage();
    }
  });
}

const pageRoutes = {
  user: "/dashboard/user/",
  worker: "/dashboard/worker/",
  admin: "/dashboard/admin/"
};

const getStoredToken = () => localStorage.getItem("token");

const clearStoredSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatRequestId = (id) => {
  if (!id) {
    return "--";
  }

  return `REQ-${String(id).slice(-4).toUpperCase()}`;
};

const formatRequestDate = (value) => {
  if (!value) {
    return "--";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(parsedDate);
};

const getStatusTone = (status) => {
  const normalizedStatus = String(status || "").toLowerCase();

  if (normalizedStatus === "completed") {
    return "green";
  }

  if (normalizedStatus === "in progress") {
    return "blue";
  }

  return "orange";
};

const setPageStatus = (message, type = "") => {
  if (!pageStatusMessage) {
    return;
  }

  pageStatusMessage.textContent = message;
  pageStatusMessage.className = `form-status ${type}`.trim();
};

const handleUnauthorizedResponse = (response) => {
  if (response.status !== 401) {
    return false;
  }

  clearStoredSession();
  window.location.replace(`/login/${pageRole || "user"}`);
  return true;
};

if (!pageUser || !pageUser.role) {
  window.location.replace(`/login/${pageRole || "user"}`);
}

if (pageUser && pageRole && pageUser.role !== pageRole) {
  window.location.replace(pageRoutes[pageUser.role] || "/login/user");
}

if (pageDateLabel) {
  pageDateLabel.textContent = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "full"
  }).format(new Date());
}

if (pageUserNameLabel && pageUser) {
  pageUserNameLabel.textContent = pageUser.name || "Account";
}

if (pageUserRoleLabel && pageUser) {
  pageUserRoleLabel.textContent = `${pageUser.role} account`;
}

if (pageLogoutButton) {
  pageLogoutButton.addEventListener("click", () => {
    clearStoredSession();
    window.location.replace(`/login/${pageRole || "user"}`);
  });
}

window.assignWorker = async (requestId) => {
  const workerSelect = document.getElementById(`worker-select-${requestId}`);
  if (!workerSelect) return;

  const workerId = workerSelect.value;
  if (!workerId) {
    setPageStatus("Please select a worker first.", "error");
    return;
  }

  const token = getStoredToken();
  if (!token) return;

  try {
    setPageStatus("Assigning worker...");
    const response = await fetch(`${API_BASE_URL}/api/admin/requests/${requestId}/assign`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ workerId })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to assign worker");

    setPageStatus("Worker assigned successfully!", "success");
    loadAdminRequestsPage(); // Refresh table
  } catch (error) {
    setPageStatus(error.message, "error");
  }
};

const loadMyRequestsPage = async () => {
  if (pageType !== "my-requests" || !userRequestsTableBody) {
    return;
  }

  const token = getStoredToken();

  if (!token) {
    userRequestsTableBody.innerHTML = `
      <tr>
        <td colspan="4">Please log in again to view your requests.</td>
      </tr>
    `;
    return;
  }

  try {
    setPageStatus("Loading your request history...");

    const response = await fetch(`${API_BASE_URL}/api/requests/my`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (handleUnauthorizedResponse(response)) {
      return;
    }

    if (!response.ok) {
      throw new Error(data.msg || data.message || "Unable to load requests");
    }

    const requests = Array.isArray(data.allRequests) ? data.allRequests : [];

    if (requests.length === 0) {
      userRequestsTableBody.innerHTML = `
        <tr>
          <td colspan="5">No requests found for this account yet.</td>
        </tr>
      `;
      setPageStatus("No requests found yet.", "success");
      return;
    }

    userRequestsTableBody.innerHTML = requests
      .map((request) => {
        let actionBtn = '--';
        if (request.status === 'Completed') {
          if (request.userRating) {
            actionBtn = `<span style="color: var(--dash-muted); font-size: 12px;">Rated ${request.userRating}/5</span>`;
          } else {
            actionBtn = `<button onclick="window.openRatingModal('${request._id}')" class="primary-button" style="padding: 4px 8px; font-size: 12px;">Rate Worker</button>`;
          }
        }

        return `
          <tr>
            <td>${escapeHtml(formatRequestId(request._id))}</td>
            <td>${escapeHtml(request.description || request.location || "Request")}</td>
            <td><span class="status-pill ${getStatusTone(request.status)}">${escapeHtml(request.status || "Pending")}</span></td>
            <td>${escapeHtml(formatRequestDate(request.createdAt))}</td>
            <td>${actionBtn}</td>
          </tr>
        `;
      })
      .join("");

    setPageStatus(`Loaded ${requests.length} request(s).`, "success");
  } catch (error) {
    userRequestsTableBody.innerHTML = `
      <tr>
        <td colspan="4">${escapeHtml(error.message)}</td>
      </tr>
    `;
    setPageStatus(error.message, "error");
  }
};

const loadAdminRequestsPage = async () => {
  if (pageType !== "admin-requests" || !adminRequestsTableBody) {
    return;
  }

  const token = getStoredToken();

  if (!token) {
    adminRequestsTableBody.innerHTML = `
      <tr>
        <td colspan="5">Please log in again to view requests.</td>
      </tr>
    `;
    return;
  }

  try {
    setPageStatus("Loading all requests for admin review...");

    const [requestsResponse, workersResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/api/requests`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_BASE_URL}/api/admin/workers`, { headers: { Authorization: `Bearer ${token}` } })
    ]);

    const data = await requestsResponse.json();
    const workers = await workersResponse.json();

    if (handleUnauthorizedResponse(requestsResponse)) {
      return;
    }

    if (!requestsResponse.ok) {
      throw new Error(data.msg || data.message || "Unable to load admin requests");
    }

    const requests = Array.isArray(data.allRequests) ? data.allRequests : [];

    if (requests.length === 0) {
      adminRequestsTableBody.innerHTML = `
        <tr>
          <td colspan="6">No requests are available yet.</td>
        </tr>
      `;
      setPageStatus("No requests available.", "success");
      return;
    }

    const workerOptions = workers.map(w => `<option value="${w._id}">${escapeHtml(w.name)} (${w.availability || 'Offline'})</option>`).join("");

    adminRequestsTableBody.innerHTML = requests
      .map((request) => `
        <tr>
          <td>${escapeHtml(formatRequestId(request._id))}</td>
          <td>${escapeHtml(request.description || "--")}</td>
          <td>${escapeHtml(request.location || "--")}</td>
          <td><span class="status-pill ${getStatusTone(request.status)}">${escapeHtml(request.status || "Pending")}</span></td>
          <td>${escapeHtml(request.assignedWorker ? "Assigned" : "Unassigned")}</td>
          <td>
            ${request.status === "Pending" ? `
              <select id="worker-select-${request._id}" class="dashboard-input" style="padding: 4px; width: 120px; font-size: 12px; margin-right: 5px;">
                <option value="">Select Worker</option>
                ${workerOptions}
              </select>
              <button onclick="window.assignWorker('${request._id}')" class="primary-button" style="padding: 4px 8px; font-size: 12px;">Assign</button>
            ` : `<span style="color: var(--text-muted); font-size: 12px;">N/A</span>`}
          </td>
        </tr>
      `)
      .join("");

    setPageStatus(`Loaded ${requests.length} request(s).`, "success");
  } catch (error) {
    adminRequestsTableBody.innerHTML = `
      <tr>
        <td colspan="5">${escapeHtml(error.message)}</td>
      </tr>
    `;
    setPageStatus(error.message, "error");
  }
};

const getLocationBtn = document.getElementById("get-location-btn");
if (getLocationBtn) {
  getLocationBtn.addEventListener("click", () => {
    if ("geolocation" in navigator) {
      getLocationBtn.textContent = "Locating...";
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            // Reverse Geocode using simple Nominatim API
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await response.json();
            document.getElementById("request-location").value = data.display_name || `${latitude}, ${longitude}`;
            getLocationBtn.textContent = "📍 Get GPS";
          } catch (err) {
            document.getElementById("request-location").value = `${position.coords.latitude}, ${position.coords.longitude}`;
            getLocationBtn.textContent = "📍 Get GPS";
          }
        },
        (error) => {
          alert("Unable to retrieve your location.");
          getLocationBtn.textContent = "📍 Get GPS";
        }
      );
    } else {
      alert("Geolocation is not supported by your browser");
    }
  });
}

if (newRequestForm) {
  newRequestForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const token = getStoredToken();

    if (!token) {
      setPageStatus("Please log in again before submitting a request.", "error");
      window.location.replace("/login/user");
      return;
    }

    const formData = new FormData(newRequestForm);
    
    // Validate Description and Location
    if (!formData.get("description") || !formData.get("location")) {
      setPageStatus("Description and location are required.", "error");
      return;
    }

    try {
      setPageStatus("Submitting request...");

      const response = await fetch(`${API_BASE_URL}/api/requests`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}` // Let browser set Content-Type for FormData boundary
        },
        body: formData
      });

      const data = await response.json();

      if (handleUnauthorizedResponse(response)) {
        return;
      }

      if (!response.ok) {
        throw new Error(data.msg || data.message || "Unable to submit request");
      }

      newRequestForm.reset();
      setPageStatus(`Request submitted successfully with ID ${formatRequestId(data.reqId)}.`, "success");
    } catch (error) {
      setPageStatus(error.message, "error");
    }
  });
}

loadMyRequestsPage();
loadAdminRequestsPage();

// --- Rating System Logic ---
let currentRatingRequestId = null;
let currentRatingValue = 0;

window.openRatingModal = (requestId) => {
  currentRatingRequestId = requestId;
  currentRatingValue = 0;
  
  const modal = document.getElementById("rating-modal");
  const statusEl = document.getElementById("rating-status");
  const submitBtn = document.getElementById("submit-rating-btn");
  
  if (modal) modal.style.display = "flex";
  if (statusEl) statusEl.textContent = "";
  if (submitBtn) submitBtn.disabled = true;
  
  // Reset stars
  document.querySelectorAll("#rating-stars span").forEach(star => {
    star.style.color = "var(--dash-muted)";
  });
};

const closeRatingModal = () => {
  currentRatingRequestId = null;
  const modal = document.getElementById("rating-modal");
  if (modal) modal.style.display = "none";
};

// Setup Event Listeners for Rating Modal
const cancelRatingBtn = document.getElementById("cancel-rating-btn");
if (cancelRatingBtn) {
  cancelRatingBtn.addEventListener("click", closeRatingModal);
}

const ratingStars = document.querySelectorAll("#rating-stars span");
ratingStars.forEach(star => {
  star.addEventListener("click", (e) => {
    currentRatingValue = parseInt(e.target.dataset.value);
    
    // Highlight stars
    ratingStars.forEach(s => {
      if (parseInt(s.dataset.value) <= currentRatingValue) {
        s.style.color = "#fbbf24"; // yellow/gold
      } else {
        s.style.color = "var(--dash-muted)";
      }
    });
    
    document.getElementById("submit-rating-btn").disabled = false;
  });
});

const submitRatingBtn = document.getElementById("submit-rating-btn");
if (submitRatingBtn) {
  submitRatingBtn.addEventListener("click", async () => {
    if (!currentRatingRequestId || currentRatingValue === 0) return;
    
    const token = getStoredToken();
    const statusEl = document.getElementById("rating-status");
    
    try {
      if (statusEl) {
        statusEl.textContent = "Submitting rating...";
        statusEl.className = "form-status";
      }
      submitRatingBtn.disabled = true;
      
      const response = await fetch(`${API_BASE_URL}/api/requests/${currentRatingRequestId}/rate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ rating: currentRatingValue })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.msg || "Failed to submit rating");
      
      closeRatingModal();
      loadMyRequestsPage(); // Refresh table
    } catch (err) {
      if (statusEl) {
        statusEl.textContent = err.message;
        statusEl.className = "form-status error";
      }
      submitRatingBtn.disabled = false;
    }
  });
}
