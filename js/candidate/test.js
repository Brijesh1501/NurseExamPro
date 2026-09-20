import {db,S as state,$,esc,fmt,ok,cnt,negTxt,shell} from '../core.js';

let T=null;   // live exam state

export async function vTest([id]){shell('<p>Loading…</p>');
 const d=await ok(db.rpc('get_attempt',{p_attempt:id}));if(d.attempt.status!=='in_progress')return location.hash='#/result/'+id;
 const st=d.stage,secs=d.sections;let c=0;secs.forEach(s=>{s.from=c;c+=s.duration_min||0});
 const lock=st.sections_locked&&secs.every(s=>s.duration_min),t0=new Date(d.attempt.started_at).getTime();
 T={id,d,Q:d.questions,ans:d.attempt.answers||{},marked:d.attempt.marked||{},vis:{},cur:0,lock,end:t0+st.duration_min*6e4,off:new Date(d.now)-Date.now()};
 const secEnd=s=>t0+(s.from+s.duration_min)*6e4,now=()=>Date.now()+T.off,
  curSec=()=>{const i=secs.findIndex(s=>secEnd(s)>now());return i<0?secs.length-1:i};
 if(lock){T.sec=curSec();T.cur=Math.max(0,T.Q.findIndex(x=>x.section_id===secs[T.sec].id))}
 window.onbeforeunload=()=>'';
 const persist=()=>{clearTimeout(T.pt);T.pt=setTimeout(()=>db.rpc('save_progress',{p_attempt:id,p_answers:T.ans,p_marked:T.marked}),500)};
 const stat=x=>T.ans[x.id]!=null?(T.marked[x.id]?'am':'a'):T.marked[x.id]?'m':T.vis[x.id]?'na':'';
 const move=k=>{const n=T.cur+k;if(n>=0&&n<T.Q.length&&(!lock||T.Q[n].section_id===T.Q[T.cur].section_id))T.cur=n;draw()};
 function draw(){const q=T.Q[T.cur],S=secs.find(s=>s.id===q.section_id),si=secs.indexOf(S);T.vis[q.id]=1;
  const inS=T.Q.map((x,i)=>[x,i]).filter(([x])=>x.section_id===S.id),n=inS.findIndex(([x])=>x.id===q.id)+1,sel=T.ans[q.id];
  const cn=k=>inS.filter(([x])=>stat(x)===k).length;
  app.innerHTML=`<div class=ex><div class=exh><b>${esc(st.name)}</b><span>Candidate: ${esc(state.me.full_name)}</span><span>${lock?`Section time <span class=tm id=st>--</span> `:''}Total <span class=tm id=tm>--</span></span></div>
  <div class=tabs>${secs.map((s,i)=>`<button data-sec="${i}" class="${i===si?'on':''}" ${lock&&i!==si?'disabled':''}>${esc(s.name)}</button>`).join('')}</div>
  <div class=exb><div class=qp><p class=muted>Question ${n} of ${inS.length} · <span class=ok>+${S.marks_per_q}</span> ${+st.negative_mark?`<span class=bad>−${+(st.negative_mark*S.marks_per_q).toFixed(2)}</span>`:''}</p>
  <p style="font-size:17px;white-space:pre-wrap">${esc(q.question)}</p>${q.image_url?`<img src="${esc(q.image_url)}" alt="Question image">`:''}
  ${q.options.map((o,k)=>`<label class="opt ${sel===k?'sel':''}"><input type=radio name=o value=${k} ${sel===k?'checked':''}><span>${'ABCD'[k]}. ${esc(o)}</span></label>`).join('')}
  <div class=qb><button class="btn ghost" id=pv>Previous</button><button class="btn ghost" id=mk>Mark for Review &amp; Next</button><button class="btn ghost" id=cl>Clear Response</button><button class=btn id=sn>Save &amp; Next</button></div></div>
  <aside class=side><b>${esc(S.name)}</b><div class=pal>${inS.map(([x,i],j)=>`<button data-i="${i}" class="${stat(x)} ${i===T.cur?'cur':''}">${j+1}</button>`).join('')}</div>
  <div class=lg><span><i style="background:var(--green)"></i>Answered ${cn('a')+cn('am')}</span><span><i style="background:var(--red)"></i>Not answered ${cn('na')}</span><span><i style="background:var(--grey)"></i>Not visited ${inS.length-cn('a')-cn('am')-cn('na')-cn('m')}</span><span><i style="background:var(--purple)"></i>Marked ${cn('m')+cn('am')}</span></div>
  <p><button class="btn warn" id=sb style="width:100%">Submit test</button></p></aside></div></div>`;
  app.querySelectorAll('input[name=o]').forEach(i=>i.onchange=()=>{T.ans[q.id]=+i.value;persist();draw()});
  app.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{T.cur=+b.dataset.i;draw()});
  app.querySelectorAll('[data-sec]').forEach(b=>b.onclick=()=>{T.cur=T.Q.findIndex(x=>x.section_id===secs[b.dataset.sec].id);draw()});
  $('#pv').onclick=()=>move(-1);$('#sn').onclick=()=>move(1);
  $('#mk').onclick=()=>{T.marked[q.id]=1;persist();move(1)};
  $('#cl').onclick=()=>{delete T.ans[q.id];delete T.marked[q.id];persist();draw()};
  $('#sb').onclick=()=>submit(false);tick()}
 function tick(){const n=now(),left=(T.end-n)/1e3;if($('#tm')){$('#tm').textContent=fmt(left);$('#tm').classList.toggle('low',left<300)}
  if(lock&&$('#st'))$('#st').textContent=fmt((secEnd(secs[T.sec])-n)/1e3)}
 async function submit(auto){if(!auto&&!confirm(`Answered ${Object.keys(T.ans).length} of ${T.Q.length}. Submit the test? This cannot be undone.`))return;
  clearInterval(state.timer);window.onbeforeunload=null;await ok(db.rpc('submit_attempt',{p_attempt:id,p_answers:T.ans}));location.hash='#/result/'+id}
 draw();
 state.timer=setInterval(()=>{if(T.end-now()<=0)return submit(true);tick();
  if(lock){const s=curSec();if(s!==T.sec){T.sec=s;T.cur=T.Q.findIndex(x=>x.section_id===secs[s].id);draw()}}},1000)}