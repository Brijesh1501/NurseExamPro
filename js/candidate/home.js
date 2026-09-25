import {db,S,$,esc,fmt,ok,cnt,negTxt,shell} from '../core.js';

export async function vHome(){shell('<p>Loading…</p>');
 const ex=await ok(db.from('exams').select('*').eq('is_active',true).order('name'));
 const[ip,ipq]=await Promise.all([
  ok(db.from('attempts').select('id,test_series(name),exam_stages(name,exams(name))').eq('status','in_progress')),
  ok(db.from('pyq_attempts').select('id,pyq_papers(year_label,exams(name))').eq('status','in_progress').eq('mode','test'))]);
 const rows=[...ip.map(a=>`<p>${esc(a.exam_stages.exams.name)} · ${esc(a.test_series?.name)} · ${esc(a.exam_stages.name)} <a class=btn href="#/test/${a.id}">Resume</a></p>`),
  ...ipq.map(a=>`<p>${esc(a.pyq_papers.exams.name)} · ${esc(a.pyq_papers.year_label)} (PYQ Test) <a class=btn href="#/pyqtest/${a.id}">Resume</a></p>`)];
 $('.wrap').innerHTML=`${rows.length?`<div class=card><b>Tests in progress</b>${rows.join('')}</div>`:''}<h2>Choose an examination</h2><div class=grid>${ex.map(e=>`<a class=card href="#/exam/${e.id}" style="text-decoration:none;color:inherit"><h3 style="margin:0">${esc(e.name)}</h3><span class=muted>${esc(e.org)}</span></a>`).join('')}</div>`}

export async function vExam([id]){shell('<p>Loading…</p>');
 const e=await ok(db.from('exams').select('*,test_series(*),exam_stages(*,sections(*)),pyq_papers(*)').eq('id',id).single());
 const pyq=(e.pyq_papers||[]).filter(p=>p.is_active).sort((a,b)=>a.ord-b.ord);
 const stages=e.exam_stages.filter(s=>s.is_active).sort((a,b)=>a.ord-b.ord),series=e.test_series.filter(s=>s.is_active).sort((a,b)=>a.ord-b.ord);
 $('.wrap').innerHTML=`<h2>${esc(e.name)}</h2><div class=card><h3>Exam pattern</h3>${stages.map(s=>{const S=s.sections.sort((a,b)=>a.ord-b.ord),n=S.reduce((t,x)=>t+x.question_count,0),m=S.reduce((t,x)=>t+x.question_count*x.marks_per_q,0);
  return`<h4 style="margin-bottom:4px">${esc(s.name)}</h4><p><span class=tag>${n} questions</span><span class=tag>${m} marks</span><span class=tag>${s.duration_min} min</span><span class=tag>Negative: ${negTxt(s.negative_mark)}</span>${s.sections_locked?'<span class=tag>Timed sections, locked after time</span>':''}</p>
  <div class=scroll><table><tr><th>Section<th>Questions<th>Time</tr>${S.map(x=>`<tr><td>${esc(x.name)}<td>${x.question_count}<td>${x.duration_min?x.duration_min+' min':'Shared'}`).join('')}</table></div>`}).join('')}
  <ul><li>Do not refresh or close the window; progress is saved and the timer keeps running.</li><li>Use Mark for Review to flag questions. Marked answers are still evaluated.</li><li>The test submits automatically when time ends.</li></ul>
  <label style="font-weight:400"><input type=checkbox id=ag style="display:inline;width:auto"> I have read the instructions</label></div>
 <h3>Previous Year Papers</h3>${pyq.length?pyq.map(p=>`<div class=card><h3 style="margin:0">${esc(p.year_label)}</h3><p class=muted>${p.duration_min} min full test · Negative marking: ${negTxt(p.negative_mark)}</p><a class=btn href="#/pyq/${p.id}">Practice or take test</a></div>`).join(''):'<p class=muted>No previous year papers added yet.</p>'}
 <h3>Test series</h3>${series.map(t=>`<div class=card><h3 style="margin:0">${esc(t.name)}</h3><p class=muted>${esc(t.description)}</p>${stages.map(s=>`<p>${esc(s.name)} <button class=btn data-t="${t.id}" data-s="${s.id}" disabled>Start</button></p>`).join('')}</div>`).join('')||'<p class=muted>No test series available yet.</p>'}`;
 $('#ag').onchange=ev=>document.querySelectorAll('[data-t]').forEach(b=>b.disabled=!ev.target.checked);
 document.querySelectorAll('[data-t]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{location.hash='#/test/'+await ok(db.rpc('start_attempt',{p_stage:b.dataset.s,p_series:b.dataset.t}))}catch{b.disabled=false}})}

export async function vHistory(){shell('<p>Loading…</p>');
 const[a,pq]=await Promise.all([
  ok(db.from('attempts').select('id,status,score,total,submitted_at,started_at,test_series(name),exam_stages(name,exams(name))').eq('user_id',S.me.id).order('started_at',{ascending:false})),
  ok(db.from('pyq_attempts').select('id,mode,status,score,total,started_at,pyq_papers(year_label,exams(name))').eq('user_id',S.me.id).order('started_at',{ascending:false}))]);
 $('.wrap').innerHTML=`<h2>My results</h2><h3>Mock tests</h3><div class=scroll><table><tr><th>Exam<th>Stage<th>Date<th>Score<th></tr>${a.map(x=>`<tr><td>${esc(x.exam_stages.exams.name)}<td>${esc(x.test_series?.name)} · ${esc(x.exam_stages.name)}<td>${new Date(x.started_at).toLocaleString()}<td>${x.status==='submitted'?`${+(+x.score).toFixed(2)} / ${x.total}`:'In progress'}<td><a href="#/${x.status==='submitted'?'result':'test'}/${x.id}">${x.status==='submitted'?'View':'Resume'}</a>`).join('')}</table></div>
 <h3>Previous Year Questions</h3><div class=scroll><table><tr><th>Exam<th>Paper<th>Mode<th>Date<th>Score<th></tr>${pq.map(x=>`<tr><td>${esc(x.pyq_papers.exams.name)}<td>${esc(x.pyq_papers.year_label)}<td>${x.mode}<td>${new Date(x.started_at).toLocaleString()}<td>${x.status==='submitted'?`${+(+x.score).toFixed(2)} / ${x.total}`:'In progress'}<td>${x.mode==='test'?`<a href="#/${x.status==='submitted'?'pyqresult':'pyqtest'}/${x.id}">${x.status==='submitted'?'View':'Resume'}</a>`:''}`).join('')}</table></div>`}