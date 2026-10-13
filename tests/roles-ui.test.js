import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scripts = ['app.js', 'risk.js', 'audit.js', 'admin.js'];
const roleCases = [
  { id: 'U-01', name: 'Owner', view: true, edit: true, assign: true, review: false, approve: false },
  { id: 'U-02', name: 'Editor', view: true, edit: true, assign: false, review: false, approve: false },
  { id: 'U-03', name: 'Viewer', view: true, edit: false, assign: false, review: false, approve: false },
  { id: 'U-04', name: 'Reviewer', view: true, edit: false, assign: false, review: true, approve: false },
  { id: 'U-05', name: 'Approver', view: true, edit: false, assign: false, review: false, approve: true },
];

function evaluate(dom, source) {
  return vm.runInContext(source, dom.getInternalVMContext());
}

function boot(page = 'dash') {
  const dom = new JSDOM('<!doctype html><html><body><div id="shell"></div></body></html>', {
    url: 'http://localhost/index.html',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  for (const script of scripts) {
    evaluate(dom, fs.readFileSync(path.join(root, 'assets', script), 'utf8'));
  }
  evaluate(dom, `start(${JSON.stringify(page)})`);
  return { dom, window: dom.window, document: dom.window.document };
}

function actAs(dom, id) {
  evaluate(dom, `actAs(${JSON.stringify(id)})`);
}

function permissions(dom, id) {
  return evaluate(dom, `(() => {
    const user = D.setup.users.find(item => item.id === ${JSON.stringify(id)});
    const record = D.risks[0];
    return Object.fromEntries(['view', 'edit', 'assign', 'review', 'approve'].map(action => [action, recordCan(record, action, user)]));
  })()`);
}

function navLabels(document) {
  return [...document.querySelectorAll('.nav a')].map(link => link.textContent.trim());
}

test('each of the five security roles receives a distinct workspace and only permitted navigation', () => {
  const { dom, document } = boot();
  try {
    for (const role of roleCases) {
      actAs(dom, role.id);
      assert.equal(document.querySelector('.workspace-intro h2').textContent, `Welcome, ${role.name}`);
      assert.equal(document.querySelector('.section-heading h3').textContent, `${role.name} workflow`);
      assert.equal(Boolean(document.querySelector('.workspace-intro a[href="risk-form.html"]')), role.name === 'Owner');

      const guide = document.querySelector('.workspace-intro p').textContent;
      assert.ok(guide.length > 40, `${role.name} should see role-specific guidance`);
      const links = navLabels(document).join(' | ');
      assert.match(links, /Risk register/);
      assert.doesNotMatch(links, /Users|Import users|Setup/);

      evaluate(dom, "start('setup')");
      assert.match(document.querySelector('#mn').textContent, /Access restricted/);
      evaluate(dom, "start('dash')");
    }
  } finally {
    dom.window.close();
  }
});

test('record permissions match the Owner, Editor, Viewer, Reviewer, and Approver matrix', () => {
  const { dom } = boot();
  try {
    for (const role of roleCases) {
      assert.deepEqual({ ...permissions(dom, role.id) }, {
        view: role.view,
        edit: role.edit,
        assign: role.assign,
        review: role.review,
        approve: role.approve,
      }, `${role.name} permissions should match the baseline matrix`);
    }
    assert.equal(evaluate(dom, "recordCan(null, 'create', D.setup.users.find(user => user.id === 'U-01'))"), true);
    assert.equal(evaluate(dom, "recordCan(null, 'create', D.setup.users.find(user => user.id === 'U-02'))"), false);
  } finally {
    dom.window.close();
  }
});

test('review, approval, and draft work queues are limited to the assigned role', () => {
  const { dom, document } = boot();
  try {
    evaluate(dom, "D.risks[0].st = 'Pending Review'; D.risks[1].st = 'Pending Approval'; D.risks[2].st = 'Draft'; save()");
    for (const [role, expected] of [['U-01', '1 action waiting'], ['U-02', '1 action waiting'], ['U-04', '1 action waiting'], ['U-05', '1 action waiting'], ['U-03', '0 actions waiting']]) {
      actAs(dom, role);
      assert.equal(document.querySelector('.section-heading .pill').textContent, expected);
    }
    actAs(dom, 'U-02');
    assert.match(document.querySelector('#mn').textContent, /Draft to maintain/);
    assert.doesNotMatch(document.querySelector('#mn').textContent, /Review due|Approval due/);
    actAs(dom, 'U-01');
    assert.match(document.querySelector('#mn').textContent, /Draft to maintain/);
    actAs(dom, 'U-04');
    assert.match(document.querySelector('#mn').textContent, /Review due/);
    assert.doesNotMatch(document.querySelector('#mn').textContent, /Approval due/);
    actAs(dom, 'U-05');
    assert.match(document.querySelector('#mn').textContent, /Approval due/);
    assert.doesNotMatch(document.querySelector('#mn').textContent, /Review due/);
  } finally {
    dom.window.close();
  }
});

test('dashboard heatmap and graph controls expose counts, labels, and clickable bars', () => {
  const { dom, document } = boot();
  try {
    actAs(dom, 'U-01');
    assert.equal(document.querySelectorAll('.heatmap-grid [role="gridcell"]').length, 25);
    assert.ok(document.querySelector('.heatmap-legend .critical'));
    assert.ok(document.querySelector('.heatmap-legend .high'));
    assert.ok(document.querySelector('.heatmap-legend .medium'));
    assert.ok(document.querySelector('.heatmap-legend .low'));
    const bars = [...document.querySelectorAll('.bar-chart .bar')];
    assert.ok(bars.length >= 10);
    assert.ok(bars.every(bar => bar.tagName === 'BUTTON' && bar.getAttribute('aria-label') && bar.querySelector('.bar-track')));
  } finally {
    dom.window.close();
  }
});

test('risk register shows the requested risk fields in order with an actions column', () => {
  const { dom, document } = boot();
  try {
    actAs(dom, 'U-01');
    evaluate(dom, "start('risks')");
    const headers = [...document.querySelectorAll('.risk-table thead th')].map(header => header.textContent.trim());
    assert.deepEqual(headers, [
      'Risk ID', 'Risk', 'Type', 'Entity / business unit', 'Residual',
      'Context priority', 'Status', 'Business owner', 'Actions',
    ]);
    assert.ok(document.querySelector('.risk-table-wrap'));
    assert.equal(document.querySelectorAll('.risk-table tbody tr[data-risk-id]').length, 6);
  } finally {
    dom.window.close();
  }
});

test('Super Admin manages platform architecture only and cannot access record workflows', () => {
  const { dom, document } = boot();
  try {
    assert.equal(document.querySelector('.workspace-intro h2').textContent, 'Platform architecture');
    assert.match(document.querySelector('#mn').textContent, /changes platform architecture/i);
    assert.equal(document.querySelector('.bell b').textContent, '0');
    const links = navLabels(document).join(' | ');
    assert.match(links, /Users/);
    assert.match(links, /Setup/);
    assert.match(links, /Import users/);
    assert.doesNotMatch(links, /Risk register|Control library|Audit plan|Engagements|Findings and actions/);
    assert.equal(document.querySelector('.heatmap-grid'), null);
    assert.equal(document.querySelector('.workspace-intro a[href="risk-form.html"]'), null);

    for (const action of ['view', 'create', 'edit', 'assign', 'review', 'approve', 'submit', 'reassess']) {
      const result = evaluate(dom, `recordCan(D.risks[0], ${JSON.stringify(action)}, D.setup.users.find(user => user.id === 'U-00'))`);
      assert.equal(result, false, `Super Admin must not ${action} individual records`);
    }
    assert.equal(evaluate(dom, "can('setup', 2)"), true);

    evaluate(dom, "start('setup')");
    assert.match(document.querySelector('#mn').textContent, /Separate system role/);
    assert.match(document.querySelector('#mn').textContent, /Security role permission matrix/);
    assert.ok([...document.querySelectorAll('select[aria-label^="Super Admin"]')].every(control => control.disabled));

    dom.reconfigure({ url: 'http://localhost/risk.html?id=RSK-000001' });
    evaluate(dom, "start('risk')");
    assert.match(document.querySelector('#mn').textContent, /Record workspace restricted/);
  } finally {
    dom.window.close();
  }
});
