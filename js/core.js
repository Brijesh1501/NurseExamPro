// Shared client, state and helpers. `supabase` and `Papa` come from CDN scripts in index.html.
import {SUPABASE_URL,SUPABASE_KEY} from './config.js';
export const db=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
export const S={me:null,timer:null};   // me = logged-in profile, timer = exam interval id
export const $=(s,e=document)=>e.querySelector(s);
export const app=$('#app');
export const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const fmt=s=>{s=Math.max(0,s|0);return[s/3600|0,(s%3600)/60|0,s%60].map(n=>String(n).padStart(2,'0')).join(':')};
export const ok=p=>p.then(r=>{if(r.error){alert(r.error.message);throw r.error}return r.data});
export const cnt=t=>db.from(t).select('*',{count:'exact',head:true}).then(r=>r.count);
export const negTxt=n=>!+n?'None':(Math.abs(n-1/3)<.001?'1/3':n==.25?'1/4':n)+' mark per wrong answer';

export function shell(html){clearInterval(S.timer);window.onbeforeunload=null;
 app.innerHTML=`<header class="bar"><a href="#/" class="brand">NurseExam Pro</a><nav>${S.me?`<a href="#/">Exams</a><a href="#/history">My results</a>${S.me.role==='admin'?'<a href="#/admin">Admin</a>':''}<a href="#" id="out">Sign out (${esc(S.me.full_name)})</a>`:''}</nav></header><main class="wrap">${html}</main>`;
 $('#out')&&($('#out').onclick=async e=>{e.preventDefault();await db.auth.signOut();S.me=null;location.hash='#/login'})}
