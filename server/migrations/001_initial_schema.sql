-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROJECTS TABLE
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY, -- Keeping TEXT to support existing generated IDs (e.g. 'proj-123...')
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#DC2626',
    is_archived BOOLEAN DEFAULT FALSE,
    password_hash TEXT, -- Storing hashed password if present
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PROJECT MEMBERS (Many-to-Many)
CREATE TABLE IF NOT EXISTS project_members (
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES master_users(id) ON DELETE CASCADE, -- Changed to UUID to match master_users
    role TEXT DEFAULT 'member',
    PRIMARY KEY (project_id, user_id)
);

-- SUB-PROJECTS (AREAS)
CREATE TABLE IF NOT EXISTS sub_projects (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    board_config JSONB DEFAULT '{}', -- Stores enabledTabs, etc.
    order_index DOUBLE PRECISION DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LISTS (COLUMNS)
CREATE TABLE IF NOT EXISTS lists (
    id TEXT PRIMARY KEY,
    sub_project_id TEXT REFERENCES sub_projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'KANBAN', -- 'KANBAN' or 'TODO'
    order_index DOUBLE PRECISION DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CARDS (TASKS)
CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    list_id TEXT REFERENCES lists(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    order_index DOUBLE PRECISION DEFAULT 0,
    assignees JSONB DEFAULT '[]', -- Array of usernames or IDs
    labels JSONB DEFAULT '[]',
    attachments JSONB DEFAULT '[]',
    comments JSONB DEFAULT '[]', -- For now, keeping comments as JSONB to simplify migration
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_sub_projects_project_id ON sub_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_lists_sub_project_id ON lists(sub_project_id);
CREATE INDEX IF NOT EXISTS idx_cards_list_id ON cards(list_id);
