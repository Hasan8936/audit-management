/* OnTrack Audit Management — core: data store, helpers, shell */
const KEY='amp-grc-v2',DV=2;
const T0=new Date(),day=n=>new Date(T0.getTime()+n*864e5).toISOString().slice(0,10),TODAY=day(0);
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const MODS=[['risks','Risks'],['ctrls','Controls'],['plan','Audit plan'],['engs','Engagements'],['finds','Findings'],['setup','Setup']];
const LVL=['None','View','Edit','Approve'],SV=['Critical','High','Medium','Low'];
const OT=['Group','Country','Legal entity','Business unit','Department'];
const FS=['Draft','Auditor Review','Management Response','Approved','Remediation','Awaiting Verification','Closed'];
const ES=['Draft','Planning','Fieldwork','Review','Reporting','Management Response','Closed'];
const CFT=['Text','Long text','Number','Date','Boolean','Dropdown','Multi-select'];
const RECORD_ROLES=['Super Admin','Owner','Editor','Viewer','Reviewer','Approver'];
const WORKFLOW_ROLES=['Owner','Editor','Viewer','Reviewer','Approver'];
const RECORD_MATRIX=[
 ['Create record',['Super Admin','Owner']],['View assigned record',['Super Admin','Owner','Editor','Viewer','Reviewer','Approver']],
 ['Edit record details',['Super Admin','Owner','Editor']],['Assign users',['Super Admin','Owner']],['Modify security assignments',['Super Admin','Owner']],
 ['Transfer ownership',['Super Admin','Owner']],['Submit record for review',['Owner','Editor']],['Record review decision',['Reviewer']],['Record approval decision',['Approver']],
 ['Provide review remarks',['Reviewer']],['Provide approval remarks',['Approver']]
];
const rolePerms=(risk,other=1,setup=0)=>Object.fromEntries(MODS.map(([k])=>[k,k==='risks'?risk:k==='setup'?setup:other]));

/* ---------- seed ---------- */
function mkF(id,t,e,r,c,sv,s,own,due,x,resp='',ver=''){return{id,t,e,r,c,sv,s,own,due,cd:x[0],cr:x[1],ca:x[2],ef:x[3],rc:x[4],resp,ver,ext:null,x:{}}}
function mkR(n,o){return Object.assign({n,desc:'',type:'Operational',am:'Standard 5x5',cx:'Enterprise ranking',st:'Active',owner:'',persp:{},ev:'',cons:[],inh:[3,3],res:[2,3],ap:0,nr:day(60),f:{},cmt:[],hist:[],ver:1,cd:day(-90)},o)}
function seedSetup(){
  const P=x=>Object.fromEntries(MODS.map((m,i)=>[m[0],+x[i]])),L=a=>a.map(v=>({v,on:1}));
  return{
  users:[
   {id:'U-00',n:'Super Admin',em:'superadmin@northwind.example',roles:['Super Admin','Administrator'],sc:'Northwind Group',on:1},
   {id:'U-01',n:'Owner',em:'owner@northwind.example',roles:['Owner','Audit Manager'],sc:'Northwind Group',on:1},
   {id:'U-02',n:'Editor',em:'editor@northwind.example',roles:['Editor','Lead Auditor'],sc:'Northwind Group',on:1},
   {id:'U-03',n:'Viewer',em:'viewer@northwind.example',roles:['Viewer','Auditor'],sc:'Northwind Group',on:1},
   {id:'U-04',n:'Reviewer',em:'reviewer@northwind.example',roles:['Reviewer','Audit Manager'],sc:'Northwind Group',on:1},
   {id:'U-05',n:'Approver',em:'approver@northwind.example',roles:['Approver','CAE'],sc:'Northwind Group',on:1}],
  roles:{'Super Admin':P('333333'),Owner:rolePerms(2),Editor:rolePerms(2),Viewer:rolePerms(1),Reviewer:rolePerms(1),Approver:rolePerms(1),
   Administrator:P('333333'),CAE:P('333330'),'Audit Manager':P('223330'),'Lead Auditor':P('222220'),Auditor:P('112220'),'Process Owner':P('110010')},
  sod:[['Auditor','Process Owner'],['Lead Auditor','Process Owner'],['Audit Manager','Process Owner']],
  org:[['O-01','Northwind Group',0,null],['O-02','India',1,'O-01'],['O-03','United Kingdom',1,'O-01'],['O-04','Northwind India Pvt Ltd',2,'O-02'],['O-05','Northwind UK Ltd',2,'O-03'],['O-06','Finance Systems',3,'O-04'],['O-07','Procurement',3,'O-04'],['O-08','HR',3,'O-04'],['O-09','Group Finance',3,'O-05'],['O-10','Customer Operations',3,'O-05'],['O-11','Operations',3,'O-05'],['O-12','Accounts Payable',4,'O-07'],['O-13','Payroll Operations',4,'O-08'],['O-14','Identity and Access',4,'O-06'],['O-15','Financial Reporting',4,'O-09'],['O-16','Customer Support',4,'O-10']].map(([id,n,t,p])=>({id,n,t,p})),
  lk:{'Audit type':L(['Financial','Operational','IT','Compliance']),
      'Finding category':L(['Process design','People and training','Technology','Policy and governance','Third party']),
      'Risk type':L(['Strategic','Operational','Financial','Compliance','Regulatory','IT','Cybersecurity','Fraud','Reputational']),
      'Analysis model':L(['Standard 5x5','Impact-weighted']),
      'Context model':L(['Enterprise ranking','Concentration-aware']),
      'Consequence category':L(['Financial','Operational','Regulatory','Reputational','Customer','Safety']),
      'Function':L(['Finance','Technology','Procurement','People','Legal','Operations']),
      'Location':L(['Mumbai','Delhi','London','Manchester']),
      'Region':L(['APAC','EMEA']),
      'Process':L(['IT general controls','Procure to pay','Financial close','Data governance','Third-party management','HR and payroll']),
      'Sub-process':L(['User provisioning','Supplier onboarding','Invoice processing','Period-end cut-off','Consent management','Payroll run'])},
  cf:[{id:'CF-01',obj:'Finding',l:'Regulatory reference',t:'Text',lk:'',req:0,def:''},{id:'CF-02',obj:'Finding',l:'Root cause category',t:'Dropdown',lk:'Finding category',req:0,def:''},{id:'CF-03',obj:'Engagement',l:'Audit type',t:'Dropdown',lk:'Audit type',req:1,def:''},{id:'CF-04',obj:'Risk',l:'Regulatory driver',t:'Text',lk:'',req:0,def:''},{id:'CF-05',obj:'Risk',l:'Within risk appetite',t:'Boolean',lk:'',req:0,def:''}],
  meth:{t:[15,10,5],ap:10,w:{res:3,last:4,fnd:5,reg:10,mg:5},idp:'RSK-',idd:6,nameMax:120,descMax:2000,sim:60},
  wf:{eng:['CAE'],risk:['Audit Manager','CAE'],plan:['Audit Manager','CAE','Audit Committee'],fnd:['Audit Manager','CAE'],ext:'High'},
  views:[{id:'V-1',n:'High residual risks',q:'',type:'',st:'',rt:'High',own:'',ent:'',cols:['id','n','type','persp','res','st','owner'],gb:'',sort:'res'}]}}
function seed(){
  const risks=[
   mkR('Unauthorized access to ERP',{id:'RSK-000001',desc:'Users retain or gain ERP access beyond their role, allowing unauthorized transactions and data changes.',type:'Cybersecurity',owner:'S. Mehta',persp:{ent:'Northwind India Pvt Ltd',bu:'Finance Systems',dept:'Identity and Access',fn:'Technology',loc:'Mumbai',reg:'APAC',proc:'IT general controls',sub:'User provisioning'},ev:'A leaver or over-privileged user accesses ERP production.',cons:[{cat:'Financial',t:'Fraudulent payments or journal entries'},{cat:'Regulatory',t:'Failure of access control attestations'}],inh:[5,4],res:[3,4],nr:day(-5)}),
   mkR('Duplicate or unapproved supplier payments',{id:'RSK-000002',desc:'Payments are released without valid approval or matching, or the same invoice is paid twice.',type:'Financial',owner:'Head of Payables',persp:{ent:'Northwind India Pvt Ltd',bu:'Procurement',dept:'Accounts Payable',fn:'Finance',loc:'Delhi',reg:'APAC',proc:'Procure to pay',sub:'Invoice processing'},ev:'An invoice is paid without goods receipt or approval.',cons:[{cat:'Financial',t:'Cash loss through overpayment'},{cat:'Reputational',t:'Supplier disputes'}],inh:[4,4],res:[4,4]}),
   mkR('Revenue recognised in wrong period',{id:'RSK-000003',desc:'Cut-off errors move revenue between reporting periods.',type:'Compliance',owner:'Financial Controller',persp:{ent:'Northwind UK Ltd',bu:'Group Finance',dept:'Financial Reporting',fn:'Finance',loc:'London',reg:'EMEA',proc:'Financial close',sub:'Period-end cut-off'},ev:'Revenue is booked before delivery obligations are met.',cons:[{cat:'Regulatory',t:'Restatement of reported results'}],inh:[4,5],res:[2,5],f:{}}),
   mkR('Customer data privacy non-compliance',{id:'RSK-000004',desc:'Personal data is processed without valid consent or retained beyond permitted periods.',type:'Regulatory',owner:'Privacy Officer',persp:{ent:'Northwind UK Ltd',bu:'Customer Operations',dept:'Customer Support',fn:'Legal',loc:'Manchester',reg:'EMEA',proc:'Data governance',sub:'Consent management'},ev:'Customer data is used without a valid legal basis.',cons:[{cat:'Regulatory',t:'Fines and enforcement notices'},{cat:'Customer',t:'Loss of customer trust'}],inh:[4,4],res:[3,3]}),
   mkR('Key vendor outage',{id:'RSK-000005',desc:'A critical vendor fails to deliver a service for an extended period.',type:'Operational',owner:'Head of Operations',persp:{ent:'Northwind UK Ltd',bu:'Operations',dept:'',fn:'Operations',loc:'London',reg:'EMEA',proc:'Third-party management',sub:''},ev:'A critical vendor suffers a multi-day outage.',cons:[{cat:'Operational',t:'Service interruption to customers'}],inh:[3,4],res:[2,3]}),
   mkR('Payroll processing errors',{id:'RSK-000006',desc:'Employees are paid incorrect amounts due to input or calculation errors.',type:'Operational',owner:'HR Manager',persp:{ent:'Northwind India Pvt Ltd',bu:'HR',dept:'Payroll Operations',fn:'People',loc:'Mumbai',reg:'APAC',proc:'HR and payroll',sub:'Payroll run'},ev:'A payroll run contains incorrect pay values.',cons:[{cat:'Financial',t:'Over or under payment of staff'}],inh:[3,3],res:[2,2]})];
  risks.forEach(r=>{r.hist=[{ver:1,d:r.cd,u:'Seed',inh:r.inh,res:r.res,am:r.am,n:'Initial assessment'}];r.cmt=[];
    r.access={owner:'U-01',editors:['U-02'],viewers:['U-03'],reviewers:['U-04'],approvers:['U-05']};r.review=[]});
  risks[0].cmt=[{id:'CM-1',p:null,u:'Priya Nair',d:day(-20)+' 10:00',t:'Leaver process remains the main driver. Review with HR.',h:[]}];
  return{v:DV,me:'U-00',
  risks,
  kris:[{id:'KRI-01',n:'Leavers with active ERP access',r:'RSK-000001',val:14,thr:5,u:'count'},{id:'KRI-02',n:'Payments without goods receipt',r:'RSK-000002',val:22,thr:10,u:'%'},{id:'KRI-03',n:'Consent records unreconciled',r:'RSK-000004',val:4,thr:5,u:'%'}],
  ctrls:[{id:'C-01',n:'Quarterly user access review',r:'RSK-000001',t:'Detective',d:'Effective',e:'Ineffective'},{id:'C-02',n:'Segregation of duties ruleset',r:'RSK-000001',t:'Preventive',d:'Effective',e:'Partial'},{id:'C-03',n:'Three-way match before payment',r:'RSK-000002',t:'Preventive',d:'Effective',e:'Ineffective'},{id:'C-04',n:'Supplier bank-detail change approval',r:'RSK-000002',t:'Preventive',d:'Partial',e:'Partial'},{id:'C-05',n:'Month-end cut-off review',r:'RSK-000003',t:'Detective',d:'Effective',e:'Effective'},{id:'C-06',n:'Consent register reconciliation',r:'RSK-000004',t:'Detective',d:'Partial',e:'Ineffective'},{id:'C-07',n:'Vendor SLA monitoring',r:'RSK-000005',t:'Detective',d:'Effective',e:'Effective'},{id:'C-08',n:'Payroll variance review',r:'RSK-000006',t:'Detective',d:'Effective',e:'Effective'}],
  plan:[{id:'P-01',n:'ERP access management',en:'Finance Systems',r:'RSK-000001',last:1,reg:0,mg:0,eid:'E-02'},{id:'P-02',n:'Procure to pay',en:'Procurement',r:'RSK-000002',last:2,reg:0,mg:1,eid:'E-01'},{id:'P-03',n:'Revenue cut-off',en:'Group Finance',r:'RSK-000003',last:4,reg:1,mg:0},{id:'P-04',n:'Customer data privacy',en:'Customer Operations',r:'RSK-000004',last:5,reg:1,mg:0},{id:'P-05',n:'Vendor management',en:'Operations',r:'RSK-000005',last:3,reg:0,mg:1},{id:'P-06',n:'Payroll',en:'HR',r:'RSK-000006',last:0,reg:0,mg:0,eid:'E-03'}],
  engs:[{id:'E-01',n:'Procure to pay audit',en:'Procurement',r:'RSK-000002',s:'Fieldwork',lead:'A. Rahman',obj:'Confirm payments are valid and approved',sc:'Supplier payments, Jan-Jun',ap:1,x:{'CF-03':'Financial'}},{id:'E-02',n:'ERP access management audit',en:'Finance Systems',r:'RSK-000001',s:'Reporting',lead:'S. Mehta',obj:'Assess joiner-mover-leaver controls',sc:'ERP production users',ap:1,x:{'CF-03':'IT'}},{id:'E-03',n:'Payroll audit',en:'HR',r:'RSK-000006',s:'Closed',lead:'A. Rahman',obj:'Test payroll accuracy',sc:'Monthly payroll runs',ap:0,x:{'CF-03':'Financial'}}],
  finds:[
   mkF('F-01','Payments released without three-way match','E-01','RSK-000002','C-03','Critical','Remediation','Head of Payables',day(-12),['9 of 40 sampled payments had no goods receipt','Policy P-14 requires three-way match','Match override left open to all AP users','Estimated overpayment exposure','Restrict override and add exception report']),
   mkF('F-02','Bank detail changes lack second approval','E-01','RSK-000002','C-04','High','Management Response','','',['6 of 15 changes approved by requester only','Change procedure requires independent approval','Workflow allows self-approval','Fraud risk on supplier master','Enforce dual approval in workflow']),
   mkF('F-03','Leavers keep ERP access beyond 30 days','E-02','RSK-000001','C-01','High','Awaiting Verification','IT Security Lead',day(-3),['14 leavers active 30+ days after exit','Access removed within 5 days of exit','HR feed not integrated','Unauthorized access after exit','Automate leaver feed']),
   mkF('F-04','Segregation of duties conflicts in AP roles','E-02','RSK-000001','C-02','Medium','Remediation','ERP Owner',day(25),['11 users hold create and approve roles','SoD matrix prohibits combination','Roles granted without SoD check','Payment fraud exposure','Remove conflicts and add pre-grant check']),
   mkF('F-05','Test evidence retained inconsistently','E-01','RSK-000002','C-03','Low','Draft','','',['Evidence stored in personal folders','Audit standards require central retention','No shared repository used','Evidence may be lost','Use the central repository']),
   mkF('F-06','Payroll variance review not evidenced','E-03','RSK-000006','C-08','Low','Closed','HR Manager',day(-40),['Review done but sign-off missing','Control requires signed review','Sign-off step not enforced','Weak evidence','Add sign-off step'],'Sign-off added to workflow','Reviewed sign-offs for Q2 and Q3; consistent.')],
  log:[{t:day(0)+' 09:00',u:'System',id:'SYSTEM',m:'Sample data loaded'}],
  setup:seedSetup()}}

/* ---------- store ---------- */
let D=(()=>{try{const x=JSON.parse(localStorage.getItem(KEY));if(x&&x.v===DV)return upgrade(x)}catch(e){}return seed()})();
function upgrade(d){
  const P=x=>Object.fromEntries(MODS.map((m,i)=>[m[0],+x[i]]));
  d.setup.roles=d.setup.roles||{};
  const demoNames={'U-01':['Risk Owner','Owner'],'U-02':['Risk Editor','Editor'],'U-03':['Risk Viewer','Viewer'],'U-04':['Risk Reviewer','Reviewer'],'U-05':['Risk Approver','Approver']};
  d.setup.users.forEach(u=>{const n=demoNames[u.id];if(n&&u.n===n[0])u.n=n[1]});
  const defaults={'Super Admin':P('333333'),Owner:rolePerms(2),Editor:rolePerms(2),Viewer:rolePerms(1),Reviewer:rolePerms(1),Approver:rolePerms(1)};
  Object.entries(defaults).forEach(([r,p])=>{if(!d.setup.roles[r])d.setup.roles[r]=p});
  d.risks.forEach(r=>{r.access=r.access||{owner:'',editors:[],viewers:[],reviewers:[],approvers:[]};r.review=r.review||[];r.wf=r.wf||{editorEditedVersion:r.st==='Draft'?0:r.ver,viewerViewedBy:[]};r.wf.viewerViewedBy=r.wf.viewerViewedBy||[]});
  return d
}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(D))}catch(e){}};
if(D.log.length===1&&D.log[0].u==='System'){if(D.me==='U-00')D.me='U-01';const demo=D.risks.find(r=>r.id==='RSK-000001');if(demo&&demo.st==='Active'){demo.st='Draft';demo.wf={editorEditedVersion:0,viewerViewedBy:[]}}save()}
const meU=()=>D.setup.users.find(u=>u.id===D.me)||D.setup.users[0];
const log=(id,m)=>{D.log.unshift({t:new Date().toISOString().slice(0,16).replace('T',' '),u:meU().n,id,m});save()};
const uid=p=>p+'-'+Math.random().toString(36).slice(2,7);
const nid=(p,a)=>p+'-'+String(a.length+1).padStart(2,'0');
const rkId=()=>{const m=D.setup.meth,mx=D.risks.reduce((a,r)=>Math.max(a,+r.id.replace(/\D/g,'')||0),0);return m.idp+String(mx+1).padStart(m.idd,'0')};
/* permissions */
const permOf=(u,mod)=>Math.max(0,...u.roles.map(r=>(D.setup.roles[r]||{})[mod]||0));
const can=(mod,l)=>meU().on&&permOf(meU(),mod)>=l;
const need=(mod,l,msg)=>{if(can(mod,l))return true;toast(msg||'Your role does not allow this action. Switch the "Acting as" user in the header to try other roles.');return false};
const kids=id=>D.setup.org.filter(o=>o.p===id).flatMap(o=>[o.n,...kids(o.id)]);
const scopeNames=u=>{const o=D.setup.org.find(x=>x.n===u.sc);return o?(o.t===0?null:[o.n,...kids(o.id)]):[]};
const withinScope=(r,u=meU())=>{const s=scopeNames(u);if(s===null)return true;const p=r.persp||{};return [p.ent,p.bu,p.dept].some(v=>v&&s.includes(v))};
const systemAdmin=u=>u.roles.some(r=>r==='Super Admin'||r==='Administrator');
const viewerStepDone=r=>(r.wf?.viewerViewedBy||[]).some(id=>(r.access?.viewers||[]).includes(id));
const workflowRoleOf=u=>WORKFLOW_ROLES.find(r=>u.roles.includes(r))||'';
const recordCan=(r,action,u=meU())=>{
  if(!u||!u.on)return false;
  const scoped=!r||withinScope(r,u),roles=u.roles||[],dedicated=roles.some(x=>RECORD_ROLES.includes(x));
  if(!scoped)return false;
  if(action==='create')return roles.includes('Owner');
  if(!r)return false;
  const a=r.access||{owner:'',editors:[],viewers:[],reviewers:[],approvers:[]};
  const assigned=(role,ids)=>roles.includes(role)&&ids.includes(u.id);
  if(action==='review')return !roles.includes('Owner')&&a.owner!==u.id&&!roles.includes('Approver')&&assigned('Reviewer',a.reviewers||[])&&viewerStepDone(r);
  if(action==='approve')return !roles.includes('Owner')&&a.owner!==u.id&&!roles.includes('Reviewer')&&assigned('Approver',a.approvers||[]);
  if(systemAdmin(u))return ['view','edit','assign','deactivate','reactivate','submit','reassess'].includes(action);
  if(roles.includes('Owner')&&a.owner===u.id)return ['view','edit','assign','deactivate','reactivate','submit','reassess'].includes(action);
  if(assigned('Editor',a.editors||[]))return ['view','edit','submit','reassess'].includes(action);
  if(assigned('Viewer',a.viewers||[])||assigned('Reviewer',a.reviewers||[])||assigned('Approver',a.approvers||[]))return action==='view';
  return !dedicated&&can('risks',action==='view'?1:action==='edit'||action==='submit'||action==='reassess'?2:action==='deactivate'||action==='reactivate'?3:99);
};
const visible=r=>recordCan(r,'view');
const workflowQueueFor=(u=meU())=>{const role=workflowRoleOf(u),R=D.risks.filter(r=>recordCan(r,'view',u)),q={Owner:['Owner tasks',R.filter(r=>r.st==='Draft'&&r.access?.owner===u.id)],Editor:['Drafts to edit',R.filter(r=>r.st==='Draft'&&(r.access?.editors||[]).includes(u.id))],Viewer:['Risks to view',R.filter(r=>r.st==='Pending Review'&&!(r.wf?.viewerViewedBy||[]).includes(u.id))],Reviewer:['Reviews ready',R.filter(r=>r.st==='Pending Review'&&viewerStepDone(r)&&(r.access?.reviewers||[]).includes(u.id))],Approver:['Approvals waiting',R.filter(r=>r.st==='Pending Approval'&&(r.access?.approvers||[]).includes(u.id))]};return role?q[role]:['My workflow',[]]};
/* scoring */
const MODELS={'Standard 5x5':(l,i)=>l*i,'Impact-weighted':(l,i)=>Math.min(25,Math.round(l*i*(i>=4?1.25:1)))};
const sc=(a,m)=>(MODELS[m]||MODELS['Standard 5x5'])(a[0],a[1]);
const lv=s=>{const q=D.setup.meth.t;return s>=q[0]?'Critical':s>=q[1]?'High':s>=q[2]?'Medium':'Low'};
const KC={Critical:'c',High:'h',Medium:'m',Low:'l',Effective:'l',Partial:'m',Ineffective:'c',Overdue:'c',Active:'l',Draft:'n','Pending Review':'m','Pending Approval':'m',Inactive:'n',Approved:'l',Closed:'n',Valid:'l',Warning:'m',Error:'c'};
const pill=t=>`<span class="pill ${KC[t]||''}">${esc(t)}</span>`;
const rk=id=>D.risks.find(x=>x.id===id),ct=id=>D.ctrls.find(x=>x.id===id),en=id=>D.engs.find(x=>x.id===id),fn=id=>D.finds.find(x=>x.id===id);
const rS=r=>sc(r.res,r.am),iS=r=>sc(r.inh,r.am);
const od=f=>f.s==='Remediation'&&f.due&&f.due<TODAY;
const lkv=n=>(D.setup.lk[n]||[]).filter(v=>v.on).map(v=>v.v);
const fld=(l,h,req)=>`<label><span class="${req?'req':''}">${l}</span>${h}</label>`;
const opts=(a,v,blank)=>(blank!==undefined?`<option value="">${blank}`:'')+a.map(x=>`<option ${x===v?'selected':''}>${esc(x)}`).join('');
/* ui helpers */
const openM=(h,w)=>{$('#mb').className='md'+(w?' w':'');$('#mb').innerHTML=h;$('#m').hidden=false};
const closeM=()=>{$('#m').hidden=true};
function toast(m){const e=$('#ts');e.textContent=m;e.hidden=false;clearTimeout(toast.h);toast.h=setTimeout(()=>e.hidden=true,4000)}
const tbl=(h,rows,cls='')=>`<div class=tw><table class="${cls}"><tr>${h.map(x=>`<th>${x}`).join('')}${rows.map(r=>`<tr ${r[0]?`class=k onclick="${r[0]}"`:''}>${r.slice(1).map(c=>`<td>${c}`).join('')}`).join('')}</table></div>`;
const bars=rows=>{const mx=Math.max(1,...rows.map(r=>r[1]));return`<div class=horizontal-bars role=group>${rows.map(([l,n,k,a])=>`<button class="bar ${k}" aria-label="${esc(l)}: ${n}" title="${esc(l)} · ${n}" onclick="${a}"><span class=bar-label>${esc(l)}</span><span class=bar-track><span class=bar-fill style="width:${n*100/mx}%"></span></span><b>${n}</b></button>`).join('')}</div>`};
const csvOut=(name,rows)=>{const t=rows.map(r=>r.map(c=>`"${String(c??'').replace(/"/g,'""')}"`).join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/csv'}));a.download=name;a.click()};
/* custom fields (flexfields) */
const cfs=o=>D.setup.cf.filter(c=>c.obj===o);
const cfIn=(o,x={},h='',dis='')=>cfs(o).map(c=>{
  const v=x[c.id]!==undefined?x[c.id]:(c.def||''),a=`id=cf_${c.id} ${dis} ${h?`onchange="${h}'${c.id}',cfRead(this))"`:''}`;let el;
  if(c.t==='Dropdown')el=`<select ${a}><option value="">Select${(D.setup.lk[c.lk]||[]).filter(q=>q.on||q.v===v).map(q=>`<option ${q.v===v?'selected':''}>${esc(q.v)}`).join('')}</select>`;
  else if(c.t==='Multi-select'){const sel=String(v).split(';');el=`<select multiple ${a}>${(D.setup.lk[c.lk]||[]).filter(q=>q.on).map(q=>`<option ${sel.includes(q.v)?'selected':''}>${esc(q.v)}`).join('')}</select>`}
  else if(c.t==='Boolean')el=`<select ${a}><option value="">Not set<option ${v==='Yes'?'selected':''}>Yes<option ${v==='No'?'selected':''}>No</select>`;
  else if(c.t==='Long text')el=`<textarea ${a}>${esc(v)}</textarea>`;
  else el=`<input ${a} type=${c.t==='Number'?'number':c.t==='Date'?'date':'text'} value="${esc(v)}">`;
  return fld(esc(c.l),el,c.req)}).join('');
const cfRead=e=>e.multiple?[...e.selectedOptions].map(o=>o.value).join(';'):e.value.trim();
const cfGet=o=>Object.fromEntries(cfs(o).map(c=>[c.id,cfRead($('#cf_'+c.id))]));
const cfMiss=(o,x)=>cfs(o).some(c=>c.req&&!String(x[c.id]||'').trim());
/* notifications (assessment, approval, overdue, escalation) */
function notes(){const n=[],u=meU();
  D.risks.filter(r=>recordCan(r,'view')&&r.st==='Pending Review'&&((r.access&&r.access.viewers)||[]).includes(u.id)&&!(r.wf?.viewerViewedBy||[]).includes(u.id)).forEach(r=>n.push(['Viewer read',`${r.id} ${r.n} is ready for your read step.`,`risk.html?id=${r.id}`]));
  D.risks.filter(r=>recordCan(r,'view')&&r.st==='Pending Review'&&viewerStepDone(r)&&((r.access&&r.access.reviewers)||[]).includes(u.id)).forEach(r=>n.push(['Review',`${r.id} ${r.n} awaits your review.`,`risk.html?id=${r.id}`]));
  D.risks.filter(r=>recordCan(r,'view')&&r.st==='Pending Approval'&&((r.access&&r.access.approvers)||[]).includes(u.id)).forEach(r=>n.push(['Approval',`${r.id} ${r.n} awaits your approval.`,`risk.html?id=${r.id}`]));
  D.risks.filter(r=>recordCan(r,'view')&&r.st==='Active'&&r.nr<TODAY).forEach(r=>n.push(['Assessment due',`${r.id} reassessment was due ${r.nr}.`,`risk.html?id=${r.id}`]));
  D.finds.filter(f=>od(f)&&recordCan(rk(f.r),'view')).forEach(f=>n.push([f.sv==='Critical'||f.sv==='High'?'Escalation':'Overdue',`${f.id} action overdue since ${f.due} (${f.sv}).`,'findings.html']));
  D.kris.filter(k=>k.val>k.thr&&recordCan(rk(k.r),'view')).forEach(k=>n.push(['KRI breach',`${k.n}: ${k.val} against threshold ${k.thr}.`,`risk.html?id=${k.r}`]));return n}
const showNotes=()=>{const n=notes();openM(`<h2>Notifications</h2><p class=sub>Assessment, approval, overdue and escalation alerts for ${esc(meU().n)}.</p>${n.length?tbl(['Type','Message'],n.map(x=>[`location='${x[2]}'`,pill(x[0]==='Escalation'||x[0]==='KRI breach'?'Critical':'Medium').replace(/>[^<]*</,'>'+x[0]+'<'),esc(x[1])])):'<p class=sub>Nothing needs attention.</p>'}<div class=act><button class="btn g" onclick=closeM()>Close</button></div>`)};

/* ---------- shell ---------- */
const V={};let cur='dash';
const NAVKEY={risk:'risks','risk-form':'risks'};
const navSections=()=>{const role=workflowRoleOf(meU()),q=workflowQueueFor(),isAdmin=systemAdmin(meU()),recordUser=!!role,base=[['Overview',[['dash','Dashboard','index.html','📊']]],['My Investigations',recordUser||isAdmin?[['workflow',`My Investigations${q[1].length?` · ${q[1].length}`:''}`,'workflow.html','🧭',q[1].length||'']]:[]],['Risk and assurance',[['risks','Risk register','risks.html','⚠️'],['ctrls','Control library','controls.html','🛡️'],['plan','Audit plan','plan.html','🗓️'],['engs','Engagements','engagements.html','📁'],['finds','Findings and actions','findings.html','🔎']]],['Administration',[['import','Import users','import-users.html','⬆️','START HERE'],['users','Users','users.html','👥'],['setup','Setup','setup.html','⚙️'],['trail','Audit trail','audit-trail.html','📜']]]];return base.map(([h,items])=>[h,items.filter(([k])=>{if(isAdmin)return true;if(recordUser)return k!=='setup';return k==='dash'||k==='trail'||(['risks','ctrls','plan','engs','finds'].includes(k)?can(k==='risks'?'risks':k,1):can('setup',1))})]).filter(([,items])=>items.length)};
function shell(){
  $('#shell').innerHTML=`<div class=app><aside class=side><div class=brand><b>On<i>Track</i></b><small>Audit management platform</small><span class=eng>Assurance engine active</span></div>
  <nav class=nav id=nav-list></nav>
  <div class=sfoot><div class=me><span class=av>${esc(meU().n.split(' ').map(w=>w[0]).join('').slice(0,2))}</span><div><b>${esc(meU().n)}</b><small>${esc(meU().roles.join(', '))}</small></div></div></div></aside>
  <div class=main><header class=hdr><div><h1 id=pt></h1><p id=ps></p></div><div class=chips id=hc></div></header><div class=content id=mn></div></div></div>
  <div class=ov id=m hidden onclick="if(event.target.id==='m')closeM()"><div class=md id=mb role=dialog></div></div><div id=ts hidden></div>`}
function render(){
  const v=V[cur]();const nn=notes().length;
  $('#nav-list').innerHTML=navSections().map(([h,l])=>`<h6>${h}</h6>`+l.map(([k,t,href,ic,tag])=>`<a href="${href}" class="${(NAVKEY[cur]||cur)===k?'on':''}"><span class=ic>${ic}</span>${t}${tag?`<span class=tag>${tag}</span>`:''}</a>`).join('')).join('');
  $('#pt').textContent=v.t;$('#ps').textContent=v.s||'';
  $('#hc').innerHTML=`<span class="chip red">Acting as <select aria-label="Acting as" onchange="actAs(this.value)">${D.setup.users.filter(u=>u.on).map(u=>`<option value=${u.id} ${u.id===D.me?'selected':''}>${esc(u.n)}</option>`).join('')}</select></span><button class="chip bell" onclick=showNotes() aria-label="Notifications">🔔 <b>${nn}</b></button><span class="chip ok">Audit engine connected</span>`;
  $('#mn').innerHTML=v.m&&!can(v.m,1)?`<div class=card><h3>Access restricted</h3><p class=sub>Your role (${esc(meU().roles.join(', '))}) has no access to ${esc(v.t)}. Use the "Acting as" selector to switch user.</p></div>`:v.h;
  if(v.after)v.after()}
const actAs=id=>{D.me=id;save();if(V[cur].onUser)V[cur].onUser();render();shell_keep()};
const shell_keep=()=>{$$('.nav a').forEach(()=>0);const me=meU();const m=$('.me');if(m)m.innerHTML=`<span class=av>${esc(me.n.split(' ').map(w=>w[0]).join('').slice(0,2))}</span><div><b>${esc(me.n)}</b><small>${esc(me.roles.join(', '))}</small></div>`};
function start(key){cur=key;shell();render()}
/* simple CSV parser (quotes, commas, newlines) */
function parseCSV(t){const rows=[];let r=[],c='',q=false;t=t.replace(/^\uFEFF/,'');
  for(let i=0;i<t.length;i++){const ch=t[i];
    if(q){if(ch==='"'){if(t[i+1]==='"'){c+='"';i++}else q=false}else c+=ch}
    else if(ch==='"')q=true;else if(ch===','){r.push(c);c=''}
    else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&t[i+1]==='\n')i++;r.push(c);c='';if(r.some(x=>x.trim()))rows.push(r);r=[]}
    else c+=ch}
  if(c||r.length){r.push(c);if(r.some(x=>x.trim()))rows.push(r)}return rows}
