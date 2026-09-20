import {aDash} from './dashboard.js';
import {aExams,aStruct} from './structure.js';
import {aQuestions} from './questions.js';
import {aImport} from './import.js';
import {aAttempts,aUsers} from './reports.js';

export function vAdmin([sub,a,b]){({undefined:aDash,'':aDash,exams:aExams,structure:aStruct,questions:aQuestions,import:aImport,attempts:aAttempts,users:aUsers}[sub]||aDash)(a,b)}
