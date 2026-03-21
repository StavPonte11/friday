"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';

interface RichTextEditorProps {
    value: string;
    onChange: (val: string) => void;
    onBlur?: () => void;
    placeholder?: string;
    minHeight?: string;
}

export function RichTextEditor({ 
    value, 
    onChange, 
    onBlur,
    placeholder = "Type here... Use markdown shortcuts like # or *",
    minHeight = "min-h-[200px]"
}: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({ placeholder, emptyEditorClass: 'is-editor-empty' })
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        onBlur: () => {
            if (onBlur) onBlur();
        },
        editorProps: {
            attributes: {
                class: `${minHeight} w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 prose prose-sm dark:prose-invert max-w-none focus:bg-background transition-colors`
            }
        }
    });

    // Sync external value changes if strictly different (prevents cursor jumping)
    useEffect(() => {
        if (editor && value !== editor.getHTML() && !editor.isFocused) {
            editor.commands.setContent(value);
        }
    }, [value, editor]);

    return (
        <div className="relative tiptap-wrapper">
            <style dangerouslySetInnerHTML={{__html: `
                .tiptap p.is-editor-empty:first-child::before {
                    color: hsl(var(--muted-foreground));
                    content: attr(data-placeholder);
                    float: left;
                    height: 0;
                    pointer-events: none;
                }
                .tiptap { outline: none; }
                .tiptap ul { list-style-type: disc; padding-left: 1.5rem; }
                .tiptap ol { list-style-type: decimal; padding-left: 1.5rem; }
                .tiptap h1 { max-font-size: 2em; font-weight: bold; margin-bottom: 0.5em; }
                .tiptap h2 { font-size: 1.5em; font-weight: bold; margin-bottom: 0.5em; }
                .tiptap h3 { font-size: 1.17em; font-weight: bold; margin-bottom: 0.5em; }
                .tiptap blockquote { border-left: 3px solid hsl(var(--border)); padding-left: 1rem; font-style: italic; }
                .tiptap code { background: hsl(var(--muted)); padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-family: monospace; font-size: 0.875em; }
                .tiptap pre { background: hsl(var(--muted)); padding: 0.75rem; border-radius: 0.5rem; overflow-x: auto; font-family: monospace; }
                .tiptap pre code { background: none; padding: 0; }
            `}} />
            <EditorContent editor={editor} />
        </div>
    );
}
