import {db,S,$,esc,fmt,ok,cnt,negTxt,shell} from '../core.js';

export async function vHome(){shell('<p>Loading…</p>');
 const ex=await ok(db.from('exams').select('*').eq('is_active',true).order('name'));
 const ip=await ok(db.from('attempts').select('id,exam_stages(name,exams(name))').eq('status','in_progress'));
 $('.wrap').innerHTML=`${ip.length?`<div class=card><b>Tests in progress</b>${ip.map(a=>`<p>${esc(a.exam_stages.exams.name)} · ${esc(a.exam_stages.name)} <a class=btn href="#/test/${a.id}">Resume</a></p>`).join('')}</div>`:''}<h2>Choose an examination</h2><div class=grid>${ex.map(e=>`<a class=card href="#/exam/${e.id}" style="text-decoration:none;color:inherit"><h3 style="margin:0">${esc(e.name)}</h3><span class=muted>${esc(e.org)}</span></a>`).join('')}</div>`}

export async function vExam([id]){shell('<p>Loading…</p>');
 const e=await ok(db.from('exams').select('*,exam_stages(*,sections(*))').eq('id',id).single());
 const stages=e.exam_stages.filter(s=>s.is_active).sort((a,b)=>a.ord-b.ord);
 $('.wrap').innerHTML=`<h2>${esc(e.name)}</h2>${stages.map(s=>{const S=s.sections.sort((a,b)=>a.ord-b.ord),n=S.reduce((t,x)=>t+x.question_count,0),m=S.reduce((t,x)=>t+x.question_count*x.marks_per_q,0);
  return`<div class=card><h3>${esc(s.name)}</h3><p><span class=tag>${n} questions</span><span class=tag>${m} marks</span><span class=tag>${s.duration_min} min</span><span class=tag>Negative: ${negTxt(s.negative_mark)}</span>${s.sections_locked?'<span class=tag>Timed sections, locked after time</span>':''}</p>
  <div class=scroll><table><tr><th>Section<th>Questions<th>Time</tr>${S.map(x=>`<tr><td>${esc(x.name)}<td>${x.question_count}<td>${x.duration_min?x.duration_min+' min':'Shared'}`).join('')}</table></div>
  <ul><li>Do not refresh or close the window; progress is saved and the S.timer keeps running.</li><li>Use Mark for Review to flag questions. Marked answers are still evaluated.</li><li>The test submits automatically when time ends.</li></ul>
  <label style="font-weight:400"><input type=checkbox style="display:inline;width:auto" class=ag> I have read the instructions</label><button class=btn data-s="${s.id}" disabled>Start test</button></div>`}).join('')||'<p>No active stage.</p>'}`;
 document.querySelectorAll('.card').forEach(c=>{const g=$('.ag',c),b=$('.btn',c);if(!g)return;g.onchange=()=>b.disabled=!g.checked;
  b.onclick=async()=>{b.disabled=true;try{location.hash='#/test/'+await ok(db.rpc('start_attempt',{p_stage:b.dataset.s}))}catch{b.disabled=false}}})}

export async function vHistory(){shell('<p>Loading…</p>');
 const a=await ok(db.from('attempts').select('id,status,score,total,submitted_at,started_at,exam_stages(name,exams(name))').eq('user_id',S.me.id).order('started_at',{ascending:false}));
 $('.wrap').innerHTML=`<h2>My results</h2><div class=scroll><table><tr><th>Exam<th>Stage<th>Date<th>Score<th></tr>${a.map(x=>`<tr><td>${esc(x.exam_stages.exams.name)}<td>${esc(x.exam_stages.name)}<td>${new Date(x.started_at).toLocaleString()}<td>${x.status==='submitted'?`${+(+x.score).toFixed(2)} / ${x.total}`:'In progress'}<td><a href="#/${x.status==='submitted'?'result':'test'}/${x.id}">${x.status==='submitted'?'View':'Resume'}</a>`).join('')}</table></div>`}
