import {db,S,$,esc,fmt,ok,cnt,negTxt,shell} from '../core.js';
import {adm} from './ui.js';

export async function aDash(){adm('<p>Loading…</p>');
 const[e,q,a,u,ser,sec,stat]=await Promise.all([cnt('exams'),cnt('questions'),cnt('attempts'),cnt('profiles'),
  ok(db.from('test_series').select('id,name,ord,exam_id,exams(name)').order('ord')),ok(db.from('sections').select('id,name,ord,question_count,exam_stages(name,exam_id)').order('ord')),ok(db.from('question_stats').select('*'))]);
 const have=Object.fromEntries(stat.map(x=>[x.series_id+x.section_id,x.n]));
 const rows=ser.flatMap(t=>sec.filter(s=>s.exam_stages.exam_id===t.exam_id).map(s=>{const n=have[t.id+s.id]||0;
  return`<tr><td>${esc(t.exams.name)}<td>${esc(t.name)}<td>${esc(s.exam_stages.name)}<td>${esc(s.name)}<td>${s.question_count}<td class="${n<s.question_count?'bad':'ok'}">${n}`}));
 $('.wrap').insertAdjacentHTML('beforeend',`<div class=grid>${[['Exams',e],['Test series',ser.length],['Questions',q],['Attempts',a],['Users',u]].map(([t,n])=>`<div class=card><h1 style="margin:0">${n}</h1>${t}</div>`).join('')}</div>
 <h3>Question bank health</h3><p class=muted>Red = the series has fewer active questions than the section needs, so the test cannot fill a full paper.</p><div class=scroll><table><tr><th>Exam<th>Series<th>Stage<th>Section<th>Needed<th>Available</tr>${rows.join('')}</table></div>`)}