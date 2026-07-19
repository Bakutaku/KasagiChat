# JWT認証実験(アクセストークン + リフレッシュトークン)

- ブランチ: `experiment/auth`(セッション認証実験の続き。[auth-experiment.md](auth-experiment.md) が前提)
- 目的: 将来のUE版などネイティブクライアント向けの**トークン認証**を、勉強を兼ねて実装して理解する
- 位置づけ: **ブラウザのセッション認証はそのまま**。同じAPIをBearerトークンでも呼べるようにする「併用」構成

---

## 1. 全体像

```
ブラウザ(Next.js) ──セッションCookie──────┐
                                          ├─▶ 同じ Spring Boot API
ネイティブクライアント ──Authorization: Bearer──┘

トークンの一生:
① ブラウザでOAuthログイン(セッション確立)
② POST /api/token               … トークン一式を発行(セッション認証+CSRF必須)
③ GET  /api/me 等               … Authorization: Bearer <accessToken> でアクセス
④ 15分でアクセストークン失効 → POST /api/token/refresh で新しい一式に交換
⑤ ログアウト → POST /api/token/revoke
```

| トークン | 形式 | 寿命 | 保存場所 |
|---|---|---|---|
| アクセストークン | **JWT**(HS256署名) | 15分 | サーバに保存しない(自己完結) |
| リフレッシュトークン | **不透明な乱数** | 30日 | DBに**SHA-256ハッシュのみ**保存 |

## 2. JWT(アクセストークン)の中身

JWTは `ヘッダ.ペイロード.署名` の3部構成。各部はBase64URLエンコードされているだけで、
**暗号化ではない**(https://jwt.io に貼れば誰でも中身を読める)。改ざんできないのは署名のおかげ。

```
eyJhbGciOiJIUzI1NiJ9          → {"alg":"HS256"}
.eyJpc3MiOiJrYXNhZ2ljaGF0...  → {"iss":"kasagichat","sub":"1","name":"...","iat":...,"exp":...}
.lI2MmtwWfbxgkbcAnTLS...      → HMAC-SHA256(ヘッダ.ペイロード, 秘密鍵)
```

ここから来る設計ルール:

- **ペイロードに秘密情報を入れない**(読める前提で設計する)
- サーバは署名と`exp`を検証するだけで認証完了。**DBを見ない = 失効もできない**。
  だから寿命を15分と短くして「漏れても被害時間を限定」する
- 署名鍵は環境変数 `JWT_SECRET`(サーバ1台なので共通鍵HS256。
  発行サーバと検証サーバが分かれる構成になったら非対称鍵RS256/ES256に切り替える)

## 3. リフレッシュトークンの設計判断

**「JWTの失効できない問題」を補うのがリフレッシュトークン**。長命な代わりにDBで管理して失効可能にする。

- **不透明な乱数にする(JWTにしない)**: どうせDB照合するので自己完結性が不要。単純な方が安全
- **DBにはSHA-256ハッシュだけ保存**: DBが漏洩しても元のトークンを復元できない
  (パスワードのハッシュ保存と同じ発想。384bitの乱数なので総当たりも不可能、bcrypt等の低速ハッシュは不要)
- **ローテーション(1回使い切り)**: refreshのたびに古いトークンを削除して新しいものを発行。
  盗まれたトークンが後から使われても、正規クライアントが先に使っていれば既に無効
- **発行はセッションログインからのみ**: アクセストークンで新しい一式を発行できてしまうと、
  盗まれたアクセストークン1つが永続アクセス権に化ける([TokenController](../../KasagiChat-Background/src/main/java/com/kasagichat/api/token/TokenController.java) で拒否)

## 4. SecurityFilterChain を2本に分けた理由

[SecurityConfig](../../KasagiChat-Background/src/main/java/com/kasagichat/api/security/SecurityConfig.java) は
「`Authorization: Bearer` ヘッダ付き(+ refresh/revoke)」を1本目、それ以外(ブラウザ)を2本目に振り分ける。

| | Bearerチェーン | セッションチェーン |
|---|---|---|
| 認証 | JWT検証(oauth2ResourceServer) | OAuthログイン+セッションCookie |
| セッション | STATELESS(作らない) | あり |
| CSRF対策 | **不要** | 必要 |

CSRFが不要になる理由が重要: CSRFは「ブラウザがCookieを**勝手に**送る」性質を悪用する攻撃。
Bearerヘッダはコードが明示的に付けるものなので、攻撃サイトからは付けられない。
`/api/token/refresh` と `/api/token/revoke` もCookieを使わず「リフレッシュトークン自体が資格情報」なのでBearerチェーン側に置いてCSRF対象外にしている。

## 5. 試し方

1. ブラウザで http://localhost:3000 にログイン後、DevToolsコンソールで発行:

```js
const csrf = decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)[1]);
const tokens = await fetch("/api/token", {
  method: "POST",
  headers: { "X-XSRF-TOKEN": csrf },
}).then((r) => r.json());
console.log(tokens);
```

2. 取れた値でターミナルから(ネイティブクライアントの気持ちで):

```
curl http://localhost:3000/api/me -H "Authorization: Bearer <accessToken>"

curl -X POST http://localhost:3000/api/token/refresh ^
  -H "Content-Type: application/json" -d "{\"refreshToken\":\"<refreshToken>\"}"

curl -X POST http://localhost:3000/api/token/revoke ^
  -H "Content-Type: application/json" -d "{\"refreshToken\":\"<refreshToken>\"}"
```

3. 確認ポイント:
   - refresh後に**古いrefreshTokenをもう一度使うと401**(ローテーション)
   - accessTokenを https://jwt.io に貼るとペイロードが読める(=秘密を入れない理由を体感)
   - revoke後はrefresh不可、ただし手元のaccessTokenは**15分間は生きている**(=JWTは即時失効できない、を体感)

## 6. 本実装にする場合の追加課題

- **再利用検知**: 失効済みリフレッシュトークンの使用を検知したら、そのユーザーの全トークンを失効させる
  (盗難のシグナルとみなす。今回はローテーションのみ実装)
- 期限切れ行の定期削除(今はDBに残り続ける)
- デバイス管理(ユーザーが「ログイン中の端末一覧」から個別に失効できるUI)
- ネイティブアプリのログインフロー(RFC 8252: システムブラウザ+ループバックリダイレクト)。
  今回は「ブラウザで発行してコピー」で代用した部分
- コンテスト版のスコープではUE版はWon'tなので、**この実装はマージせず実験ブランチに置いておく**のが正解
