import {aDash} from './dashboard.js';
import {aPyqPapers} from './pyq_papers.js';
import {aPyqQuestions,aPyqImport} from './pyq_questions.js';
import {aExams,aStruct} from './structure.js';
import {aQuestions} from './questions.js';
import {aImport} from './import.js';
import {aAttempts,aUsers} from './reports.js';

export function vAdmin([sub,a,b]){({undefined:aDash,'':aDash,exams:aExams,structure:aStruct,questions:aQuestions,import:aImport,pyq:aPyqPapers,pyqquestions:aPyqQuestions,pyqimport:aPyqImport,attempts:aAttempts,users:aUsers}[sub]||aDash)(a,b)}