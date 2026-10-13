/* Dashboard, controls, audit plan, engagements, findings */
const QSP=()=>new URLSearchParams(location.search);
const orgList=()=>`<datalist id=orgl>${D.setup.org.map(o=>`<option value="${esc(o.n)}">`).join('')}</datalist>`;
let hashDone=false;const hashOpen=f=>{if(hashDone||!location.hash)return;hashDone=true;const id=decodeURIComponent(location.hash.slice(1));setTimeout(()=>f(id),0)};
let F=(()=>{const q=QSP();return{s:q.get('s')||'',sv:q.get('sv')||'',od:q.get('od')?1:0}})();

/* ---------- dashboard ---------- */
V.dash=()=>{const user=meU(),admin=systemAdmin(user),accessible=D.risks.filter(visible),ids=new Set(accessible.map(r=>r.id)),R=accessible.filter(r=>r.st!=='Inactive'),
  findings=D.finds.filter(f=>ids.has(f.r)),engagements=D.engs.filter(e=>ids.has(e.r)),o=findings.filter(f=>f.s!=='Closed'),tot=R.reduce((a,r)=>a+rS(r),0)||1,
  cov=R.filter(r=>engagements.some(e=>e.r===r.id)).reduce((a,r)=>a+rS(r),0),
  reviews=accessible.filter(r=>r.st==='Pending Review'&&recordCan(r,'review')),
  approvals=accessible.filter(r=>r.st==='Pending Approval'&&recordCan(r,'approve')),
  drafts=accessible.filter(r=>r.st==='Draft'&&recordCan(r,'edit')),
  reassess=accessible.filter(r=>r.st==='Active'&&r.nr<TODAY&&recordCan(r,'reassess')),
  role=user.roles.find(x=>['Owner','Editor','Reviewer','Approver','Viewer'].includes(x))||'Member',
  title=admin?'Enterprise audit health':`${role} workspace`,tasks=[
   ...reviews.map(r=>({r,label:'Review due',detail:'Validate the submission and add review remarks',action:'Review record'})),
   ...approvals.map(r=>({r,label:'Approval due',detail:'Approve or send the reviewed record back',action:'Review approval'})),
   ...drafts.map(r=>({r,label:'Draft to maintain',detail:'Complete or update the assigned record',action:'Open draft'})),
   ...reassess.map(r=>({r,label:'Assessment overdue',detail:`Reassessment was due ${r.nr}`,action:'Open record'}))
  ];let hm='';
 for(let i=5;i>=1;i--)for(let l=1;l<=5;l++){const n=R.filter(r=>r.res[0]==l&&r.res[1]==i).length;hm+=`<i class="hc ${KC[lv(l*i)]} ${n?'on':''}" title="Likelihood ${l}, impact ${i}">${n||''}</i>`}
 const kp=(v,l,a,c)=>`<button class="kpi ${c}" onclick="location='${a}'"><span>${l}</span><b>${v}</b></button>`;
 const top=R.slice().sort((a,b)=>ctxScore(b)-ctxScore(a)).slice(0,5);
 const inbox=tasks.length?tbl(['Priority','Record ID','Record','What to do',''],tasks.map(x=>[`location='risk.html?id=${x.r.id}'`,`<span class=mono>${x.r.id}</span>`,esc(x.r.n),`${pill(x.label)}<br>${esc(x.detail)}`,`<a class="btn g s" href="risk.html?id=${x.r.id}">${x.action}</a>`])):`<div class=okb>No assigned workflow actions are waiting for you. Assigned records and their current stages are listed below.</div>`;
 const heading=admin?'Enterprise overview':`Welcome, ${esc(user.n)}`,
  roleGuide=({Owner:'Create and maintain records, manage security assignments, and transfer ownership. Review and approval decisions remain assigned to separate users.',Editor:'Update assigned records and submit drafts into the workflow. You cannot change security assignments or make review and approval decisions.',Viewer:'Read and monitor assigned records only. Editing, assignments, review decisions, and approvals are not available.',Reviewer:'Validate records assigned to you, record review remarks, and send submissions forward or back. Approval remains a separate role.',Approver:'Make the formal approval or rejection decision on records assigned to you after review. Editing and reviewer decisions remain separate.'})[role]||'Your dashboard and record access are based on your user role, assignments, and data scope.',
  workflowTitle=admin?'Workflow overview':`${role} workflow`;
 return{t:title,s:admin?'Select a metric to open the records behind it.':`Your ${esc(role.toLowerCase())} view · ${accessible.length} assigned or accessible record${accessible.length===1?'':'s'} · scope: ${esc(user.sc||'all units')}.`,h:`
 <div class=workspace-intro><div><span class="pill i">${esc(user.roles.join(' · '))}</span><h2>${heading}</h2><p>${admin?'A consolidated view of the audit programme.':esc(roleGuide)}</p></div>${recordCan(null,'create')?'<a class=btn href="risk-form.html">+ Create record</a>':''}</div>
 <div class=kpis>${kp(engagements.filter(e=>!['Draft','Closed'].includes(e.s)).length,'Active engagements','engagements.html','k-i')}${kp(o.length,'Open findings','findings.html','k-a')}${kp(findings.filter(od).length,'Overdue actions','findings.html?od=1','k-r')}${kp(findings.filter(f=>f.s==='Awaiting Verification').length,'Awaiting verification','findings.html?s=Awaiting%20Verification','k-i')}${kp(Math.round(cov*100/tot)+'%','Risk-weighted audit coverage','plan.html','k-g')}</div>
 <div class=card><div class=section-heading><div><h3>${workflowTitle}</h3><p class=sub>${admin?'Assigned work queues across the programme.':'Only work you are permitted to act on appears here.'}</p></div><span class="pill ${tasks.length?'m':'l'}">${tasks.length} action${tasks.length===1?'':'s'} waiting</span></div>
 <div class=workflow-counts>${[['Review',reviews.length,'reviewer'],['Approval',approvals.length,'approver'],['Drafts',drafts.length,'editor'],['Overdue reassessments',reassess.length,'owner']].map(([l,n,c])=>`<div class="workflow-count ${c}"><span>${l}</span><b>${n}</b></div>`).join('')}</div>${inbox}</div>
 <div class=cards-split><div class=card><h3>Residual risk heatmap</h3><p class=sub>Active risks plotted by residual likelihood and impact.</p><div class=hm>${hm}</div><div class=ax>Likelihood runs left to right, impact bottom to top. Figures are risk counts.</div></div>
 <div class=card><h3>Open findings by severity</h3>${bars(SV.map(s=>[s,o.filter(f=>f.sv===s).length,KC[s],`location='findings.html?sv=${s}'`]))}<h3 style="margin-top:18px">Findings by stage</h3>${bars(FS.map(s=>[s,findings.filter(f=>f.s===s).length,'',`location='findings.html?s=${encodeURIComponent(s)}'`]))}</div></div>
 <div class=card><h3>${admin?'Highest context priority risks':'Assigned records to monitor'}</h3><p class=sub>${admin?'Ranked by residual score, open findings, ineffective controls and KRI breaches.':'These records are visible to you; available actions depend on your assignment and the current workflow stage.'}</p>${tbl(['Risk','Name','Residual','Priority','Stage / findings'],top.map(r=>[`location='risk.html?id=${r.id}'`,`<span class=mono>${r.id}</span>`,esc(r.n),pill(lv(rS(r)))+' '+rS(r),`<b class=mono>${ctxScore(r)}</b>`,`${pill(r.st)} · ${openF(r)} open finding${openF(r)===1?'':'s'}`]))}</div>`}};

/* ---------- controls ---------- */
const EFF=['Effective','Partial','Ineffective'],CT=['Preventive','Detective','Corrective'];
V.ctrls=()=>({t:'Control library',s:'Design and operating effectiveness, mapped to the risk each control mitigates.',m:'ctrls',h:`
 <div class=tb><span class=cnt style="margin:0;flex:1"><b>${D.ctrls.length}</b> controls. ${D.ctrls.filter(c=>c.e==='Ineffective').length} ineffective in operation.</span><button class=btn onclick=newCtrl()>+ Add control</button></div>`+
 tbl(['ID','Control','Risk','Type','Design','Operating'],D.ctrls.map(c=>[`editCtrl('${c.id}')`,`<span class=mono>${c.id}</span>`,esc(c.n),`<a href="risk.html?id=${c.r}" onclick="event.stopPropagation()">${c.r}</a> ${esc((rk(c.r)||{}).n||'')}`,c.t,pill(c.d),pill(c.e)]))});
const ctrlForm=(c,id)=>`<h2>${id?'Edit '+id:'New control'}</h2>${fld('Control name',`<input id=c_n value="${esc(c.n||'')}">`,1)}${fld('Mitigates risk',`<select id=c_r><option value="">Select a risk${D.risks.map(r=>`<option value=${r.id} ${r.id===c.r?'selected':''}>${r.id} ${esc(r.n)}`).join('')}</select>`,1)}<div class=three>${fld('Type',`<select id=c_t>${opts(CT,c.t)}</select>`)}${fld('Design',`<select id=c_d>${opts(EFF,c.d)}</select>`)}${fld('Operating',`<select id=c_e>${opts(EFF,c.e)}</select>`)}</div><div class=act><button class="btn g" onclick=closeM()>Cancel</button><button class=btn onclick="saveCtrl('${id||''}')">${id?'Save control':'Add control'}</button></div>`;
const newCtrl=()=>{if(need('ctrls',2))openM(ctrlForm({},''))};
const editCtrl=id=>openM(ctrlForm(ct(id),id));
const saveCtrl=id=>{if(!need('ctrls',2))return;const n=$('#c_n').value.trim(),r=$('#c_r').value;if(!n||!r)return toast('Enter a control name and choose the risk it mitigates.');
 const v={n,r,t:$('#c_t').value,d:$('#c_d').value,e:$('#c_e').value};
 if(id){Object.assign(ct(id),v);log(id,`Control updated: design ${v.d}, operating ${v.e}`)}else{const c={id:nid('C',D.ctrls),...v};D.ctrls.push(c);log(c.id,`Control created for ${r}`)}closeM();render()};

/* ---------- audit plan ---------- */
V.plan=()=>{const W=D.setup.meth.w,rows=D.plan.map(p=>{const o=D.finds.filter(f=>f.r===p.r&&f.s!=='Closed').length,r=rk(p.r);return{...p,o,rs:r?rS(r):0,score:(r?rS(r):0)*W.res+p.last*W.last+o*W.fnd+(p.reg?W.reg:0)+(p.mg?W.mg:0)}}).sort((a,b)=>b.score-a.score);
 return{t:'Risk-based audit plan',s:'Priority = residual risk, years since last audit, open findings, regulatory obligation and management requests. Weights are set in Setup.',m:'plan',h:tbl(['Rank','Auditable area','Risk','Years since audit','Open findings','Drivers','Priority score','Engagement'],rows.map((p,i)=>['',i+1,esc(p.n),pill(lv(p.rs))+` <a href="risk.html?id=${p.r}">${p.r}</a>`,p.last,p.o,[p.reg?'Regulatory':'',p.mg?'Management request':''].filter(Boolean).join(', ')||'None',`<b class=mono>${p.score}</b>`,p.eid?`<a class=mono href="engagements.html#${p.eid}">${p.eid}</a>`:`<button class="btn s" onclick="ne('${p.id}')">Create engagement</button>`]))}};

/* ---------- engagements ---------- */
V.engs=()=>({t:'Engagements',s:'Draft, planning, fieldwork, review, reporting, management response, closed.',m:'engs',after:()=>hashOpen(ed),h:orgList()+`<div class=tb><span class=cnt style="margin:0;flex:1"><b>${D.engs.length}</b> engagements</span><button class=btn onclick="ne()">+ New engagement</button></div>`+
 tbl(['ID','Engagement','Entity','Risk','Status','Approval','Findings'],D.engs.map(e=>{const r=rk(e.r);return[`ed('${e.id}')`,`<span class=mono>${e.id}</span>`,esc(e.n),esc(e.en),e.r,`<span class="pill i">${e.s}</span>`,r&&rS(r)>=D.setup.meth.ap?((e.ap||0)>=D.setup.wf.eng.length?pill('Approved'):pill('High')+' needs approval '+(e.ap||0)+'/'+D.setup.wf.eng.length):'Not required',D.finds.filter(f=>f.e===e.id).length]}))});
const ne=pid=>{if(!need('engs',2))return;const p=D.plan.find(x=>x.id===pid)||{};openM(`<h2>New engagement</h2>${fld('Name',`<input id=en_n value="${esc(p.n?p.n+' audit':'')}">`,1)}${fld('Auditable entity',`<input id=en_e list=orgl value="${esc(p.en)}">`)}${fld('Linked risk',`<select id=en_r><option value="">Select a risk${D.risks.filter(r=>r.st!=='Inactive').map(r=>`<option value=${r.id} ${r.id===p.r?'selected':''}>${r.id} ${esc(r.n)}`).join('')}</select>`)}${fld('Lead auditor',`<input id=en_l>`)}${fld('Objective',`<textarea id=en_o></textarea>`)}${fld('Scope',`<textarea id=en_s></textarea>`)}${cfIn('Engagement')}<div class=act><button class="btn g" onclick=closeM()>Cancel</button><button class=btn onclick="saveE('${pid||''}')">Create draft</button></div>`)};
const saveE=pid=>{const n=$('#en_n').value.trim();if(!n)return toast('Enter an engagement name.');const e={id:nid('E',D.engs),n,en:$('#en_e').value.trim(),r:$('#en_r').value,s:'Draft',lead:$('#en_l').value.trim(),obj:$('#en_o').value.trim(),sc:$('#en_s').value.trim(),ap:0,x:cfGet('Engagement')};D.engs.push(e);const p=D.plan.find(x=>x.id===pid);if(p)p.eid=e.id;log(e.id,'Engagement created as draft');closeM();render();toast(e.id+' created')};
const upE=(id,k,v)=>{en(id)[k]=v;log(id,`Engagement ${k==='r'?'risk':k==='obj'?'objective':k==='sc'?'scope':k} updated`)};
const ed=id=>{const e=en(id);if(!e)return;const L=e.s==='Closed'||!can('engs',2),i=ES.indexOf(e.s),r=rk(e.r),hi=r&&rS(r)>=D.setup.meth.ap,W=D.setup.wf.eng,nx=ES[i+1],d=L?'disabled':'';
 openM(orgList()+`<h2>${e.id} ${esc(e.n)}</h2><div class=row><span class="pill i">${e.s}</span>${r?pill(lv(rS(r)))+`<span class=chain style="margin:0">${r.id} ${esc(r.n)}</span>`:''}${e.s==='Closed'?'<span class=pill>Locked</span>':''}</div>
 ${fld('Objective',`<textarea ${d} onchange="upE('${id}','obj',this.value)">${esc(e.obj)}</textarea>`)}${fld('Scope',`<textarea ${d} onchange="upE('${id}','sc',this.value)">${esc(e.sc)}</textarea>`)}
 <div class=two>${fld('Entity',`<input ${d} list=orgl value="${esc(e.en)}" onchange="upE('${id}','en',this.value)">`)}${fld('Linked risk',`<select ${d} onchange="upE('${id}','r',this.value)"><option value="">Select${D.risks.map(x=>`<option value=${x.id} ${x.id===e.r?'selected':''}>${x.id} ${esc(x.n)}`).join('')}</select>`)}</div>
 ${cfIn('Engagement',e.x||{},`upX('Engagement','${id}',`,d)}<p class=chain>Controls in scope: ${D.ctrls.filter(c=>c.r===e.r).map(c=>c.id).join(', ')||'none'} | Findings: ${D.finds.filter(f=>f.e===id).map(f=>`<a href="findings.html#${f.id}">${f.id}</a>`).join(' ')||'none'}</p>
 <div class=act><button class="btn g" onclick=closeM()>Close</button>${hi&&(e.ap||0)<W.length&&i>0&&!L?`<button class="btn g" onclick="apE('${id}')">Approve as ${esc(W[e.ap||0])}</button>`:''}${nx&&!L?`<button class=btn onclick="advE('${id}')">Move to ${nx}</button>`:''}</div>
 <div class=tl>${D.log.filter(l=>l.id===id).slice(0,5).map(l=>`${l.t} ${esc(l.u||'')}: ${esc(l.m)}<br>`).join('')}</div>`)};
const apE=id=>{const e=en(id),W=D.setup.wf.eng,role=W[e.ap||0];if(!meU().roles.includes(role)||!can('engs',3))return toast(`Level ${(e.ap||0)+1} must be approved by a user with the ${role} role and Approve access to Engagements.`);e.ap=(e.ap||0)+1;log(id,`Approval level ${e.ap} of ${W.length} granted (${role})`);ed(id);render()};
const advE=id=>{if(!need('engs',2))return;const e=en(id),r=rk(e.r);
 if(e.s==='Draft'&&(!(e.en&&e.r&&e.obj&&e.sc)||cfMiss('Engagement',e.x||{})))return toast('Entity, risk, objective, scope and required custom fields must be completed before planning.');
 if(e.s==='Planning'&&r&&rS(r)>=D.setup.meth.ap&&(e.ap||0)<D.setup.wf.eng.length)return toast('This audit needs every approval level before fieldwork.');
 const nx=ES[ES.indexOf(e.s)+1];if(nx==='Closed'&&D.finds.some(f=>f.e===id&&['Draft','Auditor Review'].includes(f.s)))return toast('Finalise or remove draft findings before closing.');
 e.s=nx;log(id,'Status changed to '+nx);ed(id);render()};
const upX=(o,id,c,v)=>{const r=o==='Finding'?fn(id):en(id);(r.x=r.x||{})[c]=v;log(id,'Custom field '+c+' updated')};

/* ---------- findings ---------- */
V.finds=()=>{const L=D.finds.filter(f=>(!F.s||f.s===F.s)&&(!F.sv||f.sv===F.sv)&&(!F.od||od(f)));
 return{t:'Findings and actions',s:'Management completion moves a finding to verification. Only independent verification closes it.',m:'finds',after:()=>hashOpen(fd),h:`
 <div class=card><div class=tb><select aria-label="Stage" onchange="F.s=this.value;render()">${opts(FS,F.s,'All stages')}</select><select aria-label="Severity" onchange="F.sv=this.value;render()">${opts(SV,F.sv,'All severities')}</select><label class=inl style="margin:0"><input type=checkbox ${F.od?'checked':''} onchange="F.od=this.checked?1:0;render()"> Overdue only</label><span style="flex:1"></span><button class=btn onclick="nf()">+ New finding</button></div>
 <p class=cnt style="margin:0">Showing <b>${L.length}</b> of ${D.finds.length} findings.</p></div>`+
 (L.length?tbl(['ID','Finding','Engagement','Severity','Stage','Owner','Due'],L.map(f=>[`fd('${f.id}')`,`<span class=mono>${f.id}</span>`,esc(f.t),f.e,pill(f.sv),`<span class="pill i">${f.s}</span>`,esc(f.own)||'-',(f.due||'-')+(od(f)?' '+pill('Overdue'):'')])):'<div class=card><h3>No findings match</h3><p class=sub>Clear a filter or create a finding.</p></div>')}};
const co=eid=>{const e=en(eid);return D.ctrls.filter(c=>!e||c.r===e.r).map(c=>`<option value=${c.id}>${c.id} ${esc(c.n)}`).join('')};
const nf=()=>{if(!need('finds',2))return;const es=D.engs.filter(e=>!['Draft','Closed'].includes(e.s));if(!es.length)return toast('Move an engagement to planning or later first.');
 openM(`<h2>New finding</h2>${fld('Title',`<input id=f_t>`,1)}<div class=two>${fld('Engagement',`<select id=f_e onchange="$('#f_c').innerHTML=co(this.value)">${es.map(e=>`<option value=${e.id}>${e.id} ${esc(e.n)}`).join('')}</select>`)}${fld('Control tested',`<select id=f_c>${co(es[0].id)}</select>`)}</div>${fld('Severity',`<select id=f_s>${SV.map(s=>`<option ${s=='Medium'?'selected':''}>${s}`).join('')}</select>`)}${[['cd','Condition: what happened'],['cr','Criteria: what should happen'],['ca','Cause'],['ef','Effect'],['rc','Recommendation']].map(([k,l])=>fld(l,`<textarea id=f_${k}></textarea>`,1)).join('')}${cfIn('Finding')}<div class=act><button class="btn g" onclick=closeM()>Cancel</button><button class=btn onclick=saveF()>Save draft finding</button></div>`,1)};
const saveF=()=>{const g=k=>$('#f_'+k).value.trim(),f=mkF(nid('F',D.finds),g('t'),g('e'),en(g('e')).r,g('c'),g('s'),'Draft','','',['cd','cr','ca','ef','rc'].map(g));
 f.x=cfGet('Finding');if(!f.t||!f.cd||!f.cr||!f.ca||!f.ef||!f.rc||cfMiss('Finding',f.x))return toast('Complete the title, condition, criteria, cause, effect, recommendation and required custom fields.');D.finds.push(f);log(f.id,'Finding drafted, linked to '+f.e+', '+f.r+', '+f.c);closeM();render();toast(f.id+' saved')};
const up=(id,k,v)=>{fn(id)[k]=v;log(id,({resp:'Management response',own:'Action owner',due:'Due date'})[k]+' updated'+(k==='resp'?'':' to '+v))};
const NX={Draft:'Submit for auditor review','Auditor Review':'Send to management','Management Response':'Approve with response',Approved:'Start remediation',Remediation:'Mark remediation complete'};
const fd=id=>{const f=fn(id);if(!f)return;const e=en(f.e),r=rk(f.r),c=ct(f.c),L=f.s==='Closed'||!can('finds',2),i=FS.indexOf(f.s),lk=L||i>=4,dis=L?'disabled':'';
 openM(`<h2>${f.id} ${esc(f.t)}</h2><p class=chain>${r?`<a href="risk.html?id=${r.id}">${r.id}</a> ${esc(r.n)}`:''} &rsaquo; ${c?c.id+' '+esc(c.n):''} &rsaquo; <a href="engagements.html#${e.id}">${e.id} ${esc(e.n)}</a> &rsaquo; ${f.id} &rsaquo; Action &rsaquo; Verification</p>
 <div class=row>${pill(f.sv)}<span class="pill i">${f.s}</span>${od(f)?pill('Overdue'):''}${f.s==='Closed'?'<span class=pill>Locked</span>':''}</div>
 <dl>${[['Condition','cd'],['Criteria','cr'],['Cause','ca'],['Effect','ef'],['Recommendation','rc']].map(([l,k])=>`<dt>${l}<dd>${esc(f[k])}`).join('')}</dl><div class=sec></div>${cfIn('Finding',f.x||{},`upX('Finding','${id}',`,dis)}
 ${fld('Management response',`<textarea ${dis} onchange="up('${id}','resp',this.value)">${esc(f.resp)}</textarea>`)}
 <div class=two>${fld('Action owner',`<input ${dis} value="${esc(f.own)}" onchange="up('${id}','own',this.value)">`)}${fld('Due date',`<input type=date ${lk?'disabled':''} value="${f.due}" onchange="up('${id}','due',this.value)">`)}</div>
 ${i>=4&&!L?(f.ext?`<p class=chain>Extension to ${f.ext} awaits approval.</p><button class="btn g" onclick="apX('${id}')">Approve extension</button>`:`<div class=two>${fld('Request new due date',`<input type=date id=xd>`)}<label><br><button class="btn g" onclick="reqX('${id}')">Request extension</button></label></div>`):''}
 ${f.s==='Awaiting Verification'?fld('Independent verification note (evidence reviewed and conclusion)',`<textarea id=vn></textarea>`):''}${f.s==='Closed'&&f.ver?`<dl><dt>Verification<dd>${esc(f.ver)}</dl>`:''}
 <div class=act><button class="btn g" onclick=closeM()>Close</button>${f.s==='Awaiting Verification'?`<button class=btn onclick="ver('${id}')">Verify and close</button>`:NX[f.s]?`<button class=btn onclick="adv('${id}')">${NX[f.s]}</button>`:''}</div>
 <div class=tl>${D.log.filter(l=>l.id===id).slice(0,6).map(l=>`${l.t} ${esc(l.u||'')}: ${esc(l.m)}<br>`).join('')}</div>`,1)};
const adv=id=>{if(!need('finds',2))return;const f=fn(id);
 if(f.s==='Management Response'&&!f.resp.trim())return toast('Add the management response before approving.');
 if(f.s==='Approved'&&(!f.own.trim()||!f.due))return toast('Set an action owner and due date before remediation starts.');
 f.s=FS[FS.indexOf(f.s)+1];log(id,'Status changed to '+f.s);fd(id);render()};
const ver=id=>{if(!need('finds',3,'Only users with Approve access to Findings can verify and close.'))return;const f=fn(id),n=$('#vn').value.trim();if(n.length<10)return toast('Record the evidence reviewed and your conclusion to close.');f.ver=n;f.s='Closed';log(id,'Independently verified and closed');fd(id);render();toast(id+' closed')};
const reqX=id=>{const f=fn(id),d=$('#xd').value;if(!d||d<=f.due)return toast('Choose a date later than the current due date.');
 if(SV.indexOf(f.sv)<=SV.indexOf(D.setup.wf.ext)){f.ext=d;log(id,'Extension to '+d+' requested, approval required')}else{f.due=d;log(id,'Due date extended to '+d)}fd(id);render()};
const apX=id=>{if(!need('finds',3))return;const f=fn(id);f.due=f.ext;f.ext=null;log(id,'Extension approved, due date now '+f.due);fd(id);render()};
