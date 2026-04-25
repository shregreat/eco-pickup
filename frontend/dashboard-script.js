const storedUser = localStorage.getItem("user");
const dashboardUser = storedUser ? JSON.parse(storedUser) : null;
const dashboardRole = document.body.dataset.role;
const dateLabel = document.getElementById("dashboard-date");
const userNameLabel = document.getElementById("dashboard-user-name");
const userRoleLabel = document.getElementById("dashboard-user-role");
const profileNameLabel = document.getElementById("dashboard-profile-name");
const profileRoleLabel = document.getElementById("dashboard-profile-role");
const logoutButton = document.getElementById("dashboard-logout");
const openRequestsCount = document.getElementById("open-requests-count");
const completedRequestsCount = document.getElementById("completed-requests-count");
const rewardPointsCount = document.getElementById("reward-points-count");
const areaCleanlinessStatus = document.getElementById("area-cleanliness-status");
const userRequestsTableBody = document.getElementById("user-requests-table-body");
const newRequestForm = document.getElementById("new-request-form");
const newRequestStatus = document.getElementById("new-request-status");
const adminTotalRequestsCount = document.getElementById("admin-total-requests-count");
const adminPendingRequestsCount = document.getElementById("admin-pending-requests-count");
const adminInProgressRequestsCount = document.getElementById("admin-in-progress-requests-count");
const adminCompletedRequestsCount = document.getElementById("admin-completed-requests-count");
const adminRequestsTableBody = document.getElementById("admin-requests-table-body");
const adminPendingStatus = document.getElementById("admin-pending-status");
const adminInProgressStatus = document.getElementById("admin-in-progress-status");
const adminCompletedStatus = document.getElementById("admin-completed-status");
const adminTotalRequestsText = document.getElementById("admin-total-requests-text");
const adminPendingRequestsText = document.getElementById("admin-pending-requests-text");
const adminCompletedRequestsText = document.getElementById("admin-completed-requests-text");
const API_BASE_URL = window.location.hostname === "localhost" ? "http://localhost:5000" : "https://waste-managment-39g8.onrender.com";

// Initialize Socket.io if available
let socket = null;
if (typeof io !== "undefined") {
  socket = io(API_BASE_URL);
  socket.on("notification", (data) => {
    // Only alert if the notification is meant for this user
    if (dashboardUser && data.userId === dashboardUser.id) {
      alert("🔔 " + data.message);
      // Refresh respective dashboard data automatically
      if (dashboardRole === "user") loadUserRequests();
      if (dashboardRole === "worker") loadWorkerDashboard();
    }
  });
}

const dashboardRoutes = {
  user: "/dashboard/user/",
  worker: "/dashboard/worker/",
  admin: "/dashboard/admin/"
};

const getStoredToken = () => localStorage.getItem("token");

const clearStoredSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

if (!dashboardUser || !dashboardUser.role) {
  window.location.replace("/login/user");
}

if (dashboardUser && dashboardRole && dashboardUser.role !== dashboardRole) {
  const nextRoute = dashboardRoutes[dashboardUser.role] || "/login/user";
  window.location.replace(nextRoute);
}

if (dateLabel) {
  dateLabel.textContent = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "full"
  }).format(new Date());
}

if (userNameLabel && dashboardUser) {
  userNameLabel.textContent = dashboardUser.name || "Account";
}

if (userRoleLabel && dashboardUser) {
  userRoleLabel.textContent = `${dashboardUser.role} account`;
}

if (profileNameLabel && dashboardUser) {
  profileNameLabel.textContent = dashboardUser.name || "Assigned field worker";
}

if (profileRoleLabel && dashboardUser) {
  profileRoleLabel.textContent = `${dashboardUser.role} account`;
}

if (rewardPointsCount && dashboardUser) {
  rewardPointsCount.textContent = String(dashboardUser.points || 0);
}

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

const renderUserRequests = (requests) => {
  if (!userRequestsTableBody) {
    return;
  }

  if (!Array.isArray(requests) || requests.length === 0) {
    userRequestsTableBody.innerHTML = `
      <tr>
        <td colspan="4">No requests found for this account yet.</td>
      </tr>
    `;
    return;
  }

  userRequestsTableBody.innerHTML = requests
    .map((request) => {
      const requestType = request.description || request.location || "Request";
      const requestStatus = request.status || "Pending";

      return `
        <tr>
          <td>${escapeHtml(formatRequestId(request._id))}</td>
          <td>${escapeHtml(requestType)}</td>
          <td><span class="status-pill ${getStatusTone(requestStatus)}">${escapeHtml(requestStatus)}</span></td>
          <td>${escapeHtml(formatRequestDate(request.createdAt))}</td>
        </tr>
      `;
    })
    .join("");
};

const renderRecentActivity = (requests) => {
  const tbody = document.getElementById("user-recent-activity-body");
  if (!tbody) return;

  if (requests.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3">No recent activity.</td></tr>`;
    return;
  }

  tbody.innerHTML = requests.slice(0, 3).map(request => {
    const requestType = request.wasteCategory || "General";
    const requestStatus = request.status || "Pending";
    return `
      <tr>
        <td><strong>${escapeHtml(requestType)}</strong></td>
        <td>${escapeHtml(request.location || "--")}</td>
        <td><span class="status-pill ${getStatusTone(requestStatus)}">${escapeHtml(requestStatus)}</span></td>
      </tr>
    `;
  }).join("");
};

const updateUserRequestSummary = (requests) => {
  if (!Array.isArray(requests)) {
    return;
  }

  const completedCount = requests.filter(
    (request) => String(request.status || "").toLowerCase() === "completed"
  ).length;
  const openCount = requests.length - completedCount;

  if (openRequestsCount) {
    openRequestsCount.textContent = String(openCount);
  }

  if (completedRequestsCount) {
    completedRequestsCount.textContent = String(completedCount);
  }

  if (areaCleanlinessStatus) {
    if (requests.length === 0) {
      areaCleanlinessStatus.textContent = "New";
    } else if (openCount === 0) {
      areaCleanlinessStatus.textContent = "High";
    } else if (openCount <= 2) {
      areaCleanlinessStatus.textContent = "Good";
    } else {
      areaCleanlinessStatus.textContent = "Needs attention";
    }
  }
};

const setNewRequestStatus = (message, type = "") => {
  if (!newRequestStatus) {
    return;
  }

  newRequestStatus.textContent = message;
  newRequestStatus.className = `form-status ${type}`.trim();
};

const handleUnauthorizedDashboardResponse = (response) => {
  if (response.status !== 401) {
    return false;
  }

  clearStoredSession();
  window.location.replace(`/login/${dashboardRole || "user"}`);
  return true;
};

const loadUserRequests = async () => {
  if (dashboardRole !== "user") {
    return;
  }

  const token = getStoredToken();

  if (!token) {
    if (userRequestsTableBody) {
      userRequestsTableBody.innerHTML = `
        <tr>
          <td colspan="4">Please log in again to view your requests.</td>
        </tr>
      `;
    }
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/requests/my`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (handleUnauthorizedDashboardResponse(response)) {
      return;
    }

    if (!response.ok) {
      throw new Error(data.msg || data.message || "Unable to load requests");
    }

    const requests = Array.isArray(data.allRequests) ? data.allRequests : [];
    updateUserRequestSummary(requests);
    if (userRequestsTableBody) {
      renderUserRequests(requests);
    }
    
    // Also render a mini recent activity table if on the dashboard
    const recentActivityBody = document.getElementById("user-recent-activity-body");
    if (recentActivityBody) {
      renderRecentActivity(requests);
    }

    await loadUserLeaderboard(token);
  } catch (error) {
    if (userRequestsTableBody) {
      userRequestsTableBody.innerHTML = `
        <tr>
          <td colspan="4">${escapeHtml(error.message)}</td>
        </tr>
      `;
    }
  }
};

const loadUserLeaderboard = async (token) => {
  const leaderboardBody = document.getElementById("user-leaderboard-body");
  if (!leaderboardBody) return;

  try {
    const res = await fetch(`${API_BASE_URL}/api/users/leaderboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch leaderboard");
    const topUsers = await res.json();
    
    leaderboardBody.innerHTML = topUsers.map((user, index) => `
      <tr>
        <td>#${index + 1}</td>
        <td><strong>${escapeHtml(user.name)}</strong></td>
        <td><span class="status-pill green">${user.points || 0} pts</span></td>
      </tr>
    `).join("");
  } catch (err) {
    leaderboardBody.innerHTML = `<tr><td colspan="3">Could not load leaderboard</td></tr>`;
  }
};

window.updateTaskStatus = async (taskId, status) => {
  const token = getStoredToken();
  if (!token) return;

  try {
    const response = await fetch(`${API_BASE_URL}/api/worker/tasks/${taskId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ workerStatus: status })
    });

    if (!response.ok) throw new Error("Failed to update status");
    loadWorkerDashboard(); // Refresh
  } catch (error) {
    alert(error.message);
  }
};

const renderWorkerRequests = (requests) => {
  const tbody = document.getElementById("worker-requests-table-body");
  if (!tbody) return;

  if (!Array.isArray(requests) || requests.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5">No tasks assigned yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = requests.map((request, index) => {
    const actionBtn = request.workerStatus === "Assigned" 
      ? `<button onclick="window.updateTaskStatus('${request._id}', 'Accepted')" class="primary-button" style="padding: 4px 8px; font-size: 12px;">Accept</button>`
      : request.workerStatus === "Accepted" 
      ? `<button onclick="window.updateTaskStatus('${request._id}', 'Started')" class="primary-button" style="padding: 4px 8px; font-size: 12px;">Start</button>`
      : request.workerStatus === "Started" 
      ? `<button onclick="window.updateTaskStatus('${request._id}', 'Completed')" class="primary-button" style="padding: 4px 8px; font-size: 12px; background: var(--success);">Complete</button>`
      : `<span style="color: var(--text-muted); font-size: 12px;">${request.workerStatus || 'N/A'}</span>`;

    return `
      <tr>
        <td>${String(index + 1).padStart(2, '0')}</td>
        <td>${escapeHtml(request.location || "--")}</td>
        <td>${escapeHtml(request.wasteCategory || "General")}</td>
        <td><span class="status-pill ${getStatusTone(request.status)}">${escapeHtml(request.status || "Pending")}</span></td>
        <td>${actionBtn}</td>
      </tr>
    `;
  }).join("");
};

let workerMapInstance = null;
let workerMapMarker = null;

const loadWorkerDashboard = async () => {
  if (dashboardRole !== "worker") return;

  const token = getStoredToken();
  if (!token) return window.location.replace("/login/worker");

  try {
    const response = await fetch(`${API_BASE_URL}/api/worker/tasks`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (handleUnauthorizedDashboardResponse(response)) return;

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to load tasks");

    renderWorkerRequests(data);
    await loadWorkerLeaderboard(token);

    // Initialize Map if a task is active
    const mapContainer = document.getElementById("worker-map");
    const activeTask = data.find(t => t.workerStatus !== "Completed" && t.workerStatus !== "Rejected");
    
    if (mapContainer && activeTask) {
      const searchLocation = activeTask.address || activeTask.location;
      if (!searchLocation) {
        document.getElementById("map-status").textContent = "No address or location provided for this task.";
      } else {
        document.getElementById("map-status").textContent = `Routing to: ${searchLocation}`;
        
        // Simple geocoding using Nominatim
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchLocation)}`);
          const geoData = await geoRes.json();
        
        if (geoData && geoData.length > 0) {
          const lat = parseFloat(geoData[0].lat);
          const lon = parseFloat(geoData[0].lon);

          if (!workerMapInstance) {
            workerMapInstance = L.map('worker-map').setView([lat, lon], 14);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19,
              attribution: '© OpenStreetMap'
            }).addTo(workerMapInstance);
          } else {
            workerMapInstance.setView([lat, lon], 14);
          }

          if (workerMapMarker) {
            workerMapMarker.setLatLng([lat, lon]);
          } else {
            workerMapMarker = L.marker([lat, lon]).addTo(workerMapInstance);
          }
          workerMapMarker.bindPopup(`<b>Target Location</b><br>${searchLocation}`).openPopup();
          
          // Fix map rendering issue when in hidden/dynamic containers
          setTimeout(() => {
            workerMapInstance.invalidateSize();
          }, 500);

        } else {
          document.getElementById("map-status").textContent = "Could not find map coordinates for this address.";
        }
      } catch (geoErr) {
        console.error("Geocoding failed", geoErr);
      }
      } // Close the else block for searchLocation
    } else if (mapContainer) {
      document.getElementById("map-status").textContent = "No active tasks to route.";
    }

    updateWorkerSummary(data);

  } catch (error) {
    console.error(error);
  }
};

const updateWorkerSummary = (requests) => {
  if (!Array.isArray(requests)) return;

  const totalAssigned = requests.length;
  const completedToday = requests.filter(r => r.workerStatus === 'Completed').length;
  
  // Calculate fake performance score based on completion ratio
  const performanceScore = totalAssigned === 0 ? 100 : Math.round((completedToday / totalAssigned) * 100);

  const assignedEl = document.getElementById("worker-metric-assigned");
  const assignedBar = document.getElementById("worker-metric-assigned-bar");
  const completedEl = document.getElementById("worker-metric-completed");
  const completedBar = document.getElementById("worker-metric-completed-bar");
  const performanceEl = document.getElementById("worker-metric-performance");
  const performanceBar = document.getElementById("worker-metric-performance-bar");

  if (assignedEl) assignedEl.textContent = totalAssigned;
  if (assignedBar) assignedBar.style.width = '100%';
  
  if (completedEl) completedEl.textContent = completedToday;
  if (completedBar) completedBar.style.width = `${totalAssigned === 0 ? 0 : (completedToday / totalAssigned) * 100}%`;
  
  if (performanceEl) performanceEl.textContent = `${performanceScore}%`;
  if (performanceBar) performanceBar.style.width = `${performanceScore}%`;
};

const loadWorkerLeaderboard = async (token) => {
  const leaderboardBody = document.getElementById("worker-leaderboard-body");
  if (!leaderboardBody) return;

  try {
    const res = await fetch(`${API_BASE_URL}/api/worker/leaderboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch leaderboard");
    const topWorkers = await res.json();
    
    leaderboardBody.innerHTML = topWorkers.map((worker, index) => `
      <tr>
        <td>#${index + 1}</td>
        <td><strong>${escapeHtml(worker.name)}</strong></td>
        <td><span class="status-pill green">${worker.completedTasks || 0}</span></td>
      </tr>
    `).join("");
  } catch (err) {
    leaderboardBody.innerHTML = `<tr><td colspan="3">Could not load leaderboard</td></tr>`;
  }
};

if (newRequestForm) {
  newRequestForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const token = getStoredToken();

    if (!token) {
      setNewRequestStatus("Please log in again before submitting a request.", "error");
      window.location.replace("/login/user");
      return;
    }

    const formData = new FormData(newRequestForm);
    const payload = {
      description: String(formData.get("description") || "").trim(),
      location: String(formData.get("location") || "").trim(),
      imageUrl: String(formData.get("imageUrl") || "").trim()
    };

    if (!payload.description || !payload.location) {
      setNewRequestStatus("Description and location are required.", "error");
      return;
    }

    try {
      setNewRequestStatus("Submitting your request...");

      const response = await fetch(`${API_BASE_URL}/api/requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (handleUnauthorizedDashboardResponse(response)) {
        return;
      }

      if (!response.ok) {
        throw new Error(data.msg || data.message || "Unable to submit request");
      }

      newRequestForm.reset();
      setNewRequestStatus("Request submitted successfully.", "success");
      await loadUserRequests();
    } catch (error) {
      setNewRequestStatus(error.message, "error");
    }
  });
}

const renderAdminRequests = (requests) => {
  if (!adminRequestsTableBody) {
    return;
  }

  if (!Array.isArray(requests) || requests.length === 0) {
    adminRequestsTableBody.innerHTML = `
      <tr>
        <td colspan="4">No requests are available yet.</td>
      </tr>
    `;
    return;
  }

  adminRequestsTableBody.innerHTML = requests
    .slice(0, 8)
    .map((request) => {
      const requestStatus = request.status || "Pending";

      return `
        <tr>
          <td>${escapeHtml(formatRequestId(request._id))}</td>
          <td>${escapeHtml(request.location || "--")}</td>
          <td><span class="status-pill ${getStatusTone(requestStatus)}">${escapeHtml(requestStatus)}</span></td>
          <td>${escapeHtml(request.assignedWorker || "Unassigned")}</td>
        </tr>
      `;
    })
    .join("");
};

const updateAdminSummary = (requests) => {
  if (!Array.isArray(requests)) {
    return;
  }

  const totalRequests = requests.length;
  const pendingRequests = requests.filter(
    (request) => String(request.status || "").toLowerCase() === "pending"
  ).length;
  const inProgressRequests = requests.filter(
    (request) => String(request.status || "").toLowerCase() === "in progress"
  ).length;
  const completedRequests = requests.filter(
    (request) => String(request.status || "").toLowerCase() === "completed"
  ).length;

  if (adminTotalRequestsCount) {
    adminTotalRequestsCount.textContent = String(totalRequests);
  }

  if (adminPendingRequestsCount) {
    adminPendingRequestsCount.textContent = String(pendingRequests);
  }

  if (adminInProgressRequestsCount) {
    adminInProgressRequestsCount.textContent = String(inProgressRequests);
  }

  if (adminCompletedRequestsCount) {
    adminCompletedRequestsCount.textContent = String(completedRequests);
  }

  if (adminPendingStatus) {
    adminPendingStatus.textContent = `${pendingRequests} requests are waiting for review or assignment.`;
  }

  if (adminInProgressStatus) {
    adminInProgressStatus.textContent = `${inProgressRequests} requests are currently being processed.`;
  }

  if (adminCompletedStatus) {
    adminCompletedStatus.textContent = `${completedRequests} requests have already been completed.`;
  }

  if (adminTotalRequestsText) {
    adminTotalRequestsText.textContent = `${totalRequests} requests are currently recorded in the system.`;
  }

  if (adminPendingRequestsText) {
    adminPendingRequestsText.textContent = `${pendingRequests} requests are still waiting for action.`;
  }

  if (adminCompletedRequestsText) {
    adminCompletedRequestsText.textContent = `${completedRequests} requests are ready for reporting review.`;
  }
};

const loadAdminDashboard = async () => {
  if (dashboardRole !== "admin") return;
  const token = getStoredToken();
  if (!token) return window.location.replace("/login/admin");

  try {
    const [requestsRes, workersRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/requests`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_BASE_URL}/api/admin/workers`, { headers: { Authorization: `Bearer ${token}` } })
    ]);

    if (handleUnauthorizedDashboardResponse(requestsRes)) return;

    const requestsData = await requestsRes.json();
    const workersData = await workersRes.json();

    if (!requestsRes.ok) throw new Error(requestsData.message || "Failed to load requests");

    const requests = Array.isArray(requestsData.allRequests) ? requestsData.allRequests : [];
    renderAdminRequests(requests);
    updateAdminSummary(requests);

    // Render Workers
    const workersTbody = document.getElementById("admin-workers-table-body");
    if (workersTbody) {
      if (!Array.isArray(workersData) || workersData.length === 0) {
        workersTbody.innerHTML = `<tr><td colspan="4">No verified workers found.</td></tr>`;
      } else {
        workersTbody.innerHTML = workersData.map(worker => {
          // Count active tasks for this worker
          const activeTasks = requests.filter(r => r.assignedWorker === worker._id && r.status !== 'Completed').length;
          const statusTone = worker.availability === "Available" ? "green" : worker.availability === "Busy" ? "orange" : "blue";
          
          return `
            <tr>
              <td><strong>${escapeHtml(worker.name)}</strong><br><small style="color: var(--dash-muted)">${escapeHtml(worker.email)}</small></td>
              <td><span class="status-pill ${statusTone}">${escapeHtml(worker.availability || "Offline")}</span></td>
              <td>${activeTasks} active tasks</td>
              <td><strong style="color: var(--dash-primary-dark);">${worker.completedTasks || 0}</strong> pickups</td>
            </tr>
          `;
        }).join("");
      }
    }

    await loadAdminLeaderboards(token);

  } catch (error) {
    if (adminRequestsTableBody) {
      adminRequestsTableBody.innerHTML = `<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`;
    }
  }
};

const loadAdminLeaderboards = async (token) => {
  const topWorkersBody = document.getElementById("admin-top-workers-body");
  const topUsersBody = document.getElementById("admin-top-users-body");
  
  if (!topWorkersBody || !topUsersBody) return;

  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/leaderboards`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to load leaderboards");
    const { topUsers, topWorkers } = await res.json();

    topWorkersBody.innerHTML = topWorkers.map(worker => `
      <tr>
        <td><strong>${escapeHtml(worker.name)}</strong></td>
        <td><span class="status-pill green">${worker.completedTasks || 0} pickups</span></td>
      </tr>
    `).join("") || `<tr><td colspan="2">No workers found</td></tr>`;

    topUsersBody.innerHTML = topUsers.map(user => `
      <tr>
        <td><strong>${escapeHtml(user.name)}</strong></td>
        <td><span class="status-pill green">${user.points || 0} pts</span></td>
      </tr>
    `).join("") || `<tr><td colspan="2">No users found</td></tr>`;

  } catch (err) {
    topWorkersBody.innerHTML = `<tr><td colspan="2">Error loading leaderboard</td></tr>`;
    topUsersBody.innerHTML = `<tr><td colspan="2">Error loading leaderboard</td></tr>`;
  }
};

if (logoutButton) {
  logoutButton.addEventListener("click", () => {
    clearStoredSession();
    window.location.replace(`/login/${dashboardRole || "user"}`);
  });
}

const createWorkerForm = document.getElementById("create-worker-form");
if (createWorkerForm) {
  createWorkerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const statusEl = document.getElementById("worker-form-status");
    const name = document.getElementById("worker-name").value;
    const email = document.getElementById("worker-email").value;
    const password = document.getElementById("worker-password").value;
    const token = getStoredToken();

    try {
      statusEl.textContent = "Creating worker...";
      statusEl.className = "form-status";

      const res = await fetch(`${API_BASE_URL}/api/admin/workers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, email, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create worker");

      statusEl.textContent = "Worker created successfully!";
      statusEl.className = "form-status success";
      createWorkerForm.reset();
      
      // Reload workers table
      loadAdminDashboard();
    } catch (err) {
      statusEl.textContent = err.message;
      statusEl.className = "form-status error";
    }
  });
}

loadUserRequests();
loadAdminDashboard();
loadWorkerDashboard();
