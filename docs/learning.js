const prefix = 'linear-algebra:';
function get(key) {
  try { return localStorage.getItem(prefix + key); } catch { return null; }
}
function save(key, value) {
  try { localStorage.setItem(prefix + key, value); } catch {}
}
const root = document.documentElement;
let size = Number(get('size')) || 18;
function resize(delta) {
  size = Math.max(16, Math.min(26, size + delta));
  root.style.setProperty('--reading-size', size + 'px');
  save('size', size);
}
resize(0);
root.dataset.theme = get('theme') || 'light';
document.querySelector('#smaller').onclick = () => resize(-1);
document.querySelector('#larger').onclick = () => resize(1);
document.querySelector('#theme').onclick = () => {
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  save('theme', root.dataset.theme);
};

const chapter = document.querySelector('[data-chapter]')?.dataset.chapter;
if (chapter) {
  const resume = get('last') === chapter ? Number(get('scroll')) : 0;
  if (!location.hash && resume > 0) {
    window.addEventListener('load', async () => {
      await window.MathJax?.startup?.promise;
      window.scrollTo({top: resume, behavior: 'instant'});
    });
  }
  function recordPosition() {
    save('last', chapter);
    save('scroll', window.scrollY);
  }
  save('last', chapter);
  save('scroll', resume);
  window.addEventListener('pagehide', recordPosition);
  const complete = document.querySelector('#complete');
  function updateCompletion(done) {
    complete.setAttribute('aria-pressed', done);
    complete.textContent = done ? '已读 · 点击取消' : '标记已读';
  }
  updateCompletion(get('done-' + chapter) === 'true');
  complete.onclick = () => {
    const done = complete.getAttribute('aria-pressed') === 'false';
    save('done-' + chapter, done);
    updateCompletion(done);
  };
  document.querySelectorAll('[data-check]').forEach(button => {
    const key = 'practice-' + chapter + '-' + button.dataset.check;
    const answer = button.nextElementSibling;
    const input = button.parentElement.querySelector('input');
    const status = document.createElement('small');
    button.after(status);
    function updateStatus() { status.textContent = get(key) ? ' 已完成，可重做' : ''; }
    updateStatus();
    button.onclick = () => {
      if (!answer.hidden) {
        input.value = '';
        answer.hidden = true;
        button.textContent = '提交并查看解析';
        input.focus();
      } else {
        if (!input.value.trim()) {
          input.setCustomValidity('请先写下你的答案或思路');
          input.reportValidity();
          return;
        }
        save(key, 'true');
        updateStatus();
        answer.hidden = false;
        button.textContent = '重做';
      }
      button.setAttribute('aria-expanded', String(!answer.hidden));
    };
    input.oninput = () => input.setCustomValidity('');
  });
} else {
  const entries = [...document.querySelectorAll('[data-entry]')];
  let read = 0;
  let practiced = 0;
  for (const entry of entries) {
    const id = entry.dataset.entry;
    if (get('done-' + id) === 'true') {
      entry.append(' · 已读');
      read++;
    }
    for (const question of [1, 2]) {
      if (get('practice-' + id + '-' + question)) practiced++;
    }
  }
  document.querySelector('#progress').textContent = `已读 ${read}/${entries.length} 章 · 已完成 ${practiced}/${entries.length * 2} 道练习`;
  const last = entries.find(entry => entry.dataset.entry === get('last'));
  if (last) {
    const resume = document.querySelector('#resume');
    resume.href = last.href;
    resume.textContent = '继续阅读';
  }
}

const demo = document.querySelector('[data-demo]');
if (demo) {
  const mode = demo.dataset.demo;
  const vector = mode === 'vector';
  const eigen = mode === 'eigen';
  const values = vector ? [2, 1, 1, 2] : [2, 0, 0, 1];
  const labels = vector ? ['uₓ', 'uᵧ', 'vₓ', 'vᵧ'] : ['a₁₁', 'a₁₂', 'a₂₁', 'a₂₂'];
  demo.innerHTML = '<p>' + (vector ? '拖动箭头端点或修改分量。绿色为 u，蓝色为 v，橙色为向量和，紫色为 u 沿 v 的投影。' :
    eigen ? '修改矩阵，观察哪些实方向在变换后仍在原直线上。紫色虚线表示特征方向。' :
    '修改矩阵，观察灰色方格如何变成绿色网格。橙色边框是单位正方形变换后的形状。') +
    '</p><div class="demo-controls">' + labels.map((label, i) =>
      `<label>${label} <input type="number" min="-3" max="3" step="0.25" value="${values[i]}"></label>`).join('') +
    '</div><svg viewBox="-9 -9 18 18" role="img" aria-label="二维坐标和变换示意图"></svg><p><output></output></p>';
  const inputs = [...demo.querySelectorAll('input')];
  const svg = demo.querySelector('svg');
  const output = demo.querySelector('output');
  const round = n => Number(n.toFixed(3));
  const line = (x, y, u, v, color, extra = '') =>
    `<line x1="${x}" y1="${-y}" x2="${u}" y2="${-v}" stroke="${color}" vector-effect="non-scaling-stroke" ${extra}/>`;
  function draw() {
    const [a, b, c, d] = inputs.map(input => Math.max(-3, Math.min(3, input.valueAsNumber || 0)));
    let picture = '<defs>' + ['green', 'blue', 'orange', 'purple'].map((color, i) =>
      `<marker id="arrow-${i}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="${color}"/></marker>`).join('') + '</defs>';
    for (let i = -8; i <= 8; i++) {
      const color = i ? 'var(--line)' : 'var(--muted)';
      picture += line(i, -9, i, 9, color) + line(-9, i, 9, i, color);
    }
    if (vector) {
      const dot = a * c + b * d;
      const lengthSquared = c * c + d * d;
      const arrows = [[a, b], [c, d], [a + c, b + d]];
      if (lengthSquared) arrows.push([dot * c / lengthSquared, dot * d / lengthSquared]);
      arrows.forEach(([x, y], i) => {
        const color = ['green', 'blue', 'orange', 'purple'][i];
        picture += line(0, 0, x, y, color, `stroke-width="2" marker-end="url(#arrow-${i})"`);
      });
      [[a,b],[c,d]].forEach(([x,y], i) => {
        picture += `<circle data-handle="${i}" cx="${x}" cy="${-y}" r=".48" fill="transparent"/>`;
      });
      output.textContent = `向量和 (${round(a+c)}, ${round(b+d)}) · 点积 ${round(dot)} · 投影 ${lengthSquared ? '(' + arrows[3].map(round).join(', ') + ')' : '方向为零，公式不适用'}`;
    } else {
      const det = a*d-b*c;
      for (let i = -3; i <= 3; i++) {
        picture += line(a*i-3*b, c*i-3*d, a*i+3*b, c*i+3*d, 'var(--accent)');
        picture += line(b*i-3*a, d*i-3*c, b*i+3*a, d*i+3*c, 'var(--accent)');
      }
      picture += `<polygon points="0,0 ${a},${-c} ${a+b},${-c-d} ${b},${-d}" fill="#f4a30044" stroke="orange" vector-effect="non-scaling-stroke" stroke-width="2"/>`;
      let description = `行列式 ${round(det)} · 面积倍率 ${round(Math.abs(det))}`;
      if (eigen) {
        const delta = (a-d)**2 + 4*b*c;
        if (b === 0 && c === 0 && a === d) description = `所有非零方向都是特征方向 · 特征值 ${a}`;
        else if (delta < 0) description = '没有实特征方向';
        else {
          const eigenvalues = [...new Set([(a+d+Math.sqrt(delta))/2, (a+d-Math.sqrt(delta))/2])];
          for (const value of eigenvalues) {
            const row1 = [a-value,b], row2 = [c,d-value];
            const [p,q] = Math.hypot(...row1) >= Math.hypot(...row2) ? row1 : row2;
            const scale = 9/Math.hypot(p,q);
            picture += line(-q*scale,p*scale,q*scale,-p*scale,'purple','stroke-width="3" stroke-dasharray="6 4"');
          }
          description = '实特征值 ' + eigenvalues.map(round).join('、');
        }
      }
      output.textContent = description;
    }
    svg.innerHTML = picture;
  }
  inputs.forEach(input => input.addEventListener('input', draw));
  let handle = null;
  svg.addEventListener('pointerdown', event => {
    if (event.target.dataset.handle === undefined) return;
    handle = Number(event.target.dataset.handle);
    svg.setPointerCapture(event.pointerId);
  });
  svg.addEventListener('pointermove', event => {
    if (handle === null) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
    [point.x, -point.y].forEach((value, axis) => {
      inputs[handle*2+axis].value = Math.max(-3, Math.min(3, Math.round(value*4)/4));
    });
    draw();
  });
  svg.addEventListener('lostpointercapture', () => { handle = null; });
  draw();
}
