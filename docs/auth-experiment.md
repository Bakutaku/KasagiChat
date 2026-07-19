# auth実験: OAuthログイン + セッション認証

- ブランチ: `experiment/auth`(本リポジトリ / KasagiChat-Background 両方)
- 目的: requirements.md で確定した認証方式(**Spring Security OAuth2 Client + セッションCookie・同一オリジン構成**)を、実験用ブランチで最小構成のまま動かして理解する

---

## 1. 構成の全体像

```
ブラウザ (http://localhost:3000)
   │
   ▼
Next.js (frontend/ … 画面のみ)
   │  rewrites: /api/* → http://backend:8080/api/*
   ▼
Spring Boot (../KasagiChat-Background … 認証・API)
   │
   ▼
PostgreSQL (users テーブル)
```

ポイント: **ブラウザから見るとフロントもAPIも `localhost:3000` の同一オリジン**。
Next.js の rewrites が `/api/*` だけを Spring へ中継する。これにより

- CORS 設定が一切不要になる
- セッションCookieの `Domain` / `SameSite` の面倒事が構成レベルで消える
- 本番(Amplify rewrites proxy → App Runner)と同じ形をローカルで再現できる

## 2. 起動手順

### (1) GitHub OAuth App を作る(初回のみ・2分)

1. https://github.com/settings/developers → **New OAuth App**
2. 入力値:
   - Application name: `KasagiChat (dev)` など
   - Homepage URL: `http://localhost:3000`
   - **Authorization callback URL: `http://localhost:3000/api/login/oauth2/code/github`**
3. 作成後、**Client ID** を控え、**Generate a new client secret** でシークレットを発行

### (2) .env を作る

```
cd KasagiChat
copy .env.example .env
```

`.env` に Client ID / Secret を記入(`.env` は .gitignore 済み。**シークレットは絶対にコミットしない**)。

### (3) 起動

```
docker compose up -d
docker compose logs -f backend   # 起動ログを見る場合
```

- 初回は Gradle / npm の依存ダウンロードで **5〜10分程度**かかる(2回目以降はキャッシュで速い)
- バックエンド起動完了の目安: `curl http://localhost:8080/actuator/health` が `{"status":"UP"}`

### (4) 動作確認

1. http://localhost:3000 を開く → 未ログインなので `/login` へ飛ぶ
2. 「GitHubでログイン」→ GitHub の認可画面 → 許可
3. トップに戻り、表示名とアバターが出ればOK(users テーブルに1行できている)
4. ログアウト → `/login` に戻る

コード変更の反映:

- フロント: 保存すれば自動反映(ホットリロード)
- バックエンド: `docker compose restart backend`

## 3. ログインの流れ(OAuth2 Authorization Code Flow)

```
① ブラウザ: 「GitHubでログイン」= GET /api/oauth2/authorization/github
② Spring: state(CSRF対策の乱数)を生成しセッションに保存、
          GitHubの認可URLへ302リダイレクト
③ ユーザー: GitHub上で「許可」
④ GitHub: /api/login/oauth2/code/github?code=xxx&state=yyy へリダイレクト
⑤ Spring: stateを検証 → code をアクセストークンに交換(サーバ間通信)
          → GitHub APIでユーザー情報取得 → usersテーブルへupsert
          → セッション確立(Set-Cookie: SESSION) → 「/」へリダイレクト
⑥ 以降のAPI呼び出しはセッションCookieで認証される
```

重要な性質:

- **アクセストークンもclient secretもブラウザには一切渡らない**(すべてサーバ内)
- `state` パラメータの生成・検証は Spring Security が自動でやる(認可コード横取り対策)
- ブラウザが持つのは HttpOnly の `SESSION` Cookieだけ

## 4. セキュリティ設計の解説(なぜこうしたか)

### セッションCookie方式(JWTを使わない)

- サーバ側にセッション状態を持つ方式。**即時失効できる**(ログアウト=サーバ側で破棄)
- JWTをlocalStorageに置く方式はXSSでトークンを盗まれるリスクがあり、失効も難しい
- サーバが1台(App Runner想定)なのでセッション共有の問題もない
- **セッションは Spring Session JDBC でPostgreSQLに保存**(`spring_session` テーブル)。
  寿命は最終操作から14日・Cookieも14日の永続Cookie。「毎日使うアプリで毎回ログインさせない」ための設計で、
  バックエンド再起動や本番のデプロイでもユーザーはログアウトされない

### Cookie属性

| 属性 | 値 | 意味 |
|---|---|---|
| HttpOnly | true | JSから読めない → XSSでセッションIDを盗めない |
| SameSite | Lax | 他サイトからのPOSTにCookieが乗らない → CSRFの一層目 |
| Secure | (本番でtrue) | HTTPS以外でCookieを送らない。localhostでは不要 |

### CSRF対策(二層目)

- Spring Security の **Double Submit Cookie** 方式:
  - サーバが `XSRF-TOKEN` Cookie(HttpOnlyでない=JSから読める)を配る
  - フロントは変更系リクエスト(POST等)で `X-XSRF-TOKEN` ヘッダにその値を入れて返送
  - 攻撃サイトは他オリジンのCookieを**読めない**ため、正しいヘッダを付けられない
- 実装: `SecurityConfig` + `SpaCsrfTokenRequestHandler`(Spring公式ドキュメントのSPA向け推奨実装。BREACH攻撃対策のXORエンコード込み)
- フロント側: [frontend/app/page.tsx](../frontend/app/page.tsx) の `getCsrfToken()` → logout時にヘッダ付与

### 未認証は401を返す(ログイン画面へリダイレクトしない)

- 従来のサーバレンダリング型Webアプリと違い、SPAでは「APIが302でログインページを返す」と
  fetchが壊れる。`HttpStatusEntryPoint(401)` でJSONクライアント向けの挙動にし、
  **画面遷移の判断はフロントが行う**(`/api/me` が401 → `/login` へ)

### ユーザーの識別子

- `provider + subject`(GitHubは数値ID、Googleは`sub`クレーム)で識別
- **メールアドレスやユーザー名を識別子にしない**。変更され得るし、
  「GitHubのメール」と「Googleのメール」が同じでも同一人物とは限らない(アカウント乗っ取りの温床)

### その他

- OAuthの認可開始・コールバックURLを `/api/` 配下に置いた(`SecurityConfig` の
  `authorizationEndpoint` / `redirectionEndpoint`)。全認証トラフィックがrewritesを通り、
  同一オリジン構成が保てる
- `redirect-uri` は `APP_PUBLIC_URL` 環境変数から明示的に組み立てる
  (プロキシ越しだとSpringが自分のURLを `backend:8080` と誤認するため)
- シークレット類(client secret / DBパスワード)はすべて環境変数。コードにもGitにも入れない

## 5. 実験用の簡略化(本実装で直すべき点)

| 項目 | 実験での状態 | 本実装 |
|---|---|---|
| DBスキーマ | `ddl-auto: update`(JPAが自動生成)+ spring_sessionテーブル自動作成 | Flyway等でマイグレーション管理 |
| 利用規約同意 | `terms_agreed_at` カラムだけ用意 | 初回フロー(規約同意→キー設定)を実装 |
| Cookie Secure属性 | なし(HTTP) | HTTPS前提で `secure: true` |
| テスト | 未整備(雛形のみ) | SecurityFilterChainのテストを書く |

## 6. 追加実験: JWT認証

セッション認証と併用する形でJWT+リフレッシュトークン認証も実装した → [jwt-experiment.md](jwt-experiment.md)

## 7. 次のステップ候補(このブランチで続ける場合)

1. 利用規約同意フロー(`POST /api/me/agree-terms` + 未同意ユーザーの制限)
2. APIキーの暗号化保存(AES-GCM + 環境変数の暗号化鍵。requirements 3-8)
3. 認可の型を作る(「自分のデータしか触れない」をリポジトリ層で強制する練習)
