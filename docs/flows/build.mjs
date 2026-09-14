import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { features, decisions } from './content.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const daisy = fs.readFileSync(path.join(root, 'node_modules/daisyui/daisyui.css'), 'utf8');
const css = fs.readFileSync(path.join(here, 'style.css'), 'utf8');
const runtime = fs.readFileSync(path.join(here, 'viewer.js'), 'utf8');
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const plain = features.map(f => `<section><h2>${escapeHtml(f.title)}</h2><p>${escapeHtml(f.current)}</p><ol>${f.steps.map(s => `<li>${escapeHtml(s[1])}：${escapeHtml(s[2])}</li>`).join('')}</ol></section>`).join('');
const html = `<!doctype html>
<html lang="ja" data-theme="light"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>KasagiChat — 機能と処理の地図</title><style>${daisy}\n${css}</style></head>
<body>
<a class="skip" href="#main">本文へ移動</a>
<aside class="sidebar"><a class="brand" href="#overview">K<span>KasagiChat</span></a><p class="edition">機能と処理の地図<br>設計・実装スナップショット / 2026.09.13</p><nav id="navigation" aria-label="資料の目次"></nav><div class="sidefoot">図は処理順を上から下へ。<br>各ステップを選ぶと詳細を表示。<br><button class="btn btn-sm" id="print">全ページを印刷 / PDF保存</button></div></aside>
<main id="main" tabindex="-1"><header class="topbar"><span>PRODUCT FLOW ATLAS</span><div class="legend"><span class="badge existing">実装あり</span><span class="badge planned">設計・未実装</span><span class="badge discuss">要検討</span></div></header><div id="view"></div><footer>静的コード確認に基づく資料です。DB・OAuth・LLMの実動作やデプロイは今回検証していません。既存の未コミット変更を含むため、ブランチ変更後は再確認してください。</footer></main>
<div id="print-area"></div><noscript><style>.sidebar,#main{display:none}</style><h1>KasagiChat 機能別処理フロー</h1><p>図の操作にはJavaScriptを有効にしてください。以下はテキスト版です。</p>${plain}</noscript>
<script id="flow-data" type="application/json">${JSON.stringify({features,decisions}).replaceAll('<','\\u003c')}</script><script>${runtime}</script></body></html>`;
fs.writeFileSync(path.join(root, 'docs/feature-flows.html'), html, 'utf8');
console.log(`Generated docs/feature-flows.html: ${features.length} features, ${features.reduce((n,f)=>n+f.steps.length,0)} steps`);
