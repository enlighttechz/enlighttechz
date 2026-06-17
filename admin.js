const API_URL = '/api/admin';

// Simple Auth
function login() {
    const pass = document.getElementById('admin-pass').value;
    if (pass === 'admin123' || pass === 'enlight123') {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
        loadData();
    } else {
        alert('Invalid password');
    }
}

function logout() {
    document.getElementById('login-overlay').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

// Load Data
async function loadData() {
    loadContacts();
    loadCareers();
    loadServices();
    loadPackages();
}

// Contacts (Orders)
async function loadContacts() {
    const res = await fetch(`${API_URL}/contacts`);
    const data = await res.json();
    const tbody = document.getElementById('contacts-body');
    tbody.innerHTML = data.map(c => `
        <tr>
            <td>${new Date(c.date).toLocaleDateString()}</td>
            <td>${c.name}</td>
            <td>${c.email}</td>
            <td><strong>${c.service}</strong></td>
            <td>${c.message || '-'}</td>
            <td>
                <select class="status-select" onchange="updateStatus('contacts', '${c._id}', this.value)" style="color: ${c.status === 'Accepted' ? 'green' : c.status === 'Rejected' ? 'red' : 'orange'}">
                    <option value="Pending" ${c.status === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option value="Accepted" ${c.status === 'Accepted' ? 'selected' : ''}>Accepted</option>
                    <option value="Rejected" ${c.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                </select>
            </td>
            <td><button class="btn btn-primary btn-sm" onclick="alert('Contact via: ${c.email}')">Email</button></td>
        </tr>
    `).join('');
}

// Careers (Applications)
async function loadCareers() {
    const res = await fetch(`${API_URL}/careers`);
    const data = await res.json();
    const tbody = document.getElementById('careers-body');
    tbody.innerHTML = data.map(c => `
        <tr>
            <td>${new Date(c.date).toLocaleDateString()}</td>
            <td>${c.name}</td>
            <td>${c.type} - ${c.position}</td>
            <td>${c.email}<br>${c.phone}</td>
            <td>${c.message || '-'}</td>
            <td>
                <select class="status-select" onchange="updateStatus('careers', '${c._id}', this.value)" style="color: ${c.status === 'Accepted' ? 'green' : c.status === 'Rejected' ? 'red' : 'orange'}">
                    <option value="Pending" ${c.status === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option value="Accepted" ${c.status === 'Accepted' ? 'selected' : ''}>Accepted</option>
                    <option value="Rejected" ${c.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                </select>
            </td>
            <td><button class="btn btn-primary btn-sm" onclick="alert('Contact via: ${c.email}')">Email</button></td>
        </tr>
    `).join('');
}

// Status Update
async function updateStatus(type, id, status) {
    try {
        await fetch(`${API_URL}/${type}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        alert('Status updated to ' + status);
    } catch (e) {
        alert('Error updating status');
    }
}

// Services
async function loadServices() {
    const res = await fetch(`${API_URL}/services`);
    const data = await res.json();
    const list = document.getElementById('services-list');
    list.innerHTML = data.map(s => `
        <div class="list-item">
            <div>
                <strong><i class="${s.icon}"></i> ${s.title}</strong>
                <p style="margin: 5px 0; font-size: 0.9rem;">${s.description}</p>
                <small>${s.link}</small>
            </div>
            <button class="btn btn-sm" style="background: #ef4444; color: white; border: none; align-self: flex-start;" onclick="deleteItem('services', '${s._id}')">Delete</button>
        </div>
    `).join('');
}

async function addService(e) {
    e.preventDefault();
    const payload = {
        title: document.getElementById('svc-title').value,
        icon: document.getElementById('svc-icon').value,
        description: document.getElementById('svc-desc').value,
        link: document.getElementById('svc-link').value
    };
    await fetch(`${API_URL}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    e.target.reset();
    loadServices();
}

// Packages
async function loadPackages() {
    const res = await fetch(`${API_URL}/packages`);
    const data = await res.json();
    const list = document.getElementById('packages-list');
    list.innerHTML = data.map(p => `
        <div class="list-item" style="${p.isPremium ? 'border-left: 4px solid #0088ff;' : ''}">
            <div>
                <strong>[${p.category}] ${p.name} - ${p.price}</strong>
                <p style="margin: 5px 0; font-size: 0.9rem;">Features: ${p.features.join(', ')}</p>
                <small>${p.isPremium ? '★ Premium' : 'Standard'}</small>
            </div>
            <button class="btn btn-sm" style="background: #ef4444; color: white; border: none; align-self: flex-start;" onclick="deleteItem('packages', '${p._id}')">Delete</button>
        </div>
    `).join('');
}

async function addPackage(e) {
    e.preventDefault();
    const payload = {
        category: document.getElementById('pkg-category').value,
        name: document.getElementById('pkg-name').value,
        price: document.getElementById('pkg-price').value,
        features: document.getElementById('pkg-features').value.split(',').map(f => f.trim()),
        isPremium: document.getElementById('pkg-premium').checked
    };
    await fetch(`${API_URL}/packages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    e.target.reset();
    loadPackages();
}

async function deleteItem(type, id) {
    if(confirm('Are you sure you want to delete this?')) {
        await fetch(`${API_URL}/${type}/${id}`, { method: 'DELETE' });
        if(type === 'services') loadServices();
        else loadPackages();
    }
}
