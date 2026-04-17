export interface SixthJobSkill {
    name: string;
    maxLevel: number;
    isOrigin: boolean;
}

const O = (name: string): SixthJobSkill => ({ name, maxLevel: 30, isOrigin: true });
const M = (name: string): SixthJobSkill => ({ name, maxLevel: 10, isOrigin: false });

export const SIXTH_JOB_SKILLS_BY_CLASS: Record<string, SixthJobSkill[]> = {
    // ── Warriors ──
    'Hero':          [ O('Rising Sun'),          M('Raging Blow'),     M('Puncture'),       M('Enrage'),          M('Shout'),           M('Combo Fury') ],
    'Paladin':       [ O('Charged Paragon'),      M('Blast'),           M('Divine Charge'),  M('Heaven\'s Hammer'), M('Holy Charge'),    M('Shield Charge') ],
    'Dark Knight':   [ O('Dark Spear'),           M('Beholder\'s Buff'), M('Gungnir\'s Descent'), M('Beholder\'s Revenge'), M('Evil Eye of Domination'), M('Sacrifice') ],
    'Dawn Warrior':  [ O('Solar Spear'),          M('Soul Blade'),      M('Soul Rush'),      M('Speeding Sunset'), M('Equinox Cycle'),   M('Styx Crossing') ],
    'Aran':          [ O('Tidal Crash'),          M('Combo Tempest'),   M('Beyonder'),       M('Combo Drain'),     M('Maha\'s Fury'),    M('Combo Smash') ],
    'Mihile':        [ O('Soul Asylum'),          M('Soul Link'),       M('Royal Guard'),    M('Sword of Light'),  M('Shining Blockade'), M('Soul Driver') ],
    'Blaster':       [ O('Revolving Cannon'),     M('Cannon Overdrive'), M('Magnum Punch'),  M('Arm Cannon'),      M('Detonate'),        M('Impact Wave') ],
    'Kaiser':        [ O('Giga Slash'),           M('Nova Warrior'),    M('Gigas Wave'),     M('Kaiser\'s Will'), M('Sword of Burning') , M('Blaze Slash') ],
    'Adele':         [ O('Aether Forge'),         M('Cleave'),          M('Aether Bloom'),   M('Hunting Decree'),  M('Aether Sword'),    M('Order') ],
    'Zero':          [ O('Transcendent Rhinne\'s Prayer'), M('Flash Assult'), M('Rapid Smash'), M('Twin Blades'), M('Rolling Cross'),  M('Time Holding') ],

    // ── Magicians ──
    'Arch Mage (F/P)': [ O('Inferno Aura'),       M('Megiddo Flame'),   M('Mist Eruption'), M('Paralyze'),        M('Poison Breath'),   M('Flame Sweep') ],
    'Arch Mage (I/L)': [ O('Frozen Orb'),         M('Thunder Break'),   M('Chain Lightning'), M('Blizzard'),      M('Elquines'),        M('Ice Age') ],
    'Bishop':          [ O('Heaven\'s Door'),      M('Benediction'),     M('Peacemaker'),    M('Vengeance of Angel'), M('Genesis'),       M('Big Bang') ],
    'Luminous':        [ O('Spectral Light'),      M('Apocalypse'),      M('Ender'),         M('Reflection'),      M('Liberation Orb'),  M('Black Hole') ],
    'Evan':            [ O('Celestial Roar'),      M('Blaze'),           M('Claw Breath'),   M('Dragon Barrage'),  M('Dragon Dive'),     M('Draconic Fury') ],
    'Illium':          [ O('Illium\'s Will'),      M('Javelin'),         M('Crystal Gate'),  M('Javelin Thrust'),  M('Crystal Flash'),   M('Aether Storm') ],
    'Ark':             [ O('Ethereal Form'),       M('Abyssal Strike'),  M('Abyssal Charge'), M('Primal Roar'),    M('Manifest'),        M('Abyssal Lightning') ],
    'Lara':            [ O('Dragon Spirit'),       M('Geyser'),          M('Rock Smash'),    M('Vine Whip'),       M('Nature\'s Wrath'), M('Earth Dive') ],

    // ── Bowmen ──
    'Bowmaster':     [ O('Storm of Arrows'),      M('Trifling Wind'),   M('Arrow Rain'),     M('Arrow Stream'),    M('Quiver Cartridge'), M('Gale Barrier') ],
    'Marksman':      [ O('Final Destination'),    M('Snipe'),           M('Freezing Breath'), M('Arrow Illusion'), M('Piercing Arrow'),  M('Bolt Burst') ],
    'Pathfinder':    [ O('Ancient Wrath'),        M('Ancient Astra'),   M('Relic Unbound'),  M('Obsidian Barrier'), M('Guided Arrow'),   M('Cardinal Force') ],
    'Wild Hunter':   [ O('Primal Fury'),          M('Wild Arrow Blast'), M('Sonic Roar'),    M('Ferocious Charge'), M('Jaguar Storm'),   M('Wild Instinct') ],
    'Kain':          [ O('Binding Burst'),        M('Fang'),            M('Cruel Stab'),     M('Death Blessing'),  M('Hunting Decree'),  M('Death Mark') ],
    'Mercedes':      [ O('Celestial Pierce'),     M('Ishtar\'s Ring'),  M('Spikes Royale'),  M('Aerial Barrage'),  M('Rising Rush'),     M('Ignis Roar') ],

    // ── Thieves ──
    'Night Lord':    [ O('Sudden Raid'),          M('Quad Star'),       M('Mark of Assassin'), M('Showdown'),     M('Noir Carte'),      M('Dark Flare') ],
    'Shadower':      [ O('Dark Omen'),            M('Meso Explosion'),  M('Boomerang Step'),  M('Dark Impale'),   M('Assassinate'),     M('Phase Dash') ],
    'Dual Blade':    [ O('Phantom Blow'),         M('Blade Fury'),      M('Blade Ascension'), M('Tornado Spin'), M('Sudden Raid'),     M('Mirror Image') ],
    'Xenon':         [ O('Orbital Cataclysm'),    M('Pinpoint Salvo'), M('Hypogram Field'),  M('Triangulation'),  M('Aegis System'),    M('Core Overload') ],
    'Cadena':        [ O('Chain Arts: Thrash'),   M('Chain Arts: Void Throw'), M('Chain Arts: Maelstrom'), M('Execution'), M('Chain Arts: Crush'), M('Link Mastery') ],
    'Hoyoung':       [ O('Sage: Darkness'),       M('Sage: Earth'),     M('Sage: Wind'),     M('Sage: Fire'),     M('Sage: Water'),     M('Art of Thought') ],

    // ── Pirates ──
    'Buccaneer':     [ O('Nautilus Strike'),      M('Snatch'),          M('Octopush'),       M('Dragon Strike'),   M('Energy Burst'),    M('Supercharge') ],
    'Corsair':       [ O('Pirate Flag'),          M('Rapid Fire'),      M('Ugly Bomb'),      M('Battleship Cannon'), M('Broadside'),     M('Jolly Roger') ],
    'Cannoneer':     [ O('Cannon Barrage'),       M('Cannon Bazooka'),  M('Hyper Magnum Punch'), M('Anchors Aweigh'), M('Blast Back'),  M('Rolling Cannon Rainbow') ],
    'Thunder Breaker': [ O('Thunderous Charge'),  M('Annihilate'),      M('Tidal Crash'),    M('Lightning Punch'), M('Gale'),           M('Spark Sweep') ],
    'Mechanic':      [ O('Iron Juggernaut'),      M('Mech: Siege Mode'), M('Giant Robot'),   M('Laser Blast'),     M('Amplifier Robot'), M('Support Unit') ],
    'Jett':          [ O('Starfall'),             M('Stardust'),        M('Comet Booster'),  M('Starline One'),    M('Starline Two'),    M('Starline Three') ],
    'Shade':         [ O('Nether Burst'),         M('Bomb Punch'),      M('Spirit Claw'),    M('Fox Spirits'),     M('Soul Summon'),     M('Bind') ],
};

export const DEFAULT_SIXTH_JOB_SKILLS: SixthJobSkill[] = [
    O('Origin Skill'),
    M('Mastery Core 1'),
    M('Mastery Core 2'),
    M('Mastery Core 3'),
    M('Mastery Core 4'),
    M('Mastery Core 5'),
];

export function getSkillsForClass(className: string | null): SixthJobSkill[] {
    if (!className) return DEFAULT_SIXTH_JOB_SKILLS;
    return SIXTH_JOB_SKILLS_BY_CLASS[className] || DEFAULT_SIXTH_JOB_SKILLS;
}
