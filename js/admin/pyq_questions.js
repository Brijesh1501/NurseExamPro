import {db,S,$,esc,fmt,ok,cnt,negTxt,shell} from '../core.js';
import {adm} from './ui.js';

const QF={paper:null,edit:null};

function parseRow(r,i,err){
 const c=String(r['Correct Answer']||'').match(/([A-D1-4])\s*$/i),ci=c?('ABCD'.indexOf(c[1].toUpperCase())>=0?'ABCD'.indexOf(c[1].toUpperCase()):c[1]-1):-1;
 const op=['A','B','C','D'].map(k=>String(r['Option '+k]??'').trim()),img=String(r.Image??'').trim(),subj=String(r.Subject||'').trim();
 if(!subj){err.push(`Row ${i+2}: Subject is required`);return null}
 if(!r.Question||op.some(x=>!x)||ci<0){err.push(`Row ${i+2}: missing question/option/answer`);return null}
 return{subject:subj,question:String(r.Question).trim(),options:op,correct:ci,explanation:r.Explanation?String(r.Explanation).trim():null,
  _img:img,_imgFile:null,image_url:/^(https?:|data:)/i.test(img)?img:null,needs_image:img===''};
}

async function papersFor(){const p=await ok(db.from('pyq_papers').select('id,year_label,exams(name)').order('exam_id').order('ord'));
 if(!p.some(x=>x.id===QF.paper))QF.paper=p[0]?.id;
 return{papers:p,html:p.map(x=>`<option value=${x.id} ${x.id===QF.paper?'selected':''}>${esc(x.exams.name+' — '+x.year_label)}`).join('')}}

export async function aPyqQuestions(paperArg){adm('<p>Loading…</p>');if(paperArg)QF.paper=paperArg;
 const{html}=await papersFor();
 if(!QF.paper)return $('.wrap').insertAdjacentHTML('beforeend','<p class=muted>Add a PYQ paper first (PYQ papers tab), then come back here.</p>');
 const rows=await ok(db.from('pyq_questions').select('*').eq('paper_id',QF.paper).order('seq')),e=QF.edit||{options:['','','',''],correct:0,active:true,subject:''};
 $('.wrap').insertAdjacentHTML('beforeend',`<label>Paper<select id=pp>${html}</select></label>
 <form id=qf class=card><h3>${QF.edit?'Edit':'Add'} question</h3><label>Subject / Topic<input name=subject value="${esc(e.subject)}" required placeholder="e.g. Medical-Surgical Nursing"></label>
 <label>Question<textarea name=question rows=3 required>${esc(e.question)}</textarea></label>
 ${[0,1,2,3].map(i=>`<label>Option ${'ABCD'[i]}<input name=o${i} value="${esc(e.options[i])}" required></label>`).join('')}
 <label>Correct answer<select name=correct>${[0,1,2,3].map(i=>`<option value=${i} ${e.correct===i?'selected':''}>${'ABCD'[i]}`).join('')}</select></label>
 <label>Explanation<textarea name=explanation rows=2>${esc(e.explanation)}</textarea></label>
 <label>Image ${e.image_url?`<a href="${esc(e.image_url)}" target=_blank>current</a>`:''}<input type=file name=file accept="image/*"></label><label>…or image URL<input name=url value="${esc(e.image_url)}"></label>
 <label style="font-weight:400"><input type=checkbox name=active style="display:inline;width:auto" ${e.active?'checked':''}> Active</label>
 <button class=btn>${QF.edit?'Update':'Add'}</button> ${QF.edit?'<button type=button class="btn ghost" id=cx>Cancel</button>':''}</form>
 <h3>${rows.length} questions</h3><p><button class="btn ghost warn" id=da>Delete all in this paper</button></p>
 <div class=scroll><table><tr><th>#<th>Subject<th>Question<th>Ans<th>Img<th>Active<th></tr>${rows.map((r,i)=>`<tr><td>${i+1}<td>${esc(r.subject)}<td>${esc(r.question.slice(0,90))}<td>${'ABCD'[r.correct]}<td>${r.image_url?'✔':''}<td>${r.active?'Yes':'No'}<td class=act><button class="btn ghost" data-e="${r.id}">Edit</button><button class="btn ghost" data-x="${r.id}">Delete</button>`).join('')}</table></div>`);
 $('#pp').onchange=e=>{QF.paper=e.target.value;QF.edit=null;aPyqQuestions()};
 $('#cx')&&($('#cx').onclick=()=>{QF.edit=null;aPyqQuestions()});
 $('#da').onclick=async()=>{if(confirm('Delete ALL questions in this paper?')){await ok(db.from('pyq_questions').delete().eq('paper_id',QF.paper));aPyqQuestions()}};
 $('.wrap').onclick=async ev=>{const b=ev.target.closest('[data-e],[data-x]');if(!b)return;
  if(b.dataset.e){QF.edit=rows.find(r=>r.id===b.dataset.e);aPyqQuestions();scrollTo(0,0)}else if(confirm('Delete this question?')){await ok(db.from('pyq_questions').delete().eq('id',b.dataset.x));aPyqQuestions()}};
 $('#qf').onsubmit=async ev=>{ev.preventDefault();const f=ev.target,fd=new FormData(f);let url=fd.get('url')||null;const file=fd.get('file');
  if(file&&file.size){const p=`pyq/${QF.paper}/${Date.now()}-${file.name.replace(/[^\w.]/g,'_')}`;const up=await db.storage.from('question-images').upload(p,file);if(up.error)return alert(up.error.message);url=db.storage.from('question-images').getPublicUrl(p).data.publicUrl}
  const o={paper_id:QF.paper,subject:fd.get('subject').trim(),question:fd.get('question'),options:[0,1,2,3].map(i=>fd.get('o'+i)),correct:+fd.get('correct'),explanation:fd.get('explanation')||null,image_url:url,active:!!fd.get('active')};
  await ok(QF.edit?db.from('pyq_questions').update(o).eq('id',QF.edit.id):db.from('pyq_questions').insert(o));QF.edit=null;aPyqQuestions()}}

export async function aPyqImport(){adm('<p>Loading…</p>');const{papers,html}=await papersFor();
 if(!papers.length)return $('.wrap').insertAdjacentHTML('beforeend','<p class=muted>Add a PYQ paper first (PYQ papers tab), then come back here.</p>');
 $('.wrap').insertAdjacentHTML('beforeend',`<div class=card><h3>Import PYQ questions</h3>
 <p class=muted>Columns: Subject, Image, Question, Option A–D, Correct Answer, Explanation. Subject is free text (e.g. "OBG Nursing", "Pharmacology") and does not need to match a fixed list.</p>
 <p class=muted><b>Plain CSV or Excel:</b> the Image column may hold a full image URL, or "N/A"/blank for no image.<br>
 <b>ZIP with images:</b> upload a .zip containing one spreadsheet (.xlsx or .csv) plus the image files. Put each file name (e.g. <code>q14.jpg</code>) in the Image column — it is matched to the file in the zip and uploaded automatically.</p>
 <label>Target paper<select id=tp>${html}</select></label>
 <input type=file id=fi accept=".csv,.xlsx,.xls,.zip"> <a href=# id=tpl>Download CSV template</a><div id=pv></div></div>`);
 $('#tp').onchange=e=>QF.paper=e.target.value;
 $('#tpl').onclick=e=>{e.preventDefault();const u=URL.createObjectURL(new Blob(['Subject,Image,Question,Option A,Option B,Option C,Option D,Correct Answer,Explanation\nMedical-Surgical Nursing,N/A,Sample question?,A1,B1,C1,D1,Option B,Why B\nPediatric Nursing,q1.jpg,Sample question with an image?,A1,B1,C1,D1,Option A,\n']));Object.assign(document.createElement('a'),{href:u,download:'pyq_template.csv'}).click()};

 function preview(rows,err,imgFiles){
  rows.forEach(r=>{if(r&&imgFiles&&r._img&&!r.image_url){const f=imgFiles.get(r._img.split(/[\\/]/).pop().toLowerCase());if(f){r._imgFile=f;r.needs_image=false}else{r.needs_image=true}}});
  rows=rows.filter(Boolean);
  const missing=rows.filter(r=>r.needs_image).length,toUpload=rows.filter(r=>r._imgFile).length;
  $('#pv').innerHTML=`<p><b class=ok>${rows.length} valid</b>, <b class=bad>${err.length} errors</b>${toUpload?`, <b>${toUpload} images to upload</b>`:''}${missing?`, <b class=bad>${missing} image not found / left blank</b>`:''}</p>
   ${err.slice(0,15).map(x=>`<div class=bad>${esc(x)}</div>`).join('')}<button class=btn id=go ${rows.length?'':'disabled'}>Import ${rows.length} questions</button><p id=up class=muted></p>`;
  $('#go').onclick=async()=>{$('#go').disabled=true;
   const ex=new Set((await ok(db.from('pyq_questions').select('question').eq('paper_id',$('#tp').value))).map(x=>x.question));
   const fresh=rows.filter(r=>!ex.has(r.question));
   const withImg=fresh.filter(r=>r._imgFile);
   for(let i=0;i<withImg.length;i+=5){await Promise.all(withImg.slice(i,i+5).map(async r=>{
    $('#up').textContent=`Uploading images… ${Math.min(i+5,withImg.length)}/${withImg.length}`;
    try{const blob=await r._imgFile.async('blob'),path=`pyq/${$('#tp').value}/${Date.now()}-${r._imgFile.name.replace(/[^\w.]/g,'_').split(/[\\/]/).pop()}`;
     const up=await db.storage.from('question-images').upload(path,blob);if(up.error)throw up.error;
     r.image_url=db.storage.from('question-images').getPublicUrl(path).data.publicUrl}catch{r.needs_image=true}}))}
   $('#up').textContent='Saving questions…';
   const clean=fresh.map(({_img,_imgFile,...r})=>({...r,paper_id:$('#tp').value}));
   for(let i=0;i<clean.length;i+=100)await ok(db.from('pyq_questions').insert(clean.slice(i,i+100)));
   alert(`Imported ${fresh.length}, skipped ${rows.length-fresh.length} duplicates.`);QF.paper=$('#tp').value;location.hash='#/admin/pyqquestions'}}

 $('#fi').onchange=async e=>{const file=e.target.files[0];if(!file)return;const name=file.name.toLowerCase();
  if(name.endsWith('.zip')){
   $('#pv').innerHTML='<p class=muted>Reading zip…</p>';
   const zip=await JSZip.loadAsync(file);
   const sheetEntry=Object.values(zip.files).find(f=>!f.dir&&/\.(xlsx|xls|csv)$/i.test(f.name));
   if(!sheetEntry)return $('#pv').innerHTML='<p class=bad>No .xlsx or .csv file found inside the zip.</p>';
   const imgFiles=new Map();
   Object.values(zip.files).forEach(f=>{if(!f.dir&&/\.(jpe?g|png|gif|webp)$/i.test(f.name))imgFiles.set(f.name.split(/[\\/]/).pop().toLowerCase(),f)});
   let data;
   if(/\.csv$/i.test(sheetEntry.name)){const text=await sheetEntry.async('string');data=Papa.parse(text,{header:true,skipEmptyLines:true}).data}
   else{const buf=await sheetEntry.async('arraybuffer'),wb=XLSX.read(buf,{type:'array'});data=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''})}
   const err=[],rows=data.map((r,i)=>parseRow(r,i,err));preview(rows,err,imgFiles)}
  else if(name.endsWith('.xlsx')||name.endsWith('.xls')){
   const buf=await file.arrayBuffer(),wb=XLSX.read(buf,{type:'array'}),data=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
   const err=[],rows=data.map((r,i)=>parseRow(r,i,err));preview(rows,err,null)}
  else Papa.parse(file,{header:true,skipEmptyLines:true,complete:({data})=>{
   const err=[],rows=data.map((r,i)=>parseRow(r,i,err));preview(rows,err,null)}})}}
