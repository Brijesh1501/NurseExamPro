import {db,S,$,esc,fmt,ok,cnt,negTxt,shell} from '../core.js';

let signup=false;

export function vLogin(){shell(`<form id=f class="card auth"><h2>${signup?'Create candidate account':'Candidate sign in'}</h2>${signup?`<label>Full name<input name=name required></label><label>Category<select name=cat>${['UR','EWS','OBC','SC','ST'].map(c=>`<option>${c}`).join('')}</select></label>`:''}<label>Email<input name=email type=email required></label><label>Password<input name=pw type=password minlength=6 required></label><button class=btn>${signup?'Sign up':'Sign in'}</button><p><a href=# id=tg>${signup?'Already registered? Sign in':'New candidate? Create an account'}</a></p></form>`);
 $('#tg').onclick=e=>{e.preventDefault();signup=!signup;vLogin()};
 $('#f').onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));
  const r=signup?await db.auth.signUp({email:f.email,password:f.pw,options:{data:{full_name:f.name,category:f.cat}}}):await db.auth.signInWithPassword({email:f.email,password:f.pw});
  if(r.error)return alert(r.error.message);if(signup&&!r.data.session)return alert('Confirm your email, then sign in.');dispatchEvent(new Event('authchange'))}}
