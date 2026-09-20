import {db,S,$,esc,fmt,ok,cnt,negTxt,shell} from '../core.js';

export const QF={ser:null,sec:null,edit:null};   // question-bank selection state

export function adm(html){shell(`<div class=sub>${[['','Dashboard'],['exams','Exams & structure'],['questions','Question bank'],['import','CSV import'],['attempts','Attempts & results'],['users','Users']].map(([h,t])=>`<a href="#/admin/${h}">${t}</a>`).join('')}</div>${html}`)}

export function grid(el,table,rows,F,def,extra,reload){
 const cell=(f,v)=>Array.isArray(f[2])?`<select data-k="${f[0]}">${f[2].map(o=>`<option ${o==v?'selected':''}>${o}`).join('')}</select>`:f[2]==='bool'?`<input type=checkbox data-k="${f[0]}" ${v?'checked':''}>`:f[2]==='json'?`<input data-k="${f[0]}" data-j="1" value="${esc(JSON.stringify(v??{}))}">`:`<input data-k="${f[0]}" data-n="${f[2]==='number'?1:''}" ${f[2]==='number'?'type=number step=any':''} value="${esc(v??'')}">`;
 const tr=(r,n)=>`<tr data-id="${r?.id||''}">${F.map(f=>`<td>${cell(f,r?r[f[0]]:def[f[0]])}</td>`).join('')}<td class=act><button class=btn data-s>${n?'Add':'Save'}</button>${n?'':`<button class="btn ghost" data-d>Delete</button>`}${r&&extra?extra(r):''}</td></tr>`;
 el.innerHTML=`<div class=scroll><table><tr>${F.map(f=>`<th>${f[1]}`).join('')}<th></tr>${rows.map(r=>tr(r)).join('')}${def?tr(null,1):''}</table></div>`;
 el.onclick=async e=>{const b=e.target.closest('button[data-s],button[data-d]');if(!b)return;const row=b.closest('tr'),id=row.dataset.id;
  try{if(b.dataset.d!==undefined){if(!confirm('Delete? Linked stages, questions or attempts are removed too.'))return;await ok(db.from(table).delete().eq('id',id));return reload()}
  const o={};row.querySelectorAll('[data-k]').forEach(i=>{const k=i.dataset.k;o[k]=i.type==='checkbox'?i.checked:i.dataset.j?JSON.parse(i.value||'{}'):i.dataset.n?(i.value===''?null:+i.value):i.value});
  await ok(id?db.from(table).update(o).eq('id',id):db.from(table).insert({...def,...o}));reload()}catch(err){if(err.name==='SyntaxError')alert('Invalid JSON')}}}

export async function secOptions(){
 const[stg,series]=await Promise.all([ok(db.from('exam_stages').select('id,name,exam_id,exams(name),sections(id,name,ord)').order('name')),ok(db.from('test_series').select('id,name,exam_id,exams(name)').order('exam_id').order('ord'))]);
 if(!series.some(x=>x.id===QF.ser))QF.ser=series[0]?.id;
 const ser=series.find(x=>x.id===QF.ser),ex=stg.filter(s=>s.exam_id===ser?.exam_id);
 if(!ex.some(s=>s.sections.some(x=>x.id===QF.sec)))QF.sec=ex.flatMap(s=>s.sections)[0]?.id;
 return{stg,series,ser,serHtml:series.map(s=>`<option value=${s.id} ${s.id===QF.ser?'selected':''}>${esc(s.exams.name+' — '+s.name)}`).join(''),
  html:ex.map(s=>`<optgroup label="${esc(s.name)}">${s.sections.sort((a,b)=>a.ord-b.ord).map(x=>`<option value=${x.id} ${x.id===QF.sec?'selected':''}>${esc(x.name)}`).join('')}</optgroup>`).join('')}}