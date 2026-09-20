import {db,S,$,esc,fmt,ok,cnt,negTxt,shell} from '../core.js';

export async function vResult([id]){shell('<p>Loading…</p>');
 const r=await ok(db.rpc('get_result',{p_attempt:id})),a=r.attempt,s=r.stage,pct=a.total?a.score/a.total*100:0,cut=s.cutoffs?.[r.category];
 const un=r.questions.length-a.correct-a.wrong;
 const rev=f=>r.questions.map((q,i)=>{const u=a.answers?.[q.id],k=u==null?'un':u===q.correct?'ok':'bad';if(f!=='all'&&f!==k)return'';
  return`<div class="card rq ${k}"><b>Q${i+1}.</b> <span style="white-space:pre-wrap">${esc(q.question)}</span>${q.image_url?`<img src="${esc(q.image_url)}" alt="">`:''}<ul>${q.options.map((o,j)=>`<li class="${j===q.correct?'right':j===u?'wrong':''}">${'ABCD'[j]}. ${esc(o)}${j===u?' (your answer)':''}</li>`).join('')}</ul>${q.explanation?`<p class=muted>${esc(q.explanation)}</p>`:''}</div>`}).join('')||'<p class=muted>Nothing to show.</p>';
 $('.wrap').innerHTML=`<h2>${esc(s.exam_name)} · ${esc(s.name)}</h2><div class=card><h1 style="margin:0">${+(+a.score).toFixed(2)} / ${a.total} <small class=muted>(${pct.toFixed(1)}%)</small></h1>
 <p>Correct ${a.correct} · Wrong ${a.wrong} · Unattempted ${un}</p>${cut!=null?`<p>Category ${esc(r.category)} cut-off ${cut}%: <span class="${pct>=cut?'ok':'bad'}">${pct>=cut?'Qualified':'Not qualified'}</span></p>`:''}</div>
 <div class=scroll><table><tr><th>Section<th>Questions<th>Correct<th>Wrong<th>Marks</tr>${a.section_scores.map(x=>`<tr><td>${esc(x.name)}<td>${x.n}<td>${x.c}<td>${x.w}<td>${+(+x.m).toFixed(2)}`).join('')}</table></div>
 <h3>Review</h3><p class=sub><a href=# data-f=all>All</a><a href=# data-f=bad>Wrong</a><a href=# data-f=un>Unattempted</a><a href=# data-f=ok>Correct</a></p><div id=rv>${rev('all')}</div>`;
 document.querySelectorAll('[data-f]').forEach(b=>b.onclick=e=>{e.preventDefault();$('#rv').innerHTML=rev(b.dataset.f)})}
