import { createTimer } from "./src/timer.js";
import {
  addStudySeconds,
  loadActiveTask,
  loadCompletedSessions,
  loadPreferences,
  loadTasks,
  loadTimer,
  loadTodayStats,
  recordTaskCompletion,
  saveActiveTask,
  saveCompletedSessions,
  savePreferences,
  saveTasks,
  saveTimer
} from "./src/storage.js";

const modes = {
  focus: { label: "Tập trung", caption: "PHIÊN TẬP TRUNG", subtitle: "Một việc tại một thời điểm." },
  short: { label: "Nghỉ ngắn", caption: "NGHỈ NGẮN", subtitle: "Thả lỏng một chút, bạn xứng đáng." },
  long: { label: "Nghỉ dài", caption: "NGHỈ DÀI", subtitle: "Nghỉ ngơi để quay lại thật vững vàng." }
};
const $ = id => document.getElementById(id);
const display = $("timer-display");
const startButton = $("start-button");
const tabs = [...document.querySelectorAll(".session-tab")];
const taskList = $("task-list");
let preferences = loadPreferences();
let tasks = loadTasks();
let completed = loadCompletedSessions();
let activeTaskId = loadActiveTask();
let stats = loadTodayStats();
let toastTimeout;
let timerState = { mode: "focus", remaining: preferences.focus * 60, running: false };
const timer = createTimer({
  durations: { ...preferences, long: 15 },
  onChange: state => {
    timerState = state;
    saveTimer(state);
    renderTimer();
  },
  onStudySeconds: seconds => {
    stats = addStudySeconds(seconds);
    renderStats();
  },
  onComplete: (mode, skipped = false) => {
    if (mode === "focus") {
      if (!skipped) {
        completed += 1;
        saveCompletedSessions(completed);
        const task = tasks.find(item => item.id === activeTaskId);
        if (task) {
          task.sessions = (Number(task.sessions) || 0) + 1;
          saveTasks(tasks);
          renderTasks();
        }
        renderProgress();
        showToast("Hoàn thành phiên tập trung.");
      }
      timer.setMode(completed > 0 && completed % 4 === 0 ? "long" : "short");
    } else {
      showToast("Khoảng nghỉ đã kết thúc.");
      timer.setMode("focus");
    }
  }
});

function formatTime(seconds) {
  return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");
}
function renderTimer() {
  const { mode, remaining, running } = timerState;
  tabs.forEach(tab => {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-pressed", String(active));
  });
  const value = formatTime(remaining);
  display.textContent = value;
  display.setAttribute("aria-label", `${Math.floor(remaining / 60)} phút ${remaining % 60} giây`);
  document.title = running ? `${value} — Study Timer` : "Study Timer — Tập trung vào điều quan trọng";
  startButton.querySelector("span:last-child").textContent = running ? "Tạm dừng" : "Bắt đầu";
  startButton.classList.toggle("is-running", running);
  $("timer-caption").textContent = modes[mode].caption;
  $("timer-subtitle").textContent = running ? "Bạn đang dành thời gian cho điều quan trọng." : modes[mode].subtitle;
  const activeTask = tasks.find(task => task.id === activeTaskId);
  $("active-task-label").textContent = activeTask ? `Đang gắn phiên học với: ${activeTask.text}` : "Chưa chọn việc học";
}
function renderProgress() {
  $("completed-count").textContent = `${completed} phiên`;
  $("progress-fill").style.width = `${Math.min(completed % 8, 8) / 8 * 100}%`;
  document.querySelector(".progress-track").setAttribute("aria-valuenow", String(completed % 8));
  $("cycle-dots").innerHTML = Array.from({ length: 4 }, (_, i) => `<span class="cycle-dot ${i < completed % 4 ? "is-done" : ""}"></span>`).join("");
}
function renderStats() {
  const seconds = Math.floor(stats.seconds);
  const minutes = Math.floor(seconds / 60);
  $("today-study-time").textContent = minutes ? `${minutes} phút${seconds % 60 ? ` ${seconds % 60} giây` : ""}` : `${seconds} giây`;
  $("today-task-count").textContent = String(stats.completedTasks);
}
function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("is-visible"), 3200);
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
      stats = recordTaskCompletion(task.done);
      saveTasks(tasks);
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
      saveActiveTask(activeTaskId);
      renderTasks();
      renderTimer();
    });
    const remove = document.createElement("button");
    remove.className = "delete-task";
    remove.type = "button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Xóa việc: ${task.text}`);
    remove.addEventListener("click", () => {
      tasks = tasks.filter(entry => entry.id !== task.id);
      if (activeTaskId === task.id) { activeTaskId = ""; saveActiveTask(""); }
      saveTasks(tasks);
      renderTasks();
      renderTimer();
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
  saveTasks(tasks);
  input.value = "";
  renderTasks();
  input.focus();
});
$("clear-completed").addEventListener("click", () => {
  tasks = tasks.filter(task => !task.done);
  if (!tasks.some(task => task.id === activeTaskId)) { activeTaskId = ""; saveActiveTask(""); }
  saveTasks(tasks);
  renderTasks();
  renderTimer();
});
$("timer-settings").addEventListener("submit", event => {
  event.preventDefault();
  const focus = Number($("focus-minutes").value);
  const short = Number($("break-minutes").value);
  if (!Number.isInteger(focus) || focus < 1 || focus > 180 || !Number.isInteger(short) || short < 1 || short > 60) {
    showToast("Thời lượng học 1–180 phút, nghỉ 1–60 phút.");
    return;
  }
  preferences = { focus, short };
  savePreferences(preferences);
  timer.updateDurations(preferences);
  showToast("Đã lưu thời lượng phiên.");
});
tabs.forEach(tab => tab.addEventListener("click", () => timer.setMode(tab.dataset.mode)));
startButton.addEventListener("click", () => timerState.running ? timer.pause() : timer.start());
$("reset-button").addEventListener("click", () => timer.reset());
$("skip-button").addEventListener("click", () => timer.skip());
$("today-label").textContent = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
$("focus-minutes").value = String(preferences.focus);
$("break-minutes").value = String(preferences.short);
tabs.forEach(tab => {
  const active = tab.dataset.mode === timerState.mode;
  tab.classList.toggle("is-active", active);
  tab.setAttribute("aria-pressed", String(active));
});
renderProgress();
renderTasks();
renderStats();
timer.restore(loadTimer());
