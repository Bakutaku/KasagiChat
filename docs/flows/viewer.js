// 外部通信・外部ライブラリ不要。資料内の移動と説明の切り替えだけを行う。
const {features, decisions} = JSON.parse(document.getElementById('flow-data').textContent);
const labels = {existing:'実装あり', planned:'設計・未実装', discuss:'要検討'};
const actors = ['画面 / Next.js','処理 / Spring Boot','保存 / PostgreSQL','外部 / OAuth・LLM'];
const escapeText = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const badge = state => `<span class="badge ${state}">${labels[state]}</span>`;
const view = document.getElementById('view');
let activeFeature = null;
let activeStep = 0;

function navLink(id, title, index='') {
  return `<a class="navlink" href="#${id}"><span>${index}</span>${title}</a>`;
}
let nav = navLink('overview','全体像','00');
let group = '';
features.forEach((f,i) => {
  if (group !== f.group) { group = f.group; nav += `<p class="navgroup">${group}</p>`; }
  nav += navLink(f.id,f.title,String(i+1).padStart(2,'0'));
});
nav += '<p class="navgroup">設計を見直す</p>' + navLink('data','データのつながり','13') + navLink('roadmap','実装順・保留事項','14');
document.getElementById('navigation').innerHTML = nav;

function sourceLink(source) {
  const [kind, ...rest] = source.split(':');
  const name = rest.join(':');
  const target = kind === 'F' ? '../'+name : kind === 'R' ? '../../KasagiChat-Background/'+name : '../../KasagiChat-Background/src/main/java/com/kasagichat/api/'+name;
  return `<a href="${encodeURI(target)}">${kind === 'F' ? 'Frontend' : 'Backend'} / ${escapeText(name)}</a>`;
}
function apiTable(f) {
  return `<div class="table-wrap"><table class="table"><thead><tr><th>操作</th><th>API / 接続点</th><th>状態</th><th>役割</th></tr></thead><tbody>${f.apis.map(a=>`<tr><td>${a[0]}</td><td><code>${escapeText(a[1])}</code></td><td>${badge(a[2])}</td><td>${escapeText(a[3])}</td></tr>`).join('')}</tbody></table></div>`;
}
function details(f) {
  return `<h2>保存と失敗時の動き</h2><div class="detailgrid"><article class="detailbox"><h3>何が保存・更新される？</h3><p>${escapeText(f.data)}</p></article><article class="detailbox"><h3>失敗・離脱・再操作</h3><p>${escapeText(f.failure)}</p></article></div><h2>変更できる設計ポイント ${badge('discuss')}</h2><ul class="decision-list">${f.decisions.map(d=>`<li>${escapeText(d)}</li>`).join('')}</ul><h2>APIとの対応</h2>${apiTable(f)}`;
}
function overview() {
  return `<p class="eyebrow">00 / 全体像</p><h1>画面の操作から、<br>分身の成長と出会いまで。</h1><p class="lead">12の機能を、担当・データ・AIの呼び出しタイミングで整理しました。まず全体を見て、気になる機能の図を開いてください。</p>
  <div class="current"><strong>この資料の読み方</strong>「実装あり」は現在のコードがあるという意味で、動作保証や確定設計を意味しません。図は実装済みの部分を含む目標フローです。仮実装も変更可能として扱います。</div>
  <div class="architecture"><article class="card"><small>01 / 操作する</small><h3>ブラウザ・画面</h3><p>Next.js<br>入力・描画・移動・演出<br>APIへ操作を送る</p></article><article class="card"><small>02 / 判断する</small><h3>Spring Boot</h3><p>認証・所有者確認<br>会話の状態・EXP・相性<br>DBと外部AIを呼び分ける</p></article><article class="card"><small>03 / 覚えておく</small><h3>PostgreSQL</h3><p>会話・プロフィール<br>参加・カード・実績<br>次回も同じ結果を返す</p></article><article class="card"><small>別経路 / 生成する</small><h3>LLMプロバイダ</h3><p>Springから必要時に呼ぶ<br>返答・振り返り・報告<br>EXP・相性は決めない</p></article></div>
  <p class="note">通信の分岐：画面 → Spring → DB、または Spring → LLM → Spring。DBがLLMを呼ぶ構成ではありません。/api・OAuth経路を同一オリジンで転送し、ビジネスロジックはSpringに集約します。</p>
  <h2>ユーザーがたどる道</h2><div class="journey"><a href="#auth">ログイン・規約</a><span>→</span><a href="#credentials">キー設定</a><span>→</span><a href="#birth">NPC誕生</a><span>→</span><a href="#home">家</a><span>⇄</span><a href="#practice">練習</a><span>→</span><a href="#review">振り返り</a><span>→</span><a href="#events">イベント</a><span>→</span><a href="#cards">カード</a></div>
  <div class="branch"><div><strong>会話開始は AI 0回</strong>保存した冒頭を表示。送信で初めて返答を生成する。</div><div><strong>成長は振り返り成功時</strong>ログ → 学習 → 機械計算 → 一括保存。表示だけでは加算しない。</div><div><strong>イベント参加は AI 0回</strong>相性を計算して表面を配布。「開く」で報告を生成する。</div></div>
  <h2>機能ごとの処理フロー</h2><div class="tilegrid">${features.map((f,i)=>`<a class="featuretile card" href="#${f.id}"><small>${String(i+1).padStart(2,'0')} / ${f.group} · ${f.priority}</small><h3>${f.title} →</h3><p>${f.lead}</p></a>`).join('')}</div>
  <h2>どこまであるか</h2><div class="table-wrap"><table class="table"><thead><tr><th>対象</th><th>現時点の状態</th><th>次につなぐもの</th></tr></thead><tbody><tr><td>フロント</td><td>ログイン・規約登録・ヘッダー。/home は仮表示</td><td>キー設定、誕生、家、会話、イベント画面</td></tr><tr><td>バックエンド</td><td>認証、NPC/話題、報酬受取、通知、利用概算のAPI</td><td>LLM基盤、会話/振り返り、参加/マッチング/開封</td></tr><tr><td>DBモデル</td><td>会話・イベント・カード等のEntityは存在</td><td>操作を実現するServiceと競合制御、DB移行</td></tr></tbody></table></div>
  <h2>資料の基準</h2><p class="note">確認日：2026-09-13。Frontend: main / 70672ba。Backend: codex/npc-growth-usage-api / 7eaa4bd。両方とも作業中の変更を含めて確認。別ブランチの試作品は含めません。</p><p class="note">機能要件は requirements.md を優先。API設計はバックエンドREADME、現在の挙動はソースコードで確認。idea.mdの古い口調サンプル表現は、最新要件の「口調の文章」に読み替えています。インフラは要件上の予定でありデプロイ確認ではありません。</p><div class="sources">${sourceLink('F:requirements.md')}${sourceLink('F:idea.md')}${sourceLink('R:README.md')}</div>`;
}
function diagram(f) {
  const rowHeight=92;
  const points=f.steps.map((s,i)=>({x:125+250*s[0],y:i*rowHeight+46}));
  const paths=points.slice(1).map((p,i)=>{
    const from=points[i], mid=(from.y+p.y)/2;
    return `<path d="M ${from.x} ${from.y+31} V ${mid} H ${p.x} V ${p.y-34}"/>`;
  }).join('');
  return `<div class="flow-scroll"><div class="swim"><div class="lane-head">${actors.map((a,i)=>`<div>${a.split(' / ')[0]}<small>${a.split(' / ')[1]}${i===3?'（利用時のみ）':''}</small></div>`).join('')}</div><div class="flow-steps"><svg class="connectors" viewBox="0 0 1000 ${f.steps.length*rowHeight}" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="#8da195"/></marker></defs><g fill="none" stroke="#8da195" stroke-width="1.7" marker-end="url(#arrow)">${paths}</g></svg>${f.steps.map((s,i)=>`<div class="step-row"><button class="flow-step" style="grid-column:${s[0]+1}" data-step="${i}" data-state="${s[3]}" aria-pressed="${i===0}" aria-controls="step-detail" aria-label="ステップ${i+1} ${escapeText(s[1])}"><b>${i+1}</b>${escapeText(s[1])}<em>${labels[s[3]]}</em></button></div>`).join('')}</div></div></div>`;
}
function featurePage(f) {
  const i=features.indexOf(f);
  return `<p class="eyebrow">${String(i+1).padStart(2,'0')} / ${f.group} · ${f.priority}</p><h1>${f.title}</h1><p class="lead">${f.lead}</p><div class="current"><strong>いま、どこまで実装されている？</strong>${escapeText(f.current)}</div><h2>操作から結果まで</h2><p class="note">上から下へ処理が進みます。枠の列が担当です。各枠を選ぶと、入力・判断・保存内容を確認できます。成功時の基本経路を示し、分岐・失敗は下段に整理しています。</p><div class="flow-layout">${diagram(f)}<aside id="step-detail" class="step-detail" aria-live="polite"></aside></div>${details(f)}<details class="sources"><summary>確認した実装・要件ファイル</summary><p>ソースリンクは2リポジトリが隣接した配置で開けます。HTML単体でも図・説明はすべて閲覧できます。</p>${f.sources.map(sourceLink).join('')}</details><div class="page-actions"><a class="btn btn-sm" href="#${i?features[i-1].id:'overview'}">← 前の機能</a><a class="btn btn-sm" href="#${i<features.length-1?features[i+1].id:'data'}">次の機能 →</a></div>`;
}
function selectStep(index) {
  if (!activeFeature) return;
  activeStep=Math.max(0,Math.min(index,activeFeature.steps.length-1));
  const step=activeFeature.steps[activeStep];
  document.querySelectorAll('[data-step]').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.step)===activeStep)));
  document.getElementById('step-detail').innerHTML=`<p class="number">${String(activeStep+1).padStart(2,'0')} <small>/ ${activeFeature.steps.length}</small></p>${badge(step[3])}<h3 style="margin-top:14px">${escapeText(step[1])}</h3><small>担当：${actors[step[0]]}</small><p>${escapeText(step[2])}</p><div class="step-actions"><button class="btn btn-sm" data-move="-1" ${activeStep===0?'disabled':''}>← 前へ</button><button class="btn btn-sm" data-move="1" ${activeStep===activeFeature.steps.length-1?'disabled':''}>次へ →</button></div>`;
}
function dataPage() {
  const rows=[['本人・ログイン','users ← user_auth / user_terms_agreement。仮登録はpending_users、セッションはJDBCで保持。'],['AIの接続設定','users → api_credentials / demo_usages。運営側にdemo_passphrasesと接続先設定。'],['分身の記憶','users → npcs → topics → topic_categories。具体的な要約Memoryは仮モデルあり・要件未反映。'],['会話の記録','users → conversations → messages。opening_idはconversation_openings、daily_question_idはdaily_questions。'],['成長・報酬','users → achievement_counters / achievements / unlocked_items / growth_events。数値や閾値はマスタ。'],['イベントと報告','events → event_participants。cardsはイベント・受取人・相手を参照し、開封結果を保持。']];
  return `<p class="eyebrow">13 / データのつながり</p><h1>同じデータが、<br>次の体験につながる。</h1><p class="lead">完全なER図ではなく、機能を追うための関係図です。テーブルが存在しても、そこへ保存する処理は未実装の場合があります。</p>${rows.map(r=>`<div class="data-row"><strong>${r[0]}</strong><span>→</span><p>${r[1]}</p></div>`).join('')}<h2>会話後に広がる3つの道</h2><div class="branch"><div><strong>人格・口調 → 次の会話</strong>ユーザーらしさを反映。家から本人が修正できる。</div><div><strong>話題 → 部屋と出会い</strong>家では品物を表示。イベントには公開話題だけ使う。</div><div><strong>次の質問 → 翌回の家</strong>保存済みの質問を表示し、DAILY会話につなぐ。</div></div><h2>似ているが別の状態</h2><div class="table-wrap"><table class="table"><thead><tr><th>対象</th><th>進む状態</th><th>混同しない点</th></tr></thead><tbody><tr><td>NPC</td><td>未作成 → 作成済み/未誕生 → 誕生済み</td><td>POST /npcだけでは誕生完了ではない</td></tr><tr><td>会話</td><td>IN_PROGRESS → FINISHED → REVIEWED</td><td>未振り返りは前2つ。途中会話からの手動reviewも扱う</td></tr><tr><td>カード</td><td>未開封 → 生成成功・保存済み</td><td>処理中の予約状態は設計追加候補</td></tr><tr><td>実績と通知</td><td>達成 → 報酬受取 / 未読 → 既読</td><td>既読にしてもアイテムは受け取らない</td></tr></tbody></table></div><h2>正本を置く場所</h2><div class="detailgrid"><div class="detailbox"><h3>要件・契約</h3><p>requirements.mdが体験とルール、バックエンドREADMEがAPI契約。本資料はそれらをつなぐ説明資料。変更時は正本から直す。</p></div><div class="detailbox warn"><h3>現コードとの差を残す</h3><p>Memoryは追加候補、口調サンプルは旧記述、利用コストは仮計算。差を消して「実装済み仕様」として統合しない。</p></div></div>`;
}
function roadmapPage() {
  const phases=[['認証 → キー設定 → 未誕生NPC','初回進捗で画面を振り分け、キー登録・削除・デモ制限をつなぐ。到達点：本人がAIを利用する準備を完了できる。'],['1往復 → 振り返り → 家','共通LLMアダプタ、会話ログ、再送/排他、振り返りの一括反映を実装。到達点：再読み込みしても会話と成長が残る。'],['誕生・3シーン・今日のひとこと','共通会話を各入口につなぎ、部屋の品物・実績・報酬へ接続。到達点：途中離脱と手動再開まで一通り体験できる。'],['イベント → マッチング → カード','招待復帰、参加、相互カード、遅延生成、退出/終了を接続。到達点：一人でもデモイベントから報告を開ける。'],['Shouldと提出環境','着せ替え（スパイク後判断）・図鑑・実usageによるコスト表示。動画撮影前までにデプロイ/CI/CDと復旧確認。']];
  return `<p class="eyebrow">14 / 実装順・保留事項</p><h1>部品を増やすより、<br>1つの体験を最後までつなぐ。</h1><p class="lead">日付を固定しない実装順の提案です。バックエンドの仮実装は、次の体験に接続する段階で見直します。</p>${phases.map((p,i)=>`<article class="phase"><span>${i+1}</span><div><h3>${p[0]}</h3><p>${p[1]}</p></div></article>`).join('')}<h2>未確定の設計・確認リスト</h2><div class="table-wrap"><table class="table"><thead><tr><th>時期</th><th>論点</th><th>決めること</th></tr></thead><tbody>${decisions.map(d=>`<tr><td>${d[0]}</td><td><a href="#${d[3]}">${d[1]} →</a></td><td>${d[2]}</td></tr>`).join('')}</tbody></table></div><h2>後で扱う範囲</h2><div class="detailgrid"><article class="detailbox"><h3>Should / Could</h3><p>Should：着せ替え・図鑑・コスト表示。API設計では早期アーカイブもS。Could：AI名刺、オンライン広場、エモート、同カテゴリの品のグレードアップ、会場追加、長話リマインド。これらの詳細フロー/APIは未確定。</p></article><article class="detailbox"><h3>コンテスト版の対象外</h3><p>音声、UE/VR、スマホアプリ、ローカルAIの製品機能、画像生成、NPC自律生活、家の訪問、追加練習、収益化、embedding。開発時のLM Studio利用は製品のローカルAI機能とは別。</p></article></div><h2>運用も1本の流れとして確認する</h2><div class="journey"><a href="#roadmap">GitHubへの変更</a><span>→</span><a href="#roadmap">画面 / APIを配信</a><span>→</span><a href="#roadmap">OAuth・Cookie確認</a><span>→</span><a href="#roadmap">DB・AIの接続確認</a><span>→</span><a href="#roadmap">バックアップ・復旧</a></div><p class="note">要件の予定構成：Amplify Hosting → /api等をApp Runnerへ転送、Spring → Supabase PostgreSQL。APIはActions → ECR → App Runner。日次バックアップはpg_dump → S3。価格・各サービス仕様・稼働状況は今回調査していません。</p><h2>実装時に確認したい代表ケース</h2><ul class="decision-list"><li>同じ発言の二重送信、振り返り再送、カード開封連打で保存・EXP・生成が重複しない。</li><li>生成失敗と「保存成功後に応答が途切れた」を区別し、保存済み結果を復元できる。</li><li>他人の会話・話題・カードを指定しても操作できない。</li><li>公開話題を非公開にした後、未開封カードの入力や表面に漏れない。</li><li>同時参加・退出・終了、デモ残量の同時消費でも状態が矛盾しない。</li></ul>`;
}
function render() {
  const id=location.hash.slice(1)||'overview';
  activeFeature=features.find(f=>f.id===id)||null;
  const actual=activeFeature?id:['data','roadmap'].includes(id)?id:'overview';
  view.innerHTML=activeFeature?featurePage(activeFeature):actual==='data'?dataPage():actual==='roadmap'?roadmapPage():overview();
  document.querySelectorAll('.navlink').forEach(a=>a.getAttribute('href')==='#'+actual?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current'));
  if(activeFeature) selectStep(0);
  document.title=`${activeFeature?.title || {overview:'全体像',data:'データのつながり',roadmap:'実装順・保留事項'}[actual]} | KasagiChat 処理フロー`;
  window.scrollTo(0,0);
}
view.addEventListener('click',event=>{
  const step=event.target.closest('[data-step]');
  if(step) selectStep(Number(step.dataset.step));
  const move=event.target.closest('[data-move]');
  if(move){const delta=Number(move.dataset.move);selectStep(activeStep+delta);const next=document.querySelector(`#step-detail [data-move="${delta}"]:not(:disabled)`)||document.querySelector('#step-detail [data-move]:not(:disabled)');next?.focus();}
});
function buildPrint() {
  document.getElementById('print-area').innerHTML=`<section>${overview()}</section>${features.map((f,i)=>`<section><h2>${String(i+1).padStart(2,'0')} / ${f.title}</h2><p>${f.lead}</p><div class="current">現状：${f.current}</div><div class="print-flow">${f.steps.map((s,n)=>`<div class="print-step"><small>${n+1} → ${actors[s[0]]} / ${labels[s[3]]}</small><strong>${s[1]}</strong><p>${s[2]}</p></div>`).join('')}</div>${details(f)}</section>`).join('')}<section>${dataPage()}</section><section>${roadmapPage()}</section>`;
}
document.getElementById('print').addEventListener('click',()=>{buildPrint();window.print();});
window.addEventListener('beforeprint',buildPrint);
window.addEventListener('hashchange',render);
render();
