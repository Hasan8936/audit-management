/* Users, import users (CSV), setup, audit trail */
const S_=()=>need('setup',2,'Your role cannot change Setup. Use the "Acting as" selector to switch to an administrator.');
const orgNames=()=>D.setup.org.map(o=>o.n);
const orgDL=()=>`<datalist id=orgl>${D.setup.org.map(o=>`<option value="${esc(o.n)}">`).join('')}</datalist>`;

/* ---------- users ---------- */
V.users=()=>{const S=D.setup;return{t:'Users',s:'Assign roles and a data scope. Conflicting roles are blocked by segregation-of-duties rules.',m:'setup',h:orgDL()+`
 <div class=tb><span class=cnt style="margin:0;flex:1"><b>${S.users.length}</b> users, ${S.users.filter(u=>u.on).length} active</span><a class="btn g" href="import-users.html">Import from CSV</a><button class=btn onclick="eu()">+ New user</button></div>`+
 tbl(['User','Email','Roles','Data scope','Status'],S.users.map(u=>[`eu('${u.id}')`,`<b>${esc(u.n)}</b>`,esc(u.em),u.roles.map(r=>`<span class="pill i">${esc(r)}</span>`).join(' '),esc(u.sc)||'-',u.on?pill('Active'):pill('Inactive')]))+
 `<p class=chain style="margin-top:12px">Roles that cannot be held together: ${S.sod.map(p=>p.join(' + ')).join('; ')}</p>`}};
const eu=id=>{if(!S_())return;const S=D.setup,u=S.users.find(x=>x.id===id)||{n:'',em:'',roles:[],sc:'',on:1};
 openM(`<h2>${id?'Edit user':'New user'}</h2>${fld('Name',`<input id=u_n value="${esc(u.n)}">`,1)}${fld('Email',`<input id=u_e type=email value="${esc(u.em)}">`,1)}${fld('Data scope: records visible from this unit down',`<input id=u_s list=orgl value="${esc(u.sc)}">`)}<label>Roles</label><div class=cols style="margin-bottom:12px">${Object.keys(S.roles).map(r=>`<label class=inl style="margin:0"><input type=checkbox class=u_r value="${esc(r)}" ${u.roles.includes(r)?'checked':''}> ${esc(r)}</label>`).join('')}</div><label class=inl><input type=checkbox id=u_a ${u.on?'checked':''}> Active</label><div class=act><button class="btn g" onclick=closeM()>Cancel</button><button class=btn onclick="saveU('${id||''}')">Save user</button></div>`)};
const sodHit=roles=>D.setup.sod.find(p=>p.every(r=>roles.includes(r)));
const saveU=id=>{const S=D.setup,n=$('#u_n').value.trim(),em=$('#u_e').value.trim(),roles=$$('.u_r:checked').map(x=>x.value),sc=$('#u_s').value.trim();
 if(!n||!/^\S+@\S+\.\S+$/.test(em))return toast('Enter a name and a valid email.');if(!roles.length)return toast('Assign at least one role.');
 if(S.users.some(x=>x.id!==id&&x.em.toLowerCase()===em.toLowerCase()))return toast('Another user already has this email.');
 if(sc&&!orgNames().includes(sc))return toast('Data scope must be a unit from the organization hierarchy.');
 const c=sodHit(roles);if(c)return toast('Segregation of duties: '+c.join(' and ')+' cannot be held together.');
 let u=S.users.find(x=>x.id===id);if(!u){u={id:uid('U')};S.users.push(u)}const was=u.roles?u.roles.join(', '):'none';
 Object.assign(u,{n,em,roles,sc,on:$('#u_a').checked?1:0});log(u.id,`${id?'User updated':'User created'} (${n}): roles ${roles.join(', ')}, was ${was}; scope ${u.sc||'none'}; ${u.on?'active':'inactive'}`);closeM();render()};

/* ---------- import users from CSV ---------- */
const IM={raw:'',file:'',mode:'skip',done:null};
const ALIAS={name:['name','full name','fullname','user','user name','username'],email:['email','e-mail','email address','mail'],roles:['roles','role'],scope:['scope','data scope','datascope','organization','organisation','unit','org unit'],status:['status','active','state']};
const TPL=[['name','email','roles','scope','status'],['Anita Verma','anita.verma@northwind.example','Auditor','Northwind India Pvt Ltd','Active'],['Karan Shah','karan.shah@northwind.example','Lead Auditor; Auditor','Northwind Group','Active'],['Meera Iyer','meera.iyer@northwind.example','Process Owner','Procurement','Active']];
function analyse(){const t=IM.raw.trim();if(!t)return{err:'',rows:[]};
 const data=parseCSV(t);if(data.length<2)return{err:'The file needs a header row and at least one user row.',rows:[]};
 const head=data[0].map(h=>h.trim().toLowerCase()),col=k=>head.findIndex(h=>ALIAS[k].includes(h));
 if(col('name')<0||col('email')<0)return{err:'The header row must include name and email columns. Download the template to see the expected layout.',rows:[]};
 const S=D.setup,roleMap=Object.fromEntries(Object.keys(S.roles).map(r=>[r.toLowerCase(),r])),orgMap=Object.fromEntries(S.org.map(o=>[o.n.toLowerCase(),o.n])),seen={};
 const rows=data.slice(1).map((r,i)=>{const g=k=>col(k)<0?'':(r[col(k)]||'').trim(),er=[],wa=[];
  const name=g('name'),em=g('email').toLowerCase(),rawR=g('roles').split(/[;|,]/).map(x=>x.trim()).filter(Boolean);
  const roles=[],bad=[];rawR.forEach(x=>{const m=roleMap[x.toLowerCase()];m?(!roles.includes(m)&&roles.push(m)):bad.push(x)});
  if(!name)er.push('Name is missing');
  if(!/^\S+@\S+\.\S+$/.test(em))er.push('Email is not valid');else if(seen[em])er.push(`Email repeats row ${seen[em]}`);else seen[em]=i+2;
  if(!rawR.length)er.push('No role given');if(bad.length)er.push('Unknown role: '+bad.join(', '));
  const h=roles.length&&sodHit(roles);if(h)er.push('Segregation of duties: '+h.join(' and ')+' cannot be held together');
  if(roles.includes('Administrator')&&!can('setup',3))er.push('Only an administrator can import the Administrator role');
  let sc=g('scope');if(sc){const m=orgMap[sc.toLowerCase()];m?sc=m:(er.push(`Data scope "${sc}" is not in the organization`),sc='')}else wa.push('No data scope: this user will see no scoped records');
  const st=g('status').toLowerCase(),on=!st||['active','yes','y','1','true'].includes(st)?1:['inactive','no','n','0','false'].includes(st)?0:(wa.push(`Status "${g('status')}" not recognised, set to active`),1);
  const ex=S.users.find(u=>u.em.toLowerCase()===em);let act='create';
  if(ex&&!er.length){if(IM.mode==='update'){act='update';wa.push('Existing user: details will be updated')}else{act='skip';wa.push('Existing user: skipped')}}
  return{n:i+2,name,em,roles,sc,on,er,wa,act,ex,res:er.length?'Error':wa.length?'Warning':'Valid'}});
 return{err:'',rows}}
const importable=a=>a.rows.filter(r=>!r.er.length&&r.act!=='skip');
V.import=()=>{const a=analyse(),R=a.rows,ok=importable(a),cnt=k=>R.filter(r=>r.res===k).length;
 return{t:'Import users',s:'Add many users at once from a CSV file. Review every row before anything is saved.',m:'setup',h:`
 <div class=steps><div class=step><b>STEP 1</b>Download the template and fill it in</div><div class=step><b>STEP 2</b>Upload the CSV file</div><div class=step><b>STEP 3</b>Review checks on each row</div><div class=step><b>STEP 4</b>Import valid rows</div></div>
 ${IM.done?`<div class=okb><b>Import complete.</b> ${IM.done.c} created, ${IM.done.u} updated, ${IM.done.s} skipped, ${IM.done.e} rejected. <a href="users.html">Open users</a></div>`:''}
 <div class=g2><div class=card><h3>Upload file</h3><p class=sub>Columns: name, email, roles, scope, status. Separate several roles with a semicolon.</p>
  <div class=drop id=dz onclick="$('#fi').click()" ondragover="event.preventDefault();this.classList.add('over')" ondragleave="this.classList.remove('over')" ondrop="event.preventDefault();this.classList.remove('over');readUsers(event.dataTransfer.files[0])"><b>Drop a CSV file here</b><br><span class=sub style="margin:0">or click to choose a file${IM.file?`<br>Loaded: ${esc(IM.file)}`:''}</span></div>
  <input type=file id=fi accept=".csv,text/csv" hidden onchange="readUsers(this.files[0])">
  <div class=row><button class="btn g s" onclick=tplUsers()>Download template</button><button class="btn g s" onclick=sampleUsers()>Load sample file</button>${IM.raw?`<button class="btn g s" onclick="IM.raw='';IM.file='';IM.done=null;render()">Clear</button>`:''}</div></div>
 <div class=card><h3>Rules applied</h3><p class=sub>Every row is checked against Setup.</p><ul style="margin:0;padding-left:18px;color:var(--tx2);font-size:13px"><li>Name and a valid, unique email are required.</li><li>Roles must already exist in Roles and permissions.</li><li>Role pairs blocked by segregation of duties are rejected.</li><li>Data scope must be a unit in the organization hierarchy.</li></ul>
  <div class=sec>${fld('If a user with the same email already exists',`<select onchange="IM.mode=this.value;render()"><option value=skip ${IM.mode==='skip'?'selected':''}>Skip the row<option value=update ${IM.mode==='update'?'selected':''}>Update the existing user</select>`)}</div></div></div>
 ${a.err?`<div class=err>${esc(a.err)}</div>`:''}
 ${R.length?`<div class=kpis><div class="kpi k-i"><span>Rows read</span><b>${R.length}</b></div><div class="kpi k-g"><span>Valid</span><b>${cnt('Valid')}</b></div><div class="kpi k-a"><span>Warnings</span><b>${cnt('Warning')}</b></div><div class="kpi k-r"><span>Errors</span><b>${cnt('Error')}</b></div></div>
  <div class=tb><span class=cnt style="margin:0;flex:1">${ok.length} of ${R.length} rows will be imported. Rows with errors are never imported.</span>${cnt('Error')?`<button class="btn g" onclick=errUsers()>Download error report</button>`:''}<button class=btn ${ok.length?'':'disabled'} onclick=doImport()>Import ${ok.length} user${ok.length===1?'':'s'}</button></div>`+
  tbl(['Row','Name','Email','Roles','Scope','Status','Result','Notes'],R.map(r=>['',r.n,esc(r.name)||'-',esc(r.em)||'-',r.roles.map(x=>`<span class="pill i">${esc(x)}</span>`).join(' ')||'-',esc(r.sc)||'-',r.on?'Active':'Inactive',pill(r.res)+(r.res!=='Error'?` <span class=sub style="margin:0">${r.act}</span>`:''),esc([...r.er,...r.wa].join('. '))||'-'])):''}
 ${!R.length&&!a.err?'<div class=card><h3>No file loaded</h3><p class=sub>Download the template, add your users, then upload it here. You can also load the sample file to see how checks work.</p></div>':''}`}};
function readUsers(f){if(!f)return;if(!need('setup',2))return;const rd=new FileReader();rd.onload=()=>{IM.raw=String(rd.result);IM.file=f.name;IM.done=null;render()};rd.onerror=()=>toast('The file could not be read.');rd.readAsText(f)}
const tplUsers=()=>csvOut('users-template.csv',TPL);
const sampleUsers=()=>{IM.raw=[...TPL,['Rohit Sen','rohit.sen@northwind.example','Auditor; Process Owner','Procurement','Active'],['Dev Patel','dev.patel@northwind.example','Auditor','Atlantis','Active'],['Priya Nair','priya.nair@northwind.example','CAE','Northwind Group','Active'],['','no.name@northwind.example','Auditor','HR','Active'],['Sana Khan','sana.khan@northwind.example','Reviewer','HR','Active']].map(r=>r.map(c=>`"${c}"`).join(',')).join('\n');IM.file='sample-users.csv';IM.done=null;render()};
const errUsers=()=>csvOut('import-errors.csv',[['row','name','email','problems'],...analyse().rows.filter(r=>r.er.length).map(r=>[r.n,r.name,r.em,r.er.join('; ')])]);
function doImport(){if(!S_())return;const a=analyse(),ok=importable(a),res={c:0,u:0,s:a.rows.filter(r=>r.act==='skip'&&!r.er.length).length,e:a.rows.filter(r=>r.er.length).length};
 ok.forEach(r=>{if(r.act==='update'){Object.assign(r.ex,{n:r.name,roles:r.roles,sc:r.sc,on:r.on});log(r.ex.id,`User updated from CSV import (${IM.file}): roles ${r.roles.join(', ')}; scope ${r.sc||'none'}`);res.u++}
  else{const u={id:uid('U'),n:r.name,em:r.em,roles:r.roles,sc:r.sc,on:r.on};D.setup.users.push(u);log(u.id,`User imported from CSV (${IM.file}): ${r.name}, roles ${r.roles.join(', ')}; scope ${r.sc||'none'}`);res.c++}});
 log('IMPORT',`Users import from ${IM.file||'pasted data'}: ${res.c} created, ${res.u} updated, ${res.s} skipped, ${res.e} rejected`);
 IM.raw='';IM.file='';IM.done=res;render();toast(`${res.c+res.u} users imported`)}

/* ---------- setup ---------- */
const STB=[['roles','Roles and permissions'],['org','Organization'],['lk','Lookups'],['cf','Custom fields'],['meth','Methodology'],['wf','Approval workflow']],SUV={};
let lkSel='Risk type';const stab=()=>STB.some(x=>x[0]===location.hash.slice(1))?location.hash.slice(1):'roles';
V.setup=()=>({t:'Setup',s:'Configure the platform without code. Every change is recorded in the audit trail.',m:'setup',h:orgDL()+`<div class=tabs>${STB.map(([k,l])=>`<a href="#${k}" class="${k===stab()?'on':''}">${l}</a>`).join('')}<a href="users.html">Users</a><a href="import-users.html">Import users</a></div>`+SUV[stab()]()});
/* roles */
SUV.roles=()=>`<div class=tb><p class=sub style="margin:0;flex:1">Set the access level each role has in each module. Roles and data scope are enforced in this demo through the "Acting as" selector.</p><button class=btn onclick="nr()">+ New role</button></div>`+tbl(['Role',...MODS.map(m=>m[1])],Object.entries(D.setup.roles).map(([r,p])=>['',`<b>${esc(r)}</b>`,...MODS.map(([k])=>`<select aria-label="${esc(r)} ${k}" onchange="setP('${esc(r)}','${k}',this.value)">${LVL.map((l,i)=>`<option value=${i} ${p[k]===i?'selected':''}>${l}`).join('')}</select>`)]))+
 `<div class=card style="margin-top:16px"><h3>Segregation of duties</h3><p class=sub>Role pairs that cannot be assigned to the same user.</p>${D.setup.sod.map((p,i)=>`<div class=row><span class="pill c">${esc(p[0])}</span> + <span class="pill c">${esc(p[1])}</span><button class="btn g s" onclick="rmSod(${i})">Remove</button></div>`).join('')||'<p class=sub>No rules.</p>'}<div class=row><select id=sd_a style="width:auto">${opts(Object.keys(D.setup.roles))}</select><select id=sd_b style="width:auto">${opts(Object.keys(D.setup.roles))}</select><button class="btn g s" onclick=addSod()>Add rule</button></div></div>`;
const setP=(r,k,v)=>{if(!S_())return render();D.setup.roles[r][k]=+v;log('ROLE',`${r}: ${k} access set to ${LVL[v]}`);toast('Permission updated')};
const nr=()=>{if(S_())openM(`<h2>New role</h2>${fld('Role name',`<input id=r_n>`,1)}<div class=act><button class="btn g" onclick=closeM()>Cancel</button><button class=btn onclick=saveR()>Create role</button></div>`)};
const saveR=()=>{const n=$('#r_n').value.trim().replace(/['"<>]/g,'');if(!n||D.setup.roles[n])return toast('Enter a role name that does not exist yet.');D.setup.roles[n]=Object.fromEntries(MODS.map(m=>[m[0],m[0]==='setup'?0:1]));log('ROLE','Role "'+n+'" created with view access');closeM();render()};
const addSod=()=>{if(!S_())return;const a=$('#sd_a').value,b=$('#sd_b').value;if(a===b)return toast('Choose two different roles.');if(D.setup.sod.some(p=>p.includes(a)&&p.includes(b)))return toast('This rule already exists.');D.setup.sod.push([a,b]);log('ROLE',`Segregation rule added: ${a} + ${b}`);render()};
const rmSod=i=>{if(!S_())return;const p=D.setup.sod.splice(i,1)[0];log('ROLE',`Segregation rule removed: ${p.join(' + ')}`);render()};
/* organization */
const orgRows=(p,d)=>D.setup.org.filter(o=>o.p===p).flatMap(o=>[['',`<span style="padding-left:${d*20}px">${esc(o.n)}</span>`,`<span class="pill i">${OT[o.t]}</span>`,`${o.t<4?`<button class="btn g s" onclick="ao('${o.id}')">Add ${OT[o.t+1].toLowerCase()}</button> `:''}${o.p?`<button class="btn g s" onclick="rmO('${o.id}')">Remove</button>`:''}`],...orgRows(o.id,d+1)]);
SUV.org=()=>`<p class=sub>Group, country, legal entity, business unit and department. These names drive risk perspectives, user data scope and audit entities.</p>`+tbl(['Name','Level','Actions'],orgRows(null,0));
const ao=p=>{if(!S_())return;const o=D.setup.org.find(x=>x.id===p);openM(`<h2>Add ${OT[o.t+1].toLowerCase()} under ${esc(o.n)}</h2>${fld('Name',`<input id=o_n>`,1)}<div class=act><button class="btn g" onclick=closeM()>Cancel</button><button class=btn onclick="saveO('${p}')">Add</button></div>`)};
const saveO=p=>{const n=$('#o_n').value.trim(),q=D.setup.org.find(x=>x.id===p);if(!n)return toast('Enter a name.');if(D.setup.org.some(x=>x.n.toLowerCase()===n.toLowerCase()))return toast('A unit with this name already exists.');const o={id:uid('O'),n,t:q.t+1,p};D.setup.org.push(o);log(o.id,`${OT[o.t]} "${n}" added under ${q.n}`);closeM();render()};
const rmO=id=>{if(!S_())return;const O=D.setup.org,o=O.find(x=>x.id===id);if(O.some(x=>x.p===id))return toast('Remove the units beneath it first.');
 if(D.engs.some(e=>e.en===o.n)||D.plan.some(x=>x.en===o.n)||D.risks.some(r=>Object.values(r.persp).includes(o.n))||D.setup.users.some(u=>u.sc===o.n))return toast('This unit is used by a risk, audit record or user scope and cannot be removed.');D.setup.org=O.filter(x=>x!==o);log(id,`"${o.n}" removed`);render()};
/* lookups */
SUV.lk=()=>{const L=D.setup.lk;if(!L[lkSel])lkSel=Object.keys(L)[0];return`<p class=sub>Controlled value lists used on forms, including risk type, analysis model and context model. Deactivate a value instead of deleting it so history stays intact.</p><div class=tb><select aria-label="Lookup" onchange="lkSel=this.value;render()">${Object.keys(L).map(k=>`<option ${k===lkSel?'selected':''}>${esc(k)}`).join('')}</select><button class="btn g" onclick="nl()">New lookup</button></div>`+tbl(['Value','Status',''],L[lkSel].map((v,i)=>['',esc(v.v),v.on?pill('Active'):pill('Inactive'),`<button class="btn g s" onclick="tgL(${i})">${v.on?'Deactivate':'Activate'}</button>`]))+`<div class=tb style="margin-top:12px"><input id=lv_n placeholder="New value" style="width:240px"><button class=btn onclick=addL()>Add value</button></div>`};
const nl=()=>{if(S_())openM(`<h2>New lookup</h2>${fld('Lookup name',`<input id=l_n>`,1)}<div class=act><button class="btn g" onclick=closeM()>Cancel</button><button class=btn onclick=saveN()>Create</button></div>`)};
const saveN=()=>{const n=$('#l_n').value.trim().replace(/['"<>]/g,'');if(!n||D.setup.lk[n])return toast('Enter a lookup name that does not exist yet.');D.setup.lk[n]=[];lkSel=n;log('LOOKUP','Lookup "'+n+'" created');closeM();render()};
const addL=()=>{if(!S_())return;const v=$('#lv_n').value.trim(),L=D.setup.lk[lkSel];if(!v||L.some(x=>x.v.toLowerCase()===v.toLowerCase()))return toast('Enter a value that is not already in the list.');L.push({v,on:1});log('LOOKUP',`"${v}" added to ${lkSel}`);render()};
const tgL=i=>{if(!S_())return;const x=D.setup.lk[lkSel][i];x.on=x.on?0:1;log('LOOKUP',`"${x.v}" in ${lkSel} ${x.on?'activated':'deactivated'}`);render()};
/* custom fields */
SUV.cf=()=>`<div class=tb><p class=sub style="margin:0;flex:1">Add fields to risks, findings and engagements without development. Dropdown and multi-select fields draw from a lookup.</p><button class=btn onclick="ecf()">+ New field</button></div>`+tbl(['Object','Label','Type','List source','Default','Required',''],D.setup.cf.map(c=>['',c.obj,esc(c.l),c.t,esc(c.lk)||'-',esc(c.def)||'-',c.req?'Yes':'No',`<button class="btn g s" onclick="rmC('${c.id}')">Remove</button>`]));
const ecf=()=>{if(S_())openM(`<h2>New custom field</h2><div class=two>${fld('Object',`<select id=c_o><option>Risk<option>Finding<option>Engagement</select>`)}${fld('Type',`<select id=c_t>${CFT.map(t=>`<option>${t}`).join('')}</select>`)}</div>${fld('Label',`<input id=c_l>`,1)}${fld('List source, for Dropdown and Multi-select',`<select id=c_k><option value="">None${Object.keys(D.setup.lk).map(k=>`<option>${esc(k)}`).join('')}</select>`)}${fld('Default value',`<input id=c_d>`)}<label class=inl><input type=checkbox id=c_r> Required</label><div class=act><button class="btn g" onclick=closeM()>Cancel</button><button class=btn onclick=saveC()>Add field</button></div>`)};
const saveC=()=>{const l=$('#c_l').value.trim(),ty=$('#c_t').value,k=$('#c_k').value;if(!l)return toast('Enter a field label.');if(['Dropdown','Multi-select'].includes(ty)&&!k)return toast('Choose a lookup for the list.');
 const c={id:uid('CF'),obj:$('#c_o').value,l,t:ty,lk:['Dropdown','Multi-select'].includes(ty)?k:'',req:$('#c_r').checked?1:0,def:$('#c_d').value.trim()};D.setup.cf.push(c);log(c.id,`Custom field "${l}" added to ${c.obj}`);closeM();render()};
const rmC=id=>{if(!S_())return;const c=D.setup.cf.find(x=>x.id===id);D.setup.cf=D.setup.cf.filter(x=>x!==c);log(id,`Custom field "${c.l}" removed from ${c.obj}`);render()};
/* methodology */
SUV.meth=()=>{const m=D.setup.meth,n=(l,k,i,v,h='')=>fld(l,`<input type=number min=0 value=${v} onchange="setM('${k}','${i}',this.value)">${h?`<span class=help>${h}</span>`:''}`);
 return`<p class=sub>These values drive risk levels, approvals, risk records and audit plan priority across the app.</p><div class=g2><div class=card><h3>Risk levels (score out of 25)</h3>${n('Critical from score','t',0,m.t[0])}${n('High from score','t',1,m.t[1])}${n('Medium from score','t',2,m.t[2],'Scores below this value are Low.')}${n('High-risk approval from residual score','ap','',m.ap,'Engagements and reassessments at or above this score need approval.')}</div>
 <div class=card><h3>Audit plan priority weights</h3>${[['res','Residual risk score'],['last','Years since last audit'],['fnd','Each open finding'],['reg','Regulatory obligation'],['mg','Management request']].map(([k,l])=>n(l,'w',k,m.w[k])).join('')}</div>
 <div class=card><h3>Risk record rules</h3>${fld('Risk ID prefix',`<input value="${esc(m.idp)}" onchange="setM('idp','',this.value)"><span class=help>Next ID: ${rkId()}. The ID is generated by the system and cannot be edited.</span>`)}${n('Risk ID digits','idd','',m.idd)}${n('Risk name maximum length','nameMax','',m.nameMax)}${n('Risk description maximum length','descMax','',m.descMax)}${n('Similar-name warning threshold (%)','sim','',m.sim,'A warning shows when another active risk shares this share of key words.')}</div>
 <div class=card><h3>Analysis models</h3><p class=sub>Each model sets how likelihood and impact (1 to 5) become a score. Add or retire models under Lookups.</p><dl><dt>Standard 5x5<dd>Likelihood x impact<dt>Impact-weighted<dd>Likelihood x impact, with 25% added when impact is 4 or 5 (maximum 25)</dl><p class=sub style="margin-top:12px">Context models rank risks for audit planning: <b>Enterprise ranking</b> adds open findings, ineffective controls and KRI breaches to the residual score. <b>Concentration-aware</b> also adds points for other active risks in the same process.</p></div></div>`};
const LIM={idd:[3,10],nameMax:[20,500],descMax:[100,10000],sim:[10,100]};
const setM=(k,i,v)=>{if(!S_())return render();const m=D.setup.meth;
 if(k==='idp'){v=v.trim().replace(/[^A-Za-z0-9-]/g,'');if(!v){render();return toast('Enter a prefix such as RSK-.')}m.idp=v}
 else{v=+v;if(!(v>=0)){render();return toast('Enter a number of 0 or more.')}
  if(LIM[k]&&(v<LIM[k][0]||v>LIM[k][1])){render();return toast(`Enter a value from ${LIM[k][0]} to ${LIM[k][1]}.`)}
  if(k==='t'){const a=[...m.t];a[+i]=v;if(!(a[0]>a[1]&&a[1]>a[2]&&a[2]>0)){render();return toast('Thresholds must descend: Critical, then High, then Medium, all above 0.')}m.t=a}else if(i==='')m[k]=v;else m[k][i]=v}
 log('METHODOLOGY',`${k}${i!==''?' / '+i:''} set to ${v}`);render();toast('Methodology updated')};
/* workflow */
SUV.wf=()=>{const W=D.setup.wf,ro=Object.keys(D.setup.roles),ch=([k,l,on])=>`<div class=card><h3>${l} ${on?'<span class="pill l">Enforced</span>':'<span class="pill n">Saved, not yet enforced</span>'}</h3>${W[k].map((r,i)=>`<div class=row><b class=mono>L${i+1}</b><select style="width:auto" onchange="setW('${k}',${i},this.value)">${ro.map(x=>`<option ${x===r?'selected':''}>${esc(x)}`).join('')}</select>${W[k].length>1?`<button class="btn g s" onclick="rmW('${k}',${i})">Remove</button>`:''}</div>`).join('')}${W[k].length<3?`<button class="btn g s" onclick="addW('${k}')">Add level</button>`:''}</div>`;
 return`<p class=sub>Approvals run in sequence, L1 first, up to three levels. The approver needs the named role and Approve access to the module.</p><div class=g2>`+[['risk','Risk approval',1],['eng','Engagement approval for high-risk audits',1],['plan','Annual audit plan approval',0],['fnd','Finding approval',0]].map(ch).join('')+`</div><div class=card><h3>Due-date extensions <span class="pill l">Enforced</span></h3>${fld('Require approval for findings of this severity or higher',`<select style="width:auto" onchange="setW('ext',0,this.value)">${SV.map(s=>`<option ${s===W.ext?'selected':''}>${s}`).join('')}</select>`)}</div>`};
const setW=(k,i,v)=>{if(!S_())return render();const W=D.setup.wf;if(k==='ext')W.ext=v;else W[k][i]=v;log('WORKFLOW',`${k} ${k==='ext'?'policy':'level '+(i+1)} set to ${v}`);render()};
const addW=k=>{if(!S_())return;D.setup.wf[k].push('CAE');log('WORKFLOW',k+' level added');render()};
const rmW=(k,i)=>{if(!S_())return;D.setup.wf[k].splice(i,1);log('WORKFLOW',`${k} level ${i+1} removed`);render()};

/* ---------- audit trail ---------- */
let TQ='';
V.trail=()=>{const L=D.log.filter(l=>!TQ||(l.id+' '+l.m+' '+(l.u||'')).toLowerCase().includes(TQ.toLowerCase()));
 return{t:'Audit trail',s:'Approvals, status changes and changes to owners, due dates, ratings and setup are recorded with the user who made them.',h:`
 <div class=tb><input class=grow placeholder="Search by record, user or event" value="${esc(TQ)}" oninput="TQ=this.value;clearTimeout(window._h);window._h=setTimeout(()=>{render();const i=$('.grow');i.focus();i.setSelectionRange(1e4,1e4)},300)"><button class="btn g" onclick="csvOut('audit-trail.csv',[['Time','User','Record','Event'],...D.log.map(l=>[l.t,l.u||'',l.id,l.m])])">Export CSV</button><button class="btn g" onclick=rst()>Reset sample data</button></div>
 <p class=cnt>Showing <b>${L.length}</b> of ${D.log.length} events.</p>`+tbl(['Time','User','Record','Event'],L.slice(0,500).map(l=>['',l.t,esc(l.u||''),`<span class=mono>${esc(l.id)}</span>`,esc(l.m)]))}};
const rst=()=>openM(`<h2>Reset sample data?</h2><p class=sub>This replaces all records, users and setup in this browser with the sample set. It cannot be undone.</p><div class=act><button class="btn g" onclick=closeM()>Cancel</button><button class=btn onclick="if(!need('setup',3))return;try{localStorage.removeItem(KEY)}catch(e){}D=seed();closeM();render();toast('Sample data restored')">Reset</button></div>`);
window.addEventListener('hashchange',()=>{if(typeof cur!=='undefined'&&cur==='setup')render()});
