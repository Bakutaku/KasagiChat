"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  LuArchive,
  LuBookOpen,
  LuCircleAlert,
  LuClock3,
  LuHouse,
  LuImageOff,
  LuInfo,
  LuMap,
  LuMessageCircle,
  LuMove,
  LuRefreshCw,
  LuSparkles,
  LuTrophy,
} from "react-icons/lu";
import ErrorAlert from "@/components/feedback/error-alert";
import { NavigationHeader } from "@/components/layout/navigation-header";
import { ImmersiveMapShell } from "@/components/map";
import { getErrorMessage } from "@/lib/api/errors";
import { isAbortError } from "@/lib/api/client";
import { presetImagePath } from "@/features/npc/presets";
import { homeApi } from "./api";
import type {
  HomeItem,
  HomeItemKind,
  HomeResponse,
  HomeSlot,
  HomeSlotId,
} from "./types";
import styles from "./home-experience.module.css";

const DESKTOP_MEDIA_QUERY = "(min-width: 768px)";

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

const SLOT_POSITIONS: Record<HomeSlotId, { left: string; top: string }> = {
  BOOKSHELF_1: { left: "13%", top: "14%" },
  BOOKSHELF_2: { left: "28%", top: "14%" },
  BOOKSHELF_3: { left: "42%", top: "14%" },
  BOOKSHELF_4: { left: "58%", top: "14%" },
  BOOKSHELF_5: { left: "72%", top: "14%" },
  BOOKSHELF_6: { left: "87%", top: "14%" },
  DISPLAY_1: { left: "18%", top: "39%" },
  DISPLAY_2: { left: "36%", top: "31%" },
  DISPLAY_3: { left: "53%", top: "38%" },
  DISPLAY_4: { left: "75%", top: "30%" },
  DISPLAY_5: { left: "34%", top: "62%" },
  DISPLAY_6: { left: "68%", top: "61%" },
};

function subscribeToDesktop(change: () => void) {
  const media = window.matchMedia(DESKTOP_MEDIA_QUERY);
  media.addEventListener("change", change);
  return () => media.removeEventListener("change", change);
}

function getDesktopSnapshot() {
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

function getServerDesktopSnapshot() {
  return false;
}

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

function HomeItemArtwork({ item, compact = false }: { item: HomeItem; compact?: boolean }) {
  const [failed, setFailed] = useState(false);
  const hasImage = item.kind === "SOUVENIR" && item.imagePath && !failed;

  if (hasImage) {
    return (
      // APIが返す動的パスはビルド時に寸法・配信元を確定できないため、失敗状態を持つ通常画像で扱います。
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.imagePath ?? undefined}
        alt=""
        className={compact ? styles.compactArtwork : styles.artworkImage}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span
      className={`${compact ? styles.compactFallback : styles.artworkFallback} ${item.kind === "BOOK" ? styles.bookArtwork : ""}`}
      aria-hidden="true"
    >
      {item.kind === "BOOK" ? <LuBookOpen /> : <LuImageOff />}
    </span>
  );
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
            <span className="badge badge-ghost badge-sm">未接続</span>
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
              sizes="(min-width: 768px) 20vw, 0px"
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
            プリセット「{npc.presetId}」
            {appearanceCount > 0
              ? `に${appearanceCount}件の見た目設定を適用中です。`
              : "を使用しています。"}
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

function MapSlot({
  slot,
  item,
  selectedItem,
  saving,
  onSelectItem,
  onPlace,
}: {
  slot: HomeSlot;
  item: HomeItem | undefined;
  selectedItem: HomeItem | null;
  saving: boolean;
  onSelectItem: (topicId: number) => void;
  onPlace: (slotId: HomeSlotId) => void;
}) {
  const selected = item?.topicId === selectedItem?.topicId;
  const compatible = selectedItem?.kind === slot.acceptedKind;
  const canPlace = Boolean(selectedItem && compatible && !item);
  const position = SLOT_POSITIONS[slot.slotId];
  const style = {
    "--slot-left": position.left,
    "--slot-top": position.top,
  } as CSSProperties;

  if (item) {
    return (
      <button
        type="button"
        className={`${styles.slot} ${styles.occupiedSlot} ${selected ? styles.selectedSlot : ""}`}
        style={style}
        onClick={() => onSelectItem(item.topicId)}
        aria-pressed={selected}
        aria-label={`${slotLabel(slot.slotId)}の${item.displayName}を選択`}
        disabled={saving}
      >
        <HomeItemArtwork key={item.topicId} item={item} compact />
        <span className={styles.slotName}>{item.displayName}</span>
      </button>
    );
  }

  if (canPlace) {
    return (
      <button
        type="button"
        className={`${styles.slot} ${styles.availableSlot}`}
        style={style}
        onClick={() => onPlace(slot.slotId)}
        aria-label={`${slotLabel(slot.slotId)}に${selectedItem?.displayName}を配置`}
        disabled={saving}
      >
        <LuMove aria-hidden="true" />
        <span>{slotLabel(slot.slotId)}</span>
      </button>
    );
  }

  return (
    <div
      className={`${styles.slot} ${styles.emptySlot}`}
      style={style}
      aria-label={`${slotLabel(slot.slotId)}、空き`}
    >
      <span>{slot.acceptedKind === "BOOK" ? "本" : "飾"}</span>
    </div>
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
  saving,
  error,
  onStore,
}: {
  item: HomeItem | null;
  saving: boolean;
  error: string | null;
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
          <p className="mt-1 break-all font-mono text-[0.68rem] text-base-content/60">
            {item.sourceConversationId}
          </p>
          <p className="mt-1 text-base-content/60">
            会話詳細画面が未実装のため、移動リンクは表示していません。
          </p>
        </div>
      )}
      <p className="mt-3 text-xs leading-relaxed text-base-content/70">
        {item.slotId
          ? "強調された空き場所を選ぶと配置を変更できます。"
          : "部屋で強調された空き場所を選ぶと配置できます。"}
      </p>
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

function ActionPanel({
  selectedItem,
  storedCount,
  saving,
  mutationError,
  onStore,
}: {
  selectedItem: HomeItem | null;
  storedCount: number;
  saving: boolean;
  mutationError: string | null;
  onStore: () => void;
}) {
  return (
    <aside className={`${styles.panel} card border border-base-300 bg-base-100/95 shadow-lg`}>
      <div className="card-body gap-3 p-4">
        <PanelTitle icon={<LuSparkles />}>家でできること</PanelTitle>
        <SelectedItemPanel
          item={selectedItem}
          saving={saving}
          error={mutationError}
          onStore={onStore}
        />
        <UnavailableFeature
          icon={<LuMessageCircle />}
          title="今日のひとこと"
          description="開始・再開APIがこのチェックアウトにないため、現在は利用できません。"
        />
        <UnavailableFeature
          icon={<LuClock3 />}
          title="途中の会話"
          description="会話一覧APIが実装されたら、ここから再開できるようになります。"
        />
        <UnavailableFeature
          icon={<LuRefreshCw />}
          title="未振り返り"
          description="未振り返り一覧APIが未接続のため、完了件数は表示していません。"
        />
        <section className="rounded-box border border-base-300 bg-base-100 p-3">
          <div className="flex items-center gap-3">
            <LuArchive className="text-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold">未配置アイテム</h3>
                <span className="badge badge-primary badge-sm">{storedCount}点</span>
              </div>
              <p className="mt-1 text-xs text-base-content/65">
                中央下の一覧から選ぶと、置ける場所が強調されます。
              </p>
            </div>
          </div>
        </section>
        <UnavailableFeature
          icon={<LuTrophy />}
          title="成長記録"
          description="成長記録APIが未接続のため、現在は読み返せません。"
        />
        {saving ? (
          <button type="button" className="btn btn-primary mt-1 w-full" disabled>
            <span className="loading loading-spinner loading-xs" />
            保存中
          </button>
        ) : (
          <Link href="/map" className="btn btn-primary mt-1 w-full">
            <LuMap aria-hidden="true" />
            街へ出る
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
  const [home, setHome] = useState<HomeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState(0);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

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

  const selectedItem = useMemo(
    () =>
      home?.items.find((item) => item.topicId === selectedTopicId) ?? null,
    [home, selectedTopicId],
  );
  const itemBySlot = useMemo(
    () =>
      new Map(
        (home?.items ?? [])
          .filter((item): item is HomeItem & { slotId: HomeSlotId } => item.slotId !== null)
          .map((item) => [item.slotId, item]),
      ),
    [home],
  );

  function retryLoad() {
    setLoading(true);
    setLoadError(null);
    setMutationError(null);
    setRequestId((value) => value + 1);
  }

  function selectItem(topicId: number) {
    setSelectedTopicId(topicId);
    setMutationError(null);
  }

  async function placeItem(slotId: HomeSlotId) {
    if (!selectedItem || saving) return;
    setSaving(true);
    setMutationError(null);
    try {
      const updated = await homeApi.place(selectedItem.topicId, slotId);
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
      setSaving(false);
    }
  }

  async function storeItem() {
    if (!selectedItem || selectedItem.slotId === null || saving) return;
    setSaving(true);
    setMutationError(null);
    try {
      await homeApi.store(selectedItem.topicId);
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
      setSaving(false);
    }
  }

  return (
    <ImmersiveMapShell
      mapId="home-interior"
      interaction="fixed"
      characters={[]}
      canvasClassName={styles.homeCanvas}
      hudClassName={styles.homeHud}
      paused={saving}
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
          <section className={styles.mapOverlay} aria-label="家のアイテム配置">
            <div className={styles.mapHeading}>
              <span className="font-bold">{home.npc.name}の家</span>
              <span className="text-xs text-base-content/65">
                {selectedItem ? "強調された空き場所を選択" : "アイテムを選んで配置"}
              </span>
            </div>
            <div className={styles.slotLayer}>
              {home.slots.length === 0 && (
                <p className={styles.noSlots}>
                  現在利用できる配置場所がありません。
                </p>
              )}
              {home.slots.map((slot) => (
                <MapSlot
                  key={slot.slotId}
                  slot={slot}
                  item={itemBySlot.get(slot.slotId)}
                  selectedItem={selectedItem}
                  saving={saving}
                  onSelectItem={selectItem}
                  onPlace={placeItem}
                />
              ))}
            </div>
            <Inventory
              items={home.items}
              selectedItem={selectedItem}
              saving={saving}
              onSelect={selectItem}
            />
            {saving && (
              <div className={styles.savingOverlay} role="status">
                <span className="loading loading-spinner loading-sm" />
                配置を保存しています
              </div>
            )}
          </section>
          <ActionPanel
            selectedItem={selectedItem}
            storedCount={home.items.filter((item) => item.slotId === null).length}
            saving={saving}
            mutationError={mutationError}
            onStore={storeItem}
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
  );
}

function MobileFallback() {
  return (
    <div className="min-h-dvh bg-base-200">
      <NavigationHeader />
      <main className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-lg items-center p-6">
        <section className="card w-full border border-base-300 bg-base-100 shadow-xl">
          <div className="card-body items-center text-center">
            <LuHouse className="text-primary" size={42} aria-hidden="true" />
            <h1 className="card-title">家はPCでお楽しみください</h1>
            <p className="text-sm leading-relaxed text-base-content/70">
              家のマップとアイテム配置は、幅768px以上のPCブラウザに対応しています。
            </p>
            <div className="card-actions mt-2">
              <Link href="/" className="btn btn-outline btn-sm">
                トップへ戻る
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export function HomeExperience() {
  const desktop = useSyncExternalStore(
    subscribeToDesktop,
    getDesktopSnapshot,
    getServerDesktopSnapshot,
  );

  return desktop ? <HomeDashboard /> : <MobileFallback />;
}
