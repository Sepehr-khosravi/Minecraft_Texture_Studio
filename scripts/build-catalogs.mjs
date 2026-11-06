// Builds public/catalogs/blocks-1.8.9.json from a real 1.8.9 client jar.
// Uses the JAR's embedded file listing — nothing to install, no guessing.
import AdmZip from 'adm-zip';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const MIRROR = process.env.MIRROR || 'https://launcher.mojang.com/v1/objects/3870888a6c3d9c2320945427f5f1d182a8a4cc8c/client.jar';

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Download failed: HTTP ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

/** Convert `grass_top.png` → `Grass Top`. */
function humanize(fileName) {
  return fileName
    .replace(/\.png$/, '')
    .split('_')
    .map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1)))
    .join(' ')
    .replace(/\b(\w+)\b/g, (m) => m); // keep for now; refined below
}

/** Better humanizer: preserves common acronyms and phrasing. */
function displayName(baseName) {
  const name = baseName.replace(/\.png$/, '');
  const map = {
    grass_top: 'Grass Block (Top)',
    grass_side: 'Grass Block (Side)',
    grass_side_overlay: 'Grass Block (Overlay)',
    grass_side_snowed: 'Grass Block (Snowy)',
    stone: 'Stone',
    stone_andesite: 'Andesite',
    stone_andesite_smooth: 'Polished Andesite',
    stone_diorite: 'Diorite',
    stone_diorite_smooth: 'Polished Diorite',
    stone_granite: 'Granite',
    stone_granite_smooth: 'Polished Granite',
    stone_slab_side: 'Stone Slab (Side)',
    stone_slab_top: 'Stone Slab (Top)',
    cobblestone: 'Cobblestone',
    cobblestone_mossy: 'Mossy Cobblestone',
    dirt: 'Dirt',
    dirt_podzol_side: 'Podzol (Side)',
    dirt_podzol_top: 'Podzol (Top)',
    coarse_dirt: 'Coarse Dirt',
    planks_oak: 'Oak Planks',
    planks_spruce: 'Spruce Planks',
    planks_birch: 'Birch Planks',
    planks_jungle: 'Jungle Planks',
    planks_acacia: 'Acacia Planks',
    planks_big_oak: 'Dark Oak Planks',
    log_oak: 'Oak Log',
    log_oak_top: 'Oak Log (Top)',
    log_spruce: 'Spruce Log',
    log_spruce_top: 'Spruce Log (Top)',
    log_birch: 'Birch Log',
    log_birch_top: 'Birch Log (Top)',
    log_jungle: 'Jungle Log',
    log_jungle_top: 'Jungle Log (Top)',
    log_acacia: 'Acacia Log',
    log_acacia_top: 'Acacia Log (Top)',
    log_big_oak: 'Dark Oak Log',
    log_big_oak_top: 'Dark Oak Log (Top)',
    leaves_oak: 'Oak Leaves',
    leaves_spruce: 'Spruce Leaves',
    leaves_birch: 'Birch Leaves',
    leaves_jungle: 'Jungle Leaves',
    leaves_acacia: 'Acacia Leaves',
    leaves_big_oak: 'Dark Oak Leaves',
    sand: 'Sand',
    red_sand: 'Red Sand',
    gravel: 'Gravel',
    gold_ore: 'Gold Ore',
    iron_ore: 'Iron Ore',
    coal_ore: 'Coal Ore',
    diamond_ore: 'Diamond Ore',
    emerald_ore: 'Emerald Ore',
    lapis_ore: 'Lapis Ore',
    redstone_ore: 'Redstone Ore',
    quartz_ore: 'Nether Quartz Ore',
    gold_block: 'Gold Block',
    iron_block: 'Iron Block',
    diamond_block: 'Diamond Block',
    emerald_block: 'Emerald Block',
    lapis_block: 'Lapis Block',
    coal_block: 'Coal Block',
    redstone_block: 'Redstone Block',
    bricks: 'Bricks',
    brick: 'Bricks',
    tnt_side: 'TNT (Side)',
    tnt_top: 'TNT (Top)',
    tnt_bottom: 'TNT (Bottom)',
    bookshelf: 'Bookshelf',
    obsidian: 'Obsidian',
    torch_on: 'Torch',
    fire_layer_0: 'Fire (Frame 0)',
    fire_layer_1: 'Fire (Frame 1)',
    water_still: 'Water (Still)',
    water_flow: 'Water (Flowing)',
    lava_still: 'Lava (Still)',
    lava_flow: 'Lava (Flowing)',
    netherrack: 'Netherrack',
    soul_sand: 'Soul Sand',
    glowstone: 'Glowstone',
    nether_brick: 'Nether Bricks',
    end_stone: 'End Stone',
    sandstone_normal: 'Sandstone (Normal)',
    sandstone_bottom: 'Sandstone (Bottom)',
    sandstone_top: 'Sandstone (Top)',
    sandstone_carved: 'Chiseled Sandstone',
    sandstone_smooth: 'Cut Sandstone',
    red_sandstone_normal: 'Red Sandstone',
    red_sandstone_bottom: 'Red Sandstone (Bottom)',
    red_sandstone_top: 'Red Sandstone (Top)',
    red_sandstone_carved: 'Chiseled Red Sandstone',
    red_sandstone_smooth: 'Cut Red Sandstone',
    dead_bush: 'Dead Bush',
    tallgrass: 'Tall Grass',
    tallgrass_fern: 'Fern',
    tallgrass_snowed: 'Grass (Snowy)',
    dandelion: 'Dandelion',
    flower_dandelion: 'Dandelion',
    flower_rose: 'Poppy',
    flower_blue_orchid: 'Blue Orchid',
    flower_allium: 'Allium',
    flower_houstonia: 'Azure Bluet',
    flower_tulip_red: 'Red Tulip',
    flower_tulip_orange: 'Orange Tulip',
    flower_tulip_white: 'White Tulip',
    flower_tulip_pink: 'Pink Tulip',
    flower_oxeye_daisy: 'Oxeye Daisy',
    flower_paeonia: 'Peony',
    wheat_stage_0: 'Wheat (Stage 0)',
    wheat_stage_1: 'Wheat (Stage 1)',
    wheat_stage_2: 'Wheat (Stage 2)',
    wheat_stage_3: 'Wheat (Stage 3)',
    wheat_stage_4: 'Wheat (Stage 4)',
    wheat_stage_5: 'Wheat (Stage 5)',
    wheat_stage_6: 'Wheat (Stage 6)',
    wheat_stage_7: 'Wheat (Stage 7)',
    carrots_stage_0: 'Carrots (Stage 0)',
    carrots_stage_1: 'Carrots (Stage 1)',
    carrots_stage_2: 'Carrots (Stage 2)',
    carrots_stage_3: 'Carrots (Stage 3)',
    cocoa_stage_0: 'Cocoa (Stage 0)',
    cocoa_stage_1: 'Cocoa (Stage 1)',
    cocoa_stage_2: 'Cocoa (Stage 2)',
    crafting_table_front: 'Crafting Table (Front)',
    crafting_table_side: 'Crafting Table (Side)',
    crafting_table_top: 'Crafting Table (Top)',
    furnace_front_off: 'Furnace (Front, Off)',
    furnace_front_on: 'Furnace (Front, On)',
    furnace_side: 'Furnace (Side)',
    furnace_top: 'Furnace (Top)',
    dispenser_front_horizontal: 'Dispenser (Horizontal)',
    dispenser_front_vertical: 'Dispenser (Vertical)',
    dropper_front_horizontal: 'Dropper (Horizontal)',
    dropper_front_vertical: 'Dropper (Vertical)',
    hopper_inside: 'Hopper (Inside)',
    hopper_outside: 'Hopper (Outside)',
    hopper_top: 'Hopper (Top)',
    iron_trapdoor: 'Iron Trapdoor',
    trapdoor: 'Wooden Trapdoor',
    iron_bars: 'Iron Bars',
    iron_door_lower: 'Iron Door (Lower)',
    iron_door_upper: 'Iron Door (Upper)',
    door_wood_lower: 'Oak Door (Lower)',
    door_wood_upper: 'Oak Door (Upper)',
    door_spruce_lower: 'Spruce Door (Lower)',
    door_spruce_upper: 'Spruce Door (Upper)',
    door_birch_lower: 'Birch Door (Lower)',
    door_birch_upper: 'Birch Door (Upper)',
    door_jungle_lower: 'Jungle Door (Lower)',
    door_jungle_upper: 'Jungle Door (Upper)',
    door_acacia_lower: 'Acacia Door (Lower)',
    door_acacia_upper: 'Acacia Door (Upper)',
    door_dark_oak_lower: 'Dark Oak Door (Lower)',
    door_dark_oak_upper: 'Dark Oak Door (Upper)',
    rail: 'Rail',
    golden_rail: 'Powered Rail',
    detector_rail: 'Detector Rail',
    activator_rail: 'Activator Rail',
    ladder: 'Ladder',
    lever: 'Lever',
    wooden_button: 'Wooden Button',
    stone_button: 'Stone Button',
    mob_spawner: 'Monster Spawner',
    ice: 'Ice',
    ice_packed: 'Packed Ice',
    snow: 'Snow',
    cactus_side: 'Cactus (Side)',
    cactus_top: 'Cactus (Top)',
    cactus_bottom: 'Cactus (Bottom)',
    clay: 'Clay',
    hardened_clay: 'Hardened Clay',
    hay_block_side: 'Hay Block (Side)',
    hay_block_top: 'Hay Block (Top)',
    slime: 'Slime Block',
    sponge: 'Sponge',
    sponge_wet: 'Wet Sponge',
    glass: 'Glass',
    glass_black: 'Black Stained Glass',
    glass_blue: 'Blue Stained Glass',
    glass_brown: 'Brown Stained Glass',
    glass_cyan: 'Cyan Stained Glass',
    glass_gray: 'Gray Stained Glass',
    glass_green: 'Green Stained Glass',
    glass_light_blue: 'Light Blue Stained Glass',
    glass_lime: 'Lime Stained Glass',
    glass_magenta: 'Magenta Stained Glass',
    glass_orange: 'Orange Stained Glass',
    glass_pink: 'Pink Stained Glass',
    glass_purple: 'Purple Stained Glass',
    glass_red: 'Red Stained Glass',
    glass_silver: 'Light Gray Stained Glass',
    glass_white: 'White Stained Glass',
    glass_yellow: 'Yellow Stained Glass',
    glass_pane_top: 'Glass Pane (Top)',
    glass_pane_top_white: 'White Stained Glass Pane (Top)',
    wool_colored_black: 'Black Wool',
    wool_colored_blue: 'Blue Wool',
    wool_colored_brown: 'Brown Wool',
    wool_colored_cyan: 'Cyan Wool',
    wool_colored_gray: 'Gray Wool',
    wool_colored_green: 'Green Wool',
    wool_colored_light_blue: 'Light Blue Wool',
    wool_colored_lime: 'Lime Wool',
    wool_colored_magenta: 'Magenta Wool',
    wool_colored_orange: 'Orange Wool',
    wool_colored_pink: 'Pink Wool',
    wool_colored_purple: 'Purple Wool',
    wool_colored_red: 'Red Wool',
    wool_colored_silver: 'Light Gray Wool',
    wool_colored_white: 'White Wool',
    wool_colored_yellow: 'Yellow Wool',
    hardened_clay_stained_black: 'Black Terracotta',
    hardened_clay_stained_blue: 'Blue Terracotta',
    hardened_clay_stained_brown: 'Brown Terracotta',
    hardened_clay_stained_cyan: 'Cyan Terracotta',
    hardened_clay_stained_gray: 'Gray Terracotta',
    hardened_clay_stained_green: 'Green Terracotta',
    hardened_clay_stained_light_blue: 'Light Blue Terracotta',
    hardened_clay_stained_lime: 'Lime Terracotta',
    hardened_clay_stained_magenta: 'Magenta Terracotta',
    hardened_clay_stained_orange: 'Orange Terracotta',
    hardened_clay_stained_pink: 'Pink Terracotta',
    hardened_clay_stained_purple: 'Purple Terracotta',
    hardened_clay_stained_red: 'Red Terracotta',
    hardened_clay_stained_silver: 'Light Gray Terracotta',
    hardened_clay_stained_white: 'White Terracotta',
    hardened_clay_stained_yellow: 'Yellow Terracotta',
    quartz_block_bottom: 'Quartz Block (Bottom)',
    quartz_block_chiseled: 'Chiseled Quartz',
    quartz_block_chiseled_top: 'Chiseled Quartz (Top)',
    quartz_block_lines: 'Quartz Pillar (Side)',
    quartz_block_lines_top: 'Quartz Pillar (Top)',
    quartz_block_side: 'Quartz Block (Side)',
    quartz_block_top: 'Quartz Block (Top)',
    redstone_lamp_off: 'Redstone Lamp (Off)',
    redstone_lamp_on: 'Redstone Lamp (On)',
    redstone_torch_off: 'Redstone Torch (Off)',
    redstone_torch_on: 'Redstone Torch (On)',
    redstone_dust_cross: 'Redstone Dust (Cross)',
    redstone_dust_line: 'Redstone Dust (Line)',
    comparator_off: 'Comparator (Off)',
    comparator_on: 'Comparator (On)',
    daylight_detector_top: 'Daylight Detector (Top)',
    daylight_detector_side: 'Daylight Detector (Side)',
    daylight_detector_inverted_top: 'Daylight Detector (Inverted)',
    beacon: 'Beacon',
    anvil_base: 'Anvil (Base)',
    anvil_top: 'Anvil (Top)',
    enchanting_table_top: 'Enchanting Table (Top)',
    enchanting_table_side: 'Enchanting Table (Side)',
    enchanting_table_bottom: 'Enchanting Table (Bottom)',
    endframe_top: 'End Portal Frame (Top)',
    endframe_side: 'End Portal Frame (Side)',
    endframe_eye: 'End Portal Frame (Eye)',
    dragon_egg: 'Dragon Egg',
    end_stone: 'End Stone',
    sea_lantern: 'Sea Lantern',
    prismarine_rough: 'Prismarine (Rough)',
    prismarine_bricks: 'Prismarine Bricks',
    prismarine_dark: 'Dark Prismarine',
    prismarine_rough2: 'Prismarine (Alt)',
    spruce_log_top: 'Spruce Log (Top)',
    birch_log_top: 'Birch Log (Top)',
    jungle_log_top: 'Jungle Log (Top)',
    bigoak_log_top: 'Dark Oak Log (Top)',
    acacia_log_top: 'Acacia Log (Top)',
    jukebox_side: 'Jukebox (Side)',
    jukebox_top: 'Jukebox (Top)',
    flower_pot: 'Flower Pot',
    bed_head_top: 'Bed (Head Top)',
    bed_feet_top: 'Bed (Foot Top)',
    bed_head_side: 'Bed (Head Side)',
    bed_feet_side: 'Bed (Foot Side)',
    bed_head_end: 'Bed (Head End)',
    bed_feet_end: 'Bed (Foot End)',
    cake_top: 'Cake (Top)',
    cake_bottom: 'Cake (Bottom)',
    cake_side: 'Cake (Side)',
    cake_inner: 'Cake (Inner)',
    melon_top: 'Melon (Top)',
    melon_side: 'Melon (Side)',
    melon_stem: 'Melon Stem',
    pumpkin_top: 'Pumpkin (Top)',
    pumpkin_side: 'Pumpkin (Side)',
    pumpkin_face_off: 'Pumpkin (Face Off)',
    pumpkin_face_on: 'Jack o\'Lantern (Face)',
    pumpkin_stem: 'Pumpkin Stem',
    stem_straight: 'Stem (Straight)',
    stem_bent: 'Stem (Bent)',
    cocoa_stage_0: 'Cocoa (Stage 0)',
    cocoa_stage_1: 'Cocoa (Stage 1)',
    cocoa_stage_2: 'Cocoa (Stage 2)',
    nether_wart_stage_0: 'Nether Wart (Stage 0)',
    nether_wart_stage_1: 'Nether Wart (Stage 1)',
    nether_wart_stage_2: 'Nether Wart (Stage 2)',
    command_block: 'Command Block',
    iron_trapdoor: 'Iron Trapdoor',
    iron_trapdoor_top: 'Iron Trapdoor (Top)',
    endframe_top: 'End Portal Frame (Top)',
    daylight_detector_inverted_top: 'Daylight Detector (Inverted, Top)',
    double_plant_fern_bottom: 'Large Fern (Bottom)',
    double_plant_fern_top: 'Large Fern (Top)',
    double_plant_grass_bottom: 'Tall Grass (Bottom)',
    double_plant_grass_top: 'Tall Grass (Top)',
    double_plant_paeonia_bottom: 'Peony (Bottom)',
    double_plant_paeonia_top: 'Peony (Top)',
    double_plant_rose_bottom: 'Rose Bush (Bottom)',
    double_plant_rose_top: 'Rose Bush (Top)',
    double_plant_sunflower_bottom: 'Sunflower (Bottom)',
    double_plant_sunflower_front: 'Sunflower (Front)',
    double_plant_sunflower_top: 'Sunflower (Top)',
    double_plant_syringa_bottom: 'Lilac (Bottom)',
    double_plant_syringa_top: 'Lilac (Top)',
    double_stone_slab_side: 'Double Stone Slab (Side)',
    double_stone_slab_top: 'Double Stone Slab (Top)',
    double_wooden_slab_side: 'Double Wooden Slab (Side)',
    double_wooden_slab_top: 'Double Wooden Slab (Top)',
    sapling_oak: 'Oak Sapling',
    sapling_spruce: 'Spruce Sapling',
    sapling_birch: 'Birch Sapling',
    sapling_jungle: 'Jungle Sapling',
    sapling_acacia: 'Acacia Sapling',
    sapling_big_oak: 'Dark Oak Sapling',
    sapling_roofed_oak: 'Dark Oak Sapling',
    vine: 'Vines',
    waterlily: 'Lily Pad',
    web: 'Cobweb',
    // 1.8 added colored variants
    iron_trapdoor: 'Iron Trapdoor',
    // Animated / multi-frame
    water_still: 'Water (Still)',
    water_flow: 'Water (Flowing)',
    lava_still: 'Lava (Still)',
    lava_flow: 'Lava (Flowing)',
    fire_layer_0: 'Fire (Frame 0)',
    fire_layer_1: 'Fire (Frame 1)',
    // destroyed_stage_N — block breaking overlay
    destroyed_stage_0: 'Block Break (Stage 0)',
    destroyed_stage_1: 'Block Break (Stage 1)',
    destroyed_stage_2: 'Block Break (Stage 2)',
    destroyed_stage_3: 'Block Break (Stage 3)',
    destroyed_stage_4: 'Block Break (Stage 4)',
    destroyed_stage_5: 'Block Break (Stage 5)',
    destroyed_stage_6: 'Block Break (Stage 6)',
    destroyed_stage_7: 'Block Break (Stage 7)',
    destroyed_stage_8: 'Block Break (Stage 8)',
    destroyed_stage_9: 'Block Break (Stage 9)',
  };
  if (map[name]) return map[name];
  // Fallback: Title Case the raw name
  return name
    .split('_')
    .map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}

const ANIMATED = new Set([
  'water_still', 'water_flow', 'lava_still', 'lava_flow',
  'fire_layer_0', 'fire_layer_1',
]);
const ANIMATED_FRAME_COUNT = {
  water_still: 32, water_flow: 32,
  lava_still: 32, lava_flow: 32,
  fire_layer_0: 32, fire_layer_1: 32,
};

async function main() {
  console.log('Downloading 1.8.9 client jar from mirror…');
  console.log('  ', MIRROR);
  const buf = await download(MIRROR);
  console.log('  Downloaded', buf.length, 'bytes');

  const zip = new AdmZip(buf);
  const entries = zip.getEntries();
  const pngs = entries
    .map((e) => e.entryName)
    .filter((n) => n.startsWith('assets/minecraft/textures/blocks/') && n.endsWith('.png'));

  console.log('Found', pngs.length, 'texture files');

  const out = pngs
    .map((full) => {
      const base = full.replace('assets/minecraft/textures/blocks/', '').replace(/\.png$/, '');
      const animated = ANIMATED.has(base);
      const frames = ANIMATED_FRAME_COUNT[base];
      return {
        id: base,
        name: displayName(base),
        path: `assets/minecraft/textures/block/${base}.png`,
        size: 16,
        category: 'block',
        ...(frames ? { frames } : {}),
        ...(animated && !frames ? { animated: true } : {}),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const dest = path.resolve('public/catalogs/blocks-1.8.9.json');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(out, null, 2));
  console.log(`✓ Wrote ${out.length} entries to ${dest}`);
}

main().catch((err) => {
  console.error('✗', err.message);
  process.exit(1);
});