"use client";

import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { Extension, type Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Italic,
  List,
  ListOrdered,
  Minus,
  Palette,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { AdminSelect } from "./admin-select";

type AdminRichTextEditorProps = {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) =>
              attributes.fontSize
                ? { style: `font-size: ${attributes.fontSize}` }
                : {},
          },
        },
      },
    ];
  },
});

const FONT_SIZE_OPTIONS = [
  { label: "小号 14px", value: "14px" },
  { label: "正文 16px", value: "16px" },
  { label: "中号 18px", value: "18px" },
  { label: "大号 20px", value: "20px" },
  { label: "标题 24px", value: "24px" },
];

const FONT_FAMILY_OPTIONS = [
  { label: "系统默认", value: "" },
  { label: "苹方 / 微软雅黑", value: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif" },
  { label: "宋体", value: "SimSun, serif" },
  { label: "黑体", value: "SimHei, sans-serif" },
];

const COLOR_OPTIONS = [
  { label: "墨绿", value: "#102017" },
  { label: "正文灰绿", value: "#405248" },
  { label: "品牌绿", value: "#1f8f4f" },
  { label: "提示橙", value: "#b46b16" },
  { label: "风险红", value: "#c83232" },
];

function ToolbarButton({
  active,
  children,
  disabled,
  onClick,
  title,
}: {
  active?: boolean;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      className={[
        "inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-lg border px-2 text-xs font-semibold transition",
        active
          ? "border-[#1f8f4f] bg-[#eaf7ee] text-[#1f8f4f]"
          : "border-[#dbe6dc] bg-white text-[#405248] hover:border-[#9fc8ab] hover:bg-[#f8fbf7]",
        disabled ? "cursor-not-allowed opacity-50" : "",
      ].join(" ")}
      disabled={disabled}
      onClick={onClick}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}

function setTextStyle(editor: Editor | null, attrs: Record<string, string | null>) {
  if (!editor) {
    return;
  }
  editor.chain().focus().setMark("textStyle", attrs).run();
}

export function AdminRichTextEditor({
  label,
  onChange,
  placeholder = "请输入协议正文，可设置标题、字号、颜色、列表和对齐方式。",
  value,
}: AdminRichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "min-h-64 px-4 py-3 text-sm leading-7 text-[#102017] outline-none [&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-[#b8d8bf] [&_blockquote]:bg-[#f8fbf7] [&_blockquote]:px-3 [&_blockquote]:py-1 [&_h2]:mb-3 [&_h2]:mt-2 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-bold [&_h4]:mb-2 [&_h4]:mt-3 [&_h4]:text-base [&_h4]:font-bold [&_hr]:my-4 [&_hr]:border-[#dbe6dc] [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:my-2 [&_ul]:ml-5 [&_ul]:list-disc dark:text-[#e8f3ea]",
        "data-placeholder": placeholder,
      },
    },
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3, 4],
        },
      }),
      TextStyle,
      FontSize,
      FontFamily,
      Color,
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    onUpdate: ({ editor: nextEditor }) => {
      onChange(nextEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor || editor.getHTML() === value) {
      return;
    }
    editor.commands.setContent(value || "", { emitUpdate: false });
  }, [editor, value]);

  const disabled = !editor;

  return (
    <div className="flex flex-col gap-2 text-sm font-medium lg:col-span-2">
      {label}
      <div className="overflow-hidden rounded-xl border border-[#dbe6dc] bg-white transition focus-within:border-[#1f8f4f] dark:border-[#244b34] dark:bg-[#06180d]">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#dbe6dc] bg-[#f8fbf7] p-2 dark:border-[#244b34] dark:bg-[#092012]">
          <ToolbarButton
            active={editor?.isActive("paragraph")}
            disabled={disabled}
            onClick={() => editor?.chain().focus().setParagraph().run()}
            title="正文"
          >
            正文
          </ToolbarButton>
          <ToolbarButton
            active={editor?.isActive("heading", { level: 2 })}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            title="一级标题"
          >
            H2
          </ToolbarButton>
          <ToolbarButton
            active={editor?.isActive("heading", { level: 3 })}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
            title="二级标题"
          >
            H3
          </ToolbarButton>
          <ToolbarButton
            active={editor?.isActive("heading", { level: 4 })}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 4 }).run()}
            title="三级标题"
          >
            H4
          </ToolbarButton>
          <ToolbarButton
            active={editor?.isActive("bold")}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            title="加粗"
          >
            <Bold size={15} />
          </ToolbarButton>
          <ToolbarButton
            active={editor?.isActive("italic")}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            title="斜体"
          >
            <Italic size={15} />
          </ToolbarButton>
          <ToolbarButton
            active={editor?.isActive("underline")}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            title="下划线"
          >
            <UnderlineIcon size={15} />
          </ToolbarButton>
          <ToolbarButton
            active={editor?.isActive("strike")}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            title="删除线"
          >
            <Strikethrough size={15} />
          </ToolbarButton>
          <ToolbarButton
            active={editor?.isActive("bulletList")}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            title="无序列表"
          >
            <List size={15} />
          </ToolbarButton>
          <ToolbarButton
            active={editor?.isActive("orderedList")}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            title="有序列表"
          >
            <ListOrdered size={15} />
          </ToolbarButton>
          <ToolbarButton
            active={editor?.isActive("blockquote")}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            title="引用"
          >
            <Quote size={15} />
          </ToolbarButton>
          <ToolbarButton
            disabled={disabled}
            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
            title="分割线"
          >
            <Minus size={15} />
          </ToolbarButton>
          <ToolbarButton
            active={editor?.isActive({ textAlign: "left" })}
            disabled={disabled}
            onClick={() => editor?.chain().focus().setTextAlign("left").run()}
            title="左对齐"
          >
            <AlignLeft size={15} />
          </ToolbarButton>
          <ToolbarButton
            active={editor?.isActive({ textAlign: "center" })}
            disabled={disabled}
            onClick={() => editor?.chain().focus().setTextAlign("center").run()}
            title="居中"
          >
            <AlignCenter size={15} />
          </ToolbarButton>
          <ToolbarButton
            active={editor?.isActive({ textAlign: "right" })}
            disabled={disabled}
            onClick={() => editor?.chain().focus().setTextAlign("right").run()}
            title="右对齐"
          >
            <AlignRight size={15} />
          </ToolbarButton>
          <div className="w-32">
            <AdminSelect
              disabled={disabled}
              onChange={(fontSize) => setTextStyle(editor, { fontSize })}
              options={FONT_SIZE_OPTIONS}
              placeholder="字号"
              triggerClassName="!h-9 !min-h-9 w-full border-[#dbe6dc] bg-white text-xs"
              value=""
            />
          </div>
          <div className="w-40">
            <AdminSelect
              disabled={disabled}
              onChange={(fontFamily) => {
                if (!fontFamily) {
                  editor?.chain().focus().unsetFontFamily().run();
                  return;
                }
                editor?.chain().focus().setFontFamily(fontFamily).run();
              }}
              options={FONT_FAMILY_OPTIONS}
              placeholder="字体"
              triggerClassName="!h-9 !min-h-9 w-full border-[#dbe6dc] bg-white text-xs"
              value=""
            />
          </div>
          <div className="w-32">
            <AdminSelect
              disabled={disabled}
              onChange={(color) => editor?.chain().focus().setColor(color).run()}
              options={COLOR_OPTIONS}
              placeholder="颜色"
              triggerClassName="!h-9 !min-h-9 w-full border-[#dbe6dc] bg-white text-xs"
              value=""
            />
          </div>
          <ToolbarButton
            disabled={disabled}
            onClick={() =>
              editor?.chain().focus().unsetAllMarks().clearNodes().run()
            }
            title="清除格式"
          >
            <Eraser size={15} />
          </ToolbarButton>
          <ToolbarButton
            disabled={disabled || !editor?.can().undo()}
            onClick={() => editor?.chain().focus().undo().run()}
            title="撤销"
          >
            <Undo2 size={15} />
          </ToolbarButton>
          <ToolbarButton
            disabled={disabled || !editor?.can().redo()}
            onClick={() => editor?.chain().focus().redo().run()}
            title="重做"
          >
            <Redo2 size={15} />
          </ToolbarButton>
          <Palette className="text-[#6c7a71]" size={15} />
        </div>
        <EditorContent editor={editor} />
      </div>
      <span className="text-xs font-normal leading-5 text-[#66756d]">
        保存后小程序会在内置协议页展示，建议使用简洁标题、段落和列表。
      </span>
    </div>
  );
}
