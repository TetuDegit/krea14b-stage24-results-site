# Krea 14B 七种方法视频对照

公开展示 Krea Realtime Video 14B 在 2× 空间分辨率下的 G0—G6 阶段结果。

- 网站：https://tetudegit.github.io/krea14b-stage24-results-site/
- 视频 Release：https://github.com/TetuDegit/krea14b-stage24-results-site/releases/tag/stage24-20261018-v1
- 本仓库仅含展示网页、经过筛选的案例资料、结果均值与媒体校验清单。

## 展示视频

七种方法各展示六条，共 42 条原始 MP4。每条视频宽 1664、高 960，16 fps，20 秒，320 帧。视频存放于同一仓库的 Release 附件，不进入普通 Git 历史。网页支持同场景最多三种方法的近似同步比较，以及按方法查看全部六条视频。

| 配对案例 | 场景 | Prompt | Seed |
| --- | --- | --- | ---: |
| vbench_01 | 人物运动 | a person playing golf | 610001 |
| vbench_07 | 多人互动 | people carving a pumpkin | 610007 |
| vbench_13 | 动物 | spider making a web | 610013 |
| vbench_19 | 车辆交通 | train arriving at a station | 610019 |
| vbench_25 | 自然场景 | burning slash piles in the forest | 610025 |
| vbench_43 | 复杂运动 | fireworks display in the sky at night | 610043 |

选择规则是上述六个研究分层在阶段清单中的首条。七种方法使用同样的六个 prompt/seed，没有按生成质量或分数挑选。这六条不覆盖全部八个研究分层。

## 方法与完整评分

**评分来自每方法完整 24 条配对视频，展示视频仅六条。** 每条视频六个归一化维度等权平均，再对 24 条视频等权平均；下表统一乘以 100。这是项目自定义综合分，不是官方 VBench 总分。

| 方法 | 名称 | 六维综合分 |
| --- | --- | ---: |
| G0 | Pillow bicubic 插值 | 73.06 |
| G1 | CineScale 的 Krea 适配 | 69.91 |
| G2 | FreeSwim 的 Krea 适配 | 73.23 |
| G3 | SuperGen 的 Krea 适配 | 73.39 |
| G4 | Direct 2× | 73.76 |
| G5 | 首次 1× 预测后转 2× v3 | 72.07 |
| G6 | MemRoPE 的 Krea 适配 | 79.28 |

六项维度为主体一致性、背景一致性、运动平滑度、动态程度、美学质量、成像质量。各方法均有完整 24 × 6 项有效评分。

G6 的综合分优势主要来自动态检测通过数 14/24，而 G4 为 6/24。动态程度是运动阈值的二元检测通过比例，不保证动作真实性。去掉动态项后，其余五项参考均分为 G6 83.47、G4 83.51；这一诊断不替代原定六维评分。

G1—G3 是论文方法在 Krea 五步因果生成上的适配，不代表原论文的数值等价复现。G5 为当前 v3。G6 保留最初块的 sink，并同时改变历史容量、KV 更新方式和 RoPE，不能把差异仅归因于 EMA 或移除首帧。

CLIP 背景一致性和美学质量使用项目定制的整帧 224×224 缩放，其它维度使用各自预处理。本轮只展示 Full 六维结果，不混入旧试运行、裁剪、分段或 VBench-Long 分数。

## 文件

- index.html、styles.css、app.js：无构建依赖的静态网页。
- data/experiment.json：网页案例、选定视频引用和完整 24 样本的评分均值。
- data/scores.csv：七种方法的六维评分表，单位为原始归一化分数乘以 100。
- media_checksums.tsv：42 件附件的唯一文件名、字节数与 SHA-256。

网页与 Release 附件公开可访问。同步播放受网络与浏览器解码影响，为近似同步。原始结果未做网页专用转码、修复或画质增强；数值评分需要结合结构、细节、颜色、接缝和真实运动观察。
