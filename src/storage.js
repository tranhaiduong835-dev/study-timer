const keys = {
  tasks: "studyTimer.tasks",
  completed: "studyTimer.completed",
  preferences: "studyTimer.preferences",
  timer: "studyTimer.timer",
  stats: "studyTimer.dailyStats",
  activeTask: "studyTimer.activeTask"
};

function read(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
function todayKey() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
}
function getStats() {
  const saved = read(keys.stats, {});
  return saved.date === todayKey() ? saved : { date: todayKey(), seconds: 0, completedTasks: 0 };
}

export function loadTasks() { return read(keys.tasks, []); }
export function saveTasks(tasks) { write(keys.tasks, tasks); }
export function loadPreferences() {
  const saved = read(keys.preferences, {});
  return {
    focus: Number(saved.focus) || Number(localStorage.getItem("studyTimer.focusMinutes")) || 25,
    short: Number(saved.short) || Number(localStorage.getItem("studyTimer.breakMinutes")) || 5
  };
}
export function savePreferences(preferences) { write(keys.preferences, preferences); }
export function loadTimer() {
  const saved = read(keys.timer, null);
  if (saved) return saved;
  const mode = localStorage.getItem("studyTimer.mode");
  if (!mode) return null;
  return {
    mode,
    remaining: Number(localStorage.getItem("studyTimer.remaining")) || 0,
    deadline: Number(localStorage.getItem("studyTimer.endAt")) || 0,
    lastLoggedAt: Number(localStorage.getItem("studyTimer.lastLoggedAt")) || 0
  };
}
export function saveTimer(state) { write(keys.timer, state); }
export function loadActiveTask() {
  const raw = localStorage.getItem(keys.activeTask);
  if (!raw) return "";
  try { return JSON.parse(raw); } catch { return raw; }
}
export function saveActiveTask(id) { write(keys.activeTask, id); }
export function loadCompletedSessions() { return Number(read(keys.completed, 0)) || 0; }
export function saveCompletedSessions(count) { write(keys.completed, count); }
export function loadTodayStats() { return getStats(); }
export function addStudySeconds(seconds) {
  const stats = getStats();
  stats.seconds += seconds;
  write(keys.stats, stats);
  return stats;
}
export function recordTaskCompletion(completed) {
  const stats = getStats();
  stats.completedTasks = Math.max(0, stats.completedTasks + (completed ? 1 : -1));
  write(keys.stats, stats);
  return stats;
}
