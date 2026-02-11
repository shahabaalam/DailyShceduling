const STORAGE_KEY = "daily-scheduler-v2";

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const ICON_OPTIONS = ["⏰", "⚑", "🚿", "☕", "🚲", "📊", "☎", "✶", "📝", "🏃"];
const COLOR_OPTIONS = [
  { id: "coral", label: "Coral" },
  { id: "blue", label: "Blue" },
  { id: "ink-blue", label: "Ink Blue" },
  { id: "green", label: "Green" },
  { id: "plum", label: "Plum" },
  { id: "gray", label: "Gray" },
];

const ui = {
  app: document.querySelector(".app"),
  weekRow: document.getElementById("week-row"),
  monthName: document.getElementById("month-name"),
  monthYear: document.getElementById("month-year"),
  dateCaption: document.getElementById("date-caption"),
  btnAuth: document.getElementById("btn-auth"),
  authUser: document.getElementById("auth-user"),
  taskCounter: document.getElementById("task-counter"),
  progressFill: document.getElementById("progress-fill"),
  viewLabel: document.getElementById("view-label"),
  quickList: document.getElementById("quick-list"),
  eventList: document.getElementById("event-list"),
  emptyState: document.getElementById("empty-state"),
  addTask: document.getElementById("add-task"),
  btnFocus: document.getElementById("btn-focus"),
  btnCalendar: document.getElementById("btn-calendar"),
  btnInbox: document.getElementById("btn-inbox"),
  btnSettings: document.getElementById("btn-settings"),
  btnMobileMenu: document.getElementById("btn-mobile-menu"),
  calendarPopover: document.getElementById("calendar-popover"),
  calendarDays: document.getElementById("calendar-days"),
  jumpDate: document.getElementById("jump-date"),
  jumpToday: document.getElementById("jump-today"),
  closeCalendar: document.getElementById("close-calendar"),
  mobileMenu: document.getElementById("mobile-menu"),
  closeMobileMenu: document.getElementById("close-mobile-menu"),
  mobileMenuUser: document.getElementById("mobile-menu-user"),
  menuFocus: document.getElementById("menu-focus"),
  menuCalendar: document.getElementById("menu-calendar"),
  menuInbox: document.getElementById("menu-inbox"),
  menuSettings: document.getElementById("menu-settings"),
  menuSignout: document.getElementById("menu-signout"),
  desktopSidebar: document.getElementById("desktop-sidebar"),
  sideToggle: document.getElementById("side-toggle"),
  desktopUser: document.getElementById("desktop-user"),
  sideFocus: document.getElementById("side-focus"),
  sideCalendar: document.getElementById("side-calendar"),
  sideInbox: document.getElementById("side-inbox"),
  sideSettings: document.getElementById("side-settings"),
  sideSignout: document.getElementById("side-signout"),
  inboxSheet: document.getElementById("inbox-sheet"),
  inboxContent: document.getElementById("inbox-content"),
  closeInbox: document.getElementById("close-inbox"),
  settingsModal: document.getElementById("settings-modal"),
  compactToggle: document.getElementById("compact-toggle"),
  darkModeToggle: document.getElementById("dark-mode-toggle"),
  closeSettings: document.getElementById("close-settings"),
  clearCompleted: document.getElementById("clear-completed"),
  resetApp: document.getElementById("reset-app"),
  taskModal: document.getElementById("task-modal"),
  taskForm: document.getElementById("task-form"),
  taskModalTitle: document.getElementById("task-modal-title"),
  taskId: document.getElementById("task-id"),
  taskName: document.getElementById("task-name"),
  taskDate: document.getElementById("task-date"),
  taskIcon: document.getElementById("task-icon"),
  taskStart: document.getElementById("task-start"),
  taskEnd: document.getElementById("task-end"),
  taskColor: document.getElementById("task-color"),
  taskNotes: document.getElementById("task-notes"),
  taskFormError: document.getElementById("task-form-error"),
  deleteTask: document.getElementById("delete-task"),
  cancelTask: document.getElementById("cancel-task"),
  closeTask: document.getElementById("close-task"),
  backdrop: document.getElementById("backdrop"),
  toast: document.getElementById("toast"),
};

let toastTimer = null;
const API_URL = `${window.location.origin}/api`;
let isAuthenticated = false;

const api = {
  async getMe() {
    const response = await fetch(`${API_URL}/auth/me`);
    if (!response.ok) throw new Error("Failed to fetch auth state");
    return await response.json();
  },

  async logout() {
    const response = await fetch(`${API_URL}/auth/logout`, { method: "POST" });
    if (!response.ok) throw new Error("Failed to logout");
  },

  async getAllTasks() {
    try {
      const response = await fetch(`${API_URL}/tasks`);
      if (response.status === 401) throw new Error("AUTH_REQUIRED");
      if (!response.ok) throw new Error("Failed to fetch tasks");
      return await response.json();
    } catch (e) {
      if (e.message !== "AUTH_REQUIRED") console.error(e);
      return [];
    }
  },

  async saveTask(task) {
    try {
      const response = await fetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...task,
          day_id: task.dayId || state.selectedDate || toISODate(new Date()),
        }),
      });
      if (response.status === 401) throw new Error("AUTH_REQUIRED");
      if (!response.ok) throw new Error("Failed to save task");
    } catch (e) {
      if (e.message === "AUTH_REQUIRED") {
        handleUnauthenticated();
      } else {
        console.error(e);
        showToast("Error saving task");
      }
    }
  },

  async deleteTask(taskId) {
    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: "DELETE",
      });
      if (response.status === 401) throw new Error("AUTH_REQUIRED");
      if (!response.ok) throw new Error("Failed to delete task");
    } catch (e) {
      if (e.message === "AUTH_REQUIRED") {
        handleUnauthenticated();
      } else {
        console.error(e);
        showToast("Error deleting task");
      }
    }
  },

  async getSetting(key) {
    try {
      const response = await fetch(`${API_URL}/settings/${key}`);
      if (response.status === 401) throw new Error("AUTH_REQUIRED");
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("Failed to fetch setting");
      const data = await response.json();
      return JSON.parse(data.value); // Value is stored as stringified JSON
    } catch (e) {
      if (e.message === "AUTH_REQUIRED") {
        handleUnauthenticated();
      }
      return null;
    }
  },

  async saveSetting(key, value) {
    try {
      const response = await fetch(`${API_URL}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          value: JSON.stringify(value),
        }),
      });
      if (response.status === 401) throw new Error("AUTH_REQUIRED");
      if (!response.ok) throw new Error("Failed to save setting");
    } catch (e) {
      if (e.message === "AUTH_REQUIRED") {
        handleUnauthenticated();
      } else {
        console.error(e);
      }
    }
  },

  async clearAll() {
    try {
      const response = await fetch(`${API_URL}/clear`, {
        method: "POST",
      });
      if (response.status === 401) throw new Error("AUTH_REQUIRED");
      if (!response.ok) throw new Error("Failed to clear data");
    } catch (e) {
      if (e.message === "AUTH_REQUIRED") {
        handleUnauthenticated();
      } else {
        console.error(e);
        showToast("Error clearing data");
      }
    }
  },
};

let state = createDefaultState(); // Initial default state

async function initialize() {
  try {
    const auth = await api.getMe();
    isAuthenticated = Boolean(auth.authenticated);
    state.authUser = auth.user || null;

    await loadStateFromAPI();
    populateTaskFormOptions();
    wireEvents();
    renderAll();
  } catch (err) {
    console.error("Failed to init:", err);
    showToast("Error connecting to server. Is it running?");
  }
}

initialize();

async function loadStateFromAPI() {
  if (!isAuthenticated) return;
  try {
    // Load Settings
    const savedState = await api.getSetting("appState");
    if (savedState) {
      if (savedState.selectedDate && isValidDateString(savedState.selectedDate)) {
        state.selectedDate = savedState.selectedDate;
      } else if (savedState.selectedDay) {
        const mapped = mapLegacyDayToDate(savedState.selectedDay);
        state.selectedDate = mapped || state.selectedDate;
      }
      state.focusMode = !!savedState.focusMode;
      state.compactMode = !!savedState.compactMode;
      state.darkMode = !!savedState.darkMode;
      state.sidebarCollapsed = !!savedState.sidebarCollapsed;
    }

    // Load Tasks
    const allTasks = await api.getAllTasks();
    if (allTasks.length === 0) {
      state.tasks = {};
      return;
    }

    // Reconstruct state.tasks object
    state.tasks = {};

    for (const task of allTasks) {
      // Backend sends 'day_id', frontend uses 'dayId'
      const dateKey = normalizeTaskDate(task.day_id);
      if (!state.tasks[dateKey]) state.tasks[dateKey] = [];
      state.tasks[dateKey].push({ ...task, dayId: dateKey });
    }

    // Sort all days
    Object.values(state.tasks).forEach(list => sortTasks(list));

  } catch (e) {
    console.error("Error loading state:", e);
  }
}

// Helper to save current simple state (settings)
async function persistSettings() {
  if (!isAuthenticated) return;
  await api.saveSetting("appState", {
    selectedDate: state.selectedDate,
    focusMode: state.focusMode,
    compactMode: state.compactMode,
    darkMode: state.darkMode,
    sidebarCollapsed: state.sidebarCollapsed
  });
}

function createDefaultState() {
  const today = new Date();
  return {
    authUser: null,
    selectedDate: toISODate(today),
    focusMode: false,
    compactMode: false,
    darkMode: false,
    sidebarCollapsed: false,
    quickTasks: [],
    tasks: {},
  };
}

function loadState() {
  const defaults = createDefaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return defaults;
    return normalizeState(parsed, defaults);
  } catch (_error) {
    return defaults;
  }
}

function normalizeState(raw, defaults) {
  const normalized = {
    selectedDate: isValidDateString(raw.selectedDate) ? raw.selectedDate : defaults.selectedDate,
    focusMode: Boolean(raw.focusMode),
    compactMode: Boolean(raw.compactMode),
    darkMode: Boolean(raw.darkMode),
    quickTasks: [],
    tasks: {},
  };

  if (Array.isArray(raw.quickTasks)) {
    normalized.quickTasks = raw.quickTasks
      .map((item) => normalizeQuickTask(item))
      .filter(Boolean);
  }
  if (!normalized.quickTasks.length) {
    normalized.quickTasks = defaults.quickTasks.map((item) => ({ ...item }));
  }

  if (raw.tasks && typeof raw.tasks === "object") {
    for (const [key, list] of Object.entries(raw.tasks)) {
      if (!Array.isArray(list)) continue;
      const dateKey = normalizeTaskDate(key);
      const cleaned = list.map((item) => normalizeTask(item)).filter(Boolean);
      if (!normalized.tasks[dateKey]) normalized.tasks[dateKey] = [];
      normalized.tasks[dateKey].push(...cleaned);
    }
  } else {
    normalized.tasks = { ...defaults.tasks };
  }

  Object.values(normalized.tasks).forEach((list) => sortTasks(list));

  return normalized;
}

function normalizeQuickTask(item) {
  if (!item || typeof item !== "object") return null;
  const title = String(item.title || "").trim();
  if (!title) return null;
  return {
    id: String(item.id || createId()),
    title,
    icon: ICON_OPTIONS.includes(item.icon) ? item.icon : "📝",
    color: isValidColor(item.color) ? item.color : "gray",
  };
}

function normalizeTask(item) {
  if (!item || typeof item !== "object") return null;
  const title = String(item.title || "").trim();
  if (!title) return null;

  const start = isValidTime(item.start) ? item.start : "09:00";
  const end = isValidTime(item.end) ? item.end : addMinutes(start, 30);

  return {
    id: String(item.id || createId()),
    title,
    start,
    end: toMinutes(end) > toMinutes(start) ? end : addMinutes(start, 30),
    icon: ICON_OPTIONS.includes(item.icon) ? item.icon : "📝",
    color: isValidColor(item.color) ? item.color : "gray",
    done: Boolean(item.done),
    notes: String(item.notes || "").slice(0, 160),
  };
}

function wireEvents() {
  ui.weekRow.addEventListener("click", onWeekRowClick);
  ui.quickList.addEventListener("click", onQuickListClick);
  ui.eventList.addEventListener("click", onEventListClick);
  ui.calendarDays.addEventListener("click", onCalendarDayClick);

  ui.addTask.addEventListener("click", () => openTaskModal());
  ui.btnMobileMenu.addEventListener("click", () => toggleLayer(ui.mobileMenu));
  ui.closeMobileMenu.addEventListener("click", closeLayers);
  ui.menuFocus.addEventListener("click", () => {
    closeLayers();
    ui.btnFocus.click();
  });
  ui.menuCalendar.addEventListener("click", () => {
    closeLayers();
    ui.btnCalendar.click();
  });
  ui.menuInbox.addEventListener("click", () => {
    closeLayers();
    openLayer(ui.inboxSheet);
  });
  ui.menuSettings.addEventListener("click", () => {
    closeLayers();
    openLayer(ui.settingsModal);
  });
  ui.menuSignout.addEventListener("click", async () => {
    await api.logout();
    window.location.replace("/login");
  });
  ui.sideToggle.addEventListener("click", () => {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    persistSettings();
    renderAll();
  });
  ui.sideFocus.addEventListener("click", () => ui.btnFocus.click());
  ui.sideCalendar.addEventListener("click", () => ui.btnCalendar.click());
  ui.sideInbox.addEventListener("click", () => {
    if (ui.inboxSheet.classList.contains("hidden")) {
      openLayer(ui.inboxSheet);
    } else {
      closeLayers();
    }
  });
  ui.sideSettings.addEventListener("click", () => {
    if (ui.settingsModal.classList.contains("hidden")) {
      openLayer(ui.settingsModal);
    } else {
      closeLayers();
    }
  });
  ui.sideSignout.addEventListener("click", async () => {
    await api.logout();
    window.location.replace("/login");
  });
  ui.btnAuth.addEventListener("click", async () => {
    if (isAuthenticated) {
      await api.logout();
      window.location.replace("/login");
      return;
    }
    window.location.href = "/auth/google/login";
  });

  ui.btnFocus.addEventListener("click", () => {
    state.focusMode = !state.focusMode;
    persistSettings();
    renderAll();
    showToast(state.focusMode ? "Focus mode enabled" : "Focus mode disabled");
  });

  ui.btnCalendar.addEventListener("click", () => {
    const shouldOpen = ui.calendarPopover.classList.contains("hidden");
    closeCalendarPopover();
    if (shouldOpen) {
      renderCalendarDays();
      ui.calendarPopover.classList.remove("hidden");
      ui.btnCalendar.classList.add("active");
      ui.sideCalendar.classList.add("active");
    }
  });

  ui.btnInbox.addEventListener("click", () => toggleLayer(ui.inboxSheet));
  ui.btnSettings.addEventListener("click", () => toggleLayer(ui.settingsModal));
  ui.closeCalendar.addEventListener("click", closeCalendarPopover);
  ui.jumpDate.addEventListener("change", () => {
    if (ui.jumpDate.value) setSelectedDate(ui.jumpDate.value);
  });
  ui.jumpToday.addEventListener("click", () => setSelectedDate(toISODate(new Date())));
  ui.closeInbox.addEventListener("click", closeLayers);
  ui.closeSettings.addEventListener("click", closeLayers);
  ui.closeTask.addEventListener("click", closeLayers);
  ui.cancelTask.addEventListener("click", closeLayers);
  ui.backdrop.addEventListener("click", closeLayers);

  ui.compactToggle.addEventListener("change", () => {
    state.compactMode = ui.compactToggle.checked;
    persistSettings();
    renderAll();
    showToast(state.compactMode ? "Compact mode on" : "Compact mode off");
  });

  ui.darkModeToggle.addEventListener("change", () => {
    state.darkMode = ui.darkModeToggle.checked;
    persistSettings();
    renderAll();
    showToast(state.darkMode ? "Dark mode on" : "Dark mode off");
  });

  ui.clearCompleted.addEventListener("click", async () => {
    const dayTasks = getTasksForDate(state.selectedDate);
    const before = dayTasks.length;
    const toDelete = dayTasks.filter((task) => task.done);

    if (toDelete.length === 0) {
      showToast("No completed tasks to clear");
      return;
    }

    // Optimistic update
    state.tasks[state.selectedDate] = dayTasks.filter((task) => !task.done);
    renderAll();

    // DB delete
    for (const task of toDelete) {
      await api.deleteTask(task.id);
    }

    showToast("Cleared completed tasks");
    closeLayers();
  });

  ui.resetApp.addEventListener("click", async () => {
    if (!window.confirm("Reset all your tasks and settings for this account?")) return;
    await api.clearAll();
    state = createDefaultState();
    await persistSettings();
    renderAll();
    closeLayers();
    showToast("Your schedule was reset");
  });

  ui.taskForm.addEventListener("submit", onTaskSubmit);

  ui.deleteTask.addEventListener("click", () => {
    const taskId = ui.taskId.value;
    if (!taskId) return;
    if (!window.confirm("Delete this task?")) return;
    if (removeTask(taskId)) {
      api.deleteTask(taskId); // Fire and forget
      renderAll();
      closeLayers();
      showToast("Task deleted");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeCalendarPopover();
      closeLayers();
    }
  });

  document.addEventListener("click", (event) => {
    if (ui.calendarPopover.classList.contains("hidden")) return;
    const insidePopover = ui.calendarPopover.contains(event.target);
    const onButton = ui.btnCalendar.contains(event.target);
    if (!insidePopover && !onButton) closeCalendarPopover();
  });
}

function onWeekRowClick(event) {
  const button = event.target.closest(".day-btn");
  if (!button) return;
  setSelectedDate(button.dataset.date);
}

function onQuickListClick(event) {
  const button = event.target.closest(".quick-icon");
  if (!button) return;

  const taskId = button.dataset.id;
  if (!taskId) return;
  toggleTaskComplete(taskId);
}

function onEventListClick(event) {
  const ring = event.target.closest(".status-ring");
  if (ring) {
    toggleTaskComplete(ring.dataset.id);
    return;
  }

  const edit = event.target.closest(".edit-task");
  if (edit) {
    openTaskModal(edit.dataset.id);
    return;
  }

  const del = event.target.closest(".delete-task");
  if (del) {
    if (!window.confirm("Delete this task?")) return;
    if (removeTask(del.dataset.id)) {
      api.deleteTask(del.dataset.id);
      renderAll();
      showToast("Task deleted");
    }
  }
}

function onCalendarDayClick(event) {
  const button = event.target.closest(".calendar-day-btn");
  if (!button) return;
  setSelectedDate(button.dataset.date);
  closeCalendarPopover();
}

function onTaskSubmit(event) {
  event.preventDefault();
  ui.taskFormError.textContent = "";

  const formData = readTaskForm();
  if (!formData.valid) {
    ui.taskFormError.textContent = formData.error;
    return;
  }

  const existingId = ui.taskId.value;
  if (existingId) {
    const found = findTaskById(existingId);
    if (!found) {
      ui.taskFormError.textContent = "Could not find this task.";
      return;
    }

    const updatedTask = {
      ...found.task,
      title: formData.title,
      start: formData.start,
      end: formData.end,
      icon: formData.icon,
      color: formData.color,
      notes: formData.notes,
    };

    if (found.dayId === formData.dateKey) {
      state.tasks[found.dayId][found.index] = updatedTask;
      sortTasks(state.tasks[found.dayId]);
    } else {
      state.tasks[found.dayId].splice(found.index, 1);
      getTasksForDate(formData.dateKey).push(updatedTask);
      sortTasks(state.tasks[formData.dateKey]);
    }

    state.selectedDate = formData.dateKey;
    api.saveTask({ ...updatedTask, dayId: formData.dateKey });
    persistSettings();

    renderAll();
    closeLayers();
    showToast("Task updated");
    return;
  }

  const newTask = {
    id: createId(),
    title: formData.title,
    start: formData.start,
    end: formData.end,
    icon: formData.icon,
    color: formData.color,
    done: false,
    notes: formData.notes,
  };

  getTasksForDate(formData.dateKey).push(newTask);
  sortTasks(state.tasks[formData.dateKey]);
  state.selectedDate = formData.dateKey;

  api.saveTask({ ...newTask, dayId: formData.dateKey });
  persistSettings();

  renderAll();
  closeLayers();
  showToast("Task added");
}

function setSelectedDate(dateString) {
  if (!isValidDateString(dateString)) return;
  state.selectedDate = dateString;
  persistSettings();
  renderAll();
}

function toggleTaskComplete(taskId) {
  const found = findTaskById(taskId);
  if (!found) return;
  found.task.done = !found.task.done;
  api.saveTask({ ...found.task, dayId: found.dayId });
  renderAll();
  showToast(found.task.done ? "Task completed" : "Task reopened");
}

function removeTask(taskId) {
  const found = findTaskById(taskId);
  if (!found) return false;
  state.tasks[found.dayId].splice(found.index, 1);
  return true;
}

function openTaskModal(taskId) {
  closeCalendarPopover();
  ui.taskFormError.textContent = "";

  if (taskId) {
    const found = findTaskById(taskId);
    if (!found) return;
    ui.taskModalTitle.textContent = "Edit Task";
    ui.taskId.value = found.task.id;
    ui.taskName.value = found.task.title;
    ui.taskDate.value = found.dayId;
    ui.taskIcon.value = found.task.icon;
    ui.taskStart.value = found.task.start;
    ui.taskEnd.value = found.task.end;
    ui.taskColor.value = found.task.color;
    ui.taskNotes.value = found.task.notes || "";
    ui.deleteTask.classList.remove("hidden");
  } else {
    const defaults = getNewTaskDefaults(state.selectedDate);
    ui.taskModalTitle.textContent = "Add Task";
    ui.taskId.value = "";
    ui.taskName.value = "";
    ui.taskDate.value = state.selectedDate;
    ui.taskIcon.value = defaults.icon;
    ui.taskStart.value = defaults.start;
    ui.taskEnd.value = defaults.end;
    ui.taskColor.value = defaults.color;
    ui.taskNotes.value = "";
    ui.deleteTask.classList.add("hidden");
  }

  openLayer(ui.taskModal);
  ui.taskName.focus();
}

function getNewTaskDefaults(dateKey) {
  const tasks = [...getTasksForDate(dateKey)];
  sortTasks(tasks);
  if (tasks.length) {
    const lastTask = tasks[tasks.length - 1];
    const start = lastTask.end;
    return {
      start,
      end: addMinutes(start, 30),
      icon: "📝",
      color: "gray",
    };
  }
  return {
    start: "09:00",
    end: "09:30",
    icon: "📝",
    color: "gray",
  };
}

function readTaskForm() {
  const title = ui.taskName.value.trim();
  const dateKey = ui.taskDate.value;
  const icon = ui.taskIcon.value;
  const start = ui.taskStart.value;
  const end = ui.taskEnd.value;
  const color = ui.taskColor.value;
  const notes = ui.taskNotes.value.trim().slice(0, 160);

  if (!title) return { valid: false, error: "Task title is required." };
  if (!isValidDateString(dateKey)) return { valid: false, error: "Please choose a valid date." };
  if (!ICON_OPTIONS.includes(icon)) return { valid: false, error: "Please choose a valid icon." };
  if (!isValidTime(start) || !isValidTime(end)) {
    return { valid: false, error: "Start and end time are required." };
  }
  if (toMinutes(end) <= toMinutes(start)) {
    return { valid: false, error: "End time must be after start time." };
  }
  if (!isValidColor(color)) return { valid: false, error: "Please choose a valid color." };

  return { valid: true, title, dateKey, icon, start, end, color, notes };
}

function findTaskById(taskId) {
  for (const [dateKey, tasks] of Object.entries(state.tasks)) {
    const index = tasks.findIndex((task) => task.id === taskId);
    if (index >= 0) {
      return { dayId: dateKey, index, task: tasks[index] };
    }
  }
  return null;
}

function renderAll() {
  ui.app.classList.toggle("sidebar-collapsed", state.sidebarCollapsed);
  ui.sideToggle.textContent = state.sidebarCollapsed ? "⟩" : "⟨";
  ui.sideToggle.setAttribute(
    "aria-label",
    state.sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
  );
  ui.sideToggle.title = state.sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar";
  renderAuthState();
  renderWeekRow();
  renderHeader();
  renderQuickTasks();
  renderEvents();
  renderCalendarDays();
  renderInbox();
  ui.compactToggle.checked = state.compactMode;
  ui.darkModeToggle.checked = state.darkMode;
  document.body.classList.toggle("dark-mode", state.darkMode);
}

function renderAuthState() {
  if (isAuthenticated && state.authUser) {
    ui.btnAuth.textContent = "Sign out";
    ui.authUser.textContent = state.authUser.email || state.authUser.name || "";
    ui.mobileMenuUser.textContent = state.authUser.email || state.authUser.name || "";
    ui.desktopUser.textContent = state.authUser.email || state.authUser.name || "";
    ui.menuSignout.disabled = false;
    ui.sideSignout.disabled = false;
  } else {
    ui.btnAuth.textContent = "Sign in with Google";
    ui.authUser.textContent = "";
    ui.mobileMenuUser.textContent = "";
    ui.desktopUser.textContent = "";
    ui.menuSignout.disabled = true;
    ui.sideSignout.disabled = true;
    ui.quickList.innerHTML = "";
    ui.eventList.innerHTML = "";
    ui.emptyState.hidden = false;
    ui.emptyState.textContent = "Sign in with Google to view or manage tasks.";
  }

  const locked = !isAuthenticated;
  ui.addTask.disabled = locked;
  ui.btnFocus.disabled = locked;
  ui.btnCalendar.disabled = locked;
  ui.btnInbox.disabled = locked;
  ui.btnSettings.disabled = locked;
  ui.btnMobileMenu.disabled = locked;
  ui.sideFocus.disabled = locked;
  ui.sideCalendar.disabled = locked;
  ui.sideInbox.disabled = locked;
  ui.sideSettings.disabled = locked;
}

function handleUnauthenticated() {
  window.location.replace("/login");
}

function renderWeekRow() {
  ui.weekRow.innerHTML = "";
  const week = getWeekDays(parseISODate(state.selectedDate));
  for (const day of week) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "day-btn";
    button.dataset.date = day.id;
    if (day.id === state.selectedDate) button.classList.add("active");

    const weekday = document.createElement("span");
    weekday.className = "weekday";
    weekday.textContent = day.short;

    const date = document.createElement("span");
    date.className = "date";
    date.textContent = day.date;

    button.append(weekday, date);
    ui.weekRow.append(button);
  }
}

function renderHeader() {
  if (!isAuthenticated) {
    ui.taskCounter.textContent = "Sign in required";
    ui.progressFill.style.width = "0%";
    ui.viewLabel.textContent = "Login to continue";
    return;
  }

  const selectedDate = parseISODate(state.selectedDate);
  ui.monthName.textContent = MONTH_NAMES[selectedDate.getMonth()];
  ui.monthYear.textContent = String(selectedDate.getFullYear());
  ui.dateCaption.textContent = `${WEEKDAY_FULL[selectedDate.getDay()]}, ${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getDate()}`;
  ui.jumpDate.value = state.selectedDate;

  const dayTasks = getTasksForDate(state.selectedDate);
  const completedCount = dayTasks.filter((task) => task.done).length;
  const totalCount = dayTasks.length;
  const percentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  ui.taskCounter.textContent = `${completedCount} of ${totalCount} complete`;
  ui.progressFill.style.width = `${percentage}%`;
  ui.viewLabel.textContent = state.focusMode ? "Focus mode: incomplete only" : "All tasks";
  ui.menuFocus.textContent = state.focusMode ? "Disable focus mode" : "Enable focus mode";
  ui.sideFocus.querySelector(".desktop-action-label").textContent = state.focusMode
    ? "Disable focus mode"
    : "Enable focus mode";

  ui.btnFocus.classList.toggle("active", state.focusMode);
  ui.sideFocus.classList.toggle("active", state.focusMode);
  ui.btnInbox.classList.toggle("active", !ui.inboxSheet.classList.contains("hidden"));
  ui.sideInbox.classList.toggle("active", !ui.inboxSheet.classList.contains("hidden"));
  ui.btnSettings.classList.toggle("active", !ui.settingsModal.classList.contains("hidden"));
  ui.sideSettings.classList.toggle("active", !ui.settingsModal.classList.contains("hidden"));
  ui.btnMobileMenu.classList.toggle("active", !ui.mobileMenu.classList.contains("hidden"));
  ui.sideCalendar.classList.toggle("active", !ui.calendarPopover.classList.contains("hidden"));
}

function renderQuickTasks() {
  if (!isAuthenticated) return;
  ui.quickList.innerHTML = "";
  const dayTasks = [...getTasksForDate(state.selectedDate)];
  sortTasks(dayTasks);

  if (dayTasks.length === 0) {
    const emptyMsg = document.createElement("p");
    emptyMsg.style.padding = "1rem";
    emptyMsg.style.color = "var(--muted)";
    emptyMsg.style.fontSize = "0.9rem";
    emptyMsg.textContent = "No tasks for this day.";
    ui.quickList.append(emptyMsg);
    return;
  }

  for (const item of dayTasks) {
    const card = document.createElement("article");
    card.className = "quick-card";
    if (item.done) card.classList.add("done");

    const iconButton = document.createElement("button");
    iconButton.type = "button";
    iconButton.className = `quick-icon ${item.color}`;
    iconButton.dataset.id = item.id;
    iconButton.setAttribute("aria-label", `Toggle ${item.title}`);
    iconButton.textContent = item.icon;

    const label = document.createElement("p");
    label.textContent = item.title;

    card.append(iconButton, label);
    ui.quickList.append(card);
  }
}

function renderEvents() {
  if (!isAuthenticated) return;
  ui.eventList.innerHTML = "";

  const tasks = [...getTasksForDate(state.selectedDate)];
  sortTasks(tasks);
  const visibleTasks = state.focusMode ? tasks.filter((task) => !task.done) : tasks;

  ui.eventList.classList.toggle("compact", state.compactMode);
  ui.emptyState.hidden = visibleTasks.length > 0;
  if (!visibleTasks.length) return;

  for (const task of visibleTasks) {
    ui.eventList.append(createEventRow(task));
  }
}

function createEventRow(task) {
  const row = document.createElement("article");
  const duration = getDuration(task);
  const size = getSizeClass(duration);
  row.className = `event ${size}`;
  if (task.done) row.classList.add("done");

  const isCurrent = isTaskCurrent(task, state.selectedDate);

  const timeStack = document.createElement("div");
  timeStack.className = "time-stack";
  const timeLabels = buildTimeStack(task, isCurrent);
  for (const label of timeLabels) {
    if (label.isNow) {
      const strong = document.createElement("strong");
      strong.textContent = label.value;
      timeStack.append(strong);
    } else {
      const span = document.createElement("span");
      span.textContent = label.value;
      timeStack.append(span);
    }
  }

  const track = document.createElement("div");
  track.className = "track";

  const node = document.createElement("div");
  node.className = `task-node ${nodeShapeClass(size)}`;
  node.dataset.color = task.color;
  node.setAttribute("aria-hidden", "true");
  node.textContent = task.icon;
  track.append(node);

  const details = document.createElement("div");
  details.className = "details";

  const meta = document.createElement("p");
  meta.className = "meta";
  meta.textContent = isCurrent
    ? `${getRemainingMinutes(task)}m remaining`
    : `${formatRange(task.start, task.end)} (${formatDuration(duration)})`;

  const title = document.createElement("h2");
  title.textContent = task.title;

  details.append(meta, title);

  if (task.notes) {
    const note = document.createElement("p");
    note.className = "task-note";
    note.textContent = task.notes;
    details.append(note);
  }

  const tools = document.createElement("div");
  tools.className = "task-tools";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "tool-btn edit-task";
  editButton.dataset.id = task.id;
  editButton.textContent = "Edit";

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "tool-btn delete-task";
  deleteButton.dataset.id = task.id;
  deleteButton.textContent = "Delete";

  tools.append(editButton, deleteButton);
  details.append(tools);

  const ring = document.createElement("button");
  ring.type = "button";
  ring.className = "status-ring";
  ring.dataset.id = task.id;
  ring.dataset.color = task.color;
  ring.setAttribute("aria-label", `Toggle task ${task.title}`);
  if (task.done) ring.classList.add("is-complete");

  row.append(timeStack, track, details, ring);
  return row;
}

function renderCalendarDays() {
  ui.calendarDays.innerHTML = "";
  const week = getWeekDays(parseISODate(state.selectedDate));
  for (const day of week) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day-btn";
    if (day.id === state.selectedDate) button.classList.add("active");
    button.dataset.date = day.id;
    button.innerHTML = `
      ${day.full}, ${MONTH_NAMES[day.month]} ${day.date}
      <span>${getTasksForDate(day.id).length} tasks</span>
    `;
    ui.calendarDays.append(button);
  }
}

function renderInbox() {
  if (!isAuthenticated) {
    ui.inboxContent.innerHTML = `<p class="sheet-summary">Sign in with Google to open inbox.</p>`;
    return;
  }
  const completed = [];
  const week = getWeekDays(parseISODate(state.selectedDate));
  for (const day of week) {
    for (const task of getTasksForDate(day.id)) {
      if (!task.done) continue;
      completed.push({
        day: `${day.full}, ${MONTH_NAMES[day.month]} ${day.date}`,
        title: task.title,
        range: formatRange(task.start, task.end),
      });
    }
  }

  const upcoming = [...getTasksForDate(state.selectedDate)]
    .filter((task) => !task.done)
    .slice(0, 4);
  const pendingQuick = upcoming;

  const completedMarkup = completed.length
    ? `<ul>${completed
      .map(
        (item) =>
          `<li><strong>${escapeHtml(item.title)}</strong><br>${escapeHtml(item.day)} · ${escapeHtml(item.range)}</li>`
      )
      .join("")}</ul>`
    : `<p class="sheet-summary">No completed timeline tasks yet.</p>`;

  const quickMarkup = pendingQuick.length
    ? `<ul>${pendingQuick
      .map((item) => `<li>${escapeHtml(item.icon)} ${escapeHtml(item.title)}</li>`)
      .join("")}</ul>`
    : `<p class="sheet-summary">All quick tasks are done.</p>`;

  const upcomingMarkup = upcoming.length
    ? `<ul>${upcoming
      .map(
        (task) =>
          `<li><strong>${escapeHtml(task.title)}</strong><br>${escapeHtml(
            formatRange(task.start, task.end)
          )}</li>`
      )
      .join("")}</ul>`
    : `<p class="sheet-summary">No upcoming tasks for selected day.</p>`;

  ui.inboxContent.innerHTML = `
    <p class="sheet-summary">${getTasksForDate(state.selectedDate).length} tasks in selected day</p>
    <h3>Upcoming (Selected Day)</h3>
    ${upcomingMarkup}
    <h3>Pending Quick Tasks</h3>
    ${quickMarkup}
    <h3>Completed This Week</h3>
    ${completedMarkup}
  `;
}

function populateTaskFormOptions() {
  ui.taskIcon.innerHTML = ICON_OPTIONS.map(
    (icon) => `<option value="${icon}">${icon}</option>`
  ).join("");
  ui.taskColor.innerHTML = COLOR_OPTIONS.map(
    (color) => `<option value="${color.id}">${color.label}</option>`
  ).join("");
  ui.taskDate.value = state.selectedDate;
}

function openLayer(layer) {
  closeCalendarPopover();
  for (const el of [ui.mobileMenu, ui.inboxSheet, ui.settingsModal, ui.taskModal]) {
    if (el !== layer) el.classList.add("hidden");
  }
  layer.classList.remove("hidden");
  ui.backdrop.classList.remove("hidden");
  ui.btnInbox.classList.toggle("active", layer === ui.inboxSheet);
  ui.btnSettings.classList.toggle("active", layer === ui.settingsModal);
  ui.btnMobileMenu.classList.toggle("active", layer === ui.mobileMenu);
  ui.sideInbox.classList.toggle("active", layer === ui.inboxSheet);
  ui.sideSettings.classList.toggle("active", layer === ui.settingsModal);
}

function toggleLayer(layer) {
  if (layer.classList.contains("hidden")) {
    openLayer(layer);
    return;
  }
  closeLayers();
}

function closeLayers() {
  ui.mobileMenu.classList.add("hidden");
  ui.inboxSheet.classList.add("hidden");
  ui.settingsModal.classList.add("hidden");
  ui.taskModal.classList.add("hidden");
  ui.backdrop.classList.add("hidden");
  ui.btnInbox.classList.remove("active");
  ui.btnSettings.classList.remove("active");
  ui.btnMobileMenu.classList.remove("active");
  ui.sideInbox.classList.remove("active");
  ui.sideSettings.classList.remove("active");
}

function closeCalendarPopover() {
  ui.calendarPopover.classList.add("hidden");
  ui.btnCalendar.classList.remove("active");
  ui.sideCalendar.classList.remove("active");
}

function persistAndRender() {
  saveState();
  renderAll();
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_error) {
    // Ignore persistence errors (private mode/storage limits)
  }
}

function showToast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove("show"), 1600);
}

function buildTimeStack(task, isCurrent) {
  const output = [{ value: formatTime(task.start), isNow: false }];
  if (isCurrent) {
    output.push({ value: formatTime(currentTimeString()), isNow: true });
  } else if (getDuration(task) >= 75) {
    output.push({ value: formatTime(midpoint(task.start, task.end)), isNow: false });
  }
  output.push({ value: formatTime(task.end), isNow: false });
  return output;
}

function nodeShapeClass(size) {
  if (size === "short") return "circle";
  if (size === "medium") return "medium-capsule";
  if (size === "long") return "long-capsule";
  return "xl-capsule";
}

function getSizeClass(durationMinutes) {
  if (durationMinutes <= 20) return "short";
  if (durationMinutes <= 45) return "medium";
  if (durationMinutes <= 90) return "long";
  return "xl";
}

function getDuration(task) {
  return Math.max(1, toMinutes(task.end) - toMinutes(task.start));
}

function getRemainingMinutes(task) {
  const now = nowInMinutes();
  return Math.max(0, toMinutes(task.end) - now);
}

function isTaskCurrent(task, dateKey) {
  if (dateKey !== state.selectedDate || task.done) return false;
  const now = nowInMinutes();
  return now >= toMinutes(task.start) && now < toMinutes(task.end);
}

function sortTasks(taskList) {
  taskList.sort((a, b) => a.start.localeCompare(b.start));
}

function formatRange(start, end) {
  return `${formatTime(start)}-${formatTime(end)}`;
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (!hours) return `${mins} min`;
  if (!mins) return `${hours} hr`;
  return `${hours} hr, ${mins} min`;
}

function formatTime(time) {
  const [hourRaw, minuteRaw] = time.split(":").map(Number);
  const period = hourRaw >= 12 ? "PM" : "AM";
  const hour = hourRaw % 12 || 12;
  return `${hour}:${String(minuteRaw).padStart(2, "0")} ${period}`;
}

function midpoint(start, end) {
  const startMin = toMinutes(start);
  const endMin = toMinutes(end);
  const mid = startMin + Math.floor((endMin - startMin) / 2);
  return fromMinutes(mid);
}

function addMinutes(time, delta) {
  return fromMinutes(toMinutes(time) + delta);
}

function currentTimeString() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function nowInMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function toMinutes(time) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function fromMinutes(totalMinutes) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function isValidTime(time) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time || "");
}

function isValidColor(colorId) {
  return COLOR_OPTIONS.some((color) => color.id === colorId);
}

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseISODate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isValidDateString(dateString) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateString || "");
}

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function getWeekDays(referenceDate) {
  const start = startOfWeek(referenceDate);
  const days = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push({
      id: toISODate(d),
      short: WEEKDAY_SHORT[d.getDay()],
      full: WEEKDAY_FULL[d.getDay()],
      date: d.getDate(),
      month: d.getMonth(),
      year: d.getFullYear(),
    });
  }
  return days;
}

function getTasksForDate(dateKey) {
  if (!state.tasks[dateKey]) state.tasks[dateKey] = [];
  return state.tasks[dateKey];
}

function legacyDayIndex(dayId) {
  const map = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  return Object.prototype.hasOwnProperty.call(map, dayId) ? map[dayId] : null;
}

function mapLegacyDayToDate(dayId) {
  const idx = legacyDayIndex(dayId);
  if (idx === null) return null;
  const week = getWeekDays(new Date());
  return week[idx].id;
}

function normalizeTaskDate(value) {
  if (isValidDateString(value)) return value;
  const idx = legacyDayIndex(value);
  const reference = isValidDateString(state.selectedDate) ? parseISODate(state.selectedDate) : new Date();
  const week = getWeekDays(reference);
  if (idx === null) return week[0].id;
  return week[idx].id;
}

function createId() {
  return `id-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
