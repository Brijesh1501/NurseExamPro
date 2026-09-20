import {db,S,$,esc,fmt,ok,cnt,negTxt,shell} from '../core.js';
import {adm,grid,secOptions,QF} from './ui.js';

export async function aDash(){adm('<p>Loading…</p>');
 const[e,q,a,u,sec]=await Promise.all([cnt('exams'),cnt('questions'),cnt('attempts'),cnt('profiles'),ok(db.from('sections').select('name,question_count,exam_stages(name,exams(name)),questions(count)').order('stage_id'))]);
 $('.wrap').insertAdjacentHTML('beforeend',`<div class=grid>${[['Exams',e],['Questions',q],['Attempts',a],['Users',u]].map(([t,n])=>`<div class=card><h1 style="margin:0">${n}</h1>${t}</div>`).join('')}</div>
 <h3>Question bank health</h3><p class=muted>Sections with fewer questions than required cannot fill a full paper.</p><div class=scroll><table><tr><th>Exam<th>Stage<th>Section<th>Needed<th>Available</tr>${sec.map(s=>{const n=s.questions[0].count;return`<tr><td>${esc(s.exam_stages.exams.name)}<td>${esc(s.exam_stages.name)}<td>${esc(s.name)}<td>${s.question_count}<td class="${n<s.question_count?'bad':'ok'}">${n}`}).join('')}</table></div>`)}
