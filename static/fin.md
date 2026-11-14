# Fin 自等价数与阶乘（示例占位）

> 这是**精简示例**，替换成真实内容即可。静态文档不参与历史记录、不生成中心页。

## 大体思路

~~~text
Πx:nat,((Fin x)≃(Fin x))≃Fin (factorial x)
~~~

目标是把 `Aut (Fin (succ n))` 分解成 `Aut (Fin n) × Fin (succ n)`，
再对 `n` 做归纳。原文见主页「静态文档」小节的「原文网页 ↗」链接。
