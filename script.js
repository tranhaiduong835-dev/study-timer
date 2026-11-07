(() => {
  "use strict";

  const modes = {
    focus: { caption: "PHIÊN TẬP TRUNG", minutes: 25, subtitle: "Một việc tại một thời điểm." },
    short: { caption: "NGHỈ NGẮN", minutes: 5, subtitle: "Thả lỏng một chút, bạn xứng đáng." },
    long: { caption: "NGHỈ DÀI", minutes: 15, subtitle: "Nghỉ ngơi để quay lại thật vững vàng." }
  };
  const keys = {
    tasks: "studyTimer.tasks", completed: "studyTimer.completed", endAt: "studyTimer.endAt",
    mode: "studyTimer.mode", remaining: "studyTimer.remaining", focusMinutes: "studyTimer.focusMinutes",
    breakMinutes: "studyTimer.breakMinutes", dailyStats: "studyTimer.dailyStats",
    lastLoggedAt: "studyTimer.lastLoggedAt", activeTask: "studyTimer.activeTask"
  };
  const $ = id => document.getElementById(id);
  const display = $("timer-display");
  const startButton = $("start-button");
  const tabs = [...document.querySelectorAll(".session-tab")];
  const taskList = $("task-list");
  let mode = "focus";
  let remaining = modes.focus.minutes * 60;
  let interval = null;
  let toastTimeout = null;
  let lastLoggedAt = 0;
  let tasks = readJson(keys.tasks, []);
  let completed = Number(localStorage.getItem(keys.completed)) || 0;
  let activeTaskId = localStorage.getItem(keys.activeTask) || "";
  let today = dateKey(new Date());
  let stats = readStats();

  function readJson(key, fallback) {
    try { const value = JSON.parse(localStorage.getItem(key)); return value && typeof value === "object" ? value : fallback; }
    catch { return fallback; }
  }
  function dateKey(date) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  }
  function readStats() {
    const saved = readJson(keys.dailyStats, {});
    return saved.date === today ? { date: today, seconds: Number(saved.seconds) || 0, completedTasks: Number(saved.completedTasks) || 0 } : { date: today, seconds: 0, completedTasks: 0 };
  }
  function saveStats() { localStorage.setItem(keys.dailyStats, JSON.stringify(stats)); }
  function logStudyTime(until = Date.now()) {
    if (mode !== "focus" || !lastLoggedAt) return;
    let cursor = lastLoggedAt;
    while (cursor < until) {
      const dayStart = new Date(cursor);
      const nextDay = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate() + 1).getTime();
      const segmentEnd = Math.min(until, nextDay);
      if (dateKey(dayStart) === today) stats.seconds += (segmentEnd - cursor) / 1000;
      cursor = segmentEnd;
    }
    lastLoggedAt = until;
    localStorage.setItem(keys.lastLoggedAt, String(lastLoggedAt));
    saveStats();
    renderStats();
  }
  function saveTimer() {
    localStorage.setItem(keys.remaining, String(remaining));
    localStorage.setItem(keys.mode, mode);
    if (!interval) {
      localStorage.removeItem(keys.endAt);
      localStorage.removeItem(keys.lastLoggedAt);
    }
  }
  function formatTime(seconds) {
    return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");
  }
  function updateDisplay() {
    const value = formatTime(remaining);
    display.textContent = value;
    display.setAttribute("aria-label", `${Math.floor(remaining / 60)} phút ${remaining % 60} giây`);
    document.title = interval ? `${value} — Study Timer` : "Study Timer — Tập trung vào điều quan trọng";
    startButton.querySelector("span:last-child").textContent = interval ? "Tạm dừng" : "Bắt đầu";
    startButton.classList.toggle("is-running", Boolean(interval));
    $("timer-subtitle").textContent = interval ? "Bạn đang dành thời gian cho điều quan trọng." : modes[mode].subtitle;
    const activeTask = tasks.find(task => task.id === activeTaskId);
    $("active-task-label").textContent = activeTask ? `Đang gắn phiên học với: ${activeTask.text}` : "Chưa chọn việc học";
    saveTimer();
  }
  function drawProgress() {
    $("completed-count").textContent = `${completed} phiên`;
    $("progress-fill").style.width = `${Math.min(completed % 8, 8) / 8 * 100}%`;
    document.querySelector(".progress-track").setAttribute("aria-valuenow", String(completed % 8));
    $("cycle-dots").innerHTML = Array.from({ length: 4 }, (_, i) => `<span class="cycle-dot ${i < completed % 4 ? "is-done" : ""}"></span>`).join("");
  }
  function renderStats() {
    const minutes = Math.floor(stats.seconds / 60);
    const leftoverSeconds = Math.floor(stats.seconds % 60);
    $("today-study-time").textContent = minutes ? `${minutes} phút${leftoverSeconds ? ` ${leftoverSeconds} giây` : ""}` : `${leftoverSeconds} giây`;
    $("today-task-count").textContent = String(stats.completedTasks);
  }
  function pauseTimer() {
    if (interval) clearInterval(interval);
    interval = null;
  }
  function setMode(nextMode) {
    if (!modes[nextMode]) return;
    if (mode === "focus" && interval) logStudyTime(Math.min(Date.now(), Number(localStorage.getItem(keys.endAt)) || Date.now()));
    pauseTimer();
    mode = nextMode;
    remaining = modes[mode].minutes * 60;
    tabs.forEach(tab => {
      const active = tab.dataset.mode === mode;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-pressed", String(active));
    });
    $("timer-caption").textContent = modes[mode].caption;
    updateDisplay();
  }
  function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove("is-visible"), 3200);
  }
  function finishTimer() {
    pauseTimer();
    if (mode === "focus") {
      completed += 1;
      localStorage.setItem(keys.completed, String(completed));
      const task = tasks.find(item => item.id === activeTaskId);
      if (task) {
        task.sessions = (Number(task.sessions) || 0) + 1;
        localStorage.setItem(keys.tasks, JSON.stringify(tasks));
        renderTasks();
      }
      drawProgress();
      showToast("Hoàn thành một phiên tập trung. Hãy tự hào về tiến bộ này.");
      setMode(completed % 4 === 0 ? "long" : "short");
    } else {
      showToast("Khoảng nghỉ đã kết thúc. Sẵn sàng quay lại chưa?");
      setMode("focus");
    }
  }
  function tick() {
    const endAt = Number(localStorage.getItem(keys.endAt));
    const now = Date.now();
    if (mode === "focus") logStudyTime(Math.min(now, endAt));
    remaining = Math.max(0, Math.ceil((endAt - now) / 1000));
    if (remaining === 0) finishTimer();
    else updateDisplay();
  }
  function toggleTimer() {
    if (interval) {
      if (mode === "focus") logStudyTime(Math.min(Date.now(), Number(localStorage.getItem(keys.endAt)) || Date.now()));
      pauseTimer();
      updateDisplay();
      return;
    }
    if (remaining <= 0) remaining = modes[mode].minutes * 60;
    const now = Date.now();
    localStorage.setItem(keys.endAt, String(now + remaining * 1000));
    lastLoggedAt = now;
    localStorage.setItem(keys.lastLoggedAt, String(lastLoggedAt));
    interval = setInterval(tick, 250);
    updateDisplay();
  }
  function renderTasks() {
    taskList.replaceChildren();
    tasks.forEach(task => {
      const item = document.createElement("li");
      item.className = `task-item${task.done ? " is-done" : ""}`;
      const check = document.createElement("input");
      check.type = "checkbox";
      check.className = "task-check";
      check.checked = Boolean(task.done);
      check.setAttribute("aria-label", task.done ? "Đánh dấu chưa hoàn thành" : "Đánh dấu hoàn thành");
      check.addEventListener("change", () => {
        task.done = check.checked;
        task.doneAt = task.done ? Date.now() : null;
        if (task.done) stats.completedTasks += 1;
        else if (task.doneAt && dateKey(new Date(task.doneAt)) === today) stats.completedTasks = Math.max(0, stats.completedTasks - 1);
        localStorage.setItem(keys.tasks, JSON.stringify(tasks));
        saveStats();
        renderStats();
        renderTasks();
      });
      const text = document.createElement("span");
      text.className = "task-text";
      text.textContent = task.text;
      const meta = document.createElement("span");
      meta.className = "task-meta";
      meta.textContent = `${Number(task.sessions) || 0} phiên`;
      const focus = document.createElement("button");
      focus.className = `focus-task-button${task.id === activeTaskId ? " is-selected" : ""}`;
      focus.type = "button";
      focus.textContent = task.id === activeTaskId ? "Đang học" : "Học việc này";
      focus.setAttribute("aria-pressed", String(task.id === activeTaskId));
      focus.addEventListener("click", () => {
        activeTaskId = activeTaskId === task.id ? "" : task.id;
        localStorage.setItem(keys.activeTask, activeTaskId);
        renderTasks();
        updateDisplay();
      });
      const remove = document.createElement("button");
      remove.className = "delete-task";
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Xóa việc: ${task.text}`);
      remove.addEventListener("click", () => {
        tasks = tasks.filter(entry => entry.id !== task.id);
        if (activeTaskId === task.id) { activeTaskId = ""; localStorage.removeItem(keys.activeTask); }
        localStorage.setItem(keys.tasks, JSON.stringify(tasks));
        renderTasks();
        updateDisplay();
      });
      item.append(check, text, meta, focus, remove);
      taskList.append(item);
    });
    $("task-count").textContent = String(tasks.filter(task => !task.done).length);
    $("empty-state").hidden = tasks.length > 0;
  }
  $("task-form").addEventListener("submit", event => {
    event.preventDefault();
    const input = $("task-input");
    const text = input.value.trim();
    if (!text) { input.focus(); return; }
    tasks.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, text, done: false, sessions: 0 });
    localStorage.setItem(keys.tasks, JSON.stringify(tasks));
    input.value = "";
    renderTasks();
    input.focus();
  });
  $("clear-completed").addEventListener("click", () => {
    tasks = tasks.filter(task => !task.done);
    if (!tasks.some(task => task.id === activeTaskId)) { activeTaskId = ""; localStorage.removeItem(keys.activeTask); }
    localStorage.setItem(keys.tasks, JSON.stringify(tasks));
    renderTasks();
    updateDisplay();
  });
  $("timer-settings").addEventListener("submit", event => {
    event.preventDefault();
    const focusMinutes = Number($("focus-minutes").value);
    const breakMinutes = Number($("break-minutes").value);
    if (!Number.isInteger(focusMinutes) || focusMinutes < 1 || focusMinutes > 180 || !Number.isInteger(breakMinutes) || breakMinutes < 1 || breakMinutes > 60) {
      showToast("Thời lượng học cần từ 1–180 phút, nghỉ từ 1–60 phút.");
      return;
    }
    if (mode === "focus" && interval) logStudyTime(Math.min(Date.now(), Number(localStorage.getItem(keys.endAt)) || Date.now()));
    pauseTimer();
    modes.focus.minutes = focusMinutes;
    modes.short.minutes = breakMinutes;
    localStorage.setItem(keys.focusMinutes, String(focusMinutes));
    localStorage.setItem(keys.breakMinutes, String(breakMinutes));
    if (mode === "focus" || mode === "short") remaining = modes[mode].minutes * 60;
    updateDisplay();
    showToast("Đã lưu thời lượng phiên.");
  });
  tabs.forEach(tab => tab.addEventListener("click", () => setMode(tab.dataset.mode)));
  startButton.addEventListener("click", toggleTimer);
  $("reset-button").addEventListener("click", () => {
    if (mode === "focus" && interval) logStudyTime(Math.min(Date.now(), Number(localStorage.getItem(keys.endAt)) || Date.now()));
    pauseTimer();
    remaining = modes[mode].minutes * 60;
    updateDisplay();
  });
  $("skip-button").addEventListener("click", () => {
    if (mode === "focus") {
      if (interval) logStudyTime(Math.min(Date.now(), Number(localStorage.getItem(keys.endAt)) || Date.now()));
      completed += 1;
      localStorage.setItem(keys.completed, String(completed));
      drawProgress();
      setMode(completed % 4 === 0 ? "long" : "short");
    } else setMode("focus");
  });
  $("today-label").textContent = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  modes.focus.minutes = Number(localStorage.getItem(keys.focusMinutes)) || modes.focus.minutes;
  modes.short.minutes = Number(localStorage.getItem(keys.breakMinutes)) || modes.short.minutes;
  $("focus-minutes").value = String(modes.focus.minutes);
  $("break-minutes").value = String(modes.short.minutes);
  const savedMode = localStorage.getItem(keys.mode);
  if (modes[savedMode]) mode = savedMode;
  const savedRemaining = Number(localStorage.getItem(keys.remaining));
  remaining = Number.isFinite(savedRemaining) && savedRemaining > 0 ? savedRemaining : modes[mode].minutes * 60;
  const endAt = Number(localStorage.getItem(keys.endAt));
  if (endAt) {
    remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
    if (remaining > 0) {
      lastLoggedAt = Number(localStorage.getItem(keys.lastLoggedAt)) || Date.now();
      interval = setInterval(tick, 250);
    } else {
      if (mode === "focus") logStudyTime(endAt);
      remaining = 0;
      finishTimer();
    }
  }
  tabs.forEach(tab => {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-pressed", String(active));
  });
  $("timer-caption").textContent = modes[mode].caption;
  drawProgress();
  renderTasks();
  renderStats();
  updateDisplay();
})();