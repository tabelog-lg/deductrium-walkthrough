#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""同步静态页（404.html）的统一壳层。生成页由 gen_walkthrough.py 直接调用
shell_common.py，不需要本脚本。"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shell_common import nav  # noqa: E402


def sync(path, root, section):
    full = os.path.join(ROOT, path)
    with open(full, encoding='utf-8') as f:
        s = f.read()
    nav_html = nav(root).rstrip('\n').replace(
        '    <header class="site-nav">', '<header class="site-nav">', 1)
    if '<header class="site-nav">' in s:
        s = re.sub(r'<header class="site-nav">.*?</header>', lambda m: nav_html,
                   s, count=1, flags=re.S)
    s = re.sub(r'data-section="[^"]*"', f'data-section="{section}"', s, count=1)
    with open(full, 'w', encoding='utf-8') as f:
        f.write(s)


if __name__ == '__main__':
    sync('404.html', '', 'walkthrough')
    print('已同步 404.html 的统一壳层。')
