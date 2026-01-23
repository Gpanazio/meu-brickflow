import React, { useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ProjectCard from '@/components/ProjectCard';

export function SortableProjectItem({ project, onEdit, onDelete, onSelect, handleAccessProject }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: project.id, data: { type: 'project', project } });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 999 : 'auto',
        position: 'relative',
        touchAction: 'none'
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <ProjectCard
                project={project}
                draggable={false} // Disable native drag
                onEdit={onEdit}
                onDelete={onDelete}
                onSelect={onSelect}
            // Native DnD handlers removed in favor of dnd-kit
            />
        </div>
    );
}

export default SortableProjectItem;
