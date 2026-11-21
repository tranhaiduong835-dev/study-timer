const roundTypes = ["focus", "short", "long"];

export function createTimer({ durations, onChange, onComplete, onStudySeconds }) {
  let mode = "focus";
  let remaining = durations.focus * 60;
  let deadline = 0;
  let lastFocusLogAt = 0;
  let interval = null;

  function snapshot() {
    return { mode, remaining, running: Boolean(interval), deadline: interval ? deadline : 0, lastLoggedAt: interval && mode === "focus" ? lastFocusLogAt : 0 };
  }
  function publish() { onChange(snapshot()); }
  function sync(now = Date.now()) {
    if (!interval) return;
    const end = Math.min(now, deadline);
    if (mode === "focus" && end > lastFocusLogAt) {
      onStudySeconds((end - lastFocusLogAt) / 1000);
      lastFocusLogAt = end;
    }
    remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
  }
  function stopInterval() {
    if (interval) clearInterval(interval);
    interval = null;
  }
  function setMode(nextMode) {
    if (!roundTypes.includes(nextMode)) return;
    sync();
    stopInterval();
    mode = nextMode;
    remaining = durations[mode] * 60;
    deadline = 0;
    publish();
  }
  function complete() {
    sync(deadline);
    stopInterval();
    remaining = 0;
    deadline = 0;
    onComplete(mode);
  }
  function tick() {
    sync();
    if (remaining === 0) complete();
    else publish();
  }
  function start() {
    if (interval) return;
    if (remaining <= 0) remaining = durations[mode] * 60;
    const now = Date.now();
    deadline = now + remaining * 1000;
    lastFocusLogAt = now;
    interval = setInterval(tick, 250);
    publish();
  }
  function pause() {
    if (!interval) return;
    sync();
    stopInterval();
    deadline = 0;
    publish();
  }
  function reset() {
    pause();
    remaining = durations[mode] * 60;
    publish();
  }
  function skip() {
    sync();
    stopInterval();
    deadline = 0;
    onComplete(mode, true);
  }
  function updateDurations(next) {
    durations.focus = next.focus;
    durations.short = next.short;
    if (!interval && mode !== "long") remaining = durations[mode] * 60;
    publish();
  }
  function restore(saved) {
    if (!saved || !roundTypes.includes(saved.mode)) return;
    mode = saved.mode;
    if (saved.deadline > Date.now()) {
      deadline = saved.deadline;
      remaining = Math.ceil((deadline - Date.now()) / 1000);
      lastFocusLogAt = saved.lastLoggedAt || Date.now();
      interval = setInterval(tick, 250);
    } else {
      remaining = Math.max(0, Number(saved.remaining) || durations[mode] * 60);
    }
    publish();
  }

  return { start, pause, reset, skip, setMode, updateDurations, restore, state: snapshot };
}
