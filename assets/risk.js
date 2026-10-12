/* Risk register, add/edit risk, risk profile */
const QS=()=>new URLSearchParams(location.search);
const COLS={id:['Risk ID',r=>`<span class=mono>${r.id}</span>`],n:['Risk',r=>`<b>${esc(r.n)}</b>`],type:['Type',r=>esc(r.type)],
 persp:['Entity / business unit',r=>esc([r.persp.ent,r.persp.bu].filter(Boolean).join(' / '))||'-'],proc:['Process',r=>esc(r.persp.proc)||'-'],owner:['Owner',r=>esc(r.owner)||'-'],
 inh:['Inherent',r=>pill(lv(iS(r)))+' '+iS(r)],res:['Residual',r=>pill(lv(rS(r)))+' '+rS(r)],ctx:['Context priority',r=>ctxScore(r)],
 st:['Status',r=>pill(r.st)],nr:['Next assessment',r=>r.nr+(r.st==='Active'&&r.nr<TODAY?' '+pill('Overdue'):'')],cd:['Created',r=>r.cd],ver:['Version',r=>'v'+r.ver]};
const openF=r=>D.finds.filter(f=>f.r===r.id&&f.s!=='Closed').length;
const ctxScore=r=>{let s=rS(r)+2*openF(r)+D.ctrls.filter(c=>c.r===r.id&&c.e==='Ineffective').length+2*D.kris.filter(k=>k.r===r.id&&k.val>k.thr).length;
  if(r.cx==='Concentration-aware')s+=2*(D.risks.filter(x=>x.id!==r.id&&x.st==='Active'&&x.persp.proc&&x.persp.proc===r.persp.proc).length);return s};
const flat=r=>[r.id,r.n,r.desc,r.owner,r.ev,r.type,...r.cons.map(c=>c.t),...Object.values(r.persp),...Object.values(r.f||{})].join(' ').toLowerCase();
let RL={q:'',type:'',st:'',rt:'',own:'',ent:'',from:'',to:'',adv:0,cols:['id','n','type','persp','res','ctx','st','owner'],gb:'',sort:'id',view:'',pick:0};
const sortKey={id:r=>r.id,n:r=>r.n.toLowerCase(),res:r=>-rS(r),inh:r=>-iS(r),ctx:r=>-ctxScore(r),nr:r=>r.nr,st:r=>r.st};
function filtered(){return D.risks.filter(visible).filter(r=>(!RL.q||flat(r).includes(RL.q.toLowerCase()))&&(!RL.type||r.type===RL.type)&&(!RL.st||r.st===RL.st)&&(!RL.rt||lv(rS(r))===RL.rt)&&(!RL.own||r.owner===RL.own)&&(!RL.ent||r.persp.ent===RL.ent||r.persp.bu===RL.ent||r.persp.dept===RL.ent)&&(!RL.from||r.cd>=RL.from)&&(!RL.to||r.cd<=RL.to))
  .sort((a,b)=>{const k=sortKey[RL.sort]||sortKey.id,x=k(a),y=k(b);return x<y?-1:x>y?1:0})}
const groupOf=r=>RL.gb==='type'?r.type:RL.gb==='st'?r.st:RL.gb==='rating'?lv(rS(r)):RL.gb==='ent'?(r.persp.ent||'No entity'):'';
V.risks=()=>{const L=filtered(),owners=[...new Set(D.risks.map(r=>r.owner).filter(Boolean))],ents=D.setup.org.filter(o=>o.t>=2).map(o=>o.n),
 sel=(k,a,b)=>`<select aria-label="${b}" onchange="RL.${k}=this.value;render()"><option value="">${b}${a.map(x=>`<option ${x===RL[k]?'selected':''}>${esc(x)}`).join('')}</select>`;
 const prof=['Critical','High','Medium','Low'].map(s=>`<span><i class="dot ${KC[s]}"></i>${s} <b>${L.filter(r=>lv(rS(r))===s).length}</b></span>`).join('');
 let body='',last=null;
 L.forEach(r=>{const g=groupOf(r);if(RL.gb&&g!==last){body+=`<tr><td colspan=${RL.cols.length+1} style="background:#F6F7FB;font-weight:700">${esc(g)}`;last=g}
  body+=`<tr class=k onclick="location='risk.html?id=${r.id}'">${RL.cols.map(c=>`<td>${COLS[c][1](r)}`).join('')}<td onclick="event.stopPropagation()" style="white-space:nowrap"><a class="btn g s" href="risk-form.html?id=${r.id}">Edit</a> <a class="btn g s" href="risk-form.html?copy=${r.id}">Duplicate</a>`});
 return{t:'Risk register',s:'Central register of enterprise risks. Search, filter, group and save views.',m:'risks',h:`
 <div class=kpis>${[['Active risks',D.risks.filter(r=>r.st==='Active').length,'k-g'],['Pending approval',D.risks.filter(r=>r.st==='Pending Approval').length,'k-a'],['High or critical residual',D.risks.filter(r=>r.st!=='Inactive'&&['High','Critical'].includes(lv(rS(r)))).length,'k-r'],['Assessments overdue',D.risks.filter(r=>r.st==='Active'&&r.nr<TODAY).length,'k-i']].map(([l,n,c])=>`<div class="kpi ${c}"><span>${l}</span><b>${n}</b></div>`).join('')}</div>
 <div class=card><div class=tb><input class=grow placeholder="Search risk name, ID, description, owner, event or organization" value="${esc(RL.q)}" oninput="RL.q=this.value;clearTimeout(RL.h);RL.h=setTimeout(()=>{render();const i=$('.grow');i.focus();i.setSelectionRange(1e4,1e4)},300)">
  ${sel('type',lkv('Risk type'),'All risk types')}${sel('st',['Draft','Pending Approval','Active','Inactive'],'All statuses')}${sel('rt',SV,'All ratings')}
  <button class="btn g" onclick="RL.adv=!RL.adv;render()">Advanced search</button>
  <a class=btn href="risk-form.html" onclick="return need('risks',2)">+ Add risk</a></div>
 ${RL.adv?`<div class=tb>${sel('own',owners,'All owners')}${sel('ent',ents,'All organization units')}<label class=inl>Created from <input type=date value="${RL.from}" onchange="RL.from=this.value;render()"></label><label class=inl>to <input type=date value="${RL.to}" onchange="RL.to=this.value;render()"></label><button class="btn g s" onclick="RL={...RL,q:'',type:'',st:'',rt:'',own:'',ent:'',from:'',to:'',view:''};render()">Clear filters</button></div>`:''}
 <div class=tb><select aria-label="Saved views" onchange="applyView(this.value)"><option value="">Saved views${D.setup.views.map(v=>`<option value=${v.id} ${v.id===RL.view?'selected':''}>${esc(v.n)}`).join('')}</select>
  <button class="btn g s" onclick=saveView()>Save current view</button>
  <select aria-label="Group by" onchange="RL.gb=this.value;render()"><option value="">No grouping<option value=type ${RL.gb==='type'?'selected':''}>Group by type<option value=st ${RL.gb==='st'?'selected':''}>Group by status<option value=rating ${RL.gb==='rating'?'selected':''}>Group by residual rating<option value=ent ${RL.gb==='ent'?'selected':''}>Group by legal entity</select>
  <select aria-label="Sort" onchange="RL.sort=this.value;render()">${[['id','Sort: ID'],['n','Sort: name'],['res','Sort: residual (high first)'],['inh','Sort: inherent'],['ctx','Sort: context priority'],['nr','Sort: next assessment'],['st','Sort: status']].map(([k,l])=>`<option value=${k} ${RL.sort===k?'selected':''}>${l}`).join('')}</select>
  <span class=menu><button class="btn g s" onclick="RL.pick=!RL.pick;render()">Columns</button>${RL.pick?`<div class=pop>${[...RL.cols,...Object.keys(COLS).filter(c=>!RL.cols.includes(c))].map(c=>`<label class=inl><input type=checkbox ${RL.cols.includes(c)?'checked':''} onchange="togCol('${c}')"> ${COLS[c][0]} ${RL.cols.includes(c)?`<button class="btn g s" onclick="event.preventDefault();mvCol('${c}',-1)">▲</button><button class="btn g s" onclick="event.preventDefault();mvCol('${c}',1)">▼</button>`:''}</label>`).join('')}</div>`:''}</span>
  <button class="btn g s" onclick="exportRisks()">Export CSV</button></div></div>
 <div class=prof><b style="font-family:inherit">Residual profile</b>${prof}</div>
 <p class=cnt>Showing <b>${L.length}</b> of ${D.risks.length} risks. Your data scope: ${esc(meU().sc||'none')}.</p>
 ${L.length?`<div class=tw><table><tr>${RL.cols.map(c=>`<th>${COLS[c][0]}`).join('')}<th>Actions${body}</table></div>`:'<div class=card><h3>No risks match</h3><p class=sub>Clear a filter or add a risk to the register.</p></div>'}`}};
const togCol=c=>{RL.cols=RL.cols.includes(c)?RL.cols.filter(x=>x!==c):[...RL.cols,c];render()};
const mvCol=(c,d)=>{const i=RL.cols.indexOf(c),j=i+d;if(j<0||j>=RL.cols.length)return;[RL.cols[i],RL.cols[j]]=[RL.cols[j],RL.cols[i]];render()};
const applyView=id=>{const v=D.setup.views.find(x=>x.id===id);if(!v){RL.view='';return render()}RL={...RL,q:v.q,type:v.type,st:v.st,rt:v.rt,own:v.own,ent:v.ent,cols:[...v.cols],gb:v.gb,sort:v.sort,view:id};render()};
const saveView=()=>openM(`<h2>Save view</h2><p class=sub>Saves the current search, filters, columns, sorting and grouping.</p>${fld('View name','<input id=vw_n>',1)}<div class=act><button class="btn g" onclick=closeM()>Cancel</button><button class=btn onclick=saveViewGo()>Save view</button></div>`);
const saveViewGo=()=>{const n=$('#vw_n').value.trim();if(!n)return toast('Enter a view name.');const v={id:uid('V'),n,q:RL.q,type:RL.type,st:RL.st,rt:RL.rt,own:RL.own,ent:RL.ent,cols:[...RL.cols],gb:RL.gb,sort:RL.sort};D.setup.views.push(v);RL.view=v.id;log(v.id,`Saved view "${n}" created`);closeM();render();toast('View saved')};
const exportRisks=()=>csvOut('risk-register.csv',[['Risk ID','Name','Type','Status','Owner','Entity','Business unit','Department','Process','Inherent','Residual','Next assessment'],...filtered().map(r=>[r.id,r.n,r.type,r.st,r.owner,r.persp.ent,r.persp.bu,r.persp.dept,r.persp.proc,iS(r),rS(r),r.nr])]);

/* ---------- add / edit risk ---------- */
let RF=null,RFE=null,RFC=null;
const blankR=()=>mkR('',{id:'',st:'Draft',cx:lkv('Context model')[0]||'',am:lkv('Analysis model')[0]||'',type:'',owner:'',persp:{},cons:[{cat:'',t:''}],inh:[3,3],res:[2,2],nr:day(180),f:{},cmt:[],hist:[],cd:TODAY});
function initRF(){if(RF)return;const q=QS(),e=q.get('id'),c=q.get('copy');RFE=e;RFC=c;
  if(e&&rk(e)){RF=JSON.parse(JSON.stringify(rk(e)))}
  else if(c&&rk(c)){RF=JSON.parse(JSON.stringify(rk(c)));RF.id='';RF.n=RF.n+' (copy)';RF.st='Draft';RF.ap=0;RF.ver=1;RF.hist=[];RF.cmt=[];RF.cd=TODAY;RF.nr=day(180)}
  else{RF=blankR();cfs('Risk').forEach(c=>{if(c.def)RF.f[c.id]=c.def})}RF.init='';
  RF.snap=JSON.stringify([RF.n,RF.desc,RF.type,RF.am,RF.cx,RF.ev,RF.cons,RF.inh,RF.res,RF.persp])}
const kidsOf=(t,pn)=>{const O=D.setup.org,p=O.find(o=>o.n===pn&&o.t===t-1);return(p?O.filter(o=>o.p===p.id):O.filter(o=>o.t===t)).map(o=>o.n)};
const rfSet=(k,v,re)=>{RF[k]=v;if(re)render()};
const rfP=(k,v)=>{RF.persp[k]=v;if(k==='ent'){RF.persp.bu='';RF.persp.dept=''}if(k==='bu')RF.persp.dept='';render()};
const rfA=(i,j,v)=>{RF[i][j]=+v;render()};
const rfC=(i,k,v)=>{RF.cons[i][k]=v};
function simWarn(){const m=D.setup.meth,w=new Set(RF.n.toLowerCase().split(/\W+/).filter(x=>x.length>3));if(!w.size)return'';
  const hit=D.risks.filter(r=>r.st!=='Inactive'&&r.id!==RFE&&(()=>{const o=new Set(r.n.toLowerCase().split(/\W+/).filter(x=>x.length>3));const i=[...w].filter(x=>o.has(x)).length;return i*100/Math.max(w.size,o.size)>=m.sim})());
  return hit.length?`<div class=warn>Similar active risk: ${hit.map(r=>`<a href="risk.html?id=${r.id}" target=_blank>${r.id} ${esc(r.n)}</a>`).join(', ')}. Check it is not a duplicate before saving.</div>`:''}
const rfName=v=>{RF.n=v;$('#sim').innerHTML=simWarn();$('#nc').textContent=v.length+' / '+D.setup.meth.nameMax};
V['risk-form']=()=>{initRF();const e=RFE&&rk(RFE),m=D.setup.meth,P=RF.persp,u=D.setup.users.filter(x=>x.on).map(x=>x.n);
 const lock=e&&(e.st==='Inactive'||e.st==='Pending Approval');
 const ls=(i,j)=>`<select ${lock?'disabled':''} onchange="rfA('${i}',${j},this.value)">${[1,2,3,4,5].map(n=>`<option ${RF[i][j]===n?'selected':''}>${n}`).join('')}</select>`;
 const ps=(k,l,a)=>fld(l,`<select ${lock?'disabled':''} onchange="rfP('${k}',this.value)"><option value="">Select${a.map(x=>`<option ${x===P[k]?'selected':''}>${esc(x)}`).join('')}</select>`);
 const dis=lock?'disabled':'';
 return{t:e?`Edit risk ${e.id}`:RFC?'Duplicate risk':'Add risk',s:'Fields marked * are required. Scores are calculated by the analysis model and cannot be overridden.',m:'risks',h:`
 <p class=crumb><a href="risks.html">Risk register</a> &rsaquo; ${e?`<a href="risk.html?id=${e.id}">${e.id}</a> &rsaquo; Edit`:'Add risk'}</p>
 ${lock?`<div class=err>This risk is ${e.st==='Inactive'?'inactive':'locked while approval is in progress'}, so it cannot be edited. ${e.st==='Inactive'?'Reactivate it from the risk profile first.':'Send it back from the risk profile to edit.'}</div>`:''}
 ${e&&e.st==='Active'?`<div class=warn>Changing the name, description, type, models, event, consequences or assessment sends this risk back for approval as a new version (v${e.ver+1}).</div>`:''}
 <div class=card><h3>General</h3><p class=sub>Core risk details.</p>
  <div class=two>${fld('System record ID',`<input disabled value="${e?e.id:'Assigned on save, next: '+rkId()}">`)+fld('Risk owner',`<select ${dis} onchange="rfSet('owner',this.value)"><option value="">Select owner${u.map(x=>`<option ${x===RF.owner?'selected':''}>${esc(x)}`).join('')}</select>`)}</div>
  ${fld('Risk name',`<input ${dis} maxlength=${m.nameMax} value="${esc(RF.n)}" oninput="rfName(this.value)"><span class=help id=nc>${RF.n.length} / ${m.nameMax}</span>`,1)}<div id=sim>${simWarn()}</div>
  ${fld('Risk description',`<textarea ${dis} maxlength=${m.descMax} style="min-height:110px" oninput="RF.desc=this.value;$('#dc').textContent=this.value.length+' / ${m.descMax}'">${esc(RF.desc)}</textarea><span class=help id=dc>${RF.desc.length} / ${m.descMax}</span>`,1)}
  <div class=three>${fld('Risk type',`<select ${dis} onchange="rfSet('type',this.value)"><option value="">Select type${lkv('Risk type').map(x=>`<option ${x===RF.type?'selected':''}>${esc(x)}`).join('')}</select>`,1)}
  ${fld('Analysis model',`<select ${dis} onchange="rfSet('am',this.value,1)"><option value="">Select${lkv('Analysis model').map(x=>`<option ${x===RF.am?'selected':''}>${esc(x)}`).join('')}</select>`,1)}
  ${fld('Context model',`<select ${dis} onchange="rfSet('cx',this.value)"><option value="">Select${lkv('Context model').map(x=>`<option ${x===RF.cx?'selected':''}>${esc(x)}`).join('')}</select>`,1)}</div></div>
 <div class=card><h3>Perspectives and organization</h3><p class=sub>Selecting a legal entity filters the business units, and a business unit filters its departments. Used for reporting, security, ownership and audit planning.</p>
  <div class=three>${ps('ent','Legal entity',kidsOf(2,''))}${ps('bu','Business unit',kidsOf(3,P.ent))}${ps('dept','Department',kidsOf(4,P.bu))}</div>
  <div class=four>${ps('fn','Function',lkv('Function'))}${ps('loc','Location',lkv('Location'))}${ps('reg','Region',lkv('Region'))}${ps('proc','Process',lkv('Process'))}</div><div class=three>${ps('sub','Sub-process',lkv('Sub-process'))}</div></div>
 <div class=card><h3>Event and consequences</h3><p class=sub>Describe what could happen separately from what it would cause. These feed assessment, reports and audit planning.</p>
  ${fld('Risk event: what could happen',`<textarea ${dis} oninput="RF.ev=this.value">${esc(RF.ev)}</textarea>`,1)}
  ${RF.cons.map((c,i)=>`<div class=row style="align-items:flex-start"><select ${dis} style="width:180px" onchange="rfC(${i},'cat',this.value)"><option value="">Category${lkv('Consequence category').map(x=>`<option ${x===c.cat?'selected':''}>${esc(x)}`).join('')}</select><input ${dis} style="flex:1;min-width:200px;width:auto" placeholder="Consequence if the event occurs" value="${esc(c.t)}" oninput="rfC(${i},'t',this.value)">${RF.cons.length>1&&!lock?`<button class="btn g s" onclick="RF.cons.splice(${i},1);render()">Remove</button>`:''}</div>`).join('')}
  ${lock?'':`<button class="btn g s" onclick="RF.cons.push({cat:'',t:''});render()">+ Add consequence</button>`}</div>
 <div class=card><h3>Assessment</h3><p class=sub>Model: ${esc(RF.am||'not selected')}. Likelihood and impact are 1 to 5. Score and rating are calculated.</p>
  <div class=two><div><h4 style="margin:0 0 8px">Inherent risk</h4><div class=two>${fld('Likelihood',ls('inh',0))}${fld('Impact',ls('inh',1))}</div><p>Score <b class=mono>${iS(RF)}</b> ${pill(lv(iS(RF)))}</p></div>
  <div><h4 style="margin:0 0 8px">Residual risk</h4><div class=two>${fld('Likelihood',ls('res',0))}${fld('Impact',ls('res',1))}</div><p>Score <b class=mono>${rS(RF)}</b> ${pill(lv(rS(RF)))}</p></div></div>
  <div class=two>${fld('Next assessment due',`<input type=date ${dis} value="${RF.nr}" onchange="RF.nr=this.value">`)}</div></div>
 ${cfs('Risk').length?`<div class=card><h3>Additional fields</h3><p class=sub>Configured by administrators in Setup.</p>${cfIn('Risk',RF.f,"RF.f[",dis).replace(/onchange="RF\.f\[('CF-[^']+'),cfRead\(this\)\)"/g,"onchange=\"RF.f[$1]=cfRead(this)\"")}</div>`:''}
 ${!e?`<div class=card><h3>Comment</h3><p class=sub>Optional context for reviewers. It is stored separately from the description.</p><textarea oninput="RF.init=this.value"></textarea></div>`:''}
 <div class=act><a class="btn g" href="${e?'risk.html?id='+e.id:'risks.html'}">Cancel</a><button class=btn ${dis} onclick=saveRisk()>${e?'Save changes':'Save as draft'}</button></div>`}};
function saveRisk(){if(!need('risks',2))return;const m=D.setup.meth,R=RF,e=RFE&&rk(RFE),er=[];
  if(!R.n.trim())er.push('Risk name');if(!R.desc.trim())er.push('Risk description');if(!R.type)er.push('Risk type');if(!R.am)er.push('Analysis model');if(!R.cx)er.push('Context model');if(!R.ev.trim())er.push('Risk event');
  if(!R.cons.some(c=>c.t.trim()&&c.cat))er.push('at least one consequence with a category');
  if(!(R.persp.ent||R.persp.bu||R.persp.dept))er.push('an organization perspective');
  if(cfMiss('Risk',R.f))er.push('required additional fields');
  if(er.length)return toast('Complete: '+er.join(', ')+'.');
  if(rS(R)>iS(R))return toast('Residual score cannot exceed inherent score.');
  R.cons=R.cons.filter(c=>c.t.trim());R.n=R.n.trim();
  const snap=JSON.stringify([R.n,R.desc,R.type,R.am,R.cx,R.ev,R.cons,R.inh,R.res,R.persp]),mat=snap!==R.snap;
  const clean=o=>{delete o.snap;delete o.init};
  if(!e){const r=JSON.parse(JSON.stringify(R));r.id=rkId();r.st='Draft';r.ver=1;r.cd=TODAY;r.ap=0;r.hist=[{ver:1,d:TODAY,u:meU().n,inh:r.inh,res:r.res,am:r.am,n:'Initial assessment'}];r.cmt=R.init.trim()?[{id:uid('CM'),p:null,u:meU().n,d:new Date().toISOString().slice(0,16).replace('T',' '),t:R.init.trim(),h:[]}]:[];clean(r);D.risks.push(r);log(r.id,`Risk created as draft${RFC?' (copied from '+RFC+')':''}`);RF=null;location='risk.html?id='+r.id;return}
  const old=JSON.stringify([e.inh,e.res,e.am]);Object.assign(e,JSON.parse(JSON.stringify(R)));clean(e);
  if(JSON.stringify([e.inh,e.res,e.am])!==old){e.hist.push({ver:e.ver+(e.st==='Active'&&mat?1:0),d:TODAY,u:meU().n,inh:e.inh,res:e.res,am:e.am,n:'Assessment changed in edit'})}
  if(e.st==='Active'&&mat){e.ver++;e.st='Pending Approval';e.ap=0;log(e.id,`Risk edited, new version v${e.ver} sent for approval`)}else log(e.id,'Risk edited');
  RF=null;location='risk.html?id='+e.id}

/* ---------- risk profile ---------- */
let rtab='ov';
V.risk=()=>{const r=rk(QS().get('id'));if(!r)return{t:'Risk not found',s:'',m:'risks',h:'<div class=card><h3>No such risk</h3><p class=sub><a href="risks.html">Return to the risk register</a></p></div>'};
 if(!visible(r))return{t:r.id,s:'',m:'risks',h:'<div class=card><h3>Outside your data scope</h3><p class=sub>This risk belongs to an organization unit you cannot see.</p></div>'};
 const W=D.setup.wf.risk,role=W[r.ap],u=meU(),canAp=r.st==='Pending Approval'&&role&&u.roles.includes(role)&&can('risks',3);
 const tabs=[['ov','Overview'],['as','Assessment and history'],['rel','Relationships'],['cm','Comments'],['au','Audit trail']];
 const acts=`<div class=row><span>${pill(r.st)} ${pill(lv(rS(r)))} <span class=mono>v${r.ver}</span></span><span style="flex:1"></span>
  ${r.st!=='Inactive'&&r.st!=='Pending Approval'?`<a class="btn g s" href="risk-form.html?id=${r.id}">Edit</a>`:''}<a class="btn g s" href="risk-form.html?copy=${r.id}">Duplicate</a>
  ${r.st==='Active'?`<button class="btn g s" onclick="reassess('${r.id}')">Reassess</button>`:''}
  ${r.st==='Draft'?`<button class="btn s" onclick="submitR('${r.id}')">Submit for approval</button>`:''}
  ${canAp?`<button class="btn s" onclick="approveR('${r.id}')">Approve as ${esc(role)}</button><button class="btn g s" onclick="rejectR('${r.id}')">Send back</button>`:''}
  ${r.st==='Inactive'?`<button class="btn g s" onclick="reactR('${r.id}')">Reactivate</button>`:r.st!=='Pending Approval'?`<button class="btn g s" onclick="deactR('${r.id}')">Deactivate</button>`:''}</div>
  ${r.st==='Pending Approval'?`<p class=chain>Approval level ${r.ap+1} of ${W.length}: waiting for ${esc(role||'')}.</p>`:''}`;
 const dl=a=>`<dl>${a.map(([k,v])=>`<dt>${k}<dd>${v||'-'}`).join('')}</dl>`;const P=r.persp;let b='';
 if(rtab==='ov')b=`<div class=cards-split><div class=card><h3>Risk details</h3>${dl([['Description',esc(r.desc)],['Risk event',esc(r.ev)],['Type',esc(r.type)],['Owner',esc(r.owner)],['Analysis model',esc(r.am)],['Context model',esc(r.cx)+' (priority '+ctxScore(r)+')'],['Created',r.cd],['Next assessment',r.nr]])}
  <div class=sec><h4>Consequences</h4>${tbl(['Category','Consequence'],r.cons.map(c=>['',esc(c.cat),esc(c.t)]),'lt')}</div></div>
  <div><div class=card><h3>Organization</h3>${dl([['Legal entity',esc(P.ent)],['Business unit',esc(P.bu)],['Department',esc(P.dept)],['Function',esc(P.fn)],['Location',esc(P.loc)],['Region',esc(P.reg)],['Process',esc(P.proc)],['Sub-process',esc(P.sub)]])}</div>
  ${cfs('Risk').length?`<div class=card><h3>Additional fields</h3>${dl(cfs('Risk').map(c=>[esc(c.l),esc((r.f||{})[c.id])]))}</div>`:''}</div></div>`;
 if(rtab==='as')b=`<div class=cards-split><div class=card><h3>Current assessment</h3><p class=sub>${esc(r.am)}</p><div class=two><div><b>Inherent</b><p>L ${r.inh[0]} x I ${r.inh[1]} = <b class=mono>${iS(r)}</b> ${pill(lv(iS(r)))}</p></div><div><b>Residual</b><p>L ${r.res[0]} x I ${r.res[1]} = <b class=mono>${rS(r)}</b> ${pill(lv(rS(r)))}</p></div></div></div>
  <div class=card><h3>Version history</h3><p class=sub>Every assessment version is retained.</p>${tbl(['Version','Date','By','Inherent','Residual','Note'],r.hist.slice().reverse().map(h=>['','v'+h.ver,h.d,esc(h.u),sc(h.inh,h.am),sc(h.res,h.am),esc(h.n)]),'lt')}</div></div>`;
 if(rtab==='rel'){const cs=D.ctrls.filter(c=>c.r===r.id),es=D.engs.filter(e=>e.r===r.id),fs=D.finds.filter(f=>f.r===r.id),ks=D.kris.filter(k=>k.r===r.id);
  b=`<div class=g2><div class=card><h3>Process</h3><p>${esc([P.proc,P.sub].filter(Boolean).join(' / '))||'Not linked'}</p></div>
  <div class=card><h3>Controls (${cs.length})</h3>${cs.map(c=>`<p style="margin:4px 0"><span class=mono>${c.id}</span> ${esc(c.n)} ${pill(c.e)}</p>`).join('')||'<p class=sub>None linked.</p>'}<a href="controls.html">Open control library</a></div>
  <div class=card><h3>Audits (${es.length})</h3>${es.map(e=>`<p style="margin:4px 0"><a href="engagements.html#${e.id}" class=mono>${e.id}</a> ${esc(e.n)} <span class=pill>${e.s}</span></p>`).join('')||'<p class=sub>No audits yet.</p>'}</div>
  <div class=card><h3>Findings (${fs.length})</h3>${fs.map(f=>`<p style="margin:4px 0"><a href="findings.html#${f.id}" class=mono>${f.id}</a> ${esc(f.t)} ${pill(f.sv)}</p>`).join('')||'<p class=sub>No findings.</p>'}</div>
  <div class=card style="grid-column:1/-1"><h3>Key risk indicators (${ks.length})</h3>${ks.length?tbl(['KRI','Value','Threshold','Status'],ks.map(k=>['',esc(k.n),k.val+' '+k.u,k.thr+' '+k.u,k.val>k.thr?pill('Critical').replace('Critical','Breached'):pill('Low').replace('Low','Within limit')]),'lt'):'<p class=sub>No indicators linked.</p>'}<button class="btn g s" style="margin-top:10px" onclick="addKri('${r.id}')">+ Add KRI</button></div></div>`}
 if(rtab==='cm'){const th=(p,d)=>r.cmt.filter(c=>c.p===p).map(c=>`<div class=cm><b>${esc(c.u)}</b> <small>${c.d}${c.h.length?' (edited)':''}</small><div>${esc(c.t)}</div>${c.h.length?`<small>Previous versions: ${c.h.map(x=>esc(x)).join(' | ')}</small><br>`:''}<button class="btn g s" onclick="replyC('${r.id}','${c.id}')">Reply</button> <button class="btn g s" onclick="editC('${r.id}','${c.id}')">Edit</button>${th(c.id,d+1)}</div>`).join('');
  b=`<div class=card><h3>Comments</h3>${th(null,0)||'<p class=sub>No comments yet.</p>'}<div class=sec>${fld('Add comment','<textarea id=cm_n></textarea>')}<button class=btn onclick="addC('${r.id}',null)">Post comment</button></div></div>`}
 if(rtab==='au')b=`<div class=card><h3>Audit trail</h3><p class=sub>Every material change to this risk.</p>${tbl(['Time','User','Event'],D.log.filter(l=>l.id===r.id).map(l=>['',l.t,esc(l.u),esc(l.m)]),'lt')||''}</div>`;
 return{t:`${r.id} ${r.n}`,s:`${r.type} risk, owned by ${r.owner||'unassigned'}`,m:'risks',h:`<p class=crumb><a href="risks.html">Risk register</a> &rsaquo; ${r.id}</p>${acts}<div class=tabs>${tabs.map(([k,l])=>`<button class="${k===rtab?'on':''}" onclick="rtab='${k}';render()">${l}</button>`).join('')}</div>${b}`}};
const R_=id=>rk(id);
function submitR(id){if(!need('risks',2))return;const r=R_(id),W=D.setup.wf.risk;if(!W.length){r.st='Active';log(id,'Risk activated (no approval levels configured)')}else{r.st='Pending Approval';r.ap=0;log(id,`Submitted for approval (${W.length} level${W.length>1?'s':''})`)}render()}
function approveR(id){if(!need('risks',3))return;const r=R_(id),W=D.setup.wf.risk;log(id,`Approval level ${r.ap+1} of ${W.length} granted (${W[r.ap]})`);r.ap++;if(r.ap>=W.length){r.st='Active';r.ap=0;log(id,'Risk approved and active');toast(id+' is now active')}render()}
const rejectR=id=>openM(`<h2>Send back for changes</h2>${fld('Reason','<textarea id=rj></textarea>',1)}<div class=act><button class="btn g" onclick=closeM()>Cancel</button><button class=btn onclick="rejectGo('${id}')">Send back</button></div>`);
const rejectGo=id=>{const t=$('#rj').value.trim();if(!t)return toast('Enter a reason.');const r=R_(id);r.st='Draft';r.ap=0;log(id,'Sent back to draft: '+t);closeM();render()};
const deactR=id=>{if(!need('risks',3))return;const f=openF(R_(id));if(f)return toast(`${f} open finding(s) are linked. Close or re-link them before deactivating.`);openM(`<h2>Deactivate ${id}</h2><p class=sub>The risk is retired from active use. Its history, links and audit trail are kept.</p>${fld('Reason','<textarea id=dr></textarea>',1)}<div class=act><button class="btn g" onclick=closeM()>Cancel</button><button class=btn onclick="deactGo('${id}')">Deactivate</button></div>`)};
const deactGo=id=>{const t=$('#dr').value.trim();if(!t)return toast('Enter a reason.');R_(id).st='Inactive';log(id,'Deactivated: '+t);closeM();render()};
const reactR=id=>{if(!need('risks',3))return;R_(id).st='Draft';log(id,'Reactivated as draft');render()};
function reassess(id){if(!need('risks',2))return;const r=R_(id),s=(i,j)=>`<select id=ra_${i}${j}>${[1,2,3,4,5].map(n=>`<option ${r[i][j]===n?'selected':''}>${n}`).join('')}</select>`;
 openM(`<h2>Reassess ${id}</h2><p class=sub>Creates a new assessment version. Model: ${esc(r.am)}.</p><div class=two><div><b>Inherent</b><div class=two>${fld('Likelihood',s('inh',0))}${fld('Impact',s('inh',1))}</div></div><div><b>Residual</b><div class=two>${fld('Likelihood',s('res',0))}${fld('Impact',s('res',1))}</div></div></div>${fld('Reason for change','<textarea id=ra_n></textarea>',1)}<div class=act><button class="btn g" onclick=closeM()>Cancel</button><button class=btn onclick="reassessGo('${id}')">Save assessment</button></div>`)}
function reassessGo(id){const r=R_(id),n=$('#ra_n').value.trim(),g=k=>+$('#ra_'+k).value,inh=[g('inh0'),g('inh1')],res=[g('res0'),g('res1')];if(!n)return toast('Enter the reason for the change.');
 if(sc(res,r.am)>sc(inh,r.am))return toast('Residual score cannot exceed inherent score.');r.ver++;r.inh=inh;r.res=res;r.nr=day(180);r.hist.push({ver:r.ver,d:TODAY,u:meU().n,inh,res,am:r.am,n});
 if(sc(res,r.am)>=D.setup.meth.ap&&D.setup.wf.risk.length){r.st='Pending Approval';r.ap=0;log(id,`Reassessed (v${r.ver}), residual ${sc(res,r.am)} needs approval`)}else log(id,`Reassessed (v${r.ver}), residual ${sc(res,r.am)}`);closeM();render()}
const nowS=()=>new Date().toISOString().slice(0,16).replace('T',' ');
function addC(id,p){if(!need('risks',1))return;const t=$('#cm_n')?$('#cm_n').value.trim():$('#rp_n').value.trim();if(!t)return toast('Write a comment first.');R_(id).cmt.push({id:uid('CM'),p,u:meU().n,d:nowS(),t,h:[]});log(id,p?'Reply added':'Comment added');closeM();render()}
const replyC=(id,c)=>openM(`<h2>Reply</h2>${fld('Reply','<textarea id=rp_n></textarea>')}<div class=act><button class="btn g" onclick=closeM()>Cancel</button><button class=btn onclick="addC('${id}','${c}')">Post reply</button></div>`);
const editC=(id,c)=>{const x=R_(id).cmt.find(k=>k.id===c);if(x.u!==meU().n)return toast('You can edit only your own comments.');openM(`<h2>Edit comment</h2><p class=sub>The previous text is kept in the comment history.</p>${fld('Comment',`<textarea id=ec_n>${esc(x.t)}</textarea>`)}<div class=act><button class="btn g" onclick=closeM()>Cancel</button><button class=btn onclick="editCGo('${id}','${c}')">Save</button></div>`)};
const editCGo=(id,c)=>{const x=R_(id).cmt.find(k=>k.id===c),t=$('#ec_n').value.trim();if(!t)return toast('Comment cannot be empty.');x.h.push(x.t);x.t=t;log(id,'Comment edited');closeM();render()};
const addKri=id=>openM(`<h2>Add key risk indicator</h2>${fld('Name','<input id=k_n>',1)}<div class=three>${fld('Current value','<input id=k_v type=number>',1)}${fld('Threshold','<input id=k_t type=number>',1)}${fld('Unit','<input id=k_u value="count">')}</div><div class=act><button class="btn g" onclick=closeM()>Cancel</button><button class=btn onclick="addKriGo('${id}')">Add KRI</button></div>`);
const addKriGo=id=>{if(!need('risks',2))return;const n=$('#k_n').value.trim(),v=$('#k_v').value,t=$('#k_t').value;if(!n||v===''||t==='')return toast('Enter a name, value and threshold.');const k={id:nid('KRI',D.kris),n,r:id,val:+v,thr:+t,u:$('#k_u').value||'count'};D.kris.push(k);log(id,`KRI "${n}" linked`);closeM();render()};
