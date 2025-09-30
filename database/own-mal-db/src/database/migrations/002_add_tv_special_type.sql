-- Migration: Add 'TV Special' to anime_type enum
-- This fixes the crawler errors where anime have type 'TV Special'

-- Add the new enum value
ALTER TYPE anime_type ADD VALUE 'TV Special'; 