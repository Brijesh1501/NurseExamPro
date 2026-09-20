// Entry point: session bootstrap + hash router
import {db,S} from './core.js';
import {vLogin} from './candidate/auth.js';
import {vHome,vExam,vHistory} from './candidate/home.js';
import {vTest} from './candidate/test.js';
import {vResult} from './candidate/result.js';
import {vAdmin} from './admin/router.js';

async function boot(){const{data:{session}}=await db.auth.getSession();S.me=null;
 if(session)S.me=(await db.from('profiles').select('*').eq('id',session.user.id).single()).data;route()}
function route(){const p=location.hash.slice(2).split('/');
 if(!S.me&&p[0]!=='login')return location.hash='#/login';
 const R={login:vLogin,exam:vExam,test:vTest,result:vResult,history:vHistory,admin:vAdmin};
 if(S.me&&p[0]==='login')return vHome();
 if(p[0]==='admin'&&S.me.role!=='admin')return vHome();
 (R[p[0]]||vHome)(p.slice(1))}
addEventListener('hashchange',route);
addEventListener('authchange',async()=>{await boot();location.hash='#/'});
boot();