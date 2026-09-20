import {db,S,$,esc,fmt,ok,cnt,negTxt,shell} from '../core.js';
import {adm,grid,secOptions,QF} from './ui.js';

export async function aImport(){adm('<p>Loading…</p>');const{stg,series,serHtml}=await secOptions();
 $('.wrap').insertAdjacentHTML('beforeend',`<div class=card><h3>Import questions from CSV</h3><p class=muted>Columns: Section, Image, Question, Option A–D, Correct Answer, Explanation. "Section 3" maps to the 3rd section of the chosen stage (or match by section name). Image may be a URL; "N/A" means none; a blank cell is flagged "image missing" so you can upload it later in the Question bank.</p>
 <label>Test series<select id=tr>${serHtml}</select></label><label>Target stage<select id=ts></select></label><input type=file id=fi accept=.csv> <a href=# id=tpl>Download template</a><div id=pv></div></div>`);
 const fillSt=()=>{const ex=series.find(s=>s.id===$('#tr').value)?.exam_id;$('#ts').innerHTML=stg.filter(s=>s.exam_id===ex).map(s=>`<option value=${s.id}>${esc(s.name)}`).join('')};$('#tr').onchange=fillSt;fillSt();
 $('#tpl').onclick=e=>{e.preventDefault();const u=URL.createObjectURL(new Blob(['Section,Image,Question,Option A,Option B,Option C,Option D,Correct Answer,Explanation\nSection 1,N/A,Sample question?,A1,B1,C1,D1,Option B,Why B\n']));Object.assign(document.createElement('a'),{href:u,download:'template.csv'}).click()};
 $('#fi').onchange=e=>Papa.parse(e.target.files[0],{header:true,skipEmptyLines:true,complete:({data})=>{
  const S=stg.find(s=>s.id===$('#ts').value).sections,rows=[],err=[];
  data.forEach((r,i)=>{const sn=String(r.Section||'').trim(),m=sn.match(/(\d+)\s*$/),sec=S[m?m[1]-1:-1]||S.find(x=>x.name.toLowerCase()===sn.toLowerCase());
   const c=String(r['Correct Answer']||'').match(/([A-D1-4])\s*$/i),ci=c?('ABCD'.indexOf(c[1].toUpperCase())>=0?'ABCD'.indexOf(c[1].toUpperCase()):c[1]-1):-1,op=['A','B','C','D'].map(k=>(r['Option '+k]||'').trim()),img=(r.Image||'').trim();
   if(!sec)return err.push(`Row ${i+2}: section "${sn}" not found`);if(!r.Question||op.some(x=>!x)||ci<0)return err.push(`Row ${i+2}: missing question/option/answer`);
   rows.push({section_id:sec.id,series_id:$('#tr').value,question:r.Question.trim(),options:op,correct:ci,explanation:r.Explanation||null,image_url:/^(https?:|data:)/i.test(img)?img:null,needs_image:img===''})});
  const miss=rows.filter(r=>r.needs_image).length;
  $('#pv').innerHTML=`<p><b class=ok>${rows.length} valid</b>, <b class=bad>${err.length} errors</b>${miss?`, <b class=bad>${miss} with blank Image cell</b>`:''}</p>${err.slice(0,15).map(x=>`<div class=bad>${esc(x)}</div>`).join('')}<button class=btn id=go ${rows.length?'':'disabled'}>Import ${rows.length} questions</button>`;
  $('#go').onclick=async()=>{$('#go').disabled=true;const ex=new Set((await ok(db.from('questions').select('section_id,question').in('section_id',S.map(x=>x.id)).eq('series_id',$('#tr').value))).map(x=>x.section_id+x.question));
   const fresh=rows.filter(r=>!ex.has(r.section_id+r.question));for(let i=0;i<fresh.length;i+=100)await ok(db.from('questions').insert(fresh.slice(i,i+100)));
   alert(`Imported ${fresh.length}, skipped ${rows.length-fresh.length} duplicates.`);QF.ser=$('#tr').value;location.hash='#/admin/questions'}}})}