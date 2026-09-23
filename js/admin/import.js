import {db,S,$,esc,fmt,ok,cnt,negTxt,shell} from '../core.js';
import {adm,grid,secOptions,QF} from './ui.js';

// Turn one spreadsheet row into a validated question, or push an error. Shared by the plain-CSV/Excel
// and the ZIP (spreadsheet + images) paths below.
function parseRow(r,i,Sections,err){
 const sn=String(r.Section||'').trim(),m=sn.match(/(\d+)\s*$/),sec=Sections[m?m[1]-1:-1]||Sections.find(x=>x.name.toLowerCase()===sn.toLowerCase());
 const c=String(r['Correct Answer']||'').match(/([A-D1-4])\s*$/i),ci=c?('ABCD'.indexOf(c[1].toUpperCase())>=0?'ABCD'.indexOf(c[1].toUpperCase()):c[1]-1):-1;
 const op=['A','B','C','D'].map(k=>String(r['Option '+k]??'').trim()),img=String(r.Image??'').trim();
 if(!sec){err.push(`Row ${i+2}: section "${sn}" not found`);return null}
 if(!r.Question||op.some(x=>!x)||ci<0){err.push(`Row ${i+2}: missing question/option/answer`);return null}
 return{section_id:sec.id,question:String(r.Question).trim(),options:op,correct:ci,explanation:r.Explanation?String(r.Explanation).trim():null,
  _img:img,_imgFile:null,image_url:/^(https?:|data:)/i.test(img)?img:null,needs_image:img===''};
}

export async function aImport(){adm('<p>Loading…</p>');const{stg,series,serHtml}=await secOptions();
 $('.wrap').insertAdjacentHTML('beforeend',`<div class=card><h3>Import questions</h3>
 <p class=muted>Columns: Section, Image, Question, Option A–D, Correct Answer, Explanation. "Section 3" maps to the 3rd section of the chosen stage (or match by section name).</p>
 <p class=muted><b>Plain CSV or Excel:</b> the Image column may hold a full image URL, or "N/A"/blank for no image.<br>
 <b>ZIP with images:</b> upload a .zip containing one spreadsheet (.xlsx or .csv) plus an images folder. Put each image's file name (e.g. <code>q14.jpg</code>) in the Image column — the matching file is found in the zip and uploaded automatically. A name that isn't found is flagged so you can add it later in the Question bank.</p>
 <label>Test series<select id=tr>${serHtml}</select></label><label>Target stage<select id=ts></select></label>
 <input type=file id=fi accept=".csv,.xlsx,.xls,.zip"> <a href=# id=tpl>Download CSV template</a><div id=pv></div></div>`);
 const fillSt=()=>{const ex=series.find(s=>s.id===$('#tr').value)?.exam_id;$('#ts').innerHTML=stg.filter(s=>s.exam_id===ex).map(s=>`<option value=${s.id}>${esc(s.name)}`).join('')};$('#tr').onchange=fillSt;fillSt();
 $('#tpl').onclick=e=>{e.preventDefault();const u=URL.createObjectURL(new Blob(['Section,Image,Question,Option A,Option B,Option C,Option D,Correct Answer,Explanation\nSection 1,N/A,Sample question?,A1,B1,C1,D1,Option B,Why B\nSection 1,q1.jpg,Sample question with an image?,A1,B1,C1,D1,Option A,\n']));Object.assign(document.createElement('a'),{href:u,download:'template.csv'}).click()};

 function preview(rows,err,imgFiles){
  const S=stg.find(s=>s.id===$('#ts').value).sections;
  rows.forEach(r=>{if(r&&imgFiles&&r._img&&!r.image_url){const f=imgFiles.get(r._img.split(/[\\/]/).pop().toLowerCase());if(f){r._imgFile=f;r.needs_image=false}else{r.needs_image=true}}});
  rows=rows.filter(Boolean);
  const missing=rows.filter(r=>r.needs_image).length,toUpload=rows.filter(r=>r._imgFile).length;
  $('#pv').innerHTML=`<p><b class=ok>${rows.length} valid</b>, <b class=bad>${err.length} errors</b>${toUpload?`, <b>${toUpload} images to upload</b>`:''}${missing?`, <b class=bad>${missing} image not found / left blank</b>`:''}</p>
   ${err.slice(0,15).map(x=>`<div class=bad>${esc(x)}</div>`).join('')}<button class=btn id=go ${rows.length?'':'disabled'}>Import ${rows.length} questions</button><p id=up class=muted></p>`;
  $('#go').onclick=async()=>{$('#go').disabled=true;
   const ex=new Set((await ok(db.from('questions').select('section_id,question').in('section_id',S.map(x=>x.id)).eq('series_id',$('#tr').value))).map(x=>x.section_id+x.question));
   const fresh=rows.filter(r=>!ex.has(r.section_id+r.question));
   const withImg=fresh.filter(r=>r._imgFile);
   for(let i=0;i<withImg.length;i+=5){await Promise.all(withImg.slice(i,i+5).map(async r=>{
    $('#up').textContent=`Uploading images… ${Math.min(i+5,withImg.length)}/${withImg.length}`;
    try{const blob=await r._imgFile.async('blob'),path=`${$('#tr').value}/${Date.now()}-${r._imgFile.name.replace(/[^\w.]/g,'_').split(/[\\/]/).pop()}`;
     const up=await db.storage.from('question-images').upload(path,blob);if(up.error)throw up.error;
     r.image_url=db.storage.from('question-images').getPublicUrl(path).data.publicUrl}catch{r.needs_image=true}}))}
   $('#up').textContent='Saving questions…';
   const clean=fresh.map(({_img,_imgFile,...r})=>({...r,series_id:$('#tr').value}));
   for(let i=0;i<clean.length;i+=100)await ok(db.from('questions').insert(clean.slice(i,i+100)));
   alert(`Imported ${fresh.length}, skipped ${rows.length-fresh.length} duplicates.`);QF.ser=$('#tr').value;location.hash='#/admin/questions'}}

 $('#fi').onchange=async e=>{const file=e.target.files[0];if(!file)return;const name=file.name.toLowerCase();
  const S=()=>stg.find(s=>s.id===$('#ts').value).sections;
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
   const err=[],rows=data.map((r,i)=>parseRow(r,i,S(),err));
   preview(rows,err,imgFiles)}
  else if(name.endsWith('.xlsx')||name.endsWith('.xls')){
   const buf=await file.arrayBuffer(),wb=XLSX.read(buf,{type:'array'}),data=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
   const err=[],rows=data.map((r,i)=>parseRow(r,i,S(),err));
   preview(rows,err,null)}
  else Papa.parse(file,{header:true,skipEmptyLines:true,complete:({data})=>{
   const err=[],rows=data.map((r,i)=>parseRow(r,i,S(),err));
   preview(rows,err,null)}})}}