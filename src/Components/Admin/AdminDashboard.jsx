import { API_BASE_URL } from "../../config";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Admin.module.css";

const API_BASE = `${API_BASE_URL}/admin`;
const POLL_MS = 2000;
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function statusLabel(job) {
  if (!job) return "Never run";
  if (job.status === "running") return "Running…";
  if (job.status === "success") return `Success · ${new Date(job.finishedAt).toLocaleString()}`;
  if (job.status === "error") return `Failed · ${job.error}`;
  return job.status;
}

function statusClass(job, styles) {
  if (!job) return styles.badgeIdle;
  if (job.status === "running") return styles.badgeRunning;
  if (job.status === "success") return styles.badgeSuccess;
  if (job.status === "error") return styles.badgeError;
  return styles.badgeIdle;
}

function AdminDashboard() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(null);
  const [sections, setSections] = useState([]);
  const [busy, setBusy] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeJob, setActiveJob] = useState(null); // single or queue job, whichever is running
  const [schedule, setSchedule] = useState(null);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const pollRef = useRef(null);

  const loadSections = useCallback(async () => {
    const res = await fetch(`${API_BASE}/sections`, { credentials: "include" });
    if (res.status === 401) {
      navigate("/admin/login");
      return;
    }
    const data = await res.json();
    setSections(data.data || []);
    setBusy(data.busy);
    if (data.latestQueueJob && data.latestQueueJob.status === "running") {
      setActiveJob(data.latestQueueJob);
    }
  }, [navigate]);

  const loadSchedule = useCallback(async () => {
    const res = await fetch(`${API_BASE}/schedule`, { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    setSchedule(data.data);
  }, []);

  useEffect(() => {
    (async () => {
      const res = await fetch(`${API_BASE}/me`, { credentials: "include" });
      if (res.status === 401) {
        navigate("/admin/login");
        return;
      }
      const data = await res.json();
      setEmail(data.data.email);
      setCheckingAuth(false);
      await Promise.all([loadSections(), loadSchedule()]);
    })();
  }, [navigate, loadSections, loadSchedule]);

  // Poll whichever job (single-section or refresh-all queue) is running.
  useEffect(() => {
    if (!activeJob || activeJob.status !== "running") return;

    pollRef.current = setInterval(async () => {
      const res = await fetch(`${API_BASE}/jobs/${activeJob.id}`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setActiveJob(data.data);

      if (data.data.status !== "running") {
        clearInterval(pollRef.current);
        setBusy(false);
        await loadSections();
      }
    }, POLL_MS);

    return () => clearInterval(pollRef.current);
  }, [activeJob, loadSections]);

  function jobForSection(key) {
    if (activeJob?.type === "single" && activeJob.sectionKey === key) return activeJob;
    if (activeJob?.type === "queue") {
      const step = activeJob.steps?.find((s) => s?.sectionKey === key);
      if (step) return step;
    }
    return sections.find((s) => s.key === key)?.lastJob;
  }

  async function handleRefresh(key) {
    const res = await fetch(`${API_BASE}/sections/${key}/refresh`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Could not start refresh");
      return;
    }

    setActiveJob(data.data);
    setBusy(true);
  }

  async function handleRefreshAll() {
    const res = await fetch(`${API_BASE}/refresh-all`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Could not start refresh-all");
      return;
    }

    setActiveJob(data.data);
    setBusy(true);
  }

  async function handleScheduleSave(patch) {
    setScheduleSaving(true);
    try {
      const res = await fetch(`${API_BASE}/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Could not save schedule");
        return;
      }
      setSchedule(data.data);
    } finally {
      setScheduleSaving(false);
    }
  }

  async function handleLogout() {
    await fetch(`${API_BASE}/logout`, { method: "POST", credentials: "include" });
    navigate("/admin/login");
  }

  if (checkingAuth) return null;

  const queueRunning = activeJob?.type === "queue" && activeJob.status === "running";

  return (
    <div className={styles.dashboard}>
      <div className={styles.dashHeader}>
        <div className={styles.authHeader}>
          <span className={styles.dot} />
          Admin Console
        </div>
        <div className={styles.headerRight}>
          <span className={styles.mutedText}>{email}</span>
          <button className={styles.secondaryBtn} onClick={() => setShowSettings((v) => !v)}>
            {showSettings ? "Hide settings" : "Auto-refresh settings"}
          </button>
          <button className={styles.primaryBtn} disabled={busy} onClick={handleRefreshAll}>
            {queueRunning ? "Refreshing all…" : "Refresh All"}
          </button>
          <button className={styles.secondaryBtn} onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>

      {showSettings && schedule && (
        <ScheduleSettings schedule={schedule} saving={scheduleSaving} onSave={handleScheduleSave} />
      )}

      {queueRunning && (
        <div className={styles.busyBanner}>
          Refreshing all sections — {activeJob.progress.completed}/{activeJob.progress.total} done,
          currently on <strong>{activeJob.currentSectionKey}</strong>.
        </div>
      )}

      {!queueRunning && busy && (
        <div className={styles.busyBanner}>
          A refresh is currently running — other sections are locked until it finishes.
        </div>
      )}

      <div className={styles.sectionGrid}>
        {sections.map((s) => {
          const job = jobForSection(s.key);
          const isRunning = job?.status === "running";

          return (
            <div className={styles.sectionCard} key={s.key}>
              <div className={styles.sectionCardTop}>
                <h3>{s.label}</h3>
                <span className={statusClass(job, styles)}>
                  {isRunning ? "Running" : job?.status === "success" ? "OK" : job?.status === "error" ? "Error" : "Idle"}
                </span>
              </div>

              <p className={styles.sectionDesc}>{s.description}</p>

              <div className={styles.sectionMeta}>{statusLabel(job)}</div>

              {job?.status === "success" && job.summary && (
                <pre className={styles.summaryBox}>{JSON.stringify(job.summary, null, 2)}</pre>
              )}

              {isRunning && job.logs?.length > 0 && (
                <div className={styles.logBox}>
                  {job.logs.slice(-6).map((l, i) => (
                    <div key={i} className={l.level === "error" ? styles.logError : l.level === "warn" ? styles.logWarn : styles.logInfo}>
                      {l.message}
                    </div>
                  ))}
                </div>
              )}

              <button
                className={styles.primaryBtn}
                disabled={busy}
                onClick={() => handleRefresh(s.key)}
              >
                {isRunning ? "Refreshing…" : "Refresh"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScheduleSettings({ schedule, saving, onSave }) {
  const [enabled, setEnabled] = useState(schedule.enabled);
  const [frequency, setFrequency] = useState(schedule.frequency);
  const [dayOfWeek, setDayOfWeek] = useState(schedule.dayOfWeek);
  const [time, setTime] = useState(schedule.time);

  function handleSubmit(e) {
    e.preventDefault();
    onSave({ enabled, frequency, dayOfWeek: Number(dayOfWeek), time });
  }

  return (
    <form className={styles.scheduleBox} onSubmit={handleSubmit}>
      <div className={styles.scheduleRow}>
        <label className={styles.checkboxLabel}>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Enable automatic "Refresh All"
        </label>
      </div>

      <div className={styles.scheduleRow}>
        <label className={styles.label}>
          Frequency
          <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </label>

        {frequency === "weekly" && (
          <label className={styles.label}>
            Day
            <select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)}>
              {DAY_NAMES.map((name, i) => (
                <option key={i} value={i}>{name}</option>
              ))}
            </select>
          </label>
        )}

        <label className={styles.label}>
          Time (server-local)
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>

        <button className={styles.primaryBtn} type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <div className={styles.mutedText}>
        {schedule.lastRunAt
          ? `Last auto-run: ${new Date(schedule.lastRunAt).toLocaleString()} — ${schedule.lastRunStatus}`
          : "Never run automatically yet."}
      </div>
    </form>
  );
}

export default AdminDashboard;
