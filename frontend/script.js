// ========================================
// SpendWise - Frontend JavaScript
// ========================================

// url
const API_URL = "http://localhost:5000/api";

// Authentication and application state
let authToken = sessionStorage.getItem("spendwise_token");
let currentUser = JSON.parse(
    sessionStorage.getItem("spendwise_user") || "null"
);

let transactions = [];
let expenseChart = null;

// ========================================
// DOM READY
// ========================================

document.addEventListener("DOMContentLoaded", () => {
    setCurrentDate();
    setupAuthentication();
    setupLogout();
    setupTransactionForm();
    setupNavigation();

    if (authToken && currentUser) {
        showDashboard();
    } else {
        showAuthScreen("login");
    }
});

// ========================================
// DATE
// ========================================

function setCurrentDate() {
    const dateElement = document.getElementById("current-date");

    if (dateElement) {
        dateElement.textContent = new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }

    const transactionDate = document.getElementById("transaction-date");

    if (transactionDate && !transactionDate.value) {
        transactionDate.value = getLocalDateString();
    }
}

function getLocalDateString() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// ========================================
// AUTHENTICATION
// ========================================

function setupAuthentication() {
    const authContent = document.getElementById("auth-content");

    if (!authContent) return;

    authContent.addEventListener("click", (event) => {
        const button = event.target.closest("[data-auth-switch]");

        if (button) {
            showAuthScreen(button.dataset.authSwitch);
        }
    });

    authContent.addEventListener("submit", async (event) => {
        const form = event.target;

        if (form.id !== "auth-form") return;

        event.preventDefault();
        await handleAuthentication(form);
    });
}

function showAuthScreen(mode = "login") {
    const authPage = document.getElementById("auth-page");
    const dashboardApp = document.getElementById("dashboard-app");
    const authContent = document.getElementById("auth-content");

    if (authPage) authPage.hidden = false;
    if (dashboardApp) dashboardApp.hidden = true;
    if (!authContent) return;

    const isRegister = mode === "register";

    authContent.innerHTML = `
        <div class="auth-card">
            <div class="auth-brand">
                <div class="auth-logo">S</div>
                <h1>SpendWise</h1>
            </div>

            <h2>${isRegister ? "Create your account" : "Welcome back!"}</h2>

            <p class="auth-subtitle">
                ${
                    isRegister
                        ? "Start managing your money smarter."
                        : "Sign in to continue to your dashboard."
                }
            </p>

            <form id="auth-form">
                ${
                    isRegister
                        ? `
                            <div class="form-group">
                                <label for="auth-name">Full name</label>
                                <input
                                    type="text"
                                    id="auth-name"
                                    name="name"
                                    placeholder="Enter your name"
                                    autocomplete="name"
                                    required
                                >
                            </div>
                        `
                        : ""
                }

                <div class="form-group">
                    <label for="auth-email">Email address</label>
                    <input
                        type="email"
                        id="auth-email"
                        name="email"
                        placeholder="you@example.com"
                        autocomplete="email"
                        required
                    >
                </div>

                <div class="form-group">
                    <label for="auth-password">Password</label>
                    <input
                        type="password"
                        id="auth-password"
                        name="password"
                        placeholder="Enter your password"
                        autocomplete="${
                            isRegister ? "new-password" : "current-password"
                        }"
                        minlength="6"
                        required
                    >
                </div>

                <p id="auth-message" class="form-message" role="status"></p>

                <button type="submit" class="primary-button auth-submit">
                    ${isRegister ? "Create Account" : "Sign In"}
                </button>
            </form>

            <p class="auth-switch">
                ${
                    isRegister
                        ? "Already have an account?"
                        : "Don't have an account?"
                }

                <button
                    type="button"
                    class="text-button"
                    data-auth-switch="${isRegister ? "login" : "register"}"
                >
                    ${isRegister ? "Sign in" : "Create account"}
                </button>
            </p>
        </div>
    `;
}

async function handleAuthentication(form) {
    const formData = new FormData(form);
    const isRegister = formData.has("name");

    const endpoint = isRegister
    ? "/auth/register"
    : "/auth/login";

    const payload = {
        email: String(formData.get("email")).trim(),
        password: String(formData.get("password"))
    };

    if (isRegister) {
        payload.name = String(formData.get("name")).trim();
    }

    const submitButton = form.querySelector('button[type="submit"]');

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Please wait...";
    }

    showAuthMessage("");

    try {
        const result = await apiRequest(endpoint, {
            method: "POST",
            body: JSON.stringify(payload)
        }, false);

        // Support common API response formats.
        const token =
            result.token ||
            result.accessToken ||
            result.access_token;

        const user =
            result.user ||
            result.data?.user ||
            (result.id && result.email ? result : null);

        if (!token) {
            throw new Error(
                result.message ||
                "Authentication succeeded, but the server did not return a token. Check your backend response."
            );
        }

        authToken = token;
        currentUser = user || {
            name: payload.name || payload.email.split("@")[0],
            email: payload.email
        };

        sessionStorage.setItem("spendwise_token", authToken);
        sessionStorage.setItem(
            "spendwise_user",
            JSON.stringify(currentUser)
        );

        showDashboard();
    } catch (error) {
        showAuthMessage(error.message || "Something went wrong.");
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = isRegister
                ? "Create Account"
                : "Sign In";
        }
    }
}

function showAuthMessage(message) {
    const messageElement = document.getElementById("auth-message");

    if (messageElement) {
        messageElement.textContent = message;
    }
}

// ========================================
// LOGOUT
// ========================================

function setupLogout() {
    const logoutButton = document.getElementById("logout-button");

    if (!logoutButton) return;

    logoutButton.addEventListener("click", () => {
        authToken = null;
        currentUser = null;
        transactions = [];

        sessionStorage.removeItem("spendwise_token");
        sessionStorage.removeItem("spendwise_user");

        if (expenseChart) {
            expenseChart.destroy();
            expenseChart = null;
        }

        showAuthScreen("login");
    });
}

// ========================================
// DASHBOARD
// ========================================

async function showDashboard() {
    const authPage = document.getElementById("auth-page");
    const dashboardApp = document.getElementById("dashboard-app");

    if (authPage) authPage.hidden = true;
    if (dashboardApp) dashboardApp.hidden = false;

    updateUserDetails();
    setCurrentDate();

    await loadTransactions();
}

function updateUserDetails() {
    const userNameElement = document.getElementById("user-name");

    if (userNameElement) {
        userNameElement.textContent =
            currentUser?.name ||
            currentUser?.fullName ||
            currentUser?.email?.split("@")[0] ||
            "User";
    }
}

// ========================================
// API REQUEST HELPER
// ========================================

async function apiRequest(endpoint, options = {}, authenticated = true) {
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (authenticated && authToken) {
        headers.Authorization = `Bearer ${authToken}`;
    }

    let response;

    try {
        response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers
        });
    } catch (error) {
        throw new Error(
            "Cannot connect to the server. Make sure your backend is running on port 5000."
        );
    }

    const text = await response.text();

    let result = {};

    if (text) {
        try {
            result = JSON.parse(text);
        } catch {
            result = { message: text };
        }
    }

    if (!response.ok) {
        if (response.status === 401 && authenticated) {
            authToken = null;
            currentUser = null;

            sessionStorage.removeItem("spendwise_token");
            sessionStorage.removeItem("spendwise_user");

            showAuthScreen("login");
        }

        throw new Error(
            result.message ||
            result.error ||
            `Request failed (${response.status}).`
        );
    }

    return result;
}

// ========================================
// TRANSACTIONS
// ========================================

async function loadTransactions() {
    try {
        const result = await apiRequest("/transactions");

        // Support common API response formats.
        if (Array.isArray(result)) {
            transactions = result;
        } else if (Array.isArray(result.transactions)) {
            transactions = result.transactions;
        } else if (Array.isArray(result.data)) {
            transactions = result.data;
        } else {
            transactions = [];
        }

        renderDashboard();
    } catch (error) {
        console.error("Could not load transactions:", error);
        showFormMessage(error.message, true);

        // Keep the dashboard usable if there are no loaded transactions.
        transactions = [];
        renderDashboard();
    }
}

function setupTransactionForm() {
    const form = document.getElementById("transaction-form");

    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const description = document
            .getElementById("description")
            .value.trim();

        const amount = Number(
            document.getElementById("amount").value
        );

        const type = document.getElementById("type").value;
        const category = document.getElementById("category").value;
        const date = document.getElementById("transaction-date").value;

        if (!description || !Number.isFinite(amount) || amount <= 0) {
            showFormMessage("Enter a description and a valid amount.", true);
            return;
        }

        const payload = {
            description,
            amount,
            type,
            category,
            transaction_date: date || getLocalDateString()
        };

        const submitButton = form.querySelector('button[type="submit"]');

        if (submitButton) {
            submitButton.disabled = true;
        }

        showFormMessage("");

        try {
            await apiRequest("/transactions", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            form.reset();

            const dateInput = document.getElementById("transaction-date");

            if (dateInput) {
                dateInput.value = getLocalDateString();
            }

            showFormMessage("Transaction added successfully!");
            await loadTransactions();
        } catch (error) {
            showFormMessage(error.message, true);
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
            }
        }
    });
}

async function deleteTransaction(id) {
    if (!confirm("Are you sure you want to delete this transaction?")) {
        return;
    }

    try {
        await apiRequest(`/transactions/${encodeURIComponent(id)}`, {
            method: "DELETE"
        });

        showFormMessage("Transaction deleted successfully!");
        await loadTransactions();
    } catch (error) {
        showFormMessage(error.message, true);
    }
}

// ========================================
// RENDER DASHBOARD
// ========================================

function renderDashboard() {
    renderSummary();
    renderTransactionTable();
    renderExpenseBreakdown();
    renderExpenseChart();
}

// ========================================
// SUMMARY CARDS
// ========================================

function renderSummary() {
    let income = 0;
    let expenses = 0;

    transactions.forEach((transaction) => {
        const amount = Number(transaction.amount) || 0;

        if (isIncome(transaction.type)) {
            income += amount;
        } else {
            expenses += amount;
        }
    });

    const balance = income - expenses;

    setText("total-balance", formatCurrency(balance));
    setText("total-income", formatCurrency(income));
    setText("total-expenses", formatCurrency(expenses));
    setText("breakdown-total", formatCurrency(expenses));
}

// ========================================
// TRANSACTION TABLE
// ========================================

function renderTransactionTable() {
    const tableBody = document.getElementById("transaction-list");

    if (!tableBody) return;

    if (transactions.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    No transactions yet. Add your first transaction!
                </td>
            </tr>
        `;
        return;
    }

    const sortedTransactions = [...transactions].sort((a, b) => {
        return getTransactionDate(b).localeCompare(getTransactionDate(a));
    });

    tableBody.innerHTML = sortedTransactions.map((transaction) => {
        const id = transaction.id;
        const description = escapeHTML(transaction.description || "Untitled");
        const category = escapeHTML(transaction.category || "Other");
        const date = formatDate(getTransactionDate(transaction));
        const income = isIncome(transaction.type);
        const amount = Number(transaction.amount) || 0;

        const typeLabel = income ? "Income" : "Expense";
        const amountLabel = `${income ? "+" : "-"}${formatCurrency(amount)}`;

        return `
            <tr>
                <td>${description}</td>
                <td>${category}</td>
                <td>
                    <span class="transaction-type ${income ? "income" : "expense"}">
                        ${typeLabel}
                    </span>
                </td>
                <td>${date}</td>
                <td class="transaction-amount ${income ? "income" : "expense"}">
                    ${amountLabel}
                </td>
                <td>
                    <button
                        type="button"
                        class="delete-button"
                        data-delete-id="${escapeHTML(String(id))}"
                        aria-label="Delete ${description}"
                        title="Delete transaction"
                    >
                        Delete
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

// Use event delegation for delete buttons.
document.addEventListener("click", (event) => {
    const deleteButton = event.target.closest("[data-delete-id]");

    if (deleteButton) {
        deleteTransaction(deleteButton.dataset.deleteId);
    }
});

// ========================================
// EXPENSE BREAKDOWN
// ========================================

function renderExpenseBreakdown() {
    const list = document.getElementById("expense-breakdown-list");

    if (!list) return;

    const categoryTotals = {};

    transactions.forEach((transaction) => {
        if (isIncome(transaction.type)) return;

        const category = transaction.category || "Other";
        const amount = Number(transaction.amount) || 0;

        categoryTotals[category] = (categoryTotals[category] || 0) + amount;
    });

    const totalExpenses = Object.values(categoryTotals).reduce(
        (total, amount) => total + amount,
        0
    );

    const entries = Object.entries(categoryTotals).sort(
        (a, b) => b[1] - a[1]
    );

    if (entries.length === 0) {
        list.innerHTML = `
            <p class="empty-state">
                Your expense categories will appear here.
            </p>
        `;
        return;
    }

    const colors = [
        "#4f46e5",
        "#06b6d4",
        "#f59e0b",
        "#10b981",
        "#f43f5e",
        "#8b5cf6",
        "#64748b"
    ];

    list.innerHTML = entries.map(([category, amount], index) => {
        const percentage = totalExpenses > 0
            ? (amount / totalExpenses) * 100
            : 0;

        const color = colors[index % colors.length];

        return `
            <div class="breakdown-item">
                <div class="breakdown-item-top">
                    <span class="breakdown-category">
                        <span
                            class="breakdown-dot"
                            style="background-color: ${color}"
                        ></span>
                        ${escapeHTML(category)}
                    </span>

                    <span class="breakdown-amount">
                        ${formatCurrency(amount)}
                    </span>
                </div>

                <div
                    class="breakdown-progress"
                    role="progressbar"
                    aria-label="${escapeHTML(category)} spending"
                    aria-valuenow="${percentage.toFixed(1)}"
                    aria-valuemin="0"
                    aria-valuemax="100"
                >
                    <span
                        style="width: ${percentage}%; background-color: ${color}"
                    ></span>
                </div>

                <small>${percentage.toFixed(1)}% of expenses</small>
            </div>
        `;
    }).join("");
}

// ========================================
// EXPENSE CHART
// ========================================

function renderExpenseChart() {
    const canvas = document.getElementById("expense-chart");

    if (!canvas || typeof Chart === "undefined") return;

    const categoryTotals = {};

    transactions.forEach((transaction) => {
        if (isIncome(transaction.type)) return;

        const category = transaction.category || "Other";
        const amount = Number(transaction.amount) || 0;

        categoryTotals[category] = (categoryTotals[category] || 0) + amount;
    });

    const labels = Object.keys(categoryTotals);
    const values = Object.values(categoryTotals);

    const colors = [
        "#4f46e5",
        "#06b6d4",
        "#f59e0b",
        "#10b981",
        "#f43f5e",
        "#8b5cf6",
        "#64748b"
    ];

    if (expenseChart) {
        expenseChart.destroy();
        expenseChart = null;
    }

    expenseChart = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels: labels.length ? labels : ["No expenses yet"],
            datasets: [{
                data: values.length ? values : [1],
                backgroundColor: labels.length
                    ? labels.map((_, index) => colors[index % colors.length])
                    : ["#e5e7eb"],
                borderWidth: 0,
                hoverOffset: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "68%",
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label(context) {
                            if (!labels.length) return "No expenses yet";

                            return `${context.label}: ${formatCurrency(context.raw)}`;
                        }
                    }
                }
            }
        }
    });
}

// ========================================
// NAVIGATION
// ========================================

function setupNavigation() {
    const navLinks = document.querySelectorAll(".sidebar a[href^='#']");

    navLinks.forEach((link) => {
        link.addEventListener("click", (event) => {
            const targetId = link.getAttribute("href").slice(1);
            const target = document.getElementById(targetId);

            // Allow only sections that exist on this page.
            if (!target) return;

            event.preventDefault();

            document.querySelectorAll(".sidebar a").forEach((navLink) => {
                navLink.classList.remove("active");
            });

            link.classList.add("active");

            target.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });
    });
}

// ========================================
// HELPERS
// ========================================

function isIncome(type) {
    return String(type || "").toLowerCase() === "income";
}

function getTransactionDate(transaction) {
    return String(
        transaction.transaction_date ||
        transaction.date ||
        transaction.created_at ||
        ""
    ).slice(0, 10);
}

function formatDate(dateString) {
    if (!dateString) return "—";

    const date = new Date(`${dateString}T00:00:00`);

    if (Number.isNaN(date.getTime())) return dateString;

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(Number(amount) || 0);
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}

function showFormMessage(message, isError = false) {
    const element = document.getElementById("form-message");

    if (!element) return;

    element.textContent = message;
    element.classList.toggle("error", isError);
    element.classList.toggle("success", Boolean(message) && !isError);
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (character) => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}