# AWSデプロイ手順（Amplify + ECS Express Mode + Supabase）

requirements.md 6章「デプロイ構成（確定）」を実際に構築するための手順書です。AWSを初めて触る前提で、操作の目的とつまずきやすい点も併記しています。

この手順書と構成図は構築計画を示すもので、実環境での稼働確認結果ではありません。

AWS の操作は基本的にマネジメントコンソール（ブラウザ）で行います。IAM ロールや ECR など、設定値の入力ミスがその場でエラーにならない STEP 5・6 だけは、コンソールから開ける CloudShell でコマンドを実行します。PC に AWS CLI をインストールする必要はありません。

## 構成

```
ブラウザ ─HTTPS─▶ Amplify Hosting（Next.js SSR、公開URL https://app.<ドメイン>）
                   └ next.config.ts の rewrites で /api, /oauth2, /login/oauth2 を転送
                        ─HTTPS─▶ ECS Express Mode の ALB（https://<サービス名>.ecs.ap-northeast-1.on.aws、証明書は自動）
                                      └─▶ Spring Boot コンテナ（Fargate 0.5 vCPU / 2GB を1タスク、VPC内HTTP 8080）
                                   ├─▶ Supabase PostgreSQL（東京, セッションプーラー経由）
                                   └─▶ Amazon Bedrock（デモ用LLM, タスクロールで認証）

KasagiChat            を main へ push ─▶ Amplify が自動でビルド・配信
KasagiChat-Background を main へ push ─▶ GitHub Actions がテスト → jar作成 → コンテナイメージをECRへpush → ECS Express Modeへデプロイ
```

| 用語 | 意味 |
|---|---|
| Amplify Hosting | Next.js をビルドして HTTPS 付きで配信するサービス。GitHub と連携すると push のたびに自動デプロイされる。独自ドメインと証明書も管理できる |
| ECS / Fargate | ECS はコンテナを動かすサービス。Fargate はその実行基盤で、サーバ（EC2）を自分で管理せずにコンテナを起動できる |
| ECS Express Mode | コンテナイメージを渡すだけで、ECS サービス・ALB・HTTPS 証明書・URL・オートスケーリング・ログ出力をまとめて作る ECS の機能。作られたリソースは自分のアカウントに残り、コンソールで中身を確認できる |
| ECR | コンテナイメージの保管場所（プライベートなレジストリ） |
| タスク / タスク定義 | タスクは起動中のコンテナ一式（EC2 でいうインスタンスに相当）。タスク定義はその設計図（イメージ・CPU・メモリ・環境変数など） |
| ALB | 公開 HTTPS を受け、VPC 内のタスクへ転送するロードバランサー。Express Mode が作成し、証明書も自動で設定する |
| SSM パラメータストア | 設定値やシークレットを保管するサービス。暗号化して保存でき、タスク起動時に ECS が取得して環境変数として渡す |
| IAM ロール | 「誰が何をしてよいか」の権限セット。人ではなくサービスや GitHub Actions に一時的に権限を渡すために使う |
| OIDC | GitHub Actions が「自分は Bakutaku/KasagiChat-Background の production 環境から動いている」ことを AWS に証明する仕組み。アクセスキーを GitHub に保存せずに済む |
| CloudShell | マネジメントコンソールから開けるブラウザ上のターミナル。ログイン中のユーザーの権限で AWS CLI を実行できる。インストールやアクセスキーの設定は不要で、無料で使える |

作業は次の順に進めます。後の STEP が前の STEP で得た値（URL等）を使うため、順番を入れ替えないでください。

| STEP | 内容 | 得られる値 |
|---|---|---|
| 0 | AWSアカウントの初期設定 | 管理者ユーザー、予算アラート |
| 1 | Supabase の作成とスキーマ・マスタ投入 | DB接続情報 |
| 2 | Bedrock の有効化 | デモ用モデルID |
| 3 | 公開URLの決定と本番用 OAuth アプリの作成 | 公開URL、クライアントID/シークレット |
| 4 | シークレットの登録（SSM パラメータストア） | ― |
| 5 | ECS 用 IAM ロールと ECR リポジトリの作成 | ― |
| 6 | GitHub Actions 用 IAM ロール（OIDC）と GitHub の設定 | ロールARN |
| 7 | 初回デプロイ（ECS サービスの作成） | API の HTTPS URL |
| 8 | Amplify Hosting と独自ドメインの設定 | ― |
| 9 | 通しの動作確認 | ― |

以降、`<...>` は各自の値に置き換えてください。**実際のシークレット値はこのファイルやリポジトリに書かないでください。**

**Elastic Beanstalk 版の手順で作業済みのリソースがある場合**: EB 環境（`kasagichat-prod`）は起動しているだけで EC2・ALB の料金がかかるため、**Elastic Beanstalk** → 環境 → **アクション** → **環境の終了** で削除し、アプリケーション `kasagichat` も削除してください。API 用に ACM 証明書を発行していた場合は、**AWS Certificate Manager** で削除し、ドメインの DNS に追加した検証用 CNAME と API 用 CNAME も削除します。EB 用に作った IAM ロール（`aws-elasticbeanstalk-ec2-role` 等）は残しても料金はかかりません。

---

## STEP 0: AWSアカウントの初期設定

**目的**: ルートユーザー（アカウント作成時のメールアドレスでのログイン）は全権限を持ち、権限を絞れません。漏洩した場合の被害が最大になるため、日常の作業用に別の管理者ユーザーを作り、ルートは使わないようにします。また、クレジットがあっても設定ミスで想定外の課金が発生し得るため、予算アラートを先に設定します。

### 0-1. ルートユーザーにMFAを設定
1. ルートユーザーでコンソールにログイン
2. 右上のアカウント名 → **セキュリティ認証情報**
3. **多要素認証（MFA）** → **MFAデバイスの割り当て** → 認証アプリ（Google Authenticator 等）を登録

### 0-2. リージョンを東京にする
右上のリージョン表示を **アジアパシフィック（東京）ap-northeast-1** にします。以降の作業はすべて東京リージョンで行います（IAM・Billing はリージョンに依存しないグローバルなサービスです）。

### 0-3. 作業用の管理者ユーザーを作成（IAM Identity Center）
1. 右上のリージョンが東京であることを確認し、サービス検索で **IAM Identity Center** → **有効にする**。インスタンス設定は **単一リージョンインスタンス** を選ぶ（マルチリージョンは障害時に別リージョンからログインするための構成で、有料の KMS キーも作成されるため不要）。Identity Center は有効にしたリージョンから移動できない
2. 左メニュー **ユーザー** → **ユーザーを追加**（自分用。メールで招待が届く）
3. 左メニュー **許可セット** → **許可セットを作成** → 事前定義 **AdministratorAccess**
4. 左メニュー **AWS アカウント** → 自分のアカウントを選択 → **ユーザーまたはグループを割り当て** → 作成したユーザーと AdministratorAccess を割り当て
5. 招待メールからパスワードとMFAを設定
6. IAM Identity Center の **設定** に表示される **AWS アクセスポータルの URL** をブックマーク

以降はこの URL からログインして作業します。ルートユーザーは請求関連の一部操作以外では使いません。

### 0-4. 予算アラート

**目的**: 設定ミス（削除し忘れたリソース、想定外に増えたタスクなど）による費用の増加に早く気付けるようにします。AWS には使った分だけ課金される仕組みしかなく、上限額で自動的に止める機能はありません。そのため、金額が一定を超えたらメールで通知を受ける設定をしておきます。

#### (1) 管理者ユーザーから請求情報を見られるようにする（ルートユーザーで操作）
AWS の請求情報は、初期状態ではルートユーザーしか見られません。IAM Identity Center の管理者ユーザー（`AdministratorAccess`）でも、この設定を有効にするまでは請求画面・予算・クレジットの画面でアクセス拒否になります。

1. ルートユーザーでコンソールにログイン
2. 右上のアカウント名 → **アカウント**
3. ページ中ほどの **IAM ユーザーおよびロールによる請求情報へのアクセス** → **編集**
4. **IAM アクセスをアクティブ化** にチェックを入れて **更新**

ここまで終わったらルートユーザーからログアウトし、以降は 0-3 のアクセスポータルから管理者ユーザーで作業します。

#### (2) クレジットの残高と条件を確認
1. **Billing and Cost Management** → 左メニュー **クレジット**
2. 次の項目を確認します

| 項目 | 確認すること |
|---|---|
| 残高 | 月約 $60（本節末尾の費用の目安）で何か月分になるか |
| 有効期限 | 審査期間の終わりまで残っているか。期限を過ぎた残高は失効する |
| 適用対象のサービス | クレジットの種類によっては使えないサービスがある。ECS（Fargate）・ELB・Amplify が対象に含まれているか |

クレジットは月ごとの請求額から自動で差し引かれます。差し引かれた結果は **請求書（Bills）** の画面で、利用料金とクレジットの行として確認できます。

#### (3) 月次の予算を作成
1. **Billing and Cost Management** → 左メニュー **予算（Budgets）** → **予算を作成**
2. 予算の設定: **テンプレートを使用（シンプル）**
3. テンプレート: **月次コスト予算**
4. 次を入力して **予算を作成**

| 項目 | 値 |
|---|---|
| 予算名 | `kasagichat-monthly` |
| 予算額 | `80`（USD） |
| E メールの受信者 | 自分のメールアドレス |

このテンプレートでは、次の3つの条件でメールが届きます。

| 条件 | 予算額 80 USD のとき |
|---|---|
| 実際のコストが予算額の 85% に達した | $68 |
| 実際のコストが予算額の 100% に達した | $80 |
| 月末までのコストが予算額の 100% に達すると予測された | 予測が $80 を超えた時点 |

予算額を 80 USD にしているのは、通常の運用（月約 $60）では通知が届かず、想定を超えたときだけ届くようにするためです。85% の通知が $60 付近で届くと、毎月の通常の請求でも通知が来てしまい、本当に異常なときに気付きにくくなります。

#### (4) 予算からクレジットを除外
**予算は初期設定でクレジットを差し引いた金額で判定します。** クレジットで請求が $0 になっている間は予算の実コストも $0 のままになり、設定ミスで費用が増えてもクレジットを使い切るまで通知が届きません。クレジットを使い切ってから気付くことを防ぐため、クレジット適用前の金額で判定するように変更します。

1. **予算（Budgets）** の一覧で `kasagichat-monthly` を開き、**編集**
2. **予算の範囲** の詳細オプション（料金タイプ）で、**クレジット** のチェックを外す
3. 保存する

変更後、予算の画面に表示される実コストは、クレジットの残高に関係なく実際の利用料金になります。

#### 予算アラートについての注意
- **通知は最大1日遅れる**: 予算は1日に1回以上更新される請求データで判定するため、リアルタイムの通知ではありません
- **予測による通知はすぐには届かない**: 予測には約5週間分の利用データが必要なため、アカウントを使い始めてしばらくは「実際のコスト」の通知だけが有効です
- **通知が来たら**: **Billing and Cost Management** → **請求書** でサービスごとの金額を確認し、想定していないサービスや、削除したはずのリソースの料金がないかを確認します
- **予算の作成は無料**: アクションを設定しない予算には料金がかかりません

**費用の目安（東京リージョン、1か月＝730時間）**

| 項目 | 月額 |
|---|---|
| Fargate（0.5 vCPU / 2GB、x86、1タスク） | 約 $26.5 |
| ALB（時間料金 + 少量の処理量料金） | 約 $18〜20 |
| パブリック IPv4 アドレス（ALB の各AZ分 + タスク1つ、1個 $3.65） | 約 $11〜15 |
| ECR・CloudWatch Logs・Amplify | 数ドル |
| **合計** | **約 $60 前後** |

独自ドメインの更新費用は別途かかります。正確な金額は [AWS Pricing Calculator](https://calculator.aws/) で確認してください。

---

## STEP 1: Supabase の作成とスキーマ・マスタ投入

**目的**: 本番DBを用意します。本番の Spring Boot は `ddl-auto: validate`（テーブル構造の検証だけ行い、作成はしない）で起動するため、起動前にテーブルを作っておく必要があります。また、レベル曲線や実績定義などのマスタと規約は開発環境（`debug` プロファイル）でしか自動作成されないため、手動で投入します。

### 1-1. プロジェクト作成
1. https://supabase.com でプロジェクトを作成。Region は **Northeast Asia (Tokyo)**
2. Database Password は強いものを生成し、パスワードマネージャに保管

### 1-2. 接続情報を控える
プロジェクト画面上部の **Connect** → **Session pooler** を選び、次の値を控えます。

| 項目 | 例 |
|---|---|
| host | `aws-0-ap-northeast-1.pooler.supabase.com` |
| port | `5432` |
| database | `postgres` |
| user | `postgres.<project-ref>` |

**Session pooler を使う理由**:
- **Direct connection** は IPv6 専用で、ECS Express Mode の標準構成（IPv4）からは接続できません
- **Transaction pooler**（ポート 6543）は接続をトランザクション単位で使い回すため、JDBC/HikariCP の prepared statement と相性が悪く、実行時エラーの原因になります

### 1-3. ローカルDBからスキーマとマスタを出力
ローカルの開発DB（`debug` プロファイルで起動済み、マスタ初期化済みの状態）から出力します。ローカルDBが最新のエンティティ定義で起動済みであることを先に確認してください。

```bash
docker exec local-codex-db-1 sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --schema-only --no-owner --no-privileges -f /tmp/schema.sql'
```

```bash
docker exec local-codex-db-1 sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --data-only --no-owner --no-privileges -t level_curves -t exp_rules -t topic_categories -t conversation_openings -t demo_passphrases -t counter_defs -t items -t achievement_defs -t terms -f /tmp/master.sql'
```

- `--schema-only`: テーブル・インデックス・制約などの定義だけを出力（`spring_session` テーブルも含まれる）
- `--data-only -t ...`: 指定したマスタテーブルの中身だけを出力。ユーザー・会話などの個人データは出力しない
- `--no-owner --no-privileges`: ローカルのユーザー名 `kasagichat` への所有権指定を除く（Supabase には存在しないため）

マスタの値はゲームバランス調整前の仮の値です。`demo_passphrases` の合言葉（開発用 `HOSHI26`）を本番で変える場合は、投入後に Supabase の Table Editor で変更してください。

### 1-4. Supabase へ投入
ローカルDBのコンテナに入っている `psql` から、Supabase へ直接接続して流し込みます（パスワードはプロンプトで入力するため、コマンド履歴に残りません）。

```bash
docker exec -it local-codex-db-1 psql "host=<host> port=5432 dbname=postgres user=postgres.<project-ref> sslmode=require" -v ON_ERROR_STOP=1 -f /tmp/schema.sql
```

```bash
docker exec -it local-codex-db-1 psql "host=<host> port=5432 dbname=postgres user=postgres.<project-ref> sslmode=require" -v ON_ERROR_STOP=1 -f /tmp/master.sql
```

**確認**: Supabase の **Table Editor** に 30 前後のテーブルがあり、`level_curves` や `terms` に行が入っていること。

**つまずきポイント**
- `schema "public" already exists` 等でエラー停止した場合は、`/tmp/schema.sql` の該当行（`CREATE SCHEMA public;` など）を削除して再実行してください
- 開発DBは `ddl-auto: update` で育ってきたため、エンティティから削除済みの古い列が残っている可能性があります。`validate` は「必要な列があるか」を見るだけなので起動は妨げませんが、NOT NULL の古い列が残っていると INSERT が失敗します。STEP 9 でエラーが出たら該当列を削除してください

### 1-5. 今後のスキーマ変更の運用
エンティティを変更したときは、**バックエンドを push する前に** Supabase へ同じ変更（`ALTER TABLE` 等）を適用してください。順番が逆だと、新しいコンテナが `validate` で起動に失敗します（その場合 ECS は新しいタスクを正常と判定できず、旧バージョンのまま動き続け、GitHub Actions が失敗になります）。変更SQLは `KasagiChat-Background/scripts/migrations/` に日付付きで残します。

---

## STEP 2: Bedrock の有効化（デモ用LLM）

**目的**: 本番の「デモキー」枠は Amazon Bedrock 経由で LLM を呼び出します（`ProdDemoLlmConfiguration`）。API キーではなく ECS タスクに付与した IAM ロール（タスクロール）で認証するため、キーの管理が不要です。

本手順では **Amazon Nova Lite** を APAC の推論プロファイル（`apac.amazon.nova-lite-v1:0`）経由で使います。

1. **Amazon Bedrock** → **モデルカタログ** で **Nova Lite** を開く
2. **プレイグラウンド** でそのモデルに一度メッセージを送り、応答が返ることを確認する（管理者ユーザーで初回呼び出しを行うと、アカウントでそのモデルが利用可能になる）
3. **クロスリージョン推論（Cross-region inference）** の画面で、推論プロファイルID `apac.amazon.nova-lite-v1:0` が表示されることを確認する

推論プロファイルは、リクエストをアジア太平洋の複数のリージョンのうち空いているところへ振り分ける仕組みです。この ID が STEP 6 の `DEMO_LLM_MODEL` になります。別のモデルに変える場合は、STEP 5-1 (4) のタスクロールのポリシーも合わせて変更してください。

---

## STEP 3: 公開URLの決定と本番用 OAuth アプリの作成

### 3-1. 公開URLを決める
取得したドメインのサブドメイン（例: `app.example.com`）をアプリの公開URLにします。以降「公開URL」は `https://app.<ドメイン>` を指します。

- ブラウザがアクセスするのは Amplify だけなので、独自ドメインは Amplify に付けます。API（ECS）は Express Mode が自動で割り当てる `on.aws` の URL のまま使い、利用者には見えません
- ルートドメイン（`example.com`）ではなくサブドメインにするのは、Amplify をルートドメインに割り当てるには DNS に ANAME/ALIAS レコードが必要で、Xserver の DNS はこれに対応していないためです
- 実際のドメイン設定は STEP 8 で行います。ここでは名前を決めるだけです

### 3-2. GitHub
https://github.com/settings/developers → **New OAuth App**

| 項目 | 値 |
|---|---|
| Application name | `KasagiChat` |
| Homepage URL | `<公開URL>` |
| Authorization callback URL | `<公開URL>/login/oauth2/code/github` |

作成後、Client ID と、**Generate a new client secret** で発行したシークレットを控えます。

### 3-3. Google
Google Cloud Console → **APIとサービス** → **認証情報** → 本番用の OAuth クライアント ID を作成（種類: ウェブアプリケーション）

- 承認済みの JavaScript 生成元: `<公開URL>`
- 承認済みのリダイレクト URI: `<公開URL>/login/oauth2/code/google`

**目的**: OAuth のコールバック URL はアプリごとに1つ（GitHub）または登録制（Google）です。ローカル用と本番用を分けることで、片方の設定変更がもう片方を壊さないようにします。コールバックが公開URLになっているのは、ブラウザから見た接続先が Amplify であり、Amplify が `/login/oauth2/*` を API へ転送するためです。

---

## STEP 4: シークレットの登録（SSM パラメータストア）

**目的**: パスワードや鍵を、タスク定義やコンソールの画面に平文で出さずに管理します。SSM パラメータストアに暗号化して保存し、タスクの起動時に ECS が取得して環境変数としてコンテナへ渡します。GitHub Actions のワークフローには「どのパラメータを読むか」という名前だけを書きます。

### 4-1. 暗号化鍵の生成
ユーザーの API キーを DB に暗号化保存するための鍵を、**本番専用に新しく** 生成します。

```bash
docker exec local-codex-backend-1 openssl rand -base64 32
```

この鍵を失うと、保存済みの API キーはすべて復号できなくなります。パスワードマネージャに保管してください。ローカル開発用の鍵と同じ値は使わないでください。

### 4-2. パラメータの作成
**Systems Manager** → 左メニュー **パラメータストア** → **パラメータの作成** で、次の4つを作成します。

| 名前 | 値 |
|---|---|
| `/kasagichat/prod/POSTGRES_PASSWORD` | Supabase の DB パスワード |
| `/kasagichat/prod/GITHUB_CLIENT_SECRET` | STEP 3 の GitHub クライアントシークレット |
| `/kasagichat/prod/GOOGLE_CLIENT_SECRET` | STEP 3 の Google クライアントシークレット |
| `/kasagichat/prod/API_CREDENTIAL_ENCRYPTION_KEY` | 4-1 で生成した暗号化鍵 |

各パラメータの設定:
- 利用枠: **標準**（無料）
- タイプ: **安全な文字列（SecureString）**
- KMS キーソース: **現在のアカウント**、KMS キー ID: 既定の `alias/aws/ssm`

名前は大文字・小文字も含めて表のとおりにしてください。GitHub Actions のワークフロー（`deploy.yml` の `secrets`）がこの名前で参照します。

**値を変更したとき**: タスクは起動時に一度だけ値を読みます。変更後は GitHub Actions の **Run workflow** で再デプロイして、新しいタスクに入れ替えてください。

---

## STEP 5: ECS 用 IAM ロールと ECR リポジトリの作成

**目的**: STEP 7 で GitHub Actions が ECS のサービスを作るときに使う「権限（IAM ロール）」と「コンテナイメージの置き場所（ECR リポジトリ）」を先に用意します。**この STEP では ECS のサービスはまだ作りません。** サービスの作成と設定（CPU・メモリ・環境変数など）は、STEP 7 でワークフロー（`deploy.yml`）が行います。

この STEP と STEP 6 は、コンソールの中で使えるターミナル **CloudShell** で作業します。ポリシーの JSON をコンソールに貼り付ける方法では、アカウントIDの置き換え忘れや画面での選び間違いがあってもその場ではエラーにならず、STEP 7 のデプロイで初めて失敗に気付くことになります。CloudShell で実行するコマンドは、アカウントIDを自動で取得してポリシーに埋め込みます。

### 5-0. CloudShell の準備

CloudShell は、マネジメントコンソールから開けるブラウザ上のターミナルです。ログイン中のユーザーの権限で AWS CLI（AWS をコマンドで操作するツール）を実行できます。PC へのインストールやアクセスキーの設定は不要で、料金もかかりません。

1. STEP 0-3 の管理者ユーザーでログインし、右上のリージョンが **東京（ap-northeast-1）** であることを確認する
2. コンソール上部のバーにある **CloudShell** アイコン（`>_`）を押す。画面下部にターミナルが開く（初回は準備に1〜2分かかる）
3. 以降のコードブロックは、**ブロックごとにまとめてコピーし、ターミナルに貼り付けて Enter** を押す。貼り付け時に確認ダイアログ（Safe Paste）が表示されたら **貼り付け** を押す

**知っておくこと**
- 各ブロックは先頭でアカウントIDを取得し直します。CloudShell はしばらく操作しないと接続が切れ、それまでに設定した変数が消えるためです。ブロックの途中だけを実行せず、必ず先頭から貼り付けてください
- 各ブロックは、作成済みのものを「作成済みのためスキップ」と表示して飛ばします。途中で失敗した場合も、原因を直してから同じブロックを最初から貼り付け直せば、残りの部分が作成されます
- `An error occurred (...)` と表示された場合は、その行の内容を確認し、各 STEP 末尾の「つまずきポイント」を参照してください
- ポリシーの JSON ファイルは、CloudShell のホームディレクトリの `kasagichat-setup` フォルダに保存します。このフォルダは次回 CloudShell を開いたときも残りますが、シークレットは含みません

### 5-1. ECS 用の IAM ロールを作成

**目的**: Express Mode には役割の異なる3つのロールを渡します。

| ロール名 | 使う主体 | 役割 |
|---|---|---|
| `ecsTaskExecutionRole` | ECS（タスクの起動処理） | ECR からイメージを取得する、ログを書き込む、SSM からシークレットを読む |
| `ecsInfrastructureRoleForExpressServices` | ECS Express Mode | ALB・証明書・セキュリティグループ・オートスケーリングを作成・管理する |
| `kasagichat-task-role` | 起動したアプリ（Spring Boot） | Bedrock を呼び出す |

アプリ自身の権限（タスクロール）を起動処理の権限（タスク実行ロール）と分けることで、アプリが乗っ取られても SSM のシークレットや ECR を直接操作されにくくなります。

IAM ロールは次の2つの設定で成り立っています。以下のコマンドでもこの2つを順に設定します。

| 設定 | 意味 |
|---|---|
| 信頼ポリシー | **誰が** このロールを使えるか（例: ECS のタスクだけ） |
| 許可ポリシー | このロールで **何が** できるか。AWS が用意した「管理ポリシー」を付ける方法と、自分で書いた「インラインポリシー」を埋め込む方法がある |

**(1) ECS のサービスリンクロール**

サービスリンクロールは、ECS が自分のアカウント内でリソースを操作するための、AWS が定義したロールです。GitHub Actions 用のロール（STEP 6）にはサービスリンクロールを作成する権限を付けないため、ここで先に作成しておきます。名前が `AWSServiceRoleFor` で始まるロールは、IAM コンソールの **ロールを作成** からは作成できません。

```bash
export AWS_PAGER=""
if aws iam get-role --role-name AWSServiceRoleForECS >/dev/null 2>&1; then
  echo "AWSServiceRoleForECS: 作成済みのためスキップ"
else
  aws iam create-service-linked-role --aws-service-name ecs.amazonaws.com
fi
```

ELB とオートスケーリングのサービスリンクロールは、(3) のインフラストラクチャロールに付ける管理ポリシーに作成権限が含まれており、Express Mode が必要に応じて作成するため、手動での作成は不要です。

**(2) タスク実行ロール `ecsTaskExecutionRole`**

ECS がタスクを起動するときに使うロールです。AWS 管理ポリシー `AmazonECSTaskExecutionRolePolicy`（ECR からのイメージ取得とログの書き込み）に加え、STEP 4 で登録した `/kasagichat/prod/` 配下のパラメータだけを読めるインラインポリシーを付けます。

```bash
mkdir -p ~/kasagichat-setup && cd ~/kasagichat-setup
export AWS_PAGER="" AWS_DEFAULT_REGION=ap-northeast-1
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "アカウントID: ${ACCOUNT_ID}"

# 信頼ポリシー: このロールを使えるのは ECS のタスクだけ
cat > ecs-tasks-trust.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "ecs-tasks.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

if aws iam get-role --role-name ecsTaskExecutionRole >/dev/null 2>&1; then
  echo "ecsTaskExecutionRole: 作成済みのためスキップ"
else
  aws iam create-role --role-name ecsTaskExecutionRole \
    --assume-role-policy-document file://ecs-tasks-trust.json
fi

# 管理ポリシー: ECR からのイメージ取得と CloudWatch Logs への書き込み
aws iam attach-role-policy --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# インラインポリシー: /kasagichat/prod/ 配下の SSM パラメータだけを読める
cat > read-ssm.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ssm:GetParameters",
      "Resource": "arn:aws:ssm:ap-northeast-1:${ACCOUNT_ID}:parameter/kasagichat/prod/*"
    }
  ]
}
EOF
aws iam put-role-policy --role-name ecsTaskExecutionRole \
  --policy-name kasagichat-read-ssm --policy-document file://read-ssm.json

echo "ecsTaskExecutionRole: 完了"
```

- `attach-role-policy`（管理ポリシーを付ける）と `put-role-policy`（インラインポリシーを書き込む）は、同じ内容で何度実行しても結果は変わりません。Elastic Beanstalk 版の手順などで `ecsTaskExecutionRole` を作成済みの場合も、不足しているポリシーだけが追加されます
- STEP 4 のパラメータは既定の KMS キー（`alias/aws/ssm`）で暗号化しているため、復号の許可（`kms:Decrypt`）は不要です。独自の KMS キーを使った場合だけ必要になります

**(3) インフラストラクチャロール `ecsInfrastructureRoleForExpressServices`**

Express Mode が ALB・セキュリティグループ・証明書・オートスケーリング・ロググループを作るためのロールです。AWS 管理ポリシー `AmazonECSInfrastructureRoleforExpressGatewayServices` を付けます。このポリシーで操作できるのは、Express Mode が作成したリソース（`AmazonECSManaged` タグ付き）に限られます。

```bash
mkdir -p ~/kasagichat-setup && cd ~/kasagichat-setup
export AWS_PAGER=""

# 信頼ポリシー: このロールを使えるのは ECS（Express Mode）だけ
cat > ecs-infra-trust.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "ecs.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

if aws iam get-role --role-name ecsInfrastructureRoleForExpressServices >/dev/null 2>&1; then
  echo "ecsInfrastructureRoleForExpressServices: 作成済みのためスキップ"
else
  aws iam create-role --role-name ecsInfrastructureRoleForExpressServices \
    --assume-role-policy-document file://ecs-infra-trust.json
fi

aws iam attach-role-policy --role-name ecsInfrastructureRoleForExpressServices \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSInfrastructureRoleforExpressGatewayServices

echo "ecsInfrastructureRoleForExpressServices: 完了"
```

**(4) タスクロール `kasagichat-task-role`**

起動したアプリ（Spring Boot）が使うロールです。STEP 2 のモデル（Nova Lite、推論プロファイル `apac.amazon.nova-lite-v1:0`）だけを呼び出せるようにします。

```bash
mkdir -p ~/kasagichat-setup && cd ~/kasagichat-setup
export AWS_PAGER=""
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "アカウントID: ${ACCOUNT_ID}"

# 信頼ポリシーは (2) と同じ（ECS のタスクだけが使える）
cat > ecs-tasks-trust.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "ecs-tasks.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

if aws iam get-role --role-name kasagichat-task-role >/dev/null 2>&1; then
  echo "kasagichat-task-role: 作成済みのためスキップ"
else
  aws iam create-role --role-name kasagichat-task-role \
    --assume-role-policy-document file://ecs-tasks-trust.json
fi

# インラインポリシー: Nova Lite の呼び出しだけを許可する
#   1つ目: 東京リージョンの APAC 推論プロファイル（アプリが指定する ID）
#   2つ目: 推論プロファイルの振り分け先となる各リージョンの Nova Lite 本体
cat > bedrock-invoke.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
      "Resource": [
        "arn:aws:bedrock:ap-northeast-1:${ACCOUNT_ID}:inference-profile/apac.amazon.nova-lite-v1:0",
        "arn:aws:bedrock:*::foundation-model/amazon.nova-lite-v1:0"
      ]
    }
  ]
}
EOF
aws iam put-role-policy --role-name kasagichat-task-role \
  --policy-name kasagichat-bedrock-invoke --policy-document file://bedrock-invoke.json

echo "kasagichat-task-role: 完了"
```

- 対象モデルを限定しておくことで、万一アプリが乗っ取られても高額なモデルを呼ばれにくくなります
- 推論プロファイル（`apac.` で始まるID）は、リクエストをアジア太平洋の複数のリージョンに振り分けます。Bedrock は、推論プロファイルと、振り分け先の各リージョンのモデルの両方に許可を求めます。振り分け先はプロファイルごとに決まっているため、`foundation-model` のリージョンを `*` にして、どこに振り分けられても呼び出せるようにしています
- アプリは Bedrock の Converse API（Spring AI の `bedrock-converse`）で呼び出します。Converse API の権限は `bedrock:InvokeModel`、ストリーミング版（ConverseStream）の権限は `bedrock:InvokeModelWithResponseStream` なので、この2つを許可しています
- 別のモデルに変える場合は、ブロックをメモ帳などに貼り付けて2か所のモデルIDを書き換え、CloudShell で実行し直してください（`put-role-policy` はポリシーを上書きします）

**確認**: 次のブロックを貼り付けると、4つのロールに付いているポリシーが表示されます。

```bash
export AWS_PAGER=""
for ROLE in AWSServiceRoleForECS ecsTaskExecutionRole ecsInfrastructureRoleForExpressServices kasagichat-task-role; do
  echo "=== ${ROLE}"
  echo -n "管理ポリシー: "
  aws iam list-attached-role-policies --role-name "$ROLE" --query 'AttachedPolicies[].PolicyName' --output json
  echo -n "インラインポリシー: "
  aws iam list-role-policies --role-name "$ROLE" --query 'PolicyNames' --output json
done
```

次のとおりに表示されれば完了です（`[]` は「何も付いていない」という意味です）。

| ロール | 管理ポリシー | インラインポリシー |
|---|---|---|
| `AWSServiceRoleForECS` | `AmazonECSServiceRolePolicy` | `[]` |
| `ecsTaskExecutionRole` | `AmazonECSTaskExecutionRolePolicy` | `kasagichat-read-ssm` |
| `ecsInfrastructureRoleForExpressServices` | `AmazonECSInfrastructureRoleforExpressGatewayServices` | `[]` |
| `kasagichat-task-role` | `[]` | `kasagichat-bedrock-invoke` |

コンソールでは **IAM** → **ロール** でロール名を検索し、**許可** タブで同じ内容を確認できます。

### 5-2. ECR リポジトリの作成

**目的**: GitHub Actions が作ったコンテナイメージを保管するリポジトリ `kasagichat-api` を作ります。

| 設定 | 値 | 理由 |
|---|---|---|
| タグの上書き | 禁止（`IMMUTABLE`） | 同じタグでの上書きを禁止し、どのイメージが動いているかを一意にする |
| 暗号化 | AES-256（既定） | 追加料金なしで保存時に暗号化される |
| ライフサイクルポリシー | 新しい10個だけ残す | 古いイメージを自動で削除し、保管料金を抑える |

```bash
mkdir -p ~/kasagichat-setup && cd ~/kasagichat-setup
export AWS_PAGER="" AWS_DEFAULT_REGION=ap-northeast-1

if aws ecr describe-repositories --repository-names kasagichat-api >/dev/null 2>&1; then
  echo "kasagichat-api: 作成済みのためスキップ"
else
  aws ecr create-repository --repository-name kasagichat-api \
    --image-tag-mutability IMMUTABLE \
    --encryption-configuration encryptionType=AES256
fi

# 作成済みのリポジトリがタグの上書きを許可している場合も、禁止にそろえる
aws ecr put-image-tag-mutability --repository-name kasagichat-api \
  --image-tag-mutability IMMUTABLE

# イメージが10個を超えたら、古いものから削除する
cat > ecr-lifecycle.json <<EOF
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep only the latest 10 images",
      "selection": {
        "tagStatus": "any",
        "countType": "imageCountMoreThan",
        "countNumber": 10
      },
      "action": { "type": "expire" }
    }
  ]
}
EOF
aws ecr put-lifecycle-policy --repository-name kasagichat-api \
  --lifecycle-policy-text file://ecr-lifecycle.json

echo "kasagichat-api: 完了"
```

**確認**: **Amazon ECR** → **プライベートレジストリ** → **リポジトリ** に `kasagichat-api` があり、タグのイミュータビリティが **Immutable** になっていること。リポジトリを開いた **ライフサイクルポリシー** にルールが1つあること。

### 5-3. デフォルト VPC の確認

**目的**: Express Mode は、東京リージョンのデフォルト VPC（AWS がアカウント作成時にリージョンごとに用意するネットワーク）のパブリックサブネットに ALB を作成します。デフォルト VPC を削除していると STEP 7 のサービス作成に失敗するため、ここで存在を確認します。

```bash
export AWS_PAGER="" AWS_DEFAULT_REGION=ap-northeast-1
aws ec2 describe-vpcs --filters Name=isDefault,Values=true \
  --query 'Vpcs[0].VpcId' --output text
```

- `vpc-` で始まるIDが表示されれば問題ありません
- `None` と表示された場合は、デフォルト VPC がありません。`aws ec2 create-default-vpc` を実行して作成してください（VPC とサブネット自体に料金はかかりません）

**つまずきポイント**
- `AccessDenied` や `is not authorized to perform` と表示される: 管理者ユーザー（`AdministratorAccess`）以外でログインしています。STEP 0-3 のアクセスポータルからログインし直して CloudShell を開いてください
- `Unable to locate credentials` と表示される、またはアカウントIDが空になる: CloudShell の接続が切れています。CloudShell の **アクション** → **再起動** を行い、ブロックを最初から貼り付け直してください
- 行頭に `>` が表示されたまま止まる: 貼り付けが途中で切れています。`Ctrl + C` で中断し、ブロック全体をコピーし直して貼り付けてください

---

## STEP 6: GitHub Actions 用 IAM ロール（OIDC）と GitHub の設定

**目的**: GitHub Actions から ECR へのイメージ push と ECS へのデプロイを行う権限を渡します。IAM ユーザーのアクセスキーを GitHub Secrets に保存する方法もありますが、キーは漏れると失効させるまで使われ続けます。OIDC なら AWS が実行のたびに短時間だけ有効な認証情報を発行し、しかも「KasagiChat-Background の production 環境からの実行」に限定できます。

6-1 と 6-2 は、STEP 5 と同じく CloudShell で実行します。

### 6-1. ID プロバイダの追加

**目的**: GitHub Actions が発行する「自分は どのリポジトリの どの環境から動いているか」という証明書（OIDC トークン）を、AWS が信用できるように登録します。

```bash
export AWS_PAGER=""
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "アカウントID: ${ACCOUNT_ID}"
PROVIDER_ARN="arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"

if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$PROVIDER_ARN" >/dev/null 2>&1; then
  echo "GitHub の ID プロバイダ: 作成済みのためスキップ"
else
  aws iam create-open-id-connect-provider \
    --url https://token.actions.githubusercontent.com \
    --client-id-list sts.amazonaws.com
fi
```

- `--url` は GitHub Actions のトークン発行元、`--client-id-list`（対象者）は「このトークンは AWS 向け」という意味の値です
- 以前は証明書のサムプリント（`--thumbprint-list`）の指定が必要でしたが、現在は省略すると IAM が自動で取得します

### 6-2. ロールの作成

**目的**: GitHub Actions が使うロール `kasagichat-github-deploy` を作り、デプロイに必要な権限だけを付けます。

GitHub で 2026 年 7 月 15 日以降に作成されたリポジトリの OIDC `sub` には、所有者 ID とリポジトリ ID が入ります。先に GitHub にログイン済みの端末で次を実行し、表示された数値を控えてください。プライベートリポジトリでは `gh auth login` が必要です。

```bash
gh api repos/Bakutaku/KasagiChat-Background --jq '{owner_id: .owner.id, repository_id: .id}'
```

CloudShell では、控えた数値を入力してからロールを作成します。

```bash
mkdir -p ~/kasagichat-setup && cd ~/kasagichat-setup
export AWS_PAGER=""
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "アカウントID: ${ACCOUNT_ID}"
read -r -p "GitHub 所有者 ID: " GITHUB_OWNER_ID
read -r -p "GitHub リポジトリ ID: " GITHUB_REPOSITORY_ID
: "${GITHUB_OWNER_ID:?GitHub 所有者 ID を入力してください}"
: "${GITHUB_REPOSITORY_ID:?GitHub リポジトリ ID を入力してください}"

# 信頼ポリシー: Bakutaku/KasagiChat-Background の production 環境から動くジョブだけが使える
cat > github-trust.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:Bakutaku@${GITHUB_OWNER_ID}/KasagiChat-Background@${GITHUB_REPOSITORY_ID}:environment:production"
        }
      }
    }
  ]
}
EOF

if aws iam get-role --role-name kasagichat-github-deploy >/dev/null 2>&1; then
  # 作成済みの場合も、信頼ポリシーを上の内容に置き換える
  aws iam update-assume-role-policy --role-name kasagichat-github-deploy \
    --policy-document file://github-trust.json
  echo "kasagichat-github-deploy: 作成済みのため信頼ポリシーを更新"
else
  aws iam create-role --role-name kasagichat-github-deploy \
    --assume-role-policy-document file://github-trust.json
fi

# インラインポリシー: ECR への push と ECS Express Mode へのデプロイだけを許可する
cat > ecs-deploy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EcrLogin",
      "Effect": "Allow",
      "Action": "ecr:GetAuthorizationToken",
      "Resource": "*"
    },
    {
      "Sid": "EcrPush",
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:PutImage",
        "ecr:BatchGetImage",
        "ecr:GetDownloadUrlForLayer"
      ],
      "Resource": "arn:aws:ecr:ap-northeast-1:${ACCOUNT_ID}:repository/kasagichat-api"
    },
    {
      "Sid": "EcsExpressDeploy",
      "Effect": "Allow",
      "Action": [
        "ecs:CreateCluster",
        "ecs:RegisterTaskDefinition",
        "ecs:CreateExpressGatewayService",
        "ecs:UpdateExpressGatewayService",
        "ecs:DescribeExpressGatewayService",
        "ecs:DescribeClusters",
        "ecs:DescribeServices",
        "ecs:ListServiceDeployments",
        "ecs:DescribeServiceDeployments",
        "ecs:TagResource",
        "ecs:UntagResource"
      ],
      "Resource": "*"
    },
    {
      "Sid": "PassEcsRoles",
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": [
        "arn:aws:iam::${ACCOUNT_ID}:role/ecsTaskExecutionRole",
        "arn:aws:iam::${ACCOUNT_ID}:role/ecsInfrastructureRoleForExpressServices",
        "arn:aws:iam::${ACCOUNT_ID}:role/kasagichat-task-role"
      ]
    }
  ]
}
EOF
aws iam put-role-policy --role-name kasagichat-github-deploy \
  --policy-name kasagichat-ecs-deploy --policy-document file://ecs-deploy.json

echo ""
echo "6-3 で GitHub に登録する値:"
echo "  AWS_DEPLOY_ROLE_ARN = arn:aws:iam::${ACCOUNT_ID}:role/kasagichat-github-deploy"
echo "  AWS_ACCOUNT_ID      = ${ACCOUNT_ID}"
```

最後に表示される2つの値は 6-3 で使うので控えておいてください。

- **信頼ポリシーの `sub`**: `deploy.yml` のデプロイジョブは GitHub の `production` 環境として実行されるため、`sub` は所有者・リポジトリの数値 ID と環境名で判定されます。他のリポジトリや production 環境以外のジョブからはこのロールを使えません
- **ECR**: push できるのは `kasagichat-api` リポジトリだけに限定しています。ログイン用の `ecr:GetAuthorizationToken` はリポジトリを指定できない操作のため `*` にしています
- **ECS**: デプロイ用アクション（`aws-actions/amazon-ecs-deploy-express-service`）が必要とする操作だけを許可しています。`ecs:CreateCluster` は、`default` クラスターが無い場合にアクションが作成するために使います
- **`iam:PassRole`**: 「このロールを ECS に使わせてよい」という許可です。対象を STEP 5 の3ロールに限定し、GitHub Actions から管理者権限のロールを ECS に渡せないようにしています

**確認**: 次のブロックを貼り付けます。

```bash
export AWS_PAGER=""
echo -n "信頼ポリシーの条件: "
aws iam get-role --role-name kasagichat-github-deploy \
  --query 'Role.AssumeRolePolicyDocument.Statement[0].Condition' --output json
echo -n "管理ポリシー: "
aws iam list-attached-role-policies --role-name kasagichat-github-deploy \
  --query 'AttachedPolicies[].PolicyName' --output json
echo -n "インラインポリシー: "
aws iam list-role-policies --role-name kasagichat-github-deploy --query 'PolicyNames' --output json
```

- 信頼ポリシーの条件に `repo:Bakutaku@<所有者 ID>/KasagiChat-Background@<リポジトリ ID>:environment:production` が含まれていること
- 管理ポリシーが `[]`、インラインポリシーが `kasagichat-ecs-deploy` であること

**Elastic Beanstalk 版の手順でこのロールを作成済みの場合**: 管理ポリシーに `AdministratorAccess-AWSElasticBeanstalk` が表示されます。広すぎる権限なので、次のコマンドで外してください。

```bash
aws iam detach-role-policy --role-name kasagichat-github-deploy \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess-AWSElasticBeanstalk
```

### 6-3. GitHub に登録

**目的**: ワークフローが使う値を GitHub の **Environment**（環境）に登録します。Environment は、シークレットや変数をまとめて置く入れ物です。`deploy.yml` のデプロイジョブは `environment: production` と指定しているため、このジョブだけが `production` に登録した値を使えます。6-2 の信頼ポリシーも `production` 環境からの実行だけを許可しています。

`KasagiChat-Background` は **public リポジトリ** で運用します。GitHub Free では、Environment のシークレット・変数・ブランチ制限を private リポジトリで使えないためです。public にしても、GitHub に登録した Secrets は外部から見えません。

**(1) リポジトリを public にする**

`KasagiChat-Background` → **Settings** → **General** → 最下部の **Danger Zone** → **Change repository visibility** → **Change to public** を選び、確認画面の指示に従って変更します。

公開前に、コミット履歴に本物のパスワードや鍵が含まれていないことを確認してください（`.env.example` のサンプル値と、`deploy.yml` の `test` ジョブのダミー値は問題ありません）。

**(2) production 環境を作成する**

1. **Settings** → 左メニュー **Environments** → **New environment**
2. Name に `production` と入力して **Configure environment**（小文字で表記どおりに入力する。`deploy.yml` と 6-2 の信頼ポリシーがこの名前を参照している）

**(3) 実行できるブランチを main に限定する**

1. 作成した環境の設定画面で、**Deployment branches and tags** のプルダウン（初期値 **No restriction**）を **Selected branches and tags** に変える
2. **Add deployment branch or tag rule** → Ref type **Branch**、Name pattern に `main` と入力して **Add rule**

ワークフローは **Actions** → **Run workflow** から手動実行でき、そのときにブランチを選べます。この制限が無いと、作業中のブランチを選んだ場合も本番のシークレットと IAM ロールが使えてしまいます。`deploy.yml` の `deploy` ジョブにも `main` の条件を書いていますが、ワークフローのファイルはブランチ上で書き換えられるため、GitHub の設定側でも制限します。`main` 以外から実行した場合にデプロイジョブが「ブランチが許可されていない」というエラーで止まるのは、この設定が効いているためです。

**(4) シークレットと変数を登録する**

同じ設定画面の **Environment secrets** と **Environment variables** に、それぞれ **Add environment secret** / **Add environment variable** から登録します。

public リポジトリでは、Actions の実行ログを誰でも閲覧できます。ログ上で Secrets は `***` に伏せられますが、Variables はそのまま表示されます。そのため、公開したくない値はすべて Secrets に登録します。

**Environment secrets**（ログで伏せ字になる）

| 名前 | 値 | Secrets にする理由 |
|---|---|---|
| `AWS_DEPLOY_ROLE_ARN` | 6-2 の最後に表示された値（`arn:aws:iam::<アカウントID>:role/kasagichat-github-deploy`） | アカウントIDを含むため |
| `AWS_ACCOUNT_ID` | 6-2 の最後に表示されたアカウントID（12桁） | AWS はアカウントIDをむやみに公開しないことを推奨している |
| `POSTGRESQL_HOSTNAME` | STEP 1 の host | DB の接続先を公開しないため |
| `POSTGRES_USER` | `postgres.<project-ref>` | Supabase のプロジェクトを特定できるため |

**Environment variables**（ログに表示されてよい値）

| 名前 | 値 |
|---|---|
| `APP_SECURITY_PUBLIC_URL` | `<公開URL>`（末尾の `/` なし） |
| `OAUTH_GITHUB_CLIENT_ID` | STEP 3 の GitHub クライアントID |
| `OAUTH_GOOGLE_CLIENT_ID` | STEP 3 の Google クライアントID |
| `DEMO_LLM_MODEL` | `apac.amazon.nova-lite-v1:0`（STEP 2 の推論プロファイルID） |

- OAuth のクライアントIDは、ログイン時にブラウザの URL に表示される値のため、公開されても問題ありません（クライアントシークレットは STEP 4 の SSM に置いています）
- GitHub の変数名は `GITHUB_` で始められないため、OAuth のクライアントIDは `OAUTH_` を付けた名前にしています（ワークフローがアプリ用の `GITHUB_CLIENT_ID` に変換して渡す）
- モデル一覧（`OPENAI_ALLOWED_MODELS` / `ANTHROPIC_ALLOWED_MODELS`）は既定値を使うため設定不要です

**確認**: `production` 環境の画面で、Deployment branches に `main` が1件、Environment secrets に4件、Environment variables に4件あること。

**環境変数とシークレットの正はワークフロー（`deploy.yml`）と GitHub の設定です。** デプロイのたびにこの内容で ECS のサービスを上書きするため、ECS コンソールで環境変数を直接変更しないでください。

---

## STEP 7: 初回デプロイ（ECS サービスの作成）

**目的**: GitHub Actions からコンテナイメージを作って ECR に登録し、ECS Express Mode のサービスを作成します。初回はサービスが存在しないため、デプロイ用アクション（`aws-actions/amazon-ecs-deploy-express-service`）が新規作成し、2回目以降は更新します。

### 7-1. デプロイ
`KasagiChat-Background` の変更（`Dockerfile`、`deploy.yml` 等）を main に push します。push 済みの場合は **Actions** → **Deploy to ECS Express Mode** → **Run workflow** で手動実行できます。

ワークフローの流れ:
1. `test`: PostgreSQL のサービスコンテナを立ててテストを実行（失敗したらデプロイしない）
2. `deploy`:
   - `bootJar` で jar を作成し、`Dockerfile` でコンテナイメージを作成
   - イメージを ECR に push。タグにはコミットの短縮SHAと実行IDを含める
   - Express Mode のサービス `kasagichat-api` を作成または更新する。設定は 0.5 vCPU / 2GB、タスク数 1〜2、コンテナポート 8080、ヘルスチェック `/actuator/health`
   - デプロイの完了を待ち、`/actuator/health` が応答することを確認する

初回はサービスと ALB・証明書の作成を含むため、10分前後かかります。

### 7-2. 確認
- Actions が緑になる
- 実行結果の **Summary** に `API URL: https://kasagichat-api.ecs.ap-northeast-1.on.aws` の形式で URL が表示される。**この URL を控えます**（以降「API URL」）
- `<API URL>/actuator/health` をブラウザで開くと `{"status":"UP"}` が返る

### 7-3. 作成されたリソースを見る（学習用）
**Amazon ECS** → **クラスター** → `default` → サービス `kasagichat-api` を開くと、Express Mode が作ったものを確認できます。

| タブ | 確認できるもの |
|---|---|
| **リソース** | ALB、リスナールール、ターゲットグループ、セキュリティグループ、ACM 証明書、オートスケーリングポリシー、ロググループ |
| **タスク** | 起動中のタスク。タスクを開くと、渡された環境変数（シークレットは参照先の名前のみ）や IP アドレスが見える |
| **デプロイ** | デプロイの履歴。カナリアデプロイの進行やロールバックの記録 |
| **ログ** | Spring Boot の標準出力（CloudWatch Logs） |

**注意**: サービスを削除して作り直すと API URL が変わります。その場合は STEP 8 の `API_PROXY_ORIGIN` を更新して再ビルドしてください。

---

## STEP 8: Amplify Hosting と独自ドメインの設定

**目的**: フロントエンドを公開URLで HTTPS 配信します。ブラウザは公開URLだけにアクセスし、`/api/*` などは Next.js の rewrites が API URL へ転送します。ブラウザから見たオリジンは同じになり、CORS 設定は不要です。

### 8-1. Amplify アプリの作成
1. **AWS Amplify** → **新しいアプリを作成** → **GitHub** → 認可して `Bakutaku/KasagiChat` / ブランチ `main` を選択
2. ビルド設定はリポジトリの `amplify.yml` が自動で使われる（「amplify.yml を検出しました」と表示される）
3. **詳細設定** → **環境変数** に追加:

   | 変数 | 値 |
   |---|---|
   | `API_PROXY_ORIGIN` | STEP 7 の API URL（末尾の `/` なし） |

4. **保存してデプロイ**

**確認**: ビルド完了後、`https://main.<app-id>.amplifyapp.com` で LP が表示されること（ログインは公開URLでしか動かないため、ここでは表示だけを確認します）。

**つまずきポイント**
- `API_PROXY_ORIGIN` は **ビルド時** の rewrites と **SSR 実行時** の画面ガードの両方で使います。`amplify.yml` が値の存在と `https://` を検査し、`.env.production` に書き出します。後から値を変えた場合は、Amplify で **このバージョンを再デプロイ** して再ビルドしてください
- ビルドが失敗したら、Amplify のビルドログで `preBuild`（依存関係のインストール）と `build` のどちらで失敗したかを確認してください

### 8-2. 独自ドメインの追加
1. Amplify のアプリ → 左メニュー **ホスティング** → **カスタムドメイン** → **ドメインを追加**
2. ドメイン名にルートドメイン（例: `example.com`）を入力
3. Route 53 のホストゾーン作成を提案されるが、**手動設定（Manual configuration）** を選んで **ドメインを設定**
4. サブドメインの一覧で、ルート（空欄）と `www` の行を削除し、`app` → ブランチ `main` の1行だけにする
5. 証明書は **Amplify マネージド証明書** を選び、**ドメインを追加**
6. **アクション** → **DNS レコードを表示** で、次の2つの CNAME を控える

| 用途 | ホスト名の例 | 値の例 |
|---|---|---|
| 証明書の検証 | `_c3e2d7eaf1e656b73f46cd6980fdc0e.example.com` | `_cjhwou20vhu2exampleuw20vuyb2ovb9.xxxx.acm-validations.aws` |
| サブドメインの転送先 | `app.example.com` | `d111111abcdef8.cloudfront.net` |

### 8-3. Xserver の DNS にレコードを追加
**証明書の検証は追加直後から始まり、時間が経つと確認の頻度が下がります。** 8-2 の後、すぐに DNS へ登録してください。

1. ドメインの DNS を管理している画面を開きます。
   - Xserverドメインで取得し、ネームサーバーを変更していない場合: Xserverアカウント → ドメインの **DNSレコード設定**
   - Xserver のレンタルサーバーにドメインを設定している場合: サーバーパネル → **DNSレコード設定**
   - どちらか分からない場合は、`nslookup -type=ns <ドメイン>` で表示されるネームサーバーを確認してください
2. 8-2 の2つを **CNAME** レコードとして追加します。
   - ホスト名の欄には、ドメイン部分を除いた部分だけを入力します（例: `_c3e2d7eaf1e656b73f46cd6980fdc0e`、`app`）。`.example.com` まで入力すると `app.example.com.example.com` という誤ったレコードになります
   - 内容（値）の欄には、表示された値をそのまま入力します
3. Amplify のカスタムドメイン画面で、状態が **利用可能（Available）** になるまで待ちます。通常は数十分ですが、DNS の反映によっては最大48時間かかります

**確認**: `https://<公開URL>` で LP が証明書エラーなく表示されること。

**つまずきポイント**
- 「検証保留中」のまま進まない場合は、CNAME のホスト名・値の入力誤りを確認します。修正しても進まない場合は、Amplify でドメインを削除して追加し直すと検証がやり直されます
- **証明書の検証用 CNAME は削除しないでください。** Amplify の証明書は自動更新されますが、このレコードが無いと更新に失敗します

---

## STEP 9: 通しの動作確認

### 9-1. 公開URLで確認
1. LP が表示される
2. GitHub / Google でログインできる → 規約同意 → 本登録
3. マップが表示される
4. デモの合言葉で会話を1往復できる（Bedrock 経由）
5. ブラウザの開発者ツール → Application → Cookies で、セッション Cookie に `Secure` と `HttpOnly` が付いている

### 9-2. うまくいかないとき
アプリのログは **ECS** → クラスター `default` → サービス `kasagichat-api` → **ログ** タブ（または **CloudWatch** → **ロググループ** の `/aws/ecs/default/kasagichat-api-...`）で確認します。タスクが起動しない場合は、サービスの **デプロイ** タブと、停止したタスクの **停止理由** を確認します。

| 症状 | 主な原因 |
|---|---|
| `Schema-validation: missing table/column` | STEP 1 のスキーマ投入漏れ、またはエンティティ変更後に Supabase へ反映していない |
| DB 接続タイムアウト | host が Session pooler ではない、ユーザー名が `postgres.<project-ref>` になっていない、GitHub の Secrets（`POSTGRESQL_HOSTNAME` / `POSTGRES_USER`）の設定漏れ（空文字列のまま渡る） |
| デプロイがロールバックされる / Actions が失敗する | アプリが起動に失敗している（ログを確認）、またはヘルスチェック `/actuator/health` が `UP` にならない |
| 停止理由が `ResourceInitializationError: unable to pull secrets` | SSM のパラメータ名の誤り、または `ecsTaskExecutionRole` の `kasagichat-read-ssm` ポリシー漏れ（STEP 5-1 の確認ブロックで確認できる） |
| 停止理由が `CannotPullContainerError` | ECR のリポジトリ名の誤り、または `ecsTaskExecutionRole` の管理ポリシー漏れ |
| OAuth で `redirect_uri` エラー | OAuth アプリのコールバック URL と `APP_SECURITY_PUBLIC_URL` の不一致 |
| ログイン後に localhost へ戻る | `APP_SECURITY_PUBLIC_URL` の設定漏れ |
| `/api/*` が 404 / 500 | Amplify の `API_PROXY_ORIGIN` 未設定・誤り、設定後に再ビルドしていない、または ECS サービスの作り直しで API URL が変わった |
| Bedrock で `AccessDenied` | STEP 5-1 (4) のポリシーのモデル名・リージョンが `DEMO_LLM_MODEL` と一致していない |
| Actions の AWS 認証で `sts:AssumeRoleWithWebIdentity` が拒否される | STEP 6-2 の IAM ロール信頼ポリシーを確認する。特に `sub` が所有者・リポジトリの数値 ID を含む現在の形式か、`aud` が `sts.amazonaws.com` か、GitHub の環境名が `production` か、`AWS_DEPLOY_ROLE_ARN` がそのロールを指すかを照合する |
| Actions のデプロイで `AccessDenied`（`iam:PassRole` 等） | STEP 6-2 のインラインポリシー漏れ、または Secrets の `AWS_ACCOUNT_ID` の誤り（6-2 の最後に表示された値と比べる） |
| Actions のデプロイで `service linked role` に関するエラー | STEP 5-1 (1) の `AWSServiceRoleForECS` が未作成。ロールの作成直後の場合は、IAM の反映待ちのため1分ほど待ってから **Re-run jobs** で再実行する |
| Actions のデプロイで VPC・サブネットに関するエラー | 東京リージョンにデフォルト VPC が無い（STEP 5-3） |

---

## セキュリティ上の注意

- **公開区間は HTTPS**: ブラウザ ↔ Amplify と Amplify ↔ ALB を TLS で暗号化します。ALB ↔ タスクは VPC 内 HTTP で、タスクのセキュリティグループは Express Mode が ALB からの通信だけを許可するよう作成します。API キーとセッション Cookie が Amplify から出る経路に `http://` を指定しないでください
- **シークレットの置き場所**: SSM パラメータストア（SecureString）と GitHub Secrets だけに置きます。`.env`、手順書、Issue、チャットに実値を貼らないでください
- **権限の分離**: タスク実行ロール（起動処理）とタスクロール（アプリ）を分け、アプリには Bedrock の指定モデルの呼び出しだけを許可しています
- **暗号化鍵は環境ごとに別**: 本番鍵が漏れると、DB が漏れた場合にユーザーの API キーが復号されます。逆に失うと保存済みキーが使えなくなります
- **ルートユーザーは使わない**: 日常作業は IAM Identity Center の管理者ユーザーで行います

---

## 後続タスク（本手順の対象外）

requirements.md「運用」節に記載済みの項目で、デモ動画撮影までに対応します。

- Supabase 無料プランの一時停止対策（GitHub Actions の cron で日次アクセス、または審査期間中の Pro 化）
- 日次 DB バックアップ（GitHub Actions の cron で `pg_dump` → S3）
- 常設デモイベント・サンプルNPCの本番投入（現在は `debug` プロファイルの `DevelopmentDemoEventInitializer` でのみ作成される）
- 独自ドメインの更新期限の確認（期限切れになると公開URLと証明書の更新が止まる）
