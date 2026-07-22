import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Mention from '@tiptap/extension-mention'
import suggestion from './suggestion'
import { common, createLowlight } from 'lowlight'
import React, { useEffect, useImperativeHandle, forwardRef } from 'react'
import 'highlight.js/styles/github-dark.css' 
import 'tippy.js/dist/tippy.css'

const lowlight = createLowlight(common)

interface TipTapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export interface TipTapEditorRef {
  getEditor: () => ReturnType<typeof useEditor>;
}

export const TipTapEditor = forwardRef<TipTapEditorRef, TipTapEditorProps>(({
  value,
  onChange,
  className,
  placeholder
}, ref) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, 
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'text-red-500 font-bold bg-red-500/10 px-1 rounded-sm select-all cursor-pointer',
        },
        suggestion,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm dark:prose-invert max-w-none focus:outline-none w-full h-full ${className || ''}`,
        placeholder: placeholder || 'Start writing...',
      },
    },
  })

  // Synchronize external value changes if they differ from editor content
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      // Small optimization to prevent cursor jumping on every rerender
      const cursor = editor.state.selection
      editor.commands.setContent(value)
      editor.commands.setTextSelection(cursor)
    }
  }, [value, editor])

  useImperativeHandle(ref, () => ({
    getEditor: () => editor
  }))

  return (
    <div className="flex-1 w-full h-full cursor-text overflow-y-auto custom-scrollbar p-4">
      <EditorContent editor={editor} className="min-h-full outline-none" />
    </div>
  )
})

TipTapEditor.displayName = 'TipTapEditor'
