#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""独立仓库「deductrium-walkthrough」的全站壳层模板。

gen_walkthrough.py 与 sync-shell.py 都从这里取顶栏 / 面包屑 / 页脚。
与原站的区别：攻略存档已提到仓库根目录，因此 root 只有 '' 与 '../' 两种；
原站的「工具 / Googology / Deductrium / 归档」改为指向主站的绝对外链，
保证独立仓库里不产生任何死链。
"""
from html import escape

REPO_NAME = 'deductrium-walkthrough'
REPO_URL = 'https://github.com/tabelog-lg/' + REPO_NAME
SITE_URL = 'https://tabelog-lg.github.io/deductrium/'
PAGES_URL = 'https://tabelog-lg.github.io/' + REPO_NAME + '/'


def nav(root):
    """生成固定顶栏。root 是「本页 → 仓库根」的相对前缀。"""
    return f'''    <header class="site-nav">
        <a class="site-nav__brand" href="{root}index.html">
            <span class="site-nav__mark">t</span>
            <span>攻略<span class="site-nav__dot">.</span>存档</span>
        </a>
        <nav class="site-nav__links" aria-label="主导航">
            <a href="{root}index.html" data-nav="walkthrough">存档主页</a>
            <a href="{root}index.html#docs" data-nav="docs">文档中心</a>
            <a href="{SITE_URL}" data-nav="deductrium" target="_blank" rel="noopener">Deductrium 主站 ↗</a>
        </nav>
        <a class="site-nav__repo" href="{REPO_URL}" target="_blank" rel="noopener">GitHub ↗</a>
    </header>
'''


def crumb(root, items):
    """生成面包屑。items 为 [(文字, 链接或 None), ...]，最后一项为当前页。
    root 仅为兼容调用签名保留；层级完全由 items 显式给出，避免重复。"""
    parts = []
    for i, (label, href) in enumerate(items):
        if i:
            parts.append(f'<span class="sep">›</span>')
        if href:
            parts.append(f'<a href="{escape(href)}">{escape(label)}</a>')
        else:
            parts.append(f'<span class="cur">{escape(label)}</span>')
    return '        <div class="site-crumb">\n            ' + ''.join(parts) + '\n        </div>\n'


def footer(root):
    """生成静态统一页脚（site.js 检测到后不会重复注入）。"""
    return f'''        <footer class="site-footer">
            <span>© 2026 tabelog-lg · Deductrium 攻略存档</span>
            <span class="site-footer__links">
                <a href="{root}index.html">存档主页</a>
                <a href="{root}index.html#docs">文档中心</a>
                <a href="{SITE_URL}" target="_blank" rel="noopener">Deductrium 主站 ↗</a>
                <a href="{REPO_URL}" target="_blank" rel="noopener">GitHub ↗</a>
            </span>
        </footer>
'''
