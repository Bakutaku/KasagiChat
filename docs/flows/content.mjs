// このファイルが資料の編集元。APIの正本はバックエンドREADME、要件の正本はrequirements.md。
// 各ステップ: [担当列 0=画面/1=Spring/2=DB/3=外部, 見出し, 説明, 状態 existing/planned/discuss]
export const features = [
  {
    id:'auth', title:'ログイン・利用規約', group:'はじめる', priority:'Must', lead:'OAuthで本人確認し、規約への同意後に本登録する。',
    current:'画面・APIとも実装あり。初回登録後は /home（現在は Hello World）へ。既存ユーザーのOAuth成功時は / へ戻る。家・キー設定への振り分けは未接続。',
    steps:[
      [0,'Google / GitHubでログイン','/oauth2/authorization/{provider} に移動。','existing'],
      [3,'OAuthで本人確認','Springへコールバック。Google・GitHubの設定定義は存在するが、実接続は今回未検証。','existing'],
      [1,'既存か初回かを判定','OAuthLoginSuccessHandler が provider + subject で照合。','existing'],
      [2,'認証状態を保存','既存はROLE_USER。初回はpending_usersと仮登録セッションを用意。','existing'],
      [0,'初回だけ規約に同意','仮登録情報と最新規約を取得。表示名・同意した規約IDを送る。','existing'],
      [1,'本登録・セッション更新','最新規約を再検証 → users / user_auth / user_terms_agreementを保存 → 仮登録を削除。セッションIDも更新。','existing'],
      [0,'初回フローの続きへ','GET /api/user/me の credentialConfigured / npcCreated / npcBorn を見て、キー設定 → NPC誕生 → 家へ案内する。','planned']
    ],
    apis:[['GET','/api/auth/csrf','existing','変更操作前にCSRF Cookieを初期化'],['GET','/api/terms/required','existing','有効な最新規約'],['GET','/api/registrations/me','existing','仮登録情報'],['POST','/api/registrations/complete','existing','規約同意・本登録'],['GET','/api/user/me','existing','ユーザーと初回進捗'],['POST','/api/logout','existing','セッション破棄']],
    data:'users・user_auth・pending_users・terms・user_terms_agreement・JDBCセッション。本人の内部IDはセッションから取得する。',
    failure:'期限切れならOAuthからやり直す。規約更新・同意不足は最新規約を取得し直す。変更APIはCookieに加え X-XSRF-TOKEN が必要。ログアウト後の画面遷移も統合確認が必要。',
    decisions:['招待コードを初回フローの間どこに保持し、登録後にどこへ戻すか。現在のproxyはリダイレクト時にクエリを消す。','バックエンドREADMEの「Googleのみ」「credentialConfiguredは常にfalse」は現コードと不一致。コードはGitHub設定・DBのキー存在判定を持つ。'],
    sources:['F:src/proxy.ts','F:src/app/(fullscreen)/signup/signup-form.tsx','B:security/handler/OAuthLoginSuccessHandler.java','B:security/controller/RegistrationController.java','B:security/service/UserService.java']
  },
  {
    id:'credentials',title:'APIキー・デモ設定',group:'はじめる',priority:'Must',lead:'AIを使う前に接続方法を決める。キーはSpring側で管理する。',
    current:'api_credentials・demo_usages・demo_passphrasesのモデルはある。登録・削除API、暗号化処理、LLM接続は未実装。利用状況の取得APIは仮実装あり。',
    steps:[
      [0,'接続方法を選ぶ','OpenAI / Anthropicのキー、またはDEMOの合言葉を入力して「登録」。','planned'],
      [1,'入力とプロバイダを検証','PUT /api/credentials。ユーザー指定のbase URLは受け付けない。','planned'],
      [3,'BYOKなら有効性確認','モデル一覧取得等で1回検証。これは外部APIへの通信であり、必ずしも文章生成ではない。','planned'],
      [2,'DEMOなら合言葉を照合','demo_passphrasesの有効性を確認。運営キーそのものはブラウザへ返さない。','planned'],
      [1,'キーを暗号化する','BYOKを暗号化。暗号化鍵はDBと別管理。DEMOは運営の接続設定を利用する。','planned'],
      [2,'ユーザーごとの設定を保存','api_credentials。DEMO回数はアカウント単位でdemo_usagesへ。','planned'],
      [0,'登録完了 → NPC誕生へ','再表示はマスク済みキー・プロバイダ・デモ残回数だけ。設定画面で変更・削除できる。','planned']
    ],
    apis:[['GET / PUT / DELETE','/api/credentials','planned','設定の参照・登録変更・削除'],['GET','/api/usage/summary','existing','利用回数とコストの概算']],
    data:'api_credentials・demo_usages・demo_passphrases。OpenAI互換接続先は運営設定。LM Studioのlocalhostはローカル開発での接続先。',
    failure:'無効キー・無効合言葉は保存せず入力画面に戻す。呼び出し上限なら生成前に止める。通信失敗時は本人が再試行する。',
    decisions:['DEMO上限の予約・確定・失敗時返却をどう扱うか。並列リクエストでも上限を超えない制御が必要。','利用状況の仮実装は「ユーザー発言数＋振り返り数＋開封数」×固定単価。要件の「実usage×モデル別単価」と違う。失敗・再試行の課金も集計できない。'],
    sources:['B:credential/model/ApiCredential.java','B:usage/service/UsageService.java','R:README.md']
  },
  {
    id:'birth',title:'NPC誕生',group:'はじめる',priority:'Must',lead:'NPCのレコード作成と、会話を通じた「誕生完了」は別の段階。',
    current:'POST /api/npc は未誕生NPCを作る。会話・振り返りによるbornAt更新は未実装。誕生画面はこのチェックアウトにない。',
    steps:[
      [0,'名前とプリセットを選ぶ','キー設定後の画面で選択。プリセット一覧APIは設けず、前後で同じIDを持つ。','planned'],
      [1,'未誕生NPCを作成','POST /api/npc。1ユーザー1体。NpcServiceが重複を確認。','existing'],
      [2,'npcsへ保存','bornAtが空の状態。ここではまだ人格形成は終わっていない。','existing'],
      [1,'BIRTH会話を開始・再開','POST /api/conversations。冒頭はマスタから選ぶのでLLM不要。','planned'],
      [0,'3往復から終了可能、6往復で締め','毎送信で会話APIへ。6往復目はサーバが締めの指示を注入する。','planned'],
      [1,'振り返りへ進む','誕生会話も共通のreview APIを使用。6往復後の呼び出し操作は要確認。','planned'],
      [2,'振り返り成功時に誕生確定','人格・口調・話題・EXP・bornAt等を一括反映。失敗時は未誕生のまま。','planned'],
      [0,'家で暮らしを始める','再訪時はnpcBornを使って誕生フローを繰り返さない。','planned']
    ],
    apis:[['POST','/api/npc','existing','名前・プリセットで未誕生NPCを作成'],['POST','/api/conversations','planned','type=BIRTH'],['POST','/api/conversations/{id}/messages','planned','発言とexpectedTurn'],['POST','/api/conversations/{id}/review','planned','3往復以上で振り返り']],
    data:'npcs（userとの1:1、bornAt）・conversations・messages・conversation_openings。人格・口調は振り返り成功後に確定する。',
    failure:'NPC作成の重複はNPC_ALREADY_EXISTS。途中離脱は同じBIRTHを再開。振り返り失敗はログを使って手動再実行。',
    decisions:['6往復で自動的に会話が締まった後、振り返りは別の「誕生をまとめる」操作にする案。明示操作原則と合わせて決める。','6往復の設定値の保存場所と、プリセット/外見レイヤーの最終契約。'],
    sources:['B:npc/service/NpcService.java','B:npc/model/Npc.java','F:requirements.md']
  },
  {
    id:'map',title:'マップ・場所の移動',group:'会話する',priority:'Must',lead:'移動は画面の仕事。場所を訪れたときに必要な機能を開く。',
    current:'現在のmainにはマップ画面・レンダラーがない。他ブランチの試作はこの実装状況に含めていない。',
    steps:[
      [0,'家から街へ出る','マップとNPCの素材を読み込む。基本はPCブラウザ向け。','planned'],
      [0,'5スポットへ移動','家・カフェ・ロビー・オフィス・広場。座標や歩行はクライアントで表現。','planned'],
      [0,'場所に応じた機能を選択','カフェ=雑談、ロビー=初対面/イベント入口、オフィス=面接、家=プロフィール・成長。','planned'],
      [1,'必要なデータだけ取得','会話開始や家・イベントの取得APIへ。移動のたびにLLMは呼ばない。','planned'],
      [0,'会話オーバーレイを表示','背景を残しマップ更新を一時停止。閉じたら移動を再開。','planned']
    ],
    apis:[['—','移動専用APIは現設計にない','planned','遷移先の機能APIを利用']],
    data:'マップ素材・配置は画面用。ユーザーの会話状態や成長値はSpring側。イベントNPCの歩き回りも演出であり、実際の他人の操作とは同期しない。',
    failure:'スマホでマップを開いた場合はPCへの案内。招待参加・カード開封はスマホ幅にも対応する。',
    decisions:['現要件はPixiJS前提。他ブランチのマップ試作を採用する場合は描画方式と素材形式を再確認。','ロード失敗時の表示、場所移動と進行中会話の復帰導線。'],
    sources:['F:requirements.md','F:src/app/(navigation)/home/page.tsx']
  },
  {
    id:'practice',title:'練習・メッセージ送信',group:'会話する',priority:'Must',lead:'成功した1往復ごとに保存する。練習相手はシーン専用NPC。',
    current:'Conversation・MessageとRepositoryはあるが、会話Controller/ServiceとLLMアダプタはない。DBモデルがあることと会話が動くことは別。',
    steps:[
      [0,'場所を訪れて会話を開く','PRACTICE + CAFE / LOBBY / OFFICE。分身は同行し、相手は固定の別人格。','planned'],
      [1,'新規作成、または未振り返り会話を返す','同一ユーザー・種別・シーンで再開。新規なら冒頭とthemeをマスタから選ぶ。','planned'],
      [2,'冒頭を1件目のメッセージとして保存','この時点で往復数turn=0。冒頭表示にLLMコストはかからない。','planned'],
      [0,'発言を送る','text（1〜2000文字）とexpectedTurnを送信。送信中は再操作を抑止。','planned'],
      [1,'所有者・会話状態・往復数を確認','キー/デモ残量と会話履歴、シーン設定、themeから入力を組み立てる。','planned'],
      [3,'短い返答を生成','1回呼び出し、全文を受け取る。タイムアウト60秒、自動再試行なし。','planned'],
      [2,'発言＋応答＋往復数をまとめて保存','成功した往復だけ確定。LLM失敗時はユーザー発言も保存しない。','planned'],
      [0,'返答を表示 → 続行 / 終了','全文取得後にタイプライター演出。練習に往復数上限なし。「終える」で振り返り。','planned']
    ],
    apis:[['POST','/api/conversations','planned','開始201・再開200'],['GET','/api/conversations/{id}','planned','ログ・状態・canFinish'],['POST','/api/conversations/{id}/messages','planned','expectedTurnによる競合検出'],['POST','/api/conversations/{id}/review','planned','練習は1往復以上']],
    data:'conversations → messages（1対多）、opening_id → conversation_openings。会話の所有者・turn・状態はサーバが管理。',
    failure:'LLM_CALL_FAILEDなら同じ発言を本人が再送。TURN_MISMATCHや応答受信前の切断では、先に会話詳細を再取得し、サーバで成功済みか確認する案。終了済みには送信不可。',
    decisions:['expectedTurnや@Versionだけでは、同時に発生する外部LLM呼び出しを1回にできない。送信処理の予約/排他を決める。','IN_PROGRESSを離脱後に再開する場合と、FINISHEDを振り返り待ちとして表示する場合を分ける。'],
    sources:['B:conversation/model/Conversation.java','B:conversation/model/Message.java','B:conversation/model/enums/ConversationStatus.java','R:README.md']
  },
  {
    id:'review',title:'振り返り・まとめて成長',group:'会話する',priority:'Must',lead:'最も多くの機能がつながる中心処理。AIの結果を検証してから一括反映する。',
    current:'会話モデルに振り返り保存欄はあるが、生成・一括反映の処理は未実装。LevelServiceなど一部の部品のみ存在。',
    steps:[
      [0,'「会話を終える」または「再びまとめる」','離脱した会話も家の未振り返り一覧から個別に実行。自動で課金処理を始めない。','planned'],
      [1,'実行条件と処理済み状態を確認','本人の会話か、必要往復数を満たすか。振り返り済みなら保存結果を返して終了。','planned'],
      [2,'ログと現在のプロフィールを読む','ユーザー発言から学ぶ。非公開話題は本人の成長処理には利用できる。','planned'],
      [3,'振り返りJSONを1回で生成','人格文書・話題/カテゴリ/興味度/センシティブ判定・口調の文章・褒めFB・演出文・次の質問。EXPは出力に任せない。','planned'],
      [1,'出力を検証し、EXPを機械計算','型・長さ・カテゴリ等を検証。JSONパース失敗だけ1回再試行。exp_rules / level_curvesを参照。','planned'],
      [2,'成功結果を1トランザクションで反映','npcs・topics・daily_questions・会話の振り返り結果・カウンター/実績/必要な通知。BIRTHならbornAtも。','planned'],
      [0,'褒めFB・レベル・思い出を表示','画面は保存結果を表示する。再表示や再送でEXPを二重に足さない。','planned']
    ],
    apis:[['POST','/api/conversations/{id}/review','planned','終了・振り返り・再試行'],['GET','/api/conversations?status=UNREVIEWED','planned','家の未振り返り一覧']],
    data:'IN_PROGRESS / FINISHED → REVIEWED。UNREVIEWEDはAPI上の検索条件であり、現enumの値ではない。未振り返りはIN_PROGRESSとFINISHEDを対象にする設計。',
    failure:'生成失敗ならプロフィール・EXPを部分更新せず未振り返りとして残す。LLM成功後にDB保存が失敗すると外部課金は巻き戻らない。再試行と成功済み結果の再取得を区別する。',
    decisions:['振り返り中のプロフィール手編集と別会話の振り返りが競合した場合の扱い。古いプロフィールで上書きしない仕組みが必要。','処理中フラグ/予約レコード、LLM結果の一時保存、反映の一意キーは未決定。','手動削除した話題の再抽出や手動の公開設定をどこまで維持するか。Memory要約の追加は現要件に未記載。'],
    sources:['F:requirements.md','B:conversation/model/Conversation.java','B:npc/service/LevelService.java','B:npc/model/Topic.java','B:npc/model/Memory.java']
  },
  {
    id:'daily',title:'今日のひとこと',group:'会話する',priority:'Must',lead:'前回の振り返りが、次に話しかけるきっかけを用意する。',
    current:'DailyQuestionモデルとRepositoryはある。質問取得・消化処理・家での表示は未実装。',
    steps:[
      [2,'前回の振り返りで質問を保存','振り返り出力の「次に聞きたいこと」をdaily_questionsへ。質問専用の追加LLM呼び出しなし。','planned'],
      [0,'家を開く','GET /api/daily-question。自動で表示するのは保存済みの質問。','planned'],
      [1,'未消化の質問を返す','質問なしなら204。質問がないだけで新規生成しない。','planned'],
      [0,'返事をするため会話を開く','type=DAILY。未振り返りがあれば同じ会話を再開する。','planned'],
      [1,'共通の会話処理を使う','冒頭は質問。以後の送信は1回ずつLLMを呼ぶ。短めの応答をプロンプトで誘導。','planned'],
      [0,'本人が「会話を終える」','1往復以上で振り返り可能。質問を読むだけでEXPは増えない。','planned'],
      [2,'振り返り成功 → 次の質問へ','共通の成長更新を実施。質問の消化タイミングは要決定。','planned']
    ],
    apis:[['GET','/api/daily-question','planned','保存質問 / 質問なし204'],['POST','/api/conversations','planned','type=DAILY'],['POST','/api/conversations/{id}/messages','planned','共通の発言処理'],['POST','/api/conversations/{id}/review','planned','共通の振り返り']],
    data:'daily_questions ↔ conversations.daily_question_id。追加コストゼロなのは質問の用意・表示であり、返事の生成と振り返りはLLMを使う。',
    failure:'質問がない場合は通常の家を表示。途中離脱しても未振り返りを再開。質問を開いただけで消費してしまわないようにする案。',
    decisions:['消化は開始・初回返信・振り返り成功のどこか。成功時に消化する案を推奨。','「今日」の日付境界・タイムゾーン、複数質問の選び方、同日の再表示ルール。'],
    sources:['B:conversation/model/DailyQuestion.java','F:requirements.md','R:README.md']
  },
  {
    id:'home',title:'家・プロフィール帳',group:'育てる',priority:'Must',lead:'学習した内容を本人が確認・修正し、話題を外に出す範囲を決める。',
    current:'NPC取得/編集・話題一覧/公開変更/削除APIは実装あり。家の画面、会話後の学習反映、イベントへの公開制御の接続は未実装。',
    steps:[
      [0,'家・プロフィール帳を開く','NPC・話題・未振り返り・必要な通知を取得する画面を用意。','planned'],
      [1,'本人のNPCと話題を取得','GET /api/npc と /api/npc/topics。統計は読み取り専用。','existing'],
      [0,'人格・口調を編集、話題を公開/非公開/削除','口調は引用集ではなく文章。名前変更や着せ替えは現PATCHの対象ではない。','planned'],
      [1,'所有者と文字数等を検証','PATCH /api/npc、PATCH/DELETE /api/npc/topics/{id}。他人の話題は見つからない扱い。','existing'],
      [2,'編集を保存','公開変更はvisibilityDecidedAtを保存。話題削除は関連MemoryもJPAで削除。','existing'],
      [0,'話題から部屋の品物を描き直す','カテゴリ付き話題→対応する品物。カテゴリなし→本棚。非公開話題の品物も本人の家に表示可。','planned']
    ],
    apis:[['GET / PATCH','/api/npc','existing','人格・口調・口調ON/OFF'],['GET','/api/npc/topics','existing','カテゴリ情報付き話題'],['PATCH / DELETE','/api/npc/topics/{id}','existing','公開変更・削除']],
    data:'npcs → topics → topic_categories。思い出の「品」は話題から導出する。Memoryモデルは「出来事の要約」であり品物台帳ではない。',
    failure:'更新失敗なら表示を成功扱いにしない。削除した話題の品物は消えるが、過去の会話ログ・人格文書・開封済みカードの文章まで自動削除する実装ではない。',
    decisions:['Memoryの保持と利用は要件へ反映するか再検討。現コードでは話題削除に連動するが、公開カードの入力範囲は別途確定する。','公開から非公開へ変えたとき、未開封カード表面の古い共通タグをどう更新/非表示にするか。','人格文書に残った誤学習は手動編集で直せる。話題削除後の再学習抑制は未決定。'],
    sources:['B:npc/service/NpcService.java','B:npc/service/TopicService.java','B:npc/model/Topic.java','B:npc/model/Memory.java','F:requirements.md']
  },
  {
    id:'growth',title:'EXP・実績・報酬',group:'育てる',priority:'Must / Should',lead:'AIは感想を書く。EXP・レベル・実績はサーバのルールで決める。',
    current:'レベル計算・達成済み実績の一覧/受取・通知取得/一括既読は実装あり。行動からのカウンター更新と汎用達成判定、会話との接続、着せ替えUIは未実装。',
    steps:[
      [1,'行動が成功したら加算を確定','会話系は振り返り成功時。イベント参加・ログイン日数などは該当する操作でカウント。','planned'],
      [2,'EXP・カウンターのマスタを読む','exp_rules / level_curves / counter_defs / achievement_defs。値はDBで調整。','planned'],
      [1,'EXPからレベルを計算','LevelService.applyExp。累計EXPで判定し、レベルアップ通知を保存する部品はある。','existing'],
      [2,'閾値を越えた実績を記録','未受取のachievementsを作成する汎用判定はこれから。','planned'],
      [0,'箱を開けて報酬を受け取る','一覧からPOST /api/achievements/{id}/claim。','planned'],
      [1,'受取済みか確認して1回だけ反映','ユーザーをロック → 未受取行だけ更新 → ITEM / EXP / NONEを処理。受取済みは再加算しない。','existing'],
      [2,'解禁アイテム・EXPを保存','unlocked_itemsへの重複解禁を避ける。EXP報酬はNPCをロックしてLevelServiceへ。','existing'],
      [0,'成長を表示・通知を読み返す','通知一覧と既読APIはある。服装変更はShould、図鑑もShould。','planned']
    ],
    apis:[['GET','/api/achievements','existing','達成済み実績の一覧・claimedで絞込み'],['POST','/api/achievements/{id}/claim','existing','報酬受取'],['GET','/api/growth-events','existing','未読、または直近50件'],['POST','/api/growth-events/read','existing','本人の未読を一括既読']],
    data:'achievement_counters → achievement_defs → achievements → unlocked_items。レベルはnpcs、通知はgrowth_events。思い出の品はこの解禁台帳と分けて話題から表示。',
    failure:'受取再送は既存状態を返す。EXP報酬でNPC不在なら失敗し同一トランザクションを戻す。通知既読は報酬受取ではない。',
    decisions:['idea.mdの「直近の成長内容で報酬選択」と現実装の固定報酬マスタをどう結ぶか。','EXP報酬による追加レベルアップから次の実績を生む処理の順序。','一括既読でまだ表示していない通知も既読になるため、表示単位との整合を決める。'],
    sources:['B:npc/service/AchievementService.java','B:npc/service/LevelService.java','B:npc/service/GrowthEventService.java','F:requirements.md']
  },
  {
    id:'events',title:'イベント作成・招待・参加',group:'出会う',priority:'Must',lead:'イベントに参加すると、同じ会場にいるNPC同士の相性を計算する。',
    current:'Event・EventParticipant・Cardモデルと開発用デモイベントのシードはある。イベント/招待API、参加制御、会場UIは未実装。',
    steps:[
      [0,'作成者がイベントを作る','タイトル・説明・開始/終了日・会場テンプレートを入力。','planned'],
      [1,'期間等を検証して招待コード発行','POST /api/events。作成者も自動参加する設計。','planned'],
      [2,'eventsとevent_participantsを保存','6〜8文字のコードを保存。QR画像はフロントで作る。','planned'],
      [0,'参加者がURL / QRから入る','未ログインならOAuth・規約・キー設定・NPC誕生を経て戻る。招待API自体はログイン後のみ。','planned'],
      [1,'参加条件を確認する','誕生済みNPC・イベント期間・既参加を判定。参加済みは成功扱い。','planned'],
      [2,'参加を確定 → マッチングへ','参加行を保存し公開話題から再計算。カード表面を用意する。LLM不使用。','planned'],
      [0,'PCは会場、スマホはカードへ','会場入場時に参加者と自分宛てカードを取得。滞在中のポーリング/WSなし。','planned']
    ],
    apis:[['POST / GET','/api/events','planned','作成・自分のイベント一覧'],['GET','/api/events/{id}','planned','参加者向け詳細'],['GET','/api/events/{id}/participants','planned','名前とプリセットID'],['GET','/api/invitations/{code}','planned','ログイン後の招待参照'],['POST','/api/invitations/{code}/join','planned','参加・再マッチング'],['DELETE','/api/events/{id}/participants/me','planned','退出'],['DELETE','/api/events/{id}','planned','作成者のみのイベントを削除'],['POST','/api/events/{id}/archive','planned','早期終了・Should']],
    data:'events → event_participants → cards。開催前/開催中/終了の表示フェーズは日時とアーカイブから判定する設計。常設デモは専用APIを増やさずシードで用意。',
    failure:'未誕生はNPC_NOT_BORN、終了後参加はEVENT_ENDED。他の参加者がいれば物理削除不可。退出者は以後のマッチング・相手側未開封カードから除き、開封済み報告は残す。',
    decisions:['再参加を参加回数に再加算するか。作成者の退出・過去に他者が参加したイベントの削除条件。','参加成功とマッチング失敗の境界。参加とカード更新を原子的にするか、再計算待ちを持つか。','終了後に未開封カードを初めて開ける可否。保存済みカードの再閲覧は要件上可能。'],
    sources:['B:event/model/Event.java','B:event/model/EventParticipant.java','B:event/config/DevelopmentDemoEventInitializer.java','F:requirements.md','R:README.md']
  },
  {
    id:'matching',title:'相性計算・カード配布',group:'出会う',priority:'Must',lead:'公開話題だけを使う機械計算。全員の上位候補を集めて相互に届ける。',
    current:'カード保存モデルはある。スコア計算、上位選択、最低保証、相互配布のServiceは未実装。',
    steps:[
      [1,'参加をきっかけに再計算','対象イベントの有効な参加者を集める。退出済み・本人同士の組合せは除外。','planned'],
      [2,'公開話題だけを読む','カテゴリ・話題名・興味度。非公開話題・会話ログは相性計算へ渡さない。','planned'],
      [1,'ペアごとの相性を計算','カテゴリ一致を興味度で重み付け、近い話題名を加点。同点は機械的に解消。','planned'],
      [1,'各人の上位3人を選ぶ','相手がいる限り最低1枚を保証。AがBを選んだらBにもAのカードを届ける。3枚を超えてよい。','planned'],
      [2,'受取人別のカード表面を保存','イベント＋受取人＋相手を一意にする。相性スコア・共通タグを持つが報告はまだ空。','planned'],
      [0,'カード到着を表示','参加応答または会場を開いたときの取得で反映。歩行/カササギ演出はクライアントで行う。','planned']
    ],
    apis:[['POST','/api/invitations/{code}/join','planned','内部でマッチング実行'],['GET','/api/events/{id}/cards','planned','自分宛てカード表面']],
    data:'公開topics → スコア → 上位候補の相互化 → cards。A向けBカードとB向けAカードは別レコード。LLMもembeddingも使わない。',
    failure:'参加者が本人しかいなければ相手は作れないため最低1枚は成立しない。デモはサンプルNPCで相手を確保。共通タグゼロなら、共通点を捏造せず表示する。',
    decisions:['重みの数値、話題名の正規化、完全同点時の安定した並べ方を確定する。','後から参加者が増えたとき、既配布の未開封カードを置換するか追加保持するか。開封済み報告は上書きしない。','公開設定変更時の古い共通タグと、開封時の最新公開話題の差分をどう説明するか。'],
    sources:['F:idea.md','F:requirements.md','B:event/model/Card.java']
  },
  {
    id:'cards',title:'カード開封・会話報告',group:'出会う',priority:'Must',lead:'開く操作で初めてAIを呼び、受取人向けの報告を1回生成して保存する。',
    current:'Cardはreport・recommendedTopics・openedAt・versionを持つ。開封API、生成処理、排他制御、開封画面は未実装。',
    steps:[
      [0,'表面を見て「開く」','相手・アバター・共通タグは保存データを表示。開く操作が生成の発火点。','planned'],
      [1,'受取人・開催状態・開封状態を確認','他人のカードは404。開封済みなら保存報告を返して終了。','planned'],
      [2,'生成に使えるデータを読む','最新の公開話題と人格文書。相手の口調や非公開話題、会話ログは渡さない。人格の公開範囲は要検討。','planned'],
      [1,'受取人の接続設定で入力を作る','自分のNPCからの報告として構成。秘密を出さない指示、他人由来文章の指示に従わないガードを付ける。','planned'],
      [3,'報告全体を1回で生成','6〜10往復程度の対話とおすすめ話題2〜3個。NPC同士が実際に自律会話したログではない。','planned'],
      [2,'報告と開封日時をまとめて保存','report・recommendedTopics・openedAt。A向けとB向けで共有キャッシュしない。','planned'],
      [0,'報告を読み、現実の会話へ','待機中はカササギ演出。再閲覧は保存済み報告を表示し再生成しない。スマホ幅にも対応。','planned']
    ],
    apis:[['GET','/api/events/{id}/cards','planned','会場で一覧'],['GET','/api/cards','planned','自分宛て全カード'],['GET','/api/cards/{id}','planned','保存済み詳細'],['POST','/api/cards/{id}/open','planned','生成・保存、または既存結果']],
    data:'cardsが生成結果を永続保持。キーは受取人のもの。相手のキーは使わず、相手側の報告も勝手に生成しない。',
    failure:'生成失敗時は未開封として手動再試行。応答切断なら詳細GETで保存済みか確認する案。退出者の未開封カードは表示対象から除外し、生成済みカードは回収しない。',
    decisions:['@VersionはDB更新競合を検出するが、LLMの二重呼び出し自体は防げない。生成予約と再取得の設計が必要。','人格文書には秘密が混ざる可能性がある。現要件はプロンプトガードで防ぐが、公開用の人格要約を別にする変更案を検討する。','開封開始後に相手が退出/非公開化した場合、保存直前に再検証するかを決める。'],
    sources:['B:event/model/Card.java','F:idea.md','F:requirements.md','R:README.md']
  }
];

export const decisions = [
 ['最初に決める','二重実行と外部課金','会話送信・振り返り・カード開封の予約、再送時の取得、LLM成功/DB失敗を共通設計にする。','practice'],
 ['最初に決める','誕生の最後の操作','6往復の締め後に、振り返りボタンを押して完了する導線にするか。','birth'],
 ['最初に決める','プロフィールとMemoryの範囲','出来事要約の保持を要件へ追加するか。人格の公開用要約を別にするか。','home'],
 ['接続前に決める','今日の質問の消化','消化タイミング・日付境界・複数候補の扱いを確定する。','daily'],
 ['接続前に決める','イベントの境界','退出/再参加・参加失敗と再計算・終了後の初開封を決める。','events'],
 ['接続前に決める','報酬の選び方','固定実績報酬と、直近の練習や話題から選ぶ報酬の接続。','growth'],
 ['Should着手時','利用コスト','固定単価の概算から、実usageとモデル別単価へ移行する。','credentials']
];
