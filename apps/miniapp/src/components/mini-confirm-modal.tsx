import { Text, View } from "@tarojs/components";

import "./mini-confirm-modal.scss";

export type MiniConfirmTone = "danger" | "primary";

type MiniConfirmModalProps = {
  cancelText: string;
  confirmText: string;
  content: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  tone?: MiniConfirmTone;
  visible: boolean;
};

export function MiniConfirmModal({
  cancelText,
  confirmText,
  content,
  onCancel,
  onConfirm,
  title,
  tone = "primary",
  visible,
}: MiniConfirmModalProps) {
  if (!visible) {
    return null;
  }

  return (
    <View className="mini-confirm">
      <View className="mini-confirm__card">
        <View className="mini-confirm__body">
          <Text className="mini-confirm__title">{title}</Text>
          <Text className="mini-confirm__content">{content}</Text>
        </View>
        <View className="mini-confirm__actions">
          <Text className="mini-confirm__button" onClick={onCancel}>
            {cancelText}
          </Text>
          <Text
            className={[
              "mini-confirm__button",
              "mini-confirm__button--confirm",
              tone === "danger" ? "mini-confirm__button--danger" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={onConfirm}
          >
            {confirmText}
          </Text>
        </View>
      </View>
    </View>
  );
}
