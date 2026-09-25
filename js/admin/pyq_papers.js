import {db,S,$,esc,fmt,ok,cnt,negTxt,shell} from '../core.js';
import {adm} from './ui.js';

export async function aPyqPapers(){adm('<div id=g></div>');
 const ex=await ok(db.from('exams').select('id,name').order('name')),rows=await ok(db.from('pyq_papers').select('*,exams(name)').order('exam_id').order('ord'));
 const opts=v=>ex.map(e=>`<option value="${e.id}" ${e.id===v?'selected':''}>${esc(e.name)}`).join('');
 const row=(r,n)=>`<tr data-id="${r?.id||''}"><td><select data-k=exam_id>${opts(r?.exam_id||ex[0]?.id)}</select></td>
  <td><input data-k=year_label value="${esc(r?.year_label||'')}" placeholder="e.g. 2023"></td>
  <td><input data-k=ord type=number data-n=1 value="${r?.ord??n+1}" style="width:60px"></td>
  <td><input data-k=duration_min type=number data-n=1 value="${r?.duration_min??60}" style="width:80px"></td>
  <td><input data-k=negative_mark type=number step=any data-n=1 value="${r?.negative_mark??0}" style="width:80px"></td>
  <td><input type=checkbox data-k=is_active ${r?(r.is_active?'checked':''):'checked'}></td>
  <td class=act><button class=btn data-s>${r?'Save':'Add'}</button>${r?`<button class="btn ghost" data-d>Delete</button><a class="btn ghost" href="#/admin/pyqquestions/${r.id}">Questions</a>`:''}</td></tr>`;
 $('.wrap').insertAdjacentHTML('beforeend',`<p class=muted>One row per real past paper, e.g. "NORCET 2023". Duration and negative mark are used only when a candidate takes it as a timed Test; Practice mode ignores both. Add subject-tagged questions to a paper from PYQ questions.</p>
 <div class=scroll><table><tr><th>Exam<th>Year / label<th>Order<th>Minutes<th>Negative mark<th>Active<th></tr>${rows.map((r,i)=>row(r,i)).join('')}${ex.length?row(null,rows.length):''}</table></div>`);
 $('#g').closest('.wrap').onclick=async e=>{const b=e.target.closest('button[data-s],button[data-d]');if(!b)return;const tr=b.closest('tr'),id=tr.dataset.id;
  if(b.dataset.d!==undefined){if(confirm('Delete this paper and all its questions and attempts?')){await ok(db.from('pyq_papers').delete().eq('id',id));aPyqPapers()}return}
  const o={};tr.querySelectorAll('[data-k]').forEach(i=>o[i.dataset.k]=i.type==='checkbox'?i.checked:i.dataset.n?+i.value:i.value);
  await ok(id?db.from('pyq_papers').update(o).eq('id',id):db.from('pyq_papers').insert(o));aPyqPapers()}}
