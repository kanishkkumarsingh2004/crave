-- Migration: add locale preference column to users table
-- Run this in your Supabase SQL editor (or any Postgres client connected to the DB).
-- Safe to run multiple times — uses ALTER TABLE ... IF NOT EXISTS.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'en';

-- Optional: add a check constraint to reject unsupported locale codes.
-- Add each new language code here when you add a new dictionary file.
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_locale_check;

ALTER TABLE users
  ADD CONSTRAINT users_locale_check
    CHECK (locale IN ('en', 'kn'));
