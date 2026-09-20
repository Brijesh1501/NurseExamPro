import {db,S,$,esc,fmt,ok,cnt,negTxt,shell} from '../core.js';
import {adm,grid,secOptions,QF} from './ui.js';

export async function aQuestions(){adm('<p>Loading…</p>');const{html,serHtml}=await secOptions();
 const rows=QF.sec?await ok(db.from('questions').select('*').eq('section_id',QF.sec).eq('series_id',QF.ser).order('created_at',{ascending:false}).limit(200)):[],e=QF.edit||{options:['','','',''],correct:0,active:true};
 $('.wrap').insertAdjacentHTML('beforeend',`<label>Test series<select id=sr>${serHtml}</select></label><label>Section<select id=sc>${html}</select></label>
 <form id=qf class=card><h3>${QF.edit?'Edit':'Add'} question</h3><label>Question<textarea name=question rows=3 required>${esc(e.question)}</textarea></label>
 ${[0,1,2,3].map(i=>`<label>Option ${'ABCD'[i]}<input name=o${i} value="${esc(e.options[i])}" required></label>`).join('')}
 <label>Correct answer<select name=correct>${[0,1,2,3].map(i=>`<option value=${i} ${e.correct===i?'selected':''}>${'ABCD'[i]}`).join('')}</select></label>
 <label>Explanation<textarea name=explanation rows=2>${esc(e.explanation)}</textarea></label>
 <label>Image (ECG, X-ray, instruments…) ${e.image_url?`<a href="${esc(e.image_url)}" target=_blank>current</a>`:''}<input type=file name=file accept="image/*"></label><label>…or image URL<input name=url value="${esc(e.image_url)}"></label>
 <label style="font-weight:400"><input type=checkbox name=active style="display:inline;width:auto" ${e.active?'checked':''}> Active</label>
 <button class=btn>${QF.edit?'Update':'Add'}</button> ${QF.edit?'<button type=button class="btn ghost" id=cx>Cancel</button>':''}</form>
 <h3>${rows.length} questions ${rows.length==200?'(latest 200)':''}</h3><p><button class="btn ghost warn" id=da>Delete all in this section</button></p>
 <div class=scroll><table><tr><th>#<th>Question<th>Ans<th>Img<th>Active<th></tr>${rows.map((r,i)=>`<tr><td>${i+1}<td>${esc(r.question.slice(0,110))}<td>${'ABCD'[r.correct]}<td>${r.image_url?'✔':r.needs_image?'<span class=bad>missing</span>':''}<td>${r.active?'Yes':'No'}<td class=act><button class="btn ghost" data-e="${r.id}">Edit</button><button class="btn ghost" data-x="${r.id}">Delete</button>`).join('')}</table></div>`);
 $('#sc').onchange=e=>{QF.sec=e.target.value;QF.edit=null;aQuestions()};
 $('#sr').onchange=e=>{QF.ser=e.target.value;QF.edit=null;aQuestions()};
 $('#cx')&&($('#cx').onclick=()=>{QF.edit=null;aQuestions()});
 $('#da').onclick=async()=>{if(confirm('Delete ALL questions in this section?')){await ok(db.from('questions').delete().eq('section_id',QF.sec).eq('series_id',QF.ser));aQuestions()}};
 $('.wrap').onclick=async ev=>{const b=ev.target.closest('[data-e],[data-x]');if(!b)return;
  if(b.dataset.e){QF.edit=rows.find(r=>r.id===b.dataset.e);aQuestions();scrollTo(0,0)}else if(confirm('Delete this question?')){await ok(db.from('questions').delete().eq('id',b.dataset.x));aQuestions()}};
 $('#qf').onsubmit=async ev=>{ev.preventDefault();const f=ev.target,fd=new FormData(f);let url=fd.get('url')||null;const file=fd.get('file');
  if(file&&file.size){const p=`${QF.sec}/${Date.now()}-${file.name.replace(/[^\w.]/g,'_')}`;const up=await db.storage.from('question-images').upload(p,file);if(up.error)return alert(up.error.message);url=db.storage.from('question-images').getPublicUrl(p).data.publicUrl}
  const o={section_id:QF.sec,series_id:QF.ser,question:fd.get('question'),options:[0,1,2,3].map(i=>fd.get('o'+i)),correct:+fd.get('correct'),explanation:fd.get('explanation')||null,image_url:url,needs_image:QF.edit?.needs_image&&!url,active:!!fd.get('active')};
  await ok(QF.edit?db.from('questions').update(o).eq('id',QF.edit.id):db.from('questions').insert(o));QF.edit=null;aQuestions()}}