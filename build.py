from html import escape
from pathlib import Path
import re

import markdown

ROOT = Path(__file__).resolve().parent
DOCS = ROOT / 'docs'
TITLE = '数学帝国：线性代数编年史'
chapters = re.split(r'^# ', (ROOT / 'book.txt').read_text(encoding='utf-8-sig'), flags=re.M)[1:]
menu = re.search(r'<div class="shelf-menu">.*?</div>', (ROOT / 'navigation.html').read_text(encoding='utf-8'), re.S)[0]


def page(title, body, reading=False):
    return rf"""<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>{title} · {TITLE}</title>
<link rel="stylesheet" href="style.css"><link rel="stylesheet" href="shelf-nav.css">
<link rel="stylesheet" href="learning.css">
<script>window.MathJax={{tex:{{inlineMath:[['$','$']]}}}};</script>
<script defer src="https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-chtml.js"></script>
<script defer src="learning.js"></script></head><body class="{'reading' if reading else ''}">
<header class="topbar"><a class="brand" href="index.html">数学帝国</a><div class="shelf-controls">
<a href="https://wupzl.github.io/">学习书架</a><details class="shelf-switch"><summary>切换项目</summary>{menu}</details>
<button id="smaller" aria-label="缩小字号">A−</button><button id="larger" aria-label="放大字号">A+</button>
<button id="theme">深浅色</button></div></header>{body}</body></html>"""


def filename(i):
    return f'chapter-{i:02}.html'


groups = [(1, 3, '向量王国'), (4, 6, '空间与方程'), (7, 9, '方向与近似'), (10, 11, '分解与矩阵几何')]
titles = [chapter.splitlines()[0] for chapter in chapters]
for i, chapter in enumerate(chapters, 1):
    title, source = chapter.split('\n', 1)
    source, *questions = re.split(r'^\? ', source, flags=re.M)
    formulas = []
    def keep_math(match):
        formulas.append(escape(match[0]))
        return f'MATHPLACEHOLDER{len(formulas)-1}END'

    protected = re.sub(r'\$[^$\n]+\$', keep_math, source)
    content = markdown.markdown(protected, extensions=['toc'])
    content = re.sub(r'MATHPLACEHOLDER(\d+)END', lambda m: formulas[int(m[1])], content)
    toc = ''.join(f'<li><a href="#{anchor}">{label}</a></li>' for anchor, label in re.findall(r'<h2 id="([^"]+)">(.*?)</h2>', content))
    exercises = ''
    for j, question in enumerate(questions, 1):
        prompt, answer = map(str.strip, question.split('|', 1))
        exercises += f'<section class="question"><h3>{j}. {escape(prompt)}</h3><label>我的答案 <input type="text" autocomplete="off"></label><button type="button" data-check="{j}" aria-expanded="false">提交并查看解析</button><p hidden>{escape(answer)}</p></section>'
    demo = ''
    if i in (1, 2, 4, 5, 8, 9, 11):
        mode = 'vector' if i in (1, 2, 9) else 'eigen' if i == 8 else 'matrix'
        demo = f'<section id="demo"><h2>动手实验</h2><div data-demo="{mode}"></div></section>'
        toc += '<li><a href="#demo">动手实验</a></li>'
    toc += '<li><a href="#practice">章后练习</a></li>'
    links = ''.join(f'<a href="{filename(k)}">{label}</a> ' for k, label in [(i-1, '上一章'), (i+1, '下一章')] if 1 <= k <= len(chapters))
    body = f'''<div class="reader-layout"><aside class="sidebar"><p>本章目录</p><ul>{toc}</ul></aside>
<main id="main" data-chapter="{i}"><div class="chapter-heading"><p class="eyebrow">CHAPTER {i:02} / {len(chapters)}</p><h1>{title}</h1></div>
<details class="mobile-toc"><summary>展开本章目录</summary><ul>{toc}</ul></details>
<article>{content}{demo}<section id="practice"><h2>章后练习</h2><p>先写下自己的思路，再查看解析对照。</p>{exercises}</section>
<button id="complete" aria-pressed="false">标记已读</button><nav class="pager">{links}<a href="index.html">返回目录</a></nav></article></main></div>'''
    (DOCS / filename(i)).write_text(page(title, body, True), encoding='utf-8')
    exercise_md = '\n'.join(f'{j}. {q.split("|", 1)[0].strip()}\n\n   **解析** {q.split("|", 1)[1].strip()}\n' for j, q in enumerate(questions, 1))
    (ROOT / 'chapters' / f'chapter-{i:02}.md').write_text(f'# {title}\n{source}\n## 章后练习\n\n{exercise_md}', encoding='utf-8')

sections = ''.join(f'<section><h2>第 {volume} 卷 · {label}</h2><ol start="{first}">' + ''.join(
    f'<li><a data-entry="{i}" href="{filename(i)}">{titles[i-1]}</a></li>' for i in range(first, last+1)) + '</ol></section>'
    for volume, (first, last, label) in enumerate(groups, 1))
(DOCS / 'index.html').write_text(page('全书目录', f'<main class="book-home"><p class="eyebrow">LINEAR ALGEBRA</p><h1>{TITLE}</h1><p>从两支箭头出发，逐步理解矩阵如何移动空间，以及如何从数据里找出主要方向。</p><p id="progress"></p><a id="resume" href="chapter-01.html">开始阅读</a>{sections}<p>原稿预告的优化篇尚未提供。当前收录十一章。</p></main>'), encoding='utf-8')
