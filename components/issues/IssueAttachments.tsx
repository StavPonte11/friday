"use client";

import React, { useCallback, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useSession } from "next-auth/react";
import { Upload, File, Image, FileText, Trash2, Loader2, Download, Paperclip } from "lucide-react";
import { useDropzone } from "react-dropzone";

interface IssueAttachmentsProps {
    issueId: string;
}

function getFileIcon(mimeType: string) {
    if (mimeType.startsWith("image/")) return <Image className="w-4 h-4 text-blue-500" />;
    if (mimeType === "application/pdf") return <FileText className="w-4 h-4 text-red-500" />;
    return <File className="w-4 h-4 text-muted-foreground" />;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function IssueAttachments({ issueId }: IssueAttachmentsProps) {
    const { data: session } = useSession();
    const currentUserId = (session?.user as any)?.id ?? "";

    const { data: attachments, isLoading, refetch } = trpc.pmAttachments.list.useQuery({ issueId });
    const createAttachment = trpc.pmAttachments.create.useMutation({ onSuccess: () => { refetch(); } });
    const deleteAttachment = trpc.pmAttachments.delete.useMutation({ onSuccess: () => { refetch(); } });
    const getUploadUrl = trpc.pmAttachments.getUploadUrl.useMutation();

    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (!currentUserId) return;
        setUploadError(null);
        setUploading(true);

        for (const file of acceptedFiles) {
            try {
                // Get upload URL (local or S3)
                const uploadInfo = await getUploadUrl.mutateAsync({
                    filename: file.name,
                    mimeType: file.type,
                    issueId,
                });

                // Upload the file
                const formData = new FormData();
                formData.append("file", file);
                formData.append("issueId", issueId);
                if (uploadInfo.key) formData.append("key", uploadInfo.key);

                const res = await fetch(uploadInfo.uploadUrl, {
                    method: "POST",
                    body: formData,
                });

                if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
                const result = await res.json();

                // Register in DB
                await createAttachment.mutateAsync({
                    issueId,
                    uploaderId: currentUserId,
                    filename: file.name,
                    url: result.url,
                    size: file.size,
                    mimeType: file.type,
                });
            } catch (err) {
                setUploadError(err instanceof Error ? err.message : "Upload failed");
            }
        }

        setUploading(false);
    }, [issueId, currentUserId, getUploadUrl, createAttachment]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        maxSize: 50 * 1024 * 1024, // 50MB
        disabled: uploading || !currentUserId,
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Paperclip className="w-4 h-4" />
                <span>Attachments{attachments ? ` (${attachments.length})` : ""}</span>
            </div>

            {/* Drop zone */}
            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDragActive
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/30"
                } ${uploading || !currentUserId ? "opacity-50 cursor-not-allowed" : ""}`}
            >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-2">
                    {uploading ? (
                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    ) : (
                        <Upload className="w-6 h-6 text-muted-foreground" />
                    )}
                    <p className="text-sm text-muted-foreground">
                        {uploading
                            ? "Uploading..."
                            : isDragActive
                            ? "Drop files here"
                            : "Drag & drop files here, or click to select"}
                    </p>
                    <p className="text-xs text-muted-foreground">Images, logs, PDFs up to 50MB</p>
                </div>
            </div>

            {uploadError && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    {uploadError}
                </div>
            )}

            {/* Attachment list */}
            {isLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : attachments && attachments.length > 0 ? (
                <div className="space-y-2">
                    {attachments.map((att) => (
                        <div key={att.id} className="flex items-center gap-3 p-3 border border-border rounded-lg bg-card hover:bg-muted/30 transition-colors group">
                            <div className="flex-shrink-0">{getFileIcon(att.mimeType)}</div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{att.filename}</p>
                                <p className="text-xs text-muted-foreground">
                                    {formatBytes(att.size)} · by {(att.uploader as any)?.name ?? "Unknown"}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {att.mimeType.startsWith("image/") && (
                                    <a
                                        href={att.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                                    >
                                        <Image className="w-4 h-4" />
                                    </a>
                                )}
                                <a
                                    href={att.url}
                                    download={att.filename}
                                    className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                                >
                                    <Download className="w-4 h-4" />
                                </a>
                                {att.uploaderId === currentUserId && (
                                    <button
                                        onClick={() => deleteAttachment.mutate({ id: att.id, uploaderId: currentUserId })}
                                        disabled={deleteAttachment.isPending}
                                        className="p-1.5 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground text-center py-2">No attachments yet</p>
            )}
        </div>
    );
}
