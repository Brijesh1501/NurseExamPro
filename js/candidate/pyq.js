import {db,S,$,app,esc,fmt,ok,cnt,negTxt,shell} from '../core.js';

let T=null;   // live PYQ test-mode state (separate from the mock-test T in test.js)
let PR=null;  // live practice-mode state

export async function vPyqSetup([id]){shell('<p>Loading…</p>');
 const p=await ok(db.from('pyq_papers').select('*,exams(name)').eq('id',id).single()),subs=await ok(db.rpc('pyq_subjects',{p_paper:id}));
 const total=subs.reduce((t,s)=>t+s.n,0);
 $('.wrap').innerHTML=`<h2>${esc(p.exams.name)} · ${esc(p.year_label)}</h2>
 <div class=card><h3>Choose subjects</h3><p class=muted>Leave all selected to cover the whole paper.</p>
 <label style="font-weight:400"><input type=checkbox id=all checked style="display:inline;width:auto"> All subjects (${total} questions)</label>
 ${subs.map(s=>`<label style="font-weight:400"><input type=checkbox class=sj value="${esc(s.subject)}" checked style="display:inline;width:auto"> ${esc(s.subject)} (${s.n})</label>`).join('')}
 <label>Number of questions<input id=cnt type=number min=1 value="${Math.min(total,20)}"></label></div>
 <div class=grid>
 <div class=card><h3>Practice</h3><p class=muted>No timer. See the correct answer and explanation right after each question.</p><button class=btn id=pr>Start practice</button></div>
 <div class=card><h3>Take as a test</h3><p class=muted>Timed ${p.duration_min} min, negative marking ${negTxt(p.negative_mark)}, results and review at the end — like the real paper.</p><button class=btn id=ts>Start test</button></div></div>`;
 $('#all').onchange=e=>document.querySelectorAll('.sj').forEach(c=>c.checked=e.target.checked);
 document.querySelectorAll('.sj').forEach(c=>c.onchange=()=>{$('#all').checked=[...document.querySelectorAll('.sj')].every(x=>x.checked)});
 const picked=()=>{const all=[...document.querySelectorAll('.sj')],chosen=all.filter(c=>c.checked).map(c=>c.value);return chosen.length===all.length?null:chosen};
 $('#pr').onclick=async()=>{$('#pr').disabled=true;const subjects=picked(),n=+$('#cnt').value||1;
  PR={paper:p,subjects,i:0,score:0,revealed:false,Q:await ok(db.rpc('get_pyq_practice',{p_paper:id,p_subjects:subjects,p_count:n}))};
  if(!PR.Q.length){$('#pr').disabled=false;return alert('No questions match that selection.')}
  location.hash='#/pyqpractice'};
 $('#ts').onclick=async()=>{$('#ts').disabled=true;const subjects=picked(),n=+$('#cnt').value||1;
  try{location.hash='#/pyqtest/'+await ok(db.rpc('start_pyq_test',{p_paper:id,p_subjects:subjects,p_count:n}))}catch{$('#ts').disabled=false}}}

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
   if(PR.i>=PR.Q.length){await ok(db.rpc('log_pyq_practice',{p_paper:PR.paper.id,p_subjects:PR.subjects,p_correct:PR.score,p_total:PR.Q.length}));
    $('.wrap').innerHTML=`<div class=card><h2>Practice complete</h2><p>Score: ${PR.score} / ${PR.Q.length}</p><a class=btn href="#/pyq/${PR.paper.id}">Practice again</a> <a class="btn ghost" href="#/">Back to exams</a></div>`;PR=null;return}
   draw()})}}

export async function vPyqTest([id]){shell('<p>Loading…</p>');
 const d=await ok(db.rpc('get_pyq_attempt',{p_attempt:id}));if(d.attempt.status!=='in_progress')return location.hash='#/pyqresult/'+id;
 const p=d.paper,t0=new Date(d.attempt.started_at).getTime();
 T={id,Q:d.questions,ans:d.attempt.answers||{},cur:0,end:t0+p.duration_min*6e4,off:new Date(d.now)-Date.now()};
 window.onbeforeunload=()=>'';
 const persist=()=>{clearTimeout(T.pt);T.pt=setTimeout(()=>db.rpc('save_pyq_progress',{p_attempt:id,p_answers:T.ans}),500)};
 function draw(){const q=T.Q[T.cur],sel=T.ans[q.id];
  app.innerHTML=`<div class=ex style="grid-template-rows:auto 1fr"><div class=exh><b>${esc(p.exam_name)} · ${esc(p.year_label)} (PYQ Test)</b><span>Candidate: ${esc(S.me.full_name)}</span><span>Total <span class=tm id=tm>--</span></span></div>
  <div class=exb><div class=qp><p class=muted>${esc(q.subject)} · Question ${T.cur+1} of ${T.Q.length}</p>
  <p style="font-size:17px;white-space:pre-wrap">${esc(q.question)}</p>${q.image_url?`<img src="${esc(q.image_url)}" alt="">`:''}
  ${q.options.map((o,k)=>`<label class="opt ${sel===k?'sel':''}"><input type=radio name=o value=${k} ${sel===k?'checked':''}><span>${'ABCD'[k]}. ${esc(o)}</span></label>`).join('')}
  <div class=qb><button class="btn ghost" id=pv>Previous</button><button class=btn id=sn>Save & Next</button></div></div>
  <aside class=side><div class=pal>${T.Q.map((x,i)=>`<button data-i="${i}" class="${T.ans[x.id]!=null?'a':''} ${i===T.cur?'cur':''}">${i+1}</button>`).join('')}</div>
  <p><button class="btn warn" id=sb style="width:100%">Submit test</button></p></aside></div></div>`;
  app.querySelectorAll('input[name=o]').forEach(i=>i.onchange=()=>{T.ans[q.id]=+i.value;persist();draw()});
  app.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{T.cur=+b.dataset.i;draw()});
  $('#pv').onclick=()=>{if(T.cur>0){T.cur--;draw()}};$('#sn').onclick=()=>{if(T.cur<T.Q.length-1){T.cur++;draw()}};
  $('#sb').onclick=()=>submit(false);tick()}
 function tick(){const left=(T.end-(Date.now()+T.off))/1e3;if($('#tm')){$('#tm').textContent=fmt(left);$('#tm').classList.toggle('low',left<300)}}
 async function submit(auto){if(!auto&&!confirm(`Answered ${Object.keys(T.ans).length} of ${T.Q.length}. Submit? This cannot be undone.`))return;
  clearInterval(S.timer);window.onbeforeunload=null;await ok(db.rpc('submit_pyq_attempt',{p_attempt:id,p_answers:T.ans}));location.hash='#/pyqresult/'+id}
 draw();S.timer=setInterval(()=>{if(T.end-(Date.now()+T.off)<=0)return submit(true);tick()},1000)}

export async function vPyqResult([id]){shell('<p>Loading…</p>');
 const r=await ok(db.rpc('get_pyq_result',{p_attempt:id})),a=r.attempt,p=r.paper,un=r.questions.length-a.correct-a.wrong;
 const rev=f=>r.questions.map((q,i)=>{const u=a.answers?.[q.id],k=u==null?'un':u===q.correct?'ok':'bad';if(f!=='all'&&f!==k)return'';
  return`<div class="card rq ${k}"><b>Q${i+1}. ${esc(q.subject)}.</b> <span style="white-space:pre-wrap">${esc(q.question)}</span>${q.image_url?`<img src="${esc(q.image_url)}" alt="">`:''}<ul>${q.options.map((o,j)=>`<li class="${j===q.correct?'right':j===u?'wrong':''}">${'ABCD'[j]}. ${esc(o)}${j===u?' (your answer)':''}</li>`).join('')}</ul>${q.explanation?`<p class=muted>${esc(q.explanation)}</p>`:''}</div>`}).join('')||'<p class=muted>Nothing to show.</p>';
 $('.wrap').innerHTML=`<h2>${esc(p.exam_name)} · ${esc(p.year_label)} (PYQ Test)</h2><div class=card><h1 style="margin:0">${+(+a.score).toFixed(2)} / ${a.total}</h1><p>Correct ${a.correct} · Wrong ${a.wrong} · Unattempted ${un}</p></div>
 <div class=scroll><table><tr><th>Subject<th>Questions<th>Correct<th>Wrong<th>Marks</tr>${a.subject_scores.map(x=>`<tr><td>${esc(x.name)}<td>${x.n}<td>${x.c}<td>${x.w}<td>${+(+x.m).toFixed(2)}`).join('')}</table></div>
 <h3>Review</h3><p class=sub><a href=# data-f=all>All</a><a href=# data-f=bad>Wrong</a><a href=# data-f=un>Unattempted</a><a href=# data-f=ok>Correct</a></p><div id=rv>${rev('all')}</div>`;
 document.querySelectorAll('[data-f]').forEach(b=>b.onclick=e=>{e.preventDefault();$('#rv').innerHTML=rev(b.dataset.f)})}
