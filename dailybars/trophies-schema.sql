-- ============================================================================
-- 10. TROPHIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS trophies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    description TEXT,
    xp_cost INTEGER DEFAULT 100,
    color TEXT DEFAULT '#FACC15',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 11. USER TROPHIES (Unlocks)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_trophies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    trophy_id UUID REFERENCES trophies(id),
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, trophy_id)
);

-- RLS
ALTER TABLE trophies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_trophies ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Trophies viewable by everyone" ON trophies FOR SELECT USING (true);
CREATE POLICY "User trophies viewable by everyone" ON user_trophies FOR SELECT USING (true);
CREATE POLICY "User trophies insertable by everyone" ON user_trophies FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 12. SEED TROPHIES
-- ============================================================================

INSERT INTO trophies (name, icon, description, xp_cost, color) VALUES
-- Notorious B.I.G.’s Crown
('King of NY Crown', 'Crown', 'Notorious B.I.G. legendary plastic crown.', 500, '#FACC15'),
-- Tupac’s “Thug Life” Bandana
('Thug Life Bandana', 'Flag', 'Tupac iconic headwear.', 450, '#1E3A8A'),
-- Run-DMC Adidas Shell Toes
('Shell Toes', 'Footprints', 'Run-DMC Adidas with no laces.', 300, '#FFFFFF'),
-- LL Cool J Kangol Hat
('Kangol Hat', 'HardHat', 'LL Cool J classic bucket hat.', 350, '#EF4444'),
-- Slick Rick Eye Patch
('The Ruler Patch', 'EyeOff', 'Slick Rick essential eye patch.', 400, '#1F2937'),
-- Flavor Flav Big Clock Chain
('Big Clock', 'Clock', 'Flavor Flav giant timepiece.', 450, '#FFFFFF'),
-- E-40 Thick Gold Frames
('Thick Gold Frames', 'Glasses', 'E-40 stamped gold glasses.', 350, '#F59E0B'),
-- Kanye’s College Dropout Bear
('Dropout Bear', 'Smile', 'Kanye mascot head.', 500, '#FCD34D'),
-- Jay-Z Roc-A-Fella Chain
('The Roc Chain', 'Link', 'Roc-A-Fella diamond chain.', 600, '#E5E7EB'),
-- Wu-Tang W Medallion
('Wu-Tang W', 'Medal', 'Protect ya neck.', 550, '#F59E0B'),
-- Public Enemy Crosshair
('Target Logo', 'Crosshair', 'Public Enemy logo piece.', 400, '#000000'),
-- Grandmaster Flash Turntable
('The Wheels of Steel', 'Disc', 'Grandmaster Flash turntable.', 500, '#9CA3AF'),
-- Nas “Illmatic” Notebook
('Queensbridge Notebook', 'Book', 'Nas Illmatic rhyme book.', 600, '#78350F'),
-- Dr. Dre Chronic Leaf
('The Chronic', 'Leaf', 'Dr. Dre iconic leaf symbol.', 450, '#166534'),
-- Outkast ATLiens Helmet
('ATLiens Helmet', 'HardHat', 'Outkast comic book helmet.', 500, '#818CF8'),
-- Missy Elliott Trash Bag Suit
('The Rain Suit', 'Trash2', 'Missy inflatable suit.', 550, '#000000'),
-- Lil Wayne Styrofoam Cup
('Weezy Cup', 'Coffee', 'Double cup filled up.', 350, '#A78BFA'),
-- MF DOOM Mask
('Metal Face', 'Ghost', 'MF DOOM villain mask.', 600, '#9CA3AF'),
-- Pharrell Ice Cream
('Billionaire Cone', 'IceCream', 'BBC Ice Cream chain.', 550, '#F472B6'),
-- Snoop Dogg Blue Bandana Chucks
('Crip Walk Chucks', 'Footprints', 'Snoop blue bandana shoes.', 400, '#1D4ED8'),
-- Beastie Boys VW Chain
('License Plate Chain', 'Link', 'Beastie Boys VW emblem.', 350, '#D1D5DB'),
-- RZA Samurai Sword
('Liquid Sword', 'Sword', 'Wu-Tang sharp style.', 500, '#9CA3AF'),
-- Lauryn Hill Halo
('Miseducation Halo', 'Mic', 'Lauryn Hill divine mic.', 600, '#F59E0B'),
-- Kendrick Lamar Crown of Thorns
('Savior Crown', 'Crown', 'Kendrick diamond thorns.', 700, '#E5E5E5'),
-- Nicki Minaj Pink Wig
('Pink Friday Wig', 'User', 'Nicki iconic hair.', 450, '#EC4899'),
-- Travis Scott Astroworld Head
('Astro Head', 'User', 'Giant golden head entrance.', 500, '#F59E0B'),
-- DJ Kool Herc Speaker
('Sedgwick Speaker', 'Speaker', 'The birth of hip hop tower.', 600, '#4B5563'),
-- Curtis Blow Rope Chain
('The Breaks Chain', 'Link', 'Classic thick rope chain.', 400, '#F59E0B'),
-- Mase Shiny Suit
('Shiny Suit', 'Shirt', 'Bad Boy era reflective jacket.', 450, '#3B82F6'),
-- Raekwon Purple Tape
('The Purple Tape', 'CassetteTape', 'Only built 4 Cuban Linx.', 550, '#7C3AED'),
-- N.W.A Raiders Cap
('Compton Cap', 'HardHat', 'N.W.A Raiders snapback.', 400, '#000000'),
-- Lil Kim Colored Fur
('Crush On You Coat', 'Shirt', 'Lil Kim iconic fur.', 500, '#10B981'),
-- Eminem Detroit Snapback
('Shady Cap', 'HardHat', 'Eminem Detroit hat.', 400, '#000000'),
-- Drake OVO Owl
('OVO Owl', 'Feather', 'Drake owl chain.', 550, '#F59E0B'),
-- Ice Cube Bye Felicia Plaque
('Bye Felicia', 'Award', 'Friday movie quote plaque.', 350, '#EF4444'),
-- Andre 3000 Shoulder Pads
('3 Stacks Pads', 'Shirt', 'Andre 3000 football fit.', 500, '#EA580C'),
-- Tupac Poetic Justice Cap
('Justice Cap', 'HardHat', 'Newsboy cap from the movie.', 400, '#000000'),
-- Cardi B Red Bottoms
('Bloody Shoes', 'Footprints', 'Cardi B red bottom heels.', 550, '#EF4444'),
-- A Tribe Called Quest Stripe Jacket
('Tribe Jacket', 'Shirt', 'Red and green stripe jacket.', 450, '#000000'),
-- Missy Elliott Finger Wave
('Supa Dupa Waves', 'User', 'Missy classic hairstyle.', 400, '#000000'),
-- Tyler Golf Le Fleur Cap
('Golf Flower Cap', 'HardHat', 'Tyler colorful hat.', 450, '#F9A8D4'),
-- Rick Ross Pinky Ring
('Boss Ring', 'Circle', 'Rick Ross gold pinky ring.', 500, '#F59E0B'),
-- Busta Rhymes Dragon
('Dungeon Dragon', 'Flame', 'Busta Rhymes energy.', 550, '#EF4444'),
-- 50 Cent Tank Top
('In Da Club Tank', 'Shirt', '50 Cent white muscle shirt.', 350, '#FFFFFF'),
-- Chief Keef Shades
('Glo Gang Shades', 'Glasses', 'Chief Keef white goggles.', 450, '#FFFFFF'),
-- Future Pluto Helmet
('Astronaut Status', 'HardHat', 'Future space helmet.', 500, '#6366F1'),
-- Lil Uzi Vert Diamond
('Forehead Gem', 'Diamond', 'Lil Uzi pink diamond.', 600, '#EC4899'),
-- Mac Miller Swimming Badge
('Swimming Badge', 'Badge', 'Mac Miller diver icon.', 500, '#3B82F6'),
-- DJ Screw Cup
('Chopped & Screwed', 'Coffee', 'Purple potion styrofoam.', 450, '#8B5CF6'),
-- Hyphy Ghost Ride Wheel
('Ghost Ride Wheel', 'Move', 'Hyphy movement steering wheel.', 500, '#F59E0B');
