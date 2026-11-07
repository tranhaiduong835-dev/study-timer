(() => {
  "use strict";

  const modes = {
    focus: { label: "Tập trung", caption: "PHIÊN TẬP TRUNG", minutes: 25, subtitle: "Một việc tại một thời điểm." },
    short: { label: "Nghỉ ngắn", caption: "NGHỈ NGẮN", minutes: 5, subtitle: "Thả lỏng một chút, bạn xứng đáng." },
    long: { label: "Nghỉ dài", caption: "NGHỈ DÀI", minutes: 15, subtitle: "Nghỉ ngơi để quay lại thật vững vàng." }
  };
  const keys = { tasks: "studyTimer.tasks", completed: "studyTimer.completed", endAt: "studyTimer.endAt", mode: "studyTimer.mode", remaining: "studyTimer.remaining" };
  const $ = (id) => document.getElementById(id);
  const display = $("timer-display");
  const startButton = $("start-button");
  const tabs = [...document.querySelectorAll(".session-tab")];
  const taskList = $("task-list");
  let mode = "focus";
  let remaining = modes.focus.minutes * 60;
  let interval = null;
  let toastTimeout = null;
  let tasks = readJson(keys.tasks, []);
  let completed = Number(localStorage.getItem(keys.completed)) || 0;

  function readJson(key, fallback) {
    try { const value = JSON.parse(localStorage.getItem(key)); return Array.isArray(value) ? value : fallback; }
    catch { return fallback; }
  }
  function saveTimer() {
    localStorage.setItem(keys.remaining, String(remaining));
    localStorage.setItem(keys.mode, mode);
    if (!interval) localStorage.removeItem(keys.endAt);
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
    saveTimer();
  }
  function drawProgress() {
    $("completed-count").textContent = `${completed} phiên`;
    $("progress-fill").style.width = `${Math.min(completed % 8, 8) / 8 * 100}%`;
    document.querySelector(".progress-track").setAttribute("aria-valuenow", String(completed % 8));
    $("cycle-dots").innerHTML = Array.from({ length: 4 }, (_, i) => `<span class="cycle-dot ${i < completed % 4 ? "is-done" : ""}"></span>`).join("");
  }
  function setMode(nextMode) {
    if (!modes[nextMode]) return;
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
  function pauseTimer() {
    if (interval) clearInterval(interval);
    interval = null;
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
    remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
    if (remaining === 0) finishTimer();
    else updateDisplay();
  }
  function toggleTimer() {
    if (interval) { pauseTimer(); updateDisplay(); return; }
    if (remaining <= 0) remaining = modes[mode].minutes * 60;
    localStorage.setItem(keys.endAt, String(Date.now() + remaining * 1000));
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
        localStorage.setItem(keys.tasks, JSON.stringify(tasks));
        renderTasks();
      });
      const text = document.createElement("span");
      text.className = "task-text";
      text.textContent = task.text;
      const remove = document.createElement("button");
      remove.className = "delete-task";
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Xóa việc: ${task.text}`);
      remove.addEventListener("click", () => {
        tasks = tasks.filter(entry => entry.id !== task.id);
        localStorage.setItem(keys.tasks, JSON.stringify(tasks));
        renderTasks();
      });
      item.append(check, text, remove);
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
    tasks.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, text, done: false });
    localStorage.setItem(keys.tasks, JSON.stringify(tasks));
    input.value = "";
    renderTasks();
    input.focus();
  });
  $("clear-completed").addEventListener("click", () => {
    tasks = tasks.filter(task => !task.done);
    localStorage.setItem(keys.tasks, JSON.stringify(tasks));
    renderTasks();
  });
  tabs.forEach(tab => tab.addEventListener("click", () => setMode(tab.dataset.mode)));
  startButton.addEventListener("click", toggleTimer);
  $("reset-button").addEventListener("click", () => { pauseTimer(); remaining = modes[mode].minutes * 60; updateDisplay(); });
  $("skip-button").addEventListener("click", () => {
    if (mode === "focus") {
      completed += 1;
      localStorage.setItem(keys.completed, String(completed));
      drawProgress();
      setMode(completed % 4 === 0 ? "long" : "short");
    } else setMode("focus");
  });
  $("today-label").textContent = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const savedMode = localStorage.getItem(keys.mode);
  if (modes[savedMode]) mode = savedMode;
  const savedRemaining = Number(localStorage.getItem(keys.remaining));
  remaining = Number.isFinite(savedRemaining) && savedRemaining > 0 ? savedRemaining : modes[mode].minutes * 60;
  const endAt = Number(localStorage.getItem(keys.endAt));
  if (endAt) {
    remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
    if (remaining > 0) interval = setInterval(tick, 250);
    else { remaining = 0; finishTimer(); }
  }
  tabs.forEach(tab => {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-pressed", String(active));
  });
  $("timer-caption").textContent = modes[mode].caption;
  drawProgress();
  renderTasks();
  updateDisplay();
})();