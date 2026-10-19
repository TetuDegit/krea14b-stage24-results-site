"use strict";

const colors = {G0:"#b7c4cc",G1:"#edb5c6",G2:"#8fbce8",G3:"#efa77c",G4:"#b6a5ea",G5:"#e3d184",G6:"#b6f28b"};
const state = {data:null,scene:0,selected:["G0","G4","G6"],mode:"compare",gallery:"G6",videos:[],phase:"idle",target:0,generation:0,animation:null,settlingUntil:0};
const $ = selector => document.querySelector(selector);
const make = (tag,className,text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};
const clock = seconds => {
  const value = Math.max(0,Math.floor(seconds || 0));
  return String(Math.floor(value / 60)).padStart(2,"0") + ":" + String(value % 60).padStart(2,"0");
};
const currentScene = () => state.data.scenes[state.scene];
const methodById = id => state.data.methods.find(method => method.id === id);
const status = message => { $("#status").textContent = message; };

function updateTime(value) {
  const time = Math.max(0,Math.min(20,Number(value) || 0));
  $("#time").textContent = clock(time) + " / 00:20";
  $("#seek").value = String(Math.round(time * 16));
  document.querySelectorAll("[data-time]").forEach(button => {
    const start = Number(button.dataset.time);
    button.classList.toggle("active",time >= start && (time < start + 5 || start === 15));
  });
}
function pauseAll(message,phase = "idle") {
  state.phase = phase;
  if (state.animation !== null) cancelAnimationFrame(state.animation);
  state.animation = null;
  if (state.mode === "compare" && state.videos[0]?.readyState >= 1) state.target = state.videos[0].currentTime;
  state.videos.forEach(video => video.pause());
  updateTime(state.target);
  if (message) status(message);
}
function disposeVideos() {
  pauseAll();
  state.generation++;
  state.videos.forEach(video => {
    video.removeAttribute("src");
    video.load();
  });
  state.videos = [];
}
function jumpTo(seconds) {
  pauseAll();
  state.target = Math.max(0,Math.min(20,seconds));
  state.videos.forEach(video => {
    if (video.readyState >= 1) video.currentTime = state.target;
  });
  updateTime(state.target);
  status("已定位到 " + state.target.toFixed(2) + " 秒；点击同步播放继续。");
}
function tick() {
  if (state.phase !== "playing" || state.mode !== "compare") return;
  const anchor = state.videos[0];
  if (!anchor) return;
  const ready = performance.now() >= state.settlingUntil;
  if (anchor.ended) {
    pauseAll("播放结束。可以更换场景或方法继续比较。");
    return;
  }
  if (ready && state.videos.some(video => video.paused || video.readyState < 3)) {
    pauseAll("一条视频暂停或正在缓冲，已暂停全部。就绪后点击同步播放继续。","buffering");
    return;
  }
  state.target = anchor.currentTime;
  state.videos.slice(1).forEach(video => {
    if (ready && video.readyState >= 3 && Math.abs(video.currentTime - anchor.currentTime) > 0.2) {
      video.currentTime = anchor.currentTime;
    }
  });
  updateTime(state.target);
  state.animation = requestAnimationFrame(tick);
}
async function startTogether() {
  const generation = state.generation;
  const videos = state.videos.slice();
  if (!videos.length || videos.some(video => video.readyState < 1)) {
    status("视频正在加载，读取完成后可同步播放。");
    return;
  }
  if (state.phase === "starting") return;
  state.target = videos[0].ended || videos[0].currentTime >= 19.99 ? 0 : videos[0].currentTime;
  state.phase = "starting";
  status("正在启动所选视频…");
  videos.forEach(video => {
    video.playbackRate = Number($("#speed").value);
    if (Math.abs(video.currentTime - state.target) > 0.02) video.currentTime = state.target;
  });
  try {
    // All play calls originate in this user gesture, before the first await.
    const requests = videos.map(video => video.play());
    await Promise.all(requests);
    if (generation !== state.generation || state.phase !== "starting") return;
    const common = Math.min(...videos.map(video => video.currentTime));
    videos.forEach(video => {
      if (Math.abs(video.currentTime - common) > 0.12) video.currentTime = common;
    });
    state.target = common;
    state.settlingUntil = performance.now() + 700;
    state.phase = "playing";
    status("同步播放中 · 浏览器近似同步；可用共同时间定位。");
    state.animation = requestAnimationFrame(tick);
  } catch (error) {
    if (generation !== state.generation || state.phase !== "starting") return;
    pauseAll("播放尚未就绪，请稍后再次点击同步播放。也可打开原 MP4 单独查看。");
  }
}
function updateReady() {
  const ready = state.mode === "compare" && state.videos.length > 0 &&
    state.videos.every(video => video.readyState >= 1 && !video.error);
  $("#play").disabled = !ready;
  $("#pause").disabled = state.videos.length === 0;
  $("#restart").disabled = !ready;
  $("#seek").disabled = !ready;
}
function makeCard(method,scene,gallery) {
  const generation = state.generation;
  const asset = state.data.videos[scene.id][method.id];
  const card = make("article","video-card");
  card.style.setProperty("--method-color",colors[method.id]);
  const head = make("div","card-head");
  const title = make("div");
  title.append(make("span","card-kicker",gallery ? scene.category + " / " + scene.id : method.category),
    make("h3",null,gallery ? scene.title : method.id + " · " + method.name));
  head.append(title,make("span","card-size","1664 × 960"));
  const video = make("video");
  video.controls = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.src = asset.url;
  video.playbackRate = gallery ? 1 : Number($("#speed").value);
  video.setAttribute("aria-label",method.id + " " + scene.title + " 视频");
  video.addEventListener("loadedmetadata",() => {
    if (generation !== state.generation) return;
    if (!gallery) {
      if (state.target > 0) video.currentTime = state.target;
      updateReady();
    }
  });
  video.addEventListener("waiting",() => {
    if (generation === state.generation && !gallery && state.phase === "playing" &&
        performance.now() >= state.settlingUntil) {
      pauseAll("一条视频正在缓冲，已暂停全部。就绪后点击同步播放继续。","buffering");
    }
  });
  video.addEventListener("error",() => {
    if (generation !== state.generation) return;
    card.classList.add("media-error");
    if (!gallery) {
      pauseAll("视频加载失败：" + method.id + " / " + scene.title + "。可尝试打开原 MP4，或稍后重新选择此场景。");
      updateReady();
    } else {
      card.querySelector(".card-foot > p").textContent = "媒体暂时加载失败，可打开原 MP4 查看。";
    }
  });
  video.addEventListener("ended",() => {
    if (generation === state.generation && !gallery && ["playing","starting"].includes(state.phase)) {
      pauseAll("播放结束。可以更换场景或方法继续比较。");
    }
  });
  if (gallery) video.addEventListener("play",() => {
    if (generation === state.generation) state.videos.filter(other => other !== video).forEach(other => other.pause());
  });
  const foot = make("div","card-foot");
  foot.append(make("p",null,gallery ? scene.prompt + " · seed " + scene.seed : method.description));
  const links = make("div","card-links");
  const open = make("a",null,"原视频 ↗");
  open.href = asset.url;
  open.target = "_blank";
  open.rel = "noopener";
  links.append(open,make("span","card-score","本条六维均分 " + asset.score.toFixed(2)));
  foot.append(links);
  card.append(head,video,foot);
  state.videos.push(video);
  return card;
}
function renderCases() {
  $("#cases").replaceChildren();
  state.data.scenes.forEach((scene,index) => {
    const button = make("button");
    button.type = "button";
    button.setAttribute("aria-pressed",String(index === state.scene));
    button.append(make("span","case-number",String(index + 1).padStart(2,"0") + " / " + scene.category),
      make("span","case-title",scene.title));
    button.addEventListener("click",() => {
      state.scene = index;
      renderCases();
      renderCompare();
    });
    $("#cases").append(button);
  });
}
function renderMethods() {
  $("#methods").replaceChildren();
  state.data.methods.forEach(method => {
    const button = make("button");
    button.type = "button";
    button.setAttribute("aria-pressed",String(state.selected.includes(method.id)));
    button.append(make("strong",null,method.id),document.createTextNode(method.name));
    button.addEventListener("click",() => {
      if (state.selected.includes(method.id)) {
        if (state.selected.length === 1) { status("至少保留一种方法。"); return; }
        state.selected = state.selected.filter(id => id !== method.id);
      } else {
        if (state.selected.length === 3) { status("最多三种并排。先取消一种方法，再选择 " + method.id + "。"); return; }
        state.selected.push(method.id);
      }
      renderMethods();
      renderCompare();
    });
    $("#methods").append(button);
  });
}
function renderCompare() {
  disposeVideos();
  state.target = 0;
  const scene = currentScene();
  $("#scene-counter").textContent = String(state.scene + 1).padStart(2,"0") + " / 06";
  $("#case-prompt").textContent = scene.prompt;
  $("#case-seed").textContent = scene.id + " · seed " + scene.seed;
  $("#cards").replaceChildren();
  $("#cards").style.setProperty("--columns",String(state.selected.length));
  state.data.methods.filter(method => state.selected.includes(method.id)).forEach(method => {
    $("#cards").append(makeCard(method,scene,false));
  });
  $("#gallery-cards").replaceChildren();
  updateTime(0);
  updateReady();
  status("正在读取 " + state.videos.length + " 条视频。就绪后点击同步播放，也可单独使用各播放器。");
}
function renderGallery() {
  disposeVideos();
  const method = methodById(state.gallery);
  $("#gallery-description").textContent = method.description;
  $("#cards").replaceChildren();
  $("#gallery-cards").replaceChildren();
  state.data.scenes.forEach(scene => $("#gallery-cards").append(makeCard(method,scene,true)));
}
function changeView(mode) {
  if (mode === state.mode) return;
  state.mode = mode;
  $("#compare-view").hidden = mode !== "compare";
  $("#gallery-view").hidden = mode !== "gallery";
  $("#compare-tab").classList.toggle("active",mode === "compare");
  $("#gallery-tab").classList.toggle("active",mode === "gallery");
  $("#compare-tab").setAttribute("aria-pressed",String(mode === "compare"));
  $("#gallery-tab").setAttribute("aria-pressed",String(mode === "gallery"));
  if (mode === "compare") renderCompare(); else renderGallery();
}
function renderChart() {
  const metric = $("#metric").value;
  const value = method => metric === "total" ? method.total : method.scores[metric];
  $("#score-chart").replaceChildren();
  [...state.data.methods].sort((a,b) => value(b) - value(a)).forEach(method => {
    const row = make("li");
    row.style.setProperty("--method-color",colors[method.id]);
    const label = make("span","bar-label");
    label.append(make("strong",null,method.id),document.createTextNode(method.name));
    const track = make("div","bar-track");
    const fill = make("div","bar-fill");
    fill.style.width = Math.max(0,Math.min(100,value(method))) + "%";
    track.append(fill);
    row.append(label,track,make("span","bar-value",value(method).toFixed(2)));
    row.setAttribute("aria-label",method.id + " " + method.name + " " + value(method).toFixed(2) + " 分");
    $("#score-chart").append(row);
  });
  $("#metric-note").textContent = metric === "dynamic_degree" ?
    "动态程度 = 达到运动阈值的视频比例 × 100。G6 为 14/24，G4 为 6/24。图形统一以 0—100 为尺度。" :
    "每种方法均为完整 24 条视频的均值。图形统一以 0—100 为尺度，排名不构成显著性结论。";
}
function renderScores() {
  const dimensions = state.data.dimensions.map(dimension => dimension.id);
  const max = Object.fromEntries(dimensions.map(key => [key,Math.max(...state.data.methods.map(method => method.scores[key]))]));
  const top = Math.max(...state.data.methods.map(method => method.total));
  $("#score-body").replaceChildren();
  [...state.data.methods].sort((a,b) => b.total - a.total).forEach(method => {
    const row = make("tr");
    const title = make("td");
    title.append(make("span","method-id",method.id),document.createTextNode(method.name));
    row.append(title);
    const total = make("td");
    total.append(make(method.total === top ? "strong" : "span",null,method.total.toFixed(2)));
    row.append(total);
    dimensions.forEach(key => {
      const cell = make("td");
      cell.append(make(method.scores[key] === max[key] ? "strong" : "span",null,method.scores[key].toFixed(2)));
      row.append(cell);
    });
    $("#score-body").append(row);
  });
  state.data.dimensions.forEach(dimension => {
    const option = make("option",null,dimension.label);
    option.value = dimension.id;
    $("#metric").append(option);
  });
  const g4 = methodById("G4"), g6 = methodById("G6");
  $("#top-score").textContent = g6.total.toFixed(2);
  $("#score-explanation").textContent = "G6 比 G4 高 " + (g6.total - g4.total).toFixed(2) +
    " 分，主要来自动态检测通过数 " + g6.dynamic_count + "/24 对 " + g4.dynamic_count +
    "/24。去掉动态项后，其余五项均分为 G6 " + g6.other_five_mean.toFixed(2) +
    "、G4 " + g4.other_five_mean.toFixed(2) + "。这不能直接解释为所有画质维度更好。";
  renderChart();
}
async function init() {
  try {
    const response = await fetch(new URL("data/experiment.json",document.baseURI),{cache:"no-cache"});
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data = await response.json();
    if (data.methods?.length !== 7 || data.scenes?.length !== 6 || data.protocol?.total_prompts !== 24) {
      throw new Error("展示清单不完整");
    }
    for (const scene of data.scenes) for (const method of data.methods) {
      if (!data.videos?.[scene.id]?.[method.id]?.url) throw new Error("展示视频缺失");
    }
    state.data = data;
    $("#selection-policy").textContent = data.protocol.selection;
    state.data.methods.forEach(method => {
      const option = make("option",null,method.id + " · " + method.name);
      option.value = method.id;
      $("#gallery-method").append(option);
    });
    $("#gallery-method").value = state.gallery;
    $("#gallery-method").addEventListener("change",event => { state.gallery = event.target.value; renderGallery(); });
    $("#compare-tab").addEventListener("click",() => changeView("compare"));
    $("#gallery-tab").addEventListener("click",() => changeView("gallery"));
    $("#play").addEventListener("click",startTogether);
    $("#pause").addEventListener("click",() => pauseAll("已暂停。"));
    $("#restart").addEventListener("click",() => jumpTo(0));
    $("#seek").addEventListener("input",event => jumpTo(Number(event.target.value) / 16));
    $("#speed").addEventListener("change",event => state.videos.forEach(video => { video.playbackRate = Number(event.target.value); }));
    document.querySelectorAll("[data-time]").forEach(button => button.addEventListener("click",() => jumpTo(Number(button.dataset.time))));
    $("#metric").addEventListener("change",renderChart);
    renderCases();
    renderMethods();
    renderScores();
    renderCompare();
  } catch (error) {
    status("展示资料暂时无法读取：" + error.message + "。请刷新重试，或使用 GitHub Release 下载链接。");
  }
}
init();
