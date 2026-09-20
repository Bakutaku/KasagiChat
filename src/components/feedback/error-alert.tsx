import { LuCircleAlert } from "react-icons/lu";

/** 操作や読み込みの失敗を伝えるアラート。文言の組み立ては呼び出し側の責務。 */
export default function ErrorAlert({
  message,
  className = "",
}: {
  message: string;
  className?: string;
}) {
  return (
    <div className={`alert alert-error ${className}`} role="alert">
      <LuCircleAlert className="size-5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
