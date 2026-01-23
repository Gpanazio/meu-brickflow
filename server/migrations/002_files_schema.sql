-- FOLDERS TABLE
CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    sub_project_id TEXT REFERENCES sub_projects(id) ON DELETE CASCADE,
    parent_id TEXT REFERENCES folders(id) ON DELETE CASCADE, -- Hierarchical structure
    name TEXT NOT NULL,
    color TEXT DEFAULT 'default',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- FILES TABLE
CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    sub_project_id TEXT REFERENCES sub_projects(id) ON DELETE CASCADE,
    folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL, -- Files can be flat or in folders
    name TEXT NOT NULL,
    type TEXT, -- MIME type
    size FLOAT, -- Size in bytes
    data TEXT, -- Base64 content for MVP (Ideally S3/Storage URL, but sticking to existing pattern)
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_folders_sub_project_id ON folders(sub_project_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_files_sub_project_id ON files(sub_project_id);
CREATE INDEX IF NOT EXISTS idx_files_folder_id ON files(folder_id);
