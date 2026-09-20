import {db,S,$,esc,fmt,ok,cnt,negTxt,shell} from '../core.js';
import {adm,grid,secOptions,QF} from './ui.js';

export async function aAttempts(){adm('<p>Loading…</p>');
 const a=await ok(db.from('attempts').select('id,status,score,total,correct,wrong,started_at,profiles(full_name,category),exam_stages(name,exams(name))').order('started_at',{ascending:false}).limit(500));
 $('.wrap').insertAdjacentHTML('beforeend',`<p><button class=btn id=ex>Export CSV</button></p><div class=scroll><table><tr><th>Candidate<th>Cat.<th>Exam<th>Stage<th>Status<th>Score<th>Date<th></tr>${a.map(x=>`<tr><td>${esc(x.profiles?.full_name)}<td>${x.profiles?.category}<td>${esc(x.exam_stages.exams.name)}<td>${esc(x.exam_stages.name)}<td>${x.status}<td>${x.status==='submitted'?`${+(+x.score).toFixed(2)} / ${x.total}`:'-'}<td>${new Date(x.started_at).toLocaleString()}<td>${x.status==='submitted'?`<a href="#/result/${x.id}">View</a>`:''}`).join('')}</table></div>`);
 $('#ex').onclick=()=>{const u=URL.createObjectURL(new Blob([Papa.unparse(a.map(x=>({candidate:x.profiles?.full_name,category:x.profiles?.category,exam:x.exam_stages.exams.name,stage:x.exam_stages.name,status:x.status,score:x.score,total:x.total,correct:x.correct,wrong:x.wrong,started:x.started_at})))]));Object.assign(document.createElement('a'),{href:u,download:'attempts.csv'}).click()}}

export async function aUsers(){adm('<div id=g></div>');const r=await ok(db.from('profiles').select('*').order('created_at',{ascending:false}));
 grid($('#g'),'profiles',r,[['full_name','Name'],['category','Category',['UR','EWS','OBC','SC','ST']],['role','Role',['candidate','admin']]],null,null,aUsers)}
