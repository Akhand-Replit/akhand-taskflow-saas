"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, List, ListOrdered, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RichTextEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
    className?: string;
}

export function RichTextEditor({ content, onChange, placeholder = "Write something...", className }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: placeholder,
            }),
        ],
        content: content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[100px] px-3 py-2"
            }
        },
        immediatelyRender: false
    });

    if (!editor) {
        return null;
    }

    return (
        <div className={`border rounded-md bg-white dark:bg-slate-950 flex flex-col ${className}`}>
            <div className="flex items-center gap-1 border-b p-1 bg-slate-50 dark:bg-slate-900/50">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={editor.isActive('bold') ? 'bg-slate-200 dark:bg-slate-700 h-7 w-7 p-0' : 'h-7 w-7 p-0'}
                    type="button"
                >
                    <Bold className="h-3.5 w-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={editor.isActive('italic') ? 'bg-slate-200 dark:bg-slate-700 h-7 w-7 p-0' : 'h-7 w-7 p-0'}
                    type="button"
                >
                    <Italic className="h-3.5 w-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={editor.isActive('bulletList') ? 'bg-slate-200 dark:bg-slate-700 h-7 w-7 p-0' : 'h-7 w-7 p-0'}
                    type="button"
                >
                    <List className="h-3.5 w-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={editor.isActive('orderedList') ? 'bg-slate-200 dark:bg-slate-700 h-7 w-7 p-0' : 'h-7 w-7 p-0'}
                    type="button"
                >
                    <ListOrdered className="h-3.5 w-3.5" />
                </Button>
            </div>
            <EditorContent editor={editor} className="flex-1 cursor-text" />
        </div>
    );
}
