-- Enable UUID generation (still needed for other tables that might use UUID for PKs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

--------------------------------------------------------------------------------
-- Schema: hiking_user_schema
--------------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS hiking_user_schema;
SET search_path TO hiking_user_schema, public;

-- ENUM Types for user schema
CREATE TYPE user_status_enum AS ENUM ('active', 'pending_verification', 'suspended', 'deleted'); -- From your design

CREATE TYPE notification_type_enum AS ENUM (
    'activity_invite',
    'activity_报名成功', -- registration_success
    'activity_开始提醒', -- start_reminder
    'activity_comment_reply',
    'activity_vote_ending_soon',
    'system_announcement',
    'new_follower',
    'reward_unlocked',
    'community_post_like',
    'community_post_comment'
);
CREATE TYPE community_post_content_type_enum AS ENUM ('text', 'image', 'video');
CREATE TYPE community_post_visibility_enum AS ENUM ('public', 'friends_only', 'private');

-- Function for automatic 'updated_at' (From your design)
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Table: users (Based on your detailed design, PK is SERIAL)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(100) DEFAULT NULL UNIQUE,
  avatar_url VARCHAR(512) DEFAULT NULL,
  first_name VARCHAR(100) DEFAULT NULL,
  last_name VARCHAR(100) DEFAULT NULL,
  bio TEXT DEFAULT NULL,
  phone_number VARCHAR(30) DEFAULT NULL UNIQUE,
  points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  email_verified_at TIMESTAMPTZ NULL DEFAULT NULL,
  status user_status_enum NOT NULL DEFAULT 'pending_verification',
  roles TEXT[] DEFAULT ARRAY['ROLE_USER'], -- For roles like 'ROLE_MEMBER_PARTICIPANT'
  last_login_at TIMESTAMPTZ NULL DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for 'updated_at' on users table (From your design)
DROP TRIGGER IF EXISTS set_users_updated_at ON users;
CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Comments for users table (From your design)
COMMENT ON TABLE users IS '用户信息表 (采纳你的详细设计)';
COMMENT ON COLUMN users.id IS '用户ID (自增主键)';
COMMENT ON COLUMN users.email IS '邮箱 (用于登录和联系, 唯一)';
COMMENT ON COLUMN users.password_hash IS '哈希后的密码';
COMMENT ON COLUMN users.nickname IS '昵称 (可编辑, 可选唯一)';
COMMENT ON COLUMN users.avatar_url IS '头像URL (可编辑)';
COMMENT ON COLUMN users.first_name IS '名字 (可编辑)';
COMMENT ON COLUMN users.last_name IS '姓氏 (可编辑)';
COMMENT ON COLUMN users.bio IS '个人简介 (可编辑)';
COMMENT ON COLUMN users.phone_number IS '电话号码 (可选, 可编辑, 可选唯一)';
COMMENT ON COLUMN users.points IS '当前积分 (必须为非负数)';
COMMENT ON COLUMN users.email_verified_at IS '邮箱验证时间';
COMMENT ON COLUMN users.status IS '用户状态 (active, pending_verification, suspended, deleted)';
COMMENT ON COLUMN users.roles IS '用户角色, 数组存储 (例如 {ROLE_USER, ROLE_ADMIN, ROLE_MEMBER_PARTICIPANT})';
COMMENT ON COLUMN users.last_login_at IS '最后登录时间';
COMMENT ON COLUMN users.created_at IS '注册时间';
COMMENT ON COLUMN users.updated_at IS '信息更新时间 (通过触发器自动更新)';

-- Table: user_privacy_settings (user_id FK type changed to INTEGER)
CREATE TABLE IF NOT EXISTS user_privacy_settings (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    profile_visibility community_post_visibility_enum DEFAULT 'public',
    activity_participation_visibility community_post_visibility_enum DEFAULT 'public',
    allow_trip_recording BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE user_privacy_settings IS 'Stores user-specific privacy preferences.';

-- Table: user_notification_preferences (user_id FK type changed to INTEGER)
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    receive_activity_invites BOOLEAN DEFAULT TRUE,
    receive_registration_confirmations BOOLEAN DEFAULT TRUE,
    receive_start_reminders BOOLEAN DEFAULT TRUE,
    receive_comment_replies BOOLEAN DEFAULT TRUE,
    receive_system_announcements BOOLEAN DEFAULT TRUE,
    receive_new_follower_alerts BOOLEAN DEFAULT TRUE,
    receive_reward_notifications BOOLEAN DEFAULT TRUE,
    receive_community_post_likes BOOLEAN DEFAULT TRUE,
    receive_community_post_comments BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE user_notification_preferences IS 'Manages user preferences for different types of notifications.';

-- Table: rewards (Badges/Achievements)
CREATE TABLE IF NOT EXISTS rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- This can remain UUID if not directly tied to user PK type
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url TEXT,
    points_awarded INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE rewards IS 'Defines available rewards, badges, or achievements.';

-- Table: user_rewards (user_id FK type changed to INTEGER)
CREATE TABLE IF NOT EXISTS user_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE CASCADE, -- Assumes rewards.id is UUID
    achieved_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, reward_id)
);
COMMENT ON TABLE user_rewards IS 'Links users to the rewards they have earned.';

-- Table: notifications (user_id FK types changed to INTEGER)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    type notification_type_enum NOT NULL,
    content TEXT NOT NULL,
    related_entity_type VARCHAR(50),
    related_entity_id UUID, -- Assuming related entities like activities, comments still use UUID PKs
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE notifications IS 'Stores notifications for users.';

-- Table: user_community_posts (user_id FK type changed to INTEGER)
CREATE TABLE IF NOT EXISTS user_community_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_type community_post_content_type_enum NOT NULL,
    content_text TEXT,
    media_url TEXT,
    visibility community_post_visibility_enum DEFAULT 'public',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE user_community_posts IS 'Stores user-generated community posts (text, image, video).';

-- Indexes for user_schema
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_nickname ON users(nickname);
CREATE INDEX IF NOT EXISTS idx_users_status ON users (status); -- From your design
CREATE INDEX IF NOT EXISTS idx_users_roles ON users USING GIN (roles); -- From your design
CREATE INDEX IF NOT EXISTS idx_user_rewards_user_id ON user_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_user_id ON notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_user_community_posts_user_id ON user_community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_related_entity ON notifications(related_entity_type, related_entity_id);

--------------------------------------------------------------------------------
-- Schema: hiking_activity_schema
--------------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS hiking_activity_schema;
SET search_path TO hiking_activity_schema, public;

-- ENUM Types for activity schema
CREATE TYPE activity_status_enum AS ENUM ('draft', 'published', 'ongoing', 'completed', 'cancelled', 'voting_closed');
CREATE TYPE participant_status_enum AS ENUM ('pending_approval', 'confirmed', 'rejected', 'checked_in', 'cancelled_participation');
CREATE TYPE poi_type_enum AS ENUM ('restaurant', 'checkpoint', 'supply_point', 'viewpoint', 'historical_site', 'other');
CREATE TYPE activity_type_enum AS ENUM ('general', 'voting');

-- Table: activity_categories
CREATE TABLE IF NOT EXISTS activity_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE activity_categories IS 'Stores different categories for activities.';

-- Table: activities (organizer_id FK type changed to INTEGER)
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type activity_type_enum NOT NULL DEFAULT 'general',
    title VARCHAR(255) NOT NULL,
    cover_image_url TEXT,
    description TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    location_text VARCHAR(255),
    location_latitude DECIMAL(9,6),
    location_longitude DECIMAL(9,6),
    organizer_id INTEGER NOT NULL REFERENCES hiking_user_schema.users(id) ON DELETE CASCADE,
    fee_details TEXT,
    requirements TEXT,
    is_official BOOLEAN DEFAULT FALSE,
    is_promoted BOOLEAN DEFAULT FALSE,
    status activity_status_enum DEFAULT 'draft',
    max_participants INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE activities IS 'Stores all activity details.';

-- Table: activity_voting_options
CREATE TABLE IF NOT EXISTS activity_voting_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE activity_voting_options IS 'Stores the different optional routes for a "voting" type activity.';

-- Table: user_activity_votes (user_id FK type changed to INTEGER)
CREATE TABLE IF NOT EXISTS user_activity_votes (
    user_id INTEGER NOT NULL REFERENCES hiking_user_schema.users(id) ON DELETE CASCADE,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    voting_option_id UUID NOT NULL REFERENCES activity_voting_options(id) ON DELETE CASCADE,
    voted_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, activity_id)
);
COMMENT ON TABLE user_activity_votes IS 'Tracks which user voted for which option in a voting activity.';

-- Table: activity_category_map
CREATE TABLE IF NOT EXISTS activity_category_map (
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES activity_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (activity_id, category_id)
);
COMMENT ON TABLE activity_category_map IS 'Links activities to their respective categories.';

-- Table: activity_participants (user_id FK type changed to INTEGER)
CREATE TABLE IF NOT EXISTS activity_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES hiking_user_schema.users(id) ON DELETE CASCADE,
    join_time TIMESTAMPTZ DEFAULT NOW(),
    status participant_status_enum DEFAULT 'pending_approval',
    check_in_time TIMESTAMPTZ,
    UNIQUE (activity_id, user_id)
);
COMMENT ON TABLE activity_participants IS 'Tracks users participating in activities.';

-- Table: activity_route_points
CREATE TABLE IF NOT EXISTS activity_route_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    point_order INTEGER NOT NULL,
    latitude DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL,
    name VARCHAR(100),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(activity_id, point_order)
);
COMMENT ON TABLE activity_route_points IS 'Stores ordered route points for "general" type activities.';

-- Table: points_of_interest
CREATE TABLE IF NOT EXISTS points_of_interest (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type poi_type_enum NOT NULL,
    latitude DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL,
    related_info JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE points_of_interest IS 'Stores points of interest along a route for "general" type activities.';

-- Table: activity_photos (uploader_user_id FK type changed to INTEGER)
CREATE TABLE IF NOT EXISTS activity_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    uploader_user_id INTEGER REFERENCES hiking_user_schema.users(id) ON DELETE SET NULL,
    image_url TEXT NOT NULL,
    caption TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE activity_photos IS 'Stores photo album for an activity.';

-- Table: activity_comments (user_id FK type changed to INTEGER)
CREATE TABLE IF NOT EXISTS activity_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES hiking_user_schema.users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES activity_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE activity_comments IS 'Stores user comments for all activity types.';

-- Table: user_favorite_activities (user_id FK type changed to INTEGER)
CREATE TABLE IF NOT EXISTS user_favorite_activities (
    user_id INTEGER NOT NULL REFERENCES hiking_user_schema.users(id) ON DELETE CASCADE,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    favorited_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, activity_id)
);
COMMENT ON TABLE user_favorite_activities IS 'Stores activities favorited by users.';

-- Table: user_trip_logs (user_id FK type changed to INTEGER)
CREATE TABLE IF NOT EXISTS user_trip_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES hiking_user_schema.users(id) ON DELETE CASCADE,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    route_data JSONB,
    distance_meters NUMERIC,
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE user_trip_logs IS 'Stores recorded trip trajectories for "general" type activities.';

-- Indexes for activity_schema
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_organizer_id ON activities(organizer_id);
CREATE INDEX IF NOT EXISTS idx_activities_start_time ON activities(start_time);
CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_location ON activities(location_latitude, location_longitude);
CREATE INDEX IF NOT EXISTS idx_activity_participants_activity_id ON activity_participants(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_participants_user_id ON activity_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_comments_activity_id ON activity_comments(activity_id);
CREATE INDEX IF NOT EXISTS idx_user_favorite_activities_user_id ON user_favorite_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_category_map_activity_id ON activity_category_map(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_route_points_activity_id ON activity_route_points(activity_id);
CREATE INDEX IF NOT EXISTS idx_user_trip_logs_user_activity ON user_trip_logs(user_id, activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_voting_options_activity_id ON activity_voting_options(activity_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_votes_voting_option_id ON user_activity_votes(voting_option_id);

-- Full-Text Search support for activities
ALTER TABLE activities ADD COLUMN IF NOT EXISTS tsv_search tsvector;

CREATE OR REPLACE FUNCTION activities_trigger_set_tsv_search() RETURNS trigger AS $$
begin
  new.tsv_search :=
    setweight(to_tsvector('pg_catalog.chinese_zh', coalesce(new.title,'')), 'A') ||
    setweight(to_tsvector('pg_catalog.chinese_zh', coalesce(new.description,'')), 'B') ||
    setweight(to_tsvector('pg_catalog.chinese_zh', coalesce(new.location_text,'')), 'C');
  return new;
end
$$ LANGUAGE plpgsql;

CREATE TRIGGER tsvectorupdate_activities BEFORE INSERT OR UPDATE
    ON activities FOR EACH ROW EXECUTE FUNCTION activities_trigger_set_tsv_search();

CREATE INDEX IF NOT EXISTS idx_activities_tsv_search ON activities USING GIN(tsv_search);

-- Reset search_path to default
SET search_path TO "$user", public;

COMMIT;