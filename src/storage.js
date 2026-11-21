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
export function loadPreferences() { return read(keys.preferences, { focus: 25, short: 5 }); }
export function savePreferences(preferences) { write(keys.preferences, preferences); }
export function loadTimer() { return read(keys.timer, null); }
export function saveTimer(state) { write(keys.timer, state); }
export function loadActiveTask() { return read(keys.activeTask, ""); }
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
