async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('loginBtn');
    const errDiv = document.getElementById('loginError');

    if (!username || !password) return;

    btn.disabled = true;
    btn.innerText = '驗證中...';
    errDiv.classList.add('hidden');

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('staffToken', data.token);
            localStorage.setItem('staffUser', JSON.stringify(data.user));
            showTasks();
        } else {
            errDiv.innerText = data.error || '登入失敗';
            errDiv.classList.remove('hidden');
        }
    } catch (err) {
        errDiv.innerText = '連線伺服器失敗';
        errDiv.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.innerText = '登入';
    }
}

function logout() {
    localStorage.removeItem('staffToken');
    localStorage.removeItem('staffUser');
    document.getElementById('taskListView').classList.add('hidden');
    document.getElementById('loginView').classList.remove('hidden');
}

async function loadTasks() {
    const token = localStorage.getItem('staffToken');
    if (!token) return logout();

    try {
        const res = await fetch('/api/work-orders?status=pending', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.status === 401) return logout();

        const tasks = await res.json();
        renderTasks(tasks);
    } catch (err) {
        console.error(err);
        document.getElementById('tasksContainer').innerHTML = '<p class="text-center text-red-500">載入失敗，請重試</p>';
    }
}

function renderTasks(tasks) {
    const container = document.getElementById('tasksContainer');
    if (tasks.length === 0) {
        container.innerHTML = '<p class="text-center color-gray-600 mt-2">目前沒有待辦事項 ��</p>';
        return;
    }

    container.innerHTML = tasks.map(task => `
        <div class="task-card priority-${task.priority}">
            <div class="task-header">
                <span class="badge badge-${task.category}">${task.category === 'cleaning' ? '清潔' : '維修'}</span>
                <span class="font-0875 text-gray-500">${new Date(task.created_at).toLocaleDateString()}</span>
            </div>
            <h3 class="mt-05 mb-05">Room ${task.room_id || 'Public Area'}</h3>
            <p class="text-gray-700 mb-1">${task.description}</p>
            <div class="flex gap-05">
                <button class="btn btn-success btn-complete-task mt-0" data-id="${task.id}">✅ 完成</button>
            </div>
        </div>
    `).join('');
}

async function completeTask(id) {
    if (!confirm('確定完成此工單？')) return;

    const token = localStorage.getItem('staffToken');
    try {
        const res = await fetch(`/api/work-orders/${id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'completed' })
        });

        if (res.status === 401 || res.status === 403) return logout();

        loadTasks(); // Reload
    } catch (err) {
        alert('操作失敗');
    }
}

function showTasks() {
    document.getElementById('loginView').classList.add('hidden');
    document.getElementById('taskListView').classList.remove('hidden');
    loadTasks();
}

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('staffToken')) {
        showTasks();
    }

    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) loginBtn.addEventListener('click', login);

    const logoutBtn = document.querySelector('button[onclick="logout()"]');
    if (logoutBtn) {
        logoutBtn.removeAttribute('onclick');
        logoutBtn.addEventListener('click', logout);
    }

    document.body.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('btn-complete-task')) {
            completeTask(target.getAttribute('data-id'));
        }
    });
});
