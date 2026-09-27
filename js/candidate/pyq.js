import {db,S,$,app,esc,fmt,ok,cnt,negTxt,shell} from '../core.js';

let T=null;   // live PYQ test-mode state (separate from the mock-test T in test.js)
let PR=null;  // live practice-mode state

export async function vPyqSetup([id]){shell('<p>Loading…</p>');
 const p=await ok(db.from('pyq_papers').select('*,exams(name),pyq_sections(*)').eq('id',id).single()),subs=await ok(db.rpc('pyq_subjects',{p_paper:id}));
 const total=subs.reduce((t,s)=>t+s.n,0),secs=(p.pyq_sections||[]).sort((a,b)=>a.ord-b.ord),paperN=secs.reduce((t,s)=>t+s.question_count,0);
 $('.wrap').innerHTML=`<h2>${esc(p.exams.name)} · ${esc(p.year_label)}</h2>
 <div class=grid>
 <div class=card><h3>Practice by topic</h3><p class=muted>No timer. See the correct answer and explanation right after each question — good for topic-wise revision.</p>
  <label style="font-weight:400"><input type=checkbox id=all checked style="display:inline;width:auto"> All subjects (${total} questions)</label>
  ${subs.map(s=>`<label style="font-weight:400"><input type=checkbox class=sj value="${esc(s.subject)}" checked style="display:inline;width:auto"> ${esc(s.subject)} (${s.n})</label>`).join('')}
  <label>Number of questions<input id=cnt type=number min=1 value="${Math.min(total,20)}"></label><button class=btn id=pr>Start practice</button></div>
 <div class=card><h3>Take as a test</h3><p class=muted>The full ${paperN}-question paper, timed ${p.duration_min} min${secs.every(s=>s.duration_min)&&p.sections_locked?' with timed, locked sections':''}, negative marking ${negTxt(p.negative_mark)} — reconstructing the real CBT exactly as it was.</p>
  ${secs.length?`<div class=scroll><table><tr><th>Section<th>Questions<th>Time</tr>${secs.map(s=>`<tr><td>${esc(s.name)}<td>${s.question_count}<td>${s.duration_min?s.duration_min+' min':'Shared'}`).join('')}</table></div><button class=btn id=ts>Start test</button>`:'<p class=muted>No sections added yet.</p>'}</div></div>`;
 $('#all').onchange=e=>document.querySelectorAll('.sj').forEach(c=>c.checked=e.target.checked);
 document.querySelectorAll('.sj').forEach(c=>c.onchange=()=>{$('#all').checked=[...document.querySelectorAll('.sj')].every(x=>x.checked)});
 const picked=()=>{const all=[...document.querySelectorAll('.sj')],chosen=all.filter(c=>c.checked).map(c=>c.value);return chosen.length===all.length?null:chosen};
 $('#pr').onclick=async()=>{$('#pr').disabled=true;const subjects=picked(),n=+$('#cnt').value||1;
  PR={paper:p,subjects,i:0,score:0,revealed:false,Q:await ok(db.rpc('get_pyq_practice',{p_paper:id,p_subjects:subjects,p_count:n}))};
  if(!PR.Q.length){$('#pr').disabled=false;return alert('No questions match that selection.')}
  location.hash='#/pyqpractice'};
 $('#ts')&&($('#ts').onclick=async()=>{$('#ts').disabled=true;
  try{location.hash='#/pyqtest/'+await ok(db.rpc('start_pyq_test',{p_paper:id}))}catch{$('#ts').disabled=false}})}

export function vPyqPractice(){if(!PR)return location.hash='#/';draw();
 function draw(){const q=PR.Q[PR.i],sel=q._sel;
  $('.wrap').innerHTML=`<div class=card><p class=muted>Practice · ${esc(q.subject)} · Question ${PR.i+1} of ${PR.Q.length} · Score ${PR.score}</p>
  <p style="font-size:17px;white-space:pre-wrap">${esc(q.question)}</p>${q.image_url?`<img src="${esc(q.image_url)}" alt="" style="max-width:100%;border:1px solid var(--line)">`:''}
  ${q.options.map((o,k)=>`<label class="opt ${sel===k?'sel':''} ${PR.revealed&&k===q.correct?'ok':''}"><input type=radio name=o value=${k} ${sel===k?'checked':''} ${PR.revealed?'disabled':''}><span>${'ABCD'[k]}. ${esc(o)}${PR.revealed&&k===q.correct?' ✓ correct':PR.revealed&&k===sel?' ✗ your answer':''}</span></label>`).join('')}
  ${PR.revealed&&q.explanation?`<p class=muted>${esc(q.explanation)}</p>`:''}
  <div class=qb>${PR.revealed?`<button class=btn id=nx>${PR.i+1<PR.Q.length?'Next':'Finish'}</button>`:`<button class=btn id=ck ${sel==null?'disabled':''}>Check answer</button>`}<a class="btn ghost" href="#/">Exit practice</a></div></div>`;
  app.querySelectorAll('input[name=o]').forEach(i=>i.onchange=()=>{q._sel=+i.value;draw()});
  $('#ck')&&($('#ck').onclick=()=>{PR.revealed=true;if(q._sel===q.correct)PR.score++;draw()});
  $('#nx')&&($('#nx').onclick=async()=>{PR.revealed=false;PR.i++;
   if(PR.i>=PR.Q.length){const by={};PR.Q.forEach(x=>{const o=by[x.subject]=by[x.subject]||{name:x.subject,n:0,c:0,w:0,m:0};o.n++;if(x._sel===x.correct){o.c++;o.m++}else if(x._sel!=null){o.w++}});
    await ok(db.rpc('log_pyq_practice',{p_paper:PR.paper.id,p_subjects:PR.subjects,p_correct:PR.score,p_total:PR.Q.length,p_subject_scores:Object.values(by)}));
    $('.wrap').innerHTML=`<div class=card><h2>Practice complete</h2><p>Score: ${PR.score} / ${PR.Q.length}</p><a class=btn href="#/pyq/${PR.paper.id}">Practice again</a> <a class="btn ghost" href="#/">Back to exams</a></div>`;PR=null;return}
   draw()})}}

// Test mode: same CBT engine as the mock-test screen (tabs, palette, Mark for Review, optional locked
// timed sections) but reading/writing the pyq_* tables and RPCs instead of the mock-test ones.
export async function vPyqTest([id]){shell('<p>Loading…</p>');
 const d=await ok(db.rpc('get_pyq_attempt',{p_attempt:id}));if(d.attempt.status!=='in_progress')return location.hash='#/pyqresult/'+id;
 const p=d.paper,secs=d.sections.sort((a,b)=>a.ord-b.ord);let c=0;secs.forEach(s=>{s.from=c;c+=s.duration_min||0});
 const lock=p.sections_locked&&secs.every(s=>s.duration_min),t0=new Date(d.attempt.started_at).getTime();
 T={id,Q:d.questions,ans:d.attempt.answers||{},marked:d.attempt.marked||{},vis:{},cur:0,lock,end:t0+p.duration_min*6e4,off:new Date(d.now)-Date.now()};
 const secEnd=s=>t0+(s.from+s.duration_min)*6e4,now=()=>Date.now()+T.off,
  curSec=()=>{const i=secs.findIndex(s=>secEnd(s)>now());return i<0?secs.length-1:i};
 if(lock){T.sec=curSec();T.cur=Math.max(0,T.Q.findIndex(x=>x.section_id===secs[T.sec].id))}
 window.onbeforeunload=()=>'';
 const persist=()=>{clearTimeout(T.pt);T.pt=setTimeout(()=>db.rpc('save_pyq_progress',{p_attempt:id,p_answers:T.ans,p_marked:T.marked}),500)};
 const stat=x=>T.ans[x.id]!=null?(T.marked[x.id]?'am':'a'):T.marked[x.id]?'m':T.vis[x.id]?'na':'';
 const move=k=>{const n=T.cur+k;if(n>=0&&n<T.Q.length&&(!lock||T.Q[n].section_id===T.Q[T.cur].section_id))T.cur=n;draw()};
 function draw(){const q=T.Q[T.cur],S2=secs.find(s=>s.id===q.section_id),si=secs.indexOf(S2);T.vis[q.id]=1;
  const inS=T.Q.map((x,i)=>[x,i]).filter(([x])=>x.section_id===S2.id),n=inS.findIndex(([x])=>x.id===q.id)+1,sel=T.ans[q.id];
  const cn=k=>inS.filter(([x])=>stat(x)===k).length;
  app.innerHTML=`<div class=ex><div class=exh><b>${esc(p.exam_name)} · ${esc(p.year_label)} (PYQ Test)</b><span>Candidate: ${esc(S.me.full_name)}</span><span>${lock?`Section time <span class=tm id=st>--</span> `:''}Total <span class=tm id=tm>--</span></span></div>
  <div class=tabs>${secs.map((s,i)=>`<button data-sec="${i}" class="${i===si?'on':''}" ${lock&&i!==si?'disabled':''}>${esc(s.name)}</button>`).join('')}</div>
  <div class=exb><div class=qp><p class=muted>Question ${n} of ${inS.length} · ${esc(q.subject)} · <span class=ok>+${S2.marks_per_q}</span> ${+p.negative_mark?`<span class=bad>−${+(p.negative_mark*S2.marks_per_q).toFixed(2)}</span>`:''}</p>
  <p style="font-size:17px;white-space:pre-wrap">${esc(q.question)}</p>${q.image_url?`<img src="${esc(q.image_url)}" alt="Question image">`:''}
  ${q.options.map((o,k)=>`<label class="opt ${sel===k?'sel':''}"><input type=radio name=o value=${k} ${sel===k?'checked':''}><span>${'ABCD'[k]}. ${esc(o)}</span></label>`).join('')}
  <div class=qb><button class="btn ghost" id=pv>Previous</button><button class="btn ghost" id=mk>Mark for Review &amp; Next</button><button class="btn ghost" id=cl>Clear Response</button><button class=btn id=sn>Save &amp; Next</button></div></div>
  <aside class=side><b>${esc(S2.name)}</b><div class=pal>${inS.map(([x,i],j)=>`<button data-i="${i}" class="${stat(x)} ${i===T.cur?'cur':''}">${j+1}</button>`).join('')}</div>
  <div class=lg><span><i style="background:var(--green)"></i>Answered ${cn('a')+cn('am')}</span><span><i style="background:var(--red)"></i>Not answered ${cn('na')}</span><span><i style="background:var(--grey)"></i>Not visited ${inS.length-cn('a')-cn('am')-cn('na')-cn('m')}</span><span><i style="background:var(--purple)"></i>Marked ${cn('m')+cn('am')}</span></div>
  <p><button class="btn warn" id=sb style="width:100%">Submit test</button></p></aside></div></div>`;
  app.querySelectorAll('input[name=o]').forEach(i=>i.onchange=()=>{T.ans[q.id]=+i.value;persist();draw()});
  app.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{T.cur=+b.dataset.i;draw()});
  app.querySelectorAll('[data-sec]').forEach(b=>b.onclick=()=>{T.cur=T.Q.findIndex(x=>x.section_id===secs[b.dataset.sec].id);draw()});
  $('#pv').onclick=()=>move(-1);$('#sn').onclick=()=>move(1);
  $('#mk').onclick=()=>{T.marked[q.id]=1;persist();move(1)};
  $('#cl').onclick=()=>{delete T.ans[q.id];delete T.marked[q.id];persist();draw()};
  $('#sb').onclick=()=>submit(false);tick()}
 function tick(){const n=now(),left=(T.end-n)/1e3;if($('#tm')){$('#tm').textContent=fmt(left);$('#tm').classList.toggle('low',left<300)}
  if(lock&&$('#st'))$('#st').textContent=fmt((secEnd(secs[T.sec])-n)/1e3)}
 async function submit(auto){if(!auto&&!confirm(`Answered ${Object.keys(T.ans).length} of ${T.Q.length}. Submit the test? This cannot be undone.`))return;
  clearInterval(S.timer);window.onbeforeunload=null;await ok(db.rpc('submit_pyq_attempt',{p_attempt:id,p_answers:T.ans}));location.hash='#/pyqresult/'+id}
 draw();
 S.timer=setInterval(()=>{if(T.end-now()<=0)return submit(true);tick();
  if(lock){const s=curSec();if(s!==T.sec){T.sec=s;T.cur=T.Q.findIndex(x=>x.section_id===secs[s].id);draw()}}},1000)}

export async function vPyqResult([id]){shell('<p>Loading…</p>');
 const r=await ok(db.rpc('get_pyq_result',{p_attempt:id})),a=r.attempt,p=r.paper,un=r.questions.length-a.correct-a.wrong;
 const rev=f=>r.questions.map((q,i)=>{const u=a.answers?.[q.id],k=u==null?'un':u===q.correct?'ok':'bad';if(f!=='all'&&f!==k)return'';
  return`<div class="card rq ${k}"><b>Q${i+1}. ${esc(q.subject)}.</b> <span style="white-space:pre-wrap">${esc(q.question)}</span>${q.image_url?`<img src="${esc(q.image_url)}" alt="">`:''}<ul>${q.options.map((o,j)=>`<li class="${j===q.correct?'right':j===u?'wrong':''}">${'ABCD'[j]}. ${esc(o)}${j===u?' (your answer)':''}</li>`).join('')}</ul>${q.explanation?`<p class=muted>${esc(q.explanation)}</p>`:''}</div>`}).join('')||'<p class=muted>Nothing to show.</p>';
 $('.wrap').innerHTML=`<h2>${esc(p.exam_name)} · ${esc(p.year_label)} (PYQ Test)</h2><div class=card><h1 style="margin:0">${+(+a.score).toFixed(2)} / ${a.total}</h1><p>Correct ${a.correct} · Wrong ${a.wrong} · Unattempted ${un}</p></div>
 <div class=scroll><table><tr><th>Section<th>Questions<th>Correct<th>Wrong<th>Marks</tr>${a.section_scores.map(x=>`<tr><td>${esc(x.name)}<td>${x.n}<td>${x.c}<td>${x.w}<td>${+(+x.m).toFixed(2)}`).join('')}</table></div>
 ${a.subject_scores?.length?`<h3>Topic-wise</h3><div class=scroll><table><tr><th>Subject<th>Questions<th>Correct<th>Wrong<th>Marks</tr>${a.subject_scores.map(x=>`<tr><td>${esc(x.name)}<td>${x.n}<td>${x.c}<td>${x.w}<td>${+(+x.m).toFixed(2)}`).join('')}</table></div>`:''}
 <p><a class="btn ghost" href="#/analytics/${p.exam_id}">View performance analytics</a></p>
 <h3>Review</h3><p class=sub><a href=# data-f=all>All</a><a href=# data-f=bad>Wrong</a><a href=# data-f=un>Unattempted</a><a href=# data-f=ok>Correct</a></p><div id=rv>${rev('all')}</div>`;
 document.querySelectorAll('[data-f]').forEach(b=>b.onclick=e=>{e.preventDefault();$('#rv').innerHTML=rev(b.dataset.f)})}