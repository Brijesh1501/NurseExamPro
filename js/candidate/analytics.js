import {db,S,$,app,esc,fmt,ok,cnt,negTxt,shell} from '../core.js';

// Strong/Moderate/Weak classification. A topic attempted too few times isn't labelled Weak just because
// one or two answers were wrong — it's flagged as needing more attempts before the label means anything.
function zone(o){const att=o.c+o.w;
 if(att<3)return{label:'Needs more attempts',color:'#5b6b72',cls:''};
 const p=o.c/att*100;
 if(p>=75)return{label:'Strong',color:'#2e8b57',cls:'ok'};
 if(p>=50)return{label:'Moderate',color:'#e08a00',cls:''};
 return{label:'Weak',color:'#c0392b',cls:'bad'}}

function acc(bucket,arr){(arr||[]).forEach(s=>{const o=bucket[s.name]=bucket[s.name]||{name:s.name,n:0,c:0,w:0,m:0};o.n+=s.n;o.c+=s.c;o.w+=s.w;o.m+=+s.m})}

function zoneCards(bucket){const rows=Object.values(bucket).sort((a,b)=>{const oa=a.c+a.w?a.c/(a.c+a.w):-1,ob=b.c+b.w?b.c/(b.c+b.w):-1;return oa-ob});
 return rows.map(o=>{const z=zone(o),att=o.c+o.w,p=att?(o.c/att*100).toFixed(0):'—';
  return`<div class=card style="border-left:5px solid ${z.color}"><b>${esc(o.name)}</b><span class="tag ${z.cls}" style="float:right">${z.label}</span><p class=muted>${o.c} correct · ${o.w} wrong · ${o.n-att} unattempted (of ${o.n}) ${att?`· ${p}% accuracy`:''}</p></div>`}).join('')||'<p class=muted>No data yet.</p>'}

function barChart(canvas,bucket){const rows=Object.values(bucket).filter(o=>o.c+o.w>0);if(!rows.length)return;
 new Chart(canvas,{type:'bar',data:{labels:rows.map(r=>r.name),datasets:[{label:'Accuracy %',data:rows.map(r=>+(r.c/(r.c+r.w)*100).toFixed(1)),backgroundColor:rows.map(r=>zone(r).color)}]},
  options:{indexAxis:'y',scales:{x:{min:0,max:100}},plugins:{legend:{display:false}}}})}

export async function vAnalytics([examId]){shell('<p>Loading…</p>');
 const[ex,data]=await Promise.all([ok(db.from('exams').select('name').eq('id',examId).single()),ok(db.rpc('get_exam_analytics',{p_exam:examId}))]);
 const all=[...data.mock.map(x=>({...x,kind:'Mock Test',label:`${x.series||''} · ${x.stage}`})),
  ...data.pyq_test.map(x=>({...x,kind:'PYQ Test',label:`${x.paper} (PYQ Test)`})),
  ...data.pyq_practice.map(x=>({...x,kind:'PYQ Practice',label:`${x.paper} (Practice)`}))]
  .map(x=>({...x,pct:x.total?x.score/x.total*100:0})).sort((a,b)=>new Date(a.submitted_at)-new Date(b.submitted_at));

 if(!all.length){$('.wrap').innerHTML=`<h2>${esc(ex.name)} · Performance analytics</h2><p class=muted>No submitted attempts yet for this exam. Take a mock test or a PYQ test/practice session first, then come back here.</p>`;return}

 const bySection={},bySubject={};
 data.mock.forEach(x=>acc(bySection,x.section_scores));
 data.pyq_test.forEach(x=>acc(bySection,x.section_scores));
 data.pyq_test.forEach(x=>acc(bySubject,x.subject_scores));
 data.pyq_practice.forEach(x=>acc(bySubject,x.subject_scores));
 const avgPct=all.reduce((t,x)=>t+x.pct,0)/all.length,bestPct=Math.max(...all.map(x=>x.pct));
 const wrongCount=[...data.mock,...data.pyq_test].reduce((t,x)=>t+(x.section_scores||[]).reduce((s,o)=>s+o.w,0),0)+data.pyq_practice.reduce((t,x)=>t+(x.subject_scores||[]).reduce((s,o)=>s+o.w,0),0);

 $('.wrap').innerHTML=`<h2>${esc(ex.name)} · Performance analytics</h2>
 <div class=grid>
  <div class=card><h1 style="margin:0">${all.length}</h1>Attempts submitted</div>
  <div class=card><h1 style="margin:0">${avgPct.toFixed(1)}%</h1>Average score</div>
  <div class=card><h1 style="margin:0">${bestPct.toFixed(1)}%</h1>Best score</div>
  <div class=card><h1 style="margin:0">${wrongCount}</h1>Wrong answers overall <span class=muted>(a proxy for marks lost to negative marking)</span></div>
 </div>
 <div class=card><h3>Score trend</h3><canvas id=trend height="90"></canvas></div>
 <div class=card><h3>Section-wise strong / weak zones</h3><p class=muted>From mock tests and PYQ tests, grouped by the exam's own sections. Strong ≥75% accuracy, Moderate 50–74%, Weak below 50%, computed only once a section has at least 3 attempted questions.</p>
  <canvas id=secChart height="140"></canvas><div class=grid style="margin-top:10px">${zoneCards(bySection)}</div></div>
 ${Object.keys(bySubject).length?`<div class=card><h3>Topic-wise strong / weak zones</h3><p class=muted>From PYQ Subject tags, across every Practice session and PYQ Test you've taken — the most reliable signal of which topics genuinely need revision.</p>
  <canvas id=subChart height="140"></canvas><div class=grid style="margin-top:10px">${zoneCards(bySubject)}</div></div>`:''}
 <div class=card><h3>How you compare</h3><p class=muted>Your latest attempt on each test, against everyone else who has submitted it. Numbers only — no other candidate's identity is shown.</p><div id=cmp><p class=muted>Loading…</p></div></div>`;

 new Chart($('#trend'),{type:'line',data:{labels:all.map(x=>new Date(x.submitted_at).toLocaleDateString()),
   datasets:[{label:'Score %',data:all.map(x=>+x.pct.toFixed(1)),borderColor:'#0b5563',backgroundColor:'#0b556333',tension:.25,pointRadius:4,fill:true}]},
  options:{scales:{y:{min:0,max:100}},plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${all[c.dataIndex].kind} · ${all[c.dataIndex].label}: ${c.formattedValue}%`}}}}});
 barChart($('#secChart'),bySection);
 if($('#subChart'))barChart($('#subChart'),bySubject);

 const mockCombos=[...new Map(data.mock.map(x=>[x.stage_id+'|'+(x.series_id||''),x])).values()];
 const pyqCombos=[...new Map([...data.pyq_test.map(x=>[x.paper_id+'|test',{...x,mode:'test'}]),...data.pyq_practice.map(x=>[x.paper_id+'|practice',{...x,mode:'practice'}])]).values()];
 const rows=await Promise.all([
  ...mockCombos.map(async x=>({label:`${x.series||''} · ${x.stage} (Mock Test)`,s:await ok(db.rpc('mock_series_stats',{p_stage:x.stage_id,p_series:x.series_id}))})),
  ...pyqCombos.map(async x=>({label:`${x.paper} (PYQ ${x.mode==='test'?'Test':'Practice'})`,s:await ok(db.rpc('pyq_stats',{p_paper:x.paper_id,p_mode:x.mode}))}))]);
 $('#cmp').innerHTML=rows.filter(r=>r.s.count).map(r=>`<div class=card><b>${esc(r.label)}</b><p class=muted>You: <b>${r.s.my_pct}%</b> · Class average: ${r.s.avg}% · Topper: ${r.s.max}% · ${r.s.count} attempt${r.s.count===1?'':'s'} submitted</p>
  <p>You're ahead of <b>${r.s.percentile}%</b> of everyone who has taken this.</p></div>`).join('')||'<p class=muted>Not enough data yet.</p>'}
