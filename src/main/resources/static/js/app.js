let currentUser = null;
let allSpots = [], allTasks = [], allReports = [];
const $ = id => document.getElementById(id);
let noticeTimer;
function notice(text, type='success') {
  const n = $('notice'); n.textContent = text; n.className = `alert alert-${type}`;
  clearTimeout(noticeTimer); n.scrollIntoView({behavior:'smooth', block:'nearest'});
  noticeTimer = setTimeout(() => n.classList.add('d-none'), 5000);
}
async function api(path, options={}) {
  const headers = {'Content-Type':'application/json', ...(options.headers||{})};
  const res = await fetch('/api' + path, {...options, headers});
  let data = null; try { data = await res.json(); } catch (_) {}
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status}). Please try again.`);
  return data;
}
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function showAuth(mode='register', shouldScroll=false) {
  const login = mode === 'login';
  $('authTitle').textContent = login ? 'Welcome back, volunteer.' : 'Join a community that cares.';
  $('authSubtitle').textContent = login ? 'Sign in to coordinate feeding visits and follow animal welfare reports.' : 'Create a free volunteer account to join feeding visits and help coordinate care.';
  $('registerFields').classList.toggle('d-none', login);
  $('tabLogin').classList.toggle('active', login); $('tabRegister').classList.toggle('active', !login);
  $('authSubmit').textContent = login ? 'Sign in to PawConnect' : 'Create my account';
  $('authPassword').autocomplete = login ? 'current-password' : 'new-password';
  if (shouldScroll) $('authSection').scrollIntoView({behavior:'smooth', block:'start'});
}
function updateAuthUI() {
  const signedIn = Boolean(currentUser);
  $('navLogin').classList.toggle('d-none', signedIn);
  $('navRegister').classList.toggle('d-none', signedIn);
  $('navLogout').classList.toggle('d-none', !signedIn);
  $('userBadge').classList.toggle('d-none', !signedIn);
  $('userBadge').textContent = signedIn ? `Hi, ${currentUser.name}` : '';
  $('authSection').classList.toggle('d-none', signedIn);
  if (signedIn) {
    $('reportEmail').value = currentUser.email || '';
    $('reportEmail').readOnly = true;
  } else {
    $('reportEmail').readOnly = false;
  }
  renderSpots(); renderTasks(); renderReports();
}
async function submitAuth() {
  const mode = $('tabLogin').classList.contains('active') ? 'login' : 'register';
  const payload = {name:$('authName').value.trim(), phone:$('authPhone').value.trim(), email:$('authEmail').value.trim(), password:$('authPassword').value};
  if (!payload.email || !payload.password || (mode==='register' && !payload.name)) { notice('Please fill in all required fields.', 'warning'); return; }
  const button = $('authSubmit'); button.disabled = true; button.textContent = 'Please wait…';
  try {
    currentUser = await api('/auth/' + mode, {method:'POST', body:JSON.stringify(payload)});
    localStorage.setItem('pawconnectUser', JSON.stringify(currentUser));
    $('authPassword').value = ''; updateAuthUI();
    notice(`Welcome${currentUser.name ? ' ' + currentUser.name : ''}! You are signed in.`);
    await refreshAll();
  } catch (e) { notice(e.message, 'danger'); }
  finally { button.disabled = false; button.textContent = mode==='login' ? 'Sign in to PawConnect' : 'Create my account'; }
}
function logout() { currentUser = null; localStorage.removeItem('pawconnectUser'); updateAuthUI(); showAuth('login'); notice('You have signed out.'); }
function requireLogin(action) { if (currentUser) return true; notice(`Please sign in to ${action}.`, 'warning'); showAuth('login', true); return false; }
async function addSpot() {
  if (!requireLogin('add a feeding spot')) return;
  const body = {name:$('spotName').value.trim(), location:$('spotLocation').value.trim(), animalType:$('spotAnimal').value, description:$('spotDescription').value.trim(), createdBy:currentUser.email};
  if (!body.name || !body.location) { notice('Spot name and location are required.', 'warning'); return; }
  try { await api('/spots',{method:'POST',body:JSON.stringify(body)}); ['spotName','spotLocation','spotDescription'].forEach(id=>$(id).value=''); notice('Feeding spot added to the community map.'); await refreshAll(); }
  catch(e){notice(e.message,'danger');}
}
async function deleteSpot(id) {
  if (!requireLogin('manage feeding spots')) return;
  if (!confirm('Delete this feeding spot?')) return;
  try { await api(`/spots/${id}`,{method:'DELETE'}); notice('Feeding spot deleted.'); await refreshAll(); } catch(e){notice(e.message,'danger');}
}
async function addTask() {
  if (!requireLogin('create a feeding visit')) return;
  const body = {title:$('taskTitle').value.trim(), feedingSpotId:Number($('taskSpot').value), taskDate:$('taskDate').value||null, taskTime:$('taskTime').value||null, createdBy:currentUser.email};
  if (!body.title || !body.feedingSpotId) { notice('Enter a task title and choose a feeding spot.', 'warning'); return; }
  try { await api('/tasks',{method:'POST',body:JSON.stringify(body)}); $('taskTitle').value=''; notice('Feeding visit created. Invite other volunteers to join.'); await refreshAll(); } catch(e){notice(e.message,'danger');}
}
async function joinTask(id) {
  if (!requireLogin('join a feeding visit')) return;
  try { const result=await api(`/tasks/${id}/join`,{method:'POST',body:JSON.stringify({email:currentUser.email})}); notice(result.message); await refreshAll(); } catch(e){notice(e.message,'danger');}
}
async function completeTask(id) {
  if (!requireLogin('update a feeding visit')) return;
  if (!confirm('Mark this feeding visit as completed?')) return;
  try { const result=await api(`/tasks/${id}/complete`,{method:'PATCH'}); notice(result.message); await refreshAll(); } catch(e){notice(e.message,'danger');}
}
async function submitReport() {
  if (!requireLogin('submit an animal welfare report')) return;
  const body={animalType:$('reportAnimal').value,location:$('reportLocation').value.trim(),reportedBy:$('reportEmail').value.trim()||currentUser.email,contact:$('reportContact').value.trim(),description:$('reportDescription').value.trim()};
  if (!body.location || !body.description) { notice('Please enter the location and describe what happened.', 'warning'); return; }
  try { await api('/reports',{method:'POST',body:JSON.stringify(body)}); $('reportDescription').value='';$('reportLocation').value='';$('reportContact').value='';notice('Thank you. The animal welfare report has been submitted.');await refreshAll(); } catch(e){notice(e.message,'danger');}
}
async function changeStatus(id,status) {
  if (!requireLogin('manage animal reports')) return;
  try { await api(`/reports/${id}/status`,{method:'PATCH',body:JSON.stringify({status})}); notice('Report status updated.'); await refreshAll(); } catch(e){notice(e.message,'danger');}
}
async function deleteReport(id) {
  if (!requireLogin('delete an animal report')) return;
  if (!confirm('Delete this animal report?')) return;
  try { await api(`/reports/${id}`,{method:'DELETE'}); notice('Report deleted.'); await refreshAll(); } catch(e){notice(e.message,'danger');}
}
function emptyState(icon,title,detail) { return `<div class="col-12"><div class="empty-state"><div class="empty-icon">${icon}</div><strong>${esc(title)}</strong><span>${esc(detail)}</span></div></div>`; }
function renderSpots() {
  const query=($('spotSearch')?.value||'').trim().toLowerCase();
  const spots=allSpots.filter(s=>`${s.name} ${s.location} ${s.animalType} ${s.description||''}`.toLowerCase().includes(query));
  if ($('spotCount')) $('spotCount').textContent=`${spots.length} ${spots.length===1?'spot':'spots'}${query?' found':''}`;
  $('spotsList').innerHTML=spots.length?spots.map(s=>`<div class="col-md-6 col-lg-4"><article class="spot-card"><div class="spot-top"><div class="spot-icon">${animalIcon(s.animalType)}</div><span class="pill">${esc(s.animalType||'Community')}</span></div><h3>${esc(s.name)}</h3><p class="card-location"><span>📍</span><span>${esc(s.location)}</span></p><p class="card-description">${esc(s.description||'A community location where volunteers can help provide food and water.')}</p><div class="card-footer-line"><span class="small text-secondary">Community submitted</span>${currentUser?`<button class="btn btn-sm btn-outline-secondary" onclick="deleteSpot(${s.id})">Remove</button>`:`<button class="btn btn-sm btn-outline-success" onclick="showAuth('login',true)">Volunteer here ↗</button>`}</div></article></div>`).join(''):emptyState('📍',query?'No matching spots':'No feeding spots yet',query?'Try another name or area.':'Sign in and add the first feeding spot for your community.');
  $('taskSpot').innerHTML='<option value="">Choose a spot</option>'+allSpots.map(s=>`<option value="${s.id}">${esc(s.name)} — ${esc(s.location)}</option>`).join('');
}
function renderTasks() {
  $('tasksList').innerHTML=allTasks.length?allTasks.map(t=>{const s=allSpots.find(x=>x.id===t.feedingSpotId);const done=t.status==='COMPLETED';return `<div class="col-md-6 col-lg-4"><article class="task-card"><div class="d-flex justify-content-between align-items-center gap-2"><span class="pill ${done?'status-completed':'status-open'}">${done?'✓ Completed':'● Open for volunteers'}</span><span class="small text-secondary">${Number(t.participants)||0} joined</span></div><h3 class="mt-3">${esc(t.title)}</h3><p class="card-location"><span>📍</span><span>${esc(s?.name||'Community feeding spot')}${s?.location?' · '+esc(s.location):''}</span></p><div class="task-meta"><span>🗓 ${esc(t.taskDate||'Flexible date')}</span><span>◷ ${esc(t.taskTime||'Flexible time')}</span></div><div class="task-actions">${done?'<button class="btn btn-outline-secondary" disabled>Visit completed</button>':`<button class="btn btn-brand" onclick="joinTask(${t.id})">Join visit</button><button class="btn btn-outline-success" onclick="completeTask(${t.id})">Mark done</button>`}</div></article></div>`}).join(''):emptyState('🗓️','No feeding tasks yet','Create a feeding spot first, then schedule a visit.');
}
function renderReports() {
  $('reportsList').innerHTML=allReports.length?allReports.slice().reverse().map(r=>`<div class="col-md-6"><article class="report-card"><div class="d-flex justify-content-between align-items-start gap-2"><h3>${animalIcon(r.animalType)} ${esc(r.animalType)} needs help</h3><span class="pill ${r.status==='RESOLVED'?'status-completed':''}">${esc(statusLabel(r.status))}</span></div><p class="card-location"><span>📍</span><span>${esc(r.location)}</span></p><p class="report-description">${esc(r.description)}</p><small class="text-secondary">Reported by ${esc(r.reportedBy||'Community member')}</small></article></div>`).join(''):emptyState('🩹','No animal reports yet','Submitted reports will appear here for the community to follow.');
  $('adminReports').innerHTML=allReports.length?allReports.slice().reverse().map(r=>`<tr><td><strong>${animalIcon(r.animalType)} ${esc(r.animalType)}</strong></td><td>${esc(r.location)}</td><td class="report-table-description">${esc(r.description)}</td><td><span class="pill ${r.status==='RESOLVED'?'status-completed':''}">${esc(statusLabel(r.status))}</span></td><td><div class="d-flex gap-2 flex-wrap"><select class="form-select form-select-sm status-select" id="status${r.id}" aria-label="Status for report ${r.id}"><option value="PENDING" ${r.status==='PENDING'?'selected':''}>Pending</option><option value="IN_PROGRESS" ${r.status==='IN_PROGRESS'?'selected':''}>In progress</option><option value="RESOLVED" ${r.status==='RESOLVED'?'selected':''}>Resolved</option></select><button class="btn btn-sm btn-brand" onclick="changeStatus(${r.id},$('status${r.id}').value)">Save</button><button class="btn btn-sm btn-outline-danger" aria-label="Delete report" onclick="deleteReport(${r.id})">×</button></div></td></tr>`).join(''):'<tr><td colspan="5" class="text-center text-secondary p-4">No reports to manage yet.</td></tr>';
}
function animalIcon(animal) { const a=String(animal||'').toLowerCase();return a.includes('cat')?'🐈':a.includes('bird')?'🐦':a.includes('dog')?'🐕':'🐾'; }
function statusLabel(status) { return ({PENDING:'Pending',IN_PROGRESS:'In progress',RESOLVED:'Resolved'})[status]||status||'Pending'; }
async function refreshAll() {
  try {
    const [stats,spots,tasks,reports]=await Promise.all([api('/stats'),api('/spots'),api('/tasks'),api('/reports')]);
    allSpots=spots||[];allTasks=tasks||[];allReports=reports||[];
    $('stats').innerHTML=[['💚','Volunteers',stats.volunteers],['📍','Feeding spots',stats.feedingSpots],['🗓️','Feeding tasks',stats.feedingTasks],['🐕','Reports needing help',stats.pendingReports]].map(([icon,label,num])=>`<div class="stat-card"><span class="stat-icon">${icon}</span><span class="stat-number">${Number(num)||0}</span><span class="stat-label">${label}</span></div>`).join('');
    renderSpots();renderTasks();renderReports();
  } catch(e) {
    $('spotsList').innerHTML=emptyState('⚠️','Could not load feeding spots','Check that the Spring Boot application is running, then refresh the page.');
    $('tasksList').innerHTML=emptyState('⚠️','Could not load feeding tasks','Check that the backend is running.');
    $('reportsList').innerHTML=emptyState('⚠️','Could not load reports','Check that the backend is running.');
    notice('Could not load project data: '+e.message,'danger');
  }
}
window.addEventListener('DOMContentLoaded', async () => {
  try { const saved=localStorage.getItem('pawconnectUser'); if(saved) currentUser=JSON.parse(saved); } catch(_) { localStorage.removeItem('pawconnectUser'); }
  updateAuthUI(); showAuth('register');
  const today=new Date();$('taskDate').value=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  await refreshAll();
});
