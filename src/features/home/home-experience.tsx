"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  LuArchive,
  LuCircleAlert,
  LuHouse,
  LuImageOff,
  LuInfo,
  LuMap,
  LuMail,
  LuMessageCircle,
  LuPencil,
  LuCheck,
  LuRefreshCw,
  LuSparkles,
  LuTrophy,
} from "react-icons/lu";
import ErrorAlert from "@/components/feedback/error-alert";
import { ImmersiveMapShell } from "@/components/map";
import { getErrorMessage } from "@/lib/api/errors";
import { isAbortError } from "@/lib/api/client";
import { conversationApi } from "@/features/conversation/api";
import ConversationSession from "@/features/conversation/conversation-session";
import { conversationLabel } from "@/features/conversation/scene";
import type {
  ConversationScene,
  ConversationSummary,
} from "@/features/conversation/types";
import { presetImagePath } from "@/features/npc/presets";
import { homeApi } from "./api";
import type {
  HomeItem,
  HomeItemKind,
  HomeResponse,
  HomeSlot,
  HomeSlotId,
} from "./types";
import { HomeItemArtwork } from "./home-item-artwork";
import { availableHomeSlots, homeAnchorId, homeMapObjects } from "./home-map-adapter";
import ProfileNotebook from "./profile-notebook";
import styles from "./home-experience.module.css";

const HOME_ERROR_MESSAGES = {
  HOME_SLOT_OCCUPIED:
    "その場所には別のアイテムがあります。空いている場所を選んでください。",
  INVALID_HOME_SLOT: "その配置場所は現在利用できません。",
  HOME_SLOT_INCOMPATIBLE:
    "このアイテムはその場所に置けません。強調された場所を選んでください。",
  HOME_ITEM_NOT_FOUND:
    "アイテムが見つかりませんでした。家の情報を読み直してください。",
  NPC_NOT_FOUND:
    "分身が見つかりませんでした。誕生オンボーディングを確認してください。",
  VALIDATION_FAILED: "配置内容を確認して、もう一度お試しください。",
  INVALID_REQUEST_BODY: "配置内容を確認して、もう一度お試しください。",
} as const;


function slotLabel(slotId: HomeSlotId) {
  const number = slotId.split("_")[1];
  return slotId.startsWith("DISPLAY") ? `飾り棚 ${number}` : `本棚 ${number}`;
}

function kindLabel(kind: HomeItemKind) {
  return kind === "BOOK" ? "本" : "思い出の品";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "取得日不明";
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" }).format(
    date,
  );
}

function loadErrorMessage(error: unknown) {
  return getErrorMessage(error, {
    codes: HOME_ERROR_MESSAGES,
    fallback: "家の情報を読み込めませんでした。もう一度お試しください。",
  });
}

function placementErrorMessage(error: unknown) {
  return getErrorMessage(error, {
    codes: HOME_ERROR_MESSAGES,
    fallback: "配置を保存できませんでした。もう一度お試しください。",
  });
}

function PanelTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-primary" aria-hidden="true">
        {icon}
      </span>
      <h2 className="font-bold">{children}</h2>
    </div>
  );
}

function UnavailableFeature({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <section className="rounded-box border border-base-300 bg-base-200/55 p-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-base-content/55" aria-hidden="true">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold">{title}</h3>
            <span className="badge badge-ghost badge-sm">準備中</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-base-content/65">
            {description}
          </p>
        </div>
      </div>
    </section>
  );
}

function NpcPanel({ home }: { home: HomeResponse }) {
  const [portraitFailed, setPortraitFailed] = useState(false);
  const { npc } = home;
  const nextLevel = npc.nextLevel;
  const progress = nextLevel
    ? Math.max(
        0,
        Math.min(100, (npc.exp / Math.max(nextLevel.requiredTotalExp, 1)) * 100),
      )
    : 100;
  const appearanceCount = npc.appearance
    ? Object.keys(npc.appearance).length
    : 0;

  return (
    <aside className={`${styles.panel} card border border-base-300 bg-base-100/95 shadow-lg`}>
      <div className="card-body gap-4 p-4">
        <PanelTitle icon={<LuHouse />}>わたしの分身</PanelTitle>
        <div className={styles.portraitFrame}>
          {portraitFailed ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-base-content/60">
              <LuImageOff size={32} aria-hidden="true" />
              <span className="text-xs">画像を表示できません</span>
            </div>
          ) : (
            <Image
              src={presetImagePath(npc.presetId)}
              alt={`${npc.name}の姿`}
              fill
              sizes="(min-width: 1100px) 20vw, (min-width: 768px) 0px, 144px"
              className={styles.portrait}
              onError={() => setPortraitFailed(true)}
              priority
            />
          )}
        </div>
        <div>
          <p className="truncate text-xl font-bold" title={npc.name}>
            {npc.name}
          </p>
          <p className="text-sm text-base-content/65">分身 Lv.{npc.level}</p>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold">EXP {npc.exp.toLocaleString("ja-JP")}</span>
            {nextLevel ? (
              <span>Lv.{nextLevel.level}まで あと{nextLevel.remainingExp.toLocaleString("ja-JP")}</span>
            ) : (
              <span>次のレベル情報はありません</span>
            )}
          </div>
          <progress
            className="progress progress-primary w-full"
            value={progress}
            max="100"
            aria-label={
              nextLevel
                ? `レベル${nextLevel.level}までの進捗 ${Math.round(progress)}パーセント`
                : "次のレベル情報はありません"
            }
          />
        </div>
        <div className="rounded-box bg-base-200/70 p-3 text-xs leading-relaxed">
          <p className="font-semibold">いまの見た目</p>
          <p className="mt-1 text-base-content/65">
            {appearanceCount > 0
              ? "選んだ服やアクセサリーで過ごしています。"
              : "お気に入りの姿で過ごしています。"}
          </p>
        </div>
        <div className="mt-auto border-t border-base-300 pt-3 text-xs text-base-content/65">
          <p>服・アクセサリー {home.unlockedItems.length}点 解禁済み</p>
          <p className="mt-1">着せ替え操作はこの画面ではまだ利用できません。</p>
        </div>
      </div>
    </aside>
  );
}

function Inventory({
  items,
  selectedItem,
  saving,
  onSelect,
}: {
  items: HomeItem[];
  selectedItem: HomeItem | null;
  saving: boolean;
  onSelect: (topicId: number) => void;
}) {
  const storedItems = items.filter((item) => item.slotId === null);
  return (
    <section className={styles.inventory} aria-labelledby="home-inventory-title">
      <div className="flex items-center justify-between gap-2">
        <h2 id="home-inventory-title" className="flex items-center gap-2 text-sm font-bold">
          <LuArchive aria-hidden="true" />
          未配置アイテム
        </h2>
        <span className="badge badge-neutral badge-sm">{storedItems.length}点</span>
      </div>
      {storedItems.length === 0 ? (
        <p className="mt-3 text-sm text-base-content/65">
          {items.length === 0
            ? "まだ思い出の品や本を獲得していません。"
            : "すべてのアイテムを部屋に配置しています。"}
        </p>
      ) : (
        <div className={styles.inventoryList}>
          {storedItems.map((item) => {
            const selected = selectedItem?.topicId === item.topicId;
            return (
              <button
                key={item.topicId}
                type="button"
                className={`${styles.inventoryItem} ${selected ? styles.selectedInventoryItem : ""}`}
                onClick={() => onSelect(item.topicId)}
                aria-pressed={selected}
                disabled={saving}
              >
                <HomeItemArtwork item={item} compact />
                <span className="min-w-0 text-left">
                  <span className="block truncate text-xs font-bold">{item.displayName}</span>
                  <span className="block text-[0.65rem] text-base-content/60">{kindLabel(item.kind)}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SelectedItemPanel({
  item,
  availableSlots,
  saving,
  error,
  onPlace,
  onStore,
}: {
  item: HomeItem | null;
  availableSlots: HomeSlot[];
  saving: boolean;
  error: string | null;
  onPlace: (slotId: HomeSlotId) => void;
  onStore: () => void;
}) {
  if (!item) {
    return (
      <section className="rounded-box border border-dashed border-base-300 p-4 text-sm text-base-content/65">
        <LuInfo className="mb-2 text-primary" size={20} aria-hidden="true" />
        部屋または未配置一覧のアイテムを選ぶと、詳細と配置操作を表示します。
      </section>
    );
  }

  return (
    <section className="rounded-box border border-primary/30 bg-primary/5 p-4" aria-labelledby="selected-item-title">
      <div className={styles.detailArtwork}>
        <HomeItemArtwork key={item.topicId} item={item} />
      </div>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 id="selected-item-title" className="break-words font-bold">{item.displayName}</h2>
          {item.topicName !== item.displayName && (
            <p className="mt-0.5 break-words text-xs text-base-content/60">話題: {item.topicName}</p>
          )}
        </div>
        <span className={`badge badge-sm ${item.publicTopic ? "badge-success" : "badge-ghost"}`}>
          {item.publicTopic ? "公開" : "非公開"}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-xs">
        <dt className="text-base-content/55">種類</dt>
        <dd>{kindLabel(item.kind)}</dd>
        <dt className="text-base-content/55">取得日</dt>
        <dd>{formatDate(item.acquiredAt)}</dd>
        <dt className="text-base-content/55">カテゴリ</dt>
        <dd>{item.category?.name ?? "なし"}</dd>
        <dt className="text-base-content/55">配置</dt>
        <dd>{item.slotId ? slotLabel(item.slotId) : "収納中"}</dd>
      </dl>
      {item.sourceConversationId && (
        <div className="mt-3 rounded-box bg-base-100/75 p-3 text-xs">
          <p className="font-semibold">関連する会話</p>
          <p className="mt-1 text-base-content/60">
            この品につながる会話があります。会話の読み返しは準備中です。
          </p>
        </div>
      )}
      <p className="mt-3 text-xs leading-relaxed text-base-content/70">
        {item.slotId
          ? "強調された空き場所を選ぶと配置を変更できます。"
          : "部屋で強調された空き場所を選ぶと配置できます。"}
      </p>
      <div className={styles.mobileSlotPicker}>
        <p className="text-xs font-semibold">空いている配置場所</p>
        {availableSlots.length > 0 ? (
          <div className={styles.mobileSlotList}>
            {availableSlots.map((slot) => (
              <button
                key={slot.slotId}
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => onPlace(slot.slotId)}
                disabled={saving}
              >
                {slotLabel(slot.slotId)}に配置
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-base-content/65">この種類の空き場所はありません。</p>
        )}
      </div>
      {item.slotId && (
        <button
          type="button"
          className="btn btn-outline btn-sm mt-3 w-full"
          onClick={onStore}
          disabled={saving}
        >
          {saving ? <span className="loading loading-spinner loading-xs" /> : <LuArchive aria-hidden="true" />}
          収納へ戻す
        </button>
      )}
      {error && <ErrorAlert message={error} className="mt-3 text-xs" />}
    </section>
  );
}

/** 今日のひとこと。質問が用意できていないときは操作させない。 */
function DailyQuestionCard({
  question,
  disabled,
  onStart,
}: {
  question: string | null;
  disabled: boolean;
  onStart: () => void;
}) {
  return (
    <section className="rounded-box border border-primary/25 bg-primary/5 p-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-primary" aria-hidden="true">
          <LuMessageCircle />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold">今日のひとこと</h3>
          {question ? (
            <>
              <p className="mt-1 text-xs leading-relaxed text-base-content/75">
                「{question}」
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm mt-3 w-full"
                onClick={onStart}
                disabled={disabled}
              >
                話す
              </button>
            </>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-base-content/65">
              今日の質問はまだありません。会話を振り返ると、次に聞きたいことが届きます。
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * 未振り返りの会話一覧。
 *
 * 進行中と終了済みは同じ一覧に出す。サーバーは種別とシーンで会話を再開するため、
 * どちらも「続きから開く」という同じ操作になる。
 */
function UnreviewedCard({
  conversations,
  disabled,
  onResume,
}: {
  conversations: ConversationSummary[];
  disabled: boolean;
  onResume: (conversation: ConversationSummary) => void;
}) {
  return (
    <section className="rounded-box border border-base-300 bg-base-200/55 p-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-base-content/55" aria-hidden="true">
          <LuRefreshCw />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold">途中の会話・未振り返り</h3>
            <span className="badge badge-ghost badge-sm">
              {conversations.length}件
            </span>
          </div>
          {conversations.length === 0 ? (
            <p className="mt-1 text-xs leading-relaxed text-base-content/65">
              振り返り待ちの会話はありません。
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {conversations.map((conversation) => (
                <li key={conversation.id}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm w-full justify-between"
                    onClick={() => onResume(conversation)}
                    disabled={disabled || conversation.type === "BIRTH"}
                  >
                    <span className="truncate">
                      {conversationLabel(conversation.type, conversation.scene)}
                    </span>
                    <span className="text-[0.65rem] opacity-70">
                      {conversation.turn}往復 / {formatDate(conversation.startedAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function ActionPanel({
  editing, items, selectedItem, availableSlots, saving, mutationError, onSelect, onPlace, onStore, selectionRef,
  dailyQuestion, unreviewed, onStartDaily, onResume, onItemsChange,
}: {
  editing: boolean;
  items: HomeItem[];
  selectedItem: HomeItem | null;
  availableSlots: HomeSlot[];
  saving: boolean;
  mutationError: string | null;
  onSelect: (topicId: number) => void;
  onPlace: (slotId: HomeSlotId) => void;
  onStore: () => void;
  selectionRef: RefObject<HTMLDivElement | null>;
  dailyQuestion: string | null;
  unreviewed: ConversationSummary[];
  onStartDaily: () => void;
  onResume: (conversation: ConversationSummary) => void;
  onItemsChange: (updater: (items: HomeItem[]) => HomeItem[]) => void;
}) {
  return (
    <aside className={`${styles.panel} card border border-base-300 bg-base-100/95 shadow-lg`}>
      <div className="card-body gap-3 p-4">
        <PanelTitle icon={editing ? <LuPencil /> : <LuSparkles />}>{editing ? "部屋を編集" : "家でできること"}</PanelTitle>
        {editing ? (
          <div id="home-editor" className="space-y-4">
            <p className="text-xs text-base-content/65">アイテムを選び、部屋の＋を押して配置します。変更はその都度保存されます。</p>
            <Inventory items={items} selectedItem={selectedItem} saving={saving} onSelect={onSelect} />
            <div ref={selectionRef} tabIndex={-1} aria-label="選択中のアイテム" className={styles.selectionPanel}>
              <SelectedItemPanel item={selectedItem} availableSlots={availableSlots} saving={saving} error={mutationError} onPlace={onPlace} onStore={onStore} />
            </div>
          </div>
        ) : (
          <>
            <ProfileNotebook items={items} onItemsChange={onItemsChange} />
            <DailyQuestionCard
              question={dailyQuestion}
              disabled={saving}
              onStart={onStartDaily}
            />
            <UnreviewedCard
              conversations={unreviewed}
              disabled={saving}
              onResume={onResume}
            />
            <Link
              href="/cards"
              className="flex items-start gap-3 rounded-box border border-base-300 bg-base-200/55 p-3 hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <LuMail className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-sm font-bold">出会いカードを見る</span>
                <span className="mt-1 block text-xs leading-relaxed text-base-content/65">
                  イベントで届いたカードをいつでも確認できます。
                </span>
              </span>
            </Link>
            <UnavailableFeature icon={<LuTrophy />} title="成長記録" description="分身の成長を読み返す機能は準備中です。" />
          </>
        )}
        {saving ? (
          <button type="button" className="btn btn-primary mt-auto w-full" disabled>保存中</button>
        ) : (
          <Link href="/map" className="btn btn-primary mt-auto w-full">
            <LuMap aria-hidden="true" />街へ出る
          </Link>
        )}
      </div>
    </aside>
  );
}

function LoadingPanel({ title }: { title: string }) {
  return (
    <section className={`${styles.panel} card border border-base-300 bg-base-100/95 shadow-lg`} aria-label={`${title}を読み込み中`}>
      <div className="card-body p-4">
        <div className="skeleton h-6 w-32" />
        <div className="skeleton mt-3 h-48 w-full" />
        <div className="skeleton mt-3 h-4 w-4/5" />
        <div className="skeleton h-4 w-2/3" />
      </div>
    </section>
  );
}

function HomeDashboard() {
  const [editing, setEditing] = useState(false);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const selectionRef = useRef<HTMLDivElement>(null);
  const mutationInFlight = useRef(false);
  const [notice, setNotice] = useState("");
  const [home, setHome] = useState<HomeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState(0);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [dailyQuestion, setDailyQuestion] = useState<string | null>(null);
  const [unreviewed, setUnreviewed] = useState<ConversationSummary[]>([]);
  const [session, setSession] = useState<{
    type: "PRACTICE" | "DAILY";
    scene: ConversationScene;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    homeApi.get(controller.signal).then(
      (response) => {
        if (controller.signal.aborted) return;
        setHome(response);
        setLoadError(null);
        setLoading(false);
      },
      (error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return;
        setHome(null);
        setLoadError(loadErrorMessage(error));
        setLoading(false);
      },
    );
    return () => controller.abort();
  }, [requestId]);

  // 今日のひとことと未振り返り一覧は家の表示を止めるほどではないため、
  // 失敗しても空のまま描く(カードが「ありません」表示になる)。
  useEffect(() => {
    const controller = new AbortController();
    conversationApi
      .dailyQuestion(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setDailyQuestion(value?.question ?? null);
      })
      .catch(() => undefined);
    conversationApi
      .listUnreviewed(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setUnreviewed(value);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [requestId]);

  const selectedItem = useMemo(
    () =>
      home?.items.find((item) => item.topicId === selectedTopicId) ?? null,
    [home, selectedTopicId],
  );
  const objects = useMemo(() => homeMapObjects(home?.items ?? []), [home]);
  const availableSlots = availableHomeSlots(home?.slots ?? [], home?.items ?? [], selectedItem);

  function finishEditing() {
    if (mutationInFlight.current) return;
    setEditing(false);
    setSelectedTopicId(null);
    setMutationError(null);
    setNotice("");
    editButtonRef.current?.focus();
  }

  function retryLoad() {
    setLoading(true);
    setLoadError(null);
    setMutationError(null);
    setRequestId((value) => value + 1);
  }

  function closeSession() {
    setSession(null);
    // 振り返りでEXP・思い出の品・次の質問が変わるため、家ごと読み直す。
    setRequestId((value) => value + 1);
  }

  function resumeConversation(conversation: ConversationSummary) {
    // BIRTHはオンボーディング専用の画面を持つため、ここからは開かない。
    if (conversation.type === "BIRTH") {
      return;
    }
    setSession({ type: conversation.type, scene: conversation.scene });
  }

  function selectItem(topicId: number) {
    if (!editing || mutationInFlight.current) return;
    setSelectedTopicId(topicId);
    setMutationError(null);
  }

  async function placeItem(slotId: HomeSlotId) {
    if (!editing || !selectedItem || mutationInFlight.current || !availableSlots.some((slot) => slot.slotId === slotId)) return;
    mutationInFlight.current = true;
    setSaving(true);
    setMutationError(null);
    try {
      const updated = await homeApi.place(selectedItem.topicId, slotId);
      setNotice(`${updated.displayName}を${slotLabel(slotId)}に配置しました。`);
      setHome((current) =>
        current
          ? {
              ...current,
              items: current.items.map((item) =>
                item.topicId === updated.topicId ? updated : item,
              ),
            }
          : current,
      );
    } catch (error) {
      setMutationError(placementErrorMessage(error));
    } finally {
      mutationInFlight.current = false;
      setSaving(false);
      selectionRef.current?.focus();
    }
  }

  function updateItems(updater: (items: HomeItem[]) => HomeItem[]) {
    setHome((current) =>
      current ? { ...current, items: updater(current.items) } : current,
    );
  }

  async function storeItem() {
    if (!editing || !selectedItem || selectedItem.slotId === null || mutationInFlight.current) return;
    mutationInFlight.current = true;
    setSaving(true);
    setMutationError(null);
    try {
      await homeApi.store(selectedItem.topicId);
      setNotice(`${selectedItem.displayName}を収納しました。`);
      setHome((current) =>
        current
          ? {
              ...current,
              items: current.items.map((item) =>
                item.topicId === selectedItem.topicId
                  ? { ...item, slotId: null }
                  : item,
              ),
            }
          : current,
      );
    } catch (error) {
      setMutationError(placementErrorMessage(error));
    } finally {
      mutationInFlight.current = false;
      setSaving(false);
      selectionRef.current?.focus();
    }
  }

  return (
    <>
    <ImmersiveMapShell
      mapId="home-interior"
      interaction="fixed"
      shellClassName={styles.homeShell}
      objects={objects}
      objectEditing={editing && home ? {
        anchorIds: home.slots.map((slot) => homeAnchorId(slot.slotId)),
        selectedId: selectedTopicId === null ? null : String(selectedTopicId),
        availableAnchorIds: availableSlots.map((slot) => homeAnchorId(slot.slotId)),
        disabled: saving,
        onSelectObject: (id) => selectItem(Number(id)),
        onSelectAnchor: (id) => {
          const slot = availableSlots.find((slot) => homeAnchorId(slot.slotId) === id);
          if (slot) void placeItem(slot.slotId);
        },
      } : undefined}
      canvasClassName={styles.homeCanvas}
      hudClassName={styles.homeHud}
      paused={saving || session !== null}
    >
      {loading ? (
        <>
          <LoadingPanel title="分身情報" />
          <section className={styles.mapOverlay}>
            <div className="skeleton h-full w-full opacity-25" />
          </section>
          <LoadingPanel title="家の操作" />
        </>
      ) : home ? (
        <>
          <NpcPanel key={home.npc.presetId} home={home} />
          <section className={styles.mapOverlay} aria-label="家の部屋">
            <div className={styles.mapHeading}>
              <span className="font-bold">{home.npc.name}の家</span>
              <button
                ref={editButtonRef}
                type="button"
                className="btn btn-primary btn-sm"
                aria-expanded={editing}
                aria-controls={editing ? "home-editor" : undefined}
                disabled={saving}
                onClick={() => editing ? finishEditing() : setEditing(true)}
              >
                {editing ? <LuCheck aria-hidden="true" /> : <LuPencil aria-hidden="true" />}
                {editing ? "完了" : "編集"}
              </button>
            </div>
            {editing && home.slots.length === 0 && <p className={styles.noSlots}>現在利用できる配置場所がありません。</p>}
            {editing && selectedItem && availableSlots.length === 0 && <p className={styles.mapHint}>この種類の空き場所はありません。配置済みの品を収納すると空けられます。</p>}
            <p className="sr-only" role="status">{notice}</p>
            {!editing && <ul className="sr-only" aria-label="部屋に配置したアイテム">{home.items.filter((item) => item.slotId).map((item) => <li key={item.topicId}>{item.displayName}</li>)}</ul>}
            {saving && (
              <div className={styles.savingOverlay} role="status">
                <span className="loading loading-spinner loading-sm" />配置を保存しています
              </div>
            )}
          </section>
          <ActionPanel
            selectedItem={selectedItem}
            availableSlots={availableSlots}
            editing={editing}
            items={home.items}
            onSelect={selectItem}
            onPlace={(slotId) => void placeItem(slotId)}
            selectionRef={selectionRef}
            saving={saving}
            mutationError={mutationError}
            onStore={storeItem}
            dailyQuestion={dailyQuestion}
            unreviewed={unreviewed}
            onStartDaily={() => setSession({ type: "DAILY", scene: null })}
            onResume={resumeConversation}
            onItemsChange={updateItems}
          />
        </>
      ) : (
        <>
          <section className={`${styles.panel} card border border-base-300 bg-base-100/95 shadow-lg`}>
            <div className="card-body p-4">
              <PanelTitle icon={<LuCircleAlert />}>分身情報</PanelTitle>
              <p className="text-sm text-base-content/65">家の情報を取得できませんでした。</p>
            </div>
          </section>
          <section className={`${styles.mapOverlay} flex items-center justify-center p-6`}>
            <div className="max-w-md rounded-box bg-base-100/95 p-5 shadow-xl">
              <ErrorAlert message={loadError ?? "家の情報を読み込めませんでした。"} />
              <button type="button" className="btn btn-primary btn-sm mt-4 w-full" onClick={retryLoad}>
                <LuRefreshCw aria-hidden="true" />
                再読み込み
              </button>
            </div>
          </section>
          <aside className={`${styles.panel} card border border-base-300 bg-base-100/95 shadow-lg`}>
            <div className="card-body gap-3 p-4">
              <PanelTitle icon={<LuSparkles />}>家でできること</PanelTitle>
              <p className="text-sm text-base-content/65">アイテム操作は再読み込み後に利用できます。</p>
              <Link href="/map" className="btn btn-primary mt-auto w-full">
                <LuMap aria-hidden="true" />
                街へ出る
              </Link>
            </div>
          </aside>
        </>
      )}
    </ImmersiveMapShell>

    {session && home && (
      <ConversationSession
        type={session.type}
        scene={session.scene}
        npc={{ name: home.npc.name, presetId: home.npc.presetId }}
        presentation="modal"
        onClose={closeSession}
      />
    )}
    </>
  );
}

export function HomeExperience() {
  return <HomeDashboard />;
}
