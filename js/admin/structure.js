import {db,S,$,esc,fmt,ok,cnt,negTxt,shell} from '../core.js';
import {adm,grid,secOptions,QF} from './ui.js';

export async function aExams(){adm('<div id=g></div>');const r=await ok(db.from('exams').select('*').order('name'));
 grid($('#g'),'exams',r,[['code','Code'],['name','Name'],['org','Organisation'],['is_active','Active','bool']],{is_active:true},x=>`<a class="btn ghost" href="#/admin/structure/${x.id}">Stages & sections</a>`,aExams)}

export async function aStruct(id,sid){adm('<div id=g></div><div id=g2></div>');
 const[e,st]=await Promise.all([ok(db.from('exams').select('name').eq('id',id).single()),ok(db.from('exam_stages').select('*').eq('exam_id',id).order('ord'))]);
 $('#g').innerHTML='';$('#g').insertAdjacentHTML('beforebegin',`<h3>${esc(e.name)} · Stages</h3><p class=muted>Cut-offs are % by category, e.g. {"UR":50,"OBC":45}. Negative mark is per wrong answer (1/3 = 0.333333). Tick "Lock sections" to enforce sequential timed sections (needs a time on every section).</p>`);
 grid($('#g'),'exam_stages',st,[['name','Stage'],['ord','Order','number'],['duration_min','Minutes','number'],['negative_mark','Negative','number'],['cutoffs','Cut-offs','json'],['sections_locked','Lock sections','bool'],['is_active','Active','bool']],{exam_id:id,ord:st.length+1,duration_min:90,negative_mark:0,cutoffs:{},sections_locked:false,is_active:true},x=>`<a class="btn ghost" href="#/admin/structure/${id}/${x.id}">Sections</a>`,()=>aStruct(id,sid));
 if(sid){const s=await ok(db.from('sections').select('*').eq('stage_id',sid).order('ord'));$('#g2').innerHTML='<h3>Sections</h3><div id=g3></div>';
  grid($('#g3'),'sections',s,[['name','Section'],['ord','Order','number'],['question_count','Questions','number'],['marks_per_q','Marks/Q','number'],['duration_min','Minutes (blank = shared)','number']],{stage_id:sid,ord:s.length+1,question_count:10,marks_per_q:1},null,()=>aStruct(id,sid))}}
