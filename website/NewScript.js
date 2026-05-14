// Sidebar functionality
const menuBtn = document.getElementById("menuBtn");
const menuBtn2 = document.getElementById("menuBtn2");
const sidebar = document.getElementById("sidebar");
const content = document.getElementById("main");
const header = document.getElementById("mainHeader");
const overlay = document.getElementById("overlay");

function toggleSidebar() {
    if (window.innerWidth <= 1260) {
        sidebar.classList.toggle("show");
        overlay.classList.toggle("show");
    } else {
        sidebar.classList.toggle("hidden");
        content.classList.toggle("full");
        header.classList.toggle("full");
        menuBtn2.classList.toggle("show");
    }
}

menuBtn.addEventListener("click", toggleSidebar);
menuBtn2.addEventListener("click", toggleSidebar);
overlay.addEventListener("click", () => {
    sidebar.classList.remove("show");
    overlay.classList.remove("show");
});

window.addEventListener("resize", () => {
    if (window.innerWidth > 1260) {
        sidebar.classList.remove("show");
        overlay.classList.remove("show");
    }
});

const profileContainer = document.querySelector(".profile-container");
const profileDropdown = document.getElementById("profileDropdown");

profileContainer.addEventListener("click", (e) => {
    e.stopPropagation();
    profileDropdown.classList.toggle("show");
});

document.addEventListener("click", () => {
    profileDropdown.classList.remove("show");
});

function decodeToken(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(base64));
    } catch (e) {
        console.error("Invalid token:", e);
        return null;
    }
}

let CURRENT_USER_NAME = "";
let CURRENT_USER_ROLE = "";
let CURRENT_USER_ID = "";

function initUserProfile() {
    const decoded = decodeToken(token);
    if (decoded && decoded.user_name) {
        CURRENT_USER_NAME = decoded.user_name;
        const name = decoded.user_name;
        const role = decoded.user_role;
        CURRENT_USER_ID =  decoded.user_id;
        CURRENT_USER_ROLE = decoded.user_role;
        const firstName = name.split(" ")[0];
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0,2);
        
        document.getElementById("profileName").textContent = name;
        document.getElementById("profileAvatar").textContent = initials;
        document.getElementById("miniProfileAvatar").textContent = initials;
        document.getElementById("profileRole").textContent = role;
    }
}

const bellBtn = document.getElementById('notif-bell');
const dropdown = document.getElementById('notif-dropdown');
const notifList = document.getElementById('notif-list');
const notifCount = document.getElementById('notif-count');

// Toggle Dropdown
bellBtn.onclick = () => dropdown.classList.toggle('hidden');

function formatTime(dateString) {
    const date = new Date(dateString);
    
    // Check if it happened today
    const isToday = new Date().toDateString() === date.toDateString();
    
    if (isToday) {
        // Show just the time if today (e.g., 2:30 PM)
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
        // Show date and time if older (e.g., May 14, 2:30 PM)
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
               ', ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}

async function fetchNotifications() {
    const res = await fetch(`http://localhost:5000/notifications/${CURRENT_USER_ROLE}/${CURRENT_USER_ID}`);
    const data = await res.json();
    
    // Update badge count
    const unreadCount = data.filter(n => !n.is_read).length;
    document.getElementById('notif-count').innerText = unreadCount;
    
    // Render list
    document.getElementById('notif-list').innerHTML = data.map(n => `
        <li class="${n.is_read ? 'read' : 'unread'}" onclick="markAsRead(${n.id})">
            <div class="type status-${n.type}">${n.type}</div>
            <strong>${n.title}</strong>
            <p>${n.message}</p>
            <span class="notif-time">${formatTime(n.created_at)}</span>
        </li>
    `).join('');
}

async function markAsRead(id) {
    await fetch('http://localhost:5000/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            userId: CURRENT_USER_ID, 
            role: CURRENT_USER_ROLE, 
            notificationId: id 
        })
    });
    fetchNotifications();
}

searchInput.addEventListener("input", () => {
    const q = searchInput.value.toLowerCase();
    const rows = dataTableBody.querySelectorAll("tr");

    rows.forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(q) ? "" : "none";
    });
    
});

function showFeedback(type, title, message) {
    const modal = document.getElementById("feedbackModal");
    const icon = document.getElementById("feedbackIcon");
    const titleEl = document.getElementById("feedbackTitle");
    const msgEl = document.getElementById("feedbackMessage");

    icon.className = "bi";

    if (type === "success") {
        icon.classList.add("bi-check-circle-fill", "feedback-success");
    } else if (type === "error") {
        icon.classList.add("bi-x-circle-fill", "feedback-error");
    } else {
        icon.classList.add("bi-exclamation-circle-fill", "feedback-warning");
    }

    titleEl.textContent = title;
    msgEl.textContent = message;

    modal.style.display = "flex";

    document.getElementById("feedbackClose").onclick = () => {
        modal.style.display = "none";
    };

    modal.onclick = (e) => {
        if (e.target === modal) modal.style.display = "none";
    };
}


let currentPage = 1;
const rowsPerPage = 10;

function updatePaginationUI(totalItems, totalPages) {
    document.getElementById("totalItems").innerText = totalItems;
    document.getElementById("startIndex").innerText = totalItems === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
    document.getElementById("endIndex").innerText = Math.min(currentPage * rowsPerPage, totalItems);

    const controls = document.getElementById("paginationControls");
    controls.innerHTML = "";

    const prevBtn = document.createElement("button");
    prevBtn.className = "pagination-btn";
    prevBtn.innerHTML = "&laquo;";
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => { currentPage--; renderTable(); };
    controls.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            const btn = document.createElement("button");
            btn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
            btn.innerText = i;
            btn.onclick = () => { currentPage = i; renderTable(); };
            controls.appendChild(btn);
        }
    }

    const nextBtn = document.createElement("button");
    nextBtn.className = "pagination-btn";
    nextBtn.innerHTML = "&raquo;";
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    nextBtn.onclick = () => { currentPage++; renderTable(); };
    controls.appendChild(nextBtn);
}

function logout() {
    const modal = document.getElementById("logoutModal");
    const logout = document.getElementById("logout");
    modal.style.display = "flex";

    document.getElementById("cancelLogout").onclick = () => {
        modal.style.display = "none";
    };

    modal.onclick = (e) => {
        if (e.target === modal) modal.style.display = "none";
    };

    logout.onclick = (e) => {
        CURRENT_USER_ROLE = "";
        CURRENT_USER_ID = "";
        localStorage.clear();
        window.location.href = "Login.html";
    };
}