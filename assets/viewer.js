/* ==========================================================================
   viewer.js · 攻略存档「按需查看」
   --------------------------------------------------------------------------
   不预生成任何 .md 对应的 HTML：浏览器打开 view.html?f=archives/xxx.md 时，
   才 fetch 那一份 Markdown，用 markdown-it 在客户端渲染；数学公式交给 KaTeX。

   针对 Deductrium 存档的两个特殊处理：
   1) 游戏里 $0 / $1 / $0→$1 是「替换变量」，不是行内公式。若照搬 KaTeX
      默认 $...$ 规则，整篇攻略会被撕碎。因此行内公式走启发式白名单，
      块级 $$...$$ 与 \[...\] 才无条件渲染。
   2) ch6 等文档在首个 $$ 块里用 \newcommand 定义 \U \True \L 等宏，后续
      公式依赖它们；KaTeX 每次 render 的宏不共享，且 \newcommand{\not} 会撞
      内建命令。因此把宏解析成 KaTeX 的 macros 选项（可跨公式、可覆盖内建、
      支持 #1 参数），公式体里剥掉定义命令。
   ========================================================================== */
(function () {
    'use strict';

    var $ = function (s) { return document.querySelector(s); };
    var params = new URLSearchParams(location.search);
    var rawFile = params.get('f') ||
        (location.hash ? decodeURIComponent(location.hash.slice(1)) : '');
    var noMath = params.get('nomath') === '1';

    /* 只允许 archives/ 与 static/ 下的规范 ASCII 文件名，杜绝任意路径读取 */
    var FILE_RE = /^(archives|static)\/[A-Za-z0-9_-]+\.md$/;

    var elBody = $('#md-body');
    var elStatus = $('#md-status');
    var elMeta = $('#md-meta');
    var elTitle = $('#md-title');
    var elToc = $('#md-toc');
    var elDl = $('#md-download');
    var elRaw = $('#md-raw');
    var elMathToggle = $('#md-math-toggle');

    function fail(msg, detail) {
        elStatus.className = 'md-status is-error';
        elStatus.innerHTML = '<strong>' + esc(msg) + '</strong>' +
            (detail ? '<p>' + esc(detail) + '</p>' : '') +
            '<p><a href="index.html">← 返回攻略存档</a></p>';
        elStatus.hidden = false;
        elBody.hidden = true;
    }

    function esc(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    /* 文件名里的 13 位毫秒时间戳 → UTC+8 显示（与 gen_walkthrough.py 口径一致） */
    function fmtTime(name) {
        var m = name.match(/_(\d{13})\.md$/);
        if (!m) return '';
        var ms = Number(m[1]);
        if (!isFinite(ms)) return '';
        var d = new Date(ms + 8 * 3600 * 1000); // 借 UTC getter 读 UTC+8 墙上时间
        return d.getUTCFullYear() + '年' + (d.getUTCMonth() + 1) + '月' + d.getUTCDate() + '日 ' +
            d.getUTCHours() + ':' + String(d.getUTCMinutes()).padStart(2, '0');
    }

    /* ---------- 1. 保护代码块 / 行内代码，避免里面的 $ 被当成公式 ---------- */
    function maskCode(src, bag) {
        // fenced：``` 或 ~~~，允许带语言名；多行
        src = src.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, function (m) {
            var i = bag.push(m) - 1;
            return '\n\nZZCODESEG' + i + 'ZZ\n\n';
        });
        // inline：`...`
        src = src.replace(/`[^`\n]+`/g, function (m) {
            var i = bag.push(m) - 1;
            return 'ZZCODESEG' + i + 'ZZ';
        });
        return src;
    }

    function unmaskCode(src, bag) {
        return src.replace(/ZZCODESEG(\d+)ZZ/g, function (_, i) { return bag[+i] || ''; });
    }

    /* ---------- 2. 抽出数学片段，用占位符顶替 ---------- */
    function extractMath(src, segs) {
        function push(kind, tex) {
            var i = segs.push({ kind: kind, tex: tex }) - 1;
            return 'ZZMATHSEG' + i + 'ZZ';
        }
        // 块级 $$...$$（含 \newcommand 定义块）
        src = src.replace(/\$\$([\s\S]*?)\$\$/g, function (_, tex) {
            return '\n\n' + push('block', tex.trim()) + '\n\n';
        });
        // 块级 \[...\]
        src = src.replace(/\\\[([\s\S]*?)\\\]/g, function (_, tex) {
            return '\n\n' + push('block', tex.trim()) + '\n\n';
        });
        // 行内 $...$：启发式，只对「看起来真像 LaTeX」的片段生效
        src = src.replace(/(?<!\$)\$([^$\n]+)\$(?!\$)/g, function (m, inner) {
            if (noMath || !isInlineMath(inner)) return m;
            return push('inline', inner.trim());
        });
        return src;
    }

    function isInlineMath(s) {
        if (/^\d/.test(s)) return false;                    // $0 $1 等替换变量
        if (/\s/.test(s)) return false;                     // 含空格多为游戏表达式
        if (/[→><|~&∧∨¬⊢￫≃≔]/.test(s)) return false;     // 游戏逻辑符号
        if (s.length > 40) return false;
        if (/^\\[A-Za-z]/.test(s)) return true;            // \False \rfl \Uz ...
        return /^[A-Za-z][A-Za-z0-9]*(?::[A-Za-z][A-Za-z0-9]*)?$/.test(s); // a / A / a:A
    }

    /* ---------- 3. \newcommand 收集为 KaTeX macros 表 ----------
       直接把定义命令留在公式里会踩两个坑：KaTeX 每次 render 的宏不共享，且
       \newcommand{\not} 想覆盖内建命令会报 "use \renewcommand"。
       改为解析成 macros 选项：既跨公式生效，又能覆盖内建宏，还支持 #1 参数。 */
    function scanNewcommands(tex, macros) {
        var re = /\\(?:newcommand|renewcommand)\*?/g, m;
        while ((m = re.exec(tex)) !== null) {
            var start = m.index;
            var p = tex.indexOf('{', start);
            if (p === -1 || p - start > 24) continue;
            var nameEnd = matchBrace(tex, p);
            if (nameEnd === -1) continue;
            var name = tex.slice(p + 1, nameEnd);   // 形如 \U
            var q = nameEnd + 1;
            if (tex[q] === '[') {                    // 可选参数个数 [1]
                var rb = tex.indexOf(']', q);
                if (rb !== -1) q = rb + 1;
            }
            var b = tex.indexOf('{', q);
            if (b === -1 || b - q > 8) continue;
            var bodyEnd = matchBrace(tex, b);
            if (bodyEnd === -1) continue;
            macros[name] = tex.slice(b + 1, bodyEnd); // 后者覆盖前者
            re.lastIndex = bodyEnd + 1;
        }
    }

    function matchBrace(s, open) {
        var depth = 0;
        for (var i = open; i < s.length; i++) {
            if (s[i] === '\\') { i++; continue; }
            if (s[i] === '{') depth++;
            else if (s[i] === '}') { depth--; if (depth === 0) return i; }
        }
        return -1;
    }

    function stripNewcommands(tex) {
        var re = /\\(?:newcommand|renewcommand)\*?/g, m;
        var out = '', last = 0;
        while ((m = re.exec(tex)) !== null) {
            var p = tex.indexOf('{', m.index);
            if (p === -1 || p - m.index > 24) continue;
            var nEnd = matchBrace(tex, p);
            if (nEnd === -1) continue;
            var q = nEnd + 1;
            if (tex[q] === '[') { var rb = tex.indexOf(']', q); if (rb !== -1) q = rb + 1; }
            var b = tex.indexOf('{', q);
            if (b === -1 || b - q > 8) continue;
            var bEnd = matchBrace(tex, b);
            if (bEnd === -1) continue;
            out += tex.slice(last, m.index);
            last = bEnd + 1;
            re.lastIndex = last;
        }
        return out + tex.slice(last);
    }

    /* ---------- 4. 用 DOM 回填占位符（textContent 赋值，天然防注入） ---------- */
    function restoreMath(root, segs) {
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
        var nodes = [], n;
        while ((n = walker.nextNode())) nodes.push(n);
        var re = /ZZMATHSEG(\d+)ZZ/g;
        nodes.forEach(function (node) {
            var txt = node.nodeValue;
            if (txt.indexOf('ZZMATHSEG') === -1) return;
            var frag = document.createDocumentFragment(), last = 0, m;
            re.lastIndex = 0;
            while ((m = re.exec(txt)) !== null) {
                if (m.index > last) frag.appendChild(document.createTextNode(txt.slice(last, m.index)));
                var seg = segs[+m[1]];
                if (seg && seg.tex) {
                    var sp = document.createElement('span');
                    sp.className = seg.kind === 'block' ? 'md-math-block' : 'md-math-inline';
                    sp.textContent = seg.kind === 'block'
                        ? '$$' + seg.tex + '$$'
                        : '\\(' + seg.tex + '\\)';
                    frag.appendChild(sp);
                }
                last = re.lastIndex;
            }
            if (last < txt.length) frag.appendChild(document.createTextNode(txt.slice(last)));
            node.parentNode.replaceChild(frag, node);
        });
    }

    function buildToc(root) {
        var hs = root.querySelectorAll('h2, h3');
        if (!hs.length) { elToc.hidden = true; return; }
        var html = '<div class="md-toc__title">本页目录</div><ul>';
        Array.prototype.forEach.call(hs, function (h, i) {
            if (!h.id) h.id = 'sec-' + i;
            html += '<li class="md-toc__' + h.tagName.toLowerCase() + '">' +
                '<a href="#' + h.id + '">' + esc(h.textContent) + '</a></li>';
        });
        elToc.innerHTML = html + '</ul>';
        elToc.hidden = false;
    }

    /* ---------- 主流程 ---------- */
    if (!rawFile || !FILE_RE.test(rawFile) || rawFile.indexOf('..') !== -1) {
        fail('没有指定有效的存档文件',
             '正确的地址形如 view.html?f=archives/ch1_1793907529136.md；仅接受 archives/ 与 static/ 下的文件。');
        return;
    }

    var shortName = rawFile.split('/').pop();
    document.title = shortName + ' · 攻略存档';
    elTitle.textContent = shortName;
    elDl.href = rawFile;
    elDl.setAttribute('download', shortName);
    elRaw.href = rawFile;

    var metaBits = [];
    var t = fmtTime(shortName);
    if (t) metaBits.push(t);
    elMeta.textContent = metaBits.join(' · ');

    elMathToggle.textContent = noMath ? '公式：关（点击开启）' : '公式：开（点击关闭）';
    elMathToggle.addEventListener('click', function () {
        var u = new URL(location.href);
        if (noMath) u.searchParams.delete('nomath'); else u.searchParams.set('nomath', '1');
        location.href = u.toString();
    });

    /* ★ 每次都回源取当前部署的那一份 .md。
       早期版本用 `cache: 'force-cache'`，浏览器会一直复用第一次看到的旧文件：
       仓库里的存档被替换/覆盖、Pages 也重新部署了，页面却仍显示旧内容（例如示例文档），
       而且连一个网络请求都不发，极难察觉。
       时间戳让 URL 每次不同（破浏览器 / CDN 的 URL 级缓存），no-store 禁止条件请求。
       代价是每次查看多一次全量下载（中位 15 KB、最大 130 KB），存档站完全可接受。
       下载 / 原文按钮仍是直链，不受影响。 */
    var mdUrl = encodeURI(rawFile) + '?v=' + Date.now();
    fetch(mdUrl, { cache: 'no-store' })
        .then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.text();
        })
        .then(function (text) {
            if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1); // 去 BOM
            elMeta.textContent = (t ? t + ' · ' : '') +
                text.length.toLocaleString('zh-CN') + ' 字符 · 按需渲染（未预生成 HTML）';

            /* markdown-it：html:false 是关键 —— 存档里的 <Esc> <a1> <s> 等
               多为游戏记号而非 HTML，转义显示才不丢内容，同时杜绝 XSS */
            var md = window.markdownit({
                html: false, linkify: true, breaks: false, typographer: false
            });
            var defaultLink = md.renderer.rules.link_open || function (tokens, idx, opts, env, self) {
                return self.renderToken(tokens, idx, opts);
            };
            md.renderer.rules.link_open = function (tokens, idx, opts, env, self) {
                var tok = tokens[idx], href = tok.attrGet('href') || '';
                if (/^https?:\/\//i.test(href)) {
                    tok.attrSet('target', '_blank');
                    tok.attrSet('rel', 'noopener noreferrer');
                } else if (/\.md($|[#?])/i.test(href)) {
                    var m = href.match(/(?:^|\/)((?:archives|static)\/[A-Za-z0-9_-]+\.md)(?:[#?]|$)/);
                    if (m) tok.attrSet('href', 'view.html?f=' + encodeURIComponent(m[1]));
                }
                return defaultLink(tokens, idx, opts, env, self);
            };

            var codeBag = [], segs = [];
            var src = maskCode(text, codeBag);
            src = extractMath(src, segs);
            src = unmaskCode(src, codeBag);

            /* 把 \newcommand 提取成全局 macros，公式体里只留实际内容 */
            var macros = {};
            if (!noMath) {
                segs.forEach(function (s) {
                    if (s.kind === 'block') scanNewcommands(s.tex, macros);
                });
                segs.forEach(function (s) {
                    if (s.kind !== 'block') return;
                    s.tex = stripNewcommands(s.tex).trim();  // 纯定义块置空，restoreMath 会跳过
                });
            }

            elBody.innerHTML = md.render(src);
            restoreMath(elBody, segs);

            if (!noMath && window.renderMathInElement && window.katex) {
                try {
                    window.renderMathInElement(elBody, {
                        delimiters: [
                            { left: '$$', right: '$$', display: true },
                            { left: '\\(', right: '\\)', display: false }
                        ],
                        ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option'],
                        macros: macros,
                        throwOnError: false,
                        strict: false,
                        trust: true,
                        errorColor: '#c0392b'
                    });
                } catch (e) {
                    console.warn('[viewer] KaTeX 渲染跳过：', e);
                }
            }

            buildToc(elBody);
            elStatus.hidden = true;
            elBody.hidden = false;

            /* 代码块一键复制 */
            Array.prototype.forEach.call(elBody.querySelectorAll('pre'), function (pre) {
                var btn = document.createElement('button');
                btn.className = 'md-copy';
                btn.type = 'button';
                btn.textContent = '复制';
                btn.addEventListener('click', function () {
                    navigator.clipboard.writeText(pre.innerText).then(function () {
                        btn.textContent = '已复制';
                        setTimeout(function () { btn.textContent = '复制'; }, 1500);
                    });
                });
                pre.appendChild(btn);
            });
        })
        .catch(function (e) {
            fail('无法读取该存档', e.message + ' —— 文件可能已被移动或删除。');
        });
})();
