import { useEffect, useState } from 'react';

const emptySpot = { name: '', location: '', animalType: 'Dogs', description: '' };
const emptyTask = { title: '', feedingSpotId: '', taskDate: '', taskTime: '' };
const emptyReport = { animalType: 'Dog', location: '', contact: '', description: '' };

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || `Request failed (${response.status}). Please try again.`);
  }
  return data;
}

function animalIcon(animal) {
  const value = String(animal || '').toLowerCase();
  return value.includes('cat') ? '🐈' : value.includes('bird') ? '🐦' : value.includes('dog') ? '🐕' : '🐾';
}

function statusLabel(status) {
  return ({ PENDING: 'Pending', IN_PROGRESS: 'In progress', RESOLVED: 'Resolved' })[status] || status;
}

function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('register');
  const [auth, setAuth] = useState({ name: '', phone: '', email: '', password: '' });
  const [spots, setSpots] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({ volunteers: 0, feedingSpots: 0, feedingTasks: 0, pendingReports: 0 });
  const [spotForm, setSpotForm] = useState(emptySpot);
  const [taskForm, setTaskForm] = useState(emptyTask);
  const [reportForm, setReportForm] = useState(emptyReport);
  const [search, setSearch] = useState('');
  const [reportStatuses, setReportStatuses] = useState({});
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  function notify(message, type = 'success') {
    setNotice({ message, type });
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setNotice(null), 5000);
  }

  async function refresh() {
    try {
      const [nextStats, nextSpots, nextTasks, nextReports] = await Promise.all([
        api('/stats'), api('/spots'), api('/tasks'), api('/reports'),
      ]);
      setStats(nextStats);
      setSpots(nextSpots);
      setTasks(nextTasks);
      setReports(nextReports);
      setReportStatuses(Object.fromEntries(nextReports.map((report) => [report.id, report.status])));
    } catch (error) {
      notify(`Could not load community data. ${error.message}`, 'danger');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    api('/auth/me').then(setUser).catch(() => setUser(null)).finally(refresh);
  }, []);

  async function submitAuth(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const path = authMode === 'login' ? '/auth/login' : '/auth/register';
      const payload = authMode === 'login' ? { email: auth.email, password: auth.password } : auth;
      const signedIn = await api(path, { method: 'POST', body: JSON.stringify(payload) });
      setUser(signedIn);
      setAuth({ name: '', phone: '', email: signedIn.email, password: '' });
      notify(`Welcome${signedIn.name ? `, ${signedIn.name}` : ''}!`);
      await refresh();
    } catch (error) {
      notify(error.message, 'danger');
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    try {
      await api('/auth/logout', { method: 'POST' });
      setUser(null);
      notify('You have signed out.');
    } catch (error) {
      notify(error.message, 'danger');
    }
  }

  function requestSignIn(action) {
    if (user) return true;
    setAuthMode('login');
    notify(`Sign in to ${action}.`, 'warning');
    document.getElementById('authSection')?.scrollIntoView({ behavior: 'smooth' });
    return false;
  }

  async function submitSpot(event) {
    event.preventDefault();
    if (!requestSignIn('add a feeding spot')) return;
    setBusy(true);
    try {
      await api('/spots', { method: 'POST', body: JSON.stringify(spotForm) });
      setSpotForm(emptySpot);
      notify('Feeding spot added.');
      await refresh();
    } catch (error) { notify(error.message, 'danger'); }
    finally { setBusy(false); }
  }

  async function deleteSpot(id) {
    if (!requestSignIn('remove a feeding spot') || !window.confirm('Delete this feeding spot?')) return;
    try {
      await api(`/spots/${id}`, { method: 'DELETE' });
      notify('Feeding spot deleted.');
      await refresh();
    } catch (error) { notify(error.message, 'danger'); }
  }

  async function submitTask(event) {
    event.preventDefault();
    if (!requestSignIn('create a feeding visit')) return;
    setBusy(true);
    try {
      await api('/tasks', {
        method: 'POST',
        body: JSON.stringify({ ...taskForm, feedingSpotId: Number(taskForm.feedingSpotId) }),
      });
      setTaskForm(emptyTask);
      notify('Feeding visit created.');
      await refresh();
    } catch (error) { notify(error.message, 'danger'); }
    finally { setBusy(false); }
  }

  async function taskAction(id, action) {
    if (!requestSignIn(action === 'join' ? 'join this feeding visit' : 'complete this feeding visit')) return;
    try {
      const result = await api(`/tasks/${id}/${action}`, { method: action === 'join' ? 'POST' : 'PATCH', body: '{}' });
      notify(result?.message || 'Feeding visit updated.');
      await refresh();
    } catch (error) { notify(error.message, 'danger'); }
  }

  async function submitReport(event) {
    event.preventDefault();
    if (!requestSignIn('submit a welfare report')) return;
    setBusy(true);
    try {
      await api('/reports', { method: 'POST', body: JSON.stringify(reportForm) });
      setReportForm(emptyReport);
      notify('Thank you. The welfare report has been submitted.');
      await refresh();
    } catch (error) { notify(error.message, 'danger'); }
    finally { setBusy(false); }
  }

  async function updateReport(id) {
    if (!requestSignIn('update a report')) return;
    try {
      await api(`/reports/${id}/status`, {
        method: 'PATCH', body: JSON.stringify({ status: reportStatuses[id] }),
      });
      notify('Report status updated.');
      await refresh();
    } catch (error) { notify(error.message, 'danger'); }
  }

  async function deleteReport(id) {
    if (!requestSignIn('delete a report') || !window.confirm('Delete this welfare report?')) return;
    try {
      await api(`/reports/${id}`, { method: 'DELETE' });
      notify('Report deleted.');
      await refresh();
    } catch (error) { notify(error.message, 'danger'); }
  }

  const visibleSpots = spots.filter((spot) =>
    `${spot.name} ${spot.location} ${spot.animalType} ${spot.description || ''}`.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark sticky-top">
        <div className="container">
          <a className="navbar-brand" href="#home"><span className="brand-mark">🐾</span> PawConnect</a>
          <div className="d-flex align-items-center gap-2 ms-auto">
            {user ? <><span className="user-badge">Hi, {user.name}</span><button className="btn btn-outline-light btn-sm" onClick={signOut}>Sign out</button></> : <a className="btn btn-light btn-sm" href="#authSection">Sign in / Join</a>}
          </div>
        </div>
      </nav>

      <header id="home" className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow"><span className="live-dot" /> COMMUNITY-POWERED ANIMAL CARE</span>
            <h1>Small acts of kindness.<br /><span>Big pawsitive change.</span></h1>
            <p className="hero-lead">Bring caring people together to plan feeding visits, support volunteers, and report animals that need a helping hand.</p>
            <div className="d-flex flex-wrap gap-3"><a className="btn btn-brand btn-lg" href="#spotsSection">Explore feeding spots <span aria-hidden="true">→</span></a><a className="btn btn-soft btn-lg" href="#reportSection">Report an animal</a></div>
            <div className="hero-trust"><span>✓ Volunteer-led</span><span>✓ Local coordination</span><span>✓ Animal-first</span></div>
          </div>
          <div className="hero-art" aria-label="Illustration of a community caring for a dog"><div className="sun" /><div className="art-label label-one">♡ Kindness lives here</div><div className="art-label label-two">🐾 Every little helps</div><div className="dog-illustration"><div className="dog-ear left" /><div className="dog-ear right" /><div className="dog-head"><div className="dog-eye left" /><div className="dog-eye right" /><div className="dog-snout"><span /></div></div><div className="dog-body" /><div className="dog-leg leg-one" /><div className="dog-leg leg-two" /><div className="dog-tail" /></div><div className="grass grass-one" /><div className="grass grass-two" /></div>
        </div>
      </header>

      <main className="container main-content">
        {notice && <div className={`alert alert-${notice.type}`} role="alert" aria-live="polite">{notice.message}<button className="btn-close float-end" aria-label="Dismiss" onClick={() => setNotice(null)} /></div>}
        <section className="stats-grid" aria-label="Community statistics">
          {[['💚', 'Volunteers', stats.volunteers], ['📍', 'Feeding spots', stats.feedingSpots], ['🗓️', 'Feeding visits', stats.feedingTasks], ['🐕', 'Reports needing help', stats.pendingReports]].map(([icon, label, value]) => <div className="stat-card" key={label}><span className="stat-icon">{icon}</span><span className="stat-number">{loading ? '—' : Number(value) || 0}</span><span className="stat-label">{label}</span></div>)}
        </section>

        {!user && <section className="auth-section section-block" id="authSection">
          <div className="section-heading"><div><span className="eyebrow">YOUR NEXT GOOD DEED</span><h2>{authMode === 'login' ? 'Welcome back, volunteer.' : 'Join a community that cares.'}</h2></div><p>Sign in to coordinate feeding visits and follow animal welfare reports.</p></div>
          <div className="auth-panel"><div className="auth-side"><div className="auth-paw">🐾</div><h3>Better together.</h3><p>One feeding visit, one report, one caring community can make a difference.</p><div className="auth-perks"><span>✓ Find local feeding spots</span><span>✓ Join volunteer tasks</span><span>✓ Follow animal reports</span></div></div>
            <form className="auth-form-area" onSubmit={submitAuth}>
              <div className="auth-tabs"><button type="button" className={`auth-tab ${authMode === 'register' ? 'active' : ''}`} onClick={() => setAuthMode('register')}>Create account</button><button type="button" className={`auth-tab ${authMode === 'login' ? 'active' : ''}`} onClick={() => setAuthMode('login')}>Sign in</button></div>
              {authMode === 'register' && <div className="row g-3"><div className="col-md-6"><label className="form-label" htmlFor="authName">Your name</label><input id="authName" className="form-control" autoComplete="name" required maxLength="100" value={auth.name} onChange={(event) => setAuth({ ...auth, name: event.target.value })} /></div><div className="col-md-6"><label className="form-label" htmlFor="authPhone">Phone <span className="optional">(optional)</span></label><input id="authPhone" className="form-control" autoComplete="tel" maxLength="40" value={auth.phone} onChange={(event) => setAuth({ ...auth, phone: event.target.value })} /></div></div>}
              <div className="row g-3 mt-0"><div className="col-12"><label className="form-label" htmlFor="authEmail">Email address</label><input id="authEmail" className="form-control" type="email" autoComplete="email" required maxLength="180" value={auth.email} onChange={(event) => setAuth({ ...auth, email: event.target.value })} /></div><div className="col-12"><label className="form-label" htmlFor="authPassword">Password</label><input id="authPassword" className="form-control" type="password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} minLength="8" required value={auth.password} onChange={(event) => setAuth({ ...auth, password: event.target.value })} /></div><div className="col-12 d-grid"><button className="btn btn-brand btn-lg" disabled={busy}>{busy ? 'Please wait…' : authMode === 'login' ? 'Sign in' : 'Create my account'}</button></div></div>
            </form>
          </div>
        </section>}

        <section className="section-block" id="spotsSection">
          <div className="section-heading"><div><span className="eyebrow">FIND A PLACE TO HELP</span><h2>Community feeding spots</h2></div><p>Discover local spots where volunteers can coordinate safe, thoughtful feeding.</p></div>
          <div className="toolbar"><div className="search-wrap"><span aria-hidden="true">⌕</span><input className="form-control" type="search" placeholder="Search by spot or location…" aria-label="Search feeding spots" value={search} onChange={(event) => setSearch(event.target.value)} /></div><span className="toolbar-note">{visibleSpots.length} {visibleSpots.length === 1 ? 'spot' : 'spots'}{search ? ' found' : ''}</span></div>
          <div className="row g-3" id="spotsList">{visibleSpots.length ? visibleSpots.map((spot) => <div className="col-md-6 col-lg-4" key={spot.id}><article className="spot-card"><div className="spot-top"><div className="spot-icon">{animalIcon(spot.animalType)}</div><span className="pill">{spot.animalType || 'Community'}</span></div><h3>{spot.name}</h3><p className="card-location"><span>📍</span><span>{spot.location}</span></p><p className="card-description">{spot.description || 'A community location where volunteers can help provide food and water.'}</p><div className="card-footer-line"><span className="small text-secondary">Community submitted</span>{user?.role === 'ADMIN' && <button className="btn btn-sm btn-outline-secondary" onClick={() => deleteSpot(spot.id)}>Remove</button>}</div></article></div>) : <div className="col-12"><div className="empty-state"><div className="empty-icon">📍</div><strong>{loading ? 'Loading feeding spots…' : search ? 'No matching spots' : 'No feeding spots yet'}</strong><span>{search ? 'Try another name or area.' : 'Sign in and add the first feeding spot for your community.'}</span></div></div>}</div>
          <form className="create-panel mt-4" onSubmit={submitSpot}><div className="create-panel-heading"><span className="create-icon">＋</span><div><h3>Add a feeding spot</h3><p>Know a safe place that could use a regular feeding visit?</p></div></div><div className="row g-3"><div className="col-md-3"><label className="form-label" htmlFor="spotName">Spot name</label><input id="spotName" className="form-control" required maxLength="120" value={spotForm.name} onChange={(event) => setSpotForm({ ...spotForm, name: event.target.value })} /></div><div className="col-md-3"><label className="form-label" htmlFor="spotLocation">Location / area</label><input id="spotLocation" className="form-control" required maxLength="200" value={spotForm.location} onChange={(event) => setSpotForm({ ...spotForm, location: event.target.value })} /></div><div className="col-md-2"><label className="form-label" htmlFor="spotAnimal">Animals</label><select id="spotAnimal" className="form-select" value={spotForm.animalType} onChange={(event) => setSpotForm({ ...spotForm, animalType: event.target.value })}><option>Dogs</option><option>Cats</option><option>Dogs and cats</option><option>Other</option></select></div><div className="col-md-3"><label className="form-label" htmlFor="spotDescription">Notes</label><input id="spotDescription" className="form-control" maxLength="500" value={spotForm.description} onChange={(event) => setSpotForm({ ...spotForm, description: event.target.value })} /></div><div className="col-md-1 d-grid align-items-end"><button className="btn btn-brand" disabled={busy}>Add</button></div></div></form>
        </section>

        <section className="section-block" id="tasksSection"><div className="section-heading"><div><span className="eyebrow">LEND A PAW</span><h2>Feeding visits</h2></div><p>Make a plan, invite other volunteers, and mark visits complete.</p></div>
          <form className="create-panel mb-4" onSubmit={submitTask}><div className="create-panel-heading"><span className="create-icon">🗓️</span><div><h3>Create a feeding visit</h3><p>Choose a spot and set a date so volunteers can join.</p></div></div><div className="row g-3"><div className="col-md-4"><label className="form-label" htmlFor="taskTitle">Visit title</label><input id="taskTitle" className="form-control" required maxLength="140" value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} /></div><div className="col-md-3"><label className="form-label" htmlFor="taskSpot">Feeding spot</label><select id="taskSpot" className="form-select" required value={taskForm.feedingSpotId} onChange={(event) => setTaskForm({ ...taskForm, feedingSpotId: event.target.value })}><option value="">Choose a spot</option>{spots.map((spot) => <option key={spot.id} value={spot.id}>{spot.name}</option>)}</select></div><div className="col-md-2"><label className="form-label" htmlFor="taskDate">Date</label><input id="taskDate" className="form-control" type="date" value={taskForm.taskDate} onChange={(event) => setTaskForm({ ...taskForm, taskDate: event.target.value })} /></div><div className="col-md-2"><label className="form-label" htmlFor="taskTime">Time</label><input id="taskTime" className="form-control" type="time" value={taskForm.taskTime} onChange={(event) => setTaskForm({ ...taskForm, taskTime: event.target.value })} /></div><div className="col-md-1 d-grid align-items-end"><button className="btn btn-brand" disabled={busy || !spots.length}>Create</button></div></div></form>
          <div className="row g-3">{tasks.length ? tasks.map((task) => { const spot = spots.find((item) => item.id === task.feedingSpotId); const done = task.status === 'COMPLETED'; return <div className="col-md-6 col-lg-4" key={task.id}><article className="task-card"><div className="d-flex justify-content-between align-items-center gap-2"><span className={`pill ${done ? 'status-completed' : 'status-open'}`}>{done ? '✓ Completed' : '● Open for volunteers'}</span><span className="small text-secondary">{task.participants || 0} joined</span></div><h3 className="mt-3">{task.title}</h3><p className="card-location"><span>📍</span><span>{spot?.name || 'Community feeding spot'}{spot?.location ? ` · ${spot.location}` : ''}</span></p><div className="task-meta"><span>🗓 {task.taskDate || 'Flexible date'}</span><span>◷ {task.taskTime || 'Flexible time'}</span></div><div className="task-actions">{!done && <><button className="btn btn-brand" onClick={() => taskAction(task.id, 'join')}>Join visit</button><button className="btn btn-outline-success" onClick={() => taskAction(task.id, 'complete')}>Mark done</button></>}</div></article></div>; }) : <div className="col-12"><div className="empty-state"><div className="empty-icon">🗓️</div><strong>{loading ? 'Loading feeding visits…' : 'No feeding visits yet'}</strong><span>Create a feeding spot first, then schedule a visit.</span></div></div>}</div>
        </section>

        <section className="section-block" id="reportSection"><div className="section-heading"><div><span className="eyebrow">HELP AN ANIMAL IN NEED</span><h2>Animal welfare reports</h2></div><p>Share the location and details so the community can track a case. For emergencies, contact a local rescue or veterinarian directly.</p></div><div className="report-layout"><div className="report-intro"><div className="report-symbol">🩹</div><h3>See an animal that needs help?</h3><p>A clear description and location can help volunteers understand what support may be needed.</p><ul><li>Describe what you observed</li><li>Give a useful nearby landmark</li><li>Never put yourself in danger</li></ul></div><form className="create-panel report-form" onSubmit={submitReport}><div className="row g-3"><div className="col-md-6"><label className="form-label" htmlFor="reportAnimal">Animal</label><select id="reportAnimal" className="form-select" value={reportForm.animalType} onChange={(event) => setReportForm({ ...reportForm, animalType: event.target.value })}><option>Dog</option><option>Cat</option><option>Bird</option><option>Other</option></select></div><div className="col-md-6"><label className="form-label" htmlFor="reportLocation">Location</label><input id="reportLocation" className="form-control" required maxLength="200" value={reportForm.location} onChange={(event) => setReportForm({ ...reportForm, location: event.target.value })} /></div><div className="col-md-6"><label className="form-label" htmlFor="reportContact">Contact <span className="optional">(optional)</span></label><input id="reportContact" className="form-control" maxLength="80" value={reportForm.contact} onChange={(event) => setReportForm({ ...reportForm, contact: event.target.value })} /></div><div className="col-12"><label className="form-label" htmlFor="reportDescription">What happened?</label><textarea id="reportDescription" className="form-control" rows="4" required maxLength="2000" value={reportForm.description} onChange={(event) => setReportForm({ ...reportForm, description: event.target.value })} /></div><div className="col-12 d-grid d-sm-flex justify-content-sm-end"><button className="btn btn-brand btn-lg" disabled={busy}>Submit welfare report →</button></div></div></form></div>
          <div className="row g-3 mt-2">{reports.length ? reports.slice().reverse().map((report) => <div className="col-md-6" key={report.id}><article className="report-card"><div className="d-flex justify-content-between align-items-start gap-2"><h3>{animalIcon(report.animalType)} {report.animalType} needs help</h3><span className={`pill ${report.status === 'RESOLVED' ? 'status-completed' : ''}`}>{statusLabel(report.status)}</span></div><p className="card-location"><span>📍</span><span>{report.location}</span></p><p className="report-description">{report.description}</p><small className="text-secondary">Reported by {report.reportedBy || 'Community member'}</small></article></div>) : <div className="col-12"><div className="empty-state"><div className="empty-icon">🩹</div><strong>{loading ? 'Loading reports…' : 'No animal reports yet'}</strong><span>Submitted reports will appear here for the community to follow.</span></div></div>}</div>
        </section>

        {user?.role === 'ADMIN' && <section className="section-block" id="adminSection"><div className="section-heading"><div><span className="eyebrow">COMMUNITY FOLLOW-UP</span><h2>Manage animal reports</h2></div><p>Update report progress so the community can see what still needs attention.</p></div><div className="table-shell"><div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>Animal</th><th>Location</th><th>Details</th><th>Status</th><th>Actions</th></tr></thead><tbody>{reports.length ? reports.slice().reverse().map((report) => <tr key={report.id}><td><strong>{animalIcon(report.animalType)} {report.animalType}</strong></td><td>{report.location}</td><td className="report-table-description">{report.description}</td><td><span className="pill">{statusLabel(report.status)}</span></td><td><div className="d-flex gap-2 flex-wrap"><select className="form-select form-select-sm status-select" aria-label={`Status for report ${report.id}`} value={reportStatuses[report.id] || report.status} onChange={(event) => setReportStatuses({ ...reportStatuses, [report.id]: event.target.value })}><option value="PENDING">Pending</option><option value="IN_PROGRESS">In progress</option><option value="RESOLVED">Resolved</option></select><button className="btn btn-sm btn-brand" onClick={() => updateReport(report.id)}>Save</button><button className="btn btn-sm btn-outline-danger" aria-label="Delete report" onClick={() => deleteReport(report.id)}>Delete</button></div></td></tr>) : <tr><td colSpan="5" className="text-center text-secondary p-4">No reports to manage yet.</td></tr>}</tbody></table></div></div></section>}
      </main>

      <footer className="footer"><div className="container footer-inner"><div><a className="navbar-brand" href="#home"><span className="brand-mark">🐾</span> PawConnect</a><p>Community care starts with one small act.</p></div><div className="footer-links"><a href="#spotsSection">Feeding spots</a><a href="#tasksSection">Volunteer tasks</a><a href="#reportSection">Report an animal</a></div></div><div className="container footer-bottom">PawConnect Community Animal Care</div></footer>
    </>
  );
}

export default App;