import { useState } from 'react';
import { Folder, MoreVertical, Pencil, Trash2, Palette } from 'lucide-react';
import { motion } from 'framer-motion';
import { FOLDER_COLORS } from '../hooks/useFiles';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';

export default function FolderCard({
    folder,
    onDoubleClick,
    onRename,
    onDelete,
    onChangeColor,
    onDrop,
    isDragOver = false
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(folder.name);

    const colorConfig = FOLDER_COLORS.find(c => c.id === folder.color) || FOLDER_COLORS[0];

    const handleRename = () => {
        if (editName.trim() && editName !== folder.name) {
            onRename(folder.id, editName.trim());
        }
        setIsEditing(false);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const fileId = e.dataTransfer.getData('fileId');
        if (fileId && onDrop) {
            onDrop(fileId, folder.id);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onDoubleClick={() => onDoubleClick(folder.id)}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`
        group relative aspect-square cursor-pointer
        ${isDragOver ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-black' : ''}
      `}
        >
            <div className={`
        absolute inset-0 glass-panel ${colorConfig.border} ${colorConfig.bg}
        hover:border-zinc-500 transition-all flex flex-col items-center justify-center
        ${isDragOver ? 'bg-red-950/30' : ''}
      `}>
                {/* Folder Icon */}
                <Folder className={`w-12 h-12 ${colorConfig.icon} mb-2`} strokeWidth={1.5} />

                {/* Folder Name */}
                {isEditing ? (
                    <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={handleRename}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename();
                            if (e.key === 'Escape') {
                                setEditName(folder.name);
                                setIsEditing(false);
                            }
                        }}
                        className="bg-black/50 border border-zinc-700 px-2 py-1 text-xs text-white text-center w-[90%] font-mono uppercase tracking-wide"
                        onClick={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest text-center px-2 truncate w-full">
                        {folder.name}
                    </span>
                )}

                {/* Context Menu */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                onClick={(e) => e.stopPropagation()}
                                className="h-6 w-6 flex items-center justify-center bg-black/50 hover:bg-black border border-zinc-800 text-zinc-400 hover:text-white"
                            >
                                <MoreVertical className="w-3 h-3" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-black border-zinc-800 rounded-none">
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsEditing(true);
                                }}
                                className="text-xs uppercase tracking-widest font-mono cursor-pointer"
                            >
                                <Pencil className="w-3 h-3 mr-2" />
                                Renomear
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="bg-zinc-800" />

                            {FOLDER_COLORS.map(color => (
                                <DropdownMenuItem
                                    key={color.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onChangeColor(folder.id, color.id);
                                    }}
                                    className="text-xs uppercase tracking-widest font-mono cursor-pointer"
                                >
                                    <div className={`w-3 h-3 mr-2 ${color.bg} ${color.border} border`} />
                                    {color.name}
                                </DropdownMenuItem>
                            ))}

                            <DropdownMenuSeparator className="bg-zinc-800" />

                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(folder.id);
                                }}
                                className="text-xs uppercase tracking-widest font-mono cursor-pointer text-red-500 focus:text-red-400"
                            >
                                <Trash2 className="w-3 h-3 mr-2" />
                                Excluir
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </motion.div>
    );
}
