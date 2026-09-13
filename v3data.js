window.RPG_HUNT_V3 = {
  version: '0.6.0-player',
  environments: [
    {id:'marsh', name:'Sumpf der Glocken', art:'assets/v3/environments/sumpf_der_glocken.jpg', tags:['Wasser','Krähen','Nebel']},
    {id:'farm', name:'Verlassene Farm', art:'assets/v3/environments/verlassene_farm.jpg', tags:['Pferde','Stall','Loot']},
    {id:'church', name:'Kapelle von Saint Vale', art:'assets/v3/environments/kapelle_von_saint_vale.jpg', tags:['Gräber','Hinweise','Hunter']},
    {id:'mine', name:'Aschengrube', art:'assets/v3/environments/aschengrube.jpg', tags:['Fledermäuse','Dunkelheit','Elite']},
    {id:'rail', name:'Blackwater Railyard', art:'assets/v3/environments/blackwater_railyard.jpg', tags:['Maschinen','Hunter','Waffen']},
    {id:'swamp', name:'Nebelmoor', art:'assets/v3/environments/nebelmoor.jpg', tags:['Wasser','Gift','Bounty']},
    {id:'cem', name:'Knochenfriedhof', art:'assets/v3/environments/knochenfriedhof.jpg', tags:['Untote','Traits','Stille']},
    {id:'compound', name:'Morrow Compound', art:'assets/v3/environments/morrow_compound.jpg', tags:['Boss','Loot','Hunter']}
  ],
  menuArt: {
    mission:'assets/v3/ui/menu_mission.jpg', hunters:'assets/v3/ui/menu_hunters.jpg', gear:'assets/v3/ui/menu_gear.jpg', codex:'assets/v3/ui/menu_codex.jpg',
    recruit:'assets/v3/ui/menu_recruit.jpg', roster:'assets/v3/ui/menu_roster.jpg', missionteam:'assets/v3/ui/menu_missionteam.jpg', settings:'assets/v3/ui/menu_settings.jpg', shop:'assets/v4/ui/menu_haendler.png', merchant:'assets/v4/ui/merchant_stock.png', weaponCarousel:'assets/v4/ui/weapon_carousel.png', extrasWorkbench:'assets/v4/ui/extras_workbench.png'
  },
  hunterPortraits: [
    'assets/v3/hunters/hunter_0.jpg','assets/v3/hunters/hunter_1.jpg','assets/v3/hunters/hunter_2.jpg','assets/v3/hunters/hunter_3.jpg',
    'assets/v3/hunters/hunter_4.jpg','assets/v3/hunters/hunter_5.jpg','assets/v3/hunters/hunter_6.jpg','assets/v3/hunters/hunter_7.jpg'
  ],
  hunterRoles: ['Scout','Gunslinger','Marksman','Bruiser','Occultist','Quartermaster'],
  monsterArt: {
    'Grunt':'assets/v3/monsters/monster_0.jpg','Knife Grunt':'assets/v3/monsters/monster_0.jpg','Doctor Grunt':'assets/v3/monsters/monster_0.jpg','Torch Grunt':'assets/v3/monsters/monster_0.jpg',
    'Armored':'assets/v3/monsters/monster_1.jpg','Concertina Armored':'assets/v3/monsters/monster_1.jpg','Immolator':'assets/v3/monsters/monster_2.jpg','Firebreather':'assets/v3/monsters/monster_2.jpg',
    'Hive':'assets/v3/monsters/monster_3.jpg','Hive Swarm':'assets/v3/monsters/monster_3.jpg','Water Devil':'assets/v3/monsters/monster_4.jpg','Hellhound':'assets/v3/monsters/monster_4.jpg',
    'Bileweaver':'assets/v3/monsters/monster_3.jpg','Brute':'assets/v3/monsters/monster_5.jpg','Meathead':'assets/v3/monsters/monster_6.jpg','Ursa Mortis':'assets/v3/monsters/monster_7.jpg'
  },
  bossArt: {
    'Butcher':'assets/v3/bosses/boss_0.jpg','Spider':'assets/v3/bosses/boss_1.jpg','Assassin':'assets/v3/bosses/boss_2.jpg','Scrapbeak':'assets/v3/bosses/boss_3.jpg','Rotjaw':'assets/v3/bosses/boss_4.jpg','Hellborn':'assets/v3/bosses/boss_5.jpg'
  },
  weaponArt: {
    rifle:'assets/v3/weapons/weapon_0.jpg', sniper:'assets/v3/weapons/weapon_1.jpg', shotgun:'assets/v3/weapons/weapon_2.jpg', pistol:'assets/v3/weapons/weapon_3.jpg',
    bow:'assets/v3/weapons/weapon_4.jpg', crossbow:'assets/v3/weapons/weapon_5.jpg', melee:'assets/v3/weapons/weapon_6.jpg', special:'assets/v3/weapons/weapon_7.jpg'
  },
  extraArt: {
    med:'assets/v3/extras/extra_0.jpg', bomb:'assets/v3/extras/extra_1.jpg', trap:'assets/v3/extras/extra_2.jpg', beetle:'assets/v3/extras/extra_3.jpg', knife:'assets/v3/extras/extra_4.jpg', shot:'assets/v3/extras/extra_5.jpg'
  },
  bios: [
    'Hat mehr Nächte im Moor verbracht als in einem Bett. Bewegt sich leise und liest Spuren wie andere Leute Zeitung.',
    'Ehemalige Schaustellerin mit ruhiger Hand. Je chaotischer die Lage, desto besser wird ihr Fokus.',
    'War Vermesser an der Grenze. Kennt Entfernung, Wind und den Wert eines einzigen sauberen Schusses.',
    'Trug früher Eisenbahnschienen. Heute trägt er schwere Waffen, Dynamit und den Rest des Teams.',
    'Behauptet, die Verderbnis flüstere Namen. Niemand weiß, ob das stimmt – aber ihre Vorahnungen sind erschreckend oft richtig.',
    'Quartermaster alter Schule. Er hält ein Team am Leben, solange noch eine Patrone, ein Verband oder ein Ausgang existiert.'
  ]
};
