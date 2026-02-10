-- Conversations table: stores raw conversation data from browser extension
CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL, -- 'Gemini' or 'Doubao'
  model_version TEXT, -- AI model version (e.g., 'gemini-pro', 'doubao-pro')
  captured_at TEXT NOT NULL, -- ISO 8601 timestamp
  messages TEXT NOT NULL, -- JSON array of messages
  image_urls TEXT, -- JSON array of image URLs (optional)
  visibility INTEGER DEFAULT 0, -- 0 = hidden, 1 = public
  status TEXT DEFAULT 'processing', -- 'processing', 'completed', 'failed'
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Summary_Groups table: stores AI-generated summaries and metadata
CREATE TABLE IF NOT EXISTS summary_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL UNIQUE, -- Foreign key to conversations
  detailed_summary TEXT, -- Long-form summary for note-taking apps
  social_summary TEXT, -- Short summary for social media (280 chars max)
  rendered_image_path TEXT, -- Path to rendered share image
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT, -- Error details if generation failed
  prompt_version_id INTEGER, -- ID of the prompt template used
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Prompt_Templates table: stores AI prompt templates
CREATE TABLE IF NOT EXISTS prompt_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE, -- Template name (e.g., 'detailed-summary-v1')
  type TEXT NOT NULL, -- 'detailed-summary' or 'social-summary'
  content TEXT NOT NULL, -- Prompt template content
  version TEXT NOT NULL, -- Version string (e.g., '1.0.0')
  is_active INTEGER DEFAULT 1, -- 0 = inactive, 1 = active
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- API_Usage_Log table: tracks API calls and costs
CREATE TABLE IF NOT EXISTS api_usage_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER, -- Optional: link to conversation
  prompt_template_id INTEGER, -- Link to prompt template used
  request_type TEXT NOT NULL, -- 'detailed-summary' or 'social-summary'
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  cost REAL, -- Calculated cost in USD
  response_time_ms INTEGER, -- API response time in milliseconds
  status TEXT NOT NULL, -- 'success' or 'failed'
  error_message TEXT, -- Error details if failed
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,
  FOREIGN KEY (prompt_template_id) REFERENCES prompt_templates(id) ON DELETE SET NULL
);

-- Render_Log table: tracks rendering operations
CREATE TABLE IF NOT EXISTS render_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  template_name TEXT NOT NULL, -- 'bento-ui', 'newsletter', or 'vintage-paper'
  render_time_ms INTEGER, -- Rendering time in milliseconds
  status TEXT NOT NULL, -- 'success' or 'failed'
  error_message TEXT, -- Error details if failed
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_conversations_platform ON conversations(platform);
CREATE INDEX IF NOT EXISTS idx_conversations_visibility ON conversations(visibility);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_summary_groups_conversation_id ON summary_groups(conversation_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_log_conversation_id ON api_usage_log(conversation_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_log_created_at ON api_usage_log(created_at);
